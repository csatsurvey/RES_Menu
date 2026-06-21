import { db } from './firebase';
import { ref, set, get, push, update, onValue, off, remove } from 'firebase/database';

// ============================================================
// TYPES
// ============================================================

export interface Branch {
  id: string;
  name: string;
  address: string;
  managerPin: string;
  createdAt: number;
}

export interface Table {
  id: string;
  number: number;
  status: 'available' | 'occupied';
}

export interface Staff {
  id: string;
  name: string;
  role: 'chef' | 'waiter';
  pin: string;
}

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  image: string;
  available: boolean;
  allergens?: string;
}

export interface OrderItem {
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
}

export interface Order {
  id: string;
  tableNumber: number;
  items: OrderItem[];
  status: 'pending' | 'preparing' | 'ready' | 'served';
  customerPhone?: string;
  notes?: string;
  totalAmount: number;
  createdAt: number;
  updatedAt: number;
}

export interface Survey {
  id: string;
  tableNumber: number;
  orderId?: string;
  // Дэлгэрэнгүй асуултууд (1-5 оноо)
  foodQuality: number;   // Хоолны амт, чанар
  service: number;       // Үйлчилгээний чанар
  staffAttitude: number; // Ажилчдын хандлага
  ambiance: number;      // Цэвэрлэгээ, орчин
  priceValue: number;    // Үнэ-чанарын харьцаа
  // Нэгдсэн дүн
  csat: number;          // дээрх 5-н дундаж
  nps: number;           // 0-10
  feedback: string;
  phone?: string;
  resolved: boolean;
  resolvedNote?: string;
  createdAt: number;
}

// ============================================================
// BRANCH
// ============================================================

export const createBranch = async (
  name: string,
  address: string,
  managerPin: string
): Promise<string> => {
  const branchRef = push(ref(db, 'branches'));
  await set(branchRef, { name, address, managerPin, createdAt: Date.now() });
  return branchRef.key!;
};

export const getAllBranches = async (): Promise<Branch[]> => {
  const snap = await get(ref(db, 'branches'));
  if (!snap.exists()) return [];
  return Object.entries(snap.val()).map(([id, val]: any) => ({ id, ...val }));
};

export const getBranch = async (branchId: string): Promise<Branch | null> => {
  const snap = await get(ref(db, `branches/${branchId}`));
  if (!snap.exists()) return null;
  return { id: branchId, ...snap.val() };
};

export const verifyManagerPin = async (branchId: string, pin: string): Promise<boolean> => {
  const snap = await get(ref(db, `branches/${branchId}/managerPin`));
  return snap.exists() && snap.val() === pin;
};

export const updateBranch = async (
  branchId: string,
  data: Partial<Pick<Branch, 'name' | 'address' | 'managerPin'>>
): Promise<void> => {
  await update(ref(db, `branches/${branchId}`), data);
};

// ============================================================
// TABLES
// ============================================================

export const setTables = async (branchId: string, count: number): Promise<void> => {
  const existing = await get(ref(db, `branches/${branchId}/tables`));
  const existingData: Record<string, any> = existing.exists() ? existing.val() : {};
  const tables: Record<string, any> = {};
  for (let i = 1; i <= count; i++) {
    const key = `table_${i}`;
    tables[key] = existingData[key] || { number: i, status: 'available' };
  }
  await set(ref(db, `branches/${branchId}/tables`), tables);
};

export const getTables = async (branchId: string): Promise<Table[]> => {
  const snap = await get(ref(db, `branches/${branchId}/tables`));
  if (!snap.exists()) return [];
  return Object.entries(snap.val())
    .map(([id, val]: any) => ({ id, ...val }))
    .sort((a, b) => a.number - b.number);
};

export const updateTableStatus = async (
  branchId: string,
  tableId: string,
  status: 'available' | 'occupied'
): Promise<void> => {
  await update(ref(db, `branches/${branchId}/tables/${tableId}`), { status });
};

export const subscribeToTables = (
  branchId: string,
  callback: (tables: Table[]) => void
): (() => void) => {
  const r = ref(db, `branches/${branchId}/tables`);
  const handler = onValue(r, (snap) => {
    if (!snap.exists()) { callback([]); return; }
    const tables = Object.entries(snap.val())
      .map(([id, val]: any) => ({ id, ...val }))
      .sort((a, b) => a.number - b.number);
    callback(tables);
  });
  return () => off(r, 'value', handler);
};

// ============================================================
// STAFF
// ============================================================

export const addStaff = async (
  branchId: string,
  name: string,
  role: 'chef' | 'waiter',
  pin: string
): Promise<string> => {
  const staffRef = push(ref(db, `branches/${branchId}/staff`));
  await set(staffRef, { name, role, pin });
  return staffRef.key!;
};

