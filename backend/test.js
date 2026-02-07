const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');

function loadEnvFromFile() {
  if (process.env.DATABASE_URL) return;

  const envPath = path.join(__dirname, '.env');
  if (!fs.existsSync(envPath)) return;

  const content = fs.readFileSync(envPath, 'utf8');
  const lines = content.split(/\r?\n/);

  for (const line of lines) {
    if (!line || line.trim().startsWith('#')) continue;
    const match = line.match(/^([^=]+)=(.*)$/);
    if (!match) continue;

    const key = match[1].trim();
    let value = match[2].trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

async function ensureAdmin() {
  loadEnvFromFile();

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error(
      'DATABASE_URL is not set. Add it to backend/.env or export it before running this script.',
    );
  }

  const adminEmail = process.env.ADMIN_EMAIL || 'admin@gmail.com';
  const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@1234';
  const adminFirstName = process.env.ADMIN_FIRST_NAME || 'Admin';
  const adminMiddleName = process.env.ADMIN_MIDDLE_NAME || null;
  const adminLastName = process.env.ADMIN_LAST_NAME || 'User';

  const pool = new Pool({ connectionString: databaseUrl });

  try {
    await pool.query('BEGIN');

    const roleResult = await pool.query(
      'SELECT id FROM roles WHERE name = $1',
      ['admin'],
    );

    let roleId = roleResult.rows[0]?.id;
    if (!roleId) {
      const insertedRole = await pool.query(
        'INSERT INTO roles (name, description) VALUES ($1, $2) RETURNING id',
        ['admin', 'Administrator role'],
      );
      roleId = insertedRole.rows[0].id;
    }

    const existingUserResult = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [adminEmail],
    );

    let userId = existingUserResult.rows[0]?.id;
    if (!userId) {
      const passwordHash = await bcrypt.hash(adminPassword, 10);

      const insertedUser = await pool.query(
        `INSERT INTO users
          (email, password, first_name, middle_name, last_name, account_status, is_email_verified)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id`,
        [
          adminEmail,
          passwordHash,
          adminFirstName,
          adminMiddleName,
          adminLastName,
          'ACTIVE',
          true,
        ],
      );

      userId = insertedUser.rows[0].id;
    }

    const userRoleResult = await pool.query(
      'SELECT 1 FROM user_roles WHERE user_id = $1 AND role_id = $2',
      [userId, roleId],
    );

    if (userRoleResult.rowCount === 0) {
      await pool.query(
        'INSERT INTO user_roles (user_id, role_id, assigned_by) VALUES ($1, $2, $3)',
        [userId, roleId, 'SYSTEM'],
      );
    }

    await pool.query('COMMIT');

    console.log('Admin account is ready.');
    console.log(`Email: ${adminEmail}`);
    if (!process.env.ADMIN_PASSWORD) {
      console.log(`Password: ${adminPassword}`);
    }
  } catch (error) {
    await pool.query('ROLLBACK');
    throw error;
  } finally {
    await pool.end();
  }
}

ensureAdmin().catch((error) => {
  console.error('Failed to create admin account:', error.message);
  process.exitCode = 1;
});
