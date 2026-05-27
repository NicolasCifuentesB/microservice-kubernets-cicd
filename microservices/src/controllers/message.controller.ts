import { Request, Response } from "express";
import { config } from "../config/env";

export const getMessage = (req: Request, res: Response) => {
  res.json({
    service: config.serviceName,
    message: "Microservice running correctly 🚀",
  });
};
