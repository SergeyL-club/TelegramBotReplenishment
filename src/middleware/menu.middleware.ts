import type { Middleware, NonVoid } from "../core/telegram.composer";
import type { ContextMiddleware } from "../core/telegram.types";

export type MenuContext = Omit<ContextMiddleware, "update"> & {
  update: {
    update_id: number;
    message: Omit<NonVoid<ContextMiddleware["update"]["message"]>, "reply_to_message">;
  };
};

export function menu_middleware<Type extends ContextMiddleware>(menu_text: string): Middleware<Type, MenuContext> {
  return (ctx) => {
    if (typeof ctx.update.message !== "object") return;
    if (Array.isArray(ctx.update.message.entities)) {
      const has_bot = ctx.update.message.entities.some((e) => e.type === "bot_command");
      if (has_bot) return;
    }
    if (typeof ctx.update.message.reply_to_message === "object") return;
    if (!ctx.update.message.text.startsWith(menu_text)) return;
    return {} as MenuContext;
  };
}
