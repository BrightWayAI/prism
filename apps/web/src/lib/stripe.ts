import Stripe from "stripe";

let stripeClient: Stripe | null = null;

export function getStripe(): Stripe {
  if (!stripeClient) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error("STRIPE_SECRET_KEY is not set");
    }
    stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2025-11-17.clover",
    });
  }
  return stripeClient;
}

export const STRIPE_CONFIG = {
  priceId: process.env.STRIPE_PRICE_ID!,
  trialDays: 7,
  successUrl: `${process.env.NEXTAUTH_URL}/dashboard?subscription=success`,
  cancelUrl: `${process.env.NEXTAUTH_URL}/pricing?subscription=canceled`,
};
