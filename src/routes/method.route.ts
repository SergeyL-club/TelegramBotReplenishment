import type { TelegramController } from "../core/telegram_controller";
import type { DealManager } from "../database/deal_manager";
import { admin_menu_buttons } from "../database/role_globals";
import { default_logger } from "../core/logger";

export async function use_method(telegram_controller: TelegramController, deal_manager: DealManager): Promise<void> {
  telegram_controller.use({ kid: "message", math: (_, msg) => "text" in msg && msg.text === admin_menu_buttons[0]?.text }, async (ctx) => {
    await ctx.deleteMessage(ctx.message?.message_id);
    const methods = await deal_manager.methods_names_all();
    await ctx.reply(`Список методов оплаты: ${JSON.stringify(methods ?? [])}`, {
      reply_markup: {
        inline_keyboard: [
          [
            { text: "Удалить метод", callback_data: "del_method_name" },
            { text: "Добавить метод", callback_data: "add_method_name" },
          ],
        ],
      },
    });
  });

  await default_logger.info("Registration use_method is finish");
}
