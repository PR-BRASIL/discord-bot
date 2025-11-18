import { config } from "dotenv";

config();

export const env = {
  token: process.env.TOKEN,
  port: process.env.PORT || 7070,
  apiUrl: process.env.API_URL || "http://localhost:8080",
  chatChannelId: process.env.CHAT_CHANNEL_ID,
  reportLogChannelId: process.env.REPORT_LOG_CHANNEL_ID,
  adminLogChannelId: process.env.ADMIN_LOG_CHANNEL_ID,
  banLogChannelId: process.env.BAN_LOG_CHANNEL_ID,
  killChannelId: process.env.KILL_CHANNEL_ID,
  teamKillChannelId: process.env.TEAM_KILL_CHANNEL_ID,
  connectionLogChannelId: process.env.CONNECTION_LOG_CHANNEL_ID,
  gameStateChannelId: process.env.GAME_STATE_CHANNEL_ID,
  serverId: process.env.SERVER_ID,
};
