import type { Request, Response, NextFunction } from "express";
import { billingService } from "../services/billingService";
import { PlanTier } from "@/generated/prisma";
import { z } from "zod";

const InitializeSchema = z.object({
  plan: z.nativeEnum(PlanTier),
  callback_url: z.string().url(),
});



export const billingController = {
  /**
   * Step 1 — Initialize a Paystack transaction.
   * Returns { authorization_url } — redirect the user there to pay.
   */
  async initialize(req: Request, res: Response, next: NextFunction) {
    try {
      const input = InitializeSchema.parse(req.body);
      const url = await billingService.initializeTransaction(
        req.org!.id,
        input.plan,
        req.user!.email,
        input.callback_url
      );
      res.json({ authorization_url: url });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Step 2 — Verify a transaction after Paystack redirects to callbackUrl.
   * Paystack appends ?reference=xxx to the callbackUrl.
   * Your frontend calls this endpoint with that reference.
   */
  async verify(req: Request, res: Response, next: NextFunction) {
    try {
      const reference = req.query.reference as string | undefined;
      if (!reference) {
        res.status(400).json({ error: "Missing reference query param" });
        return;
      }
      const result = await billingService.verifyTransaction(reference);
      res.json({ plan: result.plan, organization_id: result.orgId });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Returns a URL to your own billing management page,
   * pre-scoped to the customer's Paystack customer code.
   */
  async manageUrl(req: Request, res: Response, next: NextFunction) {
    try {
      const url = await billingService.getManageUrl(req.org!.id);
      res.json({ manage_url: url });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Cancel the org's active subscription via Paystack API.
   */
  async cancel(req: Request, res: Response, next: NextFunction) {
    try {
      await billingService.cancelSubscription(req.org!.id);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },

  /**
   * Paystack webhook — signature verified inside billingService.handleWebhook.
   * Paystack sends x-paystack-signature header (HMAC-SHA512 of raw body).
   * Must use raw body — mounted with express.raw() in app.ts.
   */
  async webhook(req: Request, res: Response, next: NextFunction) {
    try {
      const sig = req.headers["x-paystack-signature"] as string;
      await billingService.handleWebhook(req.body as Buffer, sig);
      res.json({});
    } catch (err) {
      next(err);
    }
  },
};
