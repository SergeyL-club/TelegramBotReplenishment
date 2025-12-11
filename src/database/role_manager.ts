import type { Redis } from "ioredis";

/* 
  Struct role
  role:tokens name:token
  role:names set names
*/
export class RoleManager {
  private db_api: Redis;
  private db_name: string;

  public constructor(db_api: Redis, db_name = "tg_dealer") {
    this.db_api = db_api;
    this.db_name = db_name;
  }

  private role_path(options: string = ""): string {
    return `${this.db_name}:role:${options}`;
  }

  public async has_role(name: string): Promise<boolean> {
    return (await this.db_api.sismember(this.role_path("names"), name)) > 0;
  }

  public async create_role(name: string, token: string): Promise<boolean> {
    if (await this.has_role(name)) return false;

    const create_role = this.db_api.multi();
    create_role.hset(this.role_path("tokens"), name, token);
    create_role.sadd(this.role_path("names"), name);

    const res = await create_role.exec();

    return res?.every(([err]) => err === null) ?? false;
  }

  public async delete_role(name: string): Promise<boolean> {
    if (!(await this.has_role(name))) return false;

    const remove_role = this.db_api.multi();
    remove_role.hdel(this.role_path("tokens"), name);
    remove_role.srem(this.role_path("names"), name);

    const res = await remove_role.exec();

    return res?.every(([err]) => err === null) ?? false;
  }

  public async verify_role_token(name: string, token: string): Promise<boolean> {
    const token_db = await this.db_api.hget(this.role_path("tokens"), name);
    return token_db === token;
  }

  public async role_names(): Promise<string[]> {
    return await this.db_api.smembers(this.role_path("names"));
  }
}
