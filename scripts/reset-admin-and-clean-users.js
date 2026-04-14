const bcrypt = require("bcrypt");
const { Client } = require("pg");
require("dotenv").config();

const ADMIN_PASSWORD = "12345678";

const client = new Client({
  connectionString: process.env.DATABASE_URL,
});

const pickPrimaryAdmin = (admins) => {
  return (
    admins.find((admin) => admin.email === "admin@example.com") ??
    admins.sort((left, right) => left.id - right.id)[0]
  );
};

async function main() {
  await client.connect();

  try {
    await client.query("BEGIN");

    const adminsResult = await client.query(
      "select id, name, email, role from users where role = 'admin' order by id"
    );
    const admins = adminsResult.rows;

    if (!admins.length) {
      throw new Error("No admin account found in users table");
    }

    const primaryAdmin = pickPrimaryAdmin(admins);
    const nonAdminsResult = await client.query(
      "select id, name, email, role from users where id <> $1 and role <> 'admin' order by id",
      [primaryAdmin.id]
    );
    const nonAdmins = nonAdminsResult.rows;

    const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 10);
    await client.query("update users set password = $1 where id = $2", [
      hashedPassword,
      primaryAdmin.id,
    ]);

    if (nonAdmins.length > 0) {
      const nonAdminIds = nonAdmins.map((user) => user.id);

      await client.query(
        "update cases set assigned_technician_id = null where assigned_technician_id = any($1::int[])",
        [nonAdminIds]
      );
      await client.query(
        "update cases set created_by = $1 where created_by = any($2::int[])",
        [primaryAdmin.id, nonAdminIds]
      );
      await client.query(
        "update cases set customer_approved_by = $1 where customer_approved_by = any($2::int[])",
        [primaryAdmin.id, nonAdminIds]
      );
      await client.query(
        "update customers set created_by = $1 where created_by = any($2::int[])",
        [primaryAdmin.id, nonAdminIds]
      );
      await client.query(
        "update devices set created_by = $1 where created_by = any($2::int[])",
        [primaryAdmin.id, nonAdminIds]
      );
      await client.query(
        "update case_status_history set changed_by = $1 where changed_by = any($2::int[])",
        [primaryAdmin.id, nonAdminIds]
      );
      await client.query(
        "update case_parts set added_by = $1 where added_by = any($2::int[])",
        [primaryAdmin.id, nonAdminIds]
      );
      await client.query(
        "update case_parts set delivered_by = $1 where delivered_by = any($2::int[])",
        [primaryAdmin.id, nonAdminIds]
      );
      await client.query(
        "update case_parts set received_by = $1 where received_by = any($2::int[])",
        [primaryAdmin.id, nonAdminIds]
      );
      await client.query(
        "update case_parts set returned_by = $1 where returned_by = any($2::int[])",
        [primaryAdmin.id, nonAdminIds]
      );
      await client.query(
        "update case_parts set consumed_by = $1 where consumed_by = any($2::int[])",
        [primaryAdmin.id, nonAdminIds]
      );
      await client.query(
        "update case_services set created_by = $1 where created_by = any($2::int[])",
        [primaryAdmin.id, nonAdminIds]
      );
      await client.query(
        "update case_services set performed_by = $1 where performed_by = any($2::int[])",
        [primaryAdmin.id, nonAdminIds]
      );
      await client.query(
        "update inventory_movements set created_by = $1 where created_by = any($2::int[])",
        [primaryAdmin.id, nonAdminIds]
      );
      await client.query(
        "update invoices set created_by = $1 where created_by = any($2::int[])",
        [primaryAdmin.id, nonAdminIds]
      );
      await client.query(
        "update invoices set confirmed_by = $1 where confirmed_by = any($2::int[])",
        [primaryAdmin.id, nonAdminIds]
      );
      await client.query(
        "update media_assets set uploaded_by = $1 where uploaded_by = any($2::int[])",
        [primaryAdmin.id, nonAdminIds]
      );
      await client.query(
        "update staff_invitations set invited_by = $1 where invited_by = any($2::int[])",
        [primaryAdmin.id, nonAdminIds]
      );
      await client.query(
        "update staff_invitations set accepted_by = $1 where accepted_by = any($2::int[])",
        [primaryAdmin.id, nonAdminIds]
      );

      await client.query("delete from users where id = any($1::int[])", [nonAdminIds]);
    }

    await client.query("COMMIT");

    console.log(
      JSON.stringify(
        {
          primaryAdmin,
          adminCount: admins.length,
          deletedUsers: nonAdmins,
        },
        null,
        2
      )
    );
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
