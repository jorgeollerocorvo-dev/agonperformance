/**
 * WhatsApp Cloud API client — direct against Meta's Graph API, no Twilio.
 *
 * Setup (one-time, on Meta Developers):
 *   1. developers.facebook.com → Create App → Business → WhatsApp
 *   2. Add a phone number; verify via SMS
 *   3. Copy Phone Number ID + a long-lived access token
 *   4. Set webhook URL to  <APP_URL>/api/whatsapp/webhook  with a
 *      shared verify-token string, subscribe to the `messages` field
 *
 * Env vars (Railway):
 *   WHATSAPP_PHONE_ID        — the phone-number-id Meta assigns
 *   WHATSAPP_ACCESS_TOKEN    — long-lived access token (System User)
 *   WHATSAPP_VERIFY_TOKEN    — any random string you also paste in Meta
 *   WHATSAPP_COACH_PHONE     — your own E.164 to receive escalation alerts
 *                              (optional, defaults to notifying via push instead)
 *
 * Free tier: 1,000 service conversations/mo (user-initiated). We only
 * respond to inbound messages, so we stay inside this bucket by design.
 */

const META_API = "https://graph.facebook.com/v22.0";

export function isWhatsAppConfigured(): boolean {
  return (
    !!(process.env.WHATSAPP_PHONE_ID ?? "").trim() &&
    !!(process.env.WHATSAPP_ACCESS_TOKEN ?? "").trim()
  );
}

/** Normalize to E.164 digits only (no +, no spaces, no dashes). */
export function normalizePhone(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const digits = String(phone).replace(/[^\d]/g, "");
  if (digits.length < 7 || digits.length > 15) return null;
  return digits;
}

export async function sendWhatsAppText(toPhone: string, body: string): Promise<{ wamid?: string; error?: string }> {
  if (!isWhatsAppConfigured()) return { error: "WhatsApp not configured" };
  const phoneId = process.env.WHATSAPP_PHONE_ID!.trim();
  const token = process.env.WHATSAPP_ACCESS_TOKEN!.trim();
  const to = normalizePhone(toPhone);
  if (!to) return { error: "invalid phone" };

  try {
    const res = await fetch(`${META_API}/${phoneId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        type: "text",
        text: { preview_url: false, body: body.slice(0, 4096) },
      }),
      signal: AbortSignal.timeout(15_000),
    });
    const json = (await res.json().catch(() => ({}))) as {
      messages?: Array<{ id?: string }>;
      error?: { message?: string };
    };
    if (!res.ok) return { error: json.error?.message ?? `${res.status}` };
    return { wamid: json.messages?.[0]?.id };
  } catch (e) {
    return { error: (e as Error).message };
  }
}
