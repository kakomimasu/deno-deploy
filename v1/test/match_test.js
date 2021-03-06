import { assert, assertEquals, v4 } from "../../deps-test.ts";

import ApiClient from "../../client/client.ts";
import { randomUUID } from "../util.ts";

const ac = new ApiClient();

import { errors } from "../error.ts";

const assertMatch = (match, sample = {}) => {
  const match_ = Object.assign({}, match);
  const sample_ = Object.assign({}, sample);

  //assert(v4.validate(match_.userId));
  if (sample_.userId) assertEquals(match_.userId, sample_.userId);
  assertEquals(match_.spec, sample_.spec || "");
  assert(v4.validate(match_.gameId));
  if (sample_.gameId) assertEquals(match_.gameId, sample_.gameId);
  assertEquals(typeof match_.index, "number");
  if (sample_.index) assertEquals(match_.index, sample_.index);
  assertEquals(match.pic.length, 6);
};

const assertGame = (game, sample = {}) => {
  const game_ = Object.assign({}, game);
  const sample_ = Object.assign({}, sample);
  assert(v4.validate(game_.gameId));
  if (sample_.gameId) assertEquals(game_.gameId, sample_.gameId);
  assertEquals(game_.gaming, sample_.gaming || false);
  assertEquals(game_.ending, sample_.ending || false);
  assertEquals(game_.board, sample_.board || null);
  if (game_.board) assertBoard(game_.board);
  assertEquals(game_.turn, sample_.turn || 0);
  assertEquals(game_.tiled, sample_.tiled || null);
  assert(Array.isArray(game_.players));
  assert(Array.isArray(game_.log));
  assertEquals(game_.gameName, sample_.name || "");
  assertEquals(game_.startedAtUnixTime, null);
  assertEquals(game_.nextTurnUnixTime, null);
  assert(Array.isArray(game_.reservedUsers));
  if (sample_.reservedUsers) assert(game_.reservedUsers, sample_.reservedUsers);
};

const assertBoard = (board) => {
  assertEquals(typeof board.name, "string");
  assertEquals(typeof board.width, "number");
  assertEquals(typeof board.height, "number");
  assertEquals(typeof board.nTurn, "number");
  assertEquals(typeof board.nAgent, "number");
  assertEquals(typeof board.nSec, "number");
  assert(Array.isArray(board.points));
};

const assertAction = (actionRes) => {
  assertEquals(typeof actionRes.receptionUnixTime, "number");
  assertEquals(typeof actionRes.turn, "number");
};

