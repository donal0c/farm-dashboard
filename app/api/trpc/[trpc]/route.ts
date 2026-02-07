import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { createTrpcContext } from "@/server/trpc/context";
import { appRouter } from "@/server/trpc/router";

const handler = (req: Request) =>
  fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext: createTrpcContext,
  });

export { handler as GET, handler as POST };
