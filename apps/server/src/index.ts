import "dotenv/config";

import { createServer } from "node:http";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import { WebSocketServer, WebSocket } from "ws";

import { prisma } from "./db/prisma.js";
import { appRouter } from "./routers/index.js";
import { createContext } from "./trpc.js";
import { startOutboxWorker } from "./workers/outbox.js";

const port = Number.parseInt(process.env.PORT ?? "4000", 10);

// --- WebSocket room management ---
const rooms = new Map<string, Set<WebSocket>>();

function emitAuctionUpdate(auctionId: string) {
  const clients = rooms.get(auctionId);
  if (!clients) return;
  const message = JSON.stringify({ type: "auction.updated", auctionId });
  for (const ws of clients) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(message);
    }
  }
}

async function main() {
  await prisma.$connect();

  const app = express();
  const httpServer = createServer(app);

  app.use(cors({ origin: "http://localhost:5173", credentials: true }));
  app.use(cookieParser());
  app.use(express.json());

  app.get("/healthz", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.use(
    "/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext: ({ req, res }) => createContext({ req, res }, emitAuctionUpdate),
    }),
  );

  // --- WebSocket server ---
  const wss = new WebSocketServer({
    server: httpServer,
    path: "/ws",
  });

  wss.on("connection", (ws) => {
    const subscriptions = new Set<string>();

    ws.on("message", (raw) => {
      try {
        const msg = JSON.parse(String(raw));
        if (msg.type === "subscribe" && typeof msg.auctionId === "string") {
          subscriptions.add(msg.auctionId);
          if (!rooms.has(msg.auctionId)) {
            rooms.set(msg.auctionId, new Set());
          }
          rooms.get(msg.auctionId)!.add(ws);
        } else if (msg.type === "unsubscribe" && typeof msg.auctionId === "string") {
          subscriptions.delete(msg.auctionId);
          rooms.get(msg.auctionId)?.delete(ws);
        }
      } catch {
        // Ignore malformed messages
      }
    });

    ws.on("close", () => {
      for (const auctionId of subscriptions) {
        rooms.get(auctionId)?.delete(ws);
        if (rooms.get(auctionId)?.size === 0) {
          rooms.delete(auctionId);
        }
      }
    });
  });

  // Start outbox worker
  startOutboxWorker(prisma);

  httpServer.listen(port, () => {
    console.log(`Server ready at http://localhost:${port}`);
    console.log(`WebSocket ready at ws://localhost:${port}/ws`);
  });
}

main().catch((error) => {
  console.error("Server failed to start", error);
  process.exit(1);
});

export type { AppRouter } from "./routers/index.js";
