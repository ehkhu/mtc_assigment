# Mini Clinic records

A small clinic app. Doctors read medical records only for patients assigned to them. Admins can read every record.

## Stack

TypeScript, Express, JWT, React, SWR, Prisma, SQLite.

Node.js 20 or newer is the only install. SQLite is a file created by Prisma. No separate database server.

## Run

From this folder:

```bash
npm install
npm run setup
npm run dev:server
```

In a second terminal:

```bash
npm run dev:client
```

Open http://localhost:5173

`setup` creates `server/.env` from `server/.env.example` when that file is missing, then creates `server/prisma/dev.db` and loads the demo clinic. Running it again wipes that database back to the demo data and leaves an existing `.env` alone.

### Demo accounts

Password for every account: `password123`

| Email | Role | What they can see |
| --- | --- | --- |
| admin@clinic.test | Admin | All four patients, both of Amira Hassan's records |
| helen.chen@clinic.test | Doctor | Maya Chen, and Helen's record for Amira Hassan |
| samuel.okonkwo@clinic.test | Doctor | Luis Ortega, and Samuel's record for Amira Hassan |

Noah Berg has no records, so only the admin sees him. The login page fills these accounts in for you.

### Call the API directly

```bash
curl.exe -s http://localhost:4000/auth/login -H "Content-Type: application/json" -d "{\"email\":\"helen.chen@clinic.test\",\"password\":\"password123\"}"
```

Use the `token` on the records endpoint:

```bash
curl.exe http://localhost:4000/patients/PATIENT_ID/records -H "Authorization: Bearer TOKEN"
```

Samuel requesting Maya's id returns 403. The admin token returns her record.

## API

| Method | Path | Who |
| --- | --- | --- |
| POST | /auth/login | Public. Body: `{ email, password }` |
| GET | /auth/me | Any signed-in user |
| GET | /patients?q= | Doctors see assigned patients. Admins see all. |
| POST | /patients | Any signed-in user. Body: `{ name, dateOfBirth }` |
| GET | /patients/:patientId/records | The required endpoint. See access below. |
| POST | /patients/:patientId/records | Add a record. Body: `{ diagnosis, treatment, doctorId? }` |
| GET, POST | /users | Admins only |

Records are paged, newest first. `limit` defaults to 50 (max 100). The response includes `nextCursor`; pass it as `cursor` for the next page.

## Access rules

Login returns a JWT that lasts 8 hours. Send it as `Authorization: Bearer <token>`. Each request loads the user from the database, so the role in the token is not trusted and a removed account stops working immediately.

A doctor is assigned to a patient when that doctor has created at least one medical record for them. There is no separate assignment table: the brief's schema puts `doctor_id` on the record and says a doctor may only view records they created.

- **Read.** A doctor query is filtered with `doctor_id = current user` before rows are loaded. If they have no row for that patient, the response is 403. An admin receives every record for the patient.
- **Write.** A doctor may add a record for a patient they are already assigned to, or the first record on a patient who has none (that write assigns them). They cannot write on a patient who only has another doctor's records. A doctor's new record is always stored under their own id.
- **Missing patient.** 404 for every role. An existing patient the doctor is not assigned to is 403. Patient ids are random, so the 403 does not help someone guess ids.

Unknown email and wrong password return the same 401.

## Data

| Table | Columns |
| --- | --- |
| users | id, email, name, password_hash, role (`ADMIN` or `DOCTOR`), created_at |
| patients | id, name, date_of_birth (`YYYY-MM-DD`), created_at |
| medical_records | id, patient_id, doctor_id, diagnosis, treatment, created_at |

`date_of_birth` is stored as text so a date does not shift across time zones.

Indexes used by the access checks and the paged read:

- `medical_records (patient_id, created_at)` for an admin's history
- `medical_records (patient_id, doctor_id, created_at)` for a doctor's history
- `medical_records (doctor_id)` for "which patients are assigned to this doctor"

Name search uses `contains`. That is a scan, which is fine for a clinic's patient list. The records query is the one shaped for a large table: it filters on the indexes above and never loads the whole history.

## Frontend

React pages under `client/src`, matching the feature folders:

```
client/src/apis/patients.ts          API calls, including the records endpoint
client/src/apis/users.ts
client/src/patient/page.tsx          search, list, and the open record
client/src/patient/components/       list.tsx, form.tsx, records.tsx
client/src/patient/actions.ts        SWR hooks
client/src/users/                    same shape, admin only
```

SWR loads the lists and refetches them after a save. The browser does not filter records. It renders the list the API returned, and it shows the 403 message when a doctor opens someone else's patient.

The dev server proxies `/api` to `http://localhost:4000`, so the UI and the API are same-origin in development.

## Tests

```bash
npm test
```

The suite logs in as each role and checks the records endpoint: a doctor's own rows, a 403 for someone else's patient, an admin seeing both of Amira's records, cursor paging, and that a doctor cannot claim another doctor's patient.

## Assumptions

- Staff need a `users` table. The brief only specified patients and medical records.
- "Assigned" means "this doctor created a record for this patient."
- One shared password in the seed data, bcrypt hashed, is enough to demo the roles.
- The access token is kept in `localStorage`. A production app would want a shorter token and a refresh cookie.
- SQLite is there so a reviewer can run the project without installing Postgres. The Prisma models and the indexes move to Postgres by changing the datasource.
