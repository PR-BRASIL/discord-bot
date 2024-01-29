import { config } from "dotenv";

config();

export const env = {
  token: process.env.TOKEN,
  port: process.env.PORT || 7070,
};
