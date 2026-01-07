import type { DefaultContext } from "../core/telegram.types";

export function get_callback_data<Type extends Record<string, string>>(ctx: DefaultContext, keys: (keyof Type)[]): Type | null {
  const callback_data = ctx.update.callback_query?.data;
  if (typeof callback_data !== "string") return null;

  const result: Type = {} as Type;

  const data = callback_data.trim().split(":");
  for (let index = 0; index < data.length; index++) {
    const element = data[index];
    const key = keys[index];
    if (typeof key === "string" && typeof element === "string") (result as Record<string, string>)[key] = element;
  }
  return result;
}
