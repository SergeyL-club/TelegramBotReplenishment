import type { Context } from "telegraf";
import type { ReplyStorageAdapter } from "./reply_storage.adapter";
import type { ContextStorageAdapter } from "./user_storage.adapter";

function deep_merge(a: Record<string, any>, b: Record<string, any>, strict = false): Record<string, any> {
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
      result[key] = deep_merge(result[key], b[key]);
    } else {
      // если ключ новый или тип не совпадает — заменяем
      result[key] = b[key];
    }
  }

  return result;
}

function set_by_path(obj: Record<string, any>, path: (string | number)[], value: any) {
  let current = obj;
  for (let i = 0; i < path.length - 1; i++) {
    const key = path[i];
    if (key === undefined) continue;
    if (!(key in current)) current[key] = {}; // создаём объект, если нет
    current = current[key];
  }
  current[path[path.length - 1]!] = value;
}

export type UIInstruction = {
  answerCB?: true;
  text?: string;
  inline_keyboard?: { text: string; callback_data: string }[][];
  force_reply?: true;
  edit_message_id?: number;
  bind_id?: true;
  bind_data?: unknown; // данные для привязки ответа
  delete_at?: number; // timestamp, когда сообщение можно удалить
  modify_context?: true;
  context?: {
    strict?: true;
    bind_id?: (string | number)[];
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
      console.log(instruction);
      let sent_message;
      if (instruction.answerCB) await ctx.answerCbQuery();
      if (instruction.edit_message_id && instruction.text) {
        sent_message = await ctx.telegram.editMessageText(
          ctx.chat!.id,
          instruction.edit_message_id,
          undefined,
          instruction.text, // text ОБЯЗАТЕЛЕН
          instruction.inline_keyboard ? { reply_markup: { inline_keyboard: instruction.inline_keyboard } } : undefined
        );
      } else if (instruction.text) {
        sent_message = await ctx.reply(instruction.text ?? "", {
          reply_markup: {
            inline_keyboard: instruction.inline_keyboard ?? [],
            ...(instruction.force_reply ? { force_reply: true } : {}),
          },
        });
      }

      // если есть bind_data — сохраняем привязку
      if (instruction.bind_data) {
        const message_id = (sent_message as any)?.message_id ?? instruction.edit_message_id!;
        const bind_data = instruction.bind_id ? { ...instruction.bind_data, bind_id: message_id } : instruction.bind_data;
        await this.reply_adapter.bind(ctx.chat!.id, ctx.from!.id, message_id, bind_data, instruction.delete_at);
      }

      // если есть context значит надо менять его
      if (instruction.context) {
        const message_id = (sent_message as any)?.message_id ?? instruction.edit_message_id!;
        const memory = (await this.context_adapter.get(instruction.context.user_id ?? ctx.from!.id)) ?? {};
        const data = instruction.modify_context
          ? deep_merge(memory, instruction.context.data, instruction.context.strict)
          : instruction.context.data;
        if (instruction.context.bind_id) set_by_path(data, instruction.context.bind_id, message_id);
        await this.context_adapter.set(instruction.context.user_id ?? ctx.from!.id, data);
      }
    }
  }

  public async cleanup(ctx: Context, instructions: UIInstruction | UIInstruction[]): Promise<void> {
    instructions = instructions instanceof Array ? instructions : [instructions];
    for (const instruction of instructions)
      if (instruction.edit_message_id) {
        await ctx.deleteMessage(instruction.edit_message_id);
        const data = await this.reply_adapter.get(ctx.chat!.id, ctx.from!.id, instruction.edit_message_id);
        if (data) await this.reply_adapter.delete(ctx.chat!.id, ctx.from!.id, instruction.edit_message_id);
      }
  }
}
