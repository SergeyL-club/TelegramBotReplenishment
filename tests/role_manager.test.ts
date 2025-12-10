import Redis from "ioredis-mock";
import { RoleManager } from "../src/database/role_manager";
import { describe, beforeEach, test, expect } from "@jest/globals";

describe("RoleManager", () => {
  let redis: any;
  let roleManager: RoleManager;

  beforeEach(() => {
    redis = new Redis(); // in-memory Redis
    roleManager = new RoleManager(redis, "testdb");
  });

  test("create_role should create a new role", async () => {
    const res = await roleManager.create_role("admin", "token123");
    expect(res).toBe(true);

    const names = await roleManager.role_names();
    expect(names).toContain("admin");

    const token = await redis.hget("testdb:role:tokens", "admin");
    expect(token).toBe("token123");
  });

  test("create_role should return false if role already exists", async () => {
    await roleManager.create_role("admin", "token123");

    const res = await roleManager.create_role("admin", "otherToken");
    expect(res).toBe(false);
  });

  test("delete_role should remove an existing role", async () => {
    await roleManager.create_role("admin", "token123");

    const res = await roleManager.delete_role("admin");
    expect(res).toBe(true);

    const names = await roleManager.role_names();
    expect(names).not.toContain("admin");
  });

  test("delete_role should return false for non-existent role", async () => {
    const res = await roleManager.delete_role("unknown");
    expect(res).toBe(false);
  });

  test("verify_role_token should return true for correct token", async () => {
    await roleManager.create_role("admin", "token123");

    const res = await roleManager.verify_role_token("admin", "token123");
    expect(res).toBe(true);
  });

  test("verify_role_token should return false for incorrect token", async () => {
    await roleManager.create_role("admin", "token123");

    const res = await roleManager.verify_role_token("admin", "wrong");
    expect(res).toBe(false);
  });

  test("role_names should return created role names", async () => {
    await roleManager.create_role("admin", "a");
    await roleManager.create_role("mod", "b");

    const names = await roleManager.role_names();
    expect(names.sort()).toEqual(["admin", "mod"]);
  });
});
