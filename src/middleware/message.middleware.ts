import type { Middleware, NonVoid } from "../core/telegram.composer";
import type { ContextMiddleware } from "../core/telegram.types";

export type MessageContext = Omit<ContextMiddleware, "update"> & {
  update: {
    update_id: number;
    message: NonVoid<ContextMiddleware["update"]["message"]>;
  };
};

export function message_middleware<Type extends ContextMiddleware>(): Middleware<Type, MessageContext> {
  return (ctx) => {
    if (typeof ctx.update.message !== "object") return;
    if (Array.isArray(ctx.update.message.entities)) {
      const has_bot = ctx.update.message.entities.some((e) => e.type === "bot_command");
      if (has_bot) return;
    }
    if (typeof ctx.update.message.reply_to_message === "object") return;
    return {} as MessageContext;
  };
}
