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
  role: 'chef' | 'waiter' | 'admin';
  pin: string;
  active?: boolean;
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
  role: 'chef' | 'waiter' | 'admin',
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
  data: Partial<{ name: string; role: 'chef' | 'waiter' | 'admin'; pin: string; active: boolean }>
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
  } catch(e) { /* silent */ }
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

// ── Categories ────────────────────────────────────────────────
export interface Category {
  id: string;
  name: string;
  visible: boolean;
  sortOrder: number;
}

export const saveCategory = async (
  branchId: string, name: string, catId?: string
): Promise<string> => {
  if (catId) {
    await update(ref(db, `branches/${branchId}/categories/${catId}`), { name });
    return catId;
  }
  const r = push(ref(db, `branches/${branchId}/categories`));
  await set(r, { name, visible: true, sortOrder: Date.now() });
  return r.key!;
};

export const updateCategory = async (
  branchId: string, catId: string,
  data: Partial<Pick<Category, 'name' | 'visible' | 'sortOrder'>>
): Promise<void> => {
  await update(ref(db, `branches/${branchId}/categories/${catId}`), data);
};

export const deleteCategory = async (branchId: string, catId: string): Promise<void> => {
  await remove(ref(db, `branches/${branchId}/categories/${catId}`));
};

export const subscribeToCategories = (
  branchId: string,
  cb: (cats: Category[]) => void
): (() => void) => {
  const r = ref(db, `branches/${branchId}/categories`);
  const h = onValue(r, snap => {
    if (!snap.exists()) { cb([]); return; }
    cb(Object.entries(snap.val())
      .map(([id, val]: any) => ({ id, ...val }))
      .sort((a: Category, b: Category) => a.sortOrder - b.sortOrder));
  });
  return () => off(r, 'value', h);
};

// ── Sales Report ──────────────────────────────────────────────
export interface ProductStat {
  name: string;
  revenue: number;
  qty: number;
}
export interface DayStat {
  date: string;
  revenue: number;
  orders: number;
}
export interface SalesReportData {
  totalRevenue: number;
  orderCount: number;
  avgOrder: number;
  products: ProductStat[];
  dailyRevenue: { date: string; revenue: number }[];
}

