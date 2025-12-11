import type { TelegramController } from "../core/telegram_controller";
import type { UserManager } from "../database/user_manager";
import { default_logger } from "../core/logger";

export async function use_start(telegram_controller: TelegramController, user_manager: UserManager): Promise<void> {
  telegram_controller.on_start(async (ctx) => {
    if (ctx.from === undefined) return;
    const user_id = ctx.from.id;
    const user_nickname = ctx.from.username;
    if (user_nickname === undefined) return;

    if (!(await user_manager.has_user(user_id))) {
      await default_logger.info(`Registration start user ${user_nickname} (${user_id}) and add role client`);
      const is_create = await user_manager.create_user(user_id, user_nickname);
      const is_add = await user_manager.add_role_to_user("client", user_id);
      await default_logger.info(`Registration finally (${is_create}, ${is_add}) user ${user_nickname} (${user_id}) and add role client`);
    } else await default_logger.info(`User ${user_nickname} (${user_id}) is already registered`);
  });

  await default_logger.info(`Registration finally route use_start`);
}
