import type { Redis } from "ioredis";

/* 
  Struct user
  user:names user_id:name
  user:roles:user_id set role_names
  user:ids set ids
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

  public async create_user(id: number, name: string): Promise<boolean> {
    if (await this.has_user(id)) return false;

    const create_user = this.db_api.multi();
    create_user.hset(this.user_path("names"), id.toString(), name);
    create_user.sadd(this.user_path("ids"), id.toString());

    const res = await create_user.exec();

    return res?.every(([err]) => err === null) ?? false;
  }

  public async delete_user(id: number): Promise<boolean> {
    if (!(await this.has_user(id))) return false;

    const remove_user = this.db_api.multi();
    remove_user.hdel(this.user_path("names"), id.toString());
    remove_user.del(this.user_path(`roles:${id}`));
    remove_user.srem(this.user_path("ids"), id.toString());

    const res = await remove_user.exec();

    return res?.every(([err]) => err === null) ?? false;
  }

  public async add_role_to_user(role_name: string, user_id: number): Promise<boolean> {
    if (!(await this.has_user(user_id))) return false;
    const assing_role = this.db_api.multi();
    assing_role.sadd(this.user_path(`roles:${user_id}`), role_name);

    const res = await assing_role.exec();

    return res?.every(([err]) => err === null) ?? false;
  }

  public async remove_role_to_user(role_name: string, user_id: number): Promise<boolean> {
    if (!(await this.has_user(user_id))) return false;
    const delete_role = this.db_api.multi();
    delete_role.srem(this.user_path(`roles:${user_id}`), role_name);

    const res = await delete_role.exec();

    return res?.every(([err]) => err === null) ?? false;
  }

  public async user_has_role(role_name: string, user_id: number): Promise<boolean> {
    if (!(await this.has_user(user_id))) return false;
    return (await this.db_api.sismember(this.user_path(`roles:${user_id}`), role_name)) > 0;
  }

  public async from_user_id_to_name(id: number): Promise<string | null> {
    return await this.db_api.hget(this.user_path("names"), id.toString());
  }

  public async user_ids(): Promise<number[]> {
    return (await this.db_api.smembers(this.user_path("ids"))).map(Number);
  }

  public async user_names(): Promise<string[]> {
    const ids = await this.user_ids();
    const names = await Promise.all(ids.map(id => this.from_user_id_to_name(id)));
    return names.filter((n): n is string => n !== null);
  }
}
