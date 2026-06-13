import { Router } from "express";
import { adminController } from "../../controllers/adminController";
import { authenticate, requireSuperuser } from "../../middleware/authenticate";

const router = Router();

router.use(authenticate, requireSuperuser);

router.get("/stats",                         adminController.stats);
router.get("/users",                         adminController.listUsers);
router.get("/organizations",                 adminController.listOrgs);
router.patch("/users/:userId/deactivate",    adminController.deactivateUser);
router.patch("/users/:userId/activate",      adminController.activateUser);

export default router;
