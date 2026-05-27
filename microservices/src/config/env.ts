import dotenv from "dotenv";

dotenv.config();

export const config = {
  port: process.env.PORT || 3000,
  serviceName: process.env.SERVICE_NAME || "demo-microservice",
};
