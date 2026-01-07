import type { DefaultContext } from "../core/telegram.types";
import type { ReplyContext } from "../middleware/reply.middleware";

export async function clear_reply<Type extends Record<string, unknown>>(ctx: DefaultContext & ReplyContext<Type>): Promise<void> {
  await ctx.deleteMessage(ctx.update.message.message_id);
  await ctx.deleteMessage(ctx.update.message.reply_to_message.message_id);
}
