import type { Middleware, NonVoid } from "../core/telegram.composer";
import type { ContextMiddleware, MessageBase } from "../core/telegram.types";
import type { ReplyDatabaseApadter } from "../databases/reply.database";

export type ReplyContext<Type extends Record<string, unknown>> = Omit<ContextMiddleware, "update"> & {
  update: {
    update_id: number;
    message: Omit<NonVoid<ContextMiddleware["update"]["message"]>, "reply_to_message"> & { reply_to_message: MessageBase };
    reply_data: Type;
  };
};

export function reply_middleware<Type extends ContextMiddleware, ReplyData extends Record<string, unknown>>(
  reply_adapter: ReplyDatabaseApadter
): Middleware<Type, ReplyContext<ReplyData>> {
  return async (ctx) => {
    if (typeof ctx.update.message !== "object") return;
    if (Array.isArray(ctx.update.message.entities)) {
      const has_bot = ctx.update.message.entities.some((e) => e.type === "bot_command");
      if (has_bot) return;
    }
    if (typeof ctx.update.message.reply_to_message !== "object") return;
    const data = await reply_adapter.get<ReplyData>(ctx.update.message.reply_to_message.message_id);
    if (typeof data !== "object" || data === null) return;
    await reply_adapter.delete(ctx.update.message.reply_to_message.message_id);
    return { reply_data: data } as unknown as ReplyContext<ReplyData>;
  };
}
