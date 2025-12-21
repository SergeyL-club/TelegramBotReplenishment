import { default_logger } from "../core/logger";
import type { TelegramController } from "../core/telegram_controller";
import { Roles, trader_menu_buttons } from "../database/role_globals";
import type { UserManager } from "../database/user_manager";

export async function use_toggle_trader(telegram_controller: TelegramController, user_manager: UserManager): Promise<void> {
  telegram_controller.use(
    {
      kid: "message",
      math: async (ctx, msg) =>
        "text" in msg && msg.text === trader_menu_buttons[0]?.text && user_manager.verification_role_by_user_id(ctx.from!.id, Roles.TRADER),
    },
    async (ctx, message, binds) => {
      await ctx.deleteMessage(message.message_id);
      const toggle_trader = (await user_manager.ready_traders()).includes(ctx.from!.id);

      const is = await ctx.reply(
        `Ваш режим сделок: ${toggle_trader ? "Включен" : "Отлючен"}\nПримечание: отвечает за получения новых сделок или нет`,
        {
          reply_markup: {
            inline_keyboard: [
              [
                { text: "Вкл", callback_data: "toggle_trader_on" },
                { text: "Выкл", callback_data: "toggle_trader_off" },
              ],
            ],
          },
        }
      );
      await binds.message_controller.bind({
        command: "toggle_trader",
        chat_id: is.chat.id,
        message_id: is.message_id,
        delete_at: Date.now() + 1 * 60 * 1000,
        edit: {
          text: is.text,
          extra: { reply_markup: is.reply_markup! },
        },
      });
    }
  );

  await default_logger.info("Registration use_toggle_trader is finish");
}
