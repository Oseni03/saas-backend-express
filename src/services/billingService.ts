/**
 * Billing service — Paystack integration.
 *
 * Paystack flow (different from Stripe):
 *   1. Initialize transaction  → get authorization_url, redirect user there
 *   2. User pays               → Paystack redirects to callback_url
 *   3. Verify transaction      → call /transaction/verify/:reference
 *   4. Webhooks                → charge.success / subscription.disable / etc.
 *
 * Paystack API docs: https://paystack.com/docs/api
 */

import crypto from "crypto";
import axios from "axios";
import { PlanTier, SubscriptionStatus } from "@prisma/client";
import { config } from "../config";
import { prisma } from "../lib/prisma";
import { orgRepository } from "../repositories/orgRepository";
import { logger } from "../lib/logger";
import { BadRequestError, NotFoundError } from "../middleware/errors";

// ── Paystack HTTP client ──────────────────────────────────────────────────────

const paystackApi = axios.create({
  baseURL: "https://api.paystack.co",
  headers: {
    Authorization: `Bearer ${config.PAYSTACK_SECRET_KEY}`,
    "Content-Type": "application/json",
  },
});

// ── Plan → Paystack plan code mapping ────────────────────────────────────────

const PLAN_CODE_MAP: Partial<Record<PlanTier, string>> = {
  PRO: config.PAYSTACK_PRO_PLAN_CODE,
  ENTERPRISE: config.PAYSTACK_ENTERPRISE_PLAN_CODE,
};

const CODE_PLAN_MAP: Record<string, PlanTier> = Object.fromEntries(
  Object.entries(PLAN_CODE_MAP)
    .filter(([, v]) => v)
    .map(([k, v]) => [v, k as PlanTier])
);

// ── Paystack response types ───────────────────────────────────────────────────

interface PaystackInitResponse {
  status: boolean;
  data: { authorization_url: string; access_code: string; reference: string };
}

interface PaystackVerifyResponse {
  status: boolean;
  data: {
    status: "success" | "failed" | "abandoned";
    reference: string;
    customer: { email: string; customer_code: string };
    plan: { plan_code: string };
    subscription: { subscription_code: string; status: string };
    metadata: Record<string, string>;
  };
}

interface PaystackWebhookEvent {
  event: string;
  data: Record<string, unknown>;
}

// ── Service ───────────────────────────────────────────────────────────────────

export const billingService = {
  /**
   * Initialize a Paystack transaction.
   * Returns the hosted payment page URL — redirect the user there.
   */
  async initializeTransaction(
    orgId: string,
    plan: PlanTier,
    userEmail: string,
    callbackUrl: string
  ): Promise<string> {
    if (plan === PlanTier.FREE) throw new BadRequestError("Cannot checkout for the free plan");

    const planCode = PLAN_CODE_MAP[plan];
    if (!planCode) throw new BadRequestError(`No Paystack plan configured for: ${plan}`);

    const org = await orgRepository.findById(orgId);
    if (!org) throw new NotFoundError("Organization");

    const reference = `${orgId}_${plan}_${Date.now()}`;

    const { data } = await paystackApi.post<PaystackInitResponse>("/transaction/initialize", {
      email: userEmail,
      // Amount is required but Paystack ignores it for plan subscriptions — send 0
      amount: 0,
      plan: planCode,
      callback_url: callbackUrl,
      reference,
      metadata: {
        organizationId: orgId,
        plan,
        cancel_action: callbackUrl,
      },
    });

    logger.info({ orgId, plan, reference }, "billing.transaction_initialized");
    return data.data.authorization_url;
  },

  /**
   * Verify a transaction after Paystack redirects back to your callback URL.
   * Call this with the `reference` query param Paystack appends to callbackUrl.
   * Syncs the subscription and plan into your DB.
   */
  async verifyTransaction(reference: string): Promise<{ plan: PlanTier; orgId: string }> {
    const { data } = await paystackApi.get<PaystackVerifyResponse>(
      `/transaction/verify/${encodeURIComponent(reference)}`
    );

    const tx = data.data;
    if (tx.status !== "success") {
      throw new BadRequestError(`Transaction ${reference} was not successful (${tx.status})`);
    }

    const orgId = tx.metadata?.organizationId;
    if (!orgId) throw new BadRequestError("Transaction metadata missing organizationId");

    const plan = CODE_PLAN_MAP[tx.plan?.plan_code] ?? PlanTier.FREE;

    // Upsert customer code on org
    await orgRepository.update(orgId, {
      paystackCustomerId: tx.customer.customer_code,
      plan,
    });

    // Upsert subscription record if a subscription was created
    if (tx.subscription?.subscription_code) {
      await prisma.subscription.upsert({
        where: { organizationId: orgId },
        create: {
          organizationId: orgId,
          paystackSubCode: tx.subscription.subscription_code,
          paystackPlanCode: tx.plan?.plan_code ?? "",
          status: SubscriptionStatus.ACTIVE,
          periodStart: new Date(),
          periodEnd: nextBillingDate(),
        },
        update: {
          paystackSubCode: tx.subscription.subscription_code,
          paystackPlanCode: tx.plan?.plan_code ?? "",
          status: SubscriptionStatus.ACTIVE,
          periodStart: new Date(),
          periodEnd: nextBillingDate(),
        },
      });
    }

    logger.info({ orgId, plan, reference }, "billing.transaction_verified");
    return { plan, orgId };
  },

  /**
   * Manage a customer's subscription via Paystack's customer portal link.
   * Returns a URL to redirect the user to.
   */
  async getManageUrl(orgId: string): Promise<string> {
    const org = await orgRepository.findById(orgId);
    if (!org) throw new NotFoundError("Organization");
    if (!org.paystackCustomerId) {
      throw new BadRequestError("No billing account found. Subscribe to a plan first.");
    }

    // Paystack doesn't have a hosted portal like Stripe — return a deep link
    // to the customer's subscription management page in Paystack's dashboard,
    // or your own /billing page. Common pattern: redirect to your own UI.
    // The customer_code can be used to fetch/cancel subscriptions via API.
    return `${config.FRONTEND_URL}/billing/manage?customer=${org.paystackCustomerId}`;
  },

  /**
   * Cancel a subscription via API (called from your own billing management UI).
   */
  async cancelSubscription(orgId: string): Promise<void> {
    const org = await orgRepository.findById(orgId);
    if (!org) throw new NotFoundError("Organization");

    const sub = await prisma.subscription.findUnique({ where: { organizationId: orgId } });
    if (!sub) throw new NotFoundError("Subscription");

    await paystackApi.post("/subscription/disable", {
      code: sub.paystackSubCode,
      token: sub.paystackPlanCode, // email token required by Paystack
    });

    await prisma.$transaction([
      prisma.subscription.update({
        where: { organizationId: orgId },
        data: { status: SubscriptionStatus.CANCELED, canceledAt: new Date() },
      }),
      prisma.organization.update({
        where: { id: orgId },
        data: { plan: PlanTier.FREE },
      }),
    ]);

    logger.info({ orgId }, "billing.subscription_canceled");
  },

  /**
   * Handle Paystack webhook events.
   * Paystack signs webhooks with HMAC-SHA512 using your secret key.
   */
  async handleWebhook(payload: Buffer, paystackSignature: string): Promise<void> {
    // Verify signature
    const expectedHash = crypto
      .createHmac("sha512", config.PAYSTACK_WEBHOOK_SECRET)
      .update(payload)
      .digest("hex");

    if (expectedHash !== paystackSignature) {
      throw new BadRequestError("Invalid webhook signature");
    }

    const event: PaystackWebhookEvent = JSON.parse(payload.toString());

    const handlers: Record<string, (data: Record<string, unknown>) => Promise<void>> = {
      "charge.success":           onChargeSuccess,
      "subscription.create":      onSubscriptionCreate,
      "subscription.disable":     onSubscriptionDisable,
      "invoice.payment_failed":   onPaymentFailed,
    };

    const handler = handlers[event.event];
    if (handler) {
      await handler(event.data);
      logger.info({ event: event.event }, "billing.webhook_handled");
    } else {
      logger.debug({ event: event.event }, "billing.webhook_ignored");
    }
  },
};

