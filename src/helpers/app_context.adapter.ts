import type { DefaultContext } from "../core/telegram.types";

export interface AppContext {
  user_id: number;
  chat_id: number;
  username: string | undefined;
}

export function get_app_context(ctx: DefaultContext): AppContext | null {
  const from = ctx.update.callback_query?.from ?? ctx.update.message?.from ?? ctx.from;

  const chat = ctx.update.callback_query?.message.chat ?? ctx.update.message?.chat ?? ctx.chat;

  if (!from || !chat) return null;

  return {
    user_id: from.id,
    chat_id: chat.id,
    username: from.username,
  };
}
