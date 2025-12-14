import type { Context } from "telegraf";
import { Telegraf } from "telegraf";
import { default_logger } from "./logger";
import { Timer } from "./timer";
import { Mutex } from "./mutex";

export type { Context } from "telegraf";

export type MessageFilterFunction = (
  ctx: Context
) => [is_filter: boolean, next: () => unknown[]] | Promise<[is_filter: boolean, next: () => unknown[]]>;

export type MessageHandler = (ctx: Context, ...args: unknown[]) => void | Promise<void>;
export type CommandHandler = MessageHandler;
export type StartHandler = (ctx: Context) => void | Promise<void>;
export type CallbackHandler = StartHandler;
export type AnswerHandler = StartHandler;
export type TimeoutHandler = (bot: Telegraf<Context>, chat_id: number, message_id: number) => void | Promise<void>;

export class TelegramController {
  private bot: Telegraf<Context>;
  private reply_timer: Timer;
  private answer_mutex: Mutex;

  private messages: [filter: MessageFilterFunction, callback: MessageHandler][];
  private starts: StartHandler[];
  private callbacks: [name: string, callback: CallbackHandler][];
  private answers: [message_id: number, chat_id: number, callback: AnswerHandler, time: number, timeout_callback: TimeoutHandler][];

  public constructor(
    bot_token: string,
    private logger = default_logger
  ) {
    this.reply_timer = new Timer(this.reply_timeout_handler.bind(this), 1000);
    this.messages = [];
    this.starts = [];
    this.callbacks = [];
    this.answers = [];
    this.answer_mutex = new Mutex();
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

  private async delete_answer_handler(message_id: number, chat_id: number): Promise<void> {
    const unlock = await this.answer_mutex.lock();
    try {
      for (let i = 0; i < this.answers.length; i++) {
        const [mid, cid] = this.answers[i]!;

        if (cid === chat_id && mid === message_id) {
          this.answers.splice(i, 1); // удалить
          return;
        }
      }
    } finally {
      unlock();
    }
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
          if ("data" in ctx.callbackQuery && ctx.callbackQuery.data.includes(name)) await callback(ctx);
        })
      );
    });
  }

  private message_handler(): void {
    this.bot.on("message", async (ctx) => {
      await this.logger.log("Message arrived: ", { message: ctx.message, chat: ctx.chat, from: ctx.from });
      if ("reply_to_message" in ctx.message)
        return await Promise.all(
          this.answers.map(async ([message_id, chat_id, callback]) => {
            if ("reply_to_message" in ctx.message && ctx.message.reply_to_message.message_id === message_id && ctx.chat.id === chat_id) {
              await this.delete_answer_handler(message_id, chat_id);
              await callback(ctx);
            }
          })
        );
      else
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

  private async reply_timeout_handler(): Promise<void> {
    const now = Date.now();
    for (const answer of this.answers) {
      if (answer[3] < now) {
        await this.delete_answer_handler(answer[0], answer[1]);
        await answer[4](this.bot, answer[1], answer[0]);
        // await this.bot.telegram.sendMessage(answer[1], "Время ответа истекло", { reply_parameters: { message_id: answer[0] } });
      }
    }
  }

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

  public on_callback(name: string, callback: CallbackHandler): void {
    this.callbacks.push([name, callback]);
  }

  public once_answers(
    message_id: number,
    chat_id: number,
    callback: AnswerHandler,
    timeout_callback: TimeoutHandler,
    time: number = Date.now() + 10 * 1000
  ): void {
    this.answers.push([message_id, chat_id, callback, time, timeout_callback]);
  }
}
