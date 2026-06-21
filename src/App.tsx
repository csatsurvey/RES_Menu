import { useState, useEffect } from 'react';
import {
  Branch, Table, Order, Survey, Staff, MenuItem, OrderItem,
  getAllBranches, createBranch, getBranch, verifyManagerPin, verifyStaffPin,
  setTables as setTablesDB, subscribeToTables,
  subscribeToOrders, subscribeToTableOrders, createOrder, updateOrderStatus,
  subscribeToSurveys, createSurvey, setSurveyResolved,
  subscribeToMenu, addMenuItem, updateMenuItem,
  getStaff, addStaff, removeStaff,
  formatPrice, formatTime, formatDate,
  ORDER_STATUS_LABELS, ORDER_STATUS_COLORS,
} from './lib/db';

const getQRParams = () => {
  const p = new URLSearchParams(window.location.search);
  return { b: p.get('b') || '', t: Number(p.get('t')) || 0 };
};
const buildQR = (bId: string, t: number) => {
  const u = `${window.location.origin}${window.location.pathname}?b=${bId}&t=${t}`;
  return `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(u)}`;
};
const buildLink = (bId: string, t: number) =>
  `${window.location.origin}${window.location.pathname}?b=${bId}&t=${t}`;

// ── Free food images from Unsplash ───────────────────
const FOOD_IMAGES: Record<string, string> = {
  noodles:   'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=700&q=80&fit=crop',
  dumpling:  'https://images.unsplash.com/photo-1496116218417-1a781b1c416c?w=700&q=80&fit=crop',
  soup:      'https://images.unsplash.com/photo-1547592180-85f173990554?w=700&q=80&fit=crop',
  bbq:       'https://images.unsplash.com/photo-1544025162-d76538829f21?w=700&q=80&fit=crop',
  coffee:    'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=700&q=80&fit=crop',
  tea:       'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=700&q=80&fit=crop',
  juice:     'https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=700&q=80&fit=crop',
  water:     'https://images.unsplash.com/photo-1548839140-29a749e1cf4d?w=700&q=80&fit=crop',
};

const SEED_MENU: Omit<MenuItem, 'id'>[] = [
  { name: 'Цуйван', description: 'Гурилтай шарсан мах, хүнсний ногоо нэмсэн уламжлалт Монгол хоол', price: 12000, category: 'Үндсэн хоол', image: FOOD_IMAGES.noodles, available: true, allergens: 'Gluten' },
  { name: 'Хуушуур', description: '4 ширхэг шарсан гурилтай махтай хуушуур', price: 8000, category: 'Үндсэн хоол', image: FOOD_IMAGES.dumpling, available: true, allergens: 'Gluten' },
  { name: 'Банштай шөл', description: 'Уламжлалт банш, чанасан мах, цайны буурцаг', price: 9000, category: 'Үндсэн хоол', image: FOOD_IMAGES.soup, available: true, allergens: 'Gluten' },
  { name: 'Тахианы давсан шөл', description: 'Хөнгөн, тэжээллэг тахианы шөл', price: 7000, category: 'Шөл', image: FOOD_IMAGES.soup, available: true },
  { name: 'Кофе Американо', description: 'Хос эспрессо, халуун эсвэл мөстэй', price: 4500, category: 'Ундаа', image: FOOD_IMAGES.coffee, available: true },
  { name: 'Ногоон цай', description: 'Байгалийн ногоон цай', price: 3000, category: 'Ундаа', image: FOOD_IMAGES.tea, available: true },
  { name: 'Жүүс', description: 'Улбар шар эсвэл алимны шахмал жүүс', price: 4000, category: 'Ундаа', image: FOOD_IMAGES.juice, available: true },
  { name: 'Ус', description: 'Эрдэс ус 500мл', price: 1500, category: 'Ундаа', image: FOOD_IMAGES.water, available: true },
];

type AppView = 'landing' | 'customer' | 'manager' | 'kitchen';

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
  return <LandingView
    onManager={(id) => { setBranchId(id); setView('manager'); }}
    onStaff={(id, s) => { setBranchId(id); setStaff(s); setView('kitchen'); }}
  />;
}

