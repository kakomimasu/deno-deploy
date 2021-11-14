import { assertEquals, Core } from "../../deps.ts";
import { ExpGame } from "../parts/expKakomimasu.ts";

Deno.test("restore ExpGame class", () => {
  const board = new Core.Board({
    w: 2,
    h: 2,
    points: [1, 2, 3, 4],
    nagent: 1,
    nturn: 10,
    nsec: 1,
    nplayer: 2,
  });
  const game = new ExpGame(board);
  const restoredGame = ExpGame.restore(game.toLogJSON());
  assertEquals(game, restoredGame);
});
