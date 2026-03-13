import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';
import * as argon from 'argon2';

const prisma = new PrismaClient(
  {
    adapter: new PrismaPg({
      connectionString: process.env.DATABASE_URL!,
    })
  }
);

async function main() {
  await prisma.role.upsert({
    where: { roleName: 'user' },
    update: {},
    create: { roleName: 'user' },
  });

  const adminRole = await prisma.role.upsert({
    where: { roleName: 'admin' },
    update: {},
    create: { roleName: 'admin' },
  });

  const adminEmail = process.env.ADMIN_EMAIL ?? 'admin@example.com';
  const adminPassword = process.env.ADMIN_PASSWORD ?? 'admin123';
  const hashedPassword = await argon.hash(adminPassword);

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      password: hashedPassword,
      roleId: adminRole.role_id,
    },
    create: {
      email: adminEmail,
      password: hashedPassword,
      firstName: 'Admin',
      lastName: 'User',
      roleId: adminRole.role_id,
    },
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
