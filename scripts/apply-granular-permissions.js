const fs = require("fs");
const path = require("path");
const { Client } = require("pg");
require("dotenv").config();

const { DEFAULT_ROLE_PERMISSION_KEYS } = require("../dist/lib/permissions");

const migrationPath = path.join(__dirname, "..", "drizzle", "0023_granular_permissions.sql");

async function main() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  await client.connect();

  try {
    await client.query("BEGIN");

    const migrationSql = fs.readFileSync(migrationPath, "utf8");
    await client.query(migrationSql);

    const usersResult = await client.query(
      "select id, name, email, role from users order by id"
    );
    const users = usersResult.rows;

    const permissionsResult = await client.query(
      'select id, "key" from permissions order by id'
    );
    const permissionIdByKey = new Map(
      permissionsResult.rows.map((row) => [row.key, row.id])
    );

    const assignmentSummary = [];

    for (const user of users) {
      await client.query("delete from user_permissions where user_id = $1", [user.id]);

      if (user.role === "admin") {
        assignmentSummary.push({
          userId: user.id,
          email: user.email,
          role: user.role,
          assignedPermissions: "admin-bypass",
        });
        continue;
      }

      const defaultKeys = DEFAULT_ROLE_PERMISSION_KEYS[user.role] || [];
      const permissionIds = defaultKeys
        .map((key) => permissionIdByKey.get(key))
        .filter((value) => Number.isInteger(value));

      if (permissionIds.length > 0) {
        await client.query(
          `
            insert into user_permissions (user_id, permission_id)
            select $1, value
            from unnest($2::int[]) as value
            on conflict (user_id, permission_id) do nothing
          `,
          [user.id, permissionIds]
        );
      }

      assignmentSummary.push({
        userId: user.id,
        email: user.email,
        role: user.role,
        assignedPermissions: permissionIds.length,
      });
    }

    await client.query("COMMIT");

    console.log(
      JSON.stringify(
        {
          appliedMigration: path.basename(migrationPath),
          users: assignmentSummary,
          permissionCatalogCount: permissionsResult.rows.length,
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
