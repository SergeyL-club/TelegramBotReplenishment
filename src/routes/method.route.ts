import type { TelegramController } from "../core/telegram_controller";
import type { DealManager } from "../database/deal_manager";
import { admin_menu_buttons } from "../database/role_globals";
import { default_logger } from "../core/logger";

export async function use_method(telegram_controller: TelegramController, deal_manager: DealManager): Promise<void> {
  telegram_controller.use(
    { kid: "message", math: (_, msg) => "text" in msg && msg.text === admin_menu_buttons[0]?.text },
    async (ctx, message, binds) => {
      await ctx.deleteMessage(message.message_id);
      const methods = await deal_manager.methods_names_all();
      const is = await ctx.reply(`Список методов оплаты: ${JSON.stringify(methods ?? [])}`, {
        reply_markup: {
          inline_keyboard: [
            [
              { text: "Удалить метод", callback_data: "del_method_name" },
              { text: "Добавить метод", callback_data: "add_method_name" },
            ],
          ],
        },
      });

      await binds.message_controller.bind({
        command: "list_methods",
        chat_id: is.chat.id,
        message_id: is.message_id,
        delete_at: Date.now() + 1 * 10 * 1000,
        edit: {
          text: is.text,
          extra: { reply_markup: is.reply_markup! },
        },
      });
    }
  );
  await default_logger.info("Registration use_method is finish");
}
