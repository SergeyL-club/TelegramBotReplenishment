import { default_logger } from "../core/logger";
import { TelegramController } from "../core/telegram_controller";
import { client_commands, command_roles, fragmentation_menu, menu_roles, type RolesValue } from "../database/role_globals";
import { UserManager } from "../database/user_manager";

export async function use_menu(telegram_controller: TelegramController, user_manager: UserManager): Promise<void> {
  telegram_controller.use(
    { kid: "command", math: (_, msg) => "text" in msg && msg.text.trim().split(" ")[0] === client_commands[1]?.command },
    async (ctx) => {
      const user_id = ctx.from!.id;
      const chat_id = ctx.chat!.id;

      const roles = await user_manager.role_by_user_id(user_id);
      if (!roles) return;

      await ctx.telegram.setMyCommands(command_roles(), { scope: { type: "chat", chat_id: chat_id } });
      await ctx.reply("Меню обновлено", {
        reply_markup: { keyboard: fragmentation_menu(menu_roles(roles as RolesValue[])), resize_keyboard: true },
      });
    }
  );

  await default_logger.info("Registration use_start is finish");
}
