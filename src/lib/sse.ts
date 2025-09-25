export type OrderEvent = { type: string; payload?: unknown };
export type Listener = (event: OrderEvent) => void;

// In-memory listeners set (OK for single-region preview; replace with proper pub/sub for production)
export const orderListeners = new Set<Listener>();

export function publishOrderEvent(event: OrderEvent) {
  for (const l of Array.from(orderListeners)) {
    try { l(event); } catch { /* ignore */ }
  }
}

