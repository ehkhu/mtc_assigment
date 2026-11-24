import { prisma } from "../src/lib/prisma";
import { hashPassword } from "../src/lib/password";

/**
 * Resets the database to a small clinic used to try both roles.
 * Every account uses the password `password123`.
 *
 * Helen Chen owns Maya Chen, and shares Amira Hassan with Samuel Okonkwo.
 * Samuel owns Luis Ortega. Noah Berg has no records, so only an admin sees him.
 */
async function main() {
  await prisma.medicalRecord.deleteMany();
  await prisma.patient.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await hashPassword("password123");

  const admin = await prisma.user.create({
    data: {
      email: "admin@clinic.test",
      name: "Alex Morgan",
      role: "ADMIN",
      passwordHash,
    },
  });

  const helen = await prisma.user.create({
    data: {
      email: "helen.chen@clinic.test",
      name: "Helen Chen",
      role: "DOCTOR",
      passwordHash,
    },
  });

  const samuel = await prisma.user.create({
    data: {
      email: "samuel.okonkwo@clinic.test",
      name: "Samuel Okonkwo",
      role: "DOCTOR",
      passwordHash,
    },
  });

  const maya = await prisma.patient.create({
    data: { name: "Maya Chen", dateOfBirth: "1979-04-12" },
  });
  const luis = await prisma.patient.create({
    data: { name: "Luis Ortega", dateOfBirth: "1992-11-03" },
  });
  const amira = await prisma.patient.create({
    data: { name: "Amira Hassan", dateOfBirth: "1988-07-21" },
  });
  await prisma.patient.create({
    data: { name: "Noah Berg", dateOfBirth: "2001-01-30" },
  });

  await prisma.medicalRecord.createMany({
    data: [
      {
        patientId: maya.id,
        doctorId: helen.id,
        diagnosis: "Essential hypertension",
        treatment: "Lisinopril 10mg daily. Home blood pressure log for 4 weeks.",
        createdAt: new Date("2026-01-14T15:10:00.000Z"),
      },
      {
        patientId: luis.id,
        doctorId: samuel.id,
        diagnosis: "Seasonal allergic rhinitis",
        treatment: "Cetirizine 10mg as needed during pollen season.",
        createdAt: new Date("2026-02-03T11:00:00.000Z"),
      },
      {
        patientId: amira.id,
        doctorId: helen.id,
        diagnosis: "Type 2 diabetes mellitus",
        treatment: "Metformin 500mg twice daily. Review diet at the next visit.",
        createdAt: new Date("2026-03-01T09:30:00.000Z"),
      },
      {
        patientId: amira.id,
        doctorId: samuel.id,
        diagnosis: "Iron deficiency",
        treatment: "Ferrous sulfate 325mg daily for 8 weeks.",
        createdAt: new Date("2026-04-01T14:15:00.000Z"),
      },
    ],
  });

  console.log("Seeded Mini Clinic.");
  console.log(`Admin id: ${admin.id}`);
  console.log("Password for every account: password123");
  console.log("  admin@clinic.test");
  console.log("  helen.chen@clinic.test");
  console.log("  samuel.okonkwo@clinic.test");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
