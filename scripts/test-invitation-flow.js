const { Client } = require("pg");
require("dotenv").config();

async function main() {
  const appModule = require("../dist/app");
  const app = appModule.default || appModule;
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  const testEmail = `invite.test.${Date.now()}@example.com`;
  const invalidToken = "invalid-token-for-test";
  const createdInvitationIds = [];
  let createdUserEmail = null;

  await client.connect();

  const server = await new Promise((resolve) => {
    const instance = app.listen(5051, "127.0.0.1", () => resolve(instance));
  });

  const request = async (path, options = {}) => {
    const response = await fetch(`http://127.0.0.1:5051${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
    });

    const payload = await response.json();
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
        name: "Invitation Flow Test",
        email: testEmail,
        phone: "01000000000",
        notes: "Automated verification",
        expiresInDays: 7,
      }),
    });

    if (!invitationCreate.ok) {
      throw new Error(`Invitation creation failed: ${JSON.stringify(invitationCreate.payload)}`);
    }

    const invitation = invitationCreate.payload.data;
    createdInvitationIds.push(invitation.id);
    const inviteToken = invitation.inviteUrl.split("/invite/")[1];

    const invitationRead = await request(`/api/invitations/${inviteToken}`);
    if (!invitationRead.ok || invitationRead.payload.data.status !== "pending") {
      throw new Error(`Invitation fetch failed: ${JSON.stringify(invitationRead.payload)}`);
    }

    const invitationAccept = await request(`/api/invitations/${inviteToken}/accept`, {
      method: "POST",
      body: JSON.stringify({
        name: "Invitation Flow Test",
        phone: "01000000000",
        email: testEmail,
        password: "TempPass123!",
      }),
    });

    if (!invitationAccept.ok) {
      throw new Error(`Invitation accept failed: ${JSON.stringify(invitationAccept.payload)}`);
    }

    createdUserEmail = testEmail;

    const userLogin = await request("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({
        email: testEmail,
        password: "TempPass123!",
      }),
    });

    if (!userLogin.ok) {
      throw new Error(`Invited user login failed: ${JSON.stringify(userLogin.payload)}`);
    }

    const reusedInvitation = await request(`/api/invitations/${inviteToken}/accept`, {
      method: "POST",
      body: JSON.stringify({
        name: "Invitation Flow Test",
        phone: "01000000000",
        email: testEmail,
        password: "TempPass123!",
      }),
    });

    const invalidInvitation = await request(`/api/invitations/${invalidToken}`);

    const expiredCreate = await request("/api/invitations", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        role: "technician",
        name: "Expired Invitation Test",
        email: `expired.${Date.now()}@example.com`,
        phone: "01000000001",
        expiresInDays: 1,
      }),
    });

    if (!expiredCreate.ok) {
      throw new Error(`Expired invitation creation failed: ${JSON.stringify(expiredCreate.payload)}`);
    }

    const expiredInvitation = expiredCreate.payload.data;
    createdInvitationIds.push(expiredInvitation.id);
    const expiredToken = expiredInvitation.inviteUrl.split("/invite/")[1];

    await client.query(
      "update staff_invitations set expires_at = now() - interval '1 day', updated_at = now() where id = $1",
      [expiredInvitation.id]
    );

    const expiredRead = await request(`/api/invitations/${expiredToken}`);
    const expiredAccept = await request(`/api/invitations/${expiredToken}/accept`, {
      method: "POST",
      body: JSON.stringify({
        name: "Expired Invitation Test",
        phone: "01000000001",
        email: `expired.accept.${Date.now()}@example.com`,
        password: "TempPass123!",
      }),
    });

    console.log(
      JSON.stringify(
        {
          adminLogin: adminLogin.payload.success,
          invitationCreated: invitationCreate.payload.data,
          invitationReadStatus: invitationRead.payload.data.status,
          acceptedInvitationUser: invitationAccept.payload.data.user,
          invitedUserLogin: userLogin.payload.success,
          reusedInvitationStatus: reusedInvitation.status,
          reusedInvitationMessage: reusedInvitation.payload.message,
          invalidInvitationStatus: invalidInvitation.status,
          expiredInvitationStatus: expiredRead.payload.data.status,
          expiredAcceptStatus: expiredAccept.status,
          expiredAcceptMessage: expiredAccept.payload.message,
        },
        null,
        2
      )
    );
  } finally {
    if (createdInvitationIds.length > 0) {
      await client.query("delete from staff_invitations where id = any($1::int[])", [createdInvitationIds]);
    }

    if (createdUserEmail) {
      await client.query("delete from users where email = $1", [createdUserEmail]);
    }

    await client.end();
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
