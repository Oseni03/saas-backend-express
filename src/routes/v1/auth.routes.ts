import { Router } from "express";
import { authController } from "../../controllers/authController";
import { authenticate } from "../../middleware/authenticate";
import { validate } from "../../middleware/validate";
import {
  RegisterSchema,
  LoginSchema,
  RefreshSchema,
  LogoutSchema,
  VerifyEmailSchema,
  ForgotPasswordSchema,
  ResetPasswordSchema,
} from "../../services/authService";

const router = Router();

router.post("/register",       validate(RegisterSchema),       authController.register);
router.post("/logout",         validate(LogoutSchema),         authController.logout);
router.post("/login",          validate(LoginSchema),          authController.login);
router.post("/refresh",        validate(RefreshSchema),        authController.refresh);
router.post("/verify-email",   validate(VerifyEmailSchema),    authController.verifyEmail);
router.post("/forgot-password",validate(ForgotPasswordSchema), authController.forgotPassword);
router.post("/reset-password", validate(ResetPasswordSchema),  authController.resetPassword);
router.get("/me",              authenticate,                   authController.getMe);

export default router;
