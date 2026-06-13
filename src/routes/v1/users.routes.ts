import { Router } from "express";
import { userController } from "../../controllers/userController";
import { authenticate } from "../../middleware/authenticate";

const router = Router();

router.use(authenticate);

router.get("/me",                   userController.getProfile);
router.patch("/me",                 userController.updateProfile);
router.post("/me/change-password",  userController.changePassword);
router.delete("/me",                userController.deleteAccount);

export default router;
