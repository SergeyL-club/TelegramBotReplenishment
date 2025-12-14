import type { Telegraf, Context } from "telegraf";
import type { Redis } from "ioredis";
import { Timer } from "../core/timer";

/* 
  Struct timeout
  timeout:pre_opens list [time, message_id, chat_id, user_id, user_nickname]
*/
export class TimeoutDealManager {
  private pre_open_timer: Timer;

  public constructor(
    private db_api: Redis,
    private bot: Telegraf<Context>,
    private db_name = "tg_dealer"
  ) {
    this.pre_open_timer = new Timer(this.pre_open_timeout_handler.bind(this), 1000);
    this.pre_open_timer.start();
  }

  private async pre_open_timeout_handler(): Promise<void> {
    const now = Date.now();
    const pre_opens = await this.pre_opens();
    await Promise.all(
      pre_opens.map(async (pre_open) => {
        if (now > pre_open[0]) {
          await this.db_api.lrem(this.timeout_path("pre_opens"), 1, JSON.stringify(pre_open));
          await this.bot.telegram.sendMessage(
            pre_open[2],
            "Время ожидания запроса истекло, если вы ещё хотите пополнить баланс то прошу заново сделать запрос",
            { reply_parameters: { message_id: pre_open[1] } }
          );
        }
      })
    );
  }

  private timeout_path(options: string = ""): string {
    return `${this.db_name}:timeout:${options}`;
  }

  private async pre_opens(): Promise<[time: number, message_id: number, chat_id: number, user_id: number, user_nickname: string][]> {
    return (await this.db_api.lrange(this.timeout_path("pre_opens"), 0, -1)).map((el) => JSON.parse(el));
  }

  public async create_timeout_pre_open(
    time: number,
    message_id: number,
    chat_id: number,
    user_id: number,
    user_nickname: string
  ): Promise<boolean> {
    const create_timeout = this.db_api.multi();
    create_timeout.lpush(this.timeout_path("pre_opens"), JSON.stringify([time, message_id, chat_id, user_id, user_nickname]));

    const res = await create_timeout.exec();

    return res?.every(([err]) => err === null) ?? false;
  }
}
