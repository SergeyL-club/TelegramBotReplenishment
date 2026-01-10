import type { Middleware, NonVoid } from "../core/telegram.composer";
import type { ContextMiddleware, MessageBase } from "../core/telegram.types";
import { LiveMessageService } from "../services/live_message.service";

export type ReplyContext<Type extends Record<string, unknown>> = Omit<ContextMiddleware, "update"> & {
  update: {
    update_id: number;
    message: Omit<NonVoid<ContextMiddleware["update"]["message"]>, "reply_to_message"> & { reply_to_message: MessageBase };
  };
  reply_data: Type;
};

export function reply_middleware<Type extends ContextMiddleware, ReplyData extends Record<string, unknown>>(
  method_name: string,
  live_message_service: LiveMessageService
): Middleware<Type, ReplyContext<ReplyData>> {
  return async (ctx) => {
    if (typeof ctx.update.message !== "object") return;
    if (Array.isArray(ctx.update.message.entities)) {
      const has_bot = ctx.update.message.entities.some((e) => e.type === "bot_command");
      if (has_bot) return;
    }
    if (typeof ctx.update.message.reply_to_message !== "object") return;
    const datas = await live_message_service.get_messages("replys", method_name);
    for (const data of datas) {
      if (data.message_id !== ctx.update.message.message_id) return { reply_data: data } as unknown as ReplyContext<ReplyData>;
    }
  };
}