// ════════════════════════════════════════════════════════
// LANDING
// ════════════════════════════════════════════════════════
function LandingView({ onManager, onStaff }: { onManager: (id: string) => void; onStaff: (id: string, s: Staff) => void }) {
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

  const inp: React.CSSProperties = { padding: '0.75rem 1rem', border: '2px solid #E7E5E4', borderRadius: '12px', fontSize: '0.9rem', outline: 'none', width: '100%', boxSizing: 'border-box' };

  const login = async (type: 'manager' | 'staff') => {
    if (!branchId || !pin) return setError('Салбар болон PIN оруулна уу');
    setLoading(true);
    if (type === 'manager') {
      const ok = await verifyManagerPin(branchId, pin);
      setLoading(false);
      return ok ? onManager(branchId) : setError('PIN буруу байна');
    }
    const s = await verifyStaffPin(branchId, pin);
    setLoading(false);
    return s ? onStaff(branchId, s) : setError('PIN буруу байна');
  };

  const handleCreate = async () => {
    if (!newName || !newPin) return setError('Нэр болон PIN шаардлагатай');
    if (newPin.length < 4) return setError('PIN дор хаяж 4 оронтой');
    setLoading(true);
    try {
      const id = await createBranch(newName, newAddr, newPin);
      for (const item of SEED_MENU) await addMenuItem(id, item);
      await setTablesDB(id, 5);
      onManager(id);
    } catch { setError('Алдаа гарлаа'); setLoading(false); }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg,#FF6B35,#F7931E,#FFD700)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div style={{ width: '100%', maxWidth: '380px', background: 'white', borderRadius: '24px', padding: '2rem', boxShadow: '0 25px 60px rgba(0,0,0,0.2)' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ fontSize: '3.5rem' }}>🍽️</div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: '800', color: '#1C1917', margin: '0.5rem 0 0.25rem' }}>Ресторан систем</h1>
          <p style={{ color: '#78716C', fontSize: '0.875rem', margin: 0 }}>Нэвтрэх эрхээ сонгоно уу</p>
        </div>
        {mode === 'select' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <button onClick={() => setMode('manager')} style={{ padding: '0.875rem', background: '#FF6B35', color: 'white', border: 'none', borderRadius: '14px', fontWeight: '700', fontSize: '1rem', cursor: 'pointer' }}>👔 Менежер</button>
            <button onClick={() => setMode('staff')} style={{ padding: '0.875rem', background: '#10B981', color: 'white', border: 'none', borderRadius: '14px', fontWeight: '700', fontSize: '1rem', cursor: 'pointer' }}>👨‍🍳 Тогооч / Зөөгч</button>
            <button onClick={() => setMode('new')} style={{ padding: '0.875rem', background: 'transparent', border: '2px dashed #E7E5E4', borderRadius: '14px', color: '#78716C', fontWeight: '600', cursor: 'pointer' }}>➕ Шинэ салбар үүсгэх</button>
          </div>
        )}
        {(mode === 'manager' || mode === 'staff') && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ background: mode === 'manager' ? '#FFF7ED' : '#ECFDF5', borderRadius: '12px', padding: '0.6rem', textAlign: 'center', fontWeight: '700', color: mode === 'manager' ? '#FF6B35' : '#10B981', fontSize: '0.9rem' }}>
              {mode === 'manager' ? '👔 Менежер нэвтрэх' : '👨‍🍳 Ажилтан нэвтрэх'}
            </div>
            <select value={branchId} onChange={e => setBranchId(e.target.value)} style={{ ...inp, background: 'white' }}>
              <option value="">Салбар сонгоно уу</option>
              {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
            <input type="password" value={pin} onChange={e => { setPin(e.target.value); setError(''); }} placeholder="PIN оруулна уу"
              onKeyDown={e => e.key === 'Enter' && login(mode)} style={inp} />
            {error && <p style={{ color: '#EF4444', fontSize: '0.85rem', textAlign: 'center', margin: 0 }}>{error}</p>}
            <button onClick={() => login(mode)} disabled={loading}
              style={{ padding: '0.875rem', background: mode === 'manager' ? '#FF6B35' : '#10B981', color: 'white', border: 'none', borderRadius: '14px', fontWeight: '700', cursor: 'pointer', opacity: loading ? 0.6 : 1 }}>
              {loading ? 'Нэвтрэж байна...' : 'Нэвтрэх'}
            </button>
            <button onClick={() => { setMode('select'); setError(''); setPin(''); }} style={{ background: 'none', border: 'none', color: '#9CA3AF', cursor: 'pointer' }}>← Буцах</button>
          </div>
        )}
        {mode === 'new' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ background: '#FFF7ED', borderRadius: '12px', padding: '0.6rem', textAlign: 'center', fontWeight: '700', color: '#FF6B35' }}>✨ Шинэ салбар үүсгэх</div>
            <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Салбарын нэр *" style={inp} />
            <input value={newAddr} onChange={e => setNewAddr(e.target.value)} placeholder="Хаяг (заавал биш)" style={inp} />
            <input type="password" value={newPin} onChange={e => setNewPin(e.target.value)} placeholder="Менежерийн PIN (4+ тоо) *" style={inp} />
            {error && <p style={{ color: '#EF4444', fontSize: '0.85rem', textAlign: 'center', margin: 0 }}>{error}</p>}
            <button onClick={handleCreate} disabled={loading}
              style={{ padding: '0.875rem', background: '#FF6B35', color: 'white', border: 'none', borderRadius: '14px', fontWeight: '700', cursor: 'pointer', opacity: loading ? 0.6 : 1 }}>
              {loading ? 'Үүсгэж байна...' : '✅ Салбар үүсгэх'}
            </button>
            <button onClick={() => { setMode('select'); setError(''); }} style={{ background: 'none', border: 'none', color: '#9CA3AF', cursor: 'pointer' }}>← Буцах</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════
// CUSTOMER VIEW — Manhattan Lounge dark style
// ════════════════════════════════════════════════════════
type CartItem = { item: MenuItem; qty: number };
type CustomerPhase = 'menu' | 'tracking' | 'survey' | 'done';
const STATUS_STEPS: Order['status'][] = ['pending', 'preparing', 'ready', 'served'];

