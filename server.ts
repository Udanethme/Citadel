/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API route to handle server-authoritative 1v1 duel resolution
  app.post("/api/resolve-duel", (req, res) => {
    const { 
      challengerId, 
      challengeeId, 
      challengerMinutes, 
      challengeeMinutes, 
      xpBet 
    } = req.body;

    if (!challengerId || !challengeeId || challengerMinutes === undefined || challengeeMinutes === undefined || xpBet === undefined) {
      return res.status(400).json({ error: "Missing parameters for resolve duel calculations" });
    }

    let winnerId: string | null = null;
    let loserId: string | null = null;
    let challengerXpChange = 0;
    let challengeeXpChange = 0;

    const cMin = Number(challengerMinutes);
    const eMin = Number(challengeeMinutes);
    const bet = Number(xpBet);

    if (cMin > eMin) {
      winnerId = challengerId;
      loserId = challengeeId;
      challengerXpChange = bet;
      challengeeXpChange = -bet;
    } else if (eMin > cMin) {
      winnerId = challengeeId;
      loserId = challengerId;
      challengeeXpChange = bet;
      challengerXpChange = -bet;
    } else {
      // Draw
      winnerId = null;
      loserId = null;
      challengerXpChange = 0;
      challengeeXpChange = 0;
    }

    return res.json({
      status: "completed",
      winnerId,
      loserId,
      challengerXpChange,
      challengeeXpChange
    });
  });

  // Hot module replacement or Vite dev server configuration
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
