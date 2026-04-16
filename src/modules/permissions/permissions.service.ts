import { eq, inArray } from "drizzle-orm";
import { db } from "../../db";
import { permissions, userPermissions, users } from "../../db/schema";
import { ALL_PERMISSION_KEYS, PERMISSION_CATALOG, getDefaultPermissionKeysForRole, isPermissionKey } from "../../lib/permissions";
import type { AppRole } from "../../lib/roles";

const toCatalogRecord = (entry: (typeof PERMISSION_CATALOG)[number], index: number) => ({
  key: entry.key,
  label: entry.label,
  group: entry.group,
  parentKey: entry.parentKey ?? null,
  description: entry.description ?? null,
  sortOrder: index,
});

export const permissionsService = {
  async seedCatalog() {
    for (const [index, entry] of PERMISSION_CATALOG.entries()) {
      const existing = await db
        .select({ id: permissions.id })
        .from(permissions)
        .where(eq(permissions.key, entry.key))
        .limit(1);

      if (existing[0]) {
        await db
          .update(permissions)
          .set({
            label: entry.label,
            group: entry.group,
            parentKey: entry.parentKey ?? null,
            description: entry.description ?? null,
            sortOrder: index,
            updatedAt: new Date(),
          })
          .where(eq(permissions.id, existing[0].id));
      } else {
        await db.insert(permissions).values({
          ...toCatalogRecord(entry, index),
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }
    }
  },

  async getCatalog(): Promise<
    Array<{
      key: string;
      label: string;
      group: string;
      parentKey: string | null;
      description: string | null;
      sortOrder: number;
    }>
  > {
    const catalogRows = await db
      .select({
        key: permissions.key,
        label: permissions.label,
        group: permissions.group,
        parentKey: permissions.parentKey,
        description: permissions.description,
        sortOrder: permissions.sortOrder,
      })
      .from(permissions);

    if (!catalogRows.length) {
      await this.seedCatalog();
      return this.getCatalog();
    }

    return catalogRows.sort((left, right) => left.sortOrder - right.sortOrder);
  },

  async getUserPermissionKeys(userId: number, role?: string | null) {
    if (role === "admin") {
      return [...ALL_PERMISSION_KEYS];
    }

    const assignedPermissions = await db
      .select({ key: permissions.key })
      .from(userPermissions)
      .innerJoin(permissions, eq(userPermissions.permissionId, permissions.id))
      .where(eq(userPermissions.userId, userId));

    return assignedPermissions.map((entry) => entry.key);
  },

  async assignDefaultPermissions(userId: number, role: AppRole) {
    if (role === "admin") {
      await db.delete(userPermissions).where(eq(userPermissions.userId, userId));
      return [];
    }

    const defaultKeys = getDefaultPermissionKeysForRole(role);
    await this.replaceUserPermissions(userId, defaultKeys);
    return defaultKeys;
  },

  async getUserPermissions(userId: number) {
    const foundUsers = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    const user = foundUsers[0];
    if (!user) {
      return undefined;
    }

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        isAdmin: user.role === "admin",
      },
      permissions: await this.getUserPermissionKeys(user.id, user.role),
    };
  },

  async replaceUserPermissions(userId: number, keys: string[]) {
    const foundUsers = await db
      .select({
        id: users.id,
        role: users.role,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    const user = foundUsers[0];
    if (!user) {
      throw new Error("User not found");
    }

    if (user.role === "admin") {
      throw new Error("Admin permissions are fixed and always grant full access");
    }

    await this.seedCatalog();

    const sanitizedKeys = [...new Set(keys.filter(isPermissionKey))];
    const permissionRows = sanitizedKeys.length
      ? await db
          .select({
            id: permissions.id,
            key: permissions.key,
          })
          .from(permissions)
          .where(inArray(permissions.key, sanitizedKeys))
      : [];

    if (permissionRows.length !== sanitizedKeys.length) {
      const foundKeys = new Set(permissionRows.map((row) => row.key));
      const missingKeys = sanitizedKeys.filter((key) => !foundKeys.has(key));
      throw new Error(`Unknown permission keys: ${missingKeys.join(", ")}`);
    }

    await db.transaction(async (tx) => {
      await tx.delete(userPermissions).where(eq(userPermissions.userId, userId));

      if (!permissionRows.length) {
        return;
      }

      await tx.insert(userPermissions).values(
        permissionRows.map((permissionRow) => ({
          userId,
          permissionId: permissionRow.id,
          createdAt: new Date(),
        }))
      );
    });

    return sanitizedKeys;
  },
};
