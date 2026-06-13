-- Migration: stripe_to_paystack
-- Renames stripeCustomerId → paystackCustomerId on organizations
-- Renames stripeSubId → paystackSubCode, stripePriceId → paystackPlanCode on subscriptions

-- Organizations
ALTER TABLE "organizations"
  RENAME COLUMN "stripe_customer_id" TO "paystack_customer_id";

-- Subscriptions
ALTER TABLE "subscriptions"
  RENAME COLUMN "stripe_sub_id" TO "paystack_sub_code";

ALTER TABLE "subscriptions"
  RENAME COLUMN "stripe_price_id" TO "paystack_plan_code";
