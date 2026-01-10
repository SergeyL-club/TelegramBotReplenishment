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
  live_message_service: LiveMessageService
): ReturnType<Composer<Type & CallbackContext>["handler"]> {
  const composer = new Composer<Type>();

  return composer.use(callback_middleware("methods_modify")).handler(async (ctx) => {
    await ctx.answerCbQuery();
    const app = get_app_context(ctx);
    if (!app) return;

    const messages = await live_message_service.get_messages("replys", "methods_modify_reply");
    for (const { message_id } of messages) await ctx.deleteMessage(message_id);
    await live_message_service.clear("replys", "methods_modify_reply");

    const { method_str: type } = get_callback_data<{ type_str: string; method_str: string }>(ctx, ["type_str", "method_str"]) ?? {};
    if (typeof type !== "string") return;

    const reply = MethodsModifyUI.reply_method_modify();
    const is = await ctx.reply(reply.text, reply.extra);

    const expired = Math.ceil(Date.now() / 1000) + 1 * 60;
    await live_message_service.registration(
      "replys",
      "methods_modify_reply",
      { chat_id: is.chat.id, message_id: is.message_id },
      {
        type,
        message_id: is.message_id,
        client_id: ctx.update.callback_query.message.message_id,
        expired_at: expired,
      }
    );
  });
}

export function admin_methods_modify_reply<Type extends DefaultContext>(
  live_message_service: LiveMessageService,
  method_service: MethodService
): ReturnType<Composer<Type & ReplyContext<{ type: string; client_id: number; expired_at: number }>>["handler"]> {
  const composer = new Composer<Type>();

  return composer
    .use(reply_middleware<Type, { type: string; client_id: number; expired_at: number }>("methods_modify_reply", live_message_service))
    .handler(async (ctx) => {
      const app = get_app_context(ctx);
      if (!app) return;

      await clear_reply(ctx);
      await live_message_service.clear("replys", "methods_modify_reply");

      const { text: method_name } = get_text(ctx) ?? {};
      if (typeof method_name !== "string") return;

      if (ctx.reply_data.type === "add") await method_service.add_method_name(method_name);
      else await method_service.del_method_name(method_name);

      const methods = await method_service.get_method_names();

      const now = Math.ceil(Date.now() / 1000);
      const methods_modify_menu = MethodsModifyUI.main_menu(methods);
      const messages_update = await live_message_service.get_messages("edited", "methods_menu");
      if (!messages_update.find((el) => el.message_id === ctx.reply_data.client_id))
        messages_update.push({
          message_id: ctx.reply_data.client_id,
          chat_id: ctx.update.message.chat.id,
          expired_at: now + 1,
        });
      for (const { message_id, chat_id, expired_at } of messages_update)
        if (now < expired_at) {
          await ctx.telegram
            .editMessageText(chat_id, message_id, undefined, methods_modify_menu.text, {
              reply_markup: { inline_keyboard: (methods_modify_menu.extra!.reply_markup as InlineKeyboardMarkup).inline_keyboard },
            })
            .catch((e) => {
              if (typeof e === "object" && e !== null)
                if ("description" in e && typeof e.description === "string" && e.description.includes("message is not modified")) return;
              throw e;
            });
          if (expired_at !== now + 1)
            await live_message_service.registration(
              "edited",
              "methods_menu",
              { chat_id, message_id },
              { old_text: methods_modify_menu.text, expired_at }
            );
        }
    });
}
