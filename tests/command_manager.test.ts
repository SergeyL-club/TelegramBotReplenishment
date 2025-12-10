import Redis from "ioredis-mock";
import { CommandManager } from "../src/database/command_manager";
import { describe, beforeEach, test, expect } from "@jest/globals";

describe("CommandManager", () => {
  let redis: any;
  let commandManager: CommandManager;

  beforeEach(() => {
    redis = new Redis();
    commandManager = new CommandManager(redis, "testdb");
  });

  test("create_command should create a new command", async () => {
    const res = await commandManager.create_command("admin", "ban", "ban user");
    expect(res).toBe(true);

    const names = await commandManager.command_names();
    expect(names).toContainEqual(["admin", "ban"]);

    const desc = await commandManager.command_descriptions("admin", "ban");
    expect(desc).toBe("ban user");
  });

  test("create_command should return false if command already exists", async () => {
    await commandManager.create_command("admin", "ban", "ban user");
    const res = await commandManager.create_command("admin", "ban", "other description");
    expect(res).toBe(false);
  });

  test("delete_command should remove an existing command", async () => {
    await commandManager.create_command("admin", "ban", "ban user");

    const res = await commandManager.delete_command("admin", "ban");
    expect(res).toBe(true);

    const names = await commandManager.command_names();
    expect(names).not.toContainEqual(["admin", "ban"]);

    const desc = await commandManager.command_descriptions("admin", "ban");
    expect(desc).toBeNull();
  });

  test("delete_command should return false for non-existent command", async () => {
    const res = await commandManager.delete_command("admin", "kick");
    expect(res).toBe(false);
  });

  test("command_descriptions should return null for non-existent command", async () => {
    const desc = await commandManager.command_descriptions("admin", "kick");
    expect(desc).toBeNull();
  });

  test("command_names should return all created commands", async () => {
    await commandManager.create_command("admin", "ban", "ban user");
    await commandManager.create_command("moderator", "kick", "kick user");

    const names = await commandManager.command_names();
    expect(names).toContainEqual(["admin", "ban"]);
    expect(names).toContainEqual(["moderator", "kick"]);
  });
});
