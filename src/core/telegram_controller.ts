import type { Context } from "telegraf";
import { Telegraf } from "telegraf";
import { default_logger } from "./logger";
import { Timer } from "./timer";

export type { Context } from "telegraf";

export type MessageFilterFunction = (
  ctx: Context
) => [is_filter: boolean, next: () => unknown[]] | Promise<[is_filter: boolean, next: () => unknown[]]>;

export type MessageHandler = (ctx: Context, ...args: unknown[]) => void | Promise<void>;
export type CommandHandler = MessageHandler;
export type StartHandler = (ctx: Context) => void | Promise<void>;
export type CallbackHandler = StartHandler;

export class TelegramController {
  private bot: Telegraf<Context>;
  private reply_timer: Timer;

  private messages: [filter: MessageFilterFunction, callback: MessageHandler][];
  private starts: StartHandler[];
  private callbacks: [name: string, callback: CallbackHandler][];

  public constructor(
    bot_token: string,
    private logger = default_logger
  ) {
    this.reply_timer = new Timer(this.reply_timeout_handler.bind(this), 1000);
    this.messages = [];
    this.starts = [];
    this.callbacks = [];
    this.bot = new Telegraf(bot_token);
    this.bot.catch(async (err) => {
      await this.logger.error(
        err instanceof Error ? err.message : "Unknow telegram bot error: ",
        err instanceof Error ? (err.stack ? { stack: err.stack } : undefined) : { raw: err }
      );
    });
    this.start_handler.call(this);
    this.callback_handler.call(this);
    this.message_handler.call(this);
  }

  private callback_handler(): void {
    this.bot.on("callback_query", async (ctx) => {
      await this.logger.log("Callback arrived: ", {
        message: ctx.message,
        chat: ctx.chat,
        from: ctx.from,
        callback_query: ctx.callbackQuery,
      });
      await Promise.all(
        this.callbacks.map(async ([name, callback]) => {
          if ("data" in ctx.callbackQuery && ctx.callbackQuery.data === name) await callback(ctx);
        })
      );
    });
  }

  private message_handler(): void {
    this.bot.on("message", async (ctx) => {
      await this.logger.log("Message arrived: ", { message: ctx.message, chat: ctx.chat, from: ctx.from });
      await Promise.all(
        this.messages.map(async ([filter, callback]) => {
          const [is_filter, next] = await filter(ctx);
          if (is_filter) await callback(ctx, next());
        })
      );
    });
  }

  private start_handler(): void {
    this.bot.start(async (ctx) => {
      await this.logger.log(`User ${ctx.from.username} (${ctx.from.id}) started working with the bot`);
      await Promise.all(this.starts.map(async (callback) => await callback(ctx)));
    });
  }

  private reply_timeout_handler(): void {}

  public reply_timer_start(): void {
    this.reply_timer.start();
  }

  public reply_timer_stop(): void {
    this.reply_timer.stop();
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

  // on function handler
  public on_message(filter: MessageFilterFunction, callback: MessageHandler): void {
    this.messages.push([filter, callback]);
  }

  public on_start(callback: StartHandler): void {
    this.starts.push(callback);
  }

  public on_callback(name: string, callback: CallbackHandler) {
    this.callbacks.push([name, callback]);
  }
}
