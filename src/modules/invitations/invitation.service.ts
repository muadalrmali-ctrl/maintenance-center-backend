import bcrypt from "bcrypt";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { env } from "../../config/env";
import { db } from "../../db";
import { branches, permissions, staffInvitations, userPermissions, users } from "../../db/schema";
import { getDefaultPermissionKeysForRole } from "../../lib/permissions";
import { permissionsService } from "../permissions/permissions.service";

type StaffRole =
  | "technician"
  | "store_manager"
  | "receptionist"
  | "technician_manager"
  | "maintenance_manager"
  | "admin"
  | "branch_user";

type InvitationStatus = "pending" | "used" | "expired" | "revoked";

type CreateInvitationInput = {
  role: StaffRole;
  name?: string;
  email?: string;
  phone?: string;
  notes?: string;
  branchId?: number | null;
  expiresInDays?: number;
  invitedBy: number;
};

type AcceptInvitationInput = {
  token: string;
  name?: string;
  email: string;
  phone: string;
  password: string;
};

type RevokeInvitationInput = {
  id: number;
  revokedBy: number;
};

const DEFAULT_INVITATION_EXPIRY_DAYS = 7;

const hashToken = (token: string) =>
  crypto.createHash("sha256").update(token).digest("hex");

const normalizeEmail = (email: string) => email.trim().toLowerCase();

const buildInviteUrl = (token: string) => {
  const frontendUrl = env.FRONTEND_URL.replace(/\/+$/, "");
  const path = `/invite/${encodeURIComponent(token)}`;

  return frontendUrl ? `${frontendUrl}${path}` : path;
};

const normalizeStatus = (
  status: string,
  expiresAt: Date,
  revokedAt: Date | null,
  acceptedAt: Date | null
): InvitationStatus => {
  if (revokedAt || status === "revoked") return "revoked";
  if (acceptedAt || status === "used" || status === "accepted") return "used";
  if (expiresAt.getTime() <= Date.now()) return "expired";
  return "pending";
};

const toInvitationRecord = <
  T extends {
    token?: string | null;
    role: string;
    status: string;
    name: string | null;
    email: string | null;
    phone: string | null;
    notes: string | null;
    branchId?: number | null;
    branchName?: string | null;
    expiresAt: Date;
    acceptedAt?: Date | null;
    revokedAt?: Date | null;
  },
>(
  record: T
) => ({
  ...record,
  status: normalizeStatus(
    record.status,
    record.expiresAt,
    record.revokedAt ?? null,
    record.acceptedAt ?? null
  ),
  inviteUrl: record.token ? buildInviteUrl(record.token) : null,
});

