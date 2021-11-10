import { Request, Response } from "../deps.ts";

export const jsonResponse = <T>(req: Request, json: T) => {
  const resp = new Response(req);
  resp.status = 200;
  resp.headers.set("content-type", "application/json");
  resp.body = JSON.stringify(json);
  return resp;
};