export const getStaff = async (branchId: string): Promise<Staff[]> => {
  const snap = await get(ref(db, `branches/${branchId}/staff`));
  if (!snap.exists()) return [];
  return Object.entries(snap.val()).map(([id, val]: any) => ({ id, ...val }));
};

export const removeStaff = async (branchId: string, staffId: string): Promise<void> => {
  await remove(ref(db, `branches/${branchId}/staff/${staffId}`));
};

export const verifyStaffPin = async (
  branchId: string,
  pin: string
): Promise<Staff | null> => {
  const snap = await get(ref(db, `branches/${branchId}/staff`));
  if (!snap.exists()) return null;
  const found = Object.entries(snap.val()).find(([_, val]: any) => val.pin === pin);
  if (!found) return null;
  return { id: found[0], ...(found[1] as any) };
};

// ============================================================
// MENU
// ============================================================

export const addMenuItem = async (
  branchId: string,
  item: Omit<MenuItem, 'id'>
): Promise<string> => {
  const itemRef = push(ref(db, `branches/${branchId}/menu`));
  await set(itemRef, item);
  return itemRef.key!;
};

export const getMenu = async (branchId: string): Promise<MenuItem[]> => {
  const snap = await get(ref(db, `branches/${branchId}/menu`));
  if (!snap.exists()) return [];
  return Object.entries(snap.val()).map(([id, val]: any) => ({ id, ...val }));
};

export const updateMenuItem = async (
  branchId: string,
  itemId: string,
  data: Partial<MenuItem>
): Promise<void> => {
  await update(ref(db, `branches/${branchId}/menu/${itemId}`), data);
};

export const subscribeToMenu = (
  branchId: string,
  callback: (items: MenuItem[]) => void
): (() => void) => {
  const r = ref(db, `branches/${branchId}/menu`);
  const handler = onValue(r, (snap) => {
    if (!snap.exists()) { callback([]); return; }
    callback(Object.entries(snap.val()).map(([id, val]: any) => ({ id, ...val })));
  });
  return () => off(r, 'value', handler);
};

// ============================================================
// ORDERS
// ============================================================

export const createOrder = async (
  branchId: string,
  tableNumber: number,
  items: OrderItem[],
  customerPhone?: string,
  notes?: string
): Promise<string> => {
  const orderRef = push(ref(db, `branches/${branchId}/orders`));
  const now = Date.now();
  const totalAmount = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  await set(orderRef, {
    tableNumber,
    items,
    status: 'pending',
    customerPhone: customerPhone || null,
    notes: notes || null,
    totalAmount,
    createdAt: now,
    updatedAt: now,
  });
  return orderRef.key!;
};

export const updateOrderStatus = async (
  branchId: string,
  orderId: string,
  status: Order['status']
): Promise<void> => {
  await update(ref(db, `branches/${branchId}/orders/${orderId}`), {
    status,
    updatedAt: Date.now(),
  });
};

// Real-time: all orders for kitchen/manager
export const subscribeToOrders = (
  branchId: string,
  callback: (orders: Order[]) => void
): (() => void) => {
  const r = ref(db, `branches/${branchId}/orders`);
  const handler = onValue(r, (snap) => {
    if (!snap.exists()) { callback([]); return; }
    const orders = Object.entries(snap.val())
      .map(([id, val]: any) => ({ id, ...val }))
      .sort((a: Order, b: Order) => b.createdAt - a.createdAt);
    callback(orders);
  });
  return () => off(r, 'value', handler);
};

// Real-time: specific table orders for customer
export const subscribeToTableOrders = (
  branchId: string,
  tableNumber: number,
  callback: (orders: Order[]) => void
): (() => void) => {
  const r = ref(db, `branches/${branchId}/orders`);
  const handler = onValue(r, (snap) => {
    if (!snap.exists()) { callback([]); return; }
    const orders = Object.entries(snap.val())
      .map(([id, val]: any) => ({ id, ...val }))
      .filter((o: Order) => o.tableNumber === tableNumber)
      .sort((a: Order, b: Order) => b.createdAt - a.createdAt);
    callback(orders);
  });
  return () => off(r, 'value', handler);
};

// ============================================================
// SURVEYS & COMPLAINTS
// ============================================================

export const createSurvey = async (
  branchId: string,
  data: {
    tableNumber: number;
    orderId?: string;
    foodQuality: number;
    service: number;
    staffAttitude: number;
    ambiance: number;
    priceValue: number;
    csat: number;
    nps: number;
    feedback: string;
    phone?: string;
  }
): Promise<string> => {
  const surveyRef = push(ref(db, `branches/${branchId}/surveys`));
  await set(surveyRef, { ...data, resolved: false, createdAt: Date.now() });
  return surveyRef.key!;
};

export const subscribeToSurveys = (
  branchId: string,
  callback: (surveys: Survey[]) => void
): (() => void) => {
  const r = ref(db, `branches/${branchId}/surveys`);
  const handler = onValue(r, (snap) => {
    if (!snap.exists()) { callback([]); return; }
    const surveys = Object.entries(snap.val())
      .map(([id, val]: any) => ({ id, ...val }))
      .sort((a: Survey, b: Survey) => b.createdAt - a.createdAt);
    callback(surveys);
  });
  return () => off(r, 'value', handler);
};

