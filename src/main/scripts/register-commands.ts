import { REST, Routes } from "discord.js";
import { env } from "../config/env";
import { logger } from "../../utils/logger";

async function registerCommands() {
  const commands = [];

  // Adicionar comandos aqui quando necessário

  // Construir e preparar uma instância do módulo REST
  const rest = new REST({ version: "10" }).setToken(env.token!);

  try {
    if (commands.length === 0) {
      logger.info("Nenhum comando para registrar.");
      return;
    }

    logger.info(
      `Iniciando registro de ${commands.length} comando(s) de barra (/).`
    );

    // Nota: Para registrar comandos, é necessário configurar CLIENT_ID no .env
    // e adicionar clientId ao objeto env em src/main/config/env.ts
    logger.warn(
      "Registro de comandos desabilitado. Configure CLIENT_ID para habilitar."
    );
  } catch (error) {
    logger.error("Erro ao registrar comandos:", error);
  }
}

registerCommands();