export const getSalesReport = async (
  branchId: string,
  fromMs: number,
  toMs = Date.now()
): Promise<SalesReportData> => {
  const snap = await get(ref(db, `branches/${branchId}/orders`));
  const empty: SalesReportData = { totalRevenue:0, orderCount:0, avgOrder:0, products:[], dailyRevenue:[] };
  if (!snap.exists()) return empty;

  const orders: Order[] = Object.values(snap.val()).filter(
    (o: any) => o.createdAt >= fromMs && o.createdAt <= toMs && o.status === 'served'
  ) as Order[];

  const totalRevenue = orders.reduce((s, o) => s + (o.totalAmount || 0), 0);

  // By product
  const pm: Record<string, { revenue: number; units: number }> = {};
  orders.forEach(o => o.items?.forEach(item => {
    if (!pm[item.name]) pm[item.name] = { revenue: 0, units: 0 };
    pm[item.name].revenue += item.price * item.quantity;
    pm[item.name].units += item.quantity;
  }));
  const products = Object.entries(pm)
    .map(([name, d]) => ({ name, revenue: d.revenue, qty: d.units }))
    .sort((a, b) => b.revenue - a.revenue);

  // By date
  const dm: Record<string, { revenue: number; orders: number }> = {};
  orders.forEach(o => {
    const d = new Date(o.createdAt);
    const date = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    if (!dm[date]) dm[date] = { revenue: 0, orders: 0 };
    dm[date].revenue += o.totalAmount || 0;
    dm[date].orders += 1;
  });
  const dailyRevenue = Object.entries(dm)
    .map(([date, d]) => ({ date, revenue: d.revenue }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return {
    totalRevenue,
    orderCount: orders.length,
    avgOrder: orders.length ? Math.round(totalRevenue / orders.length) : 0,
    products,
    dailyRevenue,
  };
};

// ════════════════════════════════════════════════════════════
// LICENSE SYSTEM
// ════════════════════════════════════════════════════════════
export type LicenseStatus = 'trial' | 'active' | 'expired' | 'blocked';
export type LicensePlan   = 'trial' | 'monthly' | 'yearly';

export interface License {
  key: string;
  clientName: string;
  phone?: string;
  branchId?: string;
  status: LicenseStatus;
  plan: LicensePlan;
  expiresAt: number;
  createdAt: number;
  note?: string;
  maxTables?: number;
}

const genKey = (): string => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let k = 'RES-';
  for (let i = 0; i < 6; i++) k += chars[Math.floor(Math.random() * chars.length)];
  return k;
};

export const createLicense = async (
  data: Omit<License, 'key' | 'createdAt'>
): Promise<string> => {
  const key = genKey();
  await set(ref(db, `licenses/${key}`), { ...data, key, createdAt: Date.now() });
  return key;
};

export const getLicense = async (key: string): Promise<License | null> => {
  const snap = await get(ref(db, `licenses/${key}`));
  return snap.exists() ? snap.val() as License : null;
};

export const updateLicense = async (
  key: string,
  data: Partial<License>
): Promise<void> => {
  await update(ref(db, `licenses/${key}`), data);
};

export const deleteLicense = async (key: string): Promise<void> => {
  await remove(ref(db, `licenses/${key}`));
};

export const subscribeToLicenses = (
  cb: (licenses: License[]) => void
): (() => void) => {
  const r = ref(db, 'licenses');
  const h = onValue(r, snap => {
    if (!snap.exists()) { cb([]); return; }
    cb(Object.values(snap.val() as Record<string, License>)
      .sort((a, b) => b.createdAt - a.createdAt));
  });
  return () => off(r, 'value', h);
};

// Check if license is valid right now
export const checkLicense = (lic: License): {
  valid: boolean;
  daysLeft: number;
  message: string;
} => {
  const now = Date.now();
  const daysLeft = Math.ceil((lic.expiresAt - now) / 86400000);
  if (lic.status === 'blocked') return { valid: false, daysLeft: 0, message: 'Лиценц хаагдсан байна.' };
  if (lic.status === 'expired' || now > lic.expiresAt) {
    return { valid: false, daysLeft: 0, message: 'Лицензийн хугацаа дууссан байна.' };
  }
  if (lic.status === 'trial') return { valid: true, daysLeft, message: `Туршилтын горим — ${daysLeft} хоног үлдсэн` };
  return { valid: true, daysLeft, message: '' };
};

// Attach license to a branch (store licenseKey in branch info)
export const attachLicenseToBranch = async (
  branchId: string,
  licenseKey: string
): Promise<void> => {
  await update(ref(db, `branches/${branchId}/info`), { licenseKey });
  await update(ref(db, `licenses/${licenseKey}`), { branchId });
};

export const getBranchLicense = async (branchId: string): Promise<License | null> => {
  const branch = await getBranch(branchId);
  if (!branch) return null;
  const key = (branch as any).licenseKey;
  if (!key) return null;
  return getLicense(key);
};

// ════════════════════════════════════════════════════════════
// LICENSE CHECK HELPERS (LicenseCheck return type)
// ════════════════════════════════════════════════════════════
export interface LicenseCheck {
  valid: boolean;
  status: License['status'] | 'none';
  daysLeft: number;
  message: string;
  license: License | null;
}

export const checkLicenseStatus = (lic: License | null): LicenseCheck => {
  if (!lic) return { valid: false, status: 'none', daysLeft: 0, message: 'Лиценз олдсонгүй', license: null };
  if (lic.status === 'blocked') return { valid: false, status: 'blocked', daysLeft: 0, message: '⛔ Лиценз хаагдсан', license: lic };
  const daysLeft = Math.ceil((lic.endDate - Date.now()) / 86400000);
  if (daysLeft <= 0) return { valid: false, status: 'expired', daysLeft: 0, message: '🔴 Лиценз дууссан', license: lic };
  if (lic.status === 'trial') return { valid: true, status: 'trial', daysLeft, message: `🟡 Туршилт — ${daysLeft} хоног үлдсэн`, license: lic };
  return { valid: true, status: 'paid', daysLeft, message: `🟢 Идэвхтэй — ${daysLeft} хоног үлдсэн`, license: lic };
};

export const getBranchLicenseStatus = async (branchId: string): Promise<LicenseCheck> => {
  const branchSnap = await get(ref(db, `branches/${branchId}/licenseKey`));
  if (!branchSnap.exists()) return { valid: false, status: 'none', daysLeft: 0, message: '⚠️ Лиценз холбоогүй байна', license: null };
  const lic = await getLicense(branchSnap.val());
  return checkLicenseStatus(lic);
};

export const setBranchLicense = async (branchId: string, licenseKey: string): Promise<void> => {
  await update(ref(db, `branches/${branchId}`), { licenseKey });
  await update(ref(db, `licenses/${licenseKey}`), { branchId });
};

// ── License Activation (key entry → trial starts NOW) ────────
export const activateLicense = async (
  branchId: string,
  licenseKey: string
): Promise<{ success: boolean; message: string; license?: License }> => {
  const snap = await get(ref(db, `licenses/${licenseKey.trim().toUpperCase()}`));
  if (!snap.exists()) return { success: false, message: '❌ Лицензийн түлхүүр олдсонгүй' };

  const lic: License = { key: licenseKey, ...snap.val() };

  if (lic.status === 'blocked')
    return { success: false, message: '⛔ Энэ лиценз хаагдсан байна' };
  if (lic.branchId && lic.branchId !== branchId)
    return { success: false, message: '❌ Энэ түлхүүр өөр салбарт ашиглагдаж байна' };

  // Activation: trial starts NOW
  const now = Date.now();
  const isPaid = lic.status === 'paid';
  const startDate = now;
  const endDate = isPaid ? now + 31536000000 : now + 1209600000; // 1 жил / 14 хоног
  const status: License['status'] = isPaid ? 'paid' : 'trial';

  const updates: Record<string, any> = {};
  updates[`licenses/${licenseKey}/branchId`] = branchId;
  updates[`licenses/${licenseKey}/startDate`] = startDate;
  updates[`licenses/${licenseKey}/endDate`] = endDate;
  updates[`licenses/${licenseKey}/status`] = status;
  updates[`branches/${branchId}/licenseKey`] = licenseKey;
  await update(ref(db), updates);

  const activated = { ...lic, startDate, endDate, status, branchId };
  return { success: true, message: `✅ Лиценз идэвхжлээ!`, license: activated };
};

// ════════════════════════════════════════════════════════════
// MANAGER AUTH (license key + password)
// ════════════════════════════════════════════════════════════
export const getManagerPassword = async (licKey: string): Promise<string | null> => {
  const snap = await get(ref(db, `licenses/${licKey}/managerPassword`));
  return snap.exists() ? snap.val() : null;
};

export const setManagerPassword = async (licKey: string, passwordHash: string): Promise<void> => {
  await update(ref(db, `licenses/${licKey}`), { managerPassword: passwordHash });
};

export const getBranchIdByLicense = async (licKey: string): Promise<string | null> => {
  const snap = await get(ref(db, `licenses/${licKey}/branchId`));
  return snap.exists() ? snap.val() : null;
};

export const updateBranchName = async (branchId: string, name: string): Promise<void> => {
  await update(ref(db, `branches/${branchId}`), { name });
};
