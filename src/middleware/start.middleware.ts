import type { Message } from "telegraf/typings/core/types/typegram";
import type { Middleware } from "../core/telegram.composer";
import { message_middleware, text_message_middleware } from "./message.middleware";

type HasStart = {
  message?: unknown;
};

export type StartContext = {
  message: Message.TextMessage & { text: "/start" };
};

export function start_middleware<Type extends HasStart>(): Middleware<Type, StartContext> {
  return async (ctx) => {
    const msgCtx = await message_middleware<Type>()(ctx);
    if (!msgCtx || typeof msgCtx !== "object") return;

    const textCtx = await text_message_middleware<typeof msgCtx>()(msgCtx);
    if (!textCtx || typeof textCtx !== "object") return;
    if (textCtx.message.text !== "/start") return;

    return { message: textCtx.message as NonNullable<StartContext["message"]> };
  };
}
