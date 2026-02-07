import { initTRPC } from "@trpc/server";
import superjson from "superjson";

import type { createTrpcContext } from "@/server/trpc/context";

const t = initTRPC
  .context<Awaited<ReturnType<typeof createTrpcContext>>>()
  .create({
    transformer: superjson,
  });

export const appRouter = t.router({
  health: t.procedure.query(() => ({ status: "ok" })),
  hello: t.procedure
    .input((value) => (typeof value === "string" ? value : "farmer"))
    .query(({ input }) => ({ greeting: `Hello ${input}` })),
});

export type AppRouter = typeof appRouter;
