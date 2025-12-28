import type { Message } from "telegraf/typings/core/types/typegram";
import type { Middleware } from "../core/telegram.composer";

type HasMessage = {
  message?: unknown;
};

type MessageContext = {
  message: Message;
};

type TextMessageContext = {
  message: Message.TextMessage;
};

export function message_middleware<Type extends HasMessage>(): Middleware<Type, MessageContext> {
  return (ctx) => {
    if (!ctx.message || typeof ctx.message !== "object") return;
    return { message: ctx.message as MessageContext["message"] };
  };
}

export function text_message_middleware<Type extends MessageContext>(): Middleware<Type, TextMessageContext> {
  return (ctx) => {
    if (!("text" in ctx.message)) return;
    return { message: ctx.message as TextMessageContext["message"] };
  };
}
