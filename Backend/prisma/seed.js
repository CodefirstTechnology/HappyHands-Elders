const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const { seedRoles, ROLE_IDS } = require("../src/services/roleService");

const prisma = new PrismaClient();

const toSkillCode = (label) =>
  label
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_|_$/g, "");

async function main() {
  await seedRoles(prisma);

  const password = await bcrypt.hash("ChildCare@123", 12);

  const adminUser = await prisma.user.upsert({
    where: { email: "admin@childcare.com" },
    update: {},
    create: {
      name: "Admin User",
      email: "admin@childcare.com",
      password,
      roleId: ROLE_IDS.ADMIN,
      coordinator: {
        create: { agencyName: "ChildCare Admin", city: "Mumbai" }
      }
    },
    include: { coordinator: true }
  });

  if (!adminUser.coordinator) {
    await prisma.coordinator.create({
      data: {
        userId: adminUser.id,
        agencyName: "ChildCare Admin",
        city: "Mumbai"
      }
    });
  }

  await prisma.user.upsert({
    where: { email: "coordinator@childcare.com" },
    update: {},
    create: {
      name: "Demo Coordinator",
      email: "coordinator@childcare.com",
      phone: "9000000001",
      password,
      roleId: ROLE_IDS.COORDINATOR,
      coordinator: {
        create: { agencyName: "ChildCare Agency", city: "Mumbai" }
      }
    },
    include: { coordinator: true }
  });

  const childcareSkillNames = [
    "Newborn care (0–3 months)",
    "Infant care (3–12 months)",
    "Toddler care (1–3 years)",
    "Night nanny / overnight baby care",
    "Baby feeding & nutrition",
    "Baby sleep routines",
    "Diaper & hygiene care",
    "Premature / NICU baby care",
    "Twin & multiple babies",
    "Infant CPR & first aid certified",
    "Breastfeeding support",
    "Colic & reflux care"
  ];

  const defaultSkills = childcareSkillNames.map((name, index) => ({
    label: name,
    sortOrder: index + 1,
    code: toSkillCode(name)
  }));

  const activeCodes = new Set(defaultSkills.map((s) => s.code));

  for (const skill of defaultSkills) {
    await prisma.skill.upsert({
      where: { code: skill.code },
      update: { label: skill.label, sortOrder: skill.sortOrder, isActive: true },
      create: skill
    });
  }

  await prisma.skill.updateMany({
    where: { code: { notIn: [...activeCodes] } },
    data: { isActive: false }
  });

  console.log("Seed complete:");
  console.log("  Admin: admin@childcare.com / ChildCare@123");
  console.log("  Coordinator: coordinator@childcare.com / ChildCare@123");
  console.log(`  Skills: ${defaultSkills.length} childcare skills`);
  console.log("  Default caregiver password reference: Caregiver@123");
  console.log("  Register parents via POST /api/v1/auth/register-parent");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
