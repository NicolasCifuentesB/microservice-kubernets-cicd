import express from "express";
import healthRoutes from "./routes/health.routes";
import messageRoutes from "./routes/message.routes";
import usersRoutes from "./routes/users.routes";
import flightsRoutes from "./routes/flights.routes";

const app = express();

app.use(express.json());

app.use("/health", healthRoutes);
app.use("/api/message", messageRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/flights", flightsRoutes);

export default app;
