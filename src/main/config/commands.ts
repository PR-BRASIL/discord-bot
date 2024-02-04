import { ChannelType, Client } from "discord.js";
import { logger } from "../../utils/logger";
import { clientSocket } from "./app";
import { GameStateCommand } from "../../presentation/commands/game-state";

export const makeCommands = (client: Client<boolean>) => {
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

  clientSocket.on(
    "gameState",
    async (data: any) => await new GameStateCommand().handle(data)
  );
};
