import { Telegraf, type Context } from "telegraf";
import type { Redis } from "ioredis";
import type { CallbackQuery, Message, MessageEntity } from "telegraf/typings/core/types/typegram";
import type { Logger } from "./logger";
import { default_logger } from "./logger";
import { MessageBind, MessageManager } from "./message_controller";

type UpdateType = "message" | "callback_query" | "reply" | "command";
type MathFunction = (...args: unknown[]) => Promise<boolean> | boolean;
type StartHandler = (ctx: Context) => Promise<void> | void;

export type TextMessage = Message.TextMessage;
export type PhotoMessage = Message.PhotoMessage;

export type MessageBase = Message.TextMessage | Message.PhotoMessage;
export type MessageCommand = MessageBase & { entities: MessageEntity[] };
export type MessageReply = MessageBase & { reply_to_message: MessageBase };
export type MessageCallback = CallbackQuery.DataQuery;

interface RouteParams {
  kid: UpdateType;
  math?: MathFunction;
}

interface CallbackParams {
  message_manager: MessageManager;
}

type RouteCallback = (...args: unknown[]) => Promise<void> | void;

export class TelegramController {
  private bot: Telegraf<Context>;
  private routes: { params: RouteParams; callback: RouteCallback }[] = [];
  private starts: StartHandler[] = [];

  private message_manager: MessageManager;
  private logger: Logger;

  public constructor(bot_token: string, db_api: Redis, options?: { db_name?: string; logger?: Logger }) {
    this.logger = options?.logger ?? default_logger;
    this.bot = new Telegraf<Context>(bot_token);
    this.message_manager = new MessageManager(db_api, this.timeout_callback.bind(this), options?.db_name);
  }

  private async timeout_callback(message: MessageBind): Promise<void> {
    if (message.edit === undefined) {
      await this.bot.telegram.deleteMessage(message.chat_id, message.message_id);
      return;
    }
    await this.bot.telegram.editMessageText(
      message.chat_id,
      message.message_id,
      undefined,
      "[Истек] " + message.edit.text,
      message.edit.extra
    );
  }

  private is_text_message(msg: Message | undefined): msg is Message.TextMessage {
    return msg !== undefined && "text" in msg;
  }

  private is_photo_message(msg: Message | undefined): msg is Message.PhotoMessage {
    return msg !== undefined && "photo" in msg;
  }

  private is_reply_message(msg: Message | undefined): msg is MessageReply {
    return msg !== undefined && "reply_to_message" in msg;
  }

  private is_callback_query(callback: CallbackQuery | undefined): callback is MessageCallback {
    return callback !== undefined && "data" in callback;
  }

  private is_command_message(msg: Message | undefined): msg is MessageCommand {
    return msg !== undefined && "entities" in msg && msg.entities.some((el) => el.type === "bot_command" && el.offset === 0);
  }

  public start_handler(): void {
    this.bot.start(async (ctx) => {
      await this.logger.log(`User ${ctx.from.username} (${ctx.from.id}) started working with the bot`);
      try {
        for (const callback of this.starts) {
          await callback(ctx);
        }
      } catch (error: unknown) {
        await this.logger.error("Start Error: ", error);
      }
    });
  }

  public message_handler(): void {
    this.bot.on("message", async (ctx) => {
      await this.logger.log("Message: ", {
        message: ctx.message,
        from: ctx.from,
        chat: ctx.chat,
        reply: "reply_to_message" in ctx.message ? ctx.message.reply_to_message : undefined,
      });
      if (ctx.message === undefined) return;

      try {
        for (const { params, callback } of this.routes) {
          if (params.kid === "message" && (this.is_text_message(ctx.message) || this.is_photo_message(ctx.message))) {
            if (params.math !== undefined && !(await params.math(ctx, ctx.message))) continue;
            await callback(ctx, ctx.message, { message_manager: this.message_manager });
          } else if (params.kid === "command" && this.is_command_message(ctx.message)) {
            if (params.math !== undefined && !(await params.math(ctx, ctx.message))) continue;
            await callback(ctx, ctx.message, { message_manager: this.message_manager });
          } else if (params.kid === "reply" && this.is_reply_message(ctx.message)) {
            const reply_msg = ctx.message.reply_to_message;
            const message_bind = await this.message_manager.get(reply_msg.message_id);
            if (message_bind === null) continue;
            if (params.math !== undefined && !(await params.math(ctx, ctx.message, message_bind))) continue;
            await ctx.deleteMessage(message_bind.message_id);
            await ctx.deleteMessage(ctx.message.message_id);
            await this.message_manager.delete(message_bind.message_id);
            await callback(ctx, ctx.message, { message_manager: this.message_manager, message_bind: message_bind });
          }
        }
      } catch (error: unknown) {
        await this.logger.error("Message Error: ", error);
      }
    });
  }

  public callback_handler(): void {
    this.bot.on("callback_query", async (ctx) => {
      await this.logger.log("Callback Query: ", { message: ctx.message, from: ctx.from, chat: ctx.chat, callback_qery: ctx.callbackQuery });
      if (ctx.callbackQuery === undefined) return;

      try {
        for (const { params, callback } of this.routes) {
          if (params.kid !== "callback_query") continue;
          if (!this.is_callback_query(ctx.callbackQuery)) continue;
          if (params.math !== undefined && !(await params.math(ctx, ctx.callbackQuery))) continue;
          await callback(ctx, ctx.callbackQuery, { message_manager: this.message_manager });
        }
      } catch (error: unknown) {
        await this.logger.error("Callback Error: ", { error });
      }
    });
  }

  public get_bot(): Telegraf<Context> {
    return this.bot;
  }

  public start_timeout_delete_binds(): void {
    this.message_manager.start_timeout_delete_binds();
  }

  public stop_timeout_delete_binds(): void {
    this.message_manager.stop_timeout_delete_binds();
  }

  public async start(): Promise<void> {
    await this.bot.launch(() => {
      this.logger.info("Telegram Bot launched").catch(Error);
    });
  }

  public async stop(reason: string = "SIGINT"): Promise<void> {
    this.bot.stop(reason);
    await this.logger.info(`Telegram Bot stopped due to ${reason}`);
  }

  public use(
    params: {
      kid: "message";
      math?: (ctx: Context, msg: MessageBase) => boolean | Promise<boolean>;
    },
    callback: (ctx: Context, msg: MessageBase, options: CallbackParams) => void | Promise<void>
  ): void;
  public use(
    params: {
      kid: "command";
      math?: (ctx: Context, msg: MessageCommand) => boolean | Promise<boolean>;
    },
    callback: (ctx: Context, msg: MessageCommand, options: CallbackParams) => void | Promise<void>
  ): void;
  public use(
    params: { kid: "reply"; math?: (ctx: Context, msg: MessageReply, message_bind: MessageBind) => boolean | Promise<boolean> },
    callback: (ctx: Context, msg: MessageReply, options: CallbackParams & { message_bind: MessageBind }) => void | Promise<void>
  ): void;
  public use(
    params: {
      kid: "callback_query";
      math?: (ctx: Context, msg: MessageCallback) => boolean | Promise<boolean>;
    },
    callback: (ctx: Context, msg: MessageCallback, options: CallbackParams) => void | Promise<void>
  ): void;
  public use(
    params: {
      kid: "start";
    },
    callback: (ctx: Context) => void | Promise<void>
  ): void;
  public use(params: unknown, callback: unknown): void {
    if ((params as { kid: string }).kid === "start") this.starts.push(callback as RouteCallback);
    else this.routes.push({ params: params as RouteParams, callback: callback as RouteCallback });
  }
}
