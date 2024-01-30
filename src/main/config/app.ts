import { makeCommands } from "./commands";
import { Client, GatewayIntentBits } from "discord.js";
import { env } from "./env";
import { io } from "socket.io-client";

const client = new Client({
  intents: Object.keys(GatewayIntentBits).map((a) => {
    return GatewayIntentBits[a];
  }),
});

export const clientSocket = io(env.apiUrl);

makeCommands(client);

export { client };
