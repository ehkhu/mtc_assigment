import { Router } from "express";
import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { asyncHandler, HttpError, routeId } from "../lib/http";
import { requireAuth } from "../middleware/auth";
import { assertCanCreateRecord, assertCanReadRecords, resolveRecordDoctor } from "../access";

export const patientsRouter = Router();

patientsRouter.use(requireAuth);

const listQuery = z.object({
  q: z.string().trim().max(120).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(30),
});

const recordQuery = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  cursor: z.string().trim().min(1).max(64).optional(),
});

const dateOfBirth = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use a date in YYYY-MM-DD format")
  .refine((value) => {
    const parsed = new Date(`${value}T00:00:00.000Z`);
    return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
  }, "Date of birth must be a real date")
  .refine((value) => {
    // Allow one extra day so a local "today" is not rejected around midnight UTC.
    const latest = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    return value <= latest;
  }, "Date of birth cannot be in the future");

const createPatientBody = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  dateOfBirth,
});

const createRecordBody = z.object({
  diagnosis: z.string().trim().min(1, "Diagnosis is required").max(2000),
  treatment: z.string().trim().min(1, "Treatment is required").max(4000),
  doctorId: z.string().trim().min(1).max(64).optional(),
});

const recordSelect = {
  id: true,
  diagnosis: true,
  treatment: true,
  createdAt: true,
  doctor: { select: { id: true, name: true } },
} as const;

/**
 * Patients the caller is allowed to see.
 * Doctors: only patients they have written a record for.
 * Admins: every patient. `q` matches anywhere in the name.
 */
patientsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const query = listQuery.parse(req.query);
    const user = req.user!;
    const assignedToDoctor =
      user.role === "DOCTOR" ? { records: { some: { doctorId: user.id } } } : {};

    const patients = await prisma.patient.findMany({
      where: {
        ...assignedToDoctor,
        ...(query.q ? { name: { contains: query.q } } : {}),
      },
      orderBy: { name: "asc" },
      take: query.limit,
      select: {
        id: true,
        name: true,
        dateOfBirth: true,
        _count: {
          select: {
            records: user.role === "DOCTOR" ? { where: { doctorId: user.id } } : true,
          },
        },
      },
    });

    res.json({
      patients: patients.map((patient) => ({
        id: patient.id,
        name: patient.name,
        dateOfBirth: patient.dateOfBirth,
        recordCount: patient._count.records,
      })),
    });
  }),
);

patientsRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const body = createPatientBody.parse(req.body);
    const patient = await prisma.patient.create({
      data: { name: body.name, dateOfBirth: body.dateOfBirth },
      select: { id: true, name: true, dateOfBirth: true },
    });
    res.status(201).json({ patient: { ...patient, recordCount: 0 } });
  }),
);

/**
 * GET /patients/:patientId/records
 *
 * The endpoint from the brief. Access rules are in `assertCanReadRecords`.
 * Pages are ordered newest first and capped (default 50, max 100) so a
 * large history is not returned in one response. Pass `cursor` (a record
 * id from `nextCursor`) to read the next page.
 */
patientsRouter.get(
  "/:patientId/records",
  asyncHandler(async (req, res) => {
    const patientId = routeId(req.params.patientId);
    const query = recordQuery.parse(req.query);
    const user = req.user!;

    const patient = await prisma.patient.findUnique({
      where: { id: patientId },
      select: { id: true, name: true, dateOfBirth: true },
    });
    if (!patient) throw new HttpError(404, "Patient not found");

    await assertCanReadRecords(user, patient.id);

    const doctorId = user.role === "DOCTOR" ? user.id : undefined;
    const where: Prisma.MedicalRecordWhereInput = {
      patientId: patient.id,
      ...(doctorId ? { doctorId } : {}),
    };

    if (query.cursor) {
      const cursorRow = await prisma.medicalRecord.findFirst({
        where: { id: query.cursor, patientId: patient.id, ...(doctorId ? { doctorId } : {}) },
        select: { id: true, createdAt: true },
      });
      if (!cursorRow) throw new HttpError(400, "Invalid cursor");

      where.AND = [
        {
          OR: [
            { createdAt: { lt: cursorRow.createdAt } },
            { createdAt: cursorRow.createdAt, id: { lt: cursorRow.id } },
          ],
        },
      ];
    }

    const rows = await prisma.medicalRecord.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: query.limit + 1,
      select: recordSelect,
    });

    const hasMore = rows.length > query.limit;
    const records = hasMore ? rows.slice(0, query.limit) : rows;

    res.json({
      patient,
      records,
      nextCursor: hasMore ? records[records.length - 1].id : null,
    });
  }),
);

patientsRouter.post(
  "/:patientId/records",
  asyncHandler(async (req, res) => {
    const patientId = routeId(req.params.patientId);
    const body = createRecordBody.parse(req.body);
    const user = req.user!;

    const patient = await prisma.patient.findUnique({
      where: { id: patientId },
      select: { id: true },
    });
    if (!patient) throw new HttpError(404, "Patient not found");

    await assertCanCreateRecord(user, patient.id);
    const doctorId = await resolveRecordDoctor(user, body.doctorId);

    const record = await prisma.medicalRecord.create({
      data: {
        patientId: patient.id,
        doctorId,
        diagnosis: body.diagnosis,
        treatment: body.treatment,
      },
      select: recordSelect,
    });

    res.status(201).json({ record });
  }),
);
