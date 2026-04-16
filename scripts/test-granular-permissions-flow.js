const { Client } = require("pg");
require("dotenv").config();

async function main() {
  const appModule = require("../dist/app");
  const app = appModule.default || appModule;
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  const testEmail = `permissions.test.${Date.now()}@example.com`;
  const testPassword = "PermsPass123!";
  const cleanupInvitationIds = [];
  let createdUserId = null;

  await client.connect();

  const server = await new Promise((resolve) => {
    const instance = app.listen(5052, "127.0.0.1", () => resolve(instance));
  });

  const request = async (path, options = {}) => {
    const response = await fetch(`http://127.0.0.1:5052${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
    });

    let payload = null;
    try {
      payload = await response.json();
    } catch {
      payload = null;
    }

    return {
      ok: response.ok,
      status: response.status,
      payload,
    };
  };

  try {
    const adminLogin = await request("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({
        email: "admin@example.com",
        password: "12345678",
      }),
    });

    if (!adminLogin.ok) {
      throw new Error(`Admin login failed: ${JSON.stringify(adminLogin.payload)}`);
    }

    const adminToken = adminLogin.payload.data.token;

    const invitationCreate = await request("/api/invitations", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        role: "technician",
        name: "Permissions Flow Test",
        email: testEmail,
        phone: "01000000002",
        expiresInDays: 7,
      }),
    });

    if (!invitationCreate.ok) {
      throw new Error(`Invitation creation failed: ${JSON.stringify(invitationCreate.payload)}`);
    }

    const invitation = invitationCreate.payload.data;
    cleanupInvitationIds.push(invitation.id);
    const inviteToken = invitation.inviteUrl.split("/invite/")[1];

    const acceptInvitation = await request(`/api/invitations/${inviteToken}/accept`, {
      method: "POST",
      body: JSON.stringify({
        name: "Permissions Flow Test",
        email: testEmail,
        phone: "01000000002",
        password: testPassword,
      }),
    });

    if (!acceptInvitation.ok) {
      throw new Error(`Invitation accept failed: ${JSON.stringify(acceptInvitation.payload)}`);
    }

    createdUserId = acceptInvitation.payload.data.user.id;

    const userLogin = await request("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({
        email: testEmail,
        password: testPassword,
      }),
    });

    if (!userLogin.ok) {
      throw new Error(`Temp user login failed: ${JSON.stringify(userLogin.payload)}`);
    }

    const initialUserPermissions = userLogin.payload.data.user.permissions || [];

    const initialCasesAccess = await request("/api/cases", {
      headers: {
        Authorization: `Bearer ${userLogin.payload.data.token}`,
      },
    });

    const restrictPermissions = await request(`/api/auth/team/${createdUserId}/permissions`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        permissions: [
          "dashboard.view",
          "cases.view",
          "cases.column.new.view",
        ],
      }),
    });

    if (!restrictPermissions.ok) {
      throw new Error(`Permission update failed: ${JSON.stringify(restrictPermissions.payload)}`);
    }

    const updatedPermissionsRead = await request(`/api/auth/team/${createdUserId}/permissions`, {
      headers: {
        Authorization: `Bearer ${adminToken}`,
      },
    });

    if (!updatedPermissionsRead.ok) {
      throw new Error(`Permission read failed: ${JSON.stringify(updatedPermissionsRead.payload)}`);
    }

    const restrictedCasesAccess = await request("/api/cases", {
      headers: {
        Authorization: `Bearer ${userLogin.payload.data.token}`,
      },
    });

    const restrictedInventoryAccess = await request("/api/inventory/items", {
      headers: {
        Authorization: `Bearer ${userLogin.payload.data.token}`,
      },
    });

    console.log(
      JSON.stringify(
        {
          adminLogin: adminLogin.payload.success,
          tempUser: {
            id: createdUserId,
            email: testEmail,
            initialPermissionCount: initialUserPermissions.length,
          },
          initialCasesAccessStatus: initialCasesAccess.status,
          updatedPermissions: updatedPermissionsRead.payload.data.permissions,
          restrictedCasesAccessStatus: restrictedCasesAccess.status,
          restrictedInventoryAccessStatus: restrictedInventoryAccess.status,
        },
        null,
        2
      )
    );
  } finally {
    if (cleanupInvitationIds.length > 0) {
      await client.query("delete from staff_invitations where id = any($1::int[])", [cleanupInvitationIds]);
    }

    if (createdUserId) {
      await client.query("delete from user_permissions where user_id = $1", [createdUserId]);
      await client.query("delete from users where id = $1", [createdUserId]);
    }

    await client.end();
    await new Promise((resolve, reject) => {
      if (!server || !server.listening) {
        resolve();
        return;
      }

      server.close((error) => {
        if (error && error.code !== "ERR_SERVER_NOT_RUNNING") {
          reject(error);
          return;
        }

        resolve();
      });
    });
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
