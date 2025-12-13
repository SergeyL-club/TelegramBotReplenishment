import type { MessageFilterFunction, TelegramController } from "../core/telegram_controller";
import type { MenuManager } from "../database/menu_manager";
import type { CommandManager } from "../database/command_manager";
import type { UserManager } from "../database/user_manager";
import type { DataCommand } from "./utils";
import { default_logger } from "../core/logger";
import { is_verify_command } from "./utils";
import { menus } from "../registry_base_roles";

export const dealer_ready_callbacks: [text: string, callback_data: string][] = [
  ["Включение", "dealer_ready_on"],
  ["Отключение", "dealer_ready_off"],
] as const;

export async function use_dealer(
  telegram_controller: TelegramController,
  command_manager: CommandManager,
  user_manager: UserManager,
  menu_manager: MenuManager
) {
  const is_verify_menu_dealer = is_verify_command.bind(null, menu_manager, command_manager, user_manager, true);

  telegram_controller.on_message(
    is_verify_menu_dealer.bind(null, menus[2]![0], menus[2]![1]) as MessageFilterFunction,
    async (ctx, args) => {
      const data = args as DataCommand;
      if (data[0] !== menus[2]![0] || data[1] !== menus[2]![1]) return;
      if (!ctx.message || !("text" in ctx.message) || ctx.from === undefined) return;
      const user_id = ctx.from.id;

      const is_ready = await user_manager.dealer_has_ready(user_id);

      await ctx.reply(`Режим сделок: ${is_ready ? "вкл" : "выкл"}`, {
        reply_markup: {
          inline_keyboard: [
            [
              { text: dealer_ready_callbacks[0]![0], callback_data: dealer_ready_callbacks[0]![1] },
              { text: dealer_ready_callbacks[1]![0], callback_data: dealer_ready_callbacks[1]![1] },
            ],
          ],
        },
      });
    }
  );

  telegram_controller.on_callback(dealer_ready_callbacks[0]![1], async (ctx) => {
    await ctx.answerCbQuery();
    if (ctx.from === undefined || ctx.chat === undefined || ctx.callbackQuery === undefined) return;
    const user_id = ctx.from.id;

    const is_ready = await user_manager.add_dealer_ready(user_id, true);
    await ctx.telegram.editMessageText(
      ctx.chat.id,
      ctx.callbackQuery.message!.message_id,
      undefined,
      `Режим сделок: ${is_ready ? "вкл" : "выкл"}`,
      {
        reply_markup: {
          inline_keyboard: [
            [
              { text: dealer_ready_callbacks[0]![0], callback_data: dealer_ready_callbacks[0]![1] },
              { text: dealer_ready_callbacks[1]![0], callback_data: dealer_ready_callbacks[1]![1] },
            ],
          ],
        },
      }
    );
  });

  telegram_controller.on_callback(dealer_ready_callbacks[1]![1], async (ctx) => {
    await ctx.answerCbQuery();
    if (ctx.from === undefined || ctx.chat === undefined || ctx.callbackQuery === undefined) return;
    const user_id = ctx.from.id;

    const is_ready = await user_manager.add_dealer_ready(user_id, false);
    await ctx.telegram.editMessageText(
      ctx.chat.id,
      ctx.callbackQuery.message!.message_id,
      undefined,
      `Режим сделок: ${is_ready ? "выкл" : "вкл"}`,
      {
        reply_markup: {
          inline_keyboard: [
            [
              { text: dealer_ready_callbacks[0]![0], callback_data: dealer_ready_callbacks[0]![1] },
              { text: dealer_ready_callbacks[1]![0], callback_data: dealer_ready_callbacks[1]![1] },
            ],
          ],
        },
      }
    );
  });

  await default_logger.info("Registration finally route use_deal");
}