// /v1/match Test
// ???????????????
// ??????????????????????????????????????????????????????????????????
// gameID?????????????????????
// useAi???AI??????
// ???????????????
Deno.test("v1/match:invalid bearerToken", async () => {
  const res = await ac.match({ option: { dryRun: true } });
  console.log(res);
  assertEquals(res.data, errors.NOT_USER);
});
Deno.test("v1/match:can not find game", async () => {
  const uuid = randomUUID();
  const userData = { screenName: uuid, name: uuid, password: uuid };
  const userRes = await ac.usersRegist(userData);
  userData.id = userRes.data.id;
  const data = {
    gameId: randomUUID(),
    option: { dryRun: true },
  };
  const res = await ac.match(data, "Bearer " + userRes.data.bearerToken);
  await ac.usersDelete({}, `Bearer ${userRes.data.bearerToken}`);
  assertEquals(res.data, errors.NOT_GAME);
});
Deno.test("v1/match:can not find ai", async () => {
  const uuid = randomUUID();
  const userData = { screenName: uuid, name: uuid, password: uuid };
  const userRes = await ac.usersRegist(userData);
  userData.id = userRes.data.id;

  const data = {
    useAi: true,
    aiOption: {
      aiName: "",
    },
    option: { dryRun: true },
  };
  const res = await ac.match(data, "Bearer " + userRes.data.bearerToken);
  await ac.usersDelete({}, `Bearer ${userRes.data.bearerToken}`);
  assertEquals(res.data, errors.NOT_AI);
});
Deno.test("v1/match:normal", async () => {
  const uuid = randomUUID();
  const userData = { screenName: uuid, name: uuid, password: uuid };
  const userRes = await ac.usersRegist(userData);
  userData.id = userRes.data.id;

  const res = await ac.match({}, "Bearer " + userRes.data.bearerToken);
  await ac.usersDelete({}, `Bearer ${userRes.data.bearerToken}`);

  assertMatch(res.data, { userId: userData.id });
});
Deno.test("v1/match:normal by selfGame", async () => {
  const uuid = randomUUID();
  const userData = { screenName: uuid, name: uuid, password: uuid };
  const userRes = await ac.usersRegist(userData);
  userData.id = userRes.data.id;

  const gameData = { name: "?????????", boardName: "A-1" };
  const gameRes = await ac.gameCreate(gameData);

  const data = {
    gameId: gameRes.data.gameId,
  };
  const res = await ac.match(data, "Bearer " + userRes.data.bearerToken);
  await ac.usersDelete({}, `Bearer ${userRes.data.bearerToken}`);

  assertMatch(res.data, { userId: userData.id, gameId: gameRes.data.gameId });
});
Deno.test("v1/match:normal by useAi", async () => {
  const uuid = randomUUID();
  const userData = { screenName: uuid, name: uuid, password: uuid };
  const userRes = await ac.usersRegist(userData);
  userData.id = userRes.data.id;

  const data = {
    useAi: true,
    aiOption: {
      aiName: "a1",
    },
  };
  const res = await ac.match(data, "Bearer " + userRes.data.bearerToken);
  await ac.usersDelete({}, `Bearer ${userRes.data.bearerToken}`);
  assertMatch(res.data, { userId: userData.id });
});
Deno.test("v1/match:normal by guest", async () => {
  const data = {
    useAi: true,
    aiOption: {
      aiName: "a1",
    },
    guest: {
      name: "test",
    },
  };
  const res = await ac.match(data);
  console.log(res);
  assertMatch(res.data, { userId: "test" });
});

// /v1/match/(gameId) Test
// ???????????????
// ????????????????????????
Deno.test("v1/match/(gameId):normal", async () => {
  const gameData = { name: "?????????", boardName: "A-1" };
  const gameRes = await ac.gameCreate(gameData);

  const res = await ac.getMatch(gameRes.data.gameId);

  assertGame(res.data, { gameId: gameRes.data.gameId, name: gameData.name });
});
Deno.test("v1/match/(gameId):not find game", async () => {
  const res = await ac.getMatch(randomUUID());

  assertEquals(res.data, errors.NOT_GAME);
});

// /v1/match/(gameId)/action Test
// ???????????????
// ???????????????????????????????????????
Deno.test("v1/match/(gameId)/action:normal", async () => {
  const uuid = randomUUID();
  const userData = { screenName: uuid, name: uuid, password: uuid };
  const userRes = await ac.usersRegist(userData);
  userData.id = userRes.data.id;

  const data = {
    useAi: true,
    aiOption: {
      aiName: "a1",
    },
  };
  const matchRes = await ac.match(data, "Bearer " + userRes.data.bearerToken);

  const actionData = {
    actions: [
      { agentId: 0, type: "PUT", x: 0, y: 0 },
    ],
  };
  const res = await ac.setAction(
    matchRes.data.gameId,
    actionData,
    matchRes.data.pic,
  );
  await ac.usersDelete({}, `Bearer ${userRes.data.bearerToken}`);

  assertAction(res.data);
});

Deno.test("v1/match/(gameId)/action:invalid user", async () => {
  const uuid = randomUUID();
  const userData = { screenName: uuid, name: uuid, password: uuid };
  const userRes = await ac.usersRegist(userData);

  userData.id = userRes.data.id;

  const data = {
    useAi: true,
    aiOption: {
      aiName: "a1",
    },
  };
  const matchRes = await ac.match(data, "Bearer " + userRes.data.bearerToken);

  const actionData = {
    actions: [
      { agentId: 0, type: "PUT", x: 0, y: 0 },
    ],
  };
  const res = await ac.setAction(
    matchRes.data.gameId,
    actionData,
    "0000000",
  );
  await ac.usersDelete({}, `Bearer ${userRes.data.bearerToken}`);

  assertEquals(res.data, errors.INVALID_USER_AUTHORIZATION);
});
