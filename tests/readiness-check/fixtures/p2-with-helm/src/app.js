import express from "express";
import helmet from "helmet";
import cors from "cors";
import pinoHttp from "pino-http";
import { logger } from "./logger.js";
import { pool } from "./db.js";
import { requireUser } from "./auth.js";
import { tasks } from "./routes/tasks.js";

export const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: "100kb" }));
app.use(pinoHttp({ logger }));

app.get("/healthz", async (_req, res) => {
  try {
    await pool.query("select 1");
    res.json({ ok: true });
  } catch {
    res.status(503).json({ ok: false });
  }
});

app.use("/tasks", requireUser, tasks);
