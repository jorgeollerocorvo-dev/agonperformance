import Stripe from "stripe";

/**
 * Stripe singleton. Lazy-initialized so the app boots fine without a key —
 * the pricing/billing pages render a 'coming soon' state when stripe() returns
 * null. Zero marginal cost until a real payment is taken (2.9% + 30¢ then).
 */
let _stripe: Stripe | null = null;

export function stripe(): Stripe | null {
  const key = (process.env.STRIPE_SECRET_KEY ?? "").trim();
  if (!key) return null;
  if (_stripe) return _stripe;
  _stripe = new Stripe(key, { apiVersion: "2024-06-20" as Stripe.LatestApiVersion });
  return _stripe;
}

export function isStripeConfigured(): boolean {
  return !!(process.env.STRIPE_SECRET_KEY ?? "").trim();
}
