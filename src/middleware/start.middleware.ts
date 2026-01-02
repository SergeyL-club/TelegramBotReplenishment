import type { Middleware, NonVoid } from "../core/telegram.composer";
import type { ContextMiddleware } from "../core/telegram.types";

export type StartContext = Omit<ContextMiddleware, "update"> & {
  update: {
    message: Omit<NonVoid<ContextMiddleware["update"]["message"]>, "text"> & { text: "/start" };
  };
};

export function start_middleware<Type extends ContextMiddleware>(): Middleware<Type, StartContext> {
  return (ctx) => {
    if (typeof ctx.update.message !== "object") return;
    console.log(ctx.update.message.entities);
    const has_bot = ctx.update.message.entities.some((e) => e.type === "bot_command" && e.offset === 0);
    if (!has_bot || !ctx.update.message.text.startsWith("/start")) return;
    return {} as StartContext;
  };
}
