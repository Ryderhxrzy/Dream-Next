import { Hono } from "hono";
import { serve } from "@hono/node-server";
const app = new Hono();

app.get("/", (c) => {
  return c.text("Hello, World!");
});

const port = 4000;

serve({
  fetch: app.fetch,
  port,
})

console.log(`Server is running on http://localhost:${port}`);