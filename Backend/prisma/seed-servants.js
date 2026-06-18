const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const { seedRoles, ROLE_IDS } = require("../src/services/roleService");

const prisma = new PrismaClient();

const SERVANTS = [
  {
    name: "Ravi Kumar",
    email: "ravi.servant@staffera.com",
    phone: "9100000001",
    city: "Mumbai",
    zoneName: "Bandra West",
    latitude: 19.0596,
    longitude: 72.8295,
    skills: ["Cooking", "Cleaning"]
  },
  {
    name: "Priya Sharma",
    email: "priya.servant@staffera.com",
    phone: "9100000002",
    city: "Mumbai",
    zoneName: "Andheri East",
    latitude: 19.1136,
    longitude: 72.8697,
    skills: ["Cleaning", "Laundry"]
  },
  {
    name: "Amit Singh",
    email: "amit.servant@staffera.com",
    phone: "9100000003",
    city: "Delhi",
    zoneName: "Connaught Place",
    latitude: 28.6315,
    longitude: 77.2167,
    skills: ["Cooking", "Utensils"]
  },
  {
    name: "Lakshmi Reddy",
    email: "lakshmi.servant@staffera.com",
    phone: "9100000004",
    city: "Hyderabad",
    zoneName: "Gachibowli",
    latitude: 17.4401,
    longitude: 78.3489,
    skills: ["Cleaning", "Cooking"]
  },
  {
    name: "Suresh Patel",
    email: "suresh.servant@staffera.com",
    phone: "9100000005",
    city: "Ahmedabad",
    zoneName: "Satellite",
    latitude: 23.0225,
    longitude: 72.5714,
    skills: ["Gardening", "Cleaning"]
  },
  {
    name: "Meena Iyer",
    email: "meena.servant@staffera.com",
    phone: "9100000006",
    city: "Chennai",
    zoneName: "T Nagar",
    latitude: 13.0418,
    longitude: 80.2341,
    skills: ["Cooking", "Laundry"]
  },
  {
    name: "Vikram Das",
    email: "vikram.servant@staffera.com",
    phone: "9100000007",
    city: "Kolkata",
    zoneName: "Salt Lake",
    latitude: 22.5868,
    longitude: 88.4125,
    skills: ["Cleaning", "Utensils"]
  },
  {
    name: "Anita Desai",
    email: "anita.servant@staffera.com",
    phone: "9100000008",
    city: "Pune",
    zoneName: "Hinjewadi",
    latitude: 18.5912,
    longitude: 73.7389,
    skills: ["Cooking", "Cleaning"]
  },
  {
    name: "Rajesh Nair",
    email: "rajesh.servant@staffera.com",
    phone: "9100000009",
    city: "Bangalore",
    zoneName: "Koramangala",
    latitude: 12.9352,
    longitude: 77.6245,
    skills: ["Cleaning", "Laundry"]
  },
  {
    name: "Kavita Verma",
    email: "kavita.servant@staffera.com",
    phone: "9100000010",
    city: "Jaipur",
    zoneName: "Malviya Nagar",
    latitude: 26.8547,
    longitude: 75.8243,
    skills: ["Cooking", "Cleaning"]
  },
  {
    name: "Mohit Gupta",
    email: "mohit.servant@staffera.com",
    phone: "9100000011",
    city: "Lucknow",
    zoneName: "Gomti Nagar",
    latitude: 26.8496,
    longitude: 81.0076,
    skills: ["Utensils", "Cleaning"]
  },
  {
    name: "Sunita Kaur",
    email: "sunita.servant@staffera.com",
    phone: "9100000012",
    city: "Chandigarh",
    zoneName: "Sector 17",
    latitude: 30.7415,
    longitude: 76.7821,
    skills: ["Cooking", "Laundry"]
  }
];

async function upsertServant(agentId, data, passwordHash) {
  const existing = await prisma.user.findUnique({
    where: { email: data.email },
    include: { servant: { include: { zones: true, skills: true } } }
  });

  if (existing?.servant) {
    await prisma.$transaction([
      prisma.user.update({
        where: { id: existing.id },
        data: {
          name: data.name,
          phone: data.phone,
          password: passwordHash,
          roleId: ROLE_IDS.SERVANT
        }
      }),
      prisma.servant.update({
        where: { id: existing.servant.id },
        data: {
          agentId,
          verificationStatus: "VERIFIED",
          verifiedAt: new Date(),
          experience: 3,
          hourlyRate: 150,
          monthlyRate: 12000,
          bio: `Experienced helper in ${data.city}`
        }
      }),
      prisma.servantSkill.deleteMany({ where: { servantId: existing.servant.id } }),
      prisma.zone.deleteMany({ where: { servantId: existing.servant.id } })
    ]);

    await prisma.servantSkill.createMany({
      data: data.skills.map((skillName) => ({ servantId: existing.servant.id, skillName }))
    });

    await prisma.zone.create({
      data: {
        servantId: existing.servant.id,
        name: data.zoneName,
        city: data.city,
        latitude: data.latitude,
        longitude: data.longitude,
        description: `Service area — ${data.zoneName}, ${data.city}`
      }
    });

    return existing.servant.id;
  }

  const user = await prisma.user.create({
    data: {
      name: data.name,
      email: data.email,
      phone: data.phone,
      password: passwordHash,
      roleId: ROLE_IDS.SERVANT,
      servant: {
        create: {
          agentId,
          verificationStatus: "VERIFIED",
          verifiedAt: new Date(),
          experience: 3,
          hourlyRate: 150,
          monthlyRate: 12000,
          bio: `Experienced helper in ${data.city}`,
          skills: { create: data.skills.map((skillName) => ({ skillName })) },
          zones: {
            create: {
              name: data.zoneName,
              city: data.city,
              latitude: data.latitude,
              longitude: data.longitude,
              description: `Service area — ${data.zoneName}, ${data.city}`
            }
          }
        }
      }
    },
    include: { servant: true }
  });

  return user.servant.id;
}

async function main() {
  await seedRoles(prisma);

  const passwordHash = await bcrypt.hash("123456", 12);

  let agent = await prisma.agent.findFirst({
    where: { user: { email: "agent@staffera.com" } }
  });

  if (!agent) {
    const adminPassword = await bcrypt.hash("StaffEra@123", 12);
    await prisma.user.upsert({
      where: { email: "agent@staffera.com" },
      update: {},
      create: {
        name: "Demo Agent",
        email: "agent@staffera.com",
        phone: "9000000001",
        password: adminPassword,
        roleId: ROLE_IDS.AGENT,
        agent: { create: { agencyName: "StaffEra Agency", city: "Mumbai" } }
      }
    });
    agent = await prisma.agent.findFirst({
      where: { user: { email: "agent@staffera.com" } }
    });
  }

  console.log(`Seeding ${SERVANTS.length} servants (password: 123456)...\n`);

  for (const s of SERVANTS) {
    const id = await upsertServant(agent.id, s, passwordHash);
    console.log(`  ✓ ${s.name} — ${s.city} (${s.zoneName}) [servant #${id}]`);
    console.log(`    login: ${s.email}`);
  }

  console.log("\nDone. All servants are VERIFIED with one zone each.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
