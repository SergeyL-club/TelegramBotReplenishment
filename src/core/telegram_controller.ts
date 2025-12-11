import { Context } from "telegraf";
import { Telegraf } from "telegraf";
import { default_logger } from "./logger";
import { Timer } from "./timer";

export type { Context } from "telegraf";

export type MessageFilterFunction = (ctx: Context) => boolean | Promise<boolean>;

export type QueryHandler = (ctx: Context, action: string, id: string) => void | Promise<void>;
export type MessageHandler = (ctx: Context) => void | Promise<void>;
export type CommandHandler = MessageHandler;
export type StartHandler = MessageHandler;

export class TelegramController {
  private bot: Telegraf<Context>;
  private reply_timer: Timer;

  private messages: [filter: MessageFilterFunction, callback: MessageHandler][];
  private starts: StartHandler[];
  private replys: { message_id: number; callback: CommandHandler; time: number; chat_id: number }[];

  public constructor(
    bot_token: string,
    private logger = default_logger
  ) {
    this.reply_timer = new Timer(this.reply_timeout_handler.bind(this), 1000);
    this.messages = [];
    this.replys = [];
    this.starts = [];
    this.bot = new Telegraf(bot_token);
    this.bot.catch(async (err) => {
      await this.logger.error(
        err instanceof Error ? err.message : "Unknow telegram bot error: ",
        err instanceof Error ? (err.stack ? { stack: err.stack } : undefined) : { raw: err }
      );
    });
    this.start_handler.call(this);
    this.message_handler.call(this);
  }

  private message_handler(): void {
    this.bot.on("message", async (ctx) => {
      await this.logger.log("Message arrived: ", { message: ctx.message, chat: ctx.chat, from: ctx.from });
      await Promise.all(this.messages.map(async ([filter, callback]) => ((await filter(ctx)) ? await callback(ctx) : undefined)));
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
}
