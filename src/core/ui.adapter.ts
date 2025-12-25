import type { Context } from "telegraf";
import type { ReplyStorageAdapter } from "./reply_storage.adapter";
import type { ContextStorageAdapter } from "./user_storage.adapter";

export type UIInstruction = {
  answerCB?: true;
  text?: string;
  inline_keyboard?: { text: string; callback_data: string }[][];
  force_reply?: boolean;
  edit_message_id?: number;
  bind_data?: unknown; // данные для привязки ответа
  delete_at?: number; // timestamp, когда сообщение можно удалить
  context?: {
    user_id?: number;
    data: Record<string, unknown>;
  };
};

export class UIAdapter {
  constructor(
    private readonly context_adapter: ContextStorageAdapter,
    private readonly reply_adapter: ReplyStorageAdapter
  ) {}

  public async render(ctx: Context, instructions: UIInstruction | UIInstruction[]): Promise<void> {
    instructions = instructions instanceof Array ? instructions : [instructions];
    for (const instruction of instructions) {
      let sent_message;
      if (instruction.answerCB) await ctx.answerCbQuery();
      if (instruction.edit_message_id) {
        sent_message = await ctx.editMessageText(instruction.text ?? "", {
          reply_markup: { inline_keyboard: instruction.inline_keyboard ?? [] },
        });
      } else {
        sent_message = await ctx.reply(instruction.text ?? "", {
          reply_markup: {
            inline_keyboard: instruction.inline_keyboard ?? [],
            ...(instruction.force_reply ? { force_reply: true } : {}),
          },
        });

        // если есть bind_data — сохраняем привязку
        if (instruction.bind_data) {
          await this.reply_adapter.bind(ctx.chat!.id, ctx.from!.id, sent_message.message_id, instruction.bind_data, instruction.delete_at);
        }

        // если есть context значит надо менять его
        if (instruction.context) {
          await this.context_adapter.set(instruction.context.user_id ?? ctx.from!.id, instruction.context.data);
        }
      }
    }
  }

  public async cleanup(ctx: Context, instructions: UIInstruction | UIInstruction[]): Promise<void> {
    instructions = instructions instanceof Array ? instructions : [instructions];
    for (const instruction of instructions)
      if (instruction.edit_message_id) {
        await ctx.deleteMessage(instruction.edit_message_id);
      }
  }
}
