#!/bin/npx ts-node
import express, { NextFunction, Request, Response } from "express";
import cors from "cors";
import dotenv from "dotenv";
import expressWs from "express-ws";
import path from "node:path";

dotenv.config();

import { getHandlerStats } from "./handler/stats";
import { getHandlerUpload } from "./handler/upload";
import { getHandlerSubscribe } from "./handler/signaling";

const PORT = process.env.PORT ? Number.parseInt(process.env.PORT) : 3000;
const STATIC_FILES = "./static";

const app = expressWs(express()).app;

app.use(express.json());
app.use(cors());

app.use(express.static(path.join(__dirname, STATIC_FILES)));
console.log(`Static files served from: ${STATIC_FILES}`);

app.post("/stats", getHandlerStats());
app.post("/upload", getHandlerUpload());
app.ws("/subscribe", getHandlerSubscribe());

app.use((req, res) => {
  res.status(404).json({
    error: "Not Found",
    message: `Route ${req.method} ${req.path} not found`,
  });
});

app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error("Unhandled error:", err);
  res.status(500).json({
    error: "Internal Server Error",
    message: "An unexpected error occurred",
  });
});

app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});
