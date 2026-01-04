import type { DefaultContext } from "../core/telegram.types";
import type { UserContextAdapter } from "../databases/user.context";
import type { ReplyDatabaseApadter } from "../databases/reply.database";
import type { DealDatabaseAdapter } from "../databases/deal.database";
import { menu_middleware, type MenuContext } from "../middleware/menu.middleware";
import { UserService } from "../services/user.service";
import { Composer } from "../core/telegram.composer";
import { callback_middleware, CallbackContext } from "../middleware/callback.middleware";
import { reply_middleware, ReplyContext } from "../middleware/reply.middleware";

export class DealController {
  static methods_menu<Type extends DefaultContext>(
    user_context: UserContextAdapter,
    deal_database: DealDatabaseAdapter
  ): ReturnType<Composer<Type & MenuContext>["handler"]> {
    const composer = new Composer<Type>();
    return composer.use(menu_middleware("Методы оплаты")).handler(async (ctx) => {
      const methods = await deal_database.get_methods();
      const is = await ctx.reply(`Методы оплаты: ${methods.length <= 0 ? "пусто" : methods.join(", ")}`, {
        reply_markup: {
          inline_keyboard: [
            [
              { text: "Добавить", callback_data: "method_menu:add" },
              { text: "Удалить", callback_data: "method_menu:delete" },
            ],
          ],
        },
      });
      await UserService.save_update_message(user_context, "method_menu", [{ id: is.message_id, date: is.date + 1 * 60 }], ctx);
    });
  }

  static methods_menu_callback<Type extends DefaultContext>(
    user_context: UserContextAdapter,
    reply_database: ReplyDatabaseApadter
  ): ReturnType<Composer<Type & CallbackContext>["handler"]> {
    const composer = new Composer<Type>();
    return composer.use(callback_middleware("method_menu")).handler(async (ctx) => {
      await ctx.answerCbQuery();
      const type = ctx.update.callback_query.data.split(":").slice(1)[0];
      if (typeof type === "undefined") return;
      const messages = await UserService.get_update_message<number[]>(user_context, "method_menu_reply", ctx);
      if (Array.isArray(messages) && messages.length > 0) {
        for (const message_id of messages) {
          await reply_database.delete(message_id);
          await ctx.deleteMessage(message_id).catch((e) => {
            if (typeof e === "object" && e !== null)
              if ("description" in e && typeof e.description === "string" && e.description.includes("message to delete not found")) return;
            throw e;
          });
        }
        await UserService.save_update_message(user_context, "method_menu_reply", undefined, ctx);
      }
      const is = await ctx.reply("Напишите название метода", { reply_markup: { force_reply: true } });
      await reply_database.add(is.message_id, { type, message_id: ctx.update.callback_query.message.message_id });
      await UserService.save_update_message(user_context, "method_menu_reply", [is.message_id], ctx);
    });
  }

  static methods_menu_reply<Type extends DefaultContext>(
    user_context: UserContextAdapter,
    deal_database: DealDatabaseAdapter,
    reply_database: ReplyDatabaseApadter
  ): ReturnType<Composer<Type & ReplyContext<{ type: string; message_id: number }>>["handler"]> {
    const composer = new Composer<Type>();
    return composer.use(reply_middleware<Type, { type: string; message_id: number }>(reply_database)).handler(async (ctx) => {
      const text = ctx.update.message.text.trim();
      await ctx.deleteMessage(ctx.update.message.message_id);
      await ctx.deleteMessage(ctx.update.message.reply_to_message.message_id);
      if (ctx.reply_data.type === "add") await deal_database.add_method(text);
      else await deal_database.delete_method(text);
      const messages: { id: number; date: number }[] | null = await UserService.get_update_message<{ id: number; date: number }[]>(
        user_context,
        "method_menu",
        ctx
      );
      if (messages === null) return;
      const chat_id = ctx.update.callback_query
        ? ctx.update.callback_query.message.chat.id
        : ctx.update.message
          ? ctx.update.message.chat.id
          : ctx.chat?.id;
      if (typeof chat_id === "undefined") return;
      const current_id = ctx.reply_data.message_id;
      const now = Math.floor(Date.now() / 1000);
      const deleted: { id: number; date: number }[] = [];
      const methods = await deal_database.get_methods();
      for (const { id, date } of messages) {
        if (id !== current_id && date < now) {
          deleted.push({ id, date });
          continue;
        }
        await ctx.telegram
          .editMessageText(chat_id, id, undefined, `Методы оплаты: ${methods.length <= 0 ? "пусто" : methods.join(", ")}`, {
            reply_markup: {
              inline_keyboard: [
                [
                  { text: "Добавить", callback_data: "method_menu:add" },
                  { text: "Удалить", callback_data: "method_menu:delete" },
                ],
              ],
            },
          })
          .catch((e) => {
            if (typeof e === "object" && e !== null)
              if ("description" in e && typeof e.description === "string" && e.description.includes("message is not modified")) return;
            throw e;
          });
      }
      if (deleted.length > 0) {
        await UserService.save_update_message(user_context, "method_menu", undefined, ctx);
        const deletedIds = new Set(deleted.map(({ id }) => id));
        await UserService.save_update_message(
          user_context,
          "method_menu",
          messages.filter(({ id }) => !deletedIds.has(id)),
          ctx
        );
      }
    });
  }
}
