import type { CallbackQuery } from "telegraf/typings/core/types/typegram";
import type { Middleware, NonVoid } from "../core/telegram.composer";

type HasCallback = {
  callbackQuery?: unknown;
};

export type CallbackContext = {
  callbackQuery: CallbackQuery;
};

export type DataCallbackContext = {
  callbackQuery: CallbackQuery.DataQuery;
};

export type MessageCallbackContext = {
  callbackQuery: { message: NonVoid<CallbackQuery["message"]> };
};

export function callback_middleware<Type extends HasCallback>(): Middleware<Type, CallbackContext> {
  return (ctx) => {
    if (!ctx.callbackQuery || typeof ctx.callbackQuery !== "object") return;
    return { callbackQuery: ctx.callbackQuery as CallbackContext["callbackQuery"] };
  };
}

export function data_callback_middleware<Type extends CallbackContext>(start_with?: string): Middleware<Type, DataCallbackContext> {
  return (ctx) => {
    if (!("data" in ctx.callbackQuery)) return;
    if (start_with && !ctx.callbackQuery.data.startsWith(start_with)) return;
    return { callbackQuery: ctx.callbackQuery as DataCallbackContext["callbackQuery"] };
  };
}

export function message_callback_middleware<Type extends CallbackContext>(): Middleware<Type, MessageCallbackContext> {
  return (ctx) => {
    if (!ctx.callbackQuery.message || typeof ctx.callbackQuery.message !== "object") return;
    return { callbackQuery: ctx.callbackQuery as MessageCallbackContext["callbackQuery"] };
  };
}