export const setSurveyResolved = async (
  branchId: string,
  surveyId: string,
  resolved: boolean,
  resolvedNote?: string
): Promise<void> => {
  await update(ref(db, `branches/${branchId}/surveys/${surveyId}`), {
    resolved,
    resolvedNote: resolvedNote || null,
  });
};

// ============================================================
// HELPERS
// ============================================================

export const formatPrice = (price: number): string =>
  price.toLocaleString('mn-MN') + '₮';

export const formatTime = (timestamp: number): string => {
  const d = new Date(timestamp);
  return d.toLocaleTimeString('mn-MN', { hour: '2-digit', minute: '2-digit' });
};

export const formatDate = (timestamp: number): string => {
  const d = new Date(timestamp);
  return d.toLocaleDateString('mn-MN');
};

export const ORDER_STATUS_LABELS: Record<Order['status'], string> = {
  pending: 'Хүлээгдэж байна',
  preparing: 'Бэлтгэж байна',
  ready: 'Бэлэн болсон',
  served: 'Хүргэгдсэн',
};

export const ORDER_STATUS_COLORS: Record<Order['status'], string> = {
  pending: '#F59E0B',
  preparing: '#3B82F6',
  ready: '#10B981',
  served: '#6B7280',
};

// ── Menu item CRUD (complete) ────────────────────────
export const saveMenuItem = async (
  branchId: string,
  item: Omit<MenuItem, 'id'>,
  itemId?: string
): Promise<string> => {
  if (itemId) {
    await update(ref(db, `branches/${branchId}/menu/${itemId}`), item);
    return itemId;
  }
  const r = push(ref(db, `branches/${branchId}/menu`));
  await set(r, item);
  return r.key!;
};

export const deleteMenuItem = async (
  branchId: string,
  itemId: string
): Promise<void> => {
  await remove(ref(db, `branches/${branchId}/menu/${itemId}`));
};

// ── Image compress to base64 (browser-side) ─────────
export const compressImage = (
  file: File,
  maxWidth = 700,
  quality = 0.78
): Promise<string> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      let { width, height } = img;
      if (width > maxWidth) { height = Math.round((height * maxWidth) / width); width = maxWidth; }
      const canvas = document.createElement('canvas');
      canvas.width = width; canvas.height = height;
      canvas.getContext('2d')?.drawImage(img, 0, 0, width, height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Image load failed')); };
    img.src = url;
  });

// ── Branch Settings (survey questions, QR text) ──────────────
export interface BranchSettings {
  surveyQuestions?: string[];
  qrTopText?: string;
  qrBottomText?: string;
}

export const getSettings = async (branchId: string): Promise<BranchSettings> => {
  const snap = await get(ref(db, `branches/${branchId}/settings`));
  return snap.exists() ? snap.val() : {};
};

export const saveSettings = async (branchId: string, s: Partial<BranchSettings>): Promise<void> => {
  await update(ref(db, `branches/${branchId}/settings`), s);
};

export const subscribeToSettings = (
  branchId: string,
  cb: (s: BranchSettings) => void
): (() => void) => {
  const r = ref(db, `branches/${branchId}/settings`);
  const h = onValue(r, snap => cb(snap.exists() ? snap.val() : {}));
  return () => off(r, 'value', h);
};

// ── Staff (extended: active, admin role) ─────────────────────
export const updateStaff = async (
  branchId: string,
  staffId: string,
  data: Partial<{ name: string; role: string; pin: string; active: boolean }>
): Promise<void> => {
  await update(ref(db, `branches/${branchId}/staff/${staffId}`), data);
};

// ── Activity Log ──────────────────────────────────────────────
export interface ActivityLog {
  id: string;
  staffName: string;
  action: string;
  details: string;
  createdAt: number;
}

export const logActivity = async (
  branchId: string,
  staffName: string,
  action: string,
  details = ''
): Promise<void> => {
  try {
    const r = push(ref(db, `branches/${branchId}/logs`));
    await set(r, { staffName, action, details, createdAt: Date.now() });
  } catch { /* silent */ }
};

export const subscribeToLogs = (
  branchId: string,
  cb: (logs: ActivityLog[]) => void
): (() => void) => {
  const r = ref(db, `branches/${branchId}/logs`);
  const h = onValue(r, snap => {
    if (!snap.exists()) { cb([]); return; }
    const logs = Object.entries(snap.val())
      .map(([id, val]: any) => ({ id, ...val }))
      .sort((a: ActivityLog, b: ActivityLog) => b.createdAt - a.createdAt)
      .slice(0, 150);
    cb(logs);
  });
  return () => off(r, 'value', h);
};
