import Redis from "ioredis-mock";
import { MenuManager } from "../src/database/menu_manager";

describe("MenuManager", () => {
  let redis: any;
  let menuManager: MenuManager;

  beforeEach(async () => {
    redis = new Redis();
    await redis.flushdb();
    menuManager = new MenuManager(redis, "testdb");
  });

  test("create_menu should create a menu", async () => {
    const res = await menuManager.create_menu("admin", "main", "Main menu", [0, 1]);
    expect(res).toBe(true);

    expect(await menuManager.has_menu("admin", "main")).toBe(true);

    const desc = await menuManager.menu_descriptions("admin", "main");
    expect(desc).toBe("Main menu");

    const pos = await menuManager.menu_positions("admin", "main");
    expect(pos).toEqual<[number, number]>([0, 1]);
  });

  test("create_menu should return false for existing menu", async () => {
    await menuManager.create_menu("admin", "main", "Main menu", [0, 1]);

    const res = await menuManager.create_menu("admin", "main", "Duplicate", [1, 1]);
    expect(res).toBe(false);
  });

  test("delete_menu should delete existing menu", async () => {
    await menuManager.create_menu("admin", "main", "Main menu", [0, 1]);

    const res = await menuManager.delete_menu("admin", "main");
    expect(res).toBe(true);

    expect(await menuManager.has_menu("admin", "main")).toBe(false);

    const desc = await menuManager.menu_descriptions("admin", "main");
    expect(desc).toBeNull();

    const pos = await menuManager.menu_positions("admin", "main");
    expect(pos).toBeNull();
  });

  test("delete_menu should return false for non-existing menu", async () => {
    const res = await menuManager.delete_menu("admin", "main");
    expect(res).toBe(false);
  });

  test("menu_descriptions should return null for missing menu", async () => {
    const res = await menuManager.menu_descriptions("admin", "main");
    expect(res).toBeNull();
  });

  test("menu_positions should return null for missing menu", async () => {
    const res = await menuManager.menu_positions("admin", "main");
    expect(res).toBeNull();
  });

  test("menu_names should return all menus", async () => {
    await menuManager.create_menu("admin", "main", "Main", [0, 0]);
    await menuManager.create_menu("dealer", "panel", "Panel", [1, 2]);

    const names = await menuManager.menu_names();

    expect(names.sort()).toEqual([
      ["admin", "main"],
      ["dealer", "panel"],
    ]);
  });
});
