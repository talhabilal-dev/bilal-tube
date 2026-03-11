import type { Application, Request, Response } from "express";
import swaggerUi from "swagger-ui-express";
import { generateOpenApiDocument } from "./openapi.js";

export const setupSwagger = (app: Application) => {
  const openApiDocument = generateOpenApiDocument();

  app.get("/openapi.json", (_req: Request, res: Response) => {
    res.status(200).json(openApiDocument);
  });

  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(openApiDocument));
};
