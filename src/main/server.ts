import { logger } from "../utils/logger";
import { client } from "./config/app";
import { env } from "./config/env";

client.on("ready", async () => {
  logger.info("bot online");
});

client.login(env.token);
