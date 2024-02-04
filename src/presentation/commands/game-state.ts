import { EmbedBuilder } from "@discordjs/builders";
import { client } from "../../main/config/app";
import { TextChannel, AttachmentBuilder, ChannelType } from "discord.js";
import { logger } from "../../utils/logger";

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
      logger.debug(message);
      await this.createNewMessage(data, channel);

      await message.edit({
        embeds: [this.getEmbed(data)],
      });
    } catch (err) {
      mapName = "";
      await this.createNewMessage(data, channel);
    }
  }

  private async createNewMessage(data: any, channel: TextChannel) {
    const newMapName = data.properties.mapname;

    if (mapName !== newMapName) {
      mapName = newMapName;
      const { id } = await (channel as TextChannel).send({
        embeds: [this.getEmbed(data)],
      });
      messageId = id;
      return;
    }
  }

  private getEmbed(data: any): EmbedBuilder {
    const embed = new EmbedBuilder()
      .setColor(0x000)
      .setAuthor({
        name: `Brasil Evolution | Mapa Atual`,
        iconURL:
          "https://media.discordapp.net/attachments/1202077225088974909/1203804331258814495/logo_Black.png",
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
      .setThumbnail(
        "https://media.discordapp.net/attachments/1202077225088974909/1203804331258814495/logo_Black.png"
      )
      .setFooter({
        text: "Atualizado",
        iconURL:
          "https://media.discordapp.net/attachments/1202077225088974909/1203804331258814495/logo_Black.png",
      })
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
}
