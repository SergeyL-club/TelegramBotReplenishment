import type { TelegramController } from "../core/telegram_controller";
import type { DealManager } from "../database/deal_manager";
import { default_logger } from "../core/logger";

export async function use_method_add(telegram_controller: TelegramController, deal_manager: DealManager): Promise<void> {
  telegram_controller.use({ kid: "callback_query", math: (_, msg) => msg.data === "add_method_name" }, async (ctx, cb, binds) => {
    await ctx.answerCbQuery();
    if (cb.message === undefined) return;
    const is = await ctx.reply("Напишите название метода оплаты", { reply_markup: { force_reply: true } });
    await binds.message_controller.bind({
      command: "add_get_method_name",
      chat_id: is.chat.id,
      message_id: is.message_id,
      delete_at: Date.now() + 1 * 60 * 1000,
    });
  });

  telegram_controller.use(
    { kid: "reply", math: (_, __, message) => message.command === "add_get_method_name" },
    async (ctx, msg, binds) => {
      const method_name = "text" in msg ? msg.text : (msg.caption ?? null);
      if (method_name == null) {
        await ctx.reply("Не удалось получить название метода");
        return;
      }
      if (await deal_manager.verification_by_method_name(method_name)) {
        await ctx.reply(`Метод ${method_name} уже существует в списках`);
        return;
      }
      await deal_manager.create_method(method_name);
      const methods = await deal_manager.methods_names_all();
      const ids = await binds.message_controller.command_update("list_methods");
      for (const id of ids) {
        const data = await binds.message_controller.get(id);
        if (data === null) continue;

        await ctx.telegram.editMessageText(
          data.chat_id,
          data.message_id,
          undefined,
          `Список методов оплаты: ${JSON.stringify(methods ?? [])}`,
          {
            reply_markup: {
              inline_keyboard: [
                [
                  { text: "Удалить метод", callback_data: "del_method_name" },
                  { text: "Добавить метод", callback_data: "add_method_name" },
                ],
              ],
            },
          }
        );
      }
    }
  );

  await default_logger.info("Registration use_method_add is finish");
}
