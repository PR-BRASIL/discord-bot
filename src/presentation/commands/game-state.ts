import { EmbedBuilder } from "@discordjs/builders";
import { client } from "../../main/config/app";
import { TextChannel, AttachmentBuilder } from "discord.js";
import { logger } from "../../utils/logger";
import sharp from "sharp";
import axios from "axios";

let mapName: string;
let messageId: string;
let startTime: Date;

interface Player {
  name: string;
  score: number;
  kills: number;
  deaths: number;
  team: number;
  ping: number;
  isAI: number;
}

export class GameStateCommand {
  public async handle(data: any): Promise<void> {
    logger.debug("Game state updated");
    const channel = client.channels.cache.get(
      "1151917458735767643"
    ) as TextChannel;

    try {
      const message = await (channel as TextChannel).messages.fetch(messageId);
      const isNewMessage = await this.createNewMessage(data, channel);
      if (isNewMessage) return;

      await message.edit({
        embeds: [await this.getEmbed(data)],
      });
      logger.debug("Game state edited");
    } catch (err) {
      logger.error(err);
      mapName = "";
      logger.debug("Game state created (err)");
      await this.createNewMessage(data, channel);
    }
  }

  private async createNewMessage(
    data: any,
    channel: TextChannel
  ): Promise<boolean> {
    const newMapName = data.properties.mapname;
    const imagePath = "./output.webp";
    const attachment = new AttachmentBuilder(imagePath);

    if (mapName !== newMapName) {
      startTime = new Date();
      mapName = newMapName;
      const { id } = await (channel as TextChannel).send({
        embeds: [await this.getEmbed(data)],
        files: [attachment],
      });

      messageId = id;
      return true;
    }

    return false;
  }

  private async getEmbed(data: any): Promise<EmbedBuilder> {
    const logoUrl =
      "https://media.discordapp.net/attachments/1162222580644708372/1274439118591361104/Copia_de_Logo_Perfil_B.jpg?ex=6739912b&is=67383fab&hm=41dd71b5a12bb394bbc59b7d86564afb3de14f1c5017ce70dc6d32f1e804063d&=&format=webp&width=702&height=702";
    await this.convertWebp(data);

    const embed = new EmbedBuilder()
      .setColor(0x1e90ff) // Cor azul vibrante para maior destaque
      .setAuthor({
        name: `Reality Brasil`,
        iconURL: logoUrl,
      })
      .setTitle(`:map: ${data.properties.mapname} | ${this.getGameType(data)}`)
      .addFields(
        {
          name: ":trophy: Partida",
          value: `${data.properties.bf2_team1} X ${data.properties.bf2_team2}`,
          inline: false,
        },
        {
          name: ":people_hugging: Jogadores",
          value: `Atualmente: **${data.properties.numplayers}** / Máximo: **${data.properties.maxplayers}**`,
          inline: true,
        },
        {
          name: ":stopwatch: Tipo de Jogo",
          value: `${this.getGameType(data)}`,
          inline: false,
        },
        {
          name: `:stopwatch: Tempo de partida`,
          value: getGameTime(startTime),
          inline: false,
        },
        {
          name: `:red_circle: ${data.properties.bf2_team1} - Detalhes`,
          value: this.generateDetailedTeamFields(data, 1),
          inline: true,
        },
        {
          name: `:blue_circle: ${data.properties.bf2_team2} - Detalhes`,
          value: this.generateDetailedTeamFields(data, 2),
          inline: true,
        }
      )
      .setThumbnail(logoUrl)
      .setFooter({
        text: "Atualizado em",
        iconURL: logoUrl,
      })
      .setImage("attachment://output.webp")
      .setTimestamp();

    return embed;
  }

  private generateDetailedTeamFields(data: any, teamNumber: number) {
    const score = this.getAllTeamData(data, teamNumber, "score");
    const kills = this.getAllTeamData(data, teamNumber, "kills");
    const deaths = this.getAllTeamData(data, teamNumber, "deaths");

    return (
      `**Pontos:** ${score}\n` +
      `**Kills:** ${kills}\n` +
      `**Deaths:** ${deaths}\n`
    );
  }

  private getAllTeamData(data: any, teamNumber: number, field: string): number {
    const teamTotal = (data.players as Player[])
      .filter((player) => player.team === teamNumber)
      .reduce((total, player) => total + player[field], 0);

    return teamTotal || 0;
  }

  private getGameType(data: any) {
    const allTypes = {
      gpm_cq: "AAS",
      gpm_gungame: "Gungame",
      gpm_vehicles: "Vehicle Warfare",
      gpm_insurgency: "Insurgency",
      gpm_skirmish: "Skirmish",
    };
    return allTypes[data.properties.gametype];
  }

  private async convertWebp(data: any) {
    const mapSize = data.properties.bf2_mapsize;
    const mapNameLink = data.properties.mapname
      .toLowerCase()
      .replace(/\s/g, "");
    const response = await axios.get(
      `https://www.realitymod.com/mapgallery/images/maps/${mapNameLink}/mapoverview_${data.properties.gametype}_${mapSize}.jpg`,
      { responseType: "arraybuffer" }
    );

    await sharp(Buffer.from(response.data)).webp().toFile("./output.webp");
  }
}

const getGameTime = (startTime: Date) => {
  const currentTime = new Date();
  const timeDifference = currentTime.getTime() - startTime.getTime();
  const seconds = Math.floor(timeDifference / 1000) % 60;
  const minutes = Math.floor(timeDifference / (1000 * 60)) % 60;
  const hours = Math.floor(timeDifference / (1000 * 60 * 60));

  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};
