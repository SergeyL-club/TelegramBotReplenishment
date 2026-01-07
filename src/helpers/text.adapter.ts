import type { DefaultContext } from "../core/telegram.types";

export interface TextContext {
  text: string;
}

export function get_text(ctx: DefaultContext): TextContext | null {
  const text =
    ctx.update.callback_query?.message.text ??
    ctx.update.message?.text ??
    (ctx.message && "text" in ctx.message ? ctx.message.text : undefined);

  if (typeof text !== "string") return null;

  return { text: text.trim() };
}
