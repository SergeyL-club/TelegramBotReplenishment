// TODO:  разделить текущую реализацию а обобщенную и отделенную от telegram controller
// TODO: идея сделать общий интерфейс чтобы в bind хранились все сообщения по ключам команды, а в reply будет стираться эти данные,
// также handler изменения сообщения или его удаления (сделать 2 списка и 2 handler которые будет telegram controller передавать)

import Redis from "ioredis";
import { Timer } from "./timer";
import type { ExtraEditMessageText } from "telegraf/typings/telegram-types";

export interface MessageBind {
  command: string;
  chat_id: number;
  message_id: number;
  delete_at: number;
  edit?: {
    text: string;
    extra?: ExtraEditMessageText;
  };
}
type ExpireCallback = (message: MessageBind) => Promise<void> | void;

export class MessageManager {
  public constructor(
    private db_api: Redis,
    timeout_callback: ExpireCallback,
    db_name = "tg_trader"
  ) {
    this.timer = new Timer(this.timeout_message.bind(this, timeout_callback), 1000);
    this.path_messages = `${db_name}:bind:messages`;
    this.path_data = `${db_name}:bind:data`;
    this.path_command = (command): string => `${db_name}:bind:command:${command}`;
  }

  private timer: Timer;

  private path_messages: string;
  private path_data: string;
  private path_command: (command: string) => string;

  private async timeout_message(timeout_callback: ExpireCallback): Promise<void> {
    const now = Date.now();
    const ids = await this.db_api.smembers(this.path_messages);
    for (const id of ids) {
      const data = await this.get(Number(id));
      if (data === null) {
        await this.db_api.srem(this.path_messages, id);
        continue;
      }
      if (data.delete_at > now) continue;
      await this.delete(data.message_id);
      await timeout_callback(data);
    }
  }

  public start_timeout_delete_binds(): void {
    this.timer.start();
  }

  public stop_timeout_delete_binds(): void {
    this.timer.stop();
  }

  public async bind(data: MessageBind): Promise<boolean> {
    const multi = this.db_api.multi();

    multi.sadd(this.path_messages, data.message_id.toString());
    multi.hset(this.path_data, data.message_id.toString(), JSON.stringify(data));
    multi.sadd(this.path_command(data.command), data.message_id.toString());

    return (await multi.exec())?.every((value) => value[0] === null) ?? false;
  }

  public async command_update(command: string): Promise<number[]> {
    return (await this.db_api.smembers(this.path_command(command))).map(Number);
  }

  public async get(message_id: number): Promise<MessageBind | null> {
    const raw = await this.db_api.hget(this.path_data, message_id.toString());
    return raw ? (JSON.parse(raw) as MessageBind) : null;
  }

  public async delete(message_id: number): Promise<boolean> {
    const data = await this.get(message_id);
    if (!data) return false;

    const multi = this.db_api.multi();
    multi.srem(this.path_messages, message_id.toString());
    multi.hdel(this.path_data, message_id.toString());
    multi.srem(this.path_command(data.command), message_id.toString());

    return (await multi.exec())?.every((value) => value[0] === null) ?? false;
  }
}
