import bcrypt from "bcrypt";
import crypto from "crypto";
import { and, desc, eq } from "drizzle-orm";
import { db } from "../../db";
import { staffInvitations, users } from "../../db/schema";
import { env } from "../../config/env";

type StaffRole = "technician" | "store_manager" | "receptionist" | "technician_manager" | "maintenance_manager" | "admin";

type CreateInvitationInput = {
  role: StaffRole;
  name?: string;
  phone?: string;
  notes?: string;
  invitedBy: number;
};

type AcceptInvitationInput = {
  token: string;
  name?: string;
  email: string;
  password: string;
};

const INVITATION_EXPIRY_DAYS = 7;

const hashToken = (token: string) =>
  crypto.createHash("sha256").update(token).digest("hex");

const buildInviteUrl = (token: string) => {
  const frontendUrl = env.FRONTEND_URL.replace(/\/+$/, "");
  const path = `/accept-invitation?token=${encodeURIComponent(token)}`;

  return frontendUrl ? `${frontendUrl}${path}` : path;
};

export const invitationService = {
  async createInvitation(input: CreateInvitationInput) {
    const token = crypto.randomBytes(32).toString("hex");
    const tokenHash = hashToken(token);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + INVITATION_EXPIRY_DAYS);

    const records = await db
      .insert(staffInvitations)
      .values({
        tokenHash,
        role: input.role,
        name: input.name,
        phone: input.phone,
        notes: input.notes,
        invitedBy: input.invitedBy,
        expiresAt,
      })
      .returning({
        id: staffInvitations.id,
        role: staffInvitations.role,
        status: staffInvitations.status,
        name: staffInvitations.name,
        phone: staffInvitations.phone,
        notes: staffInvitations.notes,
        expiresAt: staffInvitations.expiresAt,
        createdAt: staffInvitations.createdAt,
      });

    return {
      ...records[0],
      token,
      inviteUrl: buildInviteUrl(token),
    };
  },

  async listInvitations() {
    return await db
      .select({
        id: staffInvitations.id,
        role: staffInvitations.role,
        status: staffInvitations.status,
        name: staffInvitations.name,
        phone: staffInvitations.phone,
        notes: staffInvitations.notes,
        expiresAt: staffInvitations.expiresAt,
        acceptedAt: staffInvitations.acceptedAt,
        revokedAt: staffInvitations.revokedAt,
        createdAt: staffInvitations.createdAt,
      })
      .from(staffInvitations)
      .orderBy(desc(staffInvitations.createdAt));
  },

  async getInvitationByToken(token: string) {
    const tokenHash = hashToken(token);
    const records = await db
      .select({
        id: staffInvitations.id,
        role: staffInvitations.role,
        status: staffInvitations.status,
        name: staffInvitations.name,
        phone: staffInvitations.phone,
        notes: staffInvitations.notes,
        expiresAt: staffInvitations.expiresAt,
      })
      .from(staffInvitations)
      .where(eq(staffInvitations.tokenHash, tokenHash))
      .limit(1);

    const invitation = records[0];
    if (!invitation) return undefined;

    const isExpired = invitation.expiresAt.getTime() <= Date.now();
    return {
      ...invitation,
      status: isExpired && invitation.status === "pending" ? "expired" : invitation.status,
    };
  },

  async acceptInvitation(input: AcceptInvitationInput) {
    const tokenHash = hashToken(input.token);

    return await db.transaction(async (tx) => {
      const invitationRecords = await tx
        .select()
        .from(staffInvitations)
        .where(eq(staffInvitations.tokenHash, tokenHash))
        .limit(1);

      const invitation = invitationRecords[0];
      if (!invitation) {
        throw new Error("Invitation not found");
      }

      if (invitation.status !== "pending") {
        throw new Error("Invitation is not pending");
      }

      if (invitation.expiresAt.getTime() <= Date.now()) {
        await tx
          .update(staffInvitations)
          .set({ status: "expired", updatedAt: new Date() })
          .where(eq(staffInvitations.id, invitation.id));
        throw new Error("Invitation has expired");
      }

      const existingUsers = await tx
        .select({ id: users.id })
        .from(users)
        .where(eq(users.email, input.email))
        .limit(1);

      if (existingUsers[0]) {
        throw new Error("Email is already registered");
      }

      const hashedPassword = await bcrypt.hash(input.password, 10);
      const createdUsers = await tx
        .insert(users)
        .values({
          name: input.name || invitation.name || input.email,
          email: input.email,
          password: hashedPassword,
          role: invitation.role,
        })
        .returning({
          id: users.id,
          name: users.name,
          email: users.email,
          role: users.role,
          createdAt: users.createdAt,
        });

      const user = createdUsers[0];

      await tx
        .update(staffInvitations)
        .set({
          status: "accepted",
          acceptedBy: user.id,
          acceptedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(staffInvitations.id, invitation.id),
            eq(staffInvitations.status, "pending")
          )
        );

      return user;
    });
  },
};
