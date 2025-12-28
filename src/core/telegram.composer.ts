export type Middleware<Ctx, Added = {}> = (ctx: Ctx) => Promise<Added | void> | Added | void;
export type NonVoid<T> = T extends void | undefined ? never : T;

export class Composer<Ctx extends object> {
  private readonly middlewares: Middleware<any, any>[];

  public constructor(middlewares: Middleware<any, any>[] = []) {
    this.middlewares = middlewares;
  }

  public use<Added extends object | void>(middleware: Middleware<Ctx, Added>): Composer<Ctx & NonVoid<Added>> {
    return new Composer<Ctx & NonVoid<Added>>([...this.middlewares, middleware]);
  }

  public handler(fn: (ctx: Ctx) => void | Promise<void>): (ctx: Ctx) => Promise<void> {
    return async (ctx: Ctx) => {
      const addedObjects: Record<string, any> = {};

      // Proxy, который перехватывает записи
      const proxyCtx = new Proxy(ctx, {
        get(target, prop, receiver) {
          if ((typeof prop === "string" || typeof prop === "number") && prop in addedObjects) {
            // Если свойство добавлено middleware — берём из addedObjects
            return addedObjects[prop];
          }
          // Иначе берём оригинальное значение из ctx
          return Reflect.get(target, prop, receiver);
        },
        set(_, prop, value) {
          if (typeof prop === "string" || typeof prop === "number") {
            addedObjects[prop] = value; // всё новое — в additions
          }
          return true;
        },
        has(target, prop) {
          return typeof prop === "string" || typeof prop === "number" ? prop in addedObjects || prop in target : prop in target;
        },
        getOwnPropertyDescriptor(target, prop) {
          if ((typeof prop === "string" || typeof prop === "number") && prop in addedObjects) {
            return { configurable: true, enumerable: true, value: addedObjects[prop] };
          }
          return Object.getOwnPropertyDescriptor(target, prop);
        },
        ownKeys(target) {
          return Array.from(new Set([...Reflect.ownKeys(target), ...Object.keys(addedObjects)]));
        },
      });

      // Выполняем middleware
      for (const mw of this.middlewares) {
        const added = await mw(proxyCtx as Ctx);
        if (added && typeof added === "object") {
          Object.assign(addedObjects, added);
        } else return;
      }

      // Передаём handler proxyCtx, где уже видны все additions
      await fn(proxyCtx as Ctx);
    };
  }
}
