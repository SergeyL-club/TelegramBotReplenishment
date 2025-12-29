import { user_middleware, type HasUser, type UserContext } from "../middleware/user.middleware";
import type { UserContextAdapter } from "../databases/user.context";
import type { Middleware } from "../core/telegram.composer";

export type UserBase = {
  user_id: number;
  chat_id: number;
  username: string;
};

export class UserService {
  static async get_base_info(user_context: UserContextAdapter, user_id: number): Promise<UserBase | null> {
    const data = await user_context.get<UserBase>(user_id);
    if (!data || typeof data !== "object" || !("user_id" in data) || !("chat_id" in data) || !("username" in data)) return null;
    return data as UserBase;
  }

  static modify_user_middleware<Type extends HasUser>(user_context: UserContextAdapter): Middleware<Type, UserContext> {
    return async (ctx) => {
      const msgCtx = "user" in ctx ? (ctx as UserContext) : await user_middleware<Type>()(ctx);
      if (!msgCtx || typeof msgCtx !== "object") {
        if (!ctx.from || typeof ctx.from !== "object") return;
        if (!("id" in ctx.from) || typeof ctx.from.id !== "number") return;
        const context = await user_context.get<UserBase>(ctx.from.id);
        if (!context || typeof context !== "object") return;
        if (!("user_id" in context) || !("chat_id" in context) || !("username" in context)) return;
        return { user: { id: context.user_id, chat_id: context.chat_id, username: context.username } };
      } else {
        await user_context.set<UserBase>(msgCtx.user.id, {
          user_id: msgCtx.user.id,
          chat_id: msgCtx.user.chat_id,
          username: msgCtx.user.username,
        });
        return { user: msgCtx.user };
      }
    };
  }
}
