import 'dotenv/config';
import { PrismaClient, StaffRole, StaffStatus } from '@prisma/client';
import { hash } from 'argon2';

type TableNameRow = {
  table_name: string;
};

const prisma = new PrismaClient();

const EXCLUDED_TABLES = ['_prisma_migrations', 'pockets', 'pocket_transactions'];

const ADMIN_USERNAME = process.env.SEED_ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD || 'Admin@123456';
const ADMIN_FULL_NAME = process.env.SEED_ADMIN_FULL_NAME || 'Default Admin';
const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL || 'admin@example.com';
const ADMIN_PHONE = process.env.SEED_ADMIN_PHONE || '00000000000';

function quoteIdentifier(identifier: string): string {
  return `"${identifier.replace(/"/g, '""')}"`;
}

async function truncateAllTablesExceptPettyCash() {
  const tables = await prisma.$queryRaw<TableNameRow[]>`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
      AND table_name NOT IN (${EXCLUDED_TABLES[0]}, ${EXCLUDED_TABLES[1]}, ${EXCLUDED_TABLES[2]})
  `;

  if (tables.length === 0) {
    console.log('No tables found to truncate.');
    return;
  }

  const truncatedTableList = tables.map((table) => quoteIdentifier(table.table_name)).join(', ');
  const truncateQuery = `TRUNCATE TABLE ${truncatedTableList} RESTART IDENTITY CASCADE;`;

  await prisma.$executeRawUnsafe(truncateQuery);
  console.log(`Truncated ${tables.length} table(s), preserving petty cash tables.`);
}

async function seedDefaultAdmin() {
  const staffCount = await prisma.staff.count();
  const hashedPassword = await hash(ADMIN_PASSWORD);

  const staffId = `STF${String(staffCount + 1).padStart(3, '0')}`;

  const admin = await prisma.staff.upsert({
    where: {
      username: ADMIN_USERNAME
    },
    update: {
      fullName: ADMIN_FULL_NAME,
      email: ADMIN_EMAIL,
      phone: ADMIN_PHONE,
      password: hashedPassword,
      role: StaffRole.ADMIN,
      status: StaffStatus.ACTIVE,
      refreshToken: null,
      lastLogin: null
    },
    create: {
      staffId,
      fullName: ADMIN_FULL_NAME,
      username: ADMIN_USERNAME,
      email: ADMIN_EMAIL,
      phone: ADMIN_PHONE,
      password: hashedPassword,
      role: StaffRole.ADMIN,
      status: StaffStatus.ACTIVE
    },
    select: {
      id: true,
      staffId: true,
      username: true,
      role: true
    }
  });

  console.log('Default admin account is ready:');
  console.log(`- username: ${admin.username}`);
  console.log(`- staffId: ${admin.staffId}`);
  console.log(`- role: ${admin.role}`);
  console.log('Password source: SEED_ADMIN_PASSWORD env var or fallback default (Admin@123456).');
}

async function main() {
  console.log('Resetting database while preserving petty cash data...');

  await truncateAllTablesExceptPettyCash();
  await seedDefaultAdmin();

  console.log('Database reset and admin seed complete.');
}

main()
  .catch((error: unknown) => {
    console.error('Failed to reset and seed database:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });