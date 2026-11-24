import type { AuthUser } from "./types";
import { prisma } from "./lib/prisma";
import { HttpError } from "./lib/http";

/**
 * Read rule for GET /patients/:patientId/records.
 *
 * Admins may read every record for a patient that exists.
 * A doctor may read only the records they created. If they have created
 * none for this patient, the patient is not assigned to them and the
 * answer is 403. A missing patient is 404 for every role, checked by
 * the route before this function runs.
 *
 * The check is a single indexed lookup on (patient_id, doctor_id).
 * The route then queries with that same filter, so another doctor's
 * rows are never loaded for a doctor.
 */
export async function assertCanReadRecords(user: AuthUser, patientId: string): Promise<void> {
  if (user.role === "ADMIN") return;

  const ownRecord = await prisma.medicalRecord.findFirst({
    where: { patientId, doctorId: user.id },
    select: { id: true },
  });

  if (!ownRecord) {
    throw new HttpError(403, "You can only open records for patients assigned to you");
  }
}

/**
 * Write rule for POST /patients/:patientId/records.
 *
 * A doctor may add a record when they are already assigned, or when the
 * patient has no records yet — writing the first record assigns them.
 * A doctor may not add a record to a patient who only has other doctors' records.
 * Admins may add a record for any patient.
 */
export async function assertCanCreateRecord(user: AuthUser, patientId: string): Promise<void> {
  if (user.role === "ADMIN") return;

  const [own, other] = await Promise.all([
    prisma.medicalRecord.findFirst({
      where: { patientId, doctorId: user.id },
      select: { id: true },
    }),
    prisma.medicalRecord.findFirst({
      where: { patientId, doctorId: { not: user.id } },
      select: { id: true },
    }),
  ]);

  if (other && !own) {
    throw new HttpError(403, "You can only add records for patients assigned to you");
  }
}

/**
 * The doctor who owns a new record.
 * Doctors always own their own writes, even if the body names someone else.
 * Admins must name an existing doctor.
 */
export async function resolveRecordDoctor(user: AuthUser, requestedDoctorId?: string): Promise<string> {
  if (user.role === "DOCTOR") return user.id;

  if (!requestedDoctorId) {
    throw new HttpError(400, "Choose the doctor who owns this record");
  }

  const doctor = await prisma.user.findUnique({
    where: { id: requestedDoctorId },
    select: { id: true, role: true },
  });

  if (!doctor || doctor.role !== "DOCTOR") {
    throw new HttpError(400, "Records must belong to a doctor");
  }

  return doctor.id;
}
