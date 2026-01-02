import type { Middleware, NonVoid } from "../core/telegram.composer";
import type { ContextMiddleware } from "../core/telegram.types";

export type CommandContext = Omit<ContextMiddleware, "update"> & {
  update: {
    update_id: number;
    message: Omit<NonVoid<ContextMiddleware["update"]["message"]>, "reply_to_message" | "entities"> & {
      entities: { offset: number; length: number; type: string }[];
    };
  };
};

export function command_middleware<Type extends ContextMiddleware>(command_text: string): Middleware<Type, CommandContext> {
  return (ctx) => {
    if (typeof ctx.update.message !== "object") return;
    if (!Array.isArray(ctx.update.message.entities)) return;
    const has_bot = ctx.update.message.entities.some((e) => e.type === "bot_command");
    if (!has_bot) return;
    if (!ctx.update.message.text.startsWith(command_text)) return;
    return {} as CommandContext;
  };
}
