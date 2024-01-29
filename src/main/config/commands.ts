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
  });
};
