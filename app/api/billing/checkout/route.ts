import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { stripe, isStripeConfigured } from "@/lib/stripe";

/**
 * Create a Stripe Checkout session for a subscription. The caller passes a
 * `planId` from our SubscriptionPlan table — we look up the plan's Stripe
 * price id and start the Checkout session. On success Stripe redirects to
 * /account?checkout=success; the webhook does the actual Subscription write.
 *
 * No-op if Stripe isn't configured — returns 503 with a clear message.
 */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  if (!isStripeConfigured()) {
    return NextResponse.json({ error: "Billing not yet enabled. Admin must configure STRIPE_SECRET_KEY." }, { status: 503 });
  }

  const body = (await req.json()) as { planId?: string; lang?: string };
  const { planId, lang = "en" } = body;
  if (!planId) return NextResponse.json({ error: "planId required" }, { status: 400 });

  const plan = await prisma.subscriptionPlan.findUnique({ where: { id: planId } });
  if (!plan) return NextResponse.json({ error: "plan not found" }, { status: 404 });

  // Plans store the Stripe price id in `providerPriceId` (coach adds via admin).
  const priceId = (plan as unknown as { providerPriceId?: string | null }).providerPriceId;
  if (!priceId) {
    return NextResponse.json({ error: "Plan is not linked to a Stripe price yet." }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { email: true } });
  const origin = req.headers.get("origin") ?? "https://web-production-83d44.up.railway.app";

  const s = stripe()!;
  const checkout = await s.checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    customer_email: user?.email ?? undefined,
    client_reference_id: session.user.id,
    success_url: `${origin}/${lang}/account?checkout=success`,
    cancel_url: `${origin}/${lang}/account?checkout=cancelled`,
    allow_promotion_codes: true,
    metadata: {
      userId: session.user.id,
      planId: plan.id,
    },
  });

  return NextResponse.json({ url: checkout.url });
}
