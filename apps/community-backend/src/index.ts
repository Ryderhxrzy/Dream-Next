import 'dotenv/config';
import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';

const port = Number(process.env.PORT ?? 4000);
const app = new Hono();

app.use('*', cors());

app.get('/health', (c) => {
  return c.json({ ok: true, service: 'community-backend' });
});

app.get('/', (c) => {
  return c.text('Community backend is running');
});

serve({
  fetch: app.fetch,
  hostname: '0.0.0.0',
  port,
}, (info) => {
  console.log(`community-backend listening on http://${info.address}:${info.port}`);
});
