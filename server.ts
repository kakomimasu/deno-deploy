import { Application, oakCors, Router } from "./deps.ts";

import { ExpKakomimasu } from "./v1/parts/expKakomimasu.ts";
import { errorCodeResponse } from "./v1/error.ts";

const port = 8880;

import { getAllGames } from "./v1/parts/firestore_opration.ts";

import { tournamentRouter, tournaments } from "./v1/tournament.ts";
import { accounts, userRouter } from "./v1/user.ts";
import { gameRouter } from "./v1/game.ts";
import { matchRouter } from "./v1/match.ts";
import { wsRoutes } from "./v1/ws.ts";

export const kkmm = new ExpKakomimasu();
kkmm.games.push(...await getAllGames());

accounts.dataCheck(kkmm.getGames());
tournaments.dataCheck(kkmm.getGames());

const apiRoutes = () => {
  const router = new Router();
  router.use(async (ctx, next) => {
    try {
      await next();
    } catch (err) {
      const { status, body } = errorCodeResponse(err);
      ctx.response.status = status;
      ctx.response.body = body;
    }
  });

  router.use("/ws", wsRoutes());
  router.use("/match", matchRouter());
  router.use("/game", gameRouter());
  router.use("/users", userRouter());
  router.use("/tournament", tournamentRouter());
  return router.routes();
};

// Port Listen
const app = new Application();
app.use(oakCors({
  origin: "*",
  methods: ["GET", "POST"],
  allowedHeaders: ["authorization", "content-type"],
}));

app.addEventListener("listen", ({ hostname, port, secure }) => {
  console.log(
    `Listening on: ${secure ? "https://" : "http://"}${
      hostname ??
        "localhost"
    }:${port}`,
  );
});

// Logger
app.use(async (ctx, next) => {
  await next();
  const rt = ctx.response.headers.get("X-Response-Time");
  const now = new Date().toISOString();
  console.log(
    `[${now}] ${ctx.response.status} ${ctx.request.method} ${ctx.request.url} - ${rt}`,
  );
});

// Timing
app.use(async (ctx, next) => {
  const start = Date.now();
  await next();
  const ms = Date.now() - start;
  ctx.response.headers.set("X-Response-Time", `${ms}ms`);
});

const router = new Router();
router.use("/v1", apiRoutes());
app.use(router.routes());
app.use(router.allowedMethods());

app.listen({ port });
