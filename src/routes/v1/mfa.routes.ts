import { Router } from "express";
import { z } from "zod";
import { mfaController } from "../../controllers/mfaController";
import { authenticate } from "../../middleware/authenticate";
import { validate } from "../../middleware/validate";

const CodeSchema = z.object({ code: z.string().length(6) });

const router = Router();

router.use(authenticate);

router.post("/setup",    mfaController.setup);
router.post("/verify",   validate(CodeSchema), mfaController.verify);
router.post("/disable",  validate(CodeSchema), mfaController.disable);
router.post("/validate", validate(CodeSchema), mfaController.validate);

export default router;
