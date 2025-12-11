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

    const roles = await redis.smembers("testdb:user:roles:1");
    expect(roles.length).toBe(0);
  });

  test("delete_user should return false for non-existing user", async () => {
    const res = await userManager.delete_user(1);
    expect(res).toBe(false);
  });

  test("add_role_to_user should add a role", async () => {
    await userManager.create_user(1, "Alice");

    const res = await userManager.add_role_to_user("admin", 1);
    expect(res).toBe(true);

    expect(await userManager.user_has_role("admin", 1)).toBe(true);
  });

  test("add_role_to_user should return false if user does not exist", async () => {
    const res = await userManager.add_role_to_user("admin", 1);
    expect(res).toBe(false);
  });

  test("remove_role_to_user should remove role", async () => {
    await userManager.create_user(1, "Alice");
    await userManager.add_role_to_user("admin", 1);

    const res = await userManager.remove_role_to_user("admin", 1);
    expect(res).toBe(true);

    expect(await userManager.user_has_role("admin", 1)).toBe(false);
  });

  test("remove_role_to_user should return false for non-existing user", async () => {
    const res = await userManager.remove_role_to_user("admin", 1);
    expect(res).toBe(false);
  });

  test("user_has_role should detect assigned role", async () => {
    await userManager.create_user(1, "Alice");
    await userManager.add_role_to_user("admin", 1);

    expect(await userManager.user_has_role("admin", 1)).toBe(true);
  });

  test("user_has_role should return false for unknown role", async () => {
    await userManager.create_user(1, "Alice");

    expect(await userManager.user_has_role("admin", 1)).toBe(false);
  });

  test("from_user_id_to_name should return user name", async () => {
    await userManager.create_user(1, "Alice");

    expect(await userManager.from_user_id_to_name(1)).toBe("Alice");
  });

  test("from_user_id_to_name should return null for non-existing user", async () => {
    const name = await userManager.from_user_id_to_name(1);
    expect(name).toBeNull();
  });

  test("user_ids should return all IDs", async () => {
    await userManager.create_user(1, "Alice");
    await userManager.create_user(2, "Bob");

    const ids = await userManager.user_ids();
    expect(ids.sort()).toEqual([1, 2]);
  });

  test("user_names should return all names", async () => {
    await userManager.create_user(1, "Alice");
    await userManager.create_user(2, "Bob");

    const names = await userManager.user_names();
    expect(names.sort()).toEqual(["Alice", "Bob"]);
  });
});
