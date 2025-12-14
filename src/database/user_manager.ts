import type Redis from "ioredis";

export interface UserData {
  id: number;
  nickname: string;
  chat_id: number;
  roles: string[];
}

export class UserManager {
  public constructor(
    private db_api: Redis,
    db_name = "tg_trader"
  ) {
    this.user_ids = `${db_name}:users:ids`;
    this.user_nicknames = `${db_name}:users:nicknames`;
    this.user_chats = `${db_name}:users:chats`;
    this.user_roles = (user_id) => `${db_name}:users:roles:${user_id}`;

    this.user_traders = `${db_name}:users:traders`;
  }

  private user_ids;
  private user_nicknames;
  private user_chats;
  private user_roles: (user_id: number) => string;

  private user_traders;

  // Проверка на наличие пользователя
  public async verification_by_user_id(user_id: number): Promise<boolean> {
    return (await this.db_api.sismember(this.user_ids, user_id.toString())) > 0;
  }

  // Проверка наличия роли у пользователя
  public async verification_role_by_user_id(user_id: number, role_name: string): Promise<boolean> {
    return (await this.db_api.sismember(this.user_roles(user_id), role_name)) > 0;
  }

  // Получение данных по пользователю
  public async nickname_by_user_id(user_id: number): Promise<string | null> {
    return await this.db_api.hget(this.user_nicknames, user_id.toString());
  }
  public async chat_by_user_id(user_id: number): Promise<number | null> {
    const data = await this.db_api.hget(this.user_chats, user_id.toString());
    return data !== null ? Number(data) : null;
  }
  public async role_by_user_id(user_id: number): Promise<string[] | null> {
    const data = await this.db_api.smembers(this.user_roles(user_id));
    return data.length > 0 ? data : null;
  }

  // Функции trader
  public async verification_trader_by_user_id(user_id: number): Promise<boolean> {
    return (await this.db_api.sismember(this.user_traders, user_id.toString())) > 0;
  }
  public async toggle_trader_by_user_id(user_id: number, is?: boolean): Promise<boolean> {
    const is_verify = await this.verification_trader_by_user_id(user_id);
    if (is === is_verify) return true;
    if (is === true || (is === undefined && is_verify === false))
      return (await this.db_api.sadd(this.user_traders, user_id.toString())) > 0;
    return (await this.db_api.srem(this.user_traders, user_id.toString())) > 0;
  }
  public async ready_traders(): Promise<number[]> {
    return (await this.db_api.smembers(this.user_traders)).map(Number);
  }

  // Весь блок пользователя
  public async data_by_user_id(user_id: number): Promise<UserData | null> {
    if (!(await this.verification_by_user_id(user_id))) return null;
    const user: UserData = {} as UserData;
    const [nickname, chat_id, roles] = await Promise.all([
      this.nickname_by_user_id(user_id),
      this.chat_by_user_id(user_id),
      this.role_by_user_id(user_id),
    ]);

    user.id = user_id;
    user.nickname = nickname!;
    user.chat_id = chat_id!;
    user.roles = roles!;

    return user;
  }

  // Создание и удаление пользователя
  public async create_user(user_id: number, chat_id: number, nickname: string, roles?: string[]): Promise<boolean> {
    if (await this.verification_by_user_id(user_id)) return true;
    const multi = this.db_api.multi();

    multi.hset(this.user_chats, user_id.toString(), chat_id.toString());
    multi.hset(this.user_nicknames, user_id.toString(), nickname);
    if (roles !== undefined && roles.length > 0) multi.sadd(this.user_roles(user_id), roles);

    return (await multi.exec())?.every((value) => value[0] !== null) ?? false;
  }
  public async delete_user(user_id: number): Promise<boolean> {
    if (!(await this.verification_by_user_id(user_id))) return true;
    const multi = this.db_api.multi();

    multi.hdel(this.user_chats, user_id.toString());
    multi.hdel(this.user_nicknames, user_id.toString());
    multi.del(this.user_roles(user_id));

    return (await multi.exec())?.every((value) => value[0] !== null) ?? false;
  }
}
