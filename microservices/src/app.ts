import express from "express";
import healthRoutes from "./routes/health.routes";
import messageRoutes from "./routes/message.routes";

const app = express();

app.use(express.json());

app.use("/health", healthRoutes);
app.use("/api/message", messageRoutes);

export default app;
