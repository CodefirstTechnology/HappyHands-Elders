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

  const password = await bcrypt.hash("ElderCare@123", 12);

  const adminUser = await prisma.user.upsert({
    where: { email: "admin@eldercare.com" },
    update: { email: "admin@eldercare.com" },
    create: {
      name: "Admin User",
      email: "admin@eldercare.com",
      password,
      roleId: ROLE_IDS.ADMIN,
      coordinator: {
        create: { agencyName: "ElderCare Admin", city: "Mumbai" }
      }
    },
    include: { coordinator: true }
  });

  if (!adminUser.coordinator) {
    await prisma.coordinator.create({
      data: {
        userId: adminUser.id,
        agencyName: "ElderCare Admin",
        city: "Mumbai"
      }
    });
  }

  await prisma.user.upsert({
    where: { email: "coordinator@eldercare.com" },
    update: { email: "coordinator@eldercare.com" },
    create: {
      name: "Demo Coordinator",
      email: "coordinator@eldercare.com",
      phone: "9000000001",
      password,
      roleId: ROLE_IDS.COORDINATOR,
      coordinator: {
        create: { agencyName: "ElderCare Agency", city: "Mumbai" }
      }
    },
    include: { coordinator: true }
  });

  const eldercareSkillNames = [
    "Companion Care",
    "Personal Hygiene Assistance",
    "Medication Reminders",
    "Mobility Assistance",
    "Dementia Care",
    "Palliative Care",
    "Emergency Response"
  ];

  const defaultSkills = eldercareSkillNames.map((name, index) => ({
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
  console.log("  Admin: admin@eldercare.com / ElderCare@123");
  console.log("  Coordinator: coordinator@eldercare.com / ElderCare@123");
  console.log(`  Skills: ${defaultSkills.length} eldercare skills`);
  console.log("  Default caregiver password reference: Caregiver@123");
  console.log("  Register family clients via POST /api/v1/auth/register-parent");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
