import type { TelegramController } from "../core/telegram_controller";
import type { UserManager } from "../database/user_manager";
import { type RolesValue, Roles, menu_roles, fragmentation_menu, command_roles } from "../database/role_globals";
import { default_logger } from "../core/logger";

export async function use_start(telegram_controller: TelegramController, user_manager: UserManager): Promise<void> {
  telegram_controller.use({ kid: "start" }, async (ctx) => {
    const user_id = ctx.from!.id;
    const chat_id = ctx.chat!.id;

    if (!(await user_manager.verification_by_user_id(user_id))) {
      const user_nickname = ctx.from!.username!;
      await user_manager.create_user(user_id, chat_id, user_nickname, [Roles.CLIENT]);
    }

    const roles = await user_manager.role_by_user_id(user_id);
    if (!roles) return;

    await ctx.telegram.setMyCommands(command_roles(), { scope: { type: "chat", chat_id: chat_id } });
    await ctx.reply("Меню обновлено", {
      reply_markup: { keyboard: fragmentation_menu(menu_roles(roles as RolesValue[])), resize_keyboard: true },
    });
  });
  await default_logger.info("Registration use_start is finish");
}
