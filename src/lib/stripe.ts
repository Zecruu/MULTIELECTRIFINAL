import Stripe from "stripe";

const secret = process.env.STRIPE_SECRET_KEY || "";
export const stripe = new Stripe(secret || "sk_test_placeholder");

export const STRIPE_PUBLISHABLE_KEY = process.env.STRIPE_PUBLISHABLE_KEY || "";
export const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || "";

