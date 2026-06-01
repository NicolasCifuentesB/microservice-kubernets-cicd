import dotenv from "dotenv";

dotenv.config();

export const config = {
  port: process.env.PORT || 3000,
  serviceName: process.env.SERVICE_NAME || "demo-microservice",
  apiUrl: process.env.API_URL || "https://64c3f84c67cfdca3b660848e.mockapi.io"
};
