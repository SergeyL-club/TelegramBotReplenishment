import type { UserService } from "../services/user.service";
import type { DefaultContext } from "../core/telegram.types";
import type { LiveMessageService } from "../services/live_message.service";
import type { InlineKeyboardMarkup } from "telegraf/typings/core/types/typegram";
import { callback_middleware, type CallbackContext } from "../middleware/callback.middleware";
import { Composer } from "../core/telegram.composer";
import { get_app_context } from "../helpers/app_context.adapter";
import { get_callback_data } from "../helpers/callback_data.adapter";
import { AdminReadyUI } from "../ui/admin_ready.ui";

export function admin_ready_callback<Type extends DefaultContext>(
  user_serivce: UserService,
  live_message_service: LiveMessageService
): ReturnType<Composer<Type & CallbackContext>["handler"]> {
  const composer = new Composer<Type>();

  return composer.use(callback_middleware("admin_ready")).handler(async (ctx) => {
    await ctx.answerCbQuery();
    const app = get_app_context(ctx);
    if (!app) return;

    const { method_str: type } = get_callback_data<{ type_str: string; method_str: string }>(ctx, ["type_str", "method_str"]) ?? {};
    if (typeof type !== "string") return;

    if (type === "add") await user_serivce.add_admin_ready(app.user_id);
    else await user_serivce.del_admin_ready(app.user_id);

    const ready = await user_serivce.admin_ready(app.user_id);

    const now = Math.ceil(Date.now() / 1000);
    const methods_modify_menu = AdminReadyUI.main_menu(ready);
    const messages_update = await live_message_service.get_ids(app.user_id, "admin_ready_menu");
    messages_update.push({
      message_id: ctx.update.callback_query.message.message_id,
      old_text: "",
      chat_id: ctx.update.callback_query.message.chat.id,
      expires_at: now + 1,
    });
    for (const { message_id, chat_id, expires_at } of messages_update)
      if (now < expires_at)
        await ctx.telegram
          .editMessageText(chat_id, message_id, undefined, methods_modify_menu.text, {
            reply_markup: { inline_keyboard: (methods_modify_menu.extra!.reply_markup as InlineKeyboardMarkup).inline_keyboard },
          })
          .catch((e) => {
            if (typeof e === "object" && e !== null)
              if ("description" in e && typeof e.description === "string" && e.description.includes("message is not modified")) return;
            throw e;
          });
  });
}
