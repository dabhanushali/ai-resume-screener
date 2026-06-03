const path = require('path');
// Load env variables from root .env
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const pg = require('pg');
const bcrypt = require('bcryptjs');

const connectionString = process.env.DATABASE_URL;
const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const email = 'hr@enacton.com';
  const password = 'Wellcome@123';
  const name = "Enacton's HR Team";

  console.log(`[Seed] Starting seed process for user: ${email}...`);

  // Hash the password with bcrypt (cost factor of 10)
  const passwordHash = await bcrypt.hash(password, 10);

  // Upsert the user to prevent duplicates
  const user = await prisma.user.upsert({
    where: { email },
    update: {
      passwordHash,
      name,
      status: 'ACTIVE',
    },
    create: {
      email,
      name,
      passwordHash,
      status: 'ACTIVE',
    },
  });

  console.log(`[Seed] User successfully seeded:`, {
    id: user.id,
    name: user.name,
    email: user.email,
    status: user.status,
  });
}

main()
  .catch((e) => {
    console.error('[Seed] Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
