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

const CATEGORY_EMOJI: Record<string, string> = {
  'Үндсэн хоол': '🍖', 'Шөл': '🍲', 'Ундаа': '🥤', 'Десерт': '🍰',
  'Салад': '🥗', 'Хоолны дараа': '☕', 'Тусгай': '⭐',
};
const getCatEmoji = (cat: string) => CATEGORY_EMOJI[cat] || '🍽️';

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

// ══════════════════════════════════════════════════════
// LANDING
// ══════════════════════════════════════════════════════
function LandingView({ onManager, onStaff }: {
  onManager: (id: string) => void;
  onStaff: (id: string, staff: Staff) => void;
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

  const handleCreate = async () => {
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
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #FF6B35 0%, #F7931E 50%, #FFD700 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div style={{ width: '100%', maxWidth: '380px', background: 'white', borderRadius: '24px', padding: '2rem', boxShadow: '0 25px 50px rgba(0,0,0,0.15)' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ fontSize: '3.5rem', marginBottom: '0.5rem' }}>🍽️</div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: '800', color: '#1C1917', margin: 0 }}>Ресторан систем</h1>
          <p style={{ color: '#78716C', fontSize: '0.875rem', marginTop: '0.25rem' }}>Нэвтрэх эрхээ сонгоно уу</p>
        </div>

        {mode === 'select' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {[
              { label: '👔 Менежер', color: '#FF6B35', onClick: () => setMode('manager') },
              { label: '👨‍🍳 Тогооч / Зөөгч', color: '#10B981', onClick: () => setMode('staff') },
            ].map(btn => (
              <button key={btn.label} onClick={btn.onClick}
                style={{ padding: '0.875rem', background: btn.color, color: 'white', border: 'none', borderRadius: '14px', fontWeight: '700', fontSize: '1rem', cursor: 'pointer', transition: 'opacity 0.2s' }}
                onMouseOver={e => (e.currentTarget.style.opacity = '0.9')} onMouseOut={e => (e.currentTarget.style.opacity = '1')}>
                {btn.label}
              </button>
            ))}
            <button onClick={() => setMode('new')}
              style={{ padding: '0.875rem', background: 'transparent', border: '2px dashed #E7E5E4', borderRadius: '14px', color: '#78716C', fontWeight: '600', cursor: 'pointer' }}>
              ➕ Шинэ салбар үүсгэх
            </button>
          </div>
        )}

        {(mode === 'manager' || mode === 'staff') && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ background: mode === 'manager' ? '#FFF7ED' : '#ECFDF5', borderRadius: '12px', padding: '0.75rem', textAlign: 'center', fontWeight: '700', color: mode === 'manager' ? '#FF6B35' : '#10B981' }}>
              {mode === 'manager' ? '👔 Менежер нэвтрэх' : '👨‍🍳 Ажилтан нэвтрэх'}
            </div>
            <select value={branchId} onChange={e => setBranchId(e.target.value)}
              style={{ padding: '0.75rem 1rem', border: '2px solid #E7E5E4', borderRadius: '12px', fontSize: '0.9rem', outline: 'none', background: 'white' }}>
              <option value="">Салбар сонгоно уу</option>
              {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
            <input type="password" value={pin} onChange={e => { setPin(e.target.value); setError(''); }}
              placeholder="PIN оруулна уу" onKeyDown={e => e.key === 'Enter' && (mode === 'manager' ? handleManagerLogin() : handleStaffLogin())}
              style={{ padding: '0.75rem 1rem', border: '2px solid #E7E5E4', borderRadius: '12px', fontSize: '0.9rem', outline: 'none' }} />
            {error && <p style={{ color: '#EF4444', fontSize: '0.85rem', textAlign: 'center', margin: 0 }}>{error}</p>}
            <button onClick={mode === 'manager' ? handleManagerLogin : handleStaffLogin} disabled={loading}
              style={{ padding: '0.875rem', background: mode === 'manager' ? '#FF6B35' : '#10B981', color: 'white', border: 'none', borderRadius: '14px', fontWeight: '700', fontSize: '1rem', cursor: 'pointer', opacity: loading ? 0.6 : 1 }}>
              {loading ? 'Нэвтрэж байна...' : 'Нэвтрэх'}
            </button>
            <button onClick={() => { setMode('select'); setError(''); setPin(''); }}
              style={{ background: 'none', border: 'none', color: '#9CA3AF', cursor: 'pointer', padding: '0.5rem' }}>← Буцах</button>
          </div>
        )}

        {mode === 'new' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ background: '#FFF7ED', borderRadius: '12px', padding: '0.75rem', textAlign: 'center', fontWeight: '700', color: '#FF6B35' }}>
              ✨ Шинэ салбар үүсгэх
            </div>
            {[
              { value: newName, onChange: setNewName, placeholder: 'Салбарын нэр *', type: 'text' },
              { value: newAddr, onChange: setNewAddr, placeholder: 'Хаяг (заавал биш)', type: 'text' },
              { value: newPin, onChange: setNewPin, placeholder: 'Менежерийн PIN (4+ тоо) *', type: 'password' },
            ].map((inp, i) => (
              <input key={i} type={inp.type} value={inp.value} onChange={e => inp.onChange(e.target.value)}
                placeholder={inp.placeholder}
                style={{ padding: '0.75rem 1rem', border: '2px solid #E7E5E4', borderRadius: '12px', fontSize: '0.9rem', outline: 'none' }} />
            ))}
            {error && <p style={{ color: '#EF4444', fontSize: '0.85rem', textAlign: 'center', margin: 0 }}>{error}</p>}
            <button onClick={handleCreate} disabled={loading}
              style={{ padding: '0.875rem', background: '#FF6B35', color: 'white', border: 'none', borderRadius: '14px', fontWeight: '700', cursor: 'pointer', opacity: loading ? 0.6 : 1 }}>
              {loading ? 'Үүсгэж байна...' : '✅ Салбар үүсгэх'}
            </button>
            <button onClick={() => { setMode('select'); setError(''); }}
              style={{ background: 'none', border: 'none', color: '#9CA3AF', cursor: 'pointer', padding: '0.5rem' }}>← Буцах</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════
