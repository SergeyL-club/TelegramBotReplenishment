import type { Redis } from "ioredis";

/* 
  Struct method
  method:description name:description
  method:names set names
*/
export class MethodManager {
  private db_api: Redis;
  private db_name: string;

  public constructor(db_api: Redis, db_name = "tg_dealer") {
    this.db_api = db_api;
    this.db_name = db_name;
  }

  private method_path(options: string = ""): string {
    return `${this.db_name}:method:${options}`;
  }

  public async has_method(method_name: string): Promise<boolean> {
    return (await this.db_api.sismember(this.method_path("names"), method_name)) > 0;
  }

  public async create_method(method_name: string, description: string): Promise<boolean> {
    if (await this.has_method(method_name)) return false;

    const create_method = this.db_api.multi();
    create_method.hset(this.method_path("descriptions"), method_name, description);
    create_method.sadd(this.method_path("names"), method_name);

    const res = await create_method.exec();

    return res?.every(([err]) => err === null) ?? false;
  }

  public async delete_method(method_name: string): Promise<boolean> {
    if (!(await this.has_method(method_name))) return false;

    const create_method = this.db_api.multi();
    create_method.hdel(this.method_path("descriptions"), method_name);
    create_method.srem(this.method_path("names"), method_name);

    const res = await create_method.exec();

    return res?.every(([err]) => err === null) ?? false;
  }

  public async method_descriptions(method_name: string): Promise<string | null> {
    if (!(await this.has_method(method_name))) return null;
    return await this.db_api.hget(this.method_path("descriptions"), method_name);
  }

  public async method_names(): Promise<string[]> {
    const memory = await this.db_api.smembers(this.method_path("names"));
    return memory;
  }
}
