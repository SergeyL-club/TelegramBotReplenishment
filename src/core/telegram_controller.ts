import { Telegraf, type Context } from "telegraf";
import type { Redis } from "ioredis";
import type { CallbackQuery, Message, MessageEntity } from "telegraf/typings/core/types/typegram";
import type { Logger } from "./logger";
import { default_logger } from "./logger";
import { Timer } from "./timer";

type UpdateType = "message" | "callback_query" | "reply" | "command";
type MathFunction = (...args: unknown[]) => Promise<boolean> | boolean;
type StartHandler = (ctx: Context) => Promise<void> | void;

export type TextMessage = Message.TextMessage;
export type PhotoMessage = Message.PhotoMessage;

export type MessageBase = Message.TextMessage | Message.PhotoMessage;
export type MessageCommand = MessageBase & { entities: MessageEntity[] };
export type MessageReply = MessageBase & { reply_to_message: MessageBase };
export type MessageCallback = CallbackQuery.DataQuery;

type BindData = [
  command_name: string,
  chat_id: number,
  old_message: { message_id: number; chat_id: number; text: string },
  delete_at: number,
];

interface RouteParams {
  kid: UpdateType;
  math?: MathFunction;
}

interface CallbackParams {
  bind: TelegramController["bind"];
}

type RouteCallback = (...args: unknown[]) => Promise<void> | void;

export class TelegramController {
  private bot: Telegraf<Context>;
  private routes: { params: RouteParams; callback: RouteCallback }[] = [];
  private starts: StartHandler[] = [];

  private timer: Timer;
  private logger: Logger;

  private message_replys: string;
  private message_reply_data: string;

  public constructor(
    bot_token: string,
    private db_api: Redis,
    options?: { db_name?: string; logger?: Logger }
  ) {
    this.logger = options?.logger ?? default_logger;
    this.bot = new Telegraf<Context>(bot_token);
    this.timer = new Timer(this.timeout_delete_binds.bind(this), 1000);
    this.message_replys = `${options?.db_name ?? "tg_trader"}:message:replys`;
    this.message_reply_data = `${options?.db_name ?? "tg_trader"}:message:replys:data`;
  }

  public start_timeout_delete_binds(): void {
    this.timer.start();
  }

  public stop_timeout_delete_binds(): void {
    this.timer.stop();
  }

  private async timeout_delete_binds(): Promise<void> {
    const bind_ids = await this.binds();
    if (bind_ids === null) return;
    const now = Date.now();
    for (const message_id of bind_ids) {
      const message_data = await this.bind_data(message_id);
      if (message_data === null) continue;
      if (message_data[3] > now) continue;
      await this.delete_bind(message_id);
      await this.bot.telegram.deleteMessage(message_data[1], message_id);
    }
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

  private async bind_data(message_id: number): Promise<BindData | null> {
    if (!(await this.is_bind(message_id))) return null;
    return JSON.parse((await this.db_api.hget(this.message_reply_data, message_id.toString()))!) as BindData;
  }

  private async bind(
    command_name: string,
    chat_id: number,
    message_id: number,
    old_message: BindData["2"],
    delete_at: number
  ): Promise<boolean> {
    const multi = this.db_api.multi();
    multi.sadd(this.message_replys, message_id.toString());
    multi.hset(this.message_reply_data, message_id.toString(), JSON.stringify([command_name, chat_id, old_message, delete_at]));

    return (await multi.exec())?.every((value) => value[0] !== null) ?? false;
  }

  private async is_bind(message_id: number): Promise<boolean> {
    return (await this.db_api.sismember(this.message_replys, message_id)) > 0;
  }

  private async binds(): Promise<number[] | null> {
    const data = await this.db_api.smembers(this.message_replys);
    return data.length > 0 ? data.map(Number) : null;
  }

  private async delete_bind(message_id: number): Promise<boolean> {
    const multi = this.db_api.multi();
    multi.srem(this.message_replys, message_id.toString());
    multi.hdel(this.message_reply_data, message_id.toString());

    return (await multi.exec())?.every((value) => value[0] !== null) ?? false;
  }

  public start_handler(): void {
    this.bot.start(async (ctx) => {
      await this.logger.log(`User ${ctx.from.username} (${ctx.from.id}) started working with the bot`);
      await Promise.all(this.starts.map(async (callback) => await callback(ctx)));
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
        if (this.is_reply_message(ctx.message))
          await Promise.all(
            this.routes
              .filter(({ params }) => params.kid === "reply")
              .map(async ({ params, callback }) => {
                const msg = ctx.message as MessageReply;
                const reply_msg = msg.reply_to_message;
                const bind_data = await this.bind_data(reply_msg.message_id);
                if (params.math !== undefined && !(await params.math(ctx, msg, bind_data))) return;
                await Promise.all([ctx.deleteMessage(reply_msg.message_id), ctx.deleteMessage(msg.message_id)]);
                await this.delete_bind(reply_msg.message_id);
                console.log(1);
                await callback(ctx, msg, { bind: this.bind.bind(this), data: bind_data });
              })
          );
        else if (this.is_command_message(ctx.message))
          await Promise.all(
            this.routes
              .filter(({ params }) => params.kid === "command")
              .map(async ({ params, callback }) => {
                if (params.math !== undefined && !(await params.math(ctx, ctx.message))) return;
                await callback(ctx, ctx.message, { bind: this.bind.bind(this) });
              })
          );
        else if (this.is_text_message(ctx.message) || this.is_photo_message(ctx.message))
          await Promise.all(
            this.routes
              .filter(({ params }) => params.kid === "message")
              .map(async ({ params, callback }) => {
                if (params.math !== undefined && !(await params.math(ctx, ctx.message))) return;
                await callback(ctx, ctx.message, { bind: this.bind.bind(this) });
              })
          );
      } catch (error: unknown) {
        await this.logger.error("Unknow Error: ", { error });
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
          await callback(ctx, ctx.callbackQuery, { bind: this.bind.bind(this) });
        }
      } catch (error: unknown) {
        await this.logger.error("Unknow Error: ", { error });
      }
    });
  }

  public get_bot(): Telegraf<Context> {
    return this.bot;
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
    params: { kid: "reply"; math?: (ctx: Context, msg: MessageReply, bind_data: BindData) => boolean | Promise<boolean> },
    callback: (ctx: Context, msg: MessageReply, options: CallbackParams & { data: BindData }) => void | Promise<void>
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
