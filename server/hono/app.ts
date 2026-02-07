import { Hono } from "hono";

export const honoApp = new Hono();

honoApp.get("/api/hono/health", (c) =>
  c.json({ status: "ok", service: "hono" }),
);
