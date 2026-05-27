import { Router } from "express";
import { getMessage } from "../controllers/message.controller";

const router = Router();

router.get("/", getMessage);

export default router;
