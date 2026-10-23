import { Router } from "express";
import { z } from "zod";
import { pool } from "../db.js";

export const tasks = Router();

const TaskIn = z.object({ boardId: z.number().int(), title: z.string().min(1).max(200) });

tasks.get("/", async (req, res) => {
  const { rows } = await pool.query(
    "select id, board_id, title, done from tasks where org_id = $1 order by created_at desc",
    [req.user.orgId]
  );
  res.json(rows);
});

tasks.post("/", async (req, res) => {
  const parsed = TaskIn.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { rows } = await pool.query(
    "insert into tasks (org_id, board_id, title) values ($1, $2, $3) returning *",
    [req.user.orgId, parsed.data.boardId, parsed.data.title]
  );
  res.status(201).json(rows[0]);
});
