import { EmbedBuilder } from "@discordjs/builders";
import { client } from "../../main/config/app";
import { TextChannel, AttachmentBuilder } from "discord.js";
import { logger } from "../../utils/logger";
import sharp from "sharp";
import axios from "axios";

let mapName: string;
let messageId: string;

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
      "1203736140692197426"
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
      "https://media.discordapp.net/attachments/1202077225088974909/1204267446928674846/logo_White.png?ex=65d41c75&is=65c1a775&hm=5494255392f14778735075646f02d71a279f100037be727af42ece7badc34cd3&=&format=webp&quality=lossless&width=639&height=639";
    await this.convertWebp(data);
    const embed = new EmbedBuilder()
      .setColor(0x000)
      .setAuthor({
        name: `Brasil Evolution | Mapa Atual`,
        iconURL: logoUrl,
      })
      .setTitle(`:map: ${data.properties.mapname} | ${this.getGameType(data)}`)
      .addFields(
        {
          name: data.properties.bf2_team1 + " X " + data.properties.bf2_team2,
          value: `:people_hugging: ${data.properties.numplayers}/${data.properties.maxplayers}`,
          inline: false,
        },
        {
          name: ":red_square: " + data.properties.bf2_team1,
          value: this.generateTeamFields(data, 1),
          inline: true,
        },
        {
          name: ":blue_square: " + data.properties.bf2_team2,
          value: this.generateTeamFields(data, 2),
          inline: true,
        }
      )
      .setThumbnail(logoUrl)
      // .setImage("attachment://output.webp")
      .setFooter({
        text: "Atualizado",
        iconURL: logoUrl,
      })
      .setImage("attachment://output.webp")
      .setTimestamp();

    return embed;
  }

  private generateTeamFields(data: any, teamNumber: number) {
    return (
      "```" +
      `
Score: ${this.getAllTeamData(data, teamNumber, "score")}
Kills: ${this.getAllTeamData(data, teamNumber, "kills")}
Deaths: ${this.getAllTeamData(data, teamNumber, "deaths")}` +
      "```"
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
