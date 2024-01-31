import { ChannelType, Client } from "discord.js";
import { logger } from "../../utils/logger";
import { io } from "socket.io-client";
import { env } from "./env";
import { clientSocket } from "./app";

export const makeCommands = (client: Client<boolean>) => {
  const sendMessage = (channelId: string, data: any) => {
    try {
      const channel = client.channels.cache.get(channelId);
      if (channel && channel.type == ChannelType.GuildText && data != "") {
        const dataFormatter = "```" + data + "```";
        channel.send(dataFormatter);
        return;
      }

      console.error("Canal inválido ou não suportado para mensagens diretas.");
    } catch (err) {
      logger.error(err);
    }
  };

  clientSocket.on("chat", async (data: any) => {
    logger.info("chatLog", data);
    sendMessage("1201614693341606009", data);
  });

  clientSocket.on("reportLog", async (data: any) => {
    logger.info("reportLog", data);
    sendMessage("1201654662579621999", data);
  });

  clientSocket.on("adminLog", async (data: any) => {
    logger.info("adminLog", data);
    sendMessage("1201657417226780702", data);
  });

  clientSocket.on("banLog", async (data: any) => {
    logger.info("banLog", data);
    sendMessage("1201658092836892803", data);
  });
};