// CUSTOMER VIEW
// ══════════════════════════════════════════════════════
type CartItem = { item: MenuItem; qty: number };
type CustomerPhase = 'menu' | 'checkout' | 'tracking' | 'survey' | 'done';

const STATUS_STEPS: Order['status'][] = ['pending', 'preparing', 'ready', 'served'];

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
    setCart([]); setLoading(false); setPhase('tracking');
  };

  const submitSurvey = async () => {
    if (!survey.nps || !survey.csat) return;
    await createSurvey(branchId, { tableNumber: tableNum, nps: survey.nps, csat: survey.csat, feedback: survey.feedback, phone: phone || undefined });
    setPhase('done');
  };

  const S = { card: { background: 'white', borderRadius: '16px', padding: '1rem', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', marginBottom: '0.75rem' } };

  if (phase === 'done') return (
    <div style={{ minHeight: '100vh', background: '#FFF7ED', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '1rem', padding: '2rem', textAlign: 'center' }}>
      <div style={{ fontSize: '4rem' }}>🙏</div>
      <h2 style={{ fontWeight: '800', fontSize: '1.5rem', color: '#1C1917', margin: 0 }}>Баярлалаа!</h2>
      <p style={{ color: '#78716C', margin: 0 }}>Таны санал бидэнд маш чухал</p>
      <button onClick={() => { setPhase('menu'); setSurvey({ nps: 0, csat: 0, feedback: '' }); }}
        style={{ marginTop: '1rem', padding: '0.875rem 2rem', background: '#FF6B35', color: 'white', border: 'none', borderRadius: '14px', fontWeight: '700', cursor: 'pointer', fontSize: '1rem' }}>
        ➕ Дахин захиалах
      </button>
    </div>
  );

  if (phase === 'survey') return (
    <div style={{ minHeight: '100vh', background: '#FFF7ED', padding: '1rem' }}>
      <div style={{ maxWidth: '420px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
          <div style={{ fontSize: '3rem' }}>⭐</div>
          <h2 style={{ fontWeight: '800', color: '#1C1917', margin: '0.5rem 0 0.25rem' }}>Сэтгэл ханамжийн судалгаа</h2>
          <p style={{ color: '#78716C', margin: 0, fontSize: '0.9rem' }}>Хоолоо сайн идсэн үү?</p>
        </div>
        <div style={{ ...S.card, padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div>
            <p style={{ fontWeight: '700', color: '#1C1917', marginBottom: '0.75rem' }}>Манай ресторанг найздаа зөвлөх үү? (0-10)</p>
            <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
              {Array.from({ length: 11 }, (_, i) => (
                <button key={i} onClick={() => setSurvey(s => ({ ...s, nps: i }))}
                  style={{ width: '38px', height: '38px', borderRadius: '10px', border: 'none', fontWeight: '700', cursor: 'pointer', background: survey.nps === i ? '#FF6B35' : '#F5F5F4', color: survey.nps === i ? 'white' : '#78716C', transition: 'all 0.15s' }}>
                  {i}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p style={{ fontWeight: '700', color: '#1C1917', marginBottom: '0.75rem' }}>Өнөөдрийн үйлчилгээ хэдэн одтой?</p>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {[1, 2, 3, 4, 5].map(n => (
                <button key={n} onClick={() => setSurvey(s => ({ ...s, csat: n }))}
                  style={{ fontSize: '2rem', background: 'none', border: 'none', cursor: 'pointer', opacity: survey.csat >= n ? 1 : 0.25, transform: survey.csat >= n ? 'scale(1.1)' : 'scale(1)', transition: 'all 0.15s' }}>⭐</button>
              ))}
            </div>
          </div>
          <div>
            <p style={{ fontWeight: '700', color: '#1C1917', marginBottom: '0.5rem' }}>Санал, сэтгэгдэл</p>
            <textarea value={survey.feedback} onChange={e => setSurvey(s => ({ ...s, feedback: e.target.value }))}
              rows={3} placeholder="Та юу гэж бодож байна?"
              style={{ width: '100%', padding: '0.75rem', border: '2px solid #E7E5E4', borderRadius: '12px', fontSize: '0.9rem', outline: 'none', resize: 'none', boxSizing: 'border-box' }} />
          </div>
          <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="☎ Утасны дугаар (заавал биш)"
            style={{ padding: '0.75rem 1rem', border: '2px solid #E7E5E4', borderRadius: '12px', fontSize: '0.9rem', outline: 'none' }} />
          <button onClick={submitSurvey} disabled={!survey.nps || !survey.csat}
            style={{ padding: '1rem', background: '#FF6B35', color: 'white', border: 'none', borderRadius: '14px', fontWeight: '700', cursor: 'pointer', fontSize: '1rem', opacity: (!survey.nps || !survey.csat) ? 0.4 : 1 }}>
            Илгээх
          </button>
        </div>
      </div>
    </div>
  );

  if (phase === 'tracking') return (
    <div style={{ minHeight: '100vh', background: '#FFF7ED', padding: '1rem' }}>
      <div style={{ maxWidth: '420px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', padding: '1.5rem 0 1rem' }}>
          <p style={{ color: '#78716C', fontSize: '0.85rem', margin: '0 0 0.25rem' }}>{branchName} · Ширээ {tableNum}</p>
          <h2 style={{ fontWeight: '800', color: '#1C1917', margin: 0, fontSize: '1.4rem' }}>Захиалгын төлөв</h2>
        </div>
        {activeOrder ? (
          <>
            {/* Progress steps */}
            <div style={{ ...S.card, padding: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', position: 'relative', marginBottom: '1.5rem' }}>
                <div style={{ position: 'absolute', top: '20px', left: '12%', right: '12%', height: '3px', background: '#E7E5E4', zIndex: 0 }} />
                {STATUS_STEPS.map((s, i) => {
                  const curIdx = STATUS_STEPS.indexOf(activeOrder.status);
                  const done = i <= curIdx;
                  const labels = ['Хүлээж байна', 'Бэлтгэж байна', 'Бэлэн болсон', 'Хүргэгдсэн'];
                  return (
                    <div key={s} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', zIndex: 1, flex: 1 }}>
                      <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: done ? ORDER_STATUS_COLORS[s] : '#E7E5E4', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', transition: 'all 0.3s' }}>
                        {done ? ['📋', '👨‍🍳', '✅', '🛎️'][i] : '○'}
                      </div>
                      <span style={{ fontSize: '0.65rem', color: done ? ORDER_STATUS_COLORS[s] : '#9CA3AF', fontWeight: done ? '700' : '400', textAlign: 'center' }}>{labels[i]}</span>
                    </div>
                  );
                })}
              </div>
              <div style={{ background: '#FFF7ED', borderRadius: '12px', padding: '1rem' }}>
                {activeOrder.items.map((item, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.35rem 0', borderBottom: i < activeOrder.items.length - 1 ? '1px solid #F5F5F4' : 'none', fontSize: '0.9rem', color: '#44403C' }}>
                    <span>{item.name} × {item.quantity}</span>
                    <span style={{ fontWeight: '600' }}>{formatPrice(item.price * item.quantity)}</span>
                  </div>
                ))}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '2px solid #E7E5E4', fontWeight: '800', color: '#1C1917' }}>
                  <span>Нийт</span>
                  <span style={{ color: '#FF6B35' }}>{formatPrice(activeOrder.totalAmount)}</span>
                </div>
              </div>
            </div>
          </>
        ) : orders.length > 0 ? (
          <div style={{ ...S.card, textAlign: 'center', padding: '2rem' }}>
            <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>✅</div>
            <p style={{ fontWeight: '700', color: '#1C1917' }}>Захиалга бэлэн боллоо!</p>
          </div>
        ) : null}
        <button onClick={() => setPhase('menu')}
          style={{ width: '100%', padding: '1rem', background: '#FF6B35', color: 'white', border: 'none', borderRadius: '14px', fontWeight: '700', cursor: 'pointer', fontSize: '1rem' }}>
          ➕ Нэмж захиалах
        </button>
      </div>
    </div>
  );

  if (phase === 'checkout') return (
    <div style={{ minHeight: '100vh', background: '#FFF7ED', padding: '1rem' }}>
      <div style={{ maxWidth: '420px', margin: '0 auto' }}>
        <button onClick={() => setPhase('menu')} style={{ background: 'none', border: 'none', color: '#78716C', cursor: 'pointer', padding: '0.5rem 0', marginBottom: '0.5rem', fontSize: '0.9rem' }}>← Буцах</button>
        <h2 style={{ fontWeight: '800', color: '#1C1917', marginBottom: '1rem', fontSize: '1.3rem' }}>Захиалга батлах</h2>
        <div style={S.card}>
          <p style={{ fontSize: '0.8rem', color: '#78716C', margin: '0 0 0.75rem' }}>{branchName} · Ширээ {tableNum}</p>
          {cart.map((c, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid #F5F5F4', fontSize: '0.9rem' }}>
              <span style={{ color: '#44403C' }}>{c.item.name} × {c.qty}</span>
              <span style={{ fontWeight: '700', color: '#1C1917' }}>{formatPrice(c.item.price * c.qty)}</span>
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '2px solid #E7E5E4', fontWeight: '800', fontSize: '1.1rem' }}>
            <span style={{ color: '#1C1917' }}>Нийт дүн</span>
            <span style={{ color: '#FF6B35' }}>{formatPrice(totalPrice)}</span>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', margin: '1rem 0' }}>
          <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="☎ Утасны дугаар (заавал биш)"
            style={{ padding: '0.875rem 1rem', border: '2px solid #E7E5E4', borderRadius: '14px', fontSize: '0.9rem', outline: 'none', background: 'white' }} />
          <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="📝 Нэмэлт тайлбар..." rows={2}
            style={{ padding: '0.875rem 1rem', border: '2px solid #E7E5E4', borderRadius: '14px', fontSize: '0.9rem', outline: 'none', resize: 'none', background: 'white' }} />
        </div>
        <button onClick={placeOrder} disabled={loading}
          style={{ width: '100%', padding: '1.1rem', background: '#FF6B35', color: 'white', border: 'none', borderRadius: '16px', fontWeight: '800', cursor: 'pointer', fontSize: '1.1rem', opacity: loading ? 0.7 : 1 }}>
          {loading ? 'Илгээж байна...' : '✅ Захиалах'}
        </button>
      </div>
    </div>
  );

  // MENU
  return (
    <div style={{ minHeight: '100vh', background: '#FFF7ED', paddingBottom: '6rem' }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #FF6B35, #F7931E)', padding: '1.25rem 1rem 1rem', position: 'sticky', top: 0, zIndex: 20 }}>
        <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.8rem', margin: '0 0 0.15rem' }}>{branchName}</p>
        <h1 style={{ color: 'white', fontWeight: '800', fontSize: '1.2rem', margin: 0 }}>🍽️ Ширээ {tableNum} · Цэс</h1>
        {activeOrder && (
          <button onClick={() => setPhase('tracking')}
            style={{ marginTop: '0.5rem', background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '20px', color: 'white', padding: '0.35rem 0.75rem', fontSize: '0.75rem', cursor: 'pointer', fontWeight: '700' }}>
            ● {ORDER_STATUS_LABELS[activeOrder.status]} →
          </button>
        )}
      </div>

      {/* Category tabs */}
      <div style={{ background: 'white', padding: '0.75rem 1rem', display: 'flex', gap: '0.5rem', overflowX: 'auto', borderBottom: '1px solid #F5F5F4', position: 'sticky', top: activeOrder ? '82px' : '72px', zIndex: 10 }}>
        {categories.map(cat => (
          <button key={cat} onClick={() => setActiveCat(cat)}
            style={{ padding: '0.4rem 1rem', borderRadius: '20px', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap', fontWeight: '700', fontSize: '0.85rem', transition: 'all 0.2s', background: activeCat === cat ? '#FF6B35' : '#F5F5F4', color: activeCat === cat ? 'white' : '#78716C' }}>
            {getCatEmoji(cat)} {cat}
          </button>
        ))}
      </div>

      {/* Menu items */}
      <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {menuItems.filter(i => i.category === activeCat).map(item => {
          const qty = getQty(item.id);
          return (
            <div key={item.id} style={{ background: 'white', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', display: 'flex', alignItems: 'center' }}>
              {/* Image / placeholder */}
              <div style={{ width: '90px', height: '90px', flexShrink: 0, background: 'linear-gradient(135deg, #FFE4D4, #FFD4B8)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.5rem' }}>
                {item.image ? <img src={item.image} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : getCatEmoji(item.category)}
              </div>
              <div style={{ flex: 1, padding: '0.75rem', minWidth: 0 }}>
                <p style={{ fontWeight: '800', color: '#1C1917', margin: '0 0 0.2rem', fontSize: '0.95rem' }}>{item.name}</p>
                <p style={{ color: '#78716C', fontSize: '0.78rem', margin: '0 0 0.35rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.description}</p>
                <p style={{ color: '#FF6B35', fontWeight: '800', margin: 0, fontSize: '1rem' }}>{formatPrice(item.price)}</p>
              </div>
              <div style={{ padding: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {qty > 0 ? (
                  <>
                    <button onClick={() => changeQty(item, -1)}
                      style={{ width: '32px', height: '32px', borderRadius: '50%', border: 'none', background: '#F5F5F4', color: '#44403C', fontSize: '1.2rem', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
                    <span style={{ fontWeight: '800', color: '#1C1917', minWidth: '20px', textAlign: 'center' }}>{qty}</span>
                    <button onClick={() => changeQty(item, 1)}
                      style={{ width: '32px', height: '32px', borderRadius: '50%', border: 'none', background: '#FF6B35', color: 'white', fontSize: '1.2rem', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                  </>
                ) : (
                  <button onClick={() => changeQty(item, 1)}
                    style={{ width: '36px', height: '36px', borderRadius: '50%', border: 'none', background: '#FF6B35', color: 'white', fontSize: '1.4rem', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Cart button */}
      {cartCount > 0 && (
        <div style={{ position: 'fixed', bottom: '1rem', left: '1rem', right: '1rem', zIndex: 30 }}>
          <button onClick={() => setPhase('checkout')}
            style={{ width: '100%', padding: '1.1rem 1.5rem', background: 'linear-gradient(135deg, #FF6B35, #F7931E)', color: 'white', border: 'none', borderRadius: '18px', fontWeight: '800', fontSize: '1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 8px 25px rgba(255,107,53,0.4)' }}>
            <span style={{ background: 'rgba(255,255,255,0.25)', borderRadius: '50%', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800' }}>{cartCount}</span>
            <span>Захиалга харах</span>
            <span style={{ background: 'rgba(0,0,0,0.15)', padding: '0.25rem 0.75rem', borderRadius: '20px' }}>{formatPrice(totalPrice)}</span>
          </button>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════
// MANAGER PANEL
// ══════════════════════════════════════════════════════
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

  const npsArr = surveys.map(s => s.nps);
  const npsScore = npsArr.length ? Math.round(((npsArr.filter(n => n >= 9).length - npsArr.filter(n => n <= 6).length) / npsArr.length) * 100) : null;
  const avgCsat = surveys.length ? (surveys.reduce((s, x) => s + x.csat, 0) / surveys.length).toFixed(1) : null;
  const pendingCount = orders.filter(o => o.status === 'pending').length;
  const pendingComplaints = surveys.filter(s => !s.resolved && (s.phone || s.feedback)).length;

  const TABS: { id: ManagerTab; label: string }[] = [
    { id: 'tables', label: '🪑 Ширээ' },
    { id: 'orders', label: `📋 ${pendingCount > 0 ? `(${pendingCount})` : 'Захиалга'}` },
    { id: 'csat', label: '📊 CSAT' },
    { id: 'complaints', label: `💬${pendingComplaints > 0 ? ` (${pendingComplaints})` : ''}` },
    { id: 'staff', label: '👥 Ажилтан' },
  ];

  const S = {
    card: { background: 'white', borderRadius: '16px', padding: '1rem', boxShadow: '0 2px 12px rgba(0,0,0,0.05)', marginBottom: '0.75rem' },
    input: { padding: '0.75rem 1rem', border: '2px solid #E7E5E4', borderRadius: '12px', fontSize: '0.9rem', outline: 'none', width: '100%', boxSizing: 'border-box' as const },
    btn: { padding: '0.75rem 1.25rem', background: '#FF6B35', color: 'white', border: 'none', borderRadius: '12px', fontWeight: '700', cursor: 'pointer' },
  };

  return (
    <div style={{ minHeight: '100vh', background: '#FFF7ED' }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #FF6B35, #F7931E)', padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 20 }}>
        <div>
          <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.75rem', margin: 0 }}>👔 Менежер</p>
          <h1 style={{ color: 'white', fontWeight: '800', margin: 0, fontSize: '1.1rem' }}>{branchName}</h1>
        </div>
        <button onClick={onLogout} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white', borderRadius: '10px', padding: '0.5rem 1rem', cursor: 'pointer', fontWeight: '600' }}>Гарах</button>
      </div>

      {/* Stats row */}
      <div style={{ display: 'flex', gap: '0.5rem', padding: '0.75rem', overflowX: 'auto' }}>
        {[
          { label: 'Шинэ захиалга', value: pendingCount, color: '#F59E0B' },
          { label: 'NPS оноо', value: npsScore !== null ? `${npsScore > 0 ? '+' : ''}${npsScore}` : '–', color: '#10B981' },
          { label: 'CSAT', value: avgCsat ? `${avgCsat}★` : '–', color: '#6366F1' },
          { label: 'Гомдол', value: pendingComplaints, color: '#EF4444' },
        ].map(s => (
          <div key={s.label} style={{ background: 'white', borderRadius: '14px', padding: '0.75rem 1rem', textAlign: 'center', minWidth: '80px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', flexShrink: 0 }}>
            <p style={{ fontSize: '1.3rem', fontWeight: '800', color: s.color, margin: '0 0 0.15rem' }}>{s.value}</p>
            <p style={{ fontSize: '0.65rem', color: '#78716C', margin: 0 }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Tab bar */}
      <div style={{ background: 'white', display: 'flex', overflowX: 'auto', borderBottom: '2px solid #F5F5F4', position: 'sticky', top: '60px', zIndex: 10 }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{ padding: '0.75rem 1rem', border: 'none', borderBottom: `3px solid ${tab === t.id ? '#FF6B35' : 'transparent'}`, background: 'none', color: tab === t.id ? '#FF6B35' : '#78716C', fontWeight: tab === t.id ? '700' : '500', cursor: 'pointer', whiteSpace: 'nowrap', fontSize: '0.85rem', transition: 'all 0.2s' }}>
            {t.label}
          </button>
        ))}
      </div>

      <div style={{ padding: '0.75rem', maxWidth: '640px', margin: '0 auto' }}>

        {/* TABLES */}
        {tab === 'tables' && (
          <>
            <div style={S.card}>
              <p style={{ fontWeight: '700', color: '#1C1917', marginBottom: '0.75rem' }}>Ширээний тоо</p>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input type="number" value={tableCount} onChange={e => setTableCount(e.target.value)} min="1" max="200"
                  style={{ ...S.input, flex: 1, width: 'auto' }} />
                <button onClick={handleSetTables} disabled={loading} style={{ ...S.btn, flexShrink: 0 }}>
                  {loading ? '...' : 'Хадгалах'}
                </button>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '0.75rem' }}>
              {tables.map(t => (
                <div key={t.id} style={{ background: 'white', borderRadius: '16px', padding: '1rem', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', borderTop: `4px solid ${t.status === 'occupied' ? '#EF4444' : '#10B981'}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <span style={{ fontWeight: '800', fontSize: '1.1rem', color: '#1C1917' }}>Ширээ {t.number}</span>
                    <span style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem', borderRadius: '20px', fontWeight: '700', background: t.status === 'occupied' ? '#FEE2E2' : '#DCFCE7', color: t.status === 'occupied' ? '#EF4444' : '#16A34A' }}>
                      {t.status === 'occupied' ? 'Дүүрэн' : 'Сул'}
                    </span>
                  </div>
                  <button onClick={() => setShowQR(showQR === t.number ? null : t.number)}
                    style={{ width: '100%', padding: '0.5rem', border: '2px solid #FF6B35', borderRadius: '10px', color: '#FF6B35', background: 'transparent', fontWeight: '700', cursor: 'pointer', fontSize: '0.8rem' }}>
                    {showQR === t.number ? '✕ Хаах' : '📱 QR харах'}
                  </button>
                  {showQR === t.number && (
                    <div style={{ marginTop: '0.75rem', textAlign: 'center' }}>
                      <img src={buildQR(branchId, t.number)} alt="" style={{ width: '100%', maxWidth: '160px', borderRadius: '10px' }} />
                      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', justifyContent: 'center' }}>
                        <a href={buildLink(branchId, t.number)} target="_blank" rel="noreferrer"
                          style={{ fontSize: '0.75rem', color: '#FF6B35', textDecoration: 'none', fontWeight: '600' }}>↗ Нээх</a>
                        <button onClick={() => {
                          const w = window.open('', '_blank');
                          if (w) { w.document.write(`<html><body style="text-align:center;font-family:sans-serif;padding:30px"><h2 style="color:#FF6B35">Ширээ ${t.number}</h2><img src="${buildQR(branchId, t.number)}" style="width:200px"><br><p style="font-size:11px;color:#666">${buildLink(branchId, t.number)}</p><script>window.print()<\/script></body></html>`); w.document.close(); }
                        }} style={{ fontSize: '0.75rem', background: '#F5F5F4', border: 'none', borderRadius: '8px', padding: '0.25rem 0.5rem', cursor: 'pointer', fontWeight: '600' }}>🖨️ Хэвлэх</button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}

        {/* ORDERS */}
        {tab === 'orders' && (
          <div>
            {orders.length === 0 && <div style={{ textAlign: 'center', padding: '3rem', color: '#78716C' }}><div style={{ fontSize: '3rem' }}>📋</div><p>Захиалга байхгүй</p></div>}
            {orders.map(o => (
              <div key={o.id} style={{ ...S.card, borderLeft: `4px solid ${ORDER_STATUS_COLORS[o.status]}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span style={{ fontWeight: '800', color: '#1C1917' }}>Ширээ {o.tableNumber}</span>
                  <span style={{ fontSize: '0.75rem', padding: '0.25rem 0.6rem', borderRadius: '20px', fontWeight: '700', background: ORDER_STATUS_COLORS[o.status] + '20', color: ORDER_STATUS_COLORS[o.status] }}>{ORDER_STATUS_LABELS[o.status]}</span>
                </div>
                {o.items.map((item, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#78716C', padding: '0.2rem 0' }}>
                    <span>{item.name} × {item.quantity}</span><span style={{ fontWeight: '600' }}>{formatPrice(item.price * item.quantity)}</span>
                  </div>
                ))}
                {o.notes && <p style={{ margin: '0.5rem 0 0', fontSize: '0.8rem', color: '#F59E0B', background: '#FFFBEB', padding: '0.4rem 0.6rem', borderRadius: '8px' }}>📝 {o.notes}</p>}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid #F5F5F4' }}>
                  <span style={{ fontSize: '0.75rem', color: '#9CA3AF' }}>{formatTime(o.createdAt)}{o.customerPhone && ` · ☎ ${o.customerPhone}`}</span>
                  <span style={{ fontWeight: '800', color: '#FF6B35' }}>{formatPrice(o.totalAmount)}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* CSAT */}
        {tab === 'csat' && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
              {[
                { label: 'NPS оноо', value: npsScore !== null ? `${npsScore > 0 ? '+' : ''}${npsScore}` : '–', color: npsScore !== null && npsScore >= 0 ? '#10B981' : '#EF4444', bg: '#ECFDF5' },
                { label: 'CSAT дундаж', value: avgCsat ? `${avgCsat}/5` : '–', color: '#6366F1', bg: '#EEF2FF' },
                { label: 'Нийт хариулт', value: String(surveys.length), color: '#1C1917', bg: '#F5F5F4' },
                { label: 'Шийдвэрлэгдсэн', value: String(surveys.filter(s => s.resolved).length), color: '#10B981', bg: '#ECFDF5' },
              ].map(card => (
                <div key={card.label} style={{ background: card.bg, borderRadius: '16px', padding: '1.25rem', textAlign: 'center' }}>
                  <p style={{ fontSize: '1.8rem', fontWeight: '800', color: card.color, margin: '0 0 0.25rem' }}>{card.value}</p>
                  <p style={{ fontSize: '0.75rem', color: '#78716C', margin: 0 }}>{card.label}</p>
                </div>
              ))}
            </div>
            {surveys.filter(s => s.feedback).map(s => (
              <div key={s.id} style={S.card}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                  <span style={{ fontSize: '0.75rem', color: '#9CA3AF' }}>{formatDate(s.createdAt)} · Ширээ {s.tableNumber}</span>
                  <span>{'⭐'.repeat(s.csat)}</span>
                </div>
                <p style={{ margin: 0, color: '#44403C', fontSize: '0.9rem' }}>{s.feedback}</p>
              </div>
            ))}
            {!surveys.filter(s => s.feedback).length && <div style={{ textAlign: 'center', padding: '3rem', color: '#78716C' }}><div style={{ fontSize: '3rem' }}>📊</div><p>Сэтгэгдэл байхгүй</p></div>}
          </>
        )}

        {/* COMPLAINTS */}
        {tab === 'complaints' && (
          <>
            {!surveys.filter(s => s.phone || s.feedback).length && <div style={{ textAlign: 'center', padding: '3rem', color: '#78716C' }}><div style={{ fontSize: '3rem' }}>💬</div><p>Гомдол байхгүй</p></div>}
            {surveys.filter(s => s.phone || s.feedback).map(s => (
              <div key={s.id} style={{ ...S.card, borderLeft: `4px solid ${s.resolved ? '#10B981' : '#F59E0B'}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <div>
                    <p style={{ fontWeight: '800', color: '#1C1917', margin: '0 0 0.15rem' }}>{s.phone || 'Дугаар байхгүй'}</p>
                    <p style={{ fontSize: '0.75rem', color: '#9CA3AF', margin: 0 }}>{formatDate(s.createdAt)} · Ширээ {s.tableNumber}</p>
                  </div>
                  <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'flex-start' }}>
                    <span style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem', background: '#F5F5F4', borderRadius: '8px', color: '#78716C' }}>NPS {s.nps}</span>
                    <span style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem', background: '#F5F5F4', borderRadius: '8px', color: '#78716C' }}>⭐{s.csat}</span>
                  </div>
                </div>
                {s.feedback && <p style={{ background: '#FFF7ED', padding: '0.6rem 0.75rem', borderRadius: '10px', fontSize: '0.875rem', color: '#44403C', margin: '0 0 0.75rem' }}>{s.feedback}</p>}
                {!s.resolved && (
                  <input value={resolveNote[s.id] || ''} onChange={e => setResolveNote(n => ({ ...n, [s.id]: e.target.value }))}
                    placeholder="Шийдвэрлэлтийн тэмдэглэл..."
                    style={{ ...S.input, marginBottom: '0.5rem', fontSize: '0.8rem', padding: '0.6rem 0.75rem' }} />
                )}
                <button onClick={() => setSurveyResolved(branchId, s.id, !s.resolved, resolveNote[s.id])}
                  style={{ padding: '0.5rem 1rem', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: '700', fontSize: '0.85rem', background: s.resolved ? '#DCFCE7' : '#FEF3C7', color: s.resolved ? '#16A34A' : '#D97706' }}>
                  {s.resolved ? '✅ Шийдэгдсэн' : '🔴 Шийдвэрлэсэн болгох'}
                </button>
                {s.resolvedNote && <p style={{ margin: '0.5rem 0 0', fontSize: '0.78rem', color: '#78716C' }}>📝 {s.resolvedNote}</p>}
              </div>
            ))}
          </>
        )}

        {/* STAFF */}
        {tab === 'staff' && (
          <>
            <div style={S.card}>
              <p style={{ fontWeight: '700', color: '#1C1917', marginBottom: '0.75rem' }}>Ажилтан нэмэх</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <input value={newStaffName} onChange={e => setNewStaffName(e.target.value)} placeholder="Нэр" style={S.input} />
                <select value={newStaffRole} onChange={e => setNewStaffRole(e.target.value as any)}
                  style={{ ...S.input, background: 'white' }}>
                  <option value="chef">👨‍🍳 Тогооч</option>
                  <option value="waiter">🛎️ Зөөгч</option>
                </select>
                <input value={newStaffPin} onChange={e => setNewStaffPin(e.target.value)} type="password" placeholder="PIN" style={S.input} />
                <button onClick={async () => {
                  if (!newStaffName || !newStaffPin) return;
                  await addStaff(branchId, newStaffName, newStaffRole, newStaffPin);
                  getStaff(branchId).then(setStaffList);
                  setNewStaffName(''); setNewStaffPin('');
                }} style={{ ...S.btn, width: '100%', padding: '0.875rem' }}>➕ Нэмэх</button>
              </div>
            </div>
            {staffList.map(s => (
              <div key={s.id} style={{ ...S.card, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: s.role === 'chef' ? '#FFF7ED' : '#ECFDF5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem' }}>
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

// ══════════════════════════════════════════════════════
// KITCHEN PANEL
// ══════════════════════════════════════════════════════
function KitchenPanel({ branchId, staff, onLogout }: { branchId: string; staff: Staff; onLogout: () => void }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [filter, setFilter] = useState<Order['status'] | 'all'>('all');

  useEffect(() => subscribeToOrders(branchId, setOrders), [branchId]);

  const NEXT: Partial<Record<Order['status'], Order['status']>> = { pending: 'preparing', preparing: 'ready', ready: 'served' };
  const NEXT_LABEL: Partial<Record<Order['status'], string>> = { pending: '👨‍🍳 Бэлтгэж эхлэх', preparing: '✅ Бэлэн боллоо', ready: '🛎️ Хүргэгдсэн' };
  const NEXT_COLOR: Partial<Record<Order['status'], string>> = { pending: '#3B82F6', preparing: '#10B981', ready: '#8B5CF6' };

  const active = filter === 'all' ? orders.filter(o => o.status !== 'served') : orders.filter(o => o.status === filter);
  const counts: Record<string, number> = { pending: orders.filter(o => o.status === 'pending').length, preparing: orders.filter(o => o.status === 'preparing').length, ready: orders.filter(o => o.status === 'ready').length };

  const FILTERS = [
    { id: 'all' as const, label: 'Бүгд', color: '#FF6B35' },
    { id: 'pending' as const, label: `🟡 Шинэ${counts.pending ? ` (${counts.pending})` : ''}`, color: '#F59E0B' },
    { id: 'preparing' as const, label: `🔵 Бэлтгэж байна${counts.preparing ? ` (${counts.preparing})` : ''}`, color: '#3B82F6' },
    { id: 'ready' as const, label: `🟢 Бэлэн${counts.ready ? ` (${counts.ready})` : ''}`, color: '#10B981' },
  ];

  return (
    <div style={{ minHeight: '100vh', background: '#F8FAFC' }}>
      <div style={{ background: staff.role === 'chef' ? 'linear-gradient(135deg, #1E3A5F, #2D5A8E)' : 'linear-gradient(135deg, #064E3B, #065F46)', padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 20 }}>
        <div>
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.75rem', margin: 0 }}>{staff.role === 'chef' ? '👨‍🍳 Тогооч' : '🛎️ Зөөгч'}</p>
          <h1 style={{ color: 'white', fontWeight: '800', margin: 0, fontSize: '1.1rem' }}>{staff.name}</h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {counts.pending > 0 && (
            <div style={{ background: '#F59E0B', color: 'white', borderRadius: '20px', padding: '0.3rem 0.8rem', fontSize: '0.8rem', fontWeight: '800', animation: 'pulse 2s infinite' }}>
              🔔 {counts.pending} шинэ
            </div>
          )}
          <button onClick={onLogout} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: 'white', borderRadius: '10px', padding: '0.5rem 1rem', cursor: 'pointer', fontWeight: '600' }}>Гарах</button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', padding: '0.75rem', overflowX: 'auto', background: 'white', borderBottom: '1px solid #E7E5E4', position: 'sticky', top: '58px', zIndex: 10 }}>
        {FILTERS.map(f => (
          <button key={f.id} onClick={() => setFilter(f.id)}
            style={{ padding: '0.5rem 1rem', border: 'none', borderRadius: '20px', cursor: 'pointer', whiteSpace: 'nowrap', fontWeight: '700', fontSize: '0.82rem', background: filter === f.id ? f.color : '#F5F5F4', color: filter === f.id ? 'white' : '#78716C', transition: 'all 0.2s' }}>
            {f.label}
          </button>
        ))}
      </div>

      <div style={{ padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', maxWidth: '640px', margin: '0 auto' }}>
        {active.length === 0 && (
          <div style={{ textAlign: 'center', padding: '4rem 2rem', color: '#78716C' }}>
            <div style={{ fontSize: '4rem', marginBottom: '0.75rem' }}>🎉</div>
            <p style={{ fontWeight: '700', color: '#44403C', margin: '0 0 0.25rem' }}>Захиалга байхгүй</p>
            <p style={{ fontSize: '0.875rem', margin: 0 }}>Шинэ захиалга ирэхийг хүлээж байна</p>
          </div>
        )}
        {active.map(order => (
          <div key={order.id} style={{ background: 'white', borderRadius: '20px', overflow: 'hidden', boxShadow: '0 4px 16px rgba(0,0,0,0.08)', borderTop: `5px solid ${ORDER_STATUS_COLORS[order.status]}` }}>
            <div style={{ padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #F5F5F4' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
                <span style={{ fontSize: '2.5rem', fontWeight: '900', color: '#1C1917', lineHeight: 1 }}>{order.tableNumber}</span>
                <span style={{ color: '#78716C', fontWeight: '600' }}>ширээ</span>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.75rem', padding: '0.25rem 0.75rem', borderRadius: '20px', fontWeight: '700', background: ORDER_STATUS_COLORS[order.status] + '20', color: ORDER_STATUS_COLORS[order.status] }}>{ORDER_STATUS_LABELS[order.status]}</div>
                <p style={{ fontSize: '0.72rem', color: '#9CA3AF', margin: '0.25rem 0 0' }}>{formatTime(order.createdAt)}</p>
              </div>
            </div>
            <div style={{ padding: '0.875rem 1rem' }}>
              {order.items.map((item, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.4rem 0', borderBottom: i < order.items.length - 1 ? '1px dashed #F5F5F4' : 'none' }}>
                  <span style={{ fontWeight: '700', color: '#1C1917', fontSize: '0.95rem' }}>{item.name}</span>
                  <span style={{ background: '#F5F5F4', borderRadius: '20px', padding: '0.2rem 0.75rem', fontWeight: '800', color: '#44403C' }}>×{item.quantity}</span>
                </div>
              ))}
              {order.notes && (
                <div style={{ marginTop: '0.75rem', background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: '10px', padding: '0.5rem 0.75rem' }}>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: '#D97706', fontWeight: '600' }}>📝 {order.notes}</p>
                </div>
              )}
              {order.customerPhone && <p style={{ margin: '0.5rem 0 0', fontSize: '0.78rem', color: '#9CA3AF' }}>☎ {order.customerPhone}</p>}
            </div>
            {NEXT[order.status] && (
              <div style={{ padding: '0.75rem 1rem 1rem' }}>
                <button onClick={() => updateOrderStatus(branchId, order.id, NEXT[order.status]!)}
                  style={{ width: '100%', padding: '0.875rem', background: NEXT_COLOR[order.status], color: 'white', border: 'none', borderRadius: '14px', fontWeight: '800', cursor: 'pointer', fontSize: '0.95rem', transition: 'opacity 0.2s' }}
                  onMouseOver={e => (e.currentTarget.style.opacity = '0.9')} onMouseOut={e => (e.currentTarget.style.opacity = '1')}>
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
