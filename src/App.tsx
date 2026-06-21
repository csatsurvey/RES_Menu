import { useState, useEffect } from 'react';
import {
  Branch, Table, Order, Survey, Staff, MenuItem, OrderItem,
  getAllBranches, createBranch, getBranch, verifyManagerPin, verifyStaffPin,
  setTables as setTablesDB, subscribeToTables,
  subscribeToOrders, subscribeToTableOrders, createOrder, updateOrderStatus,
  subscribeToSurveys, createSurvey, setSurveyResolved,
  subscribeToMenu, addMenuItem,
  getStaff, addStaff, removeStaff,
  formatPrice, formatTime, formatDate,
  ORDER_STATUS_LABELS, ORDER_STATUS_COLORS,
} from './lib/db';

// ── URL helpers ──────────────────────────────────────────────
const getQRParams = () => {
  const p = new URLSearchParams(window.location.search);
  return { b: p.get('b') || '', t: Number(p.get('t')) || 0 };
};
const buildQR = (bId: string, t: number) => {
  const u = `${window.location.origin}${window.location.pathname}?b=${bId}&t=${t}`;
  return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(u)}`;
};
const buildLink = (bId: string, t: number) =>
  `${window.location.origin}${window.location.pathname}?b=${bId}&t=${t}`;

// ── Default menu seed ─────────────────────────────────────────
const SEED_MENU: Omit<MenuItem, 'id'>[] = [
  { name: 'Цуйван', description: 'Гурилтай шарсан мах, хүнс', price: 12000, category: 'Үндсэн хоол', image: '', available: true },
  { name: 'Хуушуур', description: '4 ширхэг, шарсан мах', price: 8000, category: 'Үндсэн хоол', image: '', available: true },
  { name: 'Банштай шөл', description: 'Уламжлалт банш', price: 9000, category: 'Үндсэн хоол', image: '', available: true },
  { name: 'Тахианы давсан шөл', description: 'Хөнгөн, тэжээллэг', price: 7000, category: 'Шөл', image: '', available: true },
  { name: 'Кофе Американо', description: 'Хос эспрессо', price: 4500, category: 'Ундаа', image: '', available: true },
  { name: 'Ногоон цай', description: 'Байгалийн', price: 3000, category: 'Ундаа', image: '', available: true },
  { name: 'Жүүс', description: 'Улбар шар / Алим', price: 4000, category: 'Ундаа', image: '', available: true },
  { name: 'Ус', description: '500мл', price: 1500, category: 'Ундаа', image: '', available: true },
];

type AppView = 'landing' | 'customer' | 'manager' | 'kitchen';

// ════════════════════════════════════════════════════════════
// MAIN APP
// ════════════════════════════════════════════════════════════
export default function App() {
  const [view, setView] = useState<AppView>('landing');
  const [branchId, setBranchId] = useState('');
  const [tableNum, setTableNum] = useState(0);
  const [staff, setStaff] = useState<Staff | null>(null);

  useEffect(() => {
    const { b, t } = getQRParams();
    if (b && t) { setBranchId(b); setTableNum(t); setView('customer'); }
  }, []);

  const logout = () => { setView('landing'); setBranchId(''); setStaff(null); };

  if (view === 'customer') return <CustomerView branchId={branchId} tableNum={tableNum} />;
  if (view === 'manager') return <ManagerPanel branchId={branchId} onLogout={logout} />;
  if (view === 'kitchen') return <KitchenPanel branchId={branchId} staff={staff!} onLogout={logout} />;
  return (
    <LandingView
      onManager={(id) => { setBranchId(id); setView('manager'); }}
      onStaff={(id, s) => { setBranchId(id); setStaff(s); setView('kitchen'); }}
    />
  );
}

// ════════════════════════════════════════════════════════════
// LANDING VIEW — Login / Branch selection
// ════════════════════════════════════════════════════════════
function LandingView({ onManager, onStaff }: {
  onManager: (branchId: string) => void;
  onStaff: (branchId: string, staff: Staff) => void;
}) {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [mode, setMode] = useState<'select' | 'manager' | 'staff' | 'new'>('select');
  const [branchId, setBranchId] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [newName, setNewName] = useState('');
  const [newAddr, setNewAddr] = useState('');
  const [newPin, setNewPin] = useState('');

  useEffect(() => { getAllBranches().then(setBranches); }, []);

  const reset = () => { setError(''); setPin(''); };

  const handleManagerLogin = async () => {
    if (!branchId || !pin) return setError('Салбар болон PIN оруулна уу');
    setLoading(true);
    const ok = await verifyManagerPin(branchId, pin);
    setLoading(false);
    if (!ok) return setError('PIN буруу байна');
    onManager(branchId);
  };

  const handleStaffLogin = async () => {
    if (!branchId || !pin) return setError('Салбар болон PIN оруулна уу');
    setLoading(true);
    const s = await verifyStaffPin(branchId, pin);
    setLoading(false);
    if (!s) return setError('PIN буруу байна');
    onStaff(branchId, s);
  };

  const handleCreateBranch = async () => {
    if (!newName || !newPin) return setError('Нэр болон PIN шаардлагатай');
    if (newPin.length < 4) return setError('PIN дор хаяж 4 оронтой байх ёстой');
    setLoading(true);
    try {
      const id = await createBranch(newName, newAddr, newPin);
      for (const item of SEED_MENU) await addMenuItem(id, item);
      await setTablesDB(id, 5);
      onManager(id);
    } catch { setError('Алдаа гарлаа'); }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-md border border-gray-100 p-8">
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🍽️</div>
          <h1 className="text-2xl font-bold text-gray-900">Ресторан систем</h1>
          <p className="text-gray-400 text-sm mt-1">Нэвтрэх эрхээ сонгоно уу</p>
        </div>

        {mode === 'select' && (
          <div className="space-y-3">
            <button onClick={() => setMode('manager')}
              className="w-full py-3 px-4 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition flex items-center justify-center gap-2">
              👔 Менежер
            </button>
            <button onClick={() => setMode('staff')}
              className="w-full py-3 px-4 bg-teal-600 text-white rounded-xl font-medium hover:bg-teal-700 transition flex items-center justify-center gap-2">
              👨‍🍳 Тогооч / Зөөгч
            </button>
            <button onClick={() => setMode('new')}
              className="w-full py-3 px-4 border border-gray-200 text-gray-600 rounded-xl font-medium hover:bg-gray-50 transition">
              ➕ Шинэ салбар үүсгэх
            </button>
          </div>
        )}

        {(mode === 'manager' || mode === 'staff') && (
          <div className="space-y-4">
            <p className="font-medium text-gray-700 text-center">
              {mode === 'manager' ? '👔 Менежер нэвтрэх' : '👨‍🍳 Ажилтан нэвтрэх'}
            </p>
            <select value={branchId} onChange={e => setBranchId(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white">
              <option value="">Салбар сонгоно уу</option>
              {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
            <input type="password" value={pin} onChange={e => { setPin(e.target.value); setError(''); }}
              placeholder="PIN оруулна уу"
              onKeyDown={e => e.key === 'Enter' && (mode === 'manager' ? handleManagerLogin() : handleStaffLogin())}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-300" />
            {error && <p className="text-red-500 text-sm text-center">{error}</p>}
            <button onClick={mode === 'manager' ? handleManagerLogin : handleStaffLogin}
              disabled={loading}
              className="w-full py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 disabled:opacity-50 transition">
              {loading ? 'Нэвтрэж байна...' : 'Нэвтрэх'}
            </button>
            <button onClick={() => { setMode('select'); reset(); }}
              className="w-full py-2 text-gray-400 text-sm hover:text-gray-600 transition">← Буцах</button>
          </div>
        )}

        {mode === 'new' && (
          <div className="space-y-4">
            <p className="font-medium text-gray-700 text-center">Шинэ салбар үүсгэх</p>
            <input value={newName} onChange={e => setNewName(e.target.value)}
              placeholder="Салбарын нэр *"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-300" />
            <input value={newAddr} onChange={e => setNewAddr(e.target.value)}
              placeholder="Хаяг (заавал биш)"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-300" />
            <input type="password" value={newPin} onChange={e => setNewPin(e.target.value)}
              placeholder="Менежерийн PIN (4+ тоо) *"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-300" />
            {error && <p className="text-red-500 text-sm text-center">{error}</p>}
            <button onClick={handleCreateBranch} disabled={loading}
              className="w-full py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 disabled:opacity-50 transition">
              {loading ? 'Үүсгэж байна...' : '✅ Үүсгэх'}
            </button>
            <button onClick={() => { setMode('select'); reset(); }}
              className="w-full py-2 text-gray-400 text-sm hover:text-gray-600 transition">← Буцах</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// CUSTOMER VIEW — Menu → Cart → Order → Status → Survey
// ════════════════════════════════════════════════════════════
type CartItem = { item: MenuItem; qty: number };
type CustomerPhase = 'menu' | 'checkout' | 'tracking' | 'survey' | 'done';

function CustomerView({ branchId, tableNum }: { branchId: string; tableNum: number }) {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [phase, setPhase] = useState<CustomerPhase>('menu');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [survey, setSurvey] = useState({ nps: 0, csat: 0, feedback: '' });
  const [loading, setLoading] = useState(false);
  const [branchName, setBranchName] = useState('');
  const [activeCategory, setActiveCategory] = useState('');

  useEffect(() => {
    getBranch(branchId).then(b => b && setBranchName(b.name));
    const u1 = subscribeToMenu(branchId, items => setMenuItems(items.filter(i => i.available)));
    const u2 = subscribeToTableOrders(branchId, tableNum, setOrders);
    return () => { u1(); u2(); };
  }, [branchId, tableNum]);

  const categories = [...new Set(menuItems.map(i => i.category))];
  useEffect(() => {
    if (categories.length && !activeCategory) setActiveCategory(categories[0]);
  }, [categories.length]);

  // Auto-show survey when all orders served
  useEffect(() => {
    if (phase === 'tracking' && orders.length > 0 && orders.every(o => o.status === 'served')) {
      const t = setTimeout(() => setPhase('survey'), 1500);
      return () => clearTimeout(t);
    }
  }, [orders, phase]);

  const changeQty = (item: MenuItem, delta: number) => {
    setCart(prev => {
      const ex = prev.find(c => c.item.id === item.id);
      if (!ex) return delta > 0 ? [...prev, { item, qty: 1 }] : prev;
      const nq = ex.qty + delta;
      if (nq <= 0) return prev.filter(c => c.item.id !== item.id);
      return prev.map(c => c.item.id === item.id ? { ...c, qty: nq } : c);
    });
  };
  const getQty = (id: string) => cart.find(c => c.item.id === id)?.qty || 0;
  const totalPrice = cart.reduce((s, c) => s + c.item.price * c.qty, 0);
  const cartCount = cart.reduce((s, c) => s + c.qty, 0);
  const activeOrder = orders.find(o => o.status !== 'served');

  const placeOrder = async () => {
    if (!cart.length) return;
    setLoading(true);
    await createOrder(branchId, tableNum, cart.map(c => ({ menuItemId: c.item.id, name: c.item.name, price: c.item.price, quantity: c.qty })), phone || undefined, notes || undefined);
    setCart([]); setLoading(false); setPhase('tracking');
  };

  const submitSurvey = async () => {
    if (!survey.nps || !survey.csat) return;
    await createSurvey(branchId, { tableNumber: tableNum, nps: survey.nps, csat: survey.csat, feedback: survey.feedback, phone: phone || undefined });
    setPhase('done');
  };

  // ── DONE ──
  if (phase === 'done') return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="text-center">
        <div className="text-6xl mb-4">🙏</div>
        <h2 className="text-xl font-bold text-gray-800 mb-2">Баярлалаа!</h2>
        <p className="text-gray-500 mb-6">Таны санал бидэнд маш чухал</p>
        <button onClick={() => { setPhase('menu'); setSurvey({ nps: 0, csat: 0, feedback: '' }); }}
          className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700">
          ➕ Дахин захиалах
        </button>
      </div>
    </div>
  );

  // ── SURVEY ──
  if (phase === 'survey') return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-sm mx-auto">
        <div className="text-center mb-6">
          <div className="text-4xl mb-2">⭐</div>
          <h2 className="text-xl font-bold text-gray-800">Сэтгэл ханамжийн судалгаа</h2>
          <p className="text-gray-400 text-sm">Хоолоо сайн идсэн үү?</p>
        </div>
        <div className="bg-white rounded-2xl p-6 space-y-6 shadow-sm">
          <div>
            <p className="font-medium text-gray-700 mb-3">Манай ресторанг найздаа зөвлөх үү? (0-10)</p>
            <div className="flex gap-1 flex-wrap">
              {Array.from({ length: 11 }, (_, i) => (
                <button key={i} onClick={() => setSurvey(s => ({ ...s, nps: i }))}
                  className={`w-[9%] aspect-square rounded-lg text-sm font-medium transition ${survey.nps === i ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                  {i}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="font-medium text-gray-700 mb-3">Өнөөдрийн үйлчилгээ хэд оноо өгөх вэ?</p>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map(n => (
                <button key={n} onClick={() => setSurvey(s => ({ ...s, csat: n }))}
                  className={`text-3xl transition-all ${survey.csat >= n ? 'scale-110' : 'opacity-30'}`}>⭐</button>
              ))}
            </div>
          </div>
          <div>
            <p className="font-medium text-gray-700 mb-2">Санал, сэтгэгдэл</p>
            <textarea value={survey.feedback} onChange={e => setSurvey(s => ({ ...s, feedback: e.target.value }))}
              rows={3} placeholder="Та юу гэж бодож байна?"
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
          </div>
          <input value={phone} onChange={e => setPhone(e.target.value)}
            placeholder="Утасны дугаар (заавал биш)"
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
          <button onClick={submitSurvey} disabled={!survey.nps || !survey.csat}
            className="w-full py-3 bg-indigo-600 text-white rounded-xl font-semibold disabled:opacity-40 hover:bg-indigo-700">
            Илгээх
          </button>
        </div>
      </div>
    </div>
  );

  // ── TRACKING ──
  if (phase === 'tracking') return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-sm mx-auto">
        <div className="text-center mb-6">
          <p className="text-gray-400 text-sm">{branchName} · Ширээ {tableNum}</p>
          <h2 className="text-xl font-bold text-gray-800 mt-1">Захиалгын төлөв</h2>
        </div>
        {activeOrder ? (
          <div className="bg-white rounded-2xl p-6 shadow-sm mb-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-3 h-3 rounded-full animate-pulse" style={{ background: ORDER_STATUS_COLORS[activeOrder.status] }} />
              <span className="font-bold text-lg" style={{ color: ORDER_STATUS_COLORS[activeOrder.status] }}>
                {ORDER_STATUS_LABELS[activeOrder.status]}
              </span>
            </div>
            {activeOrder.items.map((item, i) => (
              <div key={i} className="flex justify-between text-sm py-1 border-b border-gray-50 last:border-0 text-gray-600">
                <span>{item.name} × {item.quantity}</span>
                <span>{formatPrice(item.price * item.quantity)}</span>
              </div>
            ))}
            <div className="flex justify-between font-bold text-gray-800 mt-3 pt-2 border-t border-gray-100">
              <span>Нийт</span>
              <span>{formatPrice(activeOrder.totalAmount)}</span>
            </div>
          </div>
        ) : orders.length > 0 ? (
          <div className="bg-white rounded-2xl p-6 shadow-sm text-center mb-4">
            <div className="text-3xl mb-2">✅</div>
            <p className="text-gray-600 font-medium">Захиалга бэлэн боллоо!</p>
            <p className="text-gray-400 text-sm mt-1">Судалгаа бөглөж байна...</p>
          </div>
        ) : null}
        <button onClick={() => setPhase('menu')}
          className="w-full py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700">
          ➕ Нэмж захиалах
        </button>
      </div>
    </div>
  );

  // ── CHECKOUT ──
  if (phase === 'checkout') return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-sm mx-auto">
        <button onClick={() => setPhase('menu')} className="mb-4 text-gray-500 hover:text-gray-700 text-sm flex items-center gap-1">← Буцах</button>
        <h2 className="text-xl font-bold text-gray-800 mb-4">Захиалга батлах</h2>
        <div className="bg-white rounded-2xl p-4 shadow-sm mb-4">
          <p className="text-xs text-gray-400 mb-3">{branchName} · Ширээ {tableNum}</p>
          {cart.map((c, i) => (
            <div key={i} className="flex justify-between py-2 border-b last:border-0 text-sm text-gray-700">
              <span>{c.item.name} × {c.qty}</span>
              <span className="font-medium">{formatPrice(c.item.price * c.qty)}</span>
            </div>
          ))}
          <div className="flex justify-between pt-3 font-bold text-gray-800 text-base">
            <span>Нийт дүн</span>
            <span>{formatPrice(totalPrice)}</span>
          </div>
        </div>
        <div className="space-y-3 mb-6">
          <input value={phone} onChange={e => setPhone(e.target.value)}
            placeholder="☎ Утасны дугаар (заавал биш)"
            className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-300" />
          <textarea value={notes} onChange={e => setNotes(e.target.value)}
            placeholder="📝 Нэмэлт тайлбар..." rows={2}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
        </div>
        <button onClick={placeOrder} disabled={loading}
          className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold text-lg hover:bg-indigo-700 disabled:opacity-50 transition">
          {loading ? 'Илгээж байна...' : '✅ Захиалах'}
        </button>
      </div>
    </div>
  );

  // ── MENU ──
  return (
    <div className="min-h-screen bg-gray-50 pb-28">
      <div className="bg-white border-b border-gray-100 px-4 py-4 sticky top-0 z-20">
        <p className="text-xs text-gray-400">{branchName}</p>
        <h1 className="text-lg font-bold text-gray-800">Ширээ {tableNum} · Цэс</h1>
      </div>
      <div className="bg-white px-4 pb-3 overflow-x-auto flex gap-2 sticky top-[60px] z-10 border-b border-gray-100 pt-2">
        {categories.map(cat => (
          <button key={cat} onClick={() => setActiveCategory(cat)}
            className={`px-3 py-1.5 rounded-full text-sm whitespace-nowrap font-medium transition ${activeCategory === cat ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            {cat}
          </button>
        ))}
      </div>
      <div className="p-4 space-y-3">
        {menuItems.filter(i => i.category === activeCategory).map(item => {
          const qty = getQty(item.id);
          return (
            <div key={item.id} className="bg-white rounded-xl p-4 flex items-center justify-between shadow-sm">
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-800">{item.name}</p>
                <p className="text-xs text-gray-400 mt-0.5 truncate">{item.description}</p>
                <p className="text-indigo-600 font-bold mt-1">{formatPrice(item.price)}</p>
              </div>
              <div className="flex items-center gap-2 ml-4 shrink-0">
                {qty > 0 ? (
                  <>
                    <button onClick={() => changeQty(item, -1)}
                      className="w-8 h-8 bg-gray-100 text-gray-700 rounded-full font-bold text-xl flex items-center justify-center hover:bg-gray-200 transition">−</button>
                    <span className="w-6 text-center font-bold text-gray-800">{qty}</span>
                    <button onClick={() => changeQty(item, 1)}
                      className="w-8 h-8 bg-indigo-600 text-white rounded-full font-bold text-xl flex items-center justify-center hover:bg-indigo-700 transition">+</button>
                  </>
                ) : (
                  <button onClick={() => changeQty(item, 1)}
                    className="w-8 h-8 bg-indigo-600 text-white rounded-full font-bold text-xl flex items-center justify-center hover:bg-indigo-700 transition">+</button>
                )}
              </div>
            </div>
          );
        })}
      </div>
      {cartCount > 0 && (
        <div className="fixed bottom-4 left-4 right-4 z-30">
          <button onClick={() => setPhase('checkout')}
            className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold flex items-center justify-between px-6 shadow-xl hover:bg-indigo-700 transition">
            <span className="bg-white text-indigo-600 rounded-full w-7 h-7 flex items-center justify-center text-sm font-bold">{cartCount}</span>
            <span>Захиалга харах</span>
            <span>{formatPrice(totalPrice)}</span>
          </button>
        </div>
      )}
      {activeOrder && (
        <button onClick={() => setPhase('tracking')}
          className="fixed top-[68px] right-3 z-20 bg-white border border-gray-200 rounded-xl px-3 py-1.5 text-xs font-semibold shadow-sm flex items-center gap-1.5"
          style={{ color: ORDER_STATUS_COLORS[activeOrder.status] }}>
          <span className="w-2 h-2 rounded-full animate-pulse inline-block" style={{ background: ORDER_STATUS_COLORS[activeOrder.status] }} />
          {ORDER_STATUS_LABELS[activeOrder.status]}
        </button>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// MANAGER PANEL — Tables/QR | Orders | CSAT | Complaints | Staff
// ════════════════════════════════════════════════════════════
type ManagerTab = 'tables' | 'orders' | 'csat' | 'complaints' | 'staff';

function ManagerPanel({ branchId, onLogout }: { branchId: string; onLogout: () => void }) {
  const [tab, setTab] = useState<ManagerTab>('tables');
  const [tables, setTablesState] = useState<Table[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [branchName, setBranchName] = useState('');
  const [tableCount, setTableCount] = useState('5');
  const [loading, setLoading] = useState(false);
  const [showQR, setShowQR] = useState<number | null>(null);
  const [newStaffName, setNewStaffName] = useState('');
  const [newStaffRole, setNewStaffRole] = useState<'chef' | 'waiter'>('chef');
  const [newStaffPin, setNewStaffPin] = useState('');
  const [resolveNote, setResolveNote] = useState<Record<string, string>>({});

  useEffect(() => {
    getBranch(branchId).then(b => b && setBranchName(b.name));
    getStaff(branchId).then(setStaffList);
    const u1 = subscribeToTables(branchId, t => { setTablesState(t); setTableCount(String(t.length || 5)); });
    const u2 = subscribeToOrders(branchId, setOrders);
    const u3 = subscribeToSurveys(branchId, setSurveys);
    return () => { u1(); u2(); u3(); };
  }, [branchId]);

  const handleSetTables = async () => {
    const n = parseInt(tableCount);
    if (!n || n < 1 || n > 200) return;
    setLoading(true);
    await setTablesDB(branchId, n);
    setLoading(false);
  };

  const handleAddStaff = async () => {
    if (!newStaffName || !newStaffPin) return;
    await addStaff(branchId, newStaffName, newStaffRole, newStaffPin);
    getStaff(branchId).then(setStaffList);
    setNewStaffName(''); setNewStaffPin('');
  };

  // Analytics
  const npsArr = surveys.map(s => s.nps);
  const promoters = npsArr.filter(n => n >= 9).length;
  const detractors = npsArr.filter(n => n <= 6).length;
  const npsScore = npsArr.length ? Math.round(((promoters - detractors) / npsArr.length) * 100) : null;
  const avgCsat = surveys.length ? (surveys.reduce((s, x) => s + x.csat, 0) / surveys.length).toFixed(1) : null;
  const pendingComplaints = surveys.filter(s => !s.resolved && (s.phone || s.feedback)).length;

  const TABS: { id: ManagerTab; label: string }[] = [
    { id: 'tables', label: '🪑 Ширээ' },
    { id: 'orders', label: `📋 Захиалга` },
    { id: 'csat', label: '📊 CSAT' },
    { id: 'complaints', label: `💬 Гомдол${pendingComplaints ? ` (${pendingComplaints})` : ''}` },
    { id: 'staff', label: '👥 Ажилтан' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 py-4 flex items-center justify-between sticky top-0 z-20">
        <div>
          <p className="text-xs text-gray-400">Менежер</p>
          <h1 className="font-bold text-gray-800">{branchName}</h1>
        </div>
        <button onClick={onLogout} className="text-sm text-gray-500 border border-gray-200 rounded-lg px-3 py-1.5 hover:bg-gray-50">Гарах</button>
      </div>

      {/* Tab bar */}
      <div className="bg-white border-b border-gray-100 flex overflow-x-auto sticky top-[57px] z-10">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-3 py-3 text-xs sm:text-sm whitespace-nowrap font-medium border-b-2 transition ${tab === t.id ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="p-4 max-w-2xl mx-auto">

        {/* ── TABLES TAB ── */}
        {tab === 'tables' && (
          <>
            <div className="bg-white rounded-xl p-4 mb-4 shadow-sm">
              <p className="font-semibold text-gray-700 mb-3">Ширээний тоо тохируулах</p>
              <div className="flex gap-3">
                <input type="number" value={tableCount} onChange={e => setTableCount(e.target.value)}
                  min="1" max="200"
                  className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-300" />
                <button onClick={handleSetTables} disabled={loading}
                  className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 disabled:opacity-50 transition">
                  {loading ? '...' : 'Хадгалах'}
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-2">Одоогийн ширээ: {tables.length}</p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {tables.map(t => (
                <div key={t.id} className="bg-white rounded-xl p-3 shadow-sm border border-gray-50">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-gray-800">Ширээ {t.number}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${t.status === 'occupied' ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                      {t.status === 'occupied' ? 'Дүүрэн' : 'Сул'}
                    </span>
                  </div>
                  <button onClick={() => setShowQR(showQR === t.number ? null : t.number)}
                    className="w-full text-xs py-1.5 border border-indigo-200 rounded-lg text-indigo-600 hover:bg-indigo-50 transition">
                    {showQR === t.number ? 'Хаах ↑' : '📱 QR харах'}
                  </button>
                  {showQR === t.number && (
                    <div className="mt-3 text-center">
                      <img src={buildQR(branchId, t.number)} alt={`QR ${t.number}`}
                        className="w-full max-w-[180px] mx-auto rounded-lg border border-gray-100" />
                      <p className="text-xs text-gray-400 mt-2 break-all">{buildLink(branchId, t.number)}</p>
                      <a href={buildLink(branchId, t.number)} target="_blank" rel="noreferrer"
                        className="mt-1 inline-block text-xs text-indigo-500 hover:underline">↗ Нээх</a>
                      <button onClick={() => {
                        const w = window.open('', '_blank');
                        if (w) {
                          w.document.write(`<html><body style="text-align:center;font-family:sans-serif;padding:20px"><h2>Ширээ ${t.number}</h2><img src="${buildQR(branchId, t.number)}" style="width:200px"><br><p style="font-size:12px">${buildLink(branchId, t.number)}</p><script>window.print()<\/script></body></html>`);
                          w.document.close();
                        }
                      }} className="mt-2 inline-block text-xs px-3 py-1.5 bg-gray-100 rounded-lg hover:bg-gray-200 transition">
                        🖨️ Хэвлэх
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}

        {/* ── ORDERS TAB ── */}
        {tab === 'orders' && (
          <div className="space-y-3">
            {orders.length === 0 && <div className="text-center py-16 text-gray-400"><p className="text-4xl mb-2">📋</p><p>Захиалга байхгүй</p></div>}
            {orders.map(order => (
              <div key={order.id} className="bg-white rounded-xl p-4 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-gray-800">Ширээ {order.tableNumber}</span>
                  <span className="text-xs font-medium px-2 py-1 rounded-full"
                    style={{ background: ORDER_STATUS_COLORS[order.status] + '20', color: ORDER_STATUS_COLORS[order.status] }}>
                    {ORDER_STATUS_LABELS[order.status]}
                  </span>
                </div>
                {order.items.map((item, i) => (
                  <div key={i} className="flex justify-between text-sm text-gray-600 py-0.5">
                    <span>{item.name} × {item.quantity}</span>
                    <span>{formatPrice(item.price * item.quantity)}</span>
                  </div>
                ))}
                {order.notes && <p className="text-xs text-orange-500 mt-1">📝 {order.notes}</p>}
                <div className="flex justify-between items-center mt-2 pt-2 border-t border-gray-50 text-sm">
                  <span className="text-gray-400 text-xs">{formatTime(order.createdAt)}{order.customerPhone && ` · ☎ ${order.customerPhone}`}</span>
                  <span className="font-bold">{formatPrice(order.totalAmount)}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── CSAT TAB ── */}
        {tab === 'csat' && (
          <>
            <div className="grid grid-cols-2 gap-3 mb-4">
              {[
                { label: 'NPS оноо', value: npsScore !== null ? `${npsScore > 0 ? '+' : ''}${npsScore}` : '–', color: npsScore !== null && npsScore >= 0 ? '#10B981' : '#EF4444' },
                { label: 'CSAT дундаж', value: avgCsat ? `${avgCsat}/5` : '–', color: '#6366F1' },
                { label: 'Нийт хариулт', value: String(surveys.length), color: '#374151' },
                { label: 'Шийдвэрлэгдсэн', value: String(surveys.filter(s => s.resolved).length), color: '#10B981' },
              ].map(card => (
                <div key={card.label} className="bg-white rounded-xl p-4 shadow-sm text-center">
                  <p className="text-xs text-gray-400 mb-1">{card.label}</p>
                  <p className="text-3xl font-bold" style={{ color: card.color }}>{card.value}</p>
                </div>
              ))}
            </div>
            <div className="space-y-2">
              {surveys.filter(s => s.feedback).map(s => (
                <div key={s.id} className="bg-white rounded-xl p-3 shadow-sm">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs text-gray-400">{formatDate(s.createdAt)} · Ширээ {s.tableNumber}</span>
                    <span className="text-sm">{'⭐'.repeat(s.csat)}</span>
                  </div>
                  <p className="text-sm text-gray-700">{s.feedback}</p>
                </div>
              ))}
              {surveys.filter(s => s.feedback).length === 0 && (
                <p className="text-center text-gray-400 py-8">Сэтгэгдэл байхгүй</p>
              )}
            </div>
          </>
        )}

        {/* ── COMPLAINTS TAB ── */}
        {tab === 'complaints' && (
          <div className="space-y-3">
            {surveys.filter(s => s.phone || s.feedback).length === 0 && (
              <div className="text-center py-16 text-gray-400"><p className="text-4xl mb-2">💬</p><p>Гомдол байхгүй</p></div>
            )}
            {surveys.filter(s => s.phone || s.feedback).map(s => (
              <div key={s.id} className={`bg-white rounded-xl p-4 shadow-sm border-l-4 ${s.resolved ? 'border-green-400' : 'border-orange-400'}`}>
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="font-semibold text-gray-800">{s.phone || 'Дугаар байхгүй'}</p>
                    <p className="text-xs text-gray-400">{formatDate(s.createdAt)} · Ширээ {s.tableNumber}</p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">NPS {s.nps}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">⭐{s.csat}</span>
                  </div>
                </div>
                {s.feedback && <p className="text-sm text-gray-600 mb-3 bg-gray-50 rounded-lg p-2">{s.feedback}</p>}
                {!s.resolved && (
                  <input value={resolveNote[s.id] || ''} onChange={e => setResolveNote(n => ({ ...n, [s.id]: e.target.value }))}
                    placeholder="Шийдвэрлэлтийн тэмдэглэл..."
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs mb-2 focus:outline-none focus:ring-1 focus:ring-indigo-300" />
                )}
                <button onClick={() => setSurveyResolved(branchId, s.id, !s.resolved, resolveNote[s.id])}
                  className={`text-xs px-3 py-2 rounded-lg font-medium transition ${s.resolved ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-orange-100 text-orange-700 hover:bg-orange-200'}`}>
                  {s.resolved ? '✅ Шийдэгдсэн — Буцаах' : '🔴 Шийдвэрлэсэн болгох'}
                </button>
                {s.resolvedNote && <p className="text-xs text-gray-400 mt-1">📝 {s.resolvedNote}</p>}
              </div>
            ))}
          </div>
        )}

        {/* ── STAFF TAB ── */}
        {tab === 'staff' && (
          <>
            <div className="bg-white rounded-xl p-4 shadow-sm mb-4">
              <p className="font-semibold text-gray-700 mb-3">Ажилтан нэмэх</p>
              <div className="space-y-3">
                <input value={newStaffName} onChange={e => setNewStaffName(e.target.value)}
                  placeholder="Нэр"
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-300" />
                <select value={newStaffRole} onChange={e => setNewStaffRole(e.target.value as any)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 bg-white focus:outline-none">
                  <option value="chef">👨‍🍳 Тогооч</option>
                  <option value="waiter">🛎️ Зөөгч</option>
                </select>
                <input value={newStaffPin} onChange={e => setNewStaffPin(e.target.value)}
                  type="password" placeholder="PIN"
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-300" />
                <button onClick={handleAddStaff}
                  className="w-full py-2.5 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition">
                  ➕ Нэмэх
                </button>
              </div>
            </div>
            <div className="space-y-2">
              {staffList.map(s => (
                <div key={s.id} className="bg-white rounded-xl px-4 py-3 shadow-sm flex items-center justify-between">
                  <div>
                    <span className="font-medium text-gray-800">{s.name}</span>
                    <span className="text-xs text-gray-400 ml-2">{s.role === 'chef' ? '👨‍🍳 Тогооч' : '🛎️ Зөөгч'}</span>
                  </div>
                  <button onClick={async () => { await removeStaff(branchId, s.id); getStaff(branchId).then(setStaffList); }}
                    className="text-red-400 hover:text-red-600 text-sm transition">Устгах</button>
                </div>
              ))}
              {!staffList.length && <p className="text-center text-gray-400 py-6">Ажилтан байхгүй</p>}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// KITCHEN PANEL — Real-time orders with status updates
// ════════════════════════════════════════════════════════════
function KitchenPanel({ branchId, staff, onLogout }: { branchId: string; staff: Staff; onLogout: () => void }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [filter, setFilter] = useState<Order['status'] | 'all'>('all');

  useEffect(() => subscribeToOrders(branchId, setOrders), [branchId]);

  const NEXT: Partial<Record<Order['status'], Order['status']>> = { pending: 'preparing', preparing: 'ready', ready: 'served' };
  const NEXT_LABEL: Partial<Record<Order['status'], string>> = { pending: '👨‍🍳 Бэлтгэж эхлэх', preparing: '✅ Бэлэн боллоо', ready: '🛎️ Хүргэгдсэн' };

  const FILTER_TABS: { id: Order['status'] | 'all'; label: string }[] = [
    { id: 'all', label: 'Бүгд' },
    { id: 'pending', label: '🟡 Хүлээгдэж байна' },
    { id: 'preparing', label: '🔵 Бэлтгэж байна' },
    { id: 'ready', label: '🟢 Бэлэн' },
  ];

  const active = filter === 'all' ? orders.filter(o => o.status !== 'served') : orders.filter(o => o.status === filter);
  const counts = { pending: orders.filter(o => o.status === 'pending').length, preparing: orders.filter(o => o.status === 'preparing').length, ready: orders.filter(o => o.status === 'ready').length };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-100 px-4 py-4 flex items-center justify-between sticky top-0 z-20">
        <div>
          <p className="text-xs text-gray-400">{staff.role === 'chef' ? '👨‍🍳 Тогооч' : '🛎️ Зөөгч'}</p>
          <h1 className="font-bold text-gray-800">{staff.name}</h1>
        </div>
        <div className="flex items-center gap-3">
          {counts.pending > 0 && <span className="bg-yellow-100 text-yellow-700 text-xs font-bold px-2.5 py-1 rounded-full">{counts.pending} шинэ</span>}
          <button onClick={onLogout} className="text-sm text-gray-500 border border-gray-200 rounded-lg px-3 py-1.5 hover:bg-gray-50">Гарах</button>
        </div>
      </div>

      <div className="bg-white border-b border-gray-100 flex overflow-x-auto sticky top-[57px] z-10">
        {FILTER_TABS.map(t => (
          <button key={t.id} onClick={() => setFilter(t.id)}
            className={`px-3 py-3 text-xs sm:text-sm whitespace-nowrap font-medium border-b-2 transition ${filter === t.id ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="p-4 space-y-3 max-w-2xl mx-auto">
        {active.length === 0 && (
          <div className="text-center py-20 text-gray-400">
            <p className="text-5xl mb-3">🎉</p>
            <p className="font-medium">Захиалга байхгүй</p>
          </div>
        )}
        {active.map(order => (
          <div key={order.id} className="bg-white rounded-xl p-4 shadow-sm border border-gray-50">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-2xl font-black text-gray-800">{order.tableNumber}</span>
                <span className="text-gray-400 text-sm font-medium">ширээ</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400">{formatTime(order.createdAt)}</span>
                <span className="text-xs px-2 py-1 rounded-full font-semibold"
                  style={{ background: ORDER_STATUS_COLORS[order.status] + '20', color: ORDER_STATUS_COLORS[order.status] }}>
                  {ORDER_STATUS_LABELS[order.status]}
                </span>
              </div>
            </div>
            <div className="space-y-1.5 mb-3">
              {order.items.map((item, i) => (
                <div key={i} className="flex justify-between items-center text-sm">
                  <span className="font-medium text-gray-800">{item.name}</span>
                  <span className="bg-gray-100 text-gray-600 rounded-full px-2.5 py-0.5 text-xs font-bold">×{item.quantity}</span>
                </div>
              ))}
            </div>
            {order.notes && (
              <div className="bg-orange-50 border border-orange-100 rounded-lg px-3 py-2 mb-3">
                <p className="text-xs text-orange-600">📝 {order.notes}</p>
              </div>
            )}
            {order.customerPhone && <p className="text-xs text-gray-400 mb-2">☎ {order.customerPhone}</p>}
            {NEXT[order.status] && (
              <button onClick={() => updateOrderStatus(branchId, order.id, NEXT[order.status]!)}
                className="w-full py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 active:scale-95 transition text-sm">
                {NEXT_LABEL[order.status]}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
