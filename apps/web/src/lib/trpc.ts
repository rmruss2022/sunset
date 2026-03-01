import { httpBatchLink } from "@trpc/client";
import { createTRPCReact } from "@trpc/react-query";
import type { AppRouter } from "@interview/server/src/index";

export const trpc = createTRPCReact<AppRouter>();

export const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: "/trpc",
      fetch: (url, opts) =>
        fetch(url as string, { ...(opts as RequestInit), credentials: "include" }),
    }),
  ],
});
