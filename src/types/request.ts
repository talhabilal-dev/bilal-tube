import type { Request } from "express";
export type AppRequest<
  Params extends Record<string, string> = Record<string, string>,
  Body = unknown,
> = Request<Params, unknown, Body>;
