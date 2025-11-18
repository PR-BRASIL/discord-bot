import { ChannelType, Client, EmbedBuilder } from "discord.js";
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
    sendBanLogMessage(env.banLogChannelId!, data);
    // Enviar DM para o usuário banido
    await sendBanNotificationDM(data);
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

  const sendBanLogMessage = (channelId: string, data: any) => {
    try {
      const channel = client.channels.cache.get(channelId);

      if (!channel || channel.type != ChannelType.GuildText || data == "") {
        console.error(
          "Canal inválido ou não suportado para mensagens diretas."
        );
        return;
      }

      const embed = parseBanLogToEmbed(data);
      if (embed) {
        channel.send({ embeds: [embed] });
      } else {
        // Fallback para formato antigo se não conseguir parsear
        const dataFormatter = "```" + data + "```";
        channel.send(dataFormatter);
      }
    } catch (err) {
      logger.error(err);
    }
  };

  const parseBanLogToEmbed = (banLogString: string): EmbedBuilder | null => {
    try {
      // Formato: [2025-11-18 16:56] 34feb10c8f184946976abd714899b6bd SPTS williancc1557 45.4.59.117 Troll ou perda proposital de asset. REGRAS: realitybrasil.org banned by PRISM user Assistente (172800)
      // Ou: [2025-11-18 19:06] 34feb10c8f184946976abd714899b6bd SPTS williancc1557 45.4.59.117 teste banned by PRISM user Assistente (round)

      const dateTimeMatch = banLogString.match(
        /\[(\d{4}-\d{2}-\d{2} \d{2}:\d{2})\]/
      );
      const guidMatch = banLogString.match(/\] ([a-f0-9]{32})/);
      const bannedByMatch = banLogString.match(/banned by (.+?) \((.+?)\)$/);

      if (!dateTimeMatch || !guidMatch || !bannedByMatch) {
        return null;
      }

      const dateTime = dateTimeMatch[1];
      const guid = guidMatch[1];
      const bannedBy = bannedByMatch[1].trim();
      const durationValue = bannedByMatch[2].trim();

      // Extrair o resto da string após o GUID até "banned by"
      const afterGuid = banLogString.substring(
        banLogString.indexOf(guid) + guid.length + 1
      );
      const beforeBannedBy = afterGuid
        .substring(0, afterGuid.indexOf("banned by"))
        .trim();

      // Parsear: SPTS williancc1557 45.4.59.117 Troll ou perda proposital de asset. REGRAS: realitybrasil.org
      // Regex para capturar IP (formato xxx.xxx.xxx.xxx)
      const ipMatch = beforeBannedBy.match(
        /(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})/
      );

      let clan = "";
      let playerName = "";
      let ip = "";
      let reason = "";

      if (ipMatch) {
        ip = ipMatch[1];
        const ipIndex = beforeBannedBy.indexOf(ip);
        const beforeIp = beforeBannedBy.substring(0, ipIndex).trim();
        reason = beforeBannedBy.substring(ipIndex + ip.length).trim();

        // Parsear clan e nome do jogador (antes do IP)
        const nameParts = beforeIp.split(/\s+/);
        if (nameParts.length >= 2) {
          clan = nameParts[0];
          playerName = nameParts.slice(1).join(" ");
        } else if (nameParts.length === 1) {
          playerName = nameParts[0];
        }
      } else {
        // Fallback se não encontrar IP
        const parts = beforeBannedBy.split(/\s+/);
        if (parts.length >= 3) {
          clan = parts[0];
          playerName = parts[1];
          ip = parts[2];
          reason = parts.slice(3).join(" ");
        }
      }

      // Converter duração para formato legível
      const durationFormatted = formatDuration(durationValue);

      const embed = new EmbedBuilder()
        .setColor(0xff0000) // Vermelho para ban
        .setTitle("🔨 Usuário Banido")
        .addFields(
          {
            name: "👤 Jogador",
            value: playerName
              ? `**${playerName}**${clan ? ` (${clan})` : ""}`
              : "Não especificado",
            inline: true,
          },
          {
            name: "🆔 Hash",
            value: `\`${guid}\``,
            inline: true,
          },
          {
            name: "📋 Motivo",
            value: reason || "Não especificado",
            inline: false,
          },
          {
            name: "👮 Aplicado por",
            value: bannedBy || "Não especificado",
            inline: true,
          },
          {
            name: "⏱️ Duração",
            value: durationFormatted,
            inline: true,
          },
          {
            name: "📅 Data/Hora",
            value: dateTime,
            inline: true,
          }
        )
        .setTimestamp(new Date(dateTime.replace(" ", "T")));

      return embed;
    } catch (err) {
      logger.error("Erro ao parsear banLog:", err);
      return null;
    }
  };

  const formatDuration = (durationValue: string | number): string => {
    // Se for "round", retornar "1 Round"
    if (
      typeof durationValue === "string" &&
      durationValue.toLowerCase() === "round"
    ) {
      return "1 Round";
    }

    // Converter para número se for string
    const seconds =
      typeof durationValue === "string"
        ? parseInt(durationValue)
        : durationValue;

    if (isNaN(seconds)) return "Não especificado";
    if (seconds === 0) return "Permanente";

    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    const parts: string[] = [];
    if (days > 0) parts.push(`${days} dia${days > 1 ? "s" : ""}`);
    if (hours > 0) parts.push(`${hours} hora${hours > 1 ? "s" : ""}`);
    if (minutes > 0) parts.push(`${minutes} minuto${minutes > 1 ? "s" : ""}`);

    return parts.join(", ") || `${seconds} segundo${seconds > 1 ? "s" : ""}`;
  };

  const sendBanNotificationDM = async (banLogString: string) => {
    try {
      // Extrair o GUID do banLog
      const guidMatch = banLogString.match(/\] ([a-f0-9]{32})/);
      if (!guidMatch) {
        logger.debug("Não foi possível extrair o GUID do banLog");
        return;
      }

      const guid = guidMatch[1];

      // Fazer requisição para a API
      const response = await axios.get(
        `http://localhost:5050/api/user/${guid}`
      );

      const discordId = response.data?.discordId;

      console.log(response.data);

      if (!discordId) {
        logger.debug(`DiscordId não encontrado para o GUID: ${guid}`);
        return;
      }

      // Buscar o usuário no Discord
      const user = await client.users.fetch(discordId);

      // Parsear dados do ban para criar a mensagem
      const dateTimeMatch = banLogString.match(
        /\[(\d{4}-\d{2}-\d{2} \d{2}:\d{2})\]/
      );
      const bannedByMatch = banLogString.match(/banned by (.+?) \((.+?)\)$/);

      if (!dateTimeMatch || !bannedByMatch) {
        return;
      }

      const dateTime = dateTimeMatch[1];
      const bannedBy = bannedByMatch[1].trim();
      const durationValue = bannedByMatch[2].trim();
      const durationFormatted = formatDuration(durationValue);

      // Extrair motivo
      const afterGuid = banLogString.substring(
        banLogString.indexOf(guid) + guid.length + 1
      );
      const beforeBannedBy = afterGuid
        .substring(0, afterGuid.indexOf("banned by"))
        .trim();

      const ipMatch = beforeBannedBy.match(
        /(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})/
      );

      let reason = "";
      if (ipMatch) {
        const ip = ipMatch[1];
        const ipIndex = beforeBannedBy.indexOf(ip);
        reason = beforeBannedBy.substring(ipIndex + ip.length).trim();
      } else {
        const parts = beforeBannedBy.split(/\s+/);
        if (parts.length >= 3) {
          reason = parts.slice(3).join(" ");
        }
      }

      // Criar embed para a DM
      const dmEmbed = new EmbedBuilder()
        .setColor(0xff0000) // Vermelho para ban
        .setTitle("🔨 Você foi banido")
        .setDescription(
          "Você recebeu um ban no servidor. Veja os detalhes abaixo:"
        )
        .addFields(
          {
            name: "📋 Motivo",
            value: reason || "Não especificado",
            inline: false,
          },
          {
            name: "👮 Aplicado por",
            value: bannedBy || "Não especificado",
            inline: true,
          },
          {
            name: "⏱️ Duração",
            value: durationFormatted,
            inline: true,
          },
          {
            name: "📅 Data/Hora",
            value: dateTime,
            inline: true,
          },
          {
            name: "🆔 Hash",
            value: `\`${guid}\``,
            inline: false,
          }
        )
        .setTimestamp(new Date(dateTime.replace(" ", "T")));

      // Enviar DM
      await user.send({ embeds: [dmEmbed] });
      logger.debug(
        `DM de ban enviada para o usuário: ${user.tag} (${discordId})`
      );
    } catch (err: any) {
      // Ignorar erro se o usuário não permitir DMs ou não for encontrado
      if (err?.code === 50007) {
        logger.debug("Não foi possível enviar DM: usuário bloqueou DMs");
      } else if (err?.response?.status === 404) {
        logger.debug("Usuário não encontrado na API");
      } else {
        logger.error("Erro ao enviar DM de ban:", err);
      }
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
