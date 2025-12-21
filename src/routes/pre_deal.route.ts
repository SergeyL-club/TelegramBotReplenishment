import type { TelegramController } from "../core/telegram_controller";
import type { UserManager } from "../database/user_manager";
import type { DealManager } from "../database/deal_manager";
import { client_menu_buttons, fragmentation_inline, Roles } from "../database/role_globals";
import { default_logger } from "../core/logger";

export async function use_pre_deal(
  telegram_controller: TelegramController,
  user_manager: UserManager,
  deal_manager: DealManager
): Promise<void> {
  telegram_controller.use(
    {
      kid: "message",
      math: (ctx, msg) =>
        "text" in msg && msg.text === client_menu_buttons[0]?.text && user_manager.verification_role_by_user_id(ctx.from!.id, Roles.CLIENT),
    },
    async (ctx, _, binds) => {
      const methods = await deal_manager.methods_names_all();
      if (methods === null) {
        await ctx.reply("На данный момент отсутствуют методы оплат. Ждите обновления списков");
        return;
      }
      const inline_buttons = methods.map((val) => ({ text: val, callback_data: `set_method:${val}` }));

      const is = await ctx.reply("Выберите метод оплаты:", {
        reply_markup: {
          inline_keyboard: fragmentation_inline(inline_buttons),
        },
      });
      await binds.message_controller.bind({
        command: `deals|${is.message_id}`,
        chat_id: is.chat.id,
        message_id: is.message_id,
        delete_at: Date.now() + 20 * 60 * 1000,
        edit: {
          text: is.text,
          extra: { reply_markup: is.reply_markup! },
        },
      });
    }
  );

  telegram_controller.use({ kid: "callback_query", math: (_, msg) => msg.data.split(":")[0] === "set_method" }, async (ctx, msg, binds) => {
    await ctx.answerCbQuery();
    const method_name = msg.data.split(":")[1];
    if (method_name === undefined || !(await deal_manager.verification_by_method_name(method_name))) {
      if (msg.message === undefined || !("text" in msg.message)) return;
      const methods = await deal_manager.methods_names_all();
      if (methods === null) return;
      const inline_buttons = methods.map((val) => ({ text: val, callback_data: `set_method:${val}` }));
      await ctx.reply(`Не найден метод оплаты (${method_name}), мы обновили списки предыдущего сообщения`);
      await ctx.telegram.editMessageText(msg.message.chat.id, msg.message.message_id, undefined, msg.message.text, {
        reply_markup: {
          inline_keyboard: fragmentation_inline(inline_buttons),
        },
      });
      return;
    }
    if (msg.message === undefined || !("text" in msg.message)) return;

    await binds.message_controller.bind({
      command: `deals|${msg.message.message_id}`,
      chat_id: msg.message.chat.id,
      message_id: msg.message.message_id,
      delete_at: Date.now() + 20 * 60 * 1000,
      edit: {
        text: msg.message.text,
        extra: { reply_markup: msg.message.reply_markup! },
      },
      data: { method_name },
    });

    const is = await ctx.reply("Напишите сумму пополнения:", { reply_markup: { force_reply: true } });
    await binds.message_controller.bind({
      command: "deals_sum",
      chat_id: is.chat.id,
      message_id: is.message_id,
      delete_at: Date.now() + 5 * 60 * 1000,
      force: msg.message.message_id,
    });
  });

  telegram_controller.use({ kid: "reply", math: (_, __, message) => message.command === "deals_sum" }, async (ctx, msg, binds) => {
    if (!("text" in msg)) return;
    const sum = Number(msg.text);
    if (sum < 10) {
      await ctx.reply(`Неправильный формат суммы (${sum}), заново выберите метод оплаты и напишите сумму`);
      return;
    }

    const trader_ids = await user_manager.ready_traders();
    if (trader_ids.length <= 0) {
      await ctx.reply("Нету доступных систем оплаты, попробуйте снова через время");
      return;
    }

    let actual_method: string | null = null;
    const ids = await binds.message_controller.command_update(`deals|${binds.message_bind.force}`);
    for (const id of ids) {
      const data = await binds.message_controller.get(id);
      if (data === null) continue;
      if (data.data === undefined || data.data === null) continue;
      const method_name = (data.data as any).method_name;
      if (method_name === undefined || method_name === null) continue;
      const is_text = `Заявка на сумму ${sum} и методом оплаты ${method_name}, ожидайте изменения сообщения`;
      await ctx.telegram.editMessageText(data.chat_id, data.message_id, undefined, is_text);
      await binds.message_controller.bind({
        ...data,
        edit: { text: is_text },
        data: { method_name, sum },
      });
      actual_method = method_name;
    }

    for (const trader_id of trader_ids) {
      const chat_id = await user_manager.chat_by_user_id(trader_id);
      if (chat_id === null) continue;
      await ctx.telegram.sendMessage(chat_id, `Запрос на сумму ${sum} и методом оплаты ${actual_method}`, {
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: "Принять",
                callback_data: `access_deal:${binds.message_bind.force}:${JSON.stringify(trader_ids.filter((id) => id !== trader_id))}`,
              },
            ],
          ],
        },
      });
    }
  });

  telegram_controller.use(
    { kid: "callback_query", math: (_, msg) => msg.data.split(":")[0] === "access_deal" },
    async (ctx, msg, binds) => {
      await ctx.answerCbQuery();
      const [_, force, trader_ids_str] = msg.data.split(":");
      if (force === undefined || trader_ids_str === undefined) return;
      let trader_ids: number[];
      try {
        trader_ids = JSON.parse(trader_ids_str);
      } catch {
        return;
      }

      for (const trader_id of trader_ids) {
        const chat_id = await user_manager.chat_by_user_id(trader_id);
        if (chat_id === null) continue;

        await ctx.telegram.editMessageText(chat_id, trader_id, undefined, "Заявка была принята другим пользователем");
      }

      const data = await binds.message_controller.get(Number(force));
      if (data === null) return;
      const deal_data = data.data as { method_name: string; sum: number } | undefined;
      if (deal_data === undefined) return;

      const is_text = `Заявка №0\n  метод оплаты: ${deal_data.method_name}\n  сумма: ${deal_data.sum}`;
      await ctx.telegram.editMessageText(ctx.chat?.id, msg.message?.message_id, undefined, is_text);
      await binds.message_controller.bind({
        command: "deal_trader|0",
        chat_id: ctx.chat!.id,
        message_id: msg.message!.message_id,
        delete_at: Date.now() + 20 * 60 * 1000,
        edit: {
          text: is_text,
        },
      });

      await ctx.telegram.editMessageText(data.chat_id, data.message_id, undefined, is_text);
      await binds.message_controller.delete(data.message_id);
      await binds.message_controller.bind({
        ...data,
        command: "deal_client|0",
        edit: { text: is_text },
        data: { deal_id: 0 },
      });
    }
  );

  await default_logger.info("Registration use_pre_deal is finish");
}
