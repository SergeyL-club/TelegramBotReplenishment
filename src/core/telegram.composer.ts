export type Middleware<Ctx extends object, Added extends object> = (
  ctx: Ctx
) => Promise<Added | void> | Added | void;

export type NonVoid<T> = Exclude<T, void | undefined>;

export class Composer<Ctx extends object> {
  private readonly middlewares: Middleware<Ctx, object>[]; // object вместо any

  public constructor(middlewares: Middleware<Ctx, object>[] = []) {
    this.middlewares = middlewares;
  }

  public use<Added extends object>(
    middleware: Middleware<Ctx, Added>
  ): Composer<Ctx & NonVoid<Added>> {
    return new Composer<Ctx & NonVoid<Added>>([...this.middlewares, middleware as Middleware<Ctx, object>]);
  }

  public handler(fn: (ctx: Ctx) => void | Promise<void>): (ctx: Ctx) => Promise<void> {
    return async (ctx: Ctx) => {
      const addedObjects: Record<string, unknown> = {};

      const proxyCtx = new Proxy(ctx, {
        set(target, prop, value) {
          if (typeof prop === "string" || typeof prop === "number") {
            addedObjects[prop] = value;
          }
          return true;
        },
        get(target, prop, receiver) {
          if ((typeof prop === "string" || typeof prop === "number") && prop in addedObjects) {
            return addedObjects[prop];
          }
          return Reflect.get(target, prop, receiver);
        },
        has(target, prop) {
          if (typeof prop === "string" || typeof prop === "number") {
            return prop in addedObjects || prop in target;
          }
          return prop in target;
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

      for (const mw of this.middlewares) {
        const added = await mw(proxyCtx as Ctx);
        if (added && typeof added === "object") {
          Object.assign(addedObjects, added);
        }
      }

      await fn(proxyCtx as Ctx);
    };
  }
}
