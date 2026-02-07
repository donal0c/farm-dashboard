import { handle } from "hono/vercel";

import { honoApp } from "@/server/hono/app";

export const GET = handle(honoApp);
export const POST = handle(honoApp);
