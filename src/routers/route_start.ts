import type { TelegramController } from "../core/telegram_controller";
import type { UserManager } from "../database/user_manager";
import type { CommandManager } from "../database/command_manager";
import type { MenuManager } from "../database/menu_manager";
import { default_logger } from "../core/logger";
import { get_commands_menu, update_menu } from "./utils";

export async function use_start(
  telegram_controller: TelegramController,
  command_manager: CommandManager,
  user_manager: UserManager,
  menu_manager: MenuManager
): Promise<void> {
  telegram_controller.on_start(async (ctx) => {
    if (ctx.from === undefined) return;
    const user_id = ctx.from.id;
    const user_nickname = ctx.from.username;
    if (user_nickname === undefined) return;

    if (!(await user_manager.has_user(user_id))) {
      const chat_id = ctx.chat!.id;
      await default_logger.info(`Registration start user ${user_nickname} (${user_id}) and add role client`);
      const is_create = await user_manager.create_user(user_id, user_nickname, chat_id);
      const is_add = await user_manager.add_role_to_user("client", user_id);
      await default_logger.info(`Registration finally (${is_create}, ${is_add}) user ${user_nickname} (${user_id}) and add role client`);
    } else await default_logger.info(`User ${user_nickname} (${user_id}) is already registered`);

    const result_commands = await get_commands_menu(command_manager, user_manager, user_id);
    await ctx.telegram.setMyCommands(
      result_commands.map((el) => ({ command: el[0], description: el[1] })),
      { scope: { type: "chat", chat_id: ctx.chat!.id } }
    );
    await ctx.reply("Команды обновлены", { reply_markup: await update_menu(user_id, menu_manager, user_manager) });
  });

  await default_logger.info("Registration finally route use_start");
}
