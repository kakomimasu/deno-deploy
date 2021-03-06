import { Router } from "../deps.ts";

import { contentTypeFilter, jsonParse, randomUUID } from "./util.ts";
import { getAllUsers, setAllUsers } from "./parts/firestore_opration.ts";
import { errors, ServerError } from "./error.ts";
import { ExpGame } from "./parts/expKakomimasu.ts";
import { getPayload } from "./parts/jwt.ts";
import { UserDeleteReq, UserRegistReq } from "./types.ts";
import { auth } from "./middleware.ts";

export interface IUser {
  screenName: string;
  name: string;
  id?: string;
  password?: string;
  gamesId?: string[];
  bearerToken?: string;
}

class User implements IUser {
  public screenName: string;
  public name: string;
  public readonly id: string;
  public password?: string;
  public gamesId: string[];
  public readonly bearerToken: string;

  constructor(data: IUser) {
    this.screenName = data.screenName;
    this.name = data.name;
    this.id = data.id || randomUUID();
    this.password = data.password;
    this.gamesId = data.gamesId || [];
    this.bearerToken = data.bearerToken || randomUUID();
  }

  dataCheck(games: ExpGame[]) {
    this.gamesId = this.gamesId.filter((gameId) => {
      if (games.some((game) => game.uuid === gameId)) return true;
      else return false;
    });
  }
  // シリアライズする際にパスワードを返さないように
  // パスワードを返したい場合にはnoSafe()を用いる
  toJSON() {
    const { password: _p, bearerToken: _b, ...data } = { ...this };
    return data;
  }

  // password,accessTokenも含めたオブジェクトにする
  noSafe = () => ({ ...this });
}

class Users {
  private users: Array<User> = [];

  static init = async () => {
    const u = new Users();
    await u.read();
    return u;
  };

  read = async () => {
    const usersData = await getAllUsers();
    this.users = usersData.map((e) => new User(e));
  };
  save = () => setAllUsers(this.users.map((e) => e.noSafe()));

  dataCheck(games: ExpGame[]) {
    this.users.forEach((user) => user.dataCheck(games));
    this.save();
  }

  getUsers = () => this.users;

  deleteUser(userId: string, dryRun = false) {
    const index = this.users.findIndex((u) => u.id === userId);
    if (index === -1) throw new ServerError(errors.NOT_USER);

    if (dryRun !== true) {
      this.users.splice(index, 1);
      this.save();
    }
  }

  /*updateUser(
    { screenName = "", name = "", id = "", password = "" },
  ): string {
    //console.log(screenName, name, id, password);
    var u: User | undefined;
    if (password !== "") {
      if (id !== "") {
        u = this.users.find((
          e,
        ) => (e.id === id && e.password === password));
        if (u !== undefined) {
          if (screenName !== "") u.screenName = screenName;
          if (
            name !== "" && u.name !== name &&
            this.users.some((e) => e.name === name) === false
          ) {
            u.name = name;
          }
        } else {
          // idが無効
          throw new UserUpdateError("Invalid id");
        }
      } else if (name !== "") {
        u = this.users.find(
          (e) => (e.name === name && e.password === password),
        );

        if (u !== undefined) {
          if (screenName !== "") u.screenName = screenName;
        } else {
          if (screenName !== "") {
            u = new User(screenName, name, password);
            this.users.push(u);
          } else {
            // name無効
            throw new UserUpdateError("Invalid name.");
          }
        }
      } else {
        // id,nameが無効
        throw new UserUpdateError("Invalid id,mane.");
      }
    } else {
      // パスワード無効
      throw new UserUpdateError("Invalid password.");
    }

    this.write();
    return u.id;
  }*/

  showUser(identifier: string) {
    const user = this.users.find((
      e,
    ) => (e.id === identifier || e.name === identifier));
    if (user === undefined) throw new ServerError(errors.NOT_USER);
    return user;
  }

  getUser(identifier: string, password: string) {
    if (!password) throw new ServerError(errors.NOTHING_PASSWORD);
    //if (password === "") throw Error("Invalid password.");
    const user = this.users.find((
      e,
    ) => ((e.id === identifier || e.name === identifier) &&
      e.password === password)
    );
    if (!user) throw new ServerError(errors.NOT_USER);
    return user;
  }

