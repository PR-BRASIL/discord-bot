import { logger } from "../utils/logger";
import { client, server } from "./config/app";
import { env } from "./config/env";

client.on("ready", () => {
  console.log(`Logged in as ${client.user.tag}!`);
});

client.login(env.token);
server.listen(env.port, () => {
  logger.info("listening on port " + env.port);
});