const D = {
  bg: '#131316',
  card: '#1e1e24',
  border: 'rgba(255,255,255,0.08)',
  text: '#ffffff',
  muted: 'rgba(255,255,255,0.55)',
  accent: '#c9a96e',
  orange: '#FF6B35',
};

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
  const [activeCat, setActiveCat] = useState('');
  const [showCart, setShowCart] = useState(false);

  useEffect(() => {
    getBranch(branchId).then(b => b && setBranchName(b.name));
    const u1 = subscribeToMenu(branchId, items => setMenuItems(items.filter(i => i.available)));
    const u2 = subscribeToTableOrders(branchId, tableNum, setOrders);
    return () => { u1(); u2(); };
  }, [branchId, tableNum]);

  const categories = [...new Set(menuItems.map(i => i.category))];
  useEffect(() => { if (categories.length && !activeCat) setActiveCat(categories[0]); }, [categories.length]);

  useEffect(() => {
    if (phase === 'tracking' && orders.length > 0 && orders.every(o => o.status === 'served')) {
      const t = setTimeout(() => setPhase('survey'), 2000);
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
    setCart([]); setShowCart(false); setLoading(false); setPhase('tracking');
  };

  const submitSurvey = async () => {
    if (!survey.nps || !survey.csat) return;
    await createSurvey(branchId, { tableNumber: tableNum, nps: survey.nps, csat: survey.csat, feedback: survey.feedback, phone: phone || undefined });
    setPhase('done');
  };

  if (phase === 'done') return (
    <div style={{ minHeight: '100vh', background: D.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '1rem', padding: '2rem', textAlign: 'center' }}>
      <div style={{ fontSize: '4rem' }}>🙏</div>
      <h2 style={{ fontWeight: '800', color: D.text, margin: 0 }}>Баярлалаа!</h2>
      <p style={{ color: D.muted, margin: 0 }}>Таны санал бидэнд маш чухал</p>
      <button onClick={() => { setPhase('menu'); setSurvey({ nps: 0, csat: 0, feedback: '' }); }}
        style={{ marginTop: '1rem', padding: '0.875rem 2rem', background: D.orange, color: 'white', border: 'none', borderRadius: '14px', fontWeight: '700', cursor: 'pointer', fontSize: '1rem' }}>
        ➕ Дахин захиалах
      </button>
    </div>
  );

  if (phase === 'survey') return (
    <div style={{ minHeight: '100vh', background: D.bg, padding: '1.5rem' }}>
      <div style={{ maxWidth: '480px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
          <div style={{ fontSize: '3rem' }}>⭐</div>
          <h2 style={{ fontWeight: '800', color: D.text, margin: '0.5rem 0 0.25rem' }}>Сэтгэл ханамжийн судалгаа</h2>
          <p style={{ color: D.muted, margin: 0 }}>Хоолоо сайн идсэн үү?</p>
        </div>
        <div style={{ background: D.card, borderRadius: '16px', padding: '1.5rem', border: `1px solid ${D.border}` }}>
          <div style={{ marginBottom: '1.5rem' }}>
            <p style={{ fontWeight: '700', color: D.text, marginBottom: '0.75rem' }}>Манай ресторанг найздаа зөвлөх үү? (0-10)</p>
            <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
              {Array.from({ length: 11 }, (_, i) => (
                <button key={i} onClick={() => setSurvey(s => ({ ...s, nps: i }))}
                  style={{ width: '38px', height: '38px', borderRadius: '8px', border: `1px solid ${survey.nps === i ? D.accent : D.border}`, fontWeight: '700', cursor: 'pointer', background: survey.nps === i ? D.accent : 'transparent', color: survey.nps === i ? '#1a1a1e' : D.muted, transition: 'all 0.15s' }}>
                  {i}
                </button>
              ))}
            </div>
          </div>
          <div style={{ marginBottom: '1.5rem' }}>
            <p style={{ fontWeight: '700', color: D.text, marginBottom: '0.5rem' }}>Үйлчилгээ хэдэн одтой?</p>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {[1, 2, 3, 4, 5].map(n => (
                <button key={n} onClick={() => setSurvey(s => ({ ...s, csat: n }))}
                  style={{ fontSize: '2rem', background: 'none', border: 'none', cursor: 'pointer', opacity: survey.csat >= n ? 1 : 0.2, transition: 'all 0.15s' }}>⭐</button>
              ))}
            </div>
          </div>
          <textarea value={survey.feedback} onChange={e => setSurvey(s => ({ ...s, feedback: e.target.value }))}
            rows={3} placeholder="Санал, сэтгэгдэл..."
            style={{ width: '100%', padding: '0.75rem', background: 'rgba(255,255,255,0.05)', border: `1px solid ${D.border}`, borderRadius: '12px', fontSize: '0.9rem', outline: 'none', resize: 'none', color: D.text, boxSizing: 'border-box', marginBottom: '1rem' }} />
          <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="☎ Утасны дугаар (заавал биш)"
            style={{ width: '100%', padding: '0.75rem', background: 'rgba(255,255,255,0.05)', border: `1px solid ${D.border}`, borderRadius: '12px', fontSize: '0.9rem', outline: 'none', color: D.text, boxSizing: 'border-box', marginBottom: '1rem' }} />
          <button onClick={submitSurvey} disabled={!survey.nps || !survey.csat}
            style={{ width: '100%', padding: '1rem', background: D.accent, color: '#1a1a1e', border: 'none', borderRadius: '12px', fontWeight: '800', cursor: 'pointer', opacity: (!survey.nps || !survey.csat) ? 0.4 : 1 }}>
            Илгээх
          </button>
        </div>
      </div>
    </div>
  );

  if (phase === 'tracking') return (
    <div style={{ minHeight: '100vh', background: D.bg, padding: '1.5rem' }}>
      <div style={{ maxWidth: '480px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', padding: '1rem 0' }}>
          <p style={{ color: D.muted, margin: '0 0 0.25rem' }}>{branchName}</p>
          <h2 style={{ fontWeight: '800', color: D.text, margin: 0 }}>Ширээ {tableNum} · Захиалгын төлөв</h2>
        </div>
        {activeOrder && (
          <div style={{ background: D.card, borderRadius: '16px', padding: '1.5rem', border: `1px solid ${D.border}`, marginBottom: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.25rem', paddingBottom: '1rem', borderBottom: `1px solid ${D.border}` }}>
              {STATUS_STEPS.map((s, i) => {
                const curIdx = STATUS_STEPS.indexOf(activeOrder.status);
                const done = i <= curIdx;
                const emojis = ['📋', '👨‍🍳', '✅', '🛎️'];
                const labels = ['Хүлээж байна', 'Бэлтгэж байна', 'Бэлэн болсон', 'Хүргэгдсэн'];
                return (
                  <div key={s} style={{ flex: 1, textAlign: 'center' }}>
                    <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: done ? ORDER_STATUS_COLORS[s] : 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', margin: '0 auto 0.4rem' }}>
                      {done ? emojis[i] : '○'}
                    </div>
                    <p style={{ fontSize: '0.62rem', color: done ? ORDER_STATUS_COLORS[s] : D.muted, fontWeight: done ? '700' : '400', margin: 0, lineHeight: 1.2 }}>{labels[i]}</p>
                  </div>
                );
              })}
            </div>
            {activeOrder.items.map((item, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.3rem 0', borderBottom: `1px solid ${D.border}`, fontSize: '0.9rem', color: D.text }}>
                <span>{item.name} × {item.quantity}</span>
                <span style={{ fontWeight: '700', color: D.accent }}>{formatPrice(item.price * item.quantity)}</span>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: `1px solid ${D.border}`, fontWeight: '800', color: D.accent }}>
              <span style={{ color: D.text }}>Нийт</span><span>{formatPrice(activeOrder.totalAmount)}</span>
            </div>
          </div>
        )}
        <button onClick={() => setPhase('menu')}
          style={{ width: '100%', padding: '1rem', background: D.orange, color: 'white', border: 'none', borderRadius: '14px', fontWeight: '700', cursor: 'pointer', fontSize: '1rem' }}>
          ➕ Нэмж захиалах
        </button>
      </div>
    </div>
  );

  // ── MENU (dark style) ────────────────────────────────
  const filteredItems = menuItems.filter(i => activeCat === '__all__' ? true : i.category === activeCat);

  return (
    <div style={{ minHeight: '100vh', background: D.bg, paddingBottom: cartCount > 0 ? '90px' : '2rem' }}>
      {/* Header */}
      <div style={{ background: '#1a1e2a', borderBottom: `1px solid ${D.border}`, padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 30 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <div style={{ fontSize: '1.3rem' }}>☰</div>
          <div>
            <h1 style={{ color: D.text, fontWeight: '800', margin: 0, fontSize: '1rem' }}>{branchName || 'Ресторан'}</h1>
            <p style={{ color: D.muted, margin: 0, fontSize: '0.7rem' }}>Ширээ {tableNum}</p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {activeOrder && (
            <button onClick={() => setPhase('tracking')}
              style={{ background: 'rgba(255,255,255,0.08)', border: `1px solid ${D.border}`, color: ORDER_STATUS_COLORS[activeOrder.status], borderRadius: '20px', padding: '0.3rem 0.75rem', fontSize: '0.72rem', cursor: 'pointer', fontWeight: '700' }}>
              ● {ORDER_STATUS_LABELS[activeOrder.status]}
            </button>
          )}
          <button onClick={() => setShowCart(true)} style={{ background: 'rgba(255,255,255,0.08)', border: `1px solid ${D.border}`, borderRadius: '10px', padding: '0.4rem 0.75rem', color: D.text, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: '600', fontSize: '0.82rem' }}>
            🔍
          </button>
        </div>
      </div>

      {/* Restaurant hero */}
      <div style={{ textAlign: 'center', padding: '1.5rem 1rem 1rem' }}>
        <h2 style={{ fontFamily: 'Georgia, serif', fontSize: '2.5rem', fontStyle: 'italic', color: D.accent, margin: '0 0 0.25rem', fontWeight: '400' }}>Меню</h2>
      </div>

      {/* Category tabs */}
      <div style={{ padding: '0 1rem 1rem', display: 'flex', gap: '0.5rem', overflowX: 'auto' }}>
        {categories.map(cat => (
          <button key={cat} onClick={() => setActiveCat(cat)}
            style={{ padding: '0.5rem 1.25rem', borderRadius: '6px', border: `1.5px solid ${activeCat === cat ? D.accent : D.border}`, cursor: 'pointer', whiteSpace: 'nowrap', fontWeight: '700', fontSize: '0.8rem', letterSpacing: '0.05em', background: activeCat === cat ? D.accent : 'transparent', color: activeCat === cat ? '#1a1a1e' : D.muted, textTransform: 'uppercase' as const, transition: 'all 0.2s' }}>
            {cat}
          </button>
        ))}
      </div>

      {/* Menu items - Manhattan Lounge list style */}
      <div style={{ padding: '0 1rem' }}>
        {filteredItems.map((item, idx) => {
          const qty = getQty(item.id);
          return (
            <div key={item.id} style={{ borderBottom: `1px solid ${D.border}`, paddingBottom: '1.5rem', marginBottom: '1.5rem' }}>
              {/* Name + Price */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.25rem' }}>
                <h3 style={{ color: D.text, fontWeight: '700', fontSize: '1rem', margin: 0, flex: 1, paddingRight: '1rem', lineHeight: 1.3 }}>{item.name}</h3>
                <span style={{ color: D.text, fontWeight: '700', fontSize: '0.9rem', flexShrink: 0 }}>₮ {(item.price).toLocaleString('mn-MN')}</span>
              </div>
              {/* Description */}
              {item.description && <p style={{ color: D.muted, fontSize: '0.82rem', margin: '0 0 0.75rem', lineHeight: 1.5 }}>{item.description}</p>}
              {/* Allergens */}
              {(item as any).allergens && (
                <p style={{ color: 'rgba(239,68,68,0.7)', fontSize: '0.72rem', margin: '0 0 0.75rem' }}>🌶️ {(item as any).allergens}</p>
              )}
              {/* Food image */}
              {item.image ? (
                <div style={{ borderRadius: '12px', overflow: 'hidden', marginBottom: '0.75rem', maxHeight: '220px' }}>
                  <img src={item.image} alt={item.name}
                    style={{ width: '100%', height: '220px', objectFit: 'cover', display: 'block' }}
                    onError={e => { (e.target as HTMLImageElement).parentElement!.style.display = 'none'; }} />
                </div>
              ) : null}
              {/* Add to cart */}
              {qty === 0 ? (
                <button onClick={() => changeQty(item, 1)}
                  style={{ padding: '0.5rem 1.25rem', border: `1.5px solid ${D.accent}`, borderRadius: '6px', color: D.accent, background: 'transparent', fontWeight: '700', cursor: 'pointer', fontSize: '0.82rem', letterSpacing: '0.03em', transition: 'all 0.2s' }}
                  onMouseOver={e => { e.currentTarget.style.background = D.accent; e.currentTarget.style.color = '#1a1a1e'; }}
                  onMouseOut={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = D.accent; }}>
                  + Сагсанд нэмэх
                </button>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <button onClick={() => changeQty(item, -1)}
                    style={{ width: '32px', height: '32px', border: `1px solid ${D.border}`, borderRadius: '6px', background: 'transparent', color: D.text, fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem' }}>−</button>
                  <span style={{ color: D.accent, fontWeight: '800', minWidth: '24px', textAlign: 'center', fontSize: '1rem' }}>{qty}</span>
                  <button onClick={() => changeQty(item, 1)}
                    style={{ width: '32px', height: '32px', border: 'none', borderRadius: '6px', background: D.accent, color: '#1a1a1e', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem' }}>+</button>
                </div>
              )}
            </div>
          );
        })}
        {filteredItems.length === 0 && (
          <div style={{ textAlign: 'center', padding: '3rem', color: D.muted }}>
            <div style={{ fontSize: '3rem' }}>🍽️</div>
            <p>Хоол байхгүй байна</p>
          </div>
        )}
      </div>

      {/* Floating cart */}
      {cartCount > 0 && (
        <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, padding: '1rem', background: 'linear-gradient(to top, #131316 70%, transparent)', zIndex: 40 }}>
          <button onClick={() => setShowCart(true)}
            style={{ width: '100%', padding: '1rem 1.5rem', background: D.orange, color: 'white', border: 'none', borderRadius: '14px', fontWeight: '800', fontSize: '1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 8px 30px rgba(255,107,53,0.35)' }}>
            <span style={{ background: 'rgba(255,255,255,0.2)', borderRadius: '50%', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', fontSize: '0.85rem' }}>{cartCount}</span>
            <span>Захиалга харах</span>
            <span>{formatPrice(totalPrice)}</span>
          </button>
        </div>
      )}

      {/* Cart bottom sheet */}
      {showCart && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 50, display: 'flex', alignItems: 'flex-end' }} onClick={() => setShowCart(false)}>
          <div style={{ background: D.card, borderRadius: '20px 20px 0 0', padding: '1.5rem', width: '100%', maxHeight: '85vh', overflowY: 'auto', border: `1px solid ${D.border}`, borderBottom: 'none' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ margin: 0, fontWeight: '800', color: D.text, fontSize: '1.1rem' }}>🛒 Таны сагс · Ширээ {tableNum}</h3>
              <button onClick={() => setShowCart(false)} style={{ background: 'rgba(255,255,255,0.08)', border: 'none', fontSize: '1.1rem', cursor: 'pointer', color: D.muted, width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
            </div>
            {cart.length === 0 ? (
              <p style={{ textAlign: 'center', color: D.muted, padding: '2rem 0' }}>Сагс хоосон байна</p>
            ) : (
              <>
                {cart.map((c, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 0', borderBottom: `1px solid ${D.border}` }}>
                    <div>
                      <p style={{ margin: 0, fontWeight: '700', color: D.text, fontSize: '0.9rem' }}>{c.item.name}</p>
                      <p style={{ margin: 0, fontSize: '0.78rem', color: D.muted }}>{formatPrice(c.item.price)} × {c.qty}</p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <button onClick={() => changeQty(c.item, -1)} style={{ width: '28px', height: '28px', borderRadius: '6px', border: `1px solid ${D.border}`, background: 'transparent', color: D.text, cursor: 'pointer', fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
                      <span style={{ fontWeight: '700', color: D.accent, minWidth: '20px', textAlign: 'center' }}>{c.qty}</span>
                      <button onClick={() => changeQty(c.item, 1)} style={{ width: '28px', height: '28px', borderRadius: '6px', border: 'none', background: D.accent, color: '#1a1a1e', cursor: 'pointer', fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                    </div>
                  </div>
                ))}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1rem', paddingTop: '1rem', borderTop: `1px solid ${D.border}`, fontWeight: '800', fontSize: '1.1rem' }}>
                  <span style={{ color: D.text }}>Нийт дүн</span>
                  <span style={{ color: D.accent }}>{formatPrice(totalPrice)}</span>
                </div>
                <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="☎ Утасны дугаар (заавал биш)"
                    style={{ padding: '0.75rem 1rem', background: 'rgba(255,255,255,0.05)', border: `1px solid ${D.border}`, borderRadius: '12px', fontSize: '0.9rem', outline: 'none', color: D.text }} />
                  <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="📝 Нэмэлт тайлбар..." rows={2}
                    style={{ padding: '0.75rem 1rem', background: 'rgba(255,255,255,0.05)', border: `1px solid ${D.border}`, borderRadius: '12px', fontSize: '0.9rem', outline: 'none', color: D.text, resize: 'none' }} />
                  <button onClick={placeOrder} disabled={loading}
                    style={{ padding: '1rem', background: D.orange, color: 'white', border: 'none', borderRadius: '14px', fontWeight: '800', cursor: 'pointer', fontSize: '1rem', opacity: loading ? 0.7 : 1 }}>
                    {loading ? 'Илгээж байна...' : '✅ Захиалах'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════
// MANAGER PANEL
// ════════════════════════════════════════════════════════
type ManagerTab = 'tables' | 'orders' | 'csat' | 'complaints' | 'staff' | 'menu';

function ManagerPanel({ branchId, onLogout }: { branchId: string; onLogout: () => void }) {
  const [tab, setTab] = useState<ManagerTab>('tables');
  const [tables, setTablesState] = useState<Table[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [branchName, setBranchName] = useState('');
  const [tableCount, setTableCount] = useState('5');
  const [loading, setLoading] = useState(false);
  const [showQR, setShowQR] = useState<number | null>(null);
  const [newStaffName, setNewStaffName] = useState('');
  const [newStaffRole, setNewStaffRole] = useState<'chef' | 'waiter'>('chef');
  const [newStaffPin, setNewStaffPin] = useState('');
  const [resolveNote, setResolveNote] = useState<Record<string, string>>({});
  const [editingImg, setEditingImg] = useState<string | null>(null);
  const [imgUrl, setImgUrl] = useState('');

  useEffect(() => {
    getBranch(branchId).then(b => b && setBranchName(b.name));
    getStaff(branchId).then(setStaffList);
    const u1 = subscribeToTables(branchId, t => { setTablesState(t); setTableCount(String(t.length || 5)); });
    const u2 = subscribeToOrders(branchId, setOrders);
    const u3 = subscribeToSurveys(branchId, setSurveys);
    const u4 = subscribeToMenu(branchId, setMenuItems);
    return () => { u1(); u2(); u3(); u4(); };
  }, [branchId]);

  const npsArr = surveys.map(s => s.nps);
  const npsScore = npsArr.length ? Math.round(((npsArr.filter(n => n >= 9).length - npsArr.filter(n => n <= 6).length) / npsArr.length) * 100) : null;
  const avgCsat = surveys.length ? (surveys.reduce((s, x) => s + x.csat, 0) / surveys.length).toFixed(1) : null;
  const pendingCount = orders.filter(o => o.status === 'pending').length;
  const pendingComplaints = surveys.filter(s => !s.resolved && (s.phone || s.feedback)).length;

  const TABS: { id: ManagerTab; label: string }[] = [
    { id: 'tables', label: '🪑 Ширээ' },
    { id: 'orders', label: `📋 Захиалга${pendingCount > 0 ? ` (${pendingCount})` : ''}` },
    { id: 'menu', label: '🍽️ Цэс' },
    { id: 'csat', label: '📊 CSAT' },
    { id: 'complaints', label: `💬 Гомдол${pendingComplaints > 0 ? ` (${pendingComplaints})` : ''}` },
    { id: 'staff', label: '👥 Ажилтан' },
  ];

  const inp: React.CSSProperties = { padding: '0.75rem 1rem', border: '2px solid #E7E5E4', borderRadius: '12px', fontSize: '0.9rem', outline: 'none', width: '100%', boxSizing: 'border-box' };
  const card: React.CSSProperties = { background: 'white', borderRadius: '16px', padding: '1.25rem', boxShadow: '0 2px 12px rgba(0,0,0,0.05)', marginBottom: '0.75rem' };

  return (
    <div style={{ minHeight: '100vh', background: '#FFF7ED' }}>
      <div style={{ background: 'linear-gradient(135deg,#FF6B35,#F7931E)', padding: '1rem 1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 20 }}>
        <div>
          <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.75rem', margin: 0 }}>👔 Менежер</p>
          <h1 style={{ color: 'white', fontWeight: '800', margin: 0, fontSize: '1.1rem' }}>{branchName}</h1>
        </div>
        <button onClick={onLogout} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white', borderRadius: '10px', padding: '0.5rem 1rem', cursor: 'pointer', fontWeight: '600' }}>Гарах</button>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', padding: '0.75rem', overflowX: 'auto' }}>
        {[
          { label: 'Шинэ захиалга', value: pendingCount, color: '#F59E0B' },
          { label: 'NPS', value: npsScore !== null ? `${npsScore > 0 ? '+' : ''}${npsScore}` : '–', color: '#10B981' },
          { label: 'CSAT', value: avgCsat ? `${avgCsat}★` : '–', color: '#6366F1' },
          { label: 'Гомдол', value: pendingComplaints, color: '#EF4444' },
        ].map(s => (
          <div key={s.label} style={{ background: 'white', borderRadius: '14px', padding: '0.875rem 1.1rem', textAlign: 'center', minWidth: '80px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', flexShrink: 0 }}>
            <p style={{ fontSize: '1.4rem', fontWeight: '800', color: s.color, margin: '0 0 0.1rem' }}>{s.value}</p>
            <p style={{ fontSize: '0.65rem', color: '#78716C', margin: 0 }}>{s.label}</p>
          </div>
        ))}
      </div>

      <div style={{ background: 'white', display: 'flex', overflowX: 'auto', borderBottom: '2px solid #F5F5F4', position: 'sticky', top: '62px', zIndex: 10 }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{ padding: '0.875rem 1rem', border: 'none', borderBottom: `3px solid ${tab === t.id ? '#FF6B35' : 'transparent'}`, background: 'none', color: tab === t.id ? '#FF6B35' : '#78716C', fontWeight: tab === t.id ? '700' : '500', cursor: 'pointer', whiteSpace: 'nowrap', fontSize: '0.82rem', transition: 'all 0.2s' }}>
            {t.label}
          </button>
        ))}
      </div>

      <div style={{ padding: '0.75rem', maxWidth: '720px', margin: '0 auto' }}>

        {tab === 'tables' && (
          <>
            <div style={card}>
              <p style={{ fontWeight: '700', color: '#1C1917', marginBottom: '0.75rem' }}>Ширээний тоо тохируулах</p>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input type="number" value={tableCount} onChange={e => setTableCount(e.target.value)} min="1" max="200" style={{ ...inp, flex: 1, width: 'auto' }} />
                <button onClick={async () => { const n = parseInt(tableCount); if (!n) return; setLoading(true); await setTablesDB(branchId, n); setLoading(false); }} disabled={loading}
                  style={{ padding: '0.75rem 1.25rem', background: '#FF6B35', color: 'white', border: 'none', borderRadius: '12px', fontWeight: '700', cursor: 'pointer' }}>
                  {loading ? '...' : 'Хадгалах'}
                </button>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(160px,1fr))', gap: '0.75rem' }}>
              {tables.map(t => (
                <div key={t.id} style={{ background: 'white', borderRadius: '16px', padding: '1rem', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', borderTop: `4px solid ${t.status === 'occupied' ? '#EF4444' : '#10B981'}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <span style={{ fontWeight: '800', color: '#1C1917' }}>Ширээ {t.number}</span>
                    <span style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem', borderRadius: '20px', fontWeight: '700', background: t.status === 'occupied' ? '#FEE2E2' : '#DCFCE7', color: t.status === 'occupied' ? '#EF4444' : '#16A34A' }}>
                      {t.status === 'occupied' ? 'Дүүрэн' : 'Сул'}
                    </span>
                  </div>
                  <button onClick={() => setShowQR(showQR === t.number ? null : t.number)}
                    style={{ width: '100%', padding: '0.5rem', border: '2px solid #FF6B35', borderRadius: '10px', color: '#FF6B35', background: 'transparent', fontWeight: '700', cursor: 'pointer', fontSize: '0.8rem' }}>
                    {showQR === t.number ? '✕ Хаах' : '📱 QR'}
                  </button>
                  {showQR === t.number && (
                    <div style={{ marginTop: '0.75rem', textAlign: 'center' }}>
                      <img src={buildQR(branchId, t.number)} alt="" style={{ width: '100%', borderRadius: '8px' }} />
                      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', justifyContent: 'center' }}>
                        <a href={buildLink(branchId, t.number)} target="_blank" rel="noreferrer" style={{ fontSize: '0.75rem', color: '#FF6B35', textDecoration: 'none', fontWeight: '600' }}>↗ Нээх</a>
                        <button onClick={() => { const w = window.open('', '_blank'); if (w) { w.document.write(`<html><body style="text-align:center;font-family:sans-serif;padding:30px"><h2 style="color:#FF6B35">Ширээ ${t.number}</h2><img src="${buildQR(branchId, t.number)}" style="width:200px"><br><p style="font-size:11px">${buildLink(branchId, t.number)}</p><script>window.print()<\/script></body></html>`); w.document.close(); } }}
                          style={{ fontSize: '0.75rem', background: '#F5F5F4', border: 'none', borderRadius: '8px', padding: '0.25rem 0.5rem', cursor: 'pointer' }}>🖨️ Хэвлэх</button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}

        {tab === 'orders' && (
          <>
            {!orders.length && <div style={{ textAlign: 'center', padding: '3rem', color: '#78716C' }}><div style={{ fontSize: '3rem' }}>📋</div><p>Захиалга байхгүй</p></div>}
            {orders.map(o => (
              <div key={o.id} style={{ ...card, borderLeft: `4px solid ${ORDER_STATUS_COLORS[o.status]}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span style={{ fontWeight: '800', color: '#1C1917' }}>Ширээ {o.tableNumber}</span>
                  <span style={{ fontSize: '0.75rem', padding: '0.25rem 0.65rem', borderRadius: '20px', fontWeight: '700', background: ORDER_STATUS_COLORS[o.status] + '20', color: ORDER_STATUS_COLORS[o.status] }}>{ORDER_STATUS_LABELS[o.status]}</span>
                </div>
                {o.items.map((item, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', color: '#78716C', padding: '0.2rem 0' }}>
                    <span>{item.name} × {item.quantity}</span><span>{formatPrice(item.price * item.quantity)}</span>
                  </div>
                ))}
                {o.notes && <p style={{ margin: '0.5rem 0 0', fontSize: '0.8rem', color: '#D97706', background: '#FFFBEB', padding: '0.4rem 0.6rem', borderRadius: '8px' }}>📝 {o.notes}</p>}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid #F5F5F4' }}>
                  <span style={{ fontSize: '0.75rem', color: '#9CA3AF' }}>{formatTime(o.createdAt)}{o.customerPhone && ` · ☎ ${o.customerPhone}`}</span>
                  <span style={{ fontWeight: '800', color: '#FF6B35' }}>{formatPrice(o.totalAmount)}</span>
                </div>
              </div>
            ))}
          </>
        )}

        {/* MENU TAB - image management */}
        {tab === 'menu' && (
          <>
            <div style={{ ...card, background: '#FFF7ED', borderLeft: '4px solid #FF6B35' }}>
              <p style={{ fontWeight: '700', color: '#1C1917', margin: '0 0 0.35rem' }}>🖼️ Хоолны зураг нэмэх</p>
              <p style={{ color: '#78716C', fontSize: '0.82rem', margin: 0 }}>Хоол дарж зургийн URL оруулаарай. Unsplash, Google Photos, imgur гэх мэт сайтаас URL авч болно.</p>
            </div>
            {menuItems.map(item => (
              <div key={item.id} style={{ ...card, display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                <div style={{ width: '64px', height: '64px', borderRadius: '10px', overflow: 'hidden', flexShrink: 0, background: '#F5F5F4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {item.image
                    ? <img src={item.image} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                    : <span style={{ fontSize: '1.8rem' }}>🍽️</span>}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontWeight: '700', color: '#1C1917', margin: '0 0 0.15rem', fontSize: '0.9rem' }}>{item.name}</p>
                  <p style={{ color: '#78716C', fontSize: '0.75rem', margin: '0 0 0.5rem' }}>{item.category} · {formatPrice(item.price)}</p>
                  {editingImg === item.id ? (
                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                      <input value={imgUrl} onChange={e => setImgUrl(e.target.value)} placeholder="Зургийн URL..."
                        style={{ flex: 1, padding: '0.4rem 0.6rem', border: '1.5px solid #E7E5E4', borderRadius: '8px', fontSize: '0.78rem', outline: 'none', minWidth: 0 }} />
                      <button onClick={async () => { await updateMenuItem(branchId, item.id, { image: imgUrl }); setEditingImg(null); setImgUrl(''); }}
                        style={{ padding: '0.4rem 0.75rem', background: '#FF6B35', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '700', fontSize: '0.78rem' }}>✓</button>
                      <button onClick={() => { setEditingImg(null); setImgUrl(''); }}
                        style={{ padding: '0.4rem 0.6rem', background: '#F5F5F4', border: 'none', borderRadius: '8px', cursor: 'pointer', color: '#78716C', fontSize: '0.78rem' }}>✕</button>
                    </div>
                  ) : (
                    <button onClick={() => { setEditingImg(item.id); setImgUrl(item.image || ''); }}
                      style={{ padding: '0.35rem 0.75rem', border: '1.5px solid #FF6B35', borderRadius: '8px', color: '#FF6B35', background: 'transparent', fontWeight: '600', cursor: 'pointer', fontSize: '0.78rem' }}>
                      {item.image ? '✏️ Зураг солих' : '+ Зураг нэмэх'}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </>
        )}

        {tab === 'csat' && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
              {[
                { label: 'NPS оноо', value: npsScore !== null ? `${npsScore > 0 ? '+' : ''}${npsScore}` : '–', color: npsScore !== null && npsScore >= 0 ? '#10B981' : '#EF4444', bg: '#ECFDF5' },
                { label: 'CSAT дундаж', value: avgCsat ? `${avgCsat}/5` : '–', color: '#6366F1', bg: '#EEF2FF' },
                { label: 'Нийт хариулт', value: String(surveys.length), color: '#1C1917', bg: '#F5F5F4' },
                { label: 'Шийдвэрлэгдсэн', value: String(surveys.filter(s => s.resolved).length), color: '#10B981', bg: '#ECFDF5' },
              ].map(c => (
                <div key={c.label} style={{ background: c.bg, borderRadius: '16px', padding: '1.25rem', textAlign: 'center' }}>
                  <p style={{ fontSize: '2rem', fontWeight: '800', color: c.color, margin: '0 0 0.25rem' }}>{c.value}</p>
                  <p style={{ fontSize: '0.75rem', color: '#78716C', margin: 0 }}>{c.label}</p>
                </div>
              ))}
            </div>
            {surveys.filter(s => s.feedback).map(s => (
              <div key={s.id} style={card}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                  <span style={{ fontSize: '0.75rem', color: '#9CA3AF' }}>{formatDate(s.createdAt)} · Ширээ {s.tableNumber}</span>
                  <span>{'⭐'.repeat(s.csat)}</span>
                </div>
                <p style={{ margin: 0, color: '#44403C', fontSize: '0.9rem' }}>{s.feedback}</p>
              </div>
            ))}
          </>
        )}

        {tab === 'complaints' && (
          <>
            {!surveys.filter(s => s.phone || s.feedback).length && <div style={{ textAlign: 'center', padding: '3rem', color: '#78716C' }}><div style={{ fontSize: '3rem' }}>💬</div><p>Гомдол байхгүй</p></div>}
            {surveys.filter(s => s.phone || s.feedback).map(s => (
              <div key={s.id} style={{ ...card, borderLeft: `4px solid ${s.resolved ? '#10B981' : '#F59E0B'}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <div>
                    <p style={{ fontWeight: '800', color: '#1C1917', margin: '0 0 0.15rem' }}>{s.phone || 'Дугаар байхгүй'}</p>
                    <p style={{ fontSize: '0.75rem', color: '#9CA3AF', margin: 0 }}>{formatDate(s.createdAt)} · Ширээ {s.tableNumber}</p>
                  </div>
                  <div style={{ display: 'flex', gap: '0.35rem' }}>
                    <span style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem', background: '#F5F5F4', borderRadius: '8px' }}>NPS {s.nps}</span>
                    <span style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem', background: '#F5F5F4', borderRadius: '8px' }}>⭐{s.csat}</span>
                  </div>
                </div>
                {s.feedback && <p style={{ background: '#FFF7ED', padding: '0.6rem 0.75rem', borderRadius: '10px', fontSize: '0.875rem', color: '#44403C', margin: '0 0 0.75rem' }}>{s.feedback}</p>}
                {!s.resolved && (
                  <input value={resolveNote[s.id] || ''} onChange={e => setResolveNote(n => ({ ...n, [s.id]: e.target.value }))}
                    placeholder="Шийдвэрлэлтийн тэмдэглэл..." style={{ ...inp, marginBottom: '0.5rem', fontSize: '0.82rem', padding: '0.55rem 0.75rem' }} />
                )}
                <button onClick={() => setSurveyResolved(branchId, s.id, !s.resolved, resolveNote[s.id])}
                  style={{ padding: '0.5rem 1rem', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: '700', fontSize: '0.85rem', background: s.resolved ? '#DCFCE7' : '#FEF3C7', color: s.resolved ? '#16A34A' : '#D97706' }}>
                  {s.resolved ? '✅ Шийдэгдсэн' : '🔴 Шийдвэрлэсэн болгох'}
                </button>
              </div>
            ))}
          </>
        )}

        {tab === 'staff' && (
          <>
            <div style={card}>
              <p style={{ fontWeight: '700', color: '#1C1917', marginBottom: '0.75rem' }}>Ажилтан нэмэх</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <input value={newStaffName} onChange={e => setNewStaffName(e.target.value)} placeholder="Нэр" style={inp} />
                <select value={newStaffRole} onChange={e => setNewStaffRole(e.target.value as any)} style={{ ...inp, background: 'white' }}>
                  <option value="chef">👨‍🍳 Тогооч</option>
                  <option value="waiter">🛎️ Зөөгч</option>
                </select>
                <input value={newStaffPin} onChange={e => setNewStaffPin(e.target.value)} type="password" placeholder="PIN" style={inp} />
                <button onClick={async () => { if (!newStaffName || !newStaffPin) return; await addStaff(branchId, newStaffName, newStaffRole, newStaffPin); getStaff(branchId).then(setStaffList); setNewStaffName(''); setNewStaffPin(''); }}
                  style={{ padding: '0.875rem', background: '#FF6B35', color: 'white', border: 'none', borderRadius: '12px', fontWeight: '700', cursor: 'pointer' }}>➕ Нэмэх</button>
              </div>
            </div>
            {staffList.map(s => (
              <div key={s.id} style={{ ...card, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: s.role === 'chef' ? '#FFF7ED' : '#ECFDF5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem' }}>
                    {s.role === 'chef' ? '👨‍🍳' : '🛎️'}
                  </div>
                  <div>
                    <p style={{ fontWeight: '700', color: '#1C1917', margin: 0 }}>{s.name}</p>
                    <p style={{ fontSize: '0.75rem', color: '#78716C', margin: 0 }}>{s.role === 'chef' ? 'Тогооч' : 'Зөөгч'}</p>
                  </div>
                </div>
                <button onClick={async () => { await removeStaff(branchId, s.id); getStaff(branchId).then(setStaffList); }}
                  style={{ background: '#FEE2E2', border: 'none', color: '#EF4444', borderRadius: '8px', padding: '0.4rem 0.75rem', cursor: 'pointer', fontWeight: '600', fontSize: '0.8rem' }}>Устгах</button>
              </div>
            ))}
            {!staffList.length && <p style={{ textAlign: 'center', color: '#9CA3AF', padding: '2rem' }}>Ажилтан байхгүй</p>}
          </>
        )}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════
// KITCHEN PANEL
// ════════════════════════════════════════════════════════
function KitchenPanel({ branchId, staff, onLogout }: { branchId: string; staff: Staff; onLogout: () => void }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [filter, setFilter] = useState<Order['status'] | 'all'>('all');
  useEffect(() => subscribeToOrders(branchId, setOrders), [branchId]);

  const NEXT: Partial<Record<Order['status'], Order['status']>> = { pending: 'preparing', preparing: 'ready', ready: 'served' };
  const NEXT_LABEL: Partial<Record<Order['status'], string>> = { pending: '👨‍🍳 Бэлтгэж эхлэх', preparing: '✅ Бэлэн боллоо', ready: '🛎️ Хүргэгдсэн' };
  const NEXT_COLOR: Partial<Record<Order['status'], string>> = { pending: '#3B82F6', preparing: '#10B981', ready: '#8B5CF6' };
  const counts = { pending: orders.filter(o => o.status === 'pending').length, preparing: orders.filter(o => o.status === 'preparing').length, ready: orders.filter(o => o.status === 'ready').length };
  const active = filter === 'all' ? orders.filter(o => o.status !== 'served') : orders.filter(o => o.status === filter);
  const FILTERS = [
    { id: 'all' as const, label: 'Бүгд', color: '#FF6B35' },
    { id: 'pending' as const, label: `🟡 Шинэ${counts.pending ? ` (${counts.pending})` : ''}`, color: '#F59E0B' },
    { id: 'preparing' as const, label: `🔵 Бэлтгэж${counts.preparing ? ` (${counts.preparing})` : ''}`, color: '#3B82F6' },
    { id: 'ready' as const, label: `🟢 Бэлэн${counts.ready ? ` (${counts.ready})` : ''}`, color: '#10B981' },
  ];

  return (
    <div style={{ minHeight: '100vh', background: '#F8FAFC' }}>
      <div style={{ background: staff.role === 'chef' ? 'linear-gradient(135deg,#1E3A5F,#2D5A8E)' : 'linear-gradient(135deg,#064E3B,#065F46)', padding: '1rem 1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 20 }}>
        <div>
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.75rem', margin: 0 }}>{staff.role === 'chef' ? '👨‍🍳 Тогооч' : '🛎️ Зөөгч'}</p>
          <h1 style={{ color: 'white', fontWeight: '800', margin: 0, fontSize: '1.1rem' }}>{staff.name}</h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {counts.pending > 0 && <div style={{ background: '#F59E0B', color: 'white', borderRadius: '20px', padding: '0.3rem 0.8rem', fontSize: '0.8rem', fontWeight: '800' }}>🔔 {counts.pending} шинэ</div>}
          <button onClick={onLogout} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: 'white', borderRadius: '10px', padding: '0.5rem 1rem', cursor: 'pointer', fontWeight: '600' }}>Гарах</button>
        </div>
      </div>
      <div style={{ background: 'white', display: 'flex', gap: '0.5rem', padding: '0.75rem 1rem', overflowX: 'auto', borderBottom: '1px solid #E7E5E4', position: 'sticky', top: '58px', zIndex: 10 }}>
        {FILTERS.map(f => (
          <button key={f.id} onClick={() => setFilter(f.id)}
            style={{ padding: '0.5rem 1rem', border: 'none', borderRadius: '20px', cursor: 'pointer', whiteSpace: 'nowrap', fontWeight: '700', fontSize: '0.82rem', background: filter === f.id ? f.color : '#F5F5F4', color: filter === f.id ? 'white' : '#78716C', transition: 'all 0.2s' }}>
            {f.label}
          </button>
        ))}
      </div>
      <div style={{ padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', maxWidth: '720px', margin: '0 auto' }}>
        {!active.length && <div style={{ textAlign: 'center', padding: '4rem 2rem', color: '#78716C' }}><div style={{ fontSize: '4rem', marginBottom: '0.75rem' }}>🎉</div><p style={{ fontWeight: '700' }}>Захиалга байхгүй</p></div>}
        {active.map(order => (
          <div key={order.id} style={{ background: 'white', borderRadius: '20px', overflow: 'hidden', boxShadow: '0 4px 16px rgba(0,0,0,0.07)', borderTop: `5px solid ${ORDER_STATUS_COLORS[order.status]}` }}>
            <div style={{ padding: '1rem 1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #F5F5F4' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
                <span style={{ fontSize: '2.5rem', fontWeight: '900', color: '#1C1917', lineHeight: 1 }}>{order.tableNumber}</span>
                <span style={{ color: '#78716C', fontWeight: '600' }}>ширээ</span>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.75rem', padding: '0.25rem 0.75rem', borderRadius: '20px', fontWeight: '700', background: ORDER_STATUS_COLORS[order.status] + '20', color: ORDER_STATUS_COLORS[order.status] }}>{ORDER_STATUS_LABELS[order.status]}</div>
                <p style={{ fontSize: '0.72rem', color: '#9CA3AF', margin: '0.25rem 0 0' }}>{formatTime(order.createdAt)}</p>
              </div>
            </div>
            <div style={{ padding: '1rem 1.25rem' }}>
              {order.items.map((item, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.4rem 0', borderBottom: i < order.items.length - 1 ? '1px dashed #F5F5F4' : 'none' }}>
                  <span style={{ fontWeight: '700', color: '#1C1917', fontSize: '0.95rem' }}>{item.name}</span>
                  <span style={{ background: '#F5F5F4', borderRadius: '20px', padding: '0.2rem 0.75rem', fontWeight: '800', color: '#44403C' }}>×{item.quantity}</span>
                </div>
              ))}
              {order.notes && <div style={{ marginTop: '0.75rem', background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: '10px', padding: '0.5rem 0.75rem' }}><p style={{ margin: 0, fontSize: '0.85rem', color: '#D97706', fontWeight: '600' }}>📝 {order.notes}</p></div>}
              {order.customerPhone && <p style={{ margin: '0.5rem 0 0', fontSize: '0.78rem', color: '#9CA3AF' }}>☎ {order.customerPhone}</p>}
            </div>
            {NEXT[order.status] && (
              <div style={{ padding: '0 1.25rem 1.25rem' }}>
                <button onClick={() => updateOrderStatus(branchId, order.id, NEXT[order.status]!)}
                  style={{ width: '100%', padding: '0.875rem', background: NEXT_COLOR[order.status], color: 'white', border: 'none', borderRadius: '14px', fontWeight: '800', cursor: 'pointer', fontSize: '0.95rem' }}>
                  {NEXT_LABEL[order.status]}
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
