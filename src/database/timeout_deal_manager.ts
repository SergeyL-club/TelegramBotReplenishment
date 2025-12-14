import type { Telegraf, Context } from "telegraf";
import type { Redis } from "ioredis";
import type { DealManager } from "./deal_manager";
import { Timer } from "../core/timer";

export type PreOpenParams = [time: number, message_id: number, chat_id: number];
export type AccessClientParams = [time: number, deal_id: number, message_id: number, chat_id: number];

/* 
  Struct timeout
  timeout:pre_opens list [time, message_id, chat_id, user_id, user_nickname]
*/
export class TimeoutDealManager {
  private pre_open_timer: Timer;

  public constructor(
    private db_api: Redis,
    private bot: Telegraf<Context>,
    private deal_manager: DealManager,
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
    const access_client = await this.access_client();
    await Promise.all(
      access_client.map(async (access) => {
        if (now > access[0]) {
          await this.db_api.lrem(this.timeout_path("access:client"), 1, JSON.stringify(access));
          await this.deal_manager.close_deal(access[1]);
          await this.bot.telegram.sendMessage(
            access[3],
            `Время подтверждения оплаты истекло (номер сделки ${access[1]}), если вы ещё хотите пополнить баланс то прошу заново сделать запрос`,
            { reply_parameters: { message_id: access[2] } }
          );
        }
      })
    );
  }

  private timeout_path(options: string = ""): string {
    return `${this.db_name}:timeout:${options}`;
  }

  private async pre_opens(): Promise<PreOpenParams[]> {
    return (await this.db_api.lrange(this.timeout_path("pre_opens"), 0, -1)).map((el) => JSON.parse(el) as PreOpenParams);
  }

  private async access_client(): Promise<AccessClientParams[]> {
    return (await this.db_api.lrange(this.timeout_path("access:client"), 0, -1)).map((el) => JSON.parse(el) as AccessClientParams);
  }

  public async delete_timeout_pre_open(message_id: number, chat_id: number): Promise<boolean> {
    const create_timeout = this.db_api.multi();
    const timeout_pre_opens = await this.pre_opens();
    for (const pre_open of timeout_pre_opens) {
      if (pre_open[1] === message_id && pre_open[2] === chat_id) {
        create_timeout.lrem(this.timeout_path("pre_opens"), 1, JSON.stringify(pre_open));
      }
    }

    const res = await create_timeout.exec();

    return res?.every(([err]) => err === null) ?? false;
  }

  public async create_timeout_pre_open(time: number, message_id: number, chat_id: number): Promise<boolean> {
    const create_timeout = this.db_api.multi();
    create_timeout.lpush(this.timeout_path("pre_opens"), JSON.stringify([time, message_id, chat_id]));

    const res = await create_timeout.exec();

    return res?.every(([err]) => err === null) ?? false;
  }

  public async create_timeout_access_client(time: number, deal_id: number, message_id: number, chat_id: number) {
    const create_timeout = this.db_api.multi();
    create_timeout.lpush(this.timeout_path("access:client"), JSON.stringify([time, deal_id, message_id, chat_id]));

    const res = await create_timeout.exec();

    return res?.every(([err]) => err === null) ?? false;
  }

  public async delete_timeout_access_client(message_id: number, chat_id: number): Promise<boolean> {
    const create_timeout = this.db_api.multi();
    const timeout_access_client = await this.access_client();
    for (const access of timeout_access_client) {
      if (access[2] === message_id && access[3] === chat_id) {
        create_timeout.lrem(this.timeout_path("pre_opens"), 1, JSON.stringify(access));
      }
    }

    const res = await create_timeout.exec();

    return res?.every(([err]) => err === null) ?? false;
  }
}
