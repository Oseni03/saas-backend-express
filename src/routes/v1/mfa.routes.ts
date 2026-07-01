import { Router } from "express";
import { z } from "zod";
import { mfaController } from "../../controllers/mfaController";
import { authenticate, authenticateMfaPending } from "../../middleware/authenticate";
import { validate } from "../../middleware/validate";

const CodeQuerySchema = z.object({ code: z.string().length(6) });

const router = Router();

router.post("/setup", authenticate, mfaController.setup);
router.post("/verify", authenticate, validate(CodeQuerySchema, "query"), mfaController.verify);
router.post("/disable", authenticate, validate(CodeQuerySchema, "query"), mfaController.disable);
router.post(
  "/validate",
  authenticateMfaPending,
  validate(CodeQuerySchema, "query"),
  mfaController.validate
);

export default router;
