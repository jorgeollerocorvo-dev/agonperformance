import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { stripe, isStripeConfigured } from "@/lib/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Stripe webhook — subscription lifecycle. We mirror the state onto our own
 * Subscription table so the rest of the app doesn't need to query Stripe.
 *
 * Setup: in the Stripe dashboard, add this URL as a webhook endpoint:
 *   https://web-production-83d44.up.railway.app/api/billing/webhook
 * Subscribe to: checkout.session.completed, customer.subscription.*
 * Copy the signing secret into STRIPE_WEBHOOK_SECRET on Railway.
 */
export async function POST(req: Request) {
  if (!isStripeConfigured()) return NextResponse.json({ error: "not configured" }, { status: 503 });
  const whSecret = (process.env.STRIPE_WEBHOOK_SECRET ?? "").trim();
  if (!whSecret) return NextResponse.json({ error: "missing STRIPE_WEBHOOK_SECRET" }, { status: 500 });

  const s = stripe()!;
  const sig = req.headers.get("stripe-signature") ?? "";
  const raw = await req.text();

  let event;
  try {
    event = s.webhooks.constructEvent(raw, sig, whSecret);
  } catch (e) {
    return NextResponse.json({ error: `invalid signature: ${(e as Error).message}` }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const sess = event.data.object as { id: string; client_reference_id?: string | null; subscription?: string | null; metadata?: Record<string, string> | null; customer?: string | null };
        const userId = sess.client_reference_id ?? sess.metadata?.userId;
        const planId = sess.metadata?.planId;
        if (userId && planId && sess.subscription) {
          const sub = await s.subscriptions.retrieve(sess.subscription);
          await prisma.subscription.upsert({
            where: { id: sub.id },
            create: {
              id: sub.id,
              userId,
              planId,
              status: mapStatus(sub.status),
              currentPeriodEnd: new Date((sub as unknown as { current_period_end: number }).current_period_end * 1000),
              autoRenew: !sub.cancel_at_period_end,
              paymentProvider: "stripe",
            },
            update: {
              status: mapStatus(sub.status),
              currentPeriodEnd: new Date((sub as unknown as { current_period_end: number }).current_period_end * 1000),
              autoRenew: !sub.cancel_at_period_end,
            },
          });
        }
        break;
      }
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const sub = event.data.object as unknown as { id: string; status: string; current_period_end: number; cancel_at_period_end: boolean };
        await prisma.subscription.updateMany({
          where: { id: sub.id },
          data: {
            status: mapStatus(sub.status),
            currentPeriodEnd: new Date(sub.current_period_end * 1000),
            autoRenew: !sub.cancel_at_period_end,
          },
        });
        break;
      }
    }
    return NextResponse.json({ received: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

function mapStatus(stripe: string): "ACTIVE" | "PAST_DUE" | "CANCELED" | "EXPIRED" {
  switch (stripe) {
    case "active":
    case "trialing":
      return "ACTIVE";
    case "past_due":
    case "incomplete":
    case "paused":
      return "PAST_DUE";
    case "canceled":
    case "incomplete_expired":
      return "CANCELED";
    default:
      return "EXPIRED";
  }
}
