import type { AppRequest } from "../types/request.js";
import type { Response } from "express";

type HealthcheckRequest = AppRequest<{}, unknown>;
export const healthcheck = async (req: HealthcheckRequest, res: Response) => {
  try {
    res.status(200).json({
      status: "OK",
      message: "Server is running and healthy.",
    });
  } catch (error) {
    res.status(500).json({
      status: "ERROR",
      message: "Server is running but not healthy.",
    });
  }
};
