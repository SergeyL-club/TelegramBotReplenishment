import type { TelegramController, MessageFilterFunction, Context } from "../core/telegram_controller";
import type { CommandManager } from "../database/command_manager";
import type { UserManager } from "../database/user_manager";
import type { MenuManager } from "../database/menu_manager";
import type { MethodManager } from "../database/method_manager";
import type { TimeoutDealManager } from "../database/timeout_deal_manager";
import type { DataCommand } from "./utils";
import { is_verify_command, timeout_default_callback, update_menu } from "./utils";
import { menus } from "../registry_base_roles";
import { default_logger } from "../core/logger";

export const balance_callbacks: [text: string, callback_data: string][] = [["Пополнить баланс", "balance_open_deal"]] as const;
export const deal_method_callback = "open_deal_method";
export const deal_open_access = "open_deal_access";

export async function use_deal(
  telegram_controller: TelegramController,
  command_manager: CommandManager,
  user_manager: UserManager,
  menu_manager: MenuManager,
  method_manager: MethodManager,
  timeout_deal_manager: TimeoutDealManager
): Promise<void> {
  const is_verify_menu_client = is_verify_command.bind(null, menu_manager, command_manager, user_manager, true);

  telegram_controller.on_message(
    is_verify_menu_client.bind(null, menus[1]![0], menus[1]![1]) as MessageFilterFunction,
    async (ctx, args) => {
      const data = args as DataCommand;
      if (data[0] !== menus[1]![0] || data[1] !== menus[1]![1]) return;
      if (ctx.message === undefined || !("text" in ctx.message) || ctx.from === undefined) return;
      const user_id = ctx.from.id;

      const deals = await user_manager.user_deals(user_id);

      await ctx.reply(`*Общие сведения об аккаунте*\nКоличество сделок: ${deals.length}`, {
        reply_markup: {
          inline_keyboard: [[{ text: balance_callbacks[0]![0], callback_data: balance_callbacks[0]![1] }]],
        },
        parse_mode: "MarkdownV2",
      });
    }
  );

  telegram_controller.on_callback(balance_callbacks[0]![1], async (ctx) => {
    await ctx.answerCbQuery();
    if (ctx.from === undefined || ctx.chat === undefined || ctx.callbackQuery === undefined) return;

    const methods = await method_manager.method_names();
    await ctx.reply("Выберите метод оплаты:", {
      reply_markup: { inline_keyboard: [methods.map((text) => ({ text, callback_data: `${deal_method_callback}:${text}` }))] },
    });
  });

  async function open_deal(method_name: string, ctx: Context): Promise<void> {
    if (!ctx.message || !("text" in ctx.message) || !ctx.from) return;
    const user_id = ctx.from.id;
    const sum = ctx.message.text;
    if (!/[0-9]+$/.test(sum)) {
      await ctx.reply(`Некорректная сумма (${sum})`, { reply_markup: await update_menu(user_id, menu_manager, user_manager) });
      return;
    }
    const dealers = await user_manager.dealer_readys();
    if (dealers.length < 1) {
      await ctx.reply("В данный момент нету доступных систем пополнений", {
        reply_markup: await update_menu(user_id, menu_manager, user_manager),
      });
      return;
    }

    const is = await ctx.reply("Запрос принят, ожидайте ответа", {
      reply_markup: await update_menu(user_id, menu_manager, user_manager),
      reply_parameters: { message_id: ctx.message.message_id },
    });

    await Promise.all(
      dealers.map(async (user_id) => {
        const chat_id = await user_manager.user_chat(user_id);
        if (!chat_id) return;
        await ctx.telegram.sendMessage(chat_id, `Сделка на сумму ${sum}, метод оплаты ${method_name}`, {
          reply_markup: { inline_keyboard: [[{ text: "Принять", callback_data: `${deal_open_access}:${user_id}:${method_name}:${sum}` }]] },
        });
      })
    );
    await timeout_deal_manager.create_timeout_pre_open(
      Date.now() + 1 * 60 * 1000,
      is.message_id,
      is.chat.id,
      is.from!.id,
      is.from!.username!
    );
    await default_logger.info(
      `Запрос на сделку с суммой ${sum}, методом оплаты ${method_name}. Отправлено dealears (${dealers.length}): `,
      {
        dealers,
      }
    );
  }

  telegram_controller.on_callback(deal_method_callback, async (ctx) => {
    await ctx.answerCbQuery();
    if (ctx.from === undefined || ctx.chat === undefined || ctx.callbackQuery === undefined || !("data" in ctx.callbackQuery)) return;

    const method_name = ctx.callbackQuery.data.split(":")[1];
    if (method_name === undefined) return;

    const is = await ctx.reply(`Вы выбрали метод ${method_name}, ответьте на это сообщение суммой пополнения:`, {
      reply_markup: { force_reply: true },
    });

    telegram_controller.once_answers(
      is.message_id,
      is.chat.id,
      open_deal.bind(null, method_name),
      timeout_default_callback.bind(null, ctx.from.id, menu_manager, user_manager),
      Date.now() + 1 * 60 * 1000
    );
  });

  await default_logger.info("Registration finally route use_deal");
}
