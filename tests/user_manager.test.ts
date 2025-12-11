import Redis from "ioredis-mock";
import { UserManager } from "../src/database/user_manager";

describe("UserManager", () => {
  let redis: any;
  let userManager: UserManager;

  beforeEach(async () => {
    redis = new Redis();
    await redis.flushdb();
    userManager = new UserManager(redis, "testdb");
  });

  test("create_user should create a new user", async () => {
    const res = await userManager.create_user(1, "Alice");
    expect(res).toBe(true);

    const ids = await userManager.user_ids();
    expect(ids).toContain(1);

    const name = await userManager.from_user_id_to_name(1);
    expect(name).toBe("Alice");
  });

  test("create_user should return false for existing user", async () => {
    await userManager.create_user(1, "Alice");
    const res = await userManager.create_user(1, "Other");
    expect(res).toBe(false);
  });

  test("delete_user should delete existing user", async () => {
    await userManager.create_user(1, "Alice");
    await userManager.add_role_to_user("admin", 1);

    const res = await userManager.delete_user(1);
    expect(res).toBe(true);

    expect(await userManager.has_user(1)).toBe(false);
    expect(await userManager.from_user_id_to_name(1)).toBeNull();

    const rolesSet = await redis.smembers("testdb:user:roles:1:set");
    const rolesList = await redis.lrange("testdb:user:roles:1:list", 0, -1);
    expect(rolesSet.length).toBe(0);
    expect(rolesList.length).toBe(0);
  });

  test("add_role_to_user should add a role and track priority", async () => {
    await userManager.create_user(1, "Alice");

    const res = await userManager.add_role_to_user("admin", 1);
    expect(res).toBe(true);

    expect(await userManager.user_has_role("admin", 1)).toBe(true);

    // Проверяем порядок ролей
    await userManager.add_role_to_user("dealer", 1);
    const priority = await userManager.user_priority_roles(1);
    expect(priority).toEqual(["dealer", "admin"]); // LPUSH добавляет в начало списка
  });

  test("remove_role_to_user should remove role from set and list", async () => {
    await userManager.create_user(1, "Alice");
    await userManager.add_role_to_user("admin", 1);
    await userManager.add_role_to_user("dealer", 1);

    const res = await userManager.remove_role_to_user("admin", 1);
    expect(res).toBe(true);

    expect(await userManager.user_has_role("admin", 1)).toBe(false);

    const priority = await userManager.user_priority_roles(1);
    expect(priority).toEqual(["dealer"]);
  });

  test("user_has_role should return false for unknown role", async () => {
    await userManager.create_user(1, "Alice");
    expect(await userManager.user_has_role("admin", 1)).toBe(false);
  });

  test("from_user_id_to_name should return null for non-existing user", async () => {
    const name = await userManager.from_user_id_to_name(1);
    expect(name).toBeNull();
  });

  test("user_ids and user_names should return all IDs and names", async () => {
    await userManager.create_user(1, "Alice");
    await userManager.create_user(2, "Bob");

    expect((await userManager.user_ids()).sort()).toEqual([1, 2]);
    expect((await userManager.user_names()).sort()).toEqual(["Alice", "Bob"]);
  });
});
