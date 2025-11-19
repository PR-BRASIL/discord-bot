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

    if (data.includes("!TIMEBANID") || data.includes("!BANID")) {
      await Promise.all([
        sendAdminLogBanMessage(env.banLogChannelId!, data),
        sendAdminLogBanNotificationDM(data),
      ]);
    }

    if (data.includes("!SETNEXT")) {
      await handleSetNext(data);
    }

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

  const sendBanLogMessage = async (channelId: string, data: any) => {
    try {
      const channel = client.channels.cache.get(channelId);

      if (!channel || channel.type != ChannelType.GuildText || data == "") {
        console.error(
          "Canal inválido ou não suportado para mensagens diretas."
        );
        return;
      }

      const embed = await parseBanLogToEmbed(data);
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

  const sendAdminLogBanMessage = async (channelId: string, data: any) => {
    try {
      const channel = client.channels.cache.get(channelId);

      if (!channel || channel.type != ChannelType.GuildText || data == "") {
        console.error(
          "Canal inválido ou não suportado para mensagens diretas."
        );
        return;
      }

      const embed = await parseAdminLogBanToEmbed(data);
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

  const parseBanLogToEmbed = async (
    banLogString: string
  ): Promise<EmbedBuilder | null> => {
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

      // Buscar discordId na API
      let playerMention = "";
      try {
        const response = await axios.get(
          `http://localhost:5050/api/user/${guid}`
        );
        const discordId = response.data?.discordId;

        if (discordId) {
          playerMention = ` <@${discordId}>`;
        }
      } catch (err) {
        // Ignorar erro se não encontrar na API
        logger.debug(`DiscordId não encontrado para o GUID: ${guid}`);
      }

      const logoUrl =
        "https://media.discordapp.net/attachments/1162222580644708372/1274439118591361104/Copia_de_Logo_Perfil_B.jpg?ex=6739912b&is=67383fab&hm=41dd71b5a12bb394bbc59b7d86564afb3de14f1c5017ce70dc6d32f1e804063d&=&format=webp&width=702&height=702";

      const embed = new EmbedBuilder()
        .setColor(0xff0000) // Vermelho para ban
        .setTitle("🔨 Usuário Banido")
        .setThumbnail(logoUrl)
        .addFields(
          {
            name: "👤 Jogador",
            value: `${
              playerName
                ? `**${playerName}**${clan ? ` (${clan})` : ""}`
                : "Não especificado"
            }`,
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
          },
          {
            name: "📢 Canal de Apelação",
            value: `<#1149604008730832947>`,
            inline: false,
          }
        )
        .setTimestamp(new Date(dateTime.replace(" ", "T")));

      return embed;
    } catch (err) {
      logger.error("Erro ao parsear banLog:", err);
      return null;
    }
  };

  const parseAdminLogBanToEmbed = async (
    adminLogString: string
  ): Promise<EmbedBuilder | null> => {
    try {
      // Formato: [2025-11-18 21:51] !TIMEBANID      performed by 'PRISM user Assistente' on 'id 34feb10c8f184946976abd714899b6bd sucessfully banned':
      // Ou: [2025-11-18 21:56] !BANID          performed by 'PRISM user Assistente' on 'id 34feb10c8f184946976abd714899b6bd sucessfully banned':

      const dateTimeMatch = adminLogString.match(
        /\[(\d{4}-\d{2}-\d{2} \d{2}:\d{2})\]/
      );
      const commandMatch = adminLogString.match(/!(\w+)/);
      const performedByMatch = adminLogString.match(/performed by '(.+?)'/);
      const guidMatch = adminLogString.match(/id ([a-f0-9]{32})/);

      if (!dateTimeMatch || !commandMatch || !performedByMatch || !guidMatch) {
        return null;
      }

      const dateTime = dateTimeMatch[1];
      const command = commandMatch[1]; // TIMEBANID ou BANID
      const performedBy = performedByMatch[1].trim();
      const guid = guidMatch[1];

      // Buscar informações do usuário na API
      let userData: any = null;
      let playerMention = "";
      try {
        const response = await axios.get(
          `http://localhost:5050/api/user/${guid}`
        );
        userData = response.data;
        const discordId = userData?.discordId;

        if (discordId) {
          playerMention = ` <@${discordId}>`;
        }
      } catch (err) {
        logger.debug(`Erro ao buscar dados do usuário para o GUID: ${guid}`);
      }

      const playerName = userData?.name || "";
      const clan = userData?.clan || "";
      const ip = userData?.ip || "";
      const reason = userData?.banReason || "Não especificado";
      const durationValue = userData?.banDuration || null;
      const durationFormatted = durationValue
        ? formatDuration(durationValue)
        : command === "TIMEBANID"
        ? "Temporário"
        : "Permanente";

      const logoUrl =
        "https://media.discordapp.net/attachments/1162222580644708372/1274439118591361104/Copia_de_Logo_Perfil_B.jpg?ex=6739912b&is=67383fab&hm=41dd71b5a12bb394bbc59b7d86564afb3de14f1c5017ce70dc6d32f1e804063d&=&format=webp&width=702&height=702";

      const embed = new EmbedBuilder()
        .setColor(0xff0000) // Vermelho para ban
        .setTitle("🔨 Usuário Banido")
        .setThumbnail(logoUrl)
        .addFields(
          {
            name: "👤 Jogador",
            value: playerName
              ? `**${playerName}**${clan ? ` (${clan})` : ""}${playerMention}`
              : `Não especificado${playerMention}`,
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
            value: performedBy || "Não especificado",
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
            name: "📢 Canal de Apelação",
            value: `<#1149604008730832947>`,
            inline: false,
          },
          {
            name: "💬 Discord do jogador",
            value: playerMention || "Não especificado",
            inline: false,
          }
        )
        .setTimestamp(new Date(dateTime.replace(" ", "T")));

      return embed;
    } catch (err) {
      logger.error("Erro ao parsear adminLog ban:", err);
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

      const logoUrl =
        "https://media.discordapp.net/attachments/1162222580644708372/1274439118591361104/Copia_de_Logo_Perfil_B.jpg?ex=6739912b&is=67383fab&hm=41dd71b5a12bb394bbc59b7d86564afb3de14f1c5017ce70dc6d32f1e804063d&=&format=webp&width=702&height=702";
      // Criar embed para a DM
      const dmEmbed = new EmbedBuilder()
        .setColor(0xff0000) // Vermelho para ban
        .setTitle("🔨 Você foi banido")
        .setThumbnail(logoUrl)
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
          },
          {
            name: "📢 Apelação",
            value: `Se você acredita que foi banido injustamente, você pode apelar no canal <#1149604008730832947>`,
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

  const sendAdminLogBanNotificationDM = async (adminLogString: string) => {
    try {
      // Extrair o GUID do adminLog
      const guidMatch = adminLogString.match(/id ([a-f0-9]{32})/);
      if (!guidMatch) {
        logger.debug("Não foi possível extrair o GUID do adminLog");
        return;
      }

      const guid = guidMatch[1];

      // Fazer requisição para a API
      const response = await axios.get(
        `http://localhost:5050/api/user/${guid}`
      );

      const discordId = response.data?.discordId;

      if (!discordId) {
        logger.debug(`DiscordId não encontrado para o GUID: ${guid}`);
        return;
      }

      // Buscar o usuário no Discord
      const user = await client.users.fetch(discordId);

      // Parsear dados do ban para criar a mensagem
      const dateTimeMatch = adminLogString.match(
        /\[(\d{4}-\d{2}-\d{2} \d{2}:\d{2})\]/
      );
      const commandMatch = adminLogString.match(/!(\w+)/);
      const performedByMatch = adminLogString.match(/performed by '(.+?)'/);

      if (!dateTimeMatch || !commandMatch || !performedByMatch) {
        return;
      }

      const dateTime = dateTimeMatch[1];
      const command = commandMatch[1];
      const performedBy = performedByMatch[1].trim();

      // Buscar informações adicionais da API
      const userData = response.data;
      const reason = userData?.banReason || "Não especificado";
      const durationValue = userData?.banDuration || null;
      const durationFormatted = durationValue
        ? formatDuration(durationValue)
        : command === "TIMEBANID"
        ? "Temporário"
        : "Permanente";

      const logoUrl =
        "https://media.discordapp.net/attachments/1162222580644708372/1274439118591361104/Copia_de_Logo_Perfil_B.jpg?ex=6739912b&is=67383fab&hm=41dd71b5a12bb394bbc59b7d86564afb3de14f1c5017ce70dc6d32f1e804063d&=&format=webp&width=702&height=702";

      // Criar embed para a DM
      const dmEmbed = new EmbedBuilder()
        .setColor(0xff0000) // Vermelho para ban
        .setTitle("🔨 Você foi banido")
        .setThumbnail(logoUrl)
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
            value: performedBy || "Não especificado",
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
          },
          {
            name: "📢 Apelação",
            value: `Se você acredita que foi banido injustamente, você pode apelar no canal <#1149604008730832947>`,
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

  const handleSetNext = async (adminLogString: string) => {
    try {
      logger.debug({ adminLogString }, "Processando !SETNEXT");

      // Formato: [2025-11-19 01:33] !SETNEXT        performed by 'PRISM user Assistente': Donbas (Skirmish, Inf)
      const performedByMatch = adminLogString.match(/performed by '(.+?)'/);
      const mapInfoMatch = adminLogString.match(
        /':\s*(.+?)\s*\((.+?),\s*(.+?)\)/
      );

      if (!performedByMatch || !mapInfoMatch) {
        logger.debug(
          {
            performedByMatch: performedByMatch?.[1],
            mapInfoMatch: mapInfoMatch?.[1],
          },
          "Não foi possível parsear o comando !SETNEXT"
        );
        return;
      }

      const performedBy = performedByMatch[1].trim();
      // Extrair apenas o nome do usuário (remover "PRISM user" se presente)
      let author = performedBy;
      if (performedBy.includes("PRISM user")) {
        author = performedBy.replace("PRISM user", "").trim();
      }

      const mapName = mapInfoMatch[1].trim();
      const mode = mapInfoMatch[2].trim();
      const layout = mapInfoMatch[3].trim();

      // Mapear os modos e layouts para os valores esperados
      const modeMap: { [key: string]: string } = {
        Skirmish: "Skirmish",
        AAS: "AAS",
        Insurgency: "Insurgency",
        Gungame: "Gungame",
      };

      const layoutMap: { [key: string]: string } = {
        Inf: "Inf",
        Alt: "Alt",
        Std: "Std",
        Lrg: "Lrg",
      };

      const mappedMode = modeMap[mode] || mode;
      const mappedLayout = layoutMap[layout] || layout;

      const payload = {
        name: mapName,
        mode: mappedMode,
        layout: mappedLayout,
        author: author,
      };

      logger.debug({ payload }, "Enviando notificação de !SETNEXT");

      const response = await axios.post(
        "http://162.120.71.123:2020/api/favorite-map/notify",
        payload,
        {
          headers: {
            "Content-Type": "application/json",
          },
          timeout: 5000,
        }
      );

      logger.debug(
        { status: response.status },
        "Notificação de !SETNEXT enviada com sucesso"
      );
    } catch (err: any) {
      const errorDetails: any = {
        message: err.message || String(err),
      };

      if (err.response) {
        errorDetails.status = err.response.status;
        errorDetails.data = err.response.data;
        errorDetails.headers = err.response.headers;
      } else if (err.request) {
        errorDetails.requestError = true;
        errorDetails.url = err.config?.url;
      }

      if (err.stack) {
        errorDetails.stack = err.stack;
      }

      logger.error(errorDetails, "Erro ao processar !SETNEXT");
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
