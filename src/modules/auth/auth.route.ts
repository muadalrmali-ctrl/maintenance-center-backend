import { Router } from "express";
import { authController } from "./auth.controller";
import { authMiddleware } from "../../middlewares/auth";
import { roleMiddleware } from "../../middlewares/role";
import { requirePermission } from "../../middlewares/permission";

const router = Router();

router.post("/register", authMiddleware, roleMiddleware(["admin"]), authController.register);
router.post("/team/activate", authMiddleware, roleMiddleware(["admin"]), authController.activateTeamAccounts);
router.post("/login", authController.login);
router.get("/password-reset/:token", authController.verifyPasswordResetToken);
router.post("/password-reset/complete", authController.completePasswordReset);
router.get(
  "/technicians",
  authMiddleware,
  requirePermission("cases.view"),
  authController.getTechnicians
);
router.get(
  "/team",
  authMiddleware,
  requirePermission("accounting.team.view"),
  authController.getTeamMembers
);
router.get(
  "/team/:id",
  authMiddleware,
  requirePermission("accounting.team.view"),
  authController.getTeamMemberDetails
);
router.get("/team/:id/permissions", authMiddleware, roleMiddleware(["admin"]), authController.getTeamMemberPermissions);
router.put("/team/:id/permissions", authMiddleware, roleMiddleware(["admin"]), authController.updateTeamMemberPermissions);
router.patch("/team/:id", authMiddleware, requirePermission("edit_team_member"), authController.updateTeamMember);
router.delete("/team/:id", authMiddleware, requirePermission("delete_team_member"), authController.deleteTeamMember);
router.post("/team/:id/password-reset", authMiddleware, requirePermission("reset_user_password"), authController.createTeamMemberPasswordReset);

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
