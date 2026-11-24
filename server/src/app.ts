import express from "express";
import cors from "cors";
import { env } from "./env";
import { authRouter } from "./routes/auth";
import { usersRouter } from "./routes/users";
import { patientsRouter } from "./routes/patients";
import { errorHandler } from "./middleware/error";
import "./types";

export const app = express();

app.disable("x-powered-by");
app.use(cors({ origin: env.clientOrigin }));
app.use(express.json({ limit: "100kb" }));

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.use("/auth", authRouter);
app.use("/users", usersRouter);
app.use("/patients", patientsRouter);

app.use((_req, res) => {
  res.status(404).json({ error: "Not found" });
});

app.use(errorHandler);
