import Redis from "ioredis-mock";
import { UserManager } from "../src/database/user_manager";
import { Roles } from "../src/registry_base_roles";

describe("UserManager", () => {
  let redis: any;
  let userManager: UserManager;

  beforeEach(async () => {
    redis = new Redis();
    await redis.flushdb();
    userManager = new UserManager(redis, "testdb");
  });

  test("create_user should create a new user", async () => {
    const res = await userManager.create_user(1, "Alice", 100);
    expect(res).toBe(true);

    expect(await userManager.has_user(1)).toBe(true);
    expect(await userManager.from_user_id_to_name(1)).toBe("Alice");
    expect(await userManager.user_chat(1)).toBe(100);
  });

  test("create_user should return false for existing user", async () => {
    await userManager.create_user(1, "Alice", 100);
    const res = await userManager.create_user(1, "Other", 200);
    expect(res).toBe(false);
  });

  test("delete_user should delete existing user", async () => {
    await userManager.create_user(1, "Alice", 100);
    await userManager.add_role_to_user(Roles.DEALER, 1);

    const res = await userManager.delete_user(1);
    expect(res).toBe(true);

    expect(await userManager.has_user(1)).toBe(false);
    expect(await userManager.from_user_id_to_name(1)).toBeNull();
    expect(await userManager.user_chat(1)).toBeNull();

    const rolesSet = await redis.smembers("testdb:user:roles:1:set");
    const rolesList = await redis.lrange("testdb:user:roles:1:list", 0, -1);

    expect(rolesSet.length).toBe(0);
    expect(rolesList.length).toBe(0);
  });

  test("add_role_to_user should add role and preserve priority", async () => {
    await userManager.create_user(1, "Alice", 100);

    await userManager.add_role_to_user(Roles.ADMIN, 1);
    await userManager.add_role_to_user(Roles.DEALER, 1);

    expect(await userManager.user_has_role(Roles.ADMIN, 1)).toBe(true);
    expect(await userManager.user_has_role(Roles.DEALER, 1)).toBe(true);

    const priority = await userManager.user_priority_roles(1);
    expect(priority).toEqual([Roles.DEALER, Roles.ADMIN]); // LPUSH
  });

  test("remove_role_to_user should remove role from set and list", async () => {
    await userManager.create_user(1, "Alice", 100);
    await userManager.add_role_to_user(Roles.ADMIN, 1);
    await userManager.add_role_to_user(Roles.DEALER, 1);

    const res = await userManager.remove_role_to_user(Roles.ADMIN, 1);
    expect(res).toBe(true);

    expect(await userManager.user_has_role(Roles.ADMIN, 1)).toBe(false);

    const priority = await userManager.user_priority_roles(1);
    expect(priority).toEqual([Roles.DEALER]);
  });

  test("dealer ready flag should work only for dealer role", async () => {
    await userManager.create_user(1, "Alice", 100);

    // без роли dealer — false
    expect(await userManager.add_dealer_ready(1, true)).toBe(false);

    await userManager.add_role_to_user(Roles.DEALER, 1);

    expect(await userManager.add_dealer_ready(1, true)).toBe(true);
    expect(await userManager.dealer_has_ready(1)).toBe(true);

    expect(await userManager.add_dealer_ready(1, false)).toBe(true);
    expect(await userManager.dealer_has_ready(1)).toBe(false);
  });

  test("dealer_readys should return all ready dealers", async () => {
    await userManager.create_user(1, "Alice", 100);
    await userManager.create_user(2, "Bob", 200);

    await userManager.add_role_to_user(Roles.DEALER, 1);
    await userManager.add_role_to_user(Roles.DEALER, 2);

    await userManager.add_dealer_ready(1, true);

    const ready = await userManager.dealer_readys();
    expect(ready).toEqual([1]);
  });

  test("add_deal_to_user should assign deals", async () => {
    await userManager.create_user(1, "Alice", 100);

    await userManager.add_deal_to_user(10, 1);
    await userManager.add_deal_to_user(20, 1);

    const deals = await userManager.user_deals(1);
    expect(deals.sort()).toEqual([10, 20]);
  });

  test("user_ids and user_names should return all users", async () => {
    await userManager.create_user(1, "Alice", 100);
    await userManager.create_user(2, "Bob", 200);

    expect((await userManager.user_ids()).sort()).toEqual([1, 2]);
    expect((await userManager.user_names()).sort()).toEqual(["Alice", "Bob"]);
  });

  test("methods should handle non-existing user correctly", async () => {
    expect(await userManager.from_user_id_to_name(1)).toBeNull();
    expect(await userManager.user_chat(1)).toBeNull();
    expect(await userManager.user_deals(1)).toEqual([]);
    expect(await userManager.user_priority_roles(1)).toEqual([]);
    expect(await userManager.user_has_role(Roles.ADMIN, 1)).toBe(false);
  });
});
