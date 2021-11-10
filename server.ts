import { Application, Router } from "./deps.ts";

const port = 8080;

import { gameRouter } from "./v1/game.ts";

const apiRoutes = () => {
  const router = new Router();
  router.use("/game", gameRouter().routes());
  return router;
};

// Port Listen
const app = new Application();
app.use(new Router().use("/v1", apiRoutes().routes()).routes());

await app.listen({ port });
