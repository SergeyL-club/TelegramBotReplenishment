import type { Context, Telegraf } from "telegraf";
import type { Message, CallbackQuery } from "telegraf/typings/core/types/typegram";

export type telegram_payload =
  | { type: "start"; message: Message.TextMessage | Message.CaptionableMessage; ctx: Context }
  | { type: "message"; message: Message.TextMessage | Message.CaptionableMessage; ctx: Context }
  | { type: "callback_query"; callback: CallbackQuery.DataQuery; ctx: Context }
  | { type: "reply_message"; message: Message.TextMessage | Message.CaptionableMessage; reply_to: Message; ctx: Context }
  | { type: "command"; message: Message.TextMessage | Message.CaptionableMessage; ctx: Context };

type telegram_adapter_callback = (payload: telegram_payload) => void | Promise<void>;

export class TelegramAdapter {
  private message_handlers: telegram_adapter_callback[] = [];
  private callback_handlers: telegram_adapter_callback[] = [];
  private reply_handlers: telegram_adapter_callback[] = [];
  private command_handlers: telegram_adapter_callback[] = [];
  private start_handlers: telegram_adapter_callback[] = [];

  public init(telegraf: Telegraf) {
    telegraf.start(this.handle_start.bind(this));
    telegraf.on("callback_query", this.handle_update.bind(this));
    telegraf.on("message", this.handle_update.bind(this));
  }

  public on_start(callback: telegram_adapter_callback): void {
    this.start_handlers.push(callback);
  }

  public on_message(callback: telegram_adapter_callback): void {
    this.message_handlers.push(callback);
  }

  public on_callback(callback: telegram_adapter_callback): void {
    this.callback_handlers.push(callback);
  }

  public on_reply(callback: telegram_adapter_callback): void {
    this.reply_handlers.push(callback);
  }

  public on_command(callback: telegram_adapter_callback): void {
    this.command_handlers.push(callback);
  }

  public async handle_start(ctx: Context): Promise<void> {
    if (!ctx.message || (!("text" in ctx.message) && !("caption" in ctx.message))) return;
    for (const handler of this.start_handlers) {
      await handler({ type: "start", ctx, message: ctx.message });
    }
  }

  public async handle_update(ctx: Context): Promise<void> {
    if (ctx.callbackQuery && "data" in ctx.callbackQuery) {
      const payload: telegram_payload = { type: "callback_query", callback: ctx.callbackQuery, ctx };
      for (const handler of this.callback_handlers) await handler(payload);
      return;
    }

    if (!ctx.message || (!("text" in ctx.message) && !("caption" in ctx.message))) return;

    const msg: Message.TextMessage | Message.CaptionableMessage = ctx.message;

    if ("reply_to_message" in msg && msg.reply_to_message) {
      const payload: telegram_payload = { type: "reply_message", message: msg, reply_to: msg.reply_to_message, ctx };
      for (const handler of this.reply_handlers) await handler(payload);
      return;
    }

    if ("entities" in msg && Array.isArray(msg.entities)) {
      const has_command: boolean = msg.entities.some((e) => e.type === "bot_command" && e.offset === 0);
      if (has_command) {
        const payload: telegram_payload = { type: "command", message: msg, ctx };
        for (const handler of this.command_handlers) await handler(payload);
        return;
      }
    }

    const payload: telegram_payload = { type: "message", message: msg, ctx };
    for (const handler of this.message_handlers) await handler(payload);
  }
}
