import type { UserService } from "../services/user.service";
import type { DefaultContext } from "../core/telegram.types";
import type { LiveMessageService } from "../services/live_message.service";
import type { InlineKeyboardMarkup } from "telegraf/typings/core/types/typegram";
import { callback_middleware, type CallbackContext } from "../middleware/callback.middleware";
import { Composer } from "../core/telegram.composer";
import { get_app_context } from "../helpers/app_context.adapter";
import { get_callback_data } from "../helpers/callback_data.adapter";
import { TraderReadyUI } from "../ui/trader_ready.ui";

export function trader_ready_callback<Type extends DefaultContext>(
  user_serivce: UserService,
  live_message_service: LiveMessageService
): ReturnType<Composer<Type & CallbackContext>["handler"]> {
  const composer = new Composer<Type>();

  return composer.use(callback_middleware("trader_ready")).handler(async (ctx) => {
    await ctx.answerCbQuery();
    const app = get_app_context(ctx);
    if (!app) return;

    const { method_str: type } = get_callback_data<{ type_str: string; method_str: string }>(ctx, ["type_str", "method_str"]) ?? {};
    if (typeof type !== "string") return;

    if (type === "add") await user_serivce.add_trader_ready(app.user_id);
    else await user_serivce.del_trader_ready(app.user_id);

    const ready = await user_serivce.trader_ready(app.user_id);

    const now = Math.ceil(Date.now() / 1000);
    const trader_ready_menu = TraderReadyUI.main_menu(ready);
    const messages_update = await live_message_service.get_messages("edited", "trader_ready_menu");
    messages_update.push({
      message_id: ctx.update.callback_query.message.message_id,
      chat_id: ctx.update.callback_query.message.chat.id,
      expired_at: now + 1,
    });
    for (const { message_id, chat_id, expired_at } of messages_update)
      if (now < expired_at) {
        await ctx.telegram
          .editMessageText(chat_id, message_id, undefined, trader_ready_menu.text, {
            reply_markup: { inline_keyboard: (trader_ready_menu.extra!.reply_markup as InlineKeyboardMarkup).inline_keyboard },
          })
          .catch((e) => {
            if (typeof e === "object" && e !== null)
              if ("description" in e && typeof e.description === "string" && e.description.includes("message is not modified")) return;
            throw e;
          });
        if (expired_at !== now + 1)
          await live_message_service.registration(
            "edited",
            "trader_ready_menu",
            { chat_id, message_id },
            { old_text: trader_ready_menu.text, expired_at }
          );
      }
  });
}
