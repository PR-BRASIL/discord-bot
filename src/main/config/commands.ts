import { ChannelType, Client } from "discord.js";
import { Server, Socket } from "socket.io";
import { logger } from "../../utils/logger";

export const makeCommands = (client: Client<boolean>, server: Server) => {
  const sendMessage = (channelId: string, data: any) => {
    try {
      const channel = client.channels.cache.get(channelId);
      if (channel && channel.type == ChannelType.GuildText && data != "") {
        channel.send(data);
        return;
      }

      console.error("Canal inválido ou não suportado para mensagens diretas.");
    } catch (err) {
      logger.error(err);
    }
  };

  server.on("connection", async (socket: Socket) => {
    logger.info("new connection");
    socket.on("chatLog", async (data: any) => {
      logger.info("chatLog");
      sendMessage("1201614693341606009", data);
    });

    socket.on("reportLog", async (data: any) => {
      logger.info("reportLog");
      sendMessage("1201654662579621999", data);
    });

    socket.on("adminLog", async (data: any) => {
      logger.info("adminLog");
      sendMessage("1201657417226780702", data);
    });

    socket.on("banLog", async (data: any) => {
      logger.info("banLog");
      sendMessage("1201658092836892803", data);
    });
  });
};
