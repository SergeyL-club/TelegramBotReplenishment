import type { TelegramController } from "../core/telegram_controller";
import type { UserManager } from "../database/user_manager";
import { default_logger } from "../core/logger";

export async function use_toggle_admin_off(telegram_controller: TelegramController, user_manager: UserManager): Promise<void> {
  telegram_controller.use({ kid: "callback_query", math: (_, msg) => msg.data === "toggle_admin_off" }, async (ctx, _, binds) => {
    await ctx.answerCbQuery();
    await user_manager.toggle_admin_by_user_id(ctx.from!.id, false);
    const toggle_admin = (await user_manager.ready_admins()).includes(ctx.from!.id);
    const ids = await binds.message_controller.command_update("toggle_admin");
    for (const id of ids) {
      const data = await binds.message_controller.get(id);
      if (data === null) continue;
      await ctx.telegram.editMessageText(
        data.chat_id,
        data.message_id,
        undefined,
        `Ваш режим сделок: ${toggle_admin ? "Включен" : "Отлючен"}\nПримечание: отвечает за получения новых сделок или нет`,
        data.edit?.extra
      );
    }
  });

  await default_logger.info("Registration use_toggle_admin_off is finish");
}
