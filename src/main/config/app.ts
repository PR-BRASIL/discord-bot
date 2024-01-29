import express from "express";
import { Server } from "socket.io";
import { makeCommands } from "./commands";
import http from "http";
import { rateLimitMiddleware } from "../middlewares/rate-limit";
import { Client, GatewayIntentBits } from "discord.js";

const app = express();
const client = new Client({
  intents: Object.keys(GatewayIntentBits).map((a) => {
    return GatewayIntentBits[a];
  }),
});

app.use(rateLimitMiddleware);
const server = http.createServer(app);

const io = new Server(server);
makeCommands(client, io);

export { server, client };
