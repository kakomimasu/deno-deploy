import { Router } from "../deps.ts";

import { jsonResponse } from "./util.ts";
import { getAllBoards } from "./parts/firestore_opration.ts";

export const gameRouter = () => {
  const router = new Router();

  router.get("/boards", async (req) => {
    const boards = await getAllBoards();
    //console.log(boards);
    req.response = jsonResponse(req.request, boards);
  });

  return router;
};
