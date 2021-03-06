import { Router } from "../deps.ts";

import { contentTypeFilter, jsonParse, randomUUID } from "./util.ts";
import {
  getAllTournaments,
  setAllTournaments,
} from "./parts/firestore_opration.ts";
import { accounts } from "./user.ts";
import { errors, ServerError } from "./error.ts";
import { ExpGame } from "./parts/expKakomimasu.ts";
import {
  Tournament as ITournament,
  TournamentAddUserReq,
  TournamentCreateReq,
  TournamentDeleteReq,
  TournamentType,
} from "./types.ts";

const checkType = (type: string): boolean => {
  if (type === "round-robin") return true;
  if (type === "knockout") return true;
  return false;
};

export class Tournament implements ITournament {
  public id: string;
  public name: string;
  public organizer: string;
  public type: TournamentType;
  public remarks: string;
  public users: string[];
  public gameIds: string[];

  constructor(a: ITournament) {
    this.name = a.name;
    this.organizer = a.organizer || "";
    this.type = a.type;
    this.remarks = a.remarks || "";
    this.id = a.id || randomUUID();
    this.users = a.users || [];
    this.gameIds = a.gameIds || [];
  }

  dataCheck(games: ExpGame[]) {
    this.gameIds = this.gameIds.filter((gameId) => {
      if (games.some((game) => game.uuid === gameId)) return true;
      else return false;
    });
  }

  addUser(identifier: string) {
    const user = accounts.find(identifier);
    if (!user) throw new ServerError(errors.NOT_USER);

    const some = this.users.some((e) => e === user.id);
    if (some) throw new ServerError(errors.ALREADY_REGISTERED_USER);
    else this.users.push(user.id);
  }
}

export class Tournaments {
  private tournaments: Tournament[] = [];

  static init = async () => {
    const t = new Tournaments();
    await t.read();
    return t;
  };

  read = async () => {
    this.tournaments.length = 0;
    const data = await getAllTournaments();
    data.forEach((e) => {
      this.tournaments.push(new Tournament(e));
    });
  };
  save = () => setAllTournaments(this.tournaments);

  dataCheck(games: ExpGame[]) {
    this.tournaments.forEach((tournament) => {
      tournament.dataCheck(games);
    });
    this.save();
  }

  get = (id: string) => {
    return this.tournaments.find((e) => e.id === id);
  };

  getAll = () => {
    return this.tournaments;
  };

  add(tournament: Tournament) {
    this.tournaments.push(tournament);
    this.save();
  }
  delete(tournament: Tournament) {
    this.tournaments = this.tournaments.filter((e) => e.id !== tournament.id);
    this.save();
  }

  addUser(tournamentId: string, identifier: string) {
    const tournament = this.get(tournamentId);
    if (!tournament) throw new ServerError(errors.INVALID_TOURNAMENT_ID);

    //console.log(tournament);
    tournament.addUser(identifier);
    this.save();

    return tournament;
  }

  addGame(tournamentId: string, gameId: string) {
    const tournament = this.get(tournamentId);
    if (!tournament) throw new ServerError(errors.INVALID_TOURNAMENT_ID);

    tournament.gameIds.push(gameId);
    this.save();
  }
}

export const tournaments = await Tournaments.init();

export const tournamentRouter = () => {
  const router = new Router();

  // ????????????
  router.post(
    "/create",
    contentTypeFilter("application/json"),
    jsonParse(),
    (ctx) => {
      const data = ctx.state.data as TournamentCreateReq;
      if (!data.name) throw new ServerError(errors.INVALID_TOURNAMENT_NAME);
      if (!data.type || !checkType(data.type)) {
        throw new ServerError(errors.INVALID_TYPE);
      }
      const tournament = new Tournament(data);
      if (data.participants) {
        data.participants.forEach((e) => tournament.addUser(e));
      }
      if (data.option?.dryRun !== true) {
        tournaments.add(tournament);
      }

      ctx.response.body = tournament;
    },
  );

  // ????????????
  router.post(
    "/delete",
    contentTypeFilter("application/json"),
    jsonParse(),
    (ctx) => {
      const data = ctx.state.data as TournamentDeleteReq;
      if (!data.id) throw new ServerError(errors.INVALID_TOURNAMENT_ID);

      const tournament = tournaments.get(data.id);
      if (!tournament) throw new ServerError(errors.NOTHING_TOURNAMENT_ID);

      if (data.option?.dryRun !== true) {
        tournaments.delete(tournament);
      }

      ctx.response.body = tournament;
    },
  );

  // ????????????
  router.get("/get", (ctx) => {
    const query = ctx.request.url.searchParams;
    const id = query.get("id");
    const resData = id ? tournaments.get(id) : tournaments.getAll();
    if (!resData) throw new ServerError(errors.NOTHING_TOURNAMENT_ID);

    ctx.response.body = resData;
  });

  // ???????????????
  router.post(
    "/add",
    contentTypeFilter("application/json"),
    jsonParse(),
    (ctx) => {
      const query = ctx.request.url.searchParams;
      const tournamentId = query.get("id");
      //console.log(tournamentId);
      if (!tournamentId) throw new ServerError(errors.INVALID_TOURNAMENT_ID);
      let tournament = tournaments.get(tournamentId);
      if (!tournament) throw new ServerError(errors.INVALID_TOURNAMENT_ID);

      const body = ctx.state.data as TournamentAddUserReq;
      const identifier = body.user;
      if (!identifier) throw new ServerError(errors.INVALID_USER_IDENTIFIER);

      if (body.option?.dryRun !== true) {
        tournament = tournaments.addUser(tournamentId, identifier);
      } else {
        tournament = new Tournament(tournament);
        tournament.addUser(identifier);
      }

      ctx.response.body = tournament;
    },
  );

  return router.routes();
};
