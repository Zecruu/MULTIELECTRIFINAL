// Cart management utilities using localStorage

export type CartItem = {
  productId: string;
  name_en: string;
  name_es: string;
  price: number;
  quantity: number;
  image?: string;
};

export type Cart = {
  items: CartItem[];
  updatedAt: string;
};

const CART_KEY = "multielectric_cart";

export function getCart(): Cart {
  if (typeof window === "undefined") return { items: [], updatedAt: new Date().toISOString() };
  
  try {
    const stored = localStorage.getItem(CART_KEY);
    if (!stored) return { items: [], updatedAt: new Date().toISOString() };
    return JSON.parse(stored);
  } catch {
    return { items: [], updatedAt: new Date().toISOString() };
  }
}

export function saveCart(cart: Cart): void {
  if (typeof window === "undefined") return;
  
  cart.updatedAt = new Date().toISOString();
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
  
  // Dispatch custom event so other components can react
  window.dispatchEvent(new CustomEvent("cart-updated", { detail: cart }));
}

export function addToCart(item: Omit<CartItem, "quantity">, quantity: number = 1): Cart {
  const cart = getCart();
  const existing = cart.items.find(i => i.productId === item.productId);
  
  if (existing) {
    existing.quantity += quantity;
  } else {
    cart.items.push({ ...item, quantity });
  }
  
  saveCart(cart);
  return cart;
}

export function updateCartItemQuantity(productId: string, quantity: number): Cart {
  const cart = getCart();
  const item = cart.items.find(i => i.productId === productId);
  
  if (item) {
    if (quantity <= 0) {
      cart.items = cart.items.filter(i => i.productId !== productId);
    } else {
      item.quantity = quantity;
    }
  }
  
  saveCart(cart);
  return cart;
}

export function removeFromCart(productId: string): Cart {
  const cart = getCart();
  cart.items = cart.items.filter(i => i.productId !== productId);
  saveCart(cart);
  return cart;
}

export function clearCart(): Cart {
  const cart: Cart = { items: [], updatedAt: new Date().toISOString() };
  saveCart(cart);
  return cart;
}

export function getCartTotal(cart: Cart): number {
  return cart.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
}

export function getCartItemCount(cart: Cart): number {
  return cart.items.reduce((sum, item) => sum + item.quantity, 0);
}

