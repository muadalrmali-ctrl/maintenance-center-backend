import { Router } from "express";
import { authController } from "./auth.controller";
import { authMiddleware } from "../../middlewares/auth";
import { roleMiddleware } from "../../middlewares/role";

const router = Router();

router.post("/register", authMiddleware, roleMiddleware(["admin"]), authController.register);
router.post("/login", authController.login);

router.get("/users-test", async (_req, res) => {
  res.status(200).json({
    success: true,
    message: "Auth routes are working",
  });
});

router.get("/protected", authMiddleware, (req, res) => {
  res.status(200).json({
    success: true,
    message: "Protected route accessed",
    user: req.user,
  });
});

export default router;