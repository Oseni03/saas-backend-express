import "dotenv/config";
import { PrismaClient } from "@/generated/prisma/client";
import { MemberRole, PlanTier } from "@/generated/prisma";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // ── Users ─────────────────────────────────────────────────────────────────
  const adminEmail = "admin@example.com";
  const memberEmail = "member@example.com";

  const [admin, member] = await Promise.all([
    prisma.user.upsert({
      where: { email: adminEmail },
      update: {},
      create: {
        email: adminEmail,
        hashedPassword: await bcrypt.hash("Admin1234!", 12),
        fullName: "Admin User",
        isActive: true,
        isVerified: true,
        isSuperuser: true,
      },
    }),
    prisma.user.upsert({
      where: { email: memberEmail },
      update: {},
      create: {
        email: memberEmail,
        hashedPassword: await bcrypt.hash("Member1234!", 12),
        fullName: "Regular Member",
        isActive: true,
        isVerified: true,
      },
    }),
  ]);

  // ── Organization ──────────────────────────────────────────────────────────
  const org = await prisma.organization.upsert({
    where: { slug: "acme-corp" },
    update: {},
    create: {
      name: "Acme Corp",
      slug: "acme-corp",
      plan: PlanTier.FREE,
    },
  });

  // ── Memberships ───────────────────────────────────────────────────────────
  await Promise.all([
    prisma.membership.upsert({
      where: { userId_organizationId: { userId: admin.id, organizationId: org.id } },
      update: {},
      create: { userId: admin.id, organizationId: org.id, role: MemberRole.OWNER },
    }),
    prisma.membership.upsert({
      where: { userId_organizationId: { userId: member.id, organizationId: org.id } },
      update: {},
      create: { userId: member.id, organizationId: org.id, role: MemberRole.MEMBER },
    }),
  ]);

  console.log("✅ Seed complete!");
  console.log(`   Admin:  ${adminEmail} / Admin1234!`);
  console.log(`   Member: ${memberEmail} / Member1234!`);
  console.log(`   Org:    ${org.name} (${org.slug})`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
