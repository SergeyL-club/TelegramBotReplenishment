import { default_logger } from "../core/logger";
import type { TelegramController } from "../core/telegram_controller";
import type { UserManager } from "../database/user_manager";

export async function use_toggle_trader_on(telegram_controller: TelegramController, user_manager: UserManager): Promise<void> {
  telegram_controller.use({ kid: "callback_query", math: (_, msg) => msg.data === "toggle_trader_on" }, async (ctx, _, binds) => {
    await ctx.answerCbQuery();
    await user_manager.toggle_trader_by_user_id(ctx.from!.id, true);
    const toggle_trader = (await user_manager.ready_traders()).includes(ctx.from!.id);
    const ids = await binds.message_controller.command_update("toggle_trader");
    for (const id of ids) {
      const data = await binds.message_controller.get(id);
      if (data === null) continue;
      await ctx.telegram.editMessageText(
        data.chat_id,
        data.message_id,
        undefined,
        `Ваш режим сделок: ${toggle_trader ? "Включен" : "Отлючен"}\nПримечание: отвечает за получения новых сделок или нет`,
        data.edit?.extra
      );
    }
  });

  await default_logger.info("Registration use_toggle_trader_on is finish");
}
