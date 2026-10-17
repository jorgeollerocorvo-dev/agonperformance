import { prisma } from "@/lib/prisma";
import { generateText } from "@/lib/ai-call";

/**
 * WhatsApp AI responder. Takes an inbound message + the matched athlete (if
 * any) and returns:
 *   - { reply }                → send to WhatsApp
 *   - { reply, requiresCoach } → send AND notify coach
 *   - { requiresCoach: true, skip } → don't reply at all, just escalate
 *
 * Guardrails baked in:
 *   - NEVER mutates DB (read-only context build; LLM has no tool access)
 *   - Sensitive topics (injury, payment, program change, cancel) force
 *     escalation
 *   - Rate limit: 10 inbound messages/athlete/day — stops loops and spam
 *   - Unknown numbers get a polite "connect with your coach" reply, not
 *     generic ChatGPT output
 */

const SYSTEM_PROMPT = `You are the WhatsApp assistant for Coach Jorge Ollero at Agon Performance (a personal-training SaaS in Qatar).

Your job: answer client questions about their own training using the context provided. Reply in the language the client wrote in (Arabic / English / Spanish). Keep replies short — 1-3 sentences max, WhatsApp style, no markdown.

STRICT RULES:
- Never invent facts about the client's program. Use only the <context> block.
- If the client asks about something NOT in the context (payment, injuries, changing program, cancelling, personal plans), respond briefly that you'll pass it to the coach, nothing else. Set requiresCoach=true.
- If the message is a greeting / casual, reply warmly and briefly.
- If the client asks "what's my workout today / this week", pull from the context's next sessions.
- If the message is in Arabic, reply in Arabic. English → English. Spanish → Spanish.
- Never promise anything the coach hasn't explicitly set in context.
- Never give medical advice. Any mention of pain / injury / hospital / medication → escalate.

Return STRICT JSON (no markdown fences):
{ "reply": "string", "requiresCoach": boolean }

Where "reply" is what we send to the client. Keep it concise.`;

const ESCALATION_KEYWORDS = [
  "duele", "dolor", "lesion", "lesión", "pain", "hurt", "injury", "injured", "hospital", "medico", "médico", "doctor", "medication", "medicamento",
  "pagar", "pago", "payment", "paid", "price", "precio", "cost", "coste", "refund", "dinero",
  "cancelar", "cancel", "stop", "pause", "pausar", "quit",
  "cambiar programa", "change program", "new program", "nuevo plan", "nuevo programa",
  "ألم", "إصابة", "مستشفى", "دواء", "دفع", "سعر", "إلغاء",
];

export type AiResponderResult = {
  reply: string | null;
  requiresCoach: boolean;
  reason?: string;
};

export async function respondToInbound({ phone, body, athleteId }: { phone: string; body: string; athleteId: string | null }): Promise<AiResponderResult> {
  const text = body.trim();
  if (!text) return { reply: null, requiresCoach: false, reason: "empty body" };

  // Unknown number → polite + escalate.
  if (!athleteId) {
    return {
      reply: "Hola 👋 Soy el asistente del Coach Jorge. No te reconozco en nuestro sistema. Si eres cliente, dime tu nombre y le aviso a Jorge para conectarnos.",
      requiresCoach: true,
      reason: "unknown number",
    };
  }

  // Rate limit per athlete per day.
  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const recentInbound = await prisma.whatsAppMessage.count({
    where: { athleteId, direction: "INBOUND", createdAt: { gte: dayAgo } },
  });
  if (recentInbound > 10) {
    return { reply: null, requiresCoach: true, reason: "rate limit — too many inbound today" };
  }

  // Keyword-based pre-escalation for sensitive topics (doesn't even ask the AI).
  const lower = text.toLowerCase();
  const triggered = ESCALATION_KEYWORDS.find((k) => lower.includes(k));
  if (triggered) {
    return {
      reply: pickShortReply("I'll pass this to Jorge directly. He'll get back to you shortly.", "Se lo paso al coach Jorge directamente. Te responderá pronto.", "سأمرر هذا إلى الكوتش جورجي مباشرة. سيرد عليك قريباً.", text),
      requiresCoach: true,
      reason: `keyword: ${triggered}`,
    };
  }

  // Build context from DB (read-only).
  const context = await buildContext(athleteId);

  const userPrompt = `<client-message>${text}</client-message>\n\n<context>${JSON.stringify(context, null, 2)}</context>`;

  let raw: string;
  try {
    raw = await generateText({ systemPrompt: SYSTEM_PROMPT, userPrompt, expectJson: true, maxTokens: 500 });
  } catch (e) {
    return { reply: null, requiresCoach: true, reason: `AI failed: ${(e as Error).message}` };
  }

  // Strip possible markdown fences the model might add anyway.
  const trimmed = raw.replace(/^```(?:json)?\s*/, "").replace(/```\s*$/, "").trim();
  try {
    const parsed = JSON.parse(trimmed) as { reply?: string; requiresCoach?: boolean };
    return {
      reply: typeof parsed.reply === "string" && parsed.reply.trim() ? parsed.reply.trim() : null,
      requiresCoach: !!parsed.requiresCoach,
      reason: "ai",
    };
  } catch {
    return { reply: null, requiresCoach: true, reason: "AI returned non-JSON" };
  }
}

async function buildContext(athleteId: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const in7 = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

  const [athlete, nextSessions, nutrition, lastCheckIn] = await Promise.all([
    prisma.athlete.findUnique({
      where: { id: athleteId },
      select: {
        fullName: true, division: true, goals: true, competitiveGoal: true, notes: true,
        current1rms: true, currentBenchmarks: true,
      },
    }),
    prisma.programSession.findMany({
      where: {
        programWeek: { program: { athleteId } },
        date: { gte: today, lt: in7 },
      },
      orderBy: { date: "asc" },
      take: 5,
      select: {
        date: true, focus: true, intensity: true, notes: true,
        blocks: {
          orderBy: { order: "asc" },
          take: 4,
          select: {
            blockCode: true, label: true,
            movements: {
              orderBy: { order: "asc" }, take: 6,
              select: { customName: true, movement: { select: { nameEn: true } }, prescription: true },
            },
          },
        },
      },
    }),
    prisma.nutritionPlan.findUnique({
      where: { athleteId },
      select: { caloriesTarget: true, proteinG: true, carbsG: true, fatG: true, mealPlan: true },
    }),
    prisma.checkIn.findFirst({
      where: { athleteId },
      orderBy: { weekOf: "desc" },
      select: { weekOf: true, energy: true, sleep: true, stress: true, weekSummary: true },
    }),
  ]);

  return {
    athlete: {
      name: athlete?.fullName,
      goals: athlete?.goals,
      competitiveGoal: athlete?.competitiveGoal,
    },
    nextWorkouts: nextSessions.map((s) => ({
      date: s.date.toISOString().slice(0, 10),
      focus: s.focus,
      intensity: s.intensity,
      movements: s.blocks.flatMap((b) =>
        b.movements.map((m) => ({
          name: m.movement?.nameEn ?? m.customName,
          prescription: m.prescription,
        })),
      ),
    })),
    nutrition,
    lastCheckIn,
  };
}

function pickShortReply(en: string, es: string, ar: string, hint: string): string {
  // Rough language detection from the inbound message.
  if (/[؀-ۿ]/.test(hint)) return ar;
  if (/\b(hola|dolor|peso|entreno|cambiar|gracias|lo pago)\b/i.test(hint)) return es;
  return en;
}
