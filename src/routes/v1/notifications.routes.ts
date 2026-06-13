import { Router } from "express";
import { notificationController } from "../../controllers/notificationController";
import { authenticate } from "../../middleware/authenticate";

const router = Router();

router.use(authenticate);

router.get("/",               notificationController.list);
router.post("/read-all",      notificationController.markAllRead);
router.post("/:id/read",      notificationController.markRead);

export default router;
