import type { DefaultContext } from "../core/telegram.types";
import type { ReplyDatabaseApadter } from "../databases/reply.database";
import type { LiveMessageService } from "../services/live_message.service";
import type { MethodService } from "../services/method.service";
import type { InlineKeyboardMarkup } from "telegraf/typings/core/types/typegram";
import { callback_middleware, type CallbackContext } from "../middleware/callback.middleware";
import { reply_middleware, type ReplyContext } from "../middleware/reply.middleware";
import { Composer } from "../core/telegram.composer";
import { get_app_context } from "../helpers/app_context.adapter";
import { get_callback_data } from "../helpers/callback_data.adapter";
import { MethodsModifyUI } from "../ui/methods_modify.ui";
import { clear_reply } from "../helpers/clear_reply.helper";
import { get_text } from "../helpers/text.adapter";

export function admin_methods_modify_callback<Type extends DefaultContext>(
  live_message_service: LiveMessageService,
  reply_database: ReplyDatabaseApadter
): ReturnType<Composer<Type & CallbackContext>["handler"]> {
  const composer = new Composer<Type>();

  return composer.use(callback_middleware("methods_modify")).handler(async (ctx) => {
    await ctx.answerCbQuery();
    const app = get_app_context(ctx);
    if (!app) return;

    const messages = await live_message_service.get_ids(app.user_id, "methods_modify_reply");
    for (const { message_id } of messages) {
      await ctx.deleteMessage(message_id);
      await reply_database.delete(message_id);
    }
    await live_message_service.clear(app.user_id, "methods_modify_reply");

    const { method_str: type } = get_callback_data<{ type_str: string; method_str: string }>(ctx, ["type_str", "method_str"]) ?? {};
    if (typeof type !== "string") return;

    const reply = MethodsModifyUI.reply_method_modify();
    const is = await ctx.reply(reply.text, reply.extra);

    const expired = Math.ceil(Date.now() / 1000) + 1 * 60;
    await reply_database.add(is.message_id, { type, message_id: ctx.update.callback_query.message.message_id, expired_at: expired });
    await live_message_service.registration(app.user_id, "methods_modify_reply", {
      message_id: is.message_id,
      chat_id: is.chat.id,
      expires_at: expired,
    });
  });
}

export function admin_methods_modify_reply<Type extends DefaultContext>(
  live_message_service: LiveMessageService,
  method_service: MethodService,
  reply_database: ReplyDatabaseApadter
): ReturnType<Composer<Type & ReplyContext<{ type: string; message_id: number; expired_at: number }>>["handler"]> {
  const composer = new Composer<Type>();

  return composer.use(reply_middleware<Type, { type: string; message_id: number; expired_at: number }>(reply_database)).handler(async (ctx) => {
    const app = get_app_context(ctx);
    if (!app) return;

    await clear_reply(ctx);
    await live_message_service.clear(app.user_id, "methods_modify_reply");

    const { text: method_name } = get_text(ctx) ?? {};
    if (typeof method_name !== "string") return;

    if (ctx.reply_data.type === "add") await method_service.add_method_name(method_name);
    else await method_service.del_method_name(method_name);

    const methods = await method_service.get_method_names();

    const now = Math.ceil(Date.now() / 1000);
    const methods_modify_menu = MethodsModifyUI.main_menu(methods);
    const messages_update = await live_message_service.get_ids(app.user_id, "methods_menu");
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
