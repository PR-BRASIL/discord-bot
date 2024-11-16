import { ChannelType, Client } from "discord.js";
import { logger } from "../../utils/logger";
import { clientSocket } from "./app";
import { GameStateCommand } from "../../presentation/commands/game-state";
import axios from "axios";
import cron from "node-cron";

export const makeCommands = async (client: Client<boolean>) => {
  clientSocket.on("chat", async (data: any) => {
    logger.debug("Event executed: chatLog", data);
    sendMessage("1201614693341606009", data);
  });

  clientSocket.on("reportLog", async (data: any) => {
    logger.debug("Event executed: reportLog", data);
    sendMessage("1201654662579621999", data);
  });

  clientSocket.on("adminLog", async (data: any) => {
    logger.debug("Event executed: adminLog", data);
    sendMessage("1201657417226780702", data);
  });

  clientSocket.on("banLog", async (data: any) => {
    logger.debug("Event executed: banLog", data);
    sendMessage("1201658092836892803", data);
  });

  clientSocket.on("kill", async (data: any) => {
    logger.info("Event executed: kill", data);
    sendMessage("1202061441394544710", data);
  });

  clientSocket.on("teamKill", async (data: any) => {
    logger.debug("Event executed: teamKill", data);
    sendMessage("1202063119778861127", data);
  });

  clientSocket.on("connectionLog", async (data: any) => {
    logger.debug("Event executed: teamKill", data);
    sendMessage("1202078127002755102", data);
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

  console.log(data);

  const serverInfo = data.servers.find(
    (server: { serverId: string }) =>
      // server.serverId == "3cc9f2cf9ca951d98891eea56ccb0e4c7cfcfb85"
      server.serverId == "4be70b5630a22e5bd0966f436efe319f062b38b1"
  );
  logger.debug("serverinfo executed");

  await new GameStateCommand().handle(serverInfo);
};
