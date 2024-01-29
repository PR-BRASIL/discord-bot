import { ChannelType, Client } from "discord.js";
import { Server, Socket } from "socket.io";
import { logger } from "../../utils/logger";

export const makeCommands = (client: Client<boolean>, server: Server) => {
  server.on("connection", async (socket: Socket) => {
    logger.info("new connection");
    socket.on("chatLog", async (data: any) => {
      logger.info("chatLog");
      const channel = client.channels.cache.get("1201614693341606009");
      if (channel && channel.type == ChannelType.GuildText) {
        channel.send(data);
      } else {
        console.error(
          "Canal inválido ou não suportado para mensagens diretas."
        );
      }
    });

    socket.on("reportLog", async (data: any) => {
      logger.info("reportLog");
      const channel = client.channels.cache.get("1201654662579621999");
      if (channel && channel.type == ChannelType.GuildText) {
        channel.send(data);
      } else {
        console.error(
          "Canal inválido ou não suportado para mensagens diretas."
        );
      }
    });

    socket.on("adminLog", async (data: any) => {
      logger.info("adminLog");
      const channel = client.channels.cache.get("1201657417226780702");
      if (channel && channel.type == ChannelType.GuildText) {
        channel.send(data);
      } else {
        console.error(
          "Canal inválido ou não suportado para mensagens diretas."
        );
      }
    });

    socket.on("banLog", async (data: any) => {
      logger.info("banLog");
      const channel = client.channels.cache.get("1201658092836892803");
      if (channel && channel.type == ChannelType.GuildText) {
        channel.send(data);
      } else {
        console.error(
          "Canal inválido ou não suportado para mensagens diretas."
        );
      }
    });
  });
};
