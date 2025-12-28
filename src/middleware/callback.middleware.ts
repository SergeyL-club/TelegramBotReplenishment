import type { CallbackQuery } from "telegraf/typings/core/types/typegram";
import type { Middleware, NonVoid } from "../core/telegram.composer";

type HasCallback = {
  callbackQuery?: unknown;
};

type CallbackContext = {
  callbackQuery: CallbackQuery;
};

type DataCallbackContext = {
  callbackQuery: CallbackQuery.DataQuery;
};

type MessageCallbackContext = {
  callbackQuery: { message: NonVoid<CallbackQuery["message"]> };
};

export function callback_middleware<Type extends HasCallback>(): Middleware<Type, CallbackContext> {
  return (ctx) => {
    if (!ctx.callbackQuery || typeof ctx.callbackQuery !== "object") return;
    return { callbackQuery: ctx.callbackQuery as CallbackContext["callbackQuery"] };
  };
}

export function data_callback_middleware<Type extends CallbackContext>(): Middleware<Type, DataCallbackContext> {
  return (ctx) => {
    if (!("data" in ctx.callbackQuery)) return;
    return { callbackQuery: ctx.callbackQuery as DataCallbackContext["callbackQuery"] };
  };
}

export function message_callback_middleware<Type extends CallbackContext>(): Middleware<Type, MessageCallbackContext> {
  return (ctx) => {
    if (!ctx.callbackQuery.message || typeof ctx.callbackQuery.message !== "object") return;
    return { callbackQuery: ctx.callbackQuery as MessageCallbackContext["callbackQuery"] };
  };
}
