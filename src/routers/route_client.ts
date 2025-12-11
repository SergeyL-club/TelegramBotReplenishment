import type { TelegramController } from "../core/telegram_controller";
import type { CommandManager } from "../database/command_manager";
import type { UserManager } from "../database/user_manager";
import { default_logger } from "../core/logger";

export async function use_client(
  telegram_controller: TelegramController,
  command_manager: CommandManager,
  user_manager: UserManager
): Promise<void> {
  await default_logger.info(`Registration finally route use_client`);
}
