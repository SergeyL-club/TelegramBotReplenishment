import type { DefaultContext } from "../core/telegram.types";
import type { LiveMessageService } from "../services/live_message.service";
import type { DealService } from "../services/deal.service";
import type { UserService } from "../services/user.service";
import type { ExtraEditMessageText } from "telegraf/typings/telegram-types";
import { callback_middleware, type CallbackContext } from "../middleware/callback.middleware";
import { reply_middleware, type ReplyContext } from "../middleware/reply.middleware";
import { Composer } from "../core/telegram.composer";
import { get_app_context } from "../helpers/app_context.adapter";
import { get_callback_data } from "../helpers/callback_data.adapter";
import { DealClientUI } from "../ui/deal_client.ui";
import { clear_reply } from "../helpers/clear_reply.helper";
import { get_text } from "../helpers/text.adapter";
import { DealAdminUI } from "../ui/deal_admin.ut";

export function deal_amount_callback<Type extends DefaultContext>(
  live_message_service: LiveMessageService
): ReturnType<Composer<Type & CallbackContext>["handler"]> {
  const composer = new Composer<Type>();

  return composer.use(callback_middleware("add_amount")).handler(async (ctx) => {
    await ctx.answerCbQuery();
    const app = get_app_context(ctx);
    if (!app) return;

    const messages = await live_message_service.get_messages("replys", "deal_amount_reply");
    for (const { message_id } of messages) await ctx.deleteMessage(message_id);
    await live_message_service.clear("replys", "deal_amount_reply");

    const { deal_id_str } = get_callback_data<{ type: string; deal_id_str: string }>(ctx, ["type", "deal_id_str"]) ?? {};
    if (typeof deal_id_str !== "string") return;
    const deal_id = Number(deal_id_str);

    const reply = DealClientUI.reply_amount_callback();
    const is = await ctx.reply(reply.text, reply.extra);

    const expired = Math.ceil(Date.now() / 1000) + 1 * 60;
    await live_message_service.registration(
      "replys",
      "deal_amount_reply",
      { chat_id: is.chat.id, message_id: is.message_id },
      {
        deal_id,
        client_id: ctx.update.callback_query.message.message_id,
        message_id: is.message_id,
        expired_at: expired,
      }
    );
  });
}

export function deal_amount_reply<Type extends DefaultContext>(
  deal_service: DealService,
  user_service: UserService,
  live_message_service: LiveMessageService
): ReturnType<Composer<Type & ReplyContext<{ deal_id: number; client_id: number }>>["handler"]> {
  const composer = new Composer<Type>();

  return composer
    .use(reply_middleware<Type, { deal_id: number; client_id: number }>("deal_amount_reply", live_message_service))
    .handler(async (ctx) => {
      const app = get_app_context(ctx);
      if (!app) return;

      await clear_reply(ctx);
      await live_message_service.clear("replys", "deal_amount_reply");

      const { text: amount_str } = get_text(ctx) ?? {};
      if (typeof amount_str !== "string") return;
      const amount = Number(amount_str);
      if (Number.isNaN(amount) || amount <= 0) {
        await ctx.reply(DealClientUI.reply_amount_error(amount, amount_str).text);
        return;
      }

      await deal_service.registration_amount(ctx.reply_data.deal_id, amount);
      const deal = await deal_service.get_deal(ctx.reply_data.deal_id);

      const now = Math.ceil(Date.now() / 1000);
      const client_info = DealClientUI.add_pre_deal_info(deal!);
      const admin_info = await DealAdminUI.deal_info(deal!, user_service);

      const messages_update = await live_message_service.get_messages<{ type: "client_info" | "admin_info" }>(
        "edited",
        `deal_info:${ctx.reply_data.deal_id}`
      );
      if (!messages_update.find((el) => el.message_id === ctx.reply_data.client_id))
        messages_update.push({
          type: "client_info",
          message_id: ctx.reply_data.client_id,
          chat_id: ctx.update.message.chat.id,
          expired_at: now + 1,
        });
      for (const { message_id, chat_id, expired_at, type } of messages_update)
        if (now < expired_at) {
          await ctx.telegram
            .editMessageText(
              chat_id,
              message_id,
              undefined,
              type === "client_info" ? client_info.text : admin_info.text,
              (type === "client_info" ? client_info.extra : admin_info.extra) as ExtraEditMessageText
            )
            .catch((e) => {
              if (typeof e === "object" && e !== null)
                if ("description" in e && typeof e.description === "string" && e.description.includes("message is not modified")) return;
              throw e;
            });
          if (expired_at !== now + 1)
            await live_message_service.registration(
              "edited",
              `deal_info:${ctx.reply_data.deal_id}`,
              { chat_id, message_id },
              { old_text: type === "client_info" ? client_info.text : admin_info.text, expired_at }
            );
        }
    });
}
