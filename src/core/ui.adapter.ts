import type { Context } from "telegraf";
import type { ReplyStorageAdapter } from "./reply_storage.adapter";
import type { ContextStorageAdapter } from "./user_storage.adapter";

export function deep_merge(a: Record<string, unknown>, b: Record<string, unknown>, strict = false): Record<string, unknown> {
  const result = { ...a };

  for (const key in b) {
    if (b[key] === undefined) {
      // удаляем ключ
      delete result[key];
      continue;
    }

    if (strict) {
      // в strict режиме просто заменяем
      result[key] = b[key];
      continue;
    }

    if (Array.isArray(result[key]) && Array.isArray(b[key])) {
      // объединяем массивы без дублей
      result[key] = Array.from(new Set([...result[key], ...b[key]]));
    } else if (
      result[key] &&
      typeof result[key] === "object" &&
      !Array.isArray(result[key]) &&
      typeof b[key] === "object" &&
      !Array.isArray(b[key])
    ) {
      // рекурсивно сливаем объекты
      result[key] = deep_merge(result[key] as Record<string, unknown>, b[key] as Record<string, unknown>);
    } else {
      // если ключ новый или тип не совпадает — заменяем
      result[key] = b[key];
    }
  }

  return result;
}

// function set_by_path(obj: Record<string, any>, path: (string | number)[], value: any) {
//   let current = obj;
//   for (let i = 0; i < path.length - 1; i++) {
//     const key = path[i];
//     if (key === undefined) continue;
//     if (!(key in current)) current[key] = {}; // создаём объект, если нет
//     current = current[key];
//   }
//   current[path[path.length - 1]!] = value;
// }

export type UIInstruction = {
  answerCB?: boolean;
  text?: string;
  inline_keyboard?: { text: string; callback_data: string }[][];
  force_reply?: boolean;
  edit_message_id?: number;
  user_id?: number;
  bind_data?: unknown; // данные для привязки ответа
  delete_at?: number; // timestamp, когда сообщение можно удалить
  post?: <T extends Record<string, unknown>>(data: {
    message_id: number;
    context: T;
  }) => (Promise<void> | void) | (Promise<{ context: T }> | { context: T });
};

export class UIAdapter {
  constructor(
    private readonly context_adapter: ContextStorageAdapter,
    private readonly reply_adapter: ReplyStorageAdapter
  ) {}

  public async render(ctx: Context, instructions: UIInstruction | UIInstruction[]): Promise<void> {
    instructions = instructions instanceof Array ? instructions : [instructions];
    for (const instruction of instructions) {
      // console.log(instruction);
      let sent_message;
      if (instruction.answerCB) await ctx.answerCbQuery();
      if (instruction.edit_message_id && instruction.text) {
        const { chat_id } = instruction.user_id
          ? (((await this.context_adapter.get(instruction.user_id)) as { chat_id: number } | null) ?? { chat_id: ctx.chat!.id })
          : { chat_id: ctx.chat!.id };
        try {
          sent_message = await ctx.telegram.editMessageText(
            chat_id,
            instruction.edit_message_id,
            undefined,
            instruction.text, // text ОБЯЗАТЕЛЕН
            instruction.inline_keyboard ? { reply_markup: { inline_keyboard: instruction.inline_keyboard } } : undefined
          );
        } catch (e: unknown) {
          if (e instanceof Error && e.message.includes("message is not modified")) sent_message = instruction.edit_message_id;
        }
      } else if (instruction.text) {
        const { chat_id } = instruction.user_id
          ? (((await this.context_adapter.get(instruction.user_id)) as { chat_id: number } | null) ?? { chat_id: ctx.chat!.id })
          : { chat_id: ctx.chat!.id };
        sent_message = await ctx.telegram.sendMessage(chat_id, instruction.text ?? "", {
          reply_markup: {
            inline_keyboard: instruction.inline_keyboard ?? [],
            ...(instruction.force_reply ? { force_reply: true } : {}),
          },
        });
      }

      // если есть bind_data — сохраняем привязку
      if (instruction.bind_data) {
        const message_id = ((sent_message as any)?.message_id as number) ?? instruction.edit_message_id!;
        const bind_data = { ...instruction.bind_data, bind_id: message_id };
        await this.reply_adapter.bind(ctx.chat!.id, ctx.from!.id, message_id, bind_data, instruction.delete_at);
      }

      // если есть context значит надо менять его
      // if (instruction.context) {
      //   const message_id = (sent_message as any)?.message_id ?? instruction.edit_message_id!;
      //   const memory = (await this.context_adapter.get(instruction.context.user_id ?? ctx.from!.id)) ?? {};
      //   if (instruction.context.bind_id) set_by_path(data, instruction.context.bind_id, message_id);
      //   await this.context_adapter.set(instruction.context.user_id ?? ctx.from!.id, data);
      // }

      // post обработка
      if (instruction.post) {
        const message_id = (sent_message as any)?.message_id ?? instruction.edit_message_id!;
        let memory = (await this.context_adapter.get(ctx.from!.id)) ?? {};
        const data = await instruction.post({ message_id, context: memory });
        if (data && "context" in data) {
          memory = (await this.context_adapter.get(ctx.from!.id)) ?? {};
          await this.context_adapter.set(ctx.from!.id, deep_merge(memory, data.context));
        }
      }
    }
  }

  public async cleanup(ctx: Context, instructions: UIInstruction | UIInstruction[]): Promise<void> {
    instructions = instructions instanceof Array ? instructions : [instructions];
    // console.log(instructions);
    for (const instruction of instructions)
      if (instruction.edit_message_id) {
        await ctx.telegram.deleteMessage(ctx.chat!.id, instruction.edit_message_id);
        const data = await this.reply_adapter.get(ctx.chat!.id, ctx.from!.id, instruction.edit_message_id);
        if (data) await this.reply_adapter.delete(ctx.chat!.id, ctx.from!.id, instruction.edit_message_id);
      }
  }
}
