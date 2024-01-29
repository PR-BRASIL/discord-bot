import { ChannelType, Client } from "discord.js";
import { Server, Socket } from "socket.io";

export const makeCommands = (client: Client<boolean>, server: Server) => {
  server.on("connection", async (socket: Socket) => {
    socket.on("chatLog", async (data: any) => {
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
