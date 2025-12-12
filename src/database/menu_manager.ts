import type { Redis } from "ioredis";

/* 
  Struct menu
  menu:descriptions role_name|name:description
  menu:positions role_name|name:positions
  menu:names set role_name|names
*/
export type Positions = [row: number, column: number];

export class MenuManager {
  private db_api: Redis;
  private db_name: string;

  public constructor(db_api: Redis, db_name = "tg_dealer") {
    this.db_api = db_api;
    this.db_name = db_name;
  }

  private menu_path(options: string = ""): string {
    return `${this.db_name}:menu:${options}`;
  }

  public async has_menu(role_name: string, menu_name: string): Promise<boolean> {
    return (await this.db_api.sismember(this.menu_path("names"), `${role_name}|${menu_name}`)) > 0;
  }

  public async create_menu(role_name: string, menu_name: string, description: string, positions: Positions): Promise<boolean> {
    if (await this.has_menu(role_name, menu_name)) return false;

    const create_menu = this.db_api.multi();
    create_menu.hset(this.menu_path("descriptions"), `${role_name}|${menu_name}`, description);
    create_menu.sadd(this.menu_path("names"), `${role_name}|${menu_name}`);
    create_menu.hset(this.menu_path("positions"), `${role_name}|${menu_name}`, JSON.stringify(positions));

    const res = await create_menu.exec();

    return res?.every(([err]) => err === null) ?? false;
  }

  public async delete_menu(role_name: string, menu_name: string): Promise<boolean> {
    if (!(await this.has_menu(role_name, menu_name))) return false;

    const create_menu = this.db_api.multi();
    create_menu.hdel(this.menu_path("descriptions"), `${role_name}|${menu_name}`);
    create_menu.srem(this.menu_path("names"), `${role_name}|${menu_name}`);
    create_menu.hdel(this.menu_path("positions"), `${role_name}|${menu_name}`);

    const res = await create_menu.exec();

    return res?.every(([err]) => err === null) ?? false;
  }

  public async menu_descriptions(role_name: string, menu_name: string): Promise<string | null> {
    if (!(await this.has_menu(role_name, menu_name))) return null;
    return await this.db_api.hget(this.menu_path("descriptions"), `${role_name}|${menu_name}`);
  }

  public async menu_positions(role_name: string, menu_name: string): Promise<Positions | null> {
    if (!(await this.has_menu(role_name, menu_name))) return null;
    return JSON.parse((await this.db_api.hget(this.menu_path("positions"), `${role_name}|${menu_name}`))!);
  }

  public async menu_names(): Promise<[role_name: string, menu_name: string][]> {
    const memory = await this.db_api.smembers(this.menu_path("names"));
    return memory.map((el) => el.split("|")) as [role_name: string, menu_name: string][];
  }
}
