import type { Redis } from "ioredis";
import { Roles } from "../registry_base_roles";

/* 
  Struct user
  user:names user_id:name
  user:chats user_id:chat_id
  user:roles:user_id:set set role_names
  user:roles:user_id:list list role_names
  user:ids set ids

  user:dealer:is_ready set user_ids

  user:deals:user_id set deal_ids
*/
export class UserManager {
  private db_api: Redis;
  private db_name: string;

  public constructor(db_api: Redis, db_name = "tg_dealer") {
    this.db_api = db_api;
    this.db_name = db_name;
  }

  private user_path(options: string = ""): string {
    return `${this.db_name}:user:${options}`;
  }

  public async has_user(id: number): Promise<boolean> {
    return (await this.db_api.sismember(this.user_path("ids"), id.toString())) > 0;
  }

  public async create_user(id: number, name: string, chat_id: number): Promise<boolean> {
    if (await this.has_user(id)) return false;

    const create_user = this.db_api.multi();
    create_user.hset(this.user_path("names"), id.toString(), name);
    create_user.hset(this.user_path("chats"), id.toString(), chat_id);
    create_user.sadd(this.user_path("ids"), id.toString());

    const res = await create_user.exec();

    return res?.every(([err]) => err === null) ?? false;
  }

  public async delete_user(id: number): Promise<boolean> {
    if (!(await this.has_user(id))) return false;

    const remove_user = this.db_api.multi();
    remove_user.hdel(this.user_path("names"), id.toString());
    remove_user.hdel(this.user_path("chats"), id.toString());
    remove_user.del(this.user_path(`roles:${id}:set`));
    remove_user.del(this.user_path(`roles:${id}:list`));
    remove_user.srem(this.user_path("ids"), id.toString());

    const res = await remove_user.exec();

    return res?.every(([err]) => err === null) ?? false;
  }

  public async add_dealer_ready(user_id: number, is: boolean): Promise<boolean> {
    if (!(await this.has_user(user_id)) || !(await this.user_has_role(Roles.DEALER, user_id))) return false;
    const dealer_ready = this.db_api.multi();
    if (is) dealer_ready.sadd(this.user_path("dealer:is_ready"), user_id.toString());
    else dealer_ready.srem(this.user_path("dealer:is_ready"), user_id.toString());

    const res = await dealer_ready.exec();

    return res?.every(([err]) => err === null) ?? false;
  }

  public async add_deal_to_user(deal_id: number, user_id: number): Promise<boolean> {
    if (!(await this.has_user(user_id))) return false;
    const assing_deal = this.db_api.multi();
    assing_deal.sadd(this.user_path(`deals:${user_id}`), deal_id);

    const res = await assing_deal.exec();

    return res?.every(([err]) => err === null) ?? false;
  }

  public async add_role_to_user(role_name: string, user_id: number): Promise<boolean> {
    if (!(await this.has_user(user_id))) return false;
    const assing_role = this.db_api.multi();
    assing_role.sadd(this.user_path(`roles:${user_id}:set`), role_name);
    assing_role.lpush(this.user_path(`roles:${user_id}:list`), role_name);

    const res = await assing_role.exec();

    return res?.every(([err]) => err === null) ?? false;
  }

  public async remove_role_to_user(role_name: string, user_id: number): Promise<boolean> {
    if (!(await this.has_user(user_id))) return false;
    const delete_role = this.db_api.multi();
    delete_role.srem(this.user_path(`roles:${user_id}:set`), 1, role_name);
    delete_role.lrem(this.user_path(`roles:${user_id}:list`), 1, role_name);

    const res = await delete_role.exec();

    return res?.every(([err]) => err === null) ?? false;
  }

  public async user_has_role(role_name: string, user_id: number): Promise<boolean> {
    if (!(await this.has_user(user_id))) return false;
    return (await this.db_api.sismember(this.user_path(`roles:${user_id}:set`), role_name)) > 0;
  }

  public async user_priority_roles(user_id: number): Promise<string[]> {
    if (!(await this.has_user(user_id)) || (await this.db_api.keys(this.user_path(`roles:${user_id}:list`))).length < 1) return [];
    return await this.db_api.lrange(this.user_path(`roles:${user_id}:list`), 0, -1);
  }

  public async from_user_id_to_name(user_id: number): Promise<string | null> {
    return await this.db_api.hget(this.user_path("names"), user_id.toString());
  }

  public async user_ids(): Promise<number[]> {
    return (await this.db_api.smembers(this.user_path("ids"))).map(Number);
  }

  public async user_names(): Promise<string[]> {
    const ids = await this.user_ids();
    const names = await Promise.all(ids.map((id) => this.from_user_id_to_name(id)));
    return names.filter((n): n is string => n !== null);
  }

  public async user_chat(user_id: number): Promise<string | null> {
    if (!(await this.has_user(user_id))) return null;
    return await this.db_api.hget(this.user_path("chats"), user_id.toString());
  }

  public async user_deals(user_id: number): Promise<number[]> {
    if (!(await this.has_user(user_id))) return [];
    return (await this.db_api.smembers(this.user_path(`deals:${user_id}`))).map(Number);
  }

  public async dealer_readys(): Promise<number[]> {
    return (await this.db_api.smembers(this.user_path("dealer:is_ready"))).map(Number);
  }
}
