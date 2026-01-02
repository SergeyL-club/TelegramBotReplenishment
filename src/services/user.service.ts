import { DefaultContext } from "../core/telegram.types";
import { UserContextAdapter } from "../databases/user.context";

export type UserData = {
  id: number;
  chat_id: number;
  username: string;
};

export class UserService {
  static async save_user_data(user_context: UserContextAdapter, ctx: DefaultContext): Promise<void> {
    const user_id = ctx.update.callback_query
      ? ctx.update.callback_query.from.id
      : ctx.update.message
        ? ctx.update.message.from.id
        : ctx.from?.id;
    if (typeof user_id !== "number") return;
    const chat_id = ctx.update.callback_query
      ? ctx.update.callback_query.chat.id
      : ctx.update.message
        ? ctx.update.message.chat.id
        : ctx.chat?.id;
    if (typeof chat_id !== "number") return;
    const username = ctx.update.callback_query
      ? ctx.update.callback_query.from.username
      : ctx.update.message
        ? ctx.update.message.from.username
        : ctx.from?.username;
    if (typeof username !== "string") return;
    await user_context.set<{ user: UserData }>(user_id, { user: { id: user_id, chat_id: chat_id, username: username } });
  }

  static async get_user_data(user_context: UserContextAdapter, user_id: number): Promise<UserData | null> {
    const data = await user_context.get<{ user: UserData }>(user_id);
    if (typeof data !== "object" || data === null || typeof data.user !== "object") return null;
    return data.user;
  }
}
