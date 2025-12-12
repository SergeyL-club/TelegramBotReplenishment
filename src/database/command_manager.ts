import type { Redis } from "ioredis";

/* 
  Struct command
  command:descriptions role_name|name:description
  command:names set role_name|names
*/
export class CommandManager {
  private db_api: Redis;
  private db_name: string;

  public constructor(db_api: Redis, db_name = "tg_dealer") {
    this.db_api = db_api;
    this.db_name = db_name;
  }

  private command_path(options: string = ""): string {
    return `${this.db_name}:command:${options}`;
  }

  public async has_command(role_name: string, command_name: string): Promise<boolean> {
    return (await this.db_api.sismember(this.command_path("names"), `${role_name}|${command_name}`)) > 0;
  }

  public async create_command(role_name: string, command_name: string, description: string): Promise<boolean> {
    if (await this.has_command(role_name, command_name)) return false;

    const create_command = this.db_api.multi();
    create_command.hset(this.command_path("descriptions"), `${role_name}|${command_name}`, description);
    create_command.sadd(this.command_path("names"), `${role_name}|${command_name}`);

    const res = await create_command.exec();

    return res?.every(([err]) => err === null) ?? false;
  }

  public async delete_command(role_name: string, command_name: string): Promise<boolean> {
    if (!(await this.has_command(role_name, command_name))) return false;

    const create_command = this.db_api.multi();
    create_command.hdel(this.command_path("descriptions"), `${role_name}|${command_name}`);
    create_command.srem(this.command_path("names"), `${role_name}|${command_name}`);

    const res = await create_command.exec();

    return res?.every(([err]) => err === null) ?? false;
  }

  public async command_descriptions(role_name: string, command_name: string): Promise<string | null> {
    if (!(await this.has_command(role_name, command_name))) return null;
    return await this.db_api.hget(this.command_path("descriptions"), `${role_name}|${command_name}`);
  }

  public async command_names(): Promise<[role_name: string, command_name: string][]> {
    const memory = await this.db_api.smembers(this.command_path("names"));
    return memory.map((el) => el.split("|")) as [role_name: string, command_name: string][];
  }
}
