import { logger } from "../utils/logger";
import { client, server } from "./config/app";
import { env } from "./config/env";

client.on("ready", () => {
  server.listen(env.port, () => {
    logger.info("listening on port " + env.port);
  });
});

client.login(env.token);
