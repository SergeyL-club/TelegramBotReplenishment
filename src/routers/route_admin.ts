import type { TelegramController, MessageFilterFunction, Context } from "../core/telegram_controller";
import type { CommandManager } from "../database/command_manager";
import type { UserManager } from "../database/user_manager";
import type { MenuManager } from "../database/menu_manager";
import type { MethodManager } from "../database/method_manager";
import type { DataCommand } from "./utils";
import { default_logger } from "../core/logger";
import { is_verify_command, update_menu } from "./utils";
import { menus } from "../registry_base_roles";

const callbacks: [text: string, callback_data: string][] = [
  ["Добавить метод", "add_method_deal"],
  ["Удалить метод", "del_method_deal"],
] as const;

export async function use_admin(
  telegram_controller: TelegramController,
  command_manager: CommandManager,
  user_manager: UserManager,
  menu_manager: MenuManager,
  method_manager: MethodManager
): Promise<void> {
  const is_verify_menu_admin = is_verify_command.bind(null, menu_manager, command_manager, user_manager, true);

  telegram_controller.on_message(
    is_verify_menu_admin.bind(null, menus[0]![0], menus[0]![1]) as MessageFilterFunction,
    async (ctx, args) => {
      const data = args as DataCommand;
      if (data[0] !== menus[0]![0] || data[1] !== menus[0]![1]) return;
      if (!ctx.message || !("text" in ctx.message) || ctx.from === undefined) return;
      const methods = await method_manager.method_names();
      await ctx.reply(`Список доступных методов оплаты: <code>${methods.length === 0 ? "пусто" : methods.join("</code>, <code>")}</code>`, {
        reply_markup: {
          inline_keyboard: [
            [
              { text: callbacks[0]![0], callback_data: callbacks[0]![1] },
              { text: callbacks[1]![0], callback_data: callbacks[1]![1] },
            ],
          ],
        },
        parse_mode: "HTML",
      });
    }
  );

  async function add_method_deal(ctx: Context): Promise<void> {
    if (!ctx.message || !("text" in ctx.message) || !ctx.from) return;
    const [name, description] = ctx.message.text.trim().split(" ");
    const user_id = ctx.from.id;
    if (!name || !description) {
      await ctx.reply("Не удалось правильно получить name и descriptions", { reply_parameters: { message_id: ctx.message.message_id } });
      return;
    }
    const is_add = await method_manager.create_method(name, description);
    const methods = await method_manager.method_names();
    await ctx.reply(
      `Регистрация нового метода (${is_add}), новый список методов:  <code>${methods.length === 0 ? "пусто" : methods.join("</code>, <code>")}</code>`,
      { parse_mode: "HTML", reply_markup: await update_menu(user_id, menu_manager, user_manager) }
    );
  }

  async function del_method_deal(ctx: Context): Promise<void> {
    if (!ctx.message || !("text" in ctx.message) || !ctx.from) return;
    const name = ctx.message.text.trim();
    const user_id = ctx.from.id;
    if (!name) {
      await ctx.reply("Не удалось правильно получить name", { reply_parameters: { message_id: ctx.message.message_id } });
      return;
    }
    const is_rem = await method_manager.delete_method(name);
    const methods = await method_manager.method_names();
    await ctx.reply(
      `Удаление старого метода (${is_rem}), новый список методов:  <code>${methods.length === 0 ? "пусто" : methods.join("</code>, <code>")}</code>`,
      { parse_mode: "HTML", reply_markup: await update_menu(user_id, menu_manager, user_manager) }
    );
  }

  telegram_controller.on_callback(callbacks[0]![1], async (ctx) => {
    await ctx.answerCbQuery();
    const is = await ctx.reply("Ответьте на это сообщение форматом: name description", {
      reply_markup: { force_reply: true },
    });
    telegram_controller.once_answers(is.message_id, is.chat.id, add_method_deal, 1 * 60 * 1000);
  });

  telegram_controller.on_callback(callbacks[1]![1], async (ctx) => {
    await ctx.answerCbQuery();
    const is = await ctx.reply("Ответьте на это сообщение форматом: name", {
      reply_markup: { force_reply: true },
    });
    telegram_controller.once_answers(is.message_id, is.chat.id, del_method_deal, 1 * 60 * 1000);
  });

  await default_logger.info("Registration finally route use_admin");
}
