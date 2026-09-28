import cors from "cors";
import express from "express";
import { errorHandler } from "./common/errorHandler";
import { authRouter } from "./modules/auth/auth.router";
import { driversRouter } from "./modules/drivers/drivers.router";
import { healthRouter } from "./modules/health/health.router";
import { zonesRouter } from "./modules/zones/zones.router";

export const app = express();

app.use(cors());
app.use(express.json());

app.use(healthRouter);
app.use(authRouter);
app.use(driversRouter);
app.use(zonesRouter);

app.use(errorHandler);
