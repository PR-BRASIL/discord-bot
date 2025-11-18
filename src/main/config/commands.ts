import { ChannelType, Client } from "discord.js";
import { logger } from "../../utils/logger";
import { clientSocket } from "./app";
import { GameStateCommand } from "../../presentation/commands/game-state";
import axios from "axios";
import cron from "node-cron";
import { env } from "./env";

export const makeCommands = async (client: Client<boolean>) => {
  clientSocket.on("chat", async (data: any) => {
    logger.debug("Event executed: chatLog", data);
    sendMessage(env.chatChannelId!, data);
  });

  clientSocket.on("reportLog", async (data: any) => {
    logger.debug("Event executed: reportLog", data);
    sendMessage(env.reportLogChannelId!, data);
  });

  clientSocket.on("adminLog", async (data: any) => {
    logger.debug("Event executed: adminLog", data);
    sendMessage(env.adminLogChannelId!, data);
  });

  clientSocket.on("banLog", async (data: any) => {
    logger.debug("Event executed: banLog", data);
    sendMessage(env.banLogChannelId!, data);
  });

  clientSocket.on("kill", async (data: any) => {
    logger.info("Event executed: kill", data);
    sendMessage(env.killChannelId!, data);
  });

  clientSocket.on("teamKill", async (data: any) => {
    logger.debug("Event executed: teamKill", data);
    sendMessage(env.teamKillChannelId!, data);
  });

  clientSocket.on("connectionLog", async (data: any) => {
    logger.debug("Event executed: teamKill", data);
    sendMessage(env.connectionLogChannelId!, data);
  });

  console.log("Commands executed");

  const sendMessage = (channelId: string, data: any) => {
    try {
      const channel = client.channels.cache.get(channelId);

      if (!channel || channel.type != ChannelType.GuildText || data == "") {
        console.error(
          "Canal inválido ou não suportado para mensagens diretas."
        );
        return;
      }

      const dataFormatter = "```" + data + "```";
      channel.send(dataFormatter);
    } catch (err) {
      logger.error(err);
    }
  };

  cron.schedule("* * * * *", async () => {
    await makeGameStateEvent();
  });
};

const makeGameStateEvent = async () => {
  const { data } = await axios.get(
    "https://servers.realitymod.com/api/Serverinfo"
  );

  const serverInfo = data.servers.find(
    (server: { serverId: string }) => server.serverId == env.serverId
  );
  logger.debug("serverinfo executed");

  await new GameStateCommand().handle(serverInfo);
};
