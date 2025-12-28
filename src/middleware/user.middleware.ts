import type { Middleware } from "../core/telegram.composer";

export type HasUser = {
  from?: unknown;
  chat?: unknown;
};

export type UserContext = {
  user: { id: number; chat_id: number; username: string };
};

export function user_middleware<Type extends HasUser>(): Middleware<Type, UserContext> {
  return (ctx) => {
    if (!ctx.from || typeof ctx.from !== "object") return;
    if (!ctx.chat || typeof ctx.chat !== "object") return;
    if (!("id" in ctx.from) || typeof ctx.from.id !== "number") return;
    if (!("id" in ctx.chat) || typeof ctx.chat.id !== "number") return;
    if (!("username" in ctx.from) || typeof ctx.from.username !== "string") return;

    return { user: { id: ctx.from.id, chat_id: ctx.chat.id, username: ctx.from.username } };
  };
}
