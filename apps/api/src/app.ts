import cors from "cors";
import express from "express";
import { errorHandler } from "./common/errorHandler";
import { healthRouter } from "./modules/health/health.router";

export const app = express();

app.use(cors());
app.use(express.json());

app.use(healthRouter);

app.use(errorHandler);
