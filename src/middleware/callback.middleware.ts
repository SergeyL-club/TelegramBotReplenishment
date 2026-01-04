import type { Middleware, NonVoid } from "../core/telegram.composer";
import type { ContextMiddleware } from "../core/telegram.types";

export type CallbackContext = Omit<ContextMiddleware, "update"> & {
  update: {
    update_id: number;
    callback_query: NonVoid<ContextMiddleware["update"]["callback_query"]>;
  };
};

export function callback_middleware<Type extends ContextMiddleware>(callback_text: string): Middleware<Type, CallbackContext> {
  return (ctx) => {
    if (typeof ctx.update.callback_query !== "object") return;
    if (typeof ctx.update.callback_query.data !== "string") return;
    if (!ctx.update.callback_query.data.startsWith(callback_text)) return;
    return {} as CallbackContext;
  };
}
