import { test } from "node:test";
import assert from "node:assert";
import request from "supertest";
import { app } from "../src/app.js";

test("tasks require a token", async () => {
  const res = await request(app).get("/tasks");
  assert.equal(res.status, 401);
});