export const invitationService = {
  async createInvitation(input: CreateInvitationInput) {
    const token = crypto.randomBytes(32).toString("hex");
    const tokenHash = hashToken(token);
    const expiresAt = new Date();
    expiresAt.setDate(
      expiresAt.getDate() + (input.expiresInDays ?? DEFAULT_INVITATION_EXPIRY_DAYS)
    );

    const normalizedEmail = input.email ? normalizeEmail(input.email) : null;
    if (normalizedEmail) {
      const existingUsers = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.email, normalizedEmail))
        .limit(1);

      if (existingUsers[0]) {
        throw new Error("A user with this email already exists");
      }
    }

    if (input.role === "branch_user") {
      if (!input.branchId) {
        throw new Error("Branch user invitation requires a branch");
      }

      const branchRecord = await db
        .select({ id: branches.id })
        .from(branches)
        .where(eq(branches.id, input.branchId))
        .limit(1);

      if (!branchRecord[0]) {
        throw new Error("Selected branch was not found");
      }
    }

    const records = await db
      .insert(staffInvitations)
      .values({
        token,
        tokenHash,
        role: input.role,
        status: "pending",
        name: input.name?.trim() || null,
        email: normalizedEmail,
        phone: input.phone?.trim() || null,
        notes: input.notes?.trim() || null,
        branchId: input.role === "branch_user" ? input.branchId ?? null : null,
        invitedBy: input.invitedBy,
        expiresAt,
      })
      .returning({
        id: staffInvitations.id,
        token: staffInvitations.token,
        role: staffInvitations.role,
        status: staffInvitations.status,
        name: staffInvitations.name,
        email: staffInvitations.email,
        phone: staffInvitations.phone,
        notes: staffInvitations.notes,
        branchId: staffInvitations.branchId,
        branchName: sql<string | null>`null`,
        expiresAt: staffInvitations.expiresAt,
        acceptedAt: staffInvitations.acceptedAt,
        revokedAt: staffInvitations.revokedAt,
        createdAt: staffInvitations.createdAt,
      });

    const branchName = input.branchId
      ? (
          await db
            .select({ name: branches.name })
            .from(branches)
            .where(eq(branches.id, input.branchId))
            .limit(1)
        )[0]?.name ?? null
      : null;

    return toInvitationRecord({
      ...records[0],
      branchName,
    });
  },

  async listInvitations() {
    const records = await db
      .select({
        id: staffInvitations.id,
        token: staffInvitations.token,
        role: staffInvitations.role,
        status: staffInvitations.status,
        name: staffInvitations.name,
        email: staffInvitations.email,
        phone: staffInvitations.phone,
        notes: staffInvitations.notes,
        branchId: staffInvitations.branchId,
        branchName: branches.name,
        invitedBy: staffInvitations.invitedBy,
        acceptedBy: staffInvitations.acceptedBy,
        expiresAt: staffInvitations.expiresAt,
        acceptedAt: staffInvitations.acceptedAt,
        revokedAt: staffInvitations.revokedAt,
        createdAt: staffInvitations.createdAt,
        updatedAt: staffInvitations.updatedAt,
      })
      .from(staffInvitations)
      .leftJoin(branches, eq(staffInvitations.branchId, branches.id))
      .orderBy(desc(staffInvitations.createdAt));

    return records.map((record) => toInvitationRecord(record));
  },

  async getInvitationByToken(token: string) {
    const tokenHash = hashToken(token);
    const records = await db
      .select({
        id: staffInvitations.id,
        token: staffInvitations.token,
        role: staffInvitations.role,
        status: staffInvitations.status,
        name: staffInvitations.name,
        email: staffInvitations.email,
        phone: staffInvitations.phone,
        notes: staffInvitations.notes,
        branchId: staffInvitations.branchId,
        branchName: branches.name,
        expiresAt: staffInvitations.expiresAt,
        acceptedAt: staffInvitations.acceptedAt,
        revokedAt: staffInvitations.revokedAt,
      })
      .from(staffInvitations)
      .leftJoin(branches, eq(staffInvitations.branchId, branches.id))
      .where(
        and(
          eq(staffInvitations.token, token),
          eq(staffInvitations.tokenHash, tokenHash)
        )
      )
      .limit(1);

    const invitation = records[0];
    if (!invitation) return undefined;

    return toInvitationRecord(invitation);
  },

  async acceptInvitation(input: AcceptInvitationInput) {
    const tokenHash = hashToken(input.token);
    const email = normalizeEmail(input.email);
    await permissionsService.seedCatalog();

    return await db.transaction(async (tx) => {
      const invitationRecords = await tx
        .select()
        .from(staffInvitations)
        .where(
          and(
            eq(staffInvitations.token, input.token),
            eq(staffInvitations.tokenHash, tokenHash)
          )
        )
        .limit(1);

      const invitation = invitationRecords[0];
      if (!invitation) {
        throw new Error("Invitation not found");
      }

      const invitationStatus = normalizeStatus(
        invitation.status,
        invitation.expiresAt,
        invitation.revokedAt,
        invitation.acceptedAt
      );

      if (invitationStatus === "revoked") {
        throw new Error("Invitation has been revoked");
      }

      if (invitationStatus === "used") {
        throw new Error("Invitation has already been used");
      }

      if (invitationStatus === "expired") {
        await tx
          .update(staffInvitations)
          .set({ status: "expired", updatedAt: new Date() })
          .where(eq(staffInvitations.id, invitation.id));
        throw new Error("Invitation has expired");
      }

      if (invitation.email && invitation.email !== email) {
        throw new Error("This invitation is locked to a different email address");
      }

      const existingUsers = await tx
        .select({ id: users.id })
        .from(users)
        .where(eq(users.email, email))
        .limit(1);

      if (existingUsers[0]) {
        throw new Error("Email is already registered");
      }

      const hashedPassword = await bcrypt.hash(input.password, 10);
      const createdUsers = await tx
        .insert(users)
        .values({
          name: input.name?.trim() || invitation.name || email,
          email,
          phone: input.phone.trim(),
          password: hashedPassword,
          role: invitation.role,
          branchId: invitation.role === "branch_user" ? invitation.branchId ?? null : null,
        })
        .returning({
          id: users.id,
          name: users.name,
          email: users.email,
          role: users.role,
          branchId: users.branchId,
          createdAt: users.createdAt,
        });

      const user = createdUsers[0];
      const defaultPermissionKeys = getDefaultPermissionKeysForRole(user.role as StaffRole);
      const permissionRows = defaultPermissionKeys.length
        ? await tx
            .select({
              id: permissions.id,
              key: permissions.key,
            })
            .from(permissions)
            .where(inArray(permissions.key, defaultPermissionKeys))
        : [];

      if (permissionRows.length > 0) {
        await tx.insert(userPermissions).values(
          permissionRows.map((permissionRow) => ({
            userId: user.id,
            permissionId: permissionRow.id,
            createdAt: new Date(),
          }))
        );
      }

      await tx
        .update(staffInvitations)
        .set({
          status: "used",
          acceptedBy: user.id,
          acceptedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(staffInvitations.id, invitation.id),
            eq(staffInvitations.status, invitation.status)
          )
        );

      const authToken = jwt.sign(
        {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          branchId: user.branchId ?? null,
        },
        env.JWT_SECRET,
        {
          expiresIn: env.JWT_EXPIRES_IN,
        }
      );

      return {
        user: {
          ...user,
          branchName: invitation.branchId
            ? (
                await tx
                  .select({ name: branches.name })
                  .from(branches)
                  .where(eq(branches.id, invitation.branchId))
                  .limit(1)
              )[0]?.name ?? null
            : null,
          permissions: await permissionsService.getUserPermissionKeys(user.id, user.role),
        },
        token: authToken,
      };
    });
  },

  async revokeInvitation(input: RevokeInvitationInput) {
    const invitationRecords = await db
      .select()
      .from(staffInvitations)
      .where(eq(staffInvitations.id, input.id))
      .limit(1);

    const invitation = invitationRecords[0];
    if (!invitation) {
      throw new Error("Invitation not found");
    }

    const invitationStatus = normalizeStatus(
      invitation.status,
      invitation.expiresAt,
      invitation.revokedAt,
      invitation.acceptedAt
    );

    if (invitationStatus !== "pending") {
      throw new Error("Only pending invitations can be revoked");
    }

    const updatedRecords = await db
      .update(staffInvitations)
      .set({
        status: "revoked",
        revokedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(staffInvitations.id, input.id))
      .returning({
        id: staffInvitations.id,
        token: staffInvitations.token,
        role: staffInvitations.role,
        status: staffInvitations.status,
        name: staffInvitations.name,
        email: staffInvitations.email,
        phone: staffInvitations.phone,
        notes: staffInvitations.notes,
        branchId: staffInvitations.branchId,
        branchName: sql<string | null>`null`,
        invitedBy: staffInvitations.invitedBy,
        acceptedBy: staffInvitations.acceptedBy,
        expiresAt: staffInvitations.expiresAt,
        acceptedAt: staffInvitations.acceptedAt,
        revokedAt: staffInvitations.revokedAt,
        createdAt: staffInvitations.createdAt,
        updatedAt: staffInvitations.updatedAt,
      });

    return toInvitationRecord(updatedRecords[0]);
  },
};