// ── Webhook handlers ──────────────────────────────────────────────────────────

async function onChargeSuccess(data: Record<string, unknown>): Promise<void> {
  const metadata = (data.metadata ?? {}) as Record<string, string>;
  const orgId = metadata.organizationId;
  const planKey = metadata.plan as PlanTier | undefined;

  if (!orgId || !planKey) return;

  const plan = Object.values(PlanTier).includes(planKey) ? planKey : PlanTier.FREE;

  await prisma.organization.update({
    where: { id: orgId },
    data: { plan },
  });

  logger.info({ orgId, plan }, "billing.charge_success");
}

async function onSubscriptionCreate(data: Record<string, unknown>): Promise<void> {
  const sub = data as {
    subscription_code: string;
    status: string;
    plan: { plan_code: string };
    customer: { customer_code: string };
    next_payment_date: string;
    createdAt: string;
    metadata?: Record<string, string>;
  };

  const orgId = sub.metadata?.organizationId;
  if (!orgId) return;

  const plan = CODE_PLAN_MAP[sub.plan?.plan_code] ?? PlanTier.FREE;

  await prisma.$transaction([
    prisma.subscription.upsert({
      where: { organizationId: orgId },
      create: {
        organizationId: orgId,
        paystackSubCode: sub.subscription_code,
        paystackPlanCode: sub.plan?.plan_code ?? "",
        status: SubscriptionStatus.ACTIVE,
        periodStart: new Date(sub.createdAt),
        periodEnd: new Date(sub.next_payment_date),
      },
      update: {
        paystackSubCode: sub.subscription_code,
        paystackPlanCode: sub.plan?.plan_code ?? "",
        status: SubscriptionStatus.ACTIVE,
        periodStart: new Date(sub.createdAt),
        periodEnd: new Date(sub.next_payment_date),
      },
    }),
    prisma.organization.update({
      where: { id: orgId },
      data: { plan },
    }),
  ]);
}

async function onSubscriptionDisable(data: Record<string, unknown>): Promise<void> {
  const sub = data as { subscription_code: string; metadata?: Record<string, string> };

  const orgId = sub.metadata?.organizationId;
  if (!orgId) return;

  await prisma.$transaction([
    prisma.subscription.updateMany({
      where: { paystackSubCode: sub.subscription_code },
      data: { status: SubscriptionStatus.CANCELED, canceledAt: new Date() },
    }),
    prisma.organization.update({
      where: { id: orgId },
      data: { plan: PlanTier.FREE },
    }),
  ]);

  logger.info({ orgId }, "billing.subscription_disabled");
}

async function onPaymentFailed(data: Record<string, unknown>): Promise<void> {
  const invoice = data as { subscription: { subscription_code: string }; metadata?: Record<string, string> };
  const orgId = invoice.metadata?.organizationId;
  if (!orgId) return;

  await prisma.subscription.updateMany({
    where: { paystackSubCode: invoice.subscription?.subscription_code },
    data: { status: SubscriptionStatus.PAST_DUE },
  });

  logger.warn({ orgId }, "billing.payment_failed");
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function nextBillingDate(): Date {
  const d = new Date();
  d.setMonth(d.getMonth() + 1);
  return d;
}
