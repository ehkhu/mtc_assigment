/**
 * Access rules for the records API.
 * The database is a throwaway SQLite file, rebuilt before the run.
 * Environment variables are set before the app is imported so the
 * Prisma client and JWT secret point at this test database.
 */
import { execSync } from "node:child_process";
import { rmSync } from "node:fs";
import path from "node:path";
import request from "supertest";
import type { Express } from "express";
import type { PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

process.env.DATABASE_URL = "file:./test.db";
process.env.JWT_SECRET = "test-secret";
process.env.CLIENT_ORIGIN = "http://localhost:5173";

const serverRoot = process.cwd();
const PASSWORD = "password123";

let app: Express;
let prisma: PrismaClient;

const id = {
  admin: "",
  helen: "",
  samuel: "",
  maya: "",
  luis: "",
  amira: "",
  noah: "",
};

async function tokenFor(email: string): Promise<string> {
  const response = await request(app).post("/auth/login").send({ email, password: PASSWORD });
  expect(response.status).toBe(200);
  return response.body.token as string;
}

beforeAll(async () => {
  for (const name of ["test.db", "test.db-journal"]) {
    rmSync(path.join(serverRoot, "prisma", name), { force: true });
  }

  execSync("npx prisma db push --skip-generate --accept-data-loss", {
    cwd: serverRoot,
    env: { ...process.env, DATABASE_URL: "file:./test.db" },
    stdio: "inherit",
  });

  const appModule = await import("../app");
  const prismaModule = await import("../lib/prisma");
  const passwordModule = await import("../lib/password");
  app = appModule.app;
  prisma = prismaModule.prisma;

  const passwordHash = await passwordModule.hashPassword(PASSWORD);
  const admin = await prisma.user.create({
    data: { email: "admin@clinic.test", name: "Alex Morgan", role: "ADMIN", passwordHash },
  });
  const helen = await prisma.user.create({
    data: { email: "helen.chen@clinic.test", name: "Helen Chen", role: "DOCTOR", passwordHash },
  });
  const samuel = await prisma.user.create({
    data: { email: "samuel.okonkwo@clinic.test", name: "Samuel Okonkwo", role: "DOCTOR", passwordHash },
  });

  const maya = await prisma.patient.create({ data: { name: "Maya Chen", dateOfBirth: "1979-04-12" } });
  const luis = await prisma.patient.create({ data: { name: "Luis Ortega", dateOfBirth: "1992-11-03" } });
  const amira = await prisma.patient.create({ data: { name: "Amira Hassan", dateOfBirth: "1988-07-21" } });
  const noah = await prisma.patient.create({ data: { name: "Noah Berg", dateOfBirth: "2001-01-30" } });

  await prisma.medicalRecord.createMany({
    data: [
      {
        patientId: maya.id,
        doctorId: helen.id,
        diagnosis: "Essential hypertension",
        treatment: "Lisinopril 10mg daily.",
        createdAt: new Date("2026-01-14T15:10:00.000Z"),
      },
      {
        patientId: luis.id,
        doctorId: samuel.id,
        diagnosis: "Seasonal allergic rhinitis",
        treatment: "Cetirizine 10mg as needed.",
        createdAt: new Date("2026-02-03T11:00:00.000Z"),
      },
      {
        patientId: amira.id,
        doctorId: helen.id,
        diagnosis: "Type 2 diabetes mellitus",
        treatment: "Metformin 500mg twice daily.",
        createdAt: new Date("2026-03-01T09:30:00.000Z"),
      },
      {
        patientId: amira.id,
        doctorId: samuel.id,
        diagnosis: "Iron deficiency",
        treatment: "Ferrous sulfate 325mg daily.",
        createdAt: new Date("2026-04-01T14:15:00.000Z"),
      },
    ],
  });

  Object.assign(id, {
    admin: admin.id,
    helen: helen.id,
    samuel: samuel.id,
    maya: maya.id,
    luis: luis.id,
    amira: amira.id,
    noah: noah.id,
  });
});

afterAll(async () => {
  await prisma?.$disconnect();
});

describe("authentication", () => {
  it("rejects an unknown email and a wrong password with the same error", async () => {
    const unknown = await request(app).post("/auth/login").send({
      email: "missing@clinic.test",
      password: PASSWORD,
    });
    const wrong = await request(app).post("/auth/login").send({
      email: "helen.chen@clinic.test",
      password: "not-the-password",
    });

    expect(unknown.status).toBe(401);
    expect(wrong.status).toBe(401);
    expect(unknown.body).toEqual(wrong.body);
  });

  it("requires a bearer token on the records endpoint", async () => {
    const missing = await request(app).get(`/patients/${id.maya}/records`);
    const garbage = await request(app)
      .get(`/patients/${id.maya}/records`)
      .set("Authorization", "Bearer not-a-token");

    expect(missing.status).toBe(401);
    expect(garbage.status).toBe(401);
  });
});

describe("GET /patients/:patientId/records", () => {
  it("returns only the signed-in doctor's records", async () => {
    const helen = await tokenFor("helen.chen@clinic.test");
    const response = await request(app)
      .get(`/patients/${id.amira}/records`)
      .set("Authorization", `Bearer ${helen}`);

    expect(response.status).toBe(200);
    expect(response.body.records.map((record: { diagnosis: string }) => record.diagnosis)).toEqual([
      "Type 2 diabetes mellitus",
    ]);
  });

  it("refuses a doctor who is not assigned, and hides nothing from an admin", async () => {
    const samuel = await tokenFor("samuel.okonkwo@clinic.test");
    const admin = await tokenFor("admin@clinic.test");

    const denied = await request(app)
      .get(`/patients/${id.maya}/records`)
      .set("Authorization", `Bearer ${samuel}`);
    const allowed = await request(app)
      .get(`/patients/${id.amira}/records`)
      .set("Authorization", `Bearer ${admin}`);

    expect(denied.status).toBe(403);
    expect(allowed.status).toBe(200);
    expect(allowed.body.records.map((record: { diagnosis: string }) => record.diagnosis)).toEqual([
      "Iron deficiency",
      "Type 2 diabetes mellitus",
    ]);
  });

  it("uses 404 when the patient does not exist", async () => {
    const admin = await tokenFor("admin@clinic.test");
    const response = await request(app)
      .get("/patients/does-not-exist/records")
      .set("Authorization", `Bearer ${admin}`);

    expect(response.status).toBe(404);
  });

  it("pages a long history without repeating a row", async () => {
    const admin = await tokenFor("admin@clinic.test");
    const first = await request(app)
      .get(`/patients/${id.amira}/records?limit=1`)
      .set("Authorization", `Bearer ${admin}`);

    expect(first.status).toBe(200);
    expect(first.body.records).toHaveLength(1);
    expect(first.body.nextCursor).toBe(first.body.records[0].id);

    const second = await request(app)
      .get(`/patients/${id.amira}/records?limit=1&cursor=${first.body.nextCursor}`)
      .set("Authorization", `Bearer ${admin}`);

    expect(second.status).toBe(200);
    expect(second.body.records).toHaveLength(1);
    expect(second.body.records[0].id).not.toBe(first.body.records[0].id);
    expect(second.body.nextCursor).toBeNull();
  });
});

describe("patient list", () => {
  it("shows each doctor only their assigned patients", async () => {
    const helen = await tokenFor("helen.chen@clinic.test");
    const response = await request(app).get("/patients").set("Authorization", `Bearer ${helen}`);

    expect(response.status).toBe(200);
    expect(response.body.patients.map((patient: { name: string }) => patient.name)).toEqual([
      "Amira Hassan",
      "Maya Chen",
    ]);
    const amira = response.body.patients.find((patient: { name: string }) => patient.name === "Amira Hassan");
    expect(amira.recordCount).toBe(1);
  });

  it("lets an admin search every patient, including those with no doctor", async () => {
    const admin = await tokenFor("admin@clinic.test");
    const response = await request(app).get("/patients?q=noah").set("Authorization", `Bearer ${admin}`);

    expect(response.status).toBe(200);
    expect(response.body.patients.map((patient: { name: string }) => patient.name)).toEqual(["Noah Berg"]);
  });
});

describe("creating records", () => {
  it("keeps ownership with the doctor even if the body names someone else", async () => {
    const helen = await tokenFor("helen.chen@clinic.test");
    const response = await request(app)
      .post(`/patients/${id.maya}/records`)
      .set("Authorization", `Bearer ${helen}`)
      .send({
        diagnosis: "Follow-up",
        treatment: "Continue the current dose.",
        doctorId: id.samuel,
      });

    expect(response.status).toBe(201);
    expect(response.body.record.doctor.id).toBe(id.helen);
  });

  it("blocks a doctor from writing on another doctor's patient", async () => {
    const helen = await tokenFor("helen.chen@clinic.test");
    const response = await request(app)
      .post(`/patients/${id.luis}/records`)
      .set("Authorization", `Bearer ${helen}`)
      .send({ diagnosis: "Note", treatment: "Should not be saved." });

    expect(response.status).toBe(403);
  });

  it("assigns a doctor when they write the first record for a new patient", async () => {
    const helen = await tokenFor("helen.chen@clinic.test");
    const samuel = await tokenFor("samuel.okonkwo@clinic.test");
    const created = await request(app)
      .post("/patients")
      .set("Authorization", `Bearer ${helen}`)
      .send({ name: "Imani Brooks", dateOfBirth: "1995-06-06" });

    expect(created.status).toBe(201);
    const patientId = created.body.patient.id as string;

    const deniedBefore = await request(app)
      .get(`/patients/${patientId}/records`)
      .set("Authorization", `Bearer ${helen}`);
    expect(deniedBefore.status).toBe(403);

    const record = await request(app)
      .post(`/patients/${patientId}/records`)
      .set("Authorization", `Bearer ${helen}`)
      .send({ diagnosis: "Annual review", treatment: "No new concerns." });
    expect(record.status).toBe(201);

    const allowed = await request(app)
      .get(`/patients/${patientId}/records`)
      .set("Authorization", `Bearer ${helen}`);
    const stillDenied = await request(app)
      .get(`/patients/${patientId}/records`)
      .set("Authorization", `Bearer ${samuel}`);

    expect(allowed.status).toBe(200);
    expect(allowed.body.records).toHaveLength(1);
    expect(stillDenied.status).toBe(403);
  });
});

describe("users", () => {
  it("is limited to admins and never returns a password hash", async () => {
    const helen = await tokenFor("helen.chen@clinic.test");
    const admin = await tokenFor("admin@clinic.test");

    const denied = await request(app).get("/users").set("Authorization", `Bearer ${helen}`);
    const allowed = await request(app).get("/users").set("Authorization", `Bearer ${admin}`);

    expect(denied.status).toBe(403);
    expect(allowed.status).toBe(200);
    expect(JSON.stringify(allowed.body)).not.toContain("password");
  });
});