  findById(id: string) {
    return this.users.find((e) => e.id === id);
  }

  find(identifier: string) {
    return this.users.find((e) =>
      (e.id === identifier) || (e.name === identifier)
    );
  }

  addGame(identifier: string, gameId: string) {
    const user = this.find(identifier);
    if (user) {
      user.gamesId.push(gameId);
    }
    this.save();
  }
}

export { User, Users };

export const accounts = new Users();

export const userRouter = () => {
  const router = new Router();

  router.get("/verify", async (ctx) => {
    const jwt = ctx.request.headers.get("Authorization");
    if (!jwt) return;
    const payload = await getPayload(jwt);
    if (!payload) return;
    //console.log(payload);
    const isUser = accounts.getUsers().some((user) =>
      user.id === payload.user_id
    );
    if (!isUser) throw new ServerError(errors.NOT_USER);
    ctx.response.status = 200;
  });

  // ユーザ登録
  router.post(
    "/regist",
    contentTypeFilter("application/json"),
    jsonParse(),
    async (ctx) => {
      const reqData = ctx.state.data as Partial<UserRegistReq>;
      //console.log(reqData);

      if (!reqData.screenName) {
        throw new ServerError(errors.INVALID_SCREEN_NAME);
      }

      if (!reqData.name) throw new ServerError(errors.INVALID_USER_NAME);
      else if (accounts.getUsers().some((e) => e.name === reqData.name)) {
        throw new ServerError(errors.ALREADY_REGISTERED_NAME);
      }

      const idToken = ctx.request.headers.get("Authorization");
      let id: string | undefined = undefined;
      if (idToken) {
        const payload = await getPayload(idToken);
        if (payload) {
          id = payload.user_id;
          if (accounts.getUsers().some((e) => e.id === id)) {
            throw new ServerError(errors.ALREADY_REGISTERED_USER);
          }
        } else throw new ServerError(errors.INVALID_USER_AUTHORIZATION);
      } else {
        if (!reqData.password) {
          throw new ServerError(errors.NOTHING_PASSWORD);
        }
      }

      const user = new User({
        name: reqData.name,
        screenName: reqData.screenName,
        password: reqData.password,
        id,
      });

      if (reqData.option?.dryRun !== true) {
        accounts.getUsers().push(user);
        accounts.save();
      }
      //return user;
      //const user = accounts.registUser({ ...reqData, id }, jwt !== null);
      ctx.response.body = user.noSafe();
    },
  );

  // ユーザ情報取得
  router.get(
    "/show/:identifier",
    auth({ basic: true, jwt: true, required: false }),
    (ctx) => {
      const identifier = ctx.params.identifier || "";

      if (identifier !== "") {
        const user = accounts.showUser(identifier);

        // 認証済みユーザかの確認
        const authedUserId = ctx.state.authed_userId as string;
        ctx.response.body = user.id === authedUserId ? user.noSafe() : user;
      } else {
        ctx.response.body = accounts.getUsers();
      }
    },
  );

  // ユーザ削除
  router.post(
    "/delete",
    contentTypeFilter("application/json"),
    auth({ bearer: true, jwt: true }),
    jsonParse(),
    (ctx) => {
      const reqData = ctx.state.data as UserDeleteReq;
      const authedUserId = ctx.state.authed_userId as string;

      let user = accounts.getUsers().find((e) => e.id === authedUserId);
      if (!user) throw new ServerError(errors.NOT_USER);
      user = new User(user);
      accounts.deleteUser(user.id, reqData.option?.dryRun);
      ctx.response.body = user;
    },
  );

  // ユーザ検索
  router.get("/search", (ctx) => {
    const query = ctx.request.url.searchParams;
    const q = query.get("q");
    if (!q) {
      throw new ServerError(errors.NOTHING_SEARCH_QUERY);
    }

    const matchName = accounts.getUsers().filter((e) => e.name.startsWith(q));
    const matchId = accounts.getUsers().filter((e) => e.id.startsWith(q));
    const users = [...new Set([...matchName, ...matchId])];

    ctx.response.body = users;
  });

  return router.routes();
};
