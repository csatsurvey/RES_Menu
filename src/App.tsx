import React, { useState, useEffect, useRef } from 'react';
import {
  Branch, Table, Order, Survey, Staff, MenuItem,
  getAllBranches, createBranch, getBranch, verifyManagerPin, verifyStaffPin,
  setTables as setTablesDB, subscribeToTables,
  subscribeToOrders, subscribeToTableOrders, createOrder, updateOrderStatus,
  subscribeToSurveys, createSurvey, setSurveyResolved,
  subscribeToMenu, saveMenuItem, deleteMenuItem, compressImage,
  getStaff, addStaff, removeStaff, updateStaff,
  getSettings, saveSettings,
  logActivity, subscribeToLogs, ActivityLog,
  formatPrice, formatTime, formatDate,
  ORDER_STATUS_LABELS, ORDER_STATUS_COLORS,
} from './lib/db';

// ── Design tokens ─────────────────────────────────────
const C = {
  bg: '#0d0d12', sidebar: '#111117', card: '#1a1a22',
  border: 'rgba(255,255,255,0.08)', yellow: '#F5C120',
  orange: '#E87B2F', green: '#2ECC71', red: '#E74C3C',
  text: '#ffffff', muted: 'rgba(255,255,255,0.5)',
  inpBg: 'rgba(255,255,255,0.06)',
};

const getQRParams = () => { const p = new URLSearchParams(window.location.search); return { b: p.get('b')||'', t: Number(p.get('t'))||0 }; };
const buildQR = (bId:string,t:number)=>`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(`${window.location.origin}${window.location.pathname}?b=${bId}&t=${t}`)}`;
const buildLink = (bId:string,t:number)=>`${window.location.origin}${window.location.pathname}?b=${bId}&t=${t}`;

const SURVEY_QUESTIONS = [
  { key: 'foodQuality',    label: '1. Хоолны амт, чанар хэр байсан бэ?' },
  { key: 'ambiance',       label: '2. Рестораны орчин тойрон, цэвэр байдал' },
  { key: 'staffAttitude',  label: '3. Үйлчилгээний ажилтан, зөөгчийн харилцаа хандлага' },
  { key: 'priceValue',     label: '4. Хоолны үнэ өртөг чанартаа нийцэж байна уу?' },
  { key: 'service',        label: '5. Нийт сэтгэл ханамж хэр байна?' },
];

const SEED_MENU: Omit<MenuItem, 'id'>[] = [
  { name:'Цуйван', description:'Гурилтай шарсан мах, хүнсний ногоо', price:12000, category:'Үндсэн хоол', image:'', available:true, allergens:'Гурил, Мах' },
  { name:'Хуушуур', description:'4 ширхэг шарсан гурилтай мах', price:8000, category:'Үндсэн хоол', image:'', available:true, allergens:'Гурил' },
  { name:'Банштай шөл', description:'Уламжлалт банш, чанасан мах', price:9000, category:'Шөл', image:'', available:true },
  { name:'Кофе Американо', description:'Хос эспрессо', price:4500, category:'Ундаа', image:'', available:true },
];

type AppView = 'landing'|'customer'|'admin';

export default function App() {
  const [view, setView] = useState<AppView>('landing');
  const [branchId, setBranchId] = useState('');
  const [tableNum, setTableNum] = useState(0);
  const [isManager, setIsManager] = useState(false);
  const [staff, setStaff] = useState<Staff|null>(null);

  useEffect(()=>{
    const { b, t } = getQRParams();
    if(b && t){ setBranchId(b); setTableNum(t); setView('customer'); }
  },[]);

  const logout = ()=>{ setView('landing'); setBranchId(''); setIsManager(false); setStaff(null); };

  if(view==='customer') return <CustomerView branchId={branchId} tableNum={tableNum}/>;
  if(view==='admin') return <AdminPanel branchId={branchId} onLogout={logout} isManager={isManager} staff={staff}/>;
  return <LandingView
    onManager={id=>{ setBranchId(id); setIsManager(true); setView('admin'); }}
    onStaff={(id,s)=>{ setBranchId(id); setStaff(s); setView('admin'); }}
  />;
}

// ════════════════════════════════════════════════════════
// CUSTOM SELECT (replaces native select - dark, always visible)
// ════════════════════════════════════════════════════════
function CustomSelect({value,onChange,options,placeholder,style}:{
  value:string; onChange:(v:string)=>void;
  options:{value:string;label:string}[];
  placeholder:string; style?:React.CSSProperties;
}) {
  const [open,setOpen]=useState(false);
  const ref=useRef<HTMLDivElement>(null);
  useEffect(()=>{
    const h=(e:MouseEvent)=>{if(ref.current&&!ref.current.contains(e.target as Node))setOpen(false);};
    document.addEventListener('mousedown',h);
    return()=>document.removeEventListener('mousedown',h);
  },[]);
  const selected=options.find(o=>o.value===value);
  return(
    <div ref={ref} style={{position:'relative',...style}}>
      <div onClick={()=>setOpen(!open)}
        style={{padding:'0.65rem 0.875rem',background:'#1e1e2c',border:`1px solid ${open?C.yellow:C.border}`,borderRadius:'8px',cursor:'pointer',color:value?'#fff':'rgba(255,255,255,0.4)',display:'flex',justifyContent:'space-between',alignItems:'center',fontSize:'0.9rem',userSelect:'none' as const,transition:'border-color 0.15s'}}>
        <span>{selected?selected.label:placeholder}</span>
        <span style={{color:C.muted,fontSize:'0.7rem',transition:'transform 0.2s',display:'inline-block',transform:open?'rotate(180deg)':'none'}}>▼</span>
      </div>
      {open&&(
        <div style={{position:'absolute',top:'calc(100% + 4px)',left:0,right:0,background:'#1e1e2c',border:`1px solid ${C.yellow}44`,borderRadius:'8px',zIndex:9999,overflow:'hidden',boxShadow:'0 8px 24px rgba(0,0,0,0.5)'}}>
          {options.map(opt=>(
            <div key={opt.value} onClick={()=>{onChange(opt.value);setOpen(false);}}
              style={{padding:'0.65rem 0.875rem',cursor:'pointer',color:opt.value===value?C.yellow:'rgba(255,255,255,0.85)',background:opt.value===value?`${C.yellow}18`:'transparent',fontSize:'0.9rem',borderBottom:`1px solid rgba(255,255,255,0.04)`}}
              onMouseOver={e=>{if(opt.value!==value)e.currentTarget.style.background='rgba(255,255,255,0.06)';}}
              onMouseOut={e=>{e.currentTarget.style.background=opt.value===value?`${C.yellow}18`:'transparent';}}>
              {opt.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════
// LANDING
// ════════════════════════════════════════════════════════
function LandingView({ onManager, onStaff }: { onManager:(id:string)=>void; onStaff:(id:string,s:Staff)=>void }) {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [mode, setMode] = useState<'select'|'manager'|'staff'|'new'>('select');
  const [branchId, setBranchId] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [newName, setNewName] = useState('');
  const [newAddr, setNewAddr] = useState('');
  const [newPin, setNewPin] = useState('');
  useEffect(()=>{ getAllBranches().then(setBranches); },[]);

  const inp: React.CSSProperties = { padding:'0.75rem 1rem', border:`1px solid ${C.border}`, borderRadius:'10px', fontSize:'0.9rem', outline:'none', width:'100%', boxSizing:'border-box', background:C.inpBg, color:C.text };

  const login = async(type:'manager'|'staff')=>{
    if(!branchId||!pin) return setError('Салбар болон PIN оруулна уу');
    setLoading(true);
    if(type==='manager'){ const ok=await verifyManagerPin(branchId,pin); setLoading(false); return ok?onManager(branchId):setError('PIN буруу байна'); }
    const s=await verifyStaffPin(branchId,pin); setLoading(false); return s?onStaff(branchId,s):setError('PIN буруу байна');
  };

  const handleCreate = async()=>{
    if(!newName||!newPin) return setError('Нэр болон PIN шаардлагатай');
    setLoading(true);
    try{ const id=await createBranch(newName,newAddr,newPin); for(const item of SEED_MENU) await saveMenuItem(id,item); await setTablesDB(id,5); onManager(id); }
    catch{ setError('Алдаа гарлаа'); setLoading(false); }
  };

  return (
    <div style={{minHeight:'100vh',background:C.bg,display:'flex',alignItems:'center',justifyContent:'center',padding:'1rem'}}>
      <div style={{width:'100%',maxWidth:'380px',background:C.card,borderRadius:'20px',padding:'2rem',border:`1px solid ${C.border}`}}>
        <div style={{textAlign:'center',marginBottom:'2rem'}}>
          <div style={{fontSize:'2.5rem',marginBottom:'0.5rem'}}>🍽️</div>
          <h1 style={{fontSize:'1.4rem',fontWeight:'800',color:C.yellow,margin:'0 0 0.25rem',letterSpacing:'0.05em'}}>РЕСТОРАН СИСТЕМ</h1>
          <p style={{color:C.muted,fontSize:'0.8rem',margin:0}}>Нэвтрэх эрхээ сонгоно уу</p>
        </div>
        {mode==='select'&&<div style={{display:'flex',flexDirection:'column',gap:'0.75rem'}}>
          <button onClick={()=>setMode('manager')} style={{padding:'0.875rem',background:C.orange,color:'white',border:'none',borderRadius:'12px',fontWeight:'700',fontSize:'0.95rem',cursor:'pointer',letterSpacing:'0.03em'}}>👔 МЕНЕЖЕР</button>
          <button onClick={()=>setMode('staff')} style={{padding:'0.875rem',background:'#1a5c3a',color:C.green,border:`1px solid ${C.green}`,borderRadius:'12px',fontWeight:'700',fontSize:'0.95rem',cursor:'pointer'}}>👨‍🍳 ТОГООЧ / ЗӨӨГЧ</button>
          <button onClick={()=>setMode('new')} style={{padding:'0.875rem',background:'transparent',border:`1px dashed ${C.border}`,borderRadius:'12px',color:C.muted,fontWeight:'600',cursor:'pointer'}}>➕ Шинэ салбар үүсгэх</button>
        </div>}
        {(mode==='manager'||mode==='staff')&&<div style={{display:'flex',flexDirection:'column',gap:'0.875rem'}}>
          <div style={{background:`${mode==='manager'?C.orange:'#1a5c3a'}22`,borderRadius:'10px',padding:'0.6rem',textAlign:'center',fontWeight:'700',color:mode==='manager'?C.orange:C.green,fontSize:'0.85rem'}}>
            {mode==='manager'?'👔 Менежер нэвтрэх':'👨‍🍳 Ажилтан нэвтрэх'}
          </div>
          <CustomSelect value={branchId} onChange={setBranchId} placeholder="Салбар сонгоно уу" options={branches.map(b=>({value:b.id,label:b.name}))} style={{width:'100%'}}/>
          <input type="password" value={pin} onChange={e=>{setPin(e.target.value);setError('');}} placeholder="PIN оруулна уу" onKeyDown={e=>e.key==='Enter'&&login(mode)} style={inp}/>
          {error&&<p style={{color:C.red,fontSize:'0.82rem',textAlign:'center',margin:0}}>{error}</p>}
          <button onClick={()=>login(mode)} disabled={loading} style={{padding:'0.875rem',background:mode==='manager'?C.orange:C.green,color:'white',border:'none',borderRadius:'12px',fontWeight:'700',cursor:'pointer',opacity:loading?0.6:1}}>{loading?'Нэвтрэж байна...':'Нэвтрэх'}</button>
          <button onClick={()=>{setMode('select');setError('');setPin('');}} style={{background:'none',border:'none',color:C.muted,cursor:'pointer',fontSize:'0.82rem'}}>← Буцах</button>
        </div>}
        {mode==='new'&&<div style={{display:'flex',flexDirection:'column',gap:'0.875rem'}}>
          <input value={newName} onChange={e=>setNewName(e.target.value)} placeholder="Салбарын нэр *" style={inp}/>
          <input value={newAddr} onChange={e=>setNewAddr(e.target.value)} placeholder="Хаяг (заавал биш)" style={inp}/>
          <input type="password" value={newPin} onChange={e=>setNewPin(e.target.value)} placeholder="Менежерийн PIN (4+ тоо) *" style={inp}/>
          {error&&<p style={{color:C.red,fontSize:'0.82rem',textAlign:'center',margin:0}}>{error}</p>}
          <button onClick={handleCreate} disabled={loading} style={{padding:'0.875rem',background:C.orange,color:'white',border:'none',borderRadius:'12px',fontWeight:'700',cursor:'pointer',opacity:loading?0.6:1}}>{loading?'Үүсгэж байна...':'✅ Салбар үүсгэх'}</button>
          <button onClick={()=>{setMode('select');setError('');}} style={{background:'none',border:'none',color:C.muted,cursor:'pointer',fontSize:'0.82rem'}}>← Буцах</button>
        </div>}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════
// SURVEY MODAL
// ════════════════════════════════════════════════════════
type SurveyData = { foodQuality:number; ambiance:number; staffAttitude:number; priceValue:number; service:number; nps:number; feedback:string; phone:string; };
const EMPTY_SURVEY: SurveyData = { foodQuality:0,ambiance:0,staffAttitude:0,priceValue:0,service:0,nps:0,feedback:'',phone:'' };

function SurveyModal({ branchId, tableNum, onClose }: { branchId:string; tableNum:number; onClose:()=>void }) {
  const [s, setS] = useState<SurveyData>(EMPTY_SURVEY);
  const [loading, setLoading] = useState(false);
  const allStars = s.foodQuality&&s.ambiance&&s.staffAttitude&&s.priceValue&&s.service;

  const [success,setSuccess]=useState(false);
  const submit = async()=>{
    if(!allStars||!s.nps) return;
    setLoading(true);
    try{
      const csat=Math.round((s.foodQuality+s.ambiance+s.staffAttitude+s.priceValue+s.service)/5);
      await createSurvey(branchId,{tableNumber:tableNum,foodQuality:s.foodQuality,ambiance:s.ambiance,staffAttitude:s.staffAttitude,priceValue:s.priceValue,service:s.service,csat,nps:s.nps,feedback:s.feedback,phone:s.phone||undefined});
      setSuccess(true);
      setTimeout(()=>{setLoading(false);onClose();},1800);
    }catch(e){
      console.error(e);
      setLoading(false);
    }
  };

  const StarRow = ({ qKey, label }: { key?: React.Key; qKey: keyof SurveyData; label: string }) => (
    <div style={{background:C.inpBg,borderRadius:'12px',padding:'1rem',marginBottom:'0.5rem'}}>
      <p style={{color:C.text,fontWeight:'600',margin:'0 0 0.6rem',fontSize:'0.88rem'}}>{label}</p>
      <div style={{display:'flex',gap:'0.4rem'}}>
        {[1,2,3,4,5].map(n=>(
          <button key={n} onClick={()=>setS(prev=>({...prev,[qKey]:n}))}
            style={{fontSize:'1.8rem',background:'none',border:'none',cursor:'pointer',opacity:(s[qKey] as number)>=n?1:0.2,transition:'all 0.1s',padding:0,filter:(s[qKey] as number)>=n?'none':'grayscale(1)'}}>⭐</button>
        ))}
      </div>
    </div>
  );

  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.8)',zIndex:200,display:'flex',alignItems:'center',justifyContent:'center',padding:'1rem'}} onClick={onClose}>
      <div style={{background:C.card,borderRadius:'20px',padding:'1.5rem',width:'100%',maxWidth:'480px',maxHeight:'90vh',overflowY:'auto',border:`1px solid ${C.border}`}} onClick={e=>e.stopPropagation()}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'1.25rem'}}>
          <h3 style={{color:C.yellow,fontWeight:'800',margin:0,fontSize:'1rem',display:'flex',alignItems:'center',gap:'0.5rem'}}>⭐ Сэтгэл ханамжийн судалгаа</h3>
          <button onClick={onClose} style={{background:'none',border:'none',color:C.muted,fontSize:'1.3rem',cursor:'pointer',lineHeight:1}}>✕</button>
        </div>

        {SURVEY_QUESTIONS.map(q=><StarRow key={q.key} qKey={q.key as keyof SurveyData} label={q.label}/>)}

        <div style={{background:C.inpBg,borderRadius:'12px',padding:'1rem',marginBottom:'0.5rem'}}>
          <p style={{color:C.text,fontWeight:'600',margin:'0 0 0.75rem',fontSize:'0.88rem'}}>Найз нөхөддөө санал болгох магадлал (0-10):</p>
          <div style={{display:'flex',gap:'0.3rem',flexWrap:'wrap'}}>
            {Array.from({length:11},(_,i)=>(
              <button key={i} onClick={()=>setS(prev=>({...prev,nps:i}))}
                style={{width:'38px',height:'38px',borderRadius:'8px',border:`1px solid ${s.nps===i?C.yellow:C.border}`,fontWeight:'700',cursor:'pointer',background:s.nps===i?C.yellow:'transparent',color:s.nps===i?'#000':C.muted,fontSize:'0.85rem',transition:'all 0.1s'}}>
                {i}
              </button>
            ))}
          </div>
          <div style={{display:'flex',justifyContent:'space-between',fontSize:'0.7rem',color:C.muted,marginTop:'0.35rem'}}><span>0 — огт зөвлөхгүй</span><span>10 — заавал зөвлөнө</span></div>
        </div>

        <textarea value={s.feedback} onChange={e=>setS(p=>({...p,feedback:e.target.value}))} rows={2}
          placeholder="Нэмэлт санал, сэтгэгдэл... (заавал биш)"
          style={{width:'100%',padding:'0.75rem',background:C.inpBg,border:`1px solid ${C.border}`,borderRadius:'10px',fontSize:'0.875rem',outline:'none',resize:'none',color:C.text,boxSizing:'border-box',marginBottom:'0.5rem'}}/>
        <input value={s.phone} onChange={e=>setS(p=>({...p,phone:e.target.value}))}
          placeholder="☎ Утасны дугаар — холбоо барих бол (заавал биш)"
          style={{width:'100%',padding:'0.75rem',background:C.inpBg,border:`1px solid ${C.border}`,borderRadius:'10px',fontSize:'0.875rem',outline:'none',color:C.text,boxSizing:'border-box',marginBottom:'1rem'}}/>

        <button onClick={submit} disabled={!allStars||!s.nps||loading}
          style={{width:'100%',padding:'0.9rem',background:(!allStars||!s.nps)?C.inpBg:C.yellow,color:(!allStars||!s.nps)?C.muted:'#000',border:'none',borderRadius:'12px',fontWeight:'800',cursor:'pointer',fontSize:'0.95rem',transition:'all 0.2s'}}>
          {loading?'Илгээж байна...':'✓ ИЛГЭЭХ'}
        </button>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════
// CUSTOMER VIEW
// ════════════════════════════════════════════════════════
type CartItem = { item:MenuItem; qty:number };

function CustomerView({ branchId, tableNum }: { branchId:string; tableNum:number }) {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [activeCat, setActiveCat] = useState('');
  const [showSurvey, setShowSurvey] = useState(false);
  const [showCart, setShowCart] = useState(false);
  const [showTracking, setShowTracking] = useState(false);
  const [branchName, setBranchName] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(()=>{
    getBranch(branchId).then(b=>b&&setBranchName(b.name));
    const u1=subscribeToMenu(branchId,it=>setItems(it.filter(i=>i.available)));
    const u2=subscribeToTableOrders(branchId,tableNum,setOrders);
    return()=>{u1();u2();};
  },[branchId,tableNum]);

  const cats = [...new Set(items.map(i=>i.category))];
  useEffect(()=>{ if(cats.length&&!activeCat) setActiveCat(cats[0]); },[cats.length]);

  const chg=(item:MenuItem,d:number)=>setCart(prev=>{
    const ex=prev.find(c=>c.item.id===item.id);
    if(!ex) return d>0?[...prev,{item,qty:1}]:prev;
    const nq=ex.qty+d; if(nq<=0) return prev.filter(c=>c.item.id!==item.id);
    return prev.map(c=>c.item.id===item.id?{...c,qty:nq}:c);
  });
  const qty=(id:string)=>cart.find(c=>c.item.id===id)?.qty||0;
  const total=cart.reduce((s,c)=>s+c.item.price*c.qty,0);
  const cnt=cart.reduce((s,c)=>s+c.qty,0);
  const activeOrder=orders.find(o=>o.status!=='served');

  const placeOrder=async()=>{
    if(!cart.length) return; setLoading(true);
    await createOrder(branchId,tableNum,cart.map(c=>({menuItemId:c.item.id,name:c.item.name,price:c.item.price,quantity:c.qty})),undefined,notes||undefined);
    setCart([]);setNotes('');setShowCart(false);setLoading(false);setShowTracking(true);
  };

  const inp: React.CSSProperties = {padding:'0.6rem 0.75rem',background:C.inpBg,border:`1px solid ${C.border}`,borderRadius:'8px',fontSize:'0.85rem',outline:'none',color:C.text};

  return(
    <div style={{minHeight:'100vh',background:C.bg,paddingBottom:'80px'}}>
      {/* Top bar */}
      <div style={{background:C.sidebar,borderBottom:`1px solid ${C.border}`,padding:'0.75rem 1.25rem',display:'flex',alignItems:'center',justifyContent:'space-between',position:'sticky',top:0,zIndex:30}}>
        <div style={{display:'flex',gap:'0.5rem'}}>
          <button onClick={()=>setShowTracking(true)}
            style={{background:C.inpBg,border:`1px solid ${C.border}`,borderRadius:'8px',padding:'0.45rem 0.875rem',color:C.yellow,cursor:'pointer',fontWeight:'700',fontSize:'0.78rem',display:'flex',alignItems:'center',gap:'0.4rem'}}>
            🛒 Захиалгын явц ({cnt})
          </button>

        </div>
        <span style={{color:C.yellow,fontWeight:'800',fontSize:'0.85rem',letterSpacing:'0.08em'}}>{branchName.toUpperCase()}</span>
      </div>

      {/* Category tabs */}
      <div style={{maxWidth:'760px',margin:'0 auto',width:'100%'}}>
      <div style={{padding:'0.875rem 1rem',display:'flex',gap:'0.5rem',overflowX:'auto',borderBottom:`1px solid ${C.border}`}}>
        {cats.map(cat=>(
          <button key={cat} onClick={()=>setActiveCat(cat)}
            style={{padding:'0.5rem 1.25rem',borderRadius:'10px',border:`1px solid ${activeCat===cat?C.orange:C.border}`,cursor:'pointer',whiteSpace:'nowrap',fontWeight:'700',fontSize:'0.82rem',background:activeCat===cat?C.orange:'transparent',color:activeCat===cat?'white':C.muted,transition:'all 0.15s'}}>
            {cat}
          </button>
        ))}
      </div>

      {/* Food list */}
      <div style={{padding:'0.75rem 1rem',display:'flex',flexDirection:'column',gap:'0.75rem'}}>
        {items.filter(i=>i.category===activeCat).map(item=>{
          const q=qty(item.id);
          return(
            <div key={item.id} style={{background:C.card,borderRadius:'14px',overflow:'hidden',border:`1px solid ${C.border}`}}>
              <div style={{padding:'1rem'}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'0.3rem'}}>
                  <h3 style={{color:C.text,fontWeight:'800',fontSize:'1rem',margin:0,flex:1,paddingRight:'0.75rem',lineHeight:1.3}}>{item.name}</h3>
                  <span style={{color:C.yellow,fontWeight:'800',fontSize:'0.95rem',flexShrink:0}}>₮{item.price.toLocaleString('mn-MN')}</span>
                </div>
                {item.description&&<p style={{color:C.muted,fontSize:'0.8rem',margin:'0 0 0.6rem',lineHeight:1.5}}>{item.description}</p>}
                {(item as any).allergens&&(
                  <div style={{background:'rgba(245,193,32,0.08)',border:'1px solid rgba(245,193,32,0.2)',borderRadius:'8px',padding:'0.4rem 0.75rem',marginBottom:'0.6rem'}}>
                    <p style={{color:'rgba(245,193,32,0.7)',fontSize:'0.72rem',margin:0}}>🌿 Орц: {(item as any).allergens}</p>
                  </div>
                )}
              </div>
              {item.image&&(
                <div style={{height:'200px',overflow:'hidden'}}>
                  <img src={item.image} alt={item.name} style={{width:'100%',height:'100%',objectFit:'cover'}} onError={e=>{(e.target as HTMLImageElement).parentElement!.style.display='none';}}/>
                </div>
              )}
              <div style={{padding:'0.75rem 1rem',display:'flex',alignItems:'center',justifyContent:'space-between',borderTop:`1px solid ${C.border}`}}>
                <span style={{color:C.muted,fontSize:'0.75rem'}}>Ширхэг:</span>
                {q===0
                  ?<button onClick={()=>chg(item,1)} style={{padding:'0.45rem 1.25rem',background:C.yellow,color:'#000',border:'none',borderRadius:'8px',fontWeight:'700',cursor:'pointer',fontSize:'0.82rem'}}>+ Нэмэх</button>
                  :<div style={{display:'flex',alignItems:'center',gap:'0.5rem'}}>
                    <button onClick={()=>chg(item,-1)} style={{width:'30px',height:'30px',border:`1px solid ${C.border}`,borderRadius:'6px',background:C.inpBg,color:C.text,cursor:'pointer',fontWeight:'700',display:'flex',alignItems:'center',justifyContent:'center'}}>−</button>
                    <span style={{color:C.yellow,fontWeight:'800',minWidth:'24px',textAlign:'center'}}>{q}</span>
                    <button onClick={()=>chg(item,1)} style={{width:'30px',height:'30px',border:'none',borderRadius:'6px',background:C.yellow,color:'#000',cursor:'pointer',fontWeight:'700',display:'flex',alignItems:'center',justifyContent:'center'}}>+</button>
                  </div>
                }
              </div>
            </div>
          );
        })}
        {items.filter(i=>i.category===activeCat).length===0&&(
          <div style={{textAlign:'center',padding:'3rem',color:C.muted}}><div style={{fontSize:'3rem'}}>🍽️</div><p>Хоол байхгүй байна</p></div>
        )}
      </div>

      </div>{/*maxWidth*/}
      {/* Bottom bar */}
      <div style={{position:'fixed',bottom:0,left:0,right:0,background:C.sidebar,borderTop:`1px solid ${C.border}`,padding:'0.75rem 1rem',display:'flex',gap:'0.75rem',zIndex:30}}>
        <button onClick={()=>setShowSurvey(true)} style={{flex:1,padding:'0.75rem',background:C.inpBg,border:`1px solid ${C.border}`,borderRadius:'12px',color:C.yellow,cursor:'pointer',fontWeight:'700',fontSize:'0.82rem',display:'flex',alignItems:'center',justifyContent:'center',gap:'0.4rem'}}>⭐ Үнэлгээ өгөх</button>
        <button onClick={()=>setShowCart(true)} disabled={cnt===0} style={{flex:2,padding:'0.75rem',background:cnt>0?C.orange:'rgba(255,255,255,0.05)',border:'none',borderRadius:'12px',color:cnt>0?'white':C.muted,cursor:'pointer',fontWeight:'800',fontSize:'0.875rem',letterSpacing:'0.04em'}}>
          {cnt>0?`ЗАХИАЛГА ИЛГЭЭХ (${formatPrice(total)})`:'ЗАХИАЛГА ИЛГЭЭХ'}
        </button>
      </div>

      {/* Cart sheet */}
      {showCart&&<div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.8)',zIndex:50,display:'flex',alignItems:'flex-end'}} onClick={()=>setShowCart(false)}>
        <div style={{background:C.card,borderRadius:'20px 20px 0 0',padding:'1.5rem',width:'100%',maxHeight:'85vh',overflowY:'auto',border:`1px solid ${C.border}`,borderBottom:'none'}} onClick={e=>e.stopPropagation()}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'1.25rem'}}>
            <h3 style={{color:C.yellow,fontWeight:'800',margin:0}}>🛒 Захиалга · Ширээ {tableNum}</h3>
            <button onClick={()=>setShowCart(false)} style={{background:C.inpBg,border:'none',color:C.muted,width:'32px',height:'32px',borderRadius:'50%',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>✕</button>
          </div>
          {cart.map((c,i)=>(
            <div key={i} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'0.75rem 0',borderBottom:`1px solid ${C.border}`}}>
              <div><p style={{color:C.text,fontWeight:'700',margin:0,fontSize:'0.9rem'}}>{c.item.name}</p><p style={{color:C.muted,fontSize:'0.78rem',margin:0}}>{formatPrice(c.item.price)} × {c.qty}</p></div>
              <div style={{display:'flex',alignItems:'center',gap:'0.5rem'}}>
                <button onClick={()=>chg(c.item,-1)} style={{width:'28px',height:'28px',borderRadius:'6px',border:`1px solid ${C.border}`,background:C.inpBg,color:C.text,cursor:'pointer',fontWeight:'700',display:'flex',alignItems:'center',justifyContent:'center'}}>−</button>
                <span style={{color:C.yellow,fontWeight:'800',minWidth:'20px',textAlign:'center'}}>{c.qty}</span>
                <button onClick={()=>chg(c.item,1)} style={{width:'28px',height:'28px',borderRadius:'6px',border:'none',background:C.yellow,color:'#000',cursor:'pointer',fontWeight:'700',display:'flex',alignItems:'center',justifyContent:'center'}}>+</button>
              </div>
            </div>
          ))}
          <div style={{display:'flex',justifyContent:'space-between',margin:'1rem 0',paddingTop:'1rem',borderTop:`1px solid ${C.border}`,fontWeight:'800',fontSize:'1.05rem'}}><span style={{color:C.text}}>Нийт дүн</span><span style={{color:C.yellow}}>{formatPrice(total)}</span></div>
          <textarea value={notes} onChange={e=>setNotes(e.target.value)} placeholder="📝 Нэмэлт тайлбар..." rows={2}
            style={{width:'100%',padding:'0.75rem',background:C.inpBg,border:`1px solid ${C.border}`,borderRadius:'10px',fontSize:'0.875rem',outline:'none',color:C.text,resize:'none',marginBottom:'1rem',boxSizing:'border-box'}}/>
          <button onClick={placeOrder} disabled={loading} style={{width:'100%',padding:'1rem',background:C.orange,color:'white',border:'none',borderRadius:'12px',fontWeight:'800',cursor:'pointer',fontSize:'1rem',opacity:loading?0.7:1}}>
            {loading?'Илгээж байна...':'✅ ЗАХИАЛГА БАТЛАХ'}
          </button>
        </div>
      </div>}

      {/* Order tracking sheet */}
      {showTracking&&<div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.8)',zIndex:50,display:'flex',alignItems:'flex-end'}} onClick={()=>setShowTracking(false)}>
        <div style={{background:C.card,borderRadius:'20px 20px 0 0',padding:'1.5rem',width:'100%',maxHeight:'85vh',overflowY:'auto',border:`1px solid ${C.border}`,borderBottom:'none'}} onClick={e=>e.stopPropagation()}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'1.25rem'}}>
            <h3 style={{color:C.yellow,fontWeight:'800',margin:0}}>📋 Захиалгын явц · Ширээ {tableNum}</h3>
            <button onClick={()=>setShowTracking(false)} style={{background:C.inpBg,border:'none',color:C.muted,width:'32px',height:'32px',borderRadius:'50%',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>✕</button>
          </div>
          {activeOrder?(
            <div style={{background:C.inpBg,borderRadius:'12px',padding:'1rem'}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'0.75rem'}}>
                <span style={{color:C.text,fontWeight:'700'}}>Одоогийн захиалга</span>
                <span style={{fontWeight:'800',padding:'0.3rem 0.75rem',borderRadius:'20px',fontSize:'0.8rem',background:ORDER_STATUS_COLORS[activeOrder.status]+'22',color:ORDER_STATUS_COLORS[activeOrder.status]}}>{ORDER_STATUS_LABELS[activeOrder.status]}</span>
              </div>
              {activeOrder.items.map((it,i)=><div key={i} style={{display:'flex',justifyContent:'space-between',fontSize:'0.875rem',color:C.muted,padding:'0.25rem 0'}}><span>{it.name} × {it.quantity}</span><span>{formatPrice(it.price*it.quantity)}</span></div>)}
              <div style={{display:'flex',justifyContent:'space-between',marginTop:'0.75rem',paddingTop:'0.75rem',borderTop:`1px solid ${C.border}`,fontWeight:'800'}}><span style={{color:C.text}}>Нийт</span><span style={{color:C.yellow}}>{formatPrice(activeOrder.totalAmount)}</span></div>
            </div>
          ):<p style={{textAlign:'center',color:C.muted,padding:'2rem 0'}}>Идэвхтэй захиалга байхгүй</p>}
        </div>
      </div>}

      {showSurvey&&<SurveyModal branchId={branchId} tableNum={tableNum} onClose={()=>setShowSurvey(false)}/>}
    </div>
  );
}

// ════════════════════════════════════════════════════════
// ADMIN PANEL
// ════════════════════════════════════════════════════════
type AdminTab = 'dashboard'|'complaints'|'menu'|'staff'|'tables'|'orders'|'settings'|'logs';

function AdminPanel({ branchId, onLogout, isManager, staff }: { branchId:string; onLogout:()=>void; isManager:boolean; staff:Staff|null }) {
  const [tab, setTab] = useState<AdminTab>(isManager?'dashboard':'orders');
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [tables, setTablesState] = useState<Table[]>([]);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [branchName, setBranchName] = useState('');
  const [dateFilter, setDateFilter] = useState<'today'|'7d'|'1m'|'3m'|'1y'>('7d');
  const [menuModal, setMenuModal] = useState<any>(null);
  const [deleteTarget, setDeleteTarget] = useState<string|null>(null);
  const [tableCount, setTableCount] = useState('5');
  const [newStaffName, setNewStaffName] = useState('');
  const [newStaffRole, setNewStaffRole] = useState<'chef'|'waiter'|'admin'>('chef');
  const [newStaffPin, setNewStaffPin] = useState('');
  const [showQR, setShowQR] = useState<number|null>(null);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [resolveNote, setResolveNote] = useState<Record<string,string>>({});
  const pendingOrders = orders.filter(o=>o.status==='pending').length;

  useEffect(()=>{
    getBranch(branchId).then(b=>b&&setBranchName(b.name));
    getStaff(branchId).then(setStaffList);
    const u1=subscribeToSurveys(branchId,setSurveys);
    const u2=subscribeToOrders(branchId,setOrders);
    const u3=subscribeToMenu(branchId,setMenuItems);
    const u4=subscribeToTables(branchId,t=>{setTablesState(t);setTableCount(String(t.length||5));});
    const u5=subscribeToLogs(branchId,setLogs);
    return()=>{u1();u2();u3();u4();u5();};
  },[branchId]);

  // Filter surveys by date
  const now=Date.now();
  const filterMs:Record<string,number>={today:86400000,'7d':604800000,'1m':2592000000,'3m':7776000000,'1y':31536000000};
  const filteredSurveys=surveys.filter(s=>now-s.createdAt<=filterMs[dateFilter]);

  // Analytics
  const avg=(key:keyof Survey)=>filteredSurveys.length?+(filteredSurveys.reduce((s,x)=>s+(x[key] as number||0),0)/filteredSurveys.length).toFixed(1):0;
  const npsArr=filteredSurveys.map(s=>s.nps);
  const npsScore=npsArr.length?Math.round(((npsArr.filter(n=>n>=9).length-npsArr.filter(n=>n<=6).length)/npsArr.length)*100):null;
  const csatPct=filteredSurveys.length?Math.round(filteredSurveys.filter(s=>s.csat>=4).length/filteredSurveys.length*100):null;
  const overallAvg=filteredSurveys.length?+(filteredSurveys.reduce((s,x)=>s+x.csat,0)/filteredSurveys.length).toFixed(1):0;

  // Complaint tabs
  const withPhone=surveys.filter(s=>s.phone&&s.phone.trim());
  const pending=withPhone.filter(s=>!s.resolved);
  const resolved=withPhone.filter(s=>s.resolved);
  const anonymous=surveys.filter(s=>!s.phone||!s.phone.trim());

  const inp:React.CSSProperties={padding:'0.65rem 0.875rem',border:`1px solid ${C.border}`,borderRadius:'8px',fontSize:'0.875rem',outline:'none',background:'#1e1e2c',color:'#ffffff',width:'100%',boxSizing:'border-box',colorScheme:'dark' as any};

  const NAV:{id:AdminTab;label:string;icon:string}[]=[
    {id:'dashboard',label:'Үнэлгээний Дашбоард',icon:'📊'},
    {id:'complaints',label:'Санал хүсэлт удирдах',icon:'📞'},
    {id:'menu',label:'Цэс, Орц, Зураг удирдах',icon:'📝'},
    {id:'tables',label:'Ширээ & QR',icon:'🪑'},
    {id:'staff',label:'Ажилтан & ПИН шинэчлэх',icon:'👤'},
    {id:'orders',label:`Ширээний захиалгууд (${pendingOrders})`,icon:'📋'},
    {id:'settings' as AdminTab,label:'Тохиргоо & QR',icon:'⚙️'},
    {id:'logs' as AdminTab,label:'Үйл ажиллагааны лог',icon:'📜'},
  ];

  const card:React.CSSProperties={background:C.card,borderRadius:'14px',padding:'1.25rem',border:`1px solid ${C.border}`,marginBottom:'0.75rem'};

  return(
    <div style={{minHeight:'100vh',background:C.bg,display:'flex'}}>
      {/* Sidebar */}
      <div style={{width:'220px',background:C.sidebar,borderRight:`1px solid ${C.border}`,display:'flex',flexDirection:'column',flexShrink:0,position:'sticky',top:0,height:'100vh',overflowY:'auto'}}>
        <div style={{padding:'1.25rem 1rem',borderBottom:`1px solid ${C.border}`}}>
          <p style={{color:C.yellow,fontWeight:'800',fontSize:'0.85rem',letterSpacing:'0.06em',margin:0}}>{branchName.toUpperCase()}</p>
          <p style={{color:C.muted,fontSize:'0.7rem',margin:'0.2rem 0 0'}}>{isManager?'👔 Менежер':staff?.role==='chef'?'👨‍🍳 Тогооч':'🛎️ Зөөгч'}</p>
        </div>
        <nav style={{flex:1,padding:'0.5rem 0'}}>
          {NAV.filter(n=>isManager||n.id==='orders').map(n=>(
            <button key={n.id} onClick={()=>setTab(n.id)}
              style={{width:'100%',padding:'0.7rem 1rem',border:'none',background:tab===n.id?`${C.orange}22`:'transparent',color:tab===n.id?C.yellow:C.muted,fontWeight:tab===n.id?'700':'500',cursor:'pointer',textAlign:'left',fontSize:'0.82rem',display:'flex',alignItems:'center',gap:'0.6rem',borderLeft:tab===n.id?`3px solid ${C.orange}`:'3px solid transparent',transition:'all 0.15s'}}>
              <span>{n.icon}</span><span>{n.label}</span>
            </button>
          ))}
        </nav>
        <button onClick={onLogout} style={{margin:'1rem',padding:'0.6rem',background:C.inpBg,border:`1px solid ${C.border}`,borderRadius:'8px',color:C.muted,cursor:'pointer',fontSize:'0.8rem',fontWeight:'600',display:'flex',alignItems:'center',justifyContent:'center',gap:'0.4rem'}}>↪ Гарах</button>
      </div>

      {/* Content */}
      <div style={{flex:1,padding:'1.25rem 1.5rem',overflowY:'auto',minWidth:0}}>
        <div style={{maxWidth:'900px',margin:'0 auto'}}>

        {/* ── DASHBOARD ── */}
        {tab==='dashboard'&&<>
          {/* Time filters */}
          <div style={{display:'flex',gap:'0.5rem',marginBottom:'1.25rem',flexWrap:'wrap'}}>
            {[{k:'today',l:'Өнөөдөр'},{k:'7d',l:'7 хоног'},{k:'1m',l:'1 сар'},{k:'3m',l:'3 сар'},{k:'1y',l:'1 жил'}].map(f=>(
              <button key={f.k} onClick={()=>setDateFilter(f.k as any)}
                style={{padding:'0.45rem 1rem',borderRadius:'20px',border:`1px solid ${dateFilter===f.k?C.yellow:C.border}`,background:dateFilter===f.k?`${C.yellow}22`:'transparent',color:dateFilter===f.k?C.yellow:C.muted,fontWeight:dateFilter===f.k?'700':'500',cursor:'pointer',fontSize:'0.82rem'}}>
                {f.l}
              </button>
            ))}
          </div>

          {/* Stats */}
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))',gap:'0.75rem',marginBottom:'1.25rem'}}>
            {[
              {label:'CSAT СЭТГЭЛ ХАНАМЖ',value:csatPct!==null?`${csatPct}%`:'–',color:csatPct===null?C.muted:csatPct>=70?C.green:csatPct>=50?C.orange:C.red,badge:csatPct===null?'':csatPct>=70?'😊 Сайн':csatPct>=50?'😐 Дунд':'😞 Муу'},
              {label:'NPS ИНДЕКС ОНОО',value:npsScore!==null?`${npsScore>0?'+':''}${npsScore}`:'–',color:npsScore===null?C.muted:npsScore>=50?C.green:npsScore>=0?C.orange:C.red,badge:npsScore===null?'':npsScore>=50?'🏆 Маш сайн':npsScore>=0?'👍 Сайн':'⚠️ Анхааруул'},
              {label:'ЕРӨНХИЙ ДУНДАЖ',value:overallAvg?`${overallAvg} / 5.0`:'–',color:overallAvg>=4?C.green:overallAvg>=3?C.orange:overallAvg>0?C.red:C.muted,badge:overallAvg>=4?'⭐ Маш сайн':overallAvg>=3?'⭐ Дунд':overallAvg>0?'⚠️ Сайжруулах':''},
              {label:'НИЙТ ХАРИУЛТ',value:String(filteredSurveys.length),color:C.yellow,badge:''},
            ].map(s=>(
              <div key={s.label} style={{...card,marginBottom:0}}>
                <p style={{color:C.muted,fontSize:'0.65rem',letterSpacing:'0.06em',margin:'0 0 0.4rem',textTransform:'uppercase'}}>{s.label}</p>
                <p style={{color:s.color,fontSize:'1.8rem',fontWeight:'900',margin:0,lineHeight:1}}>{s.value}</p>
                {(s as any).badge&&<p style={{color:s.color,fontSize:'0.7rem',fontWeight:'700',margin:'0.35rem 0 0',opacity:0.85}}>{(s as any).badge}</p>}
              </div>
            ))}
          </div>

          {/* Per-question averages */}
          <div style={card}>
            <p style={{color:C.text,fontWeight:'800',fontSize:'0.85rem',letterSpacing:'0.04em',margin:'0 0 1rem',textTransform:'uppercase'}}>📊 Талбар бүрийн дундаж үнэлгээ</p>
            {[
              {key:'foodQuality',label:'Хоолны амт, чанар хэр байсан бэ?',color:'#818cf8'},
              {key:'ambiance',label:'Рестораны орчин тойрон, цэвэр байдал',color:'#f472b6'},
              {key:'staffAttitude',label:'Үйлчилгээний ажилтан, зөөгчийн харилцаа хандлага',color:'#34d399'},
              {key:'priceValue',label:'Хоолны үнэ өртөг чанартаа нийцэж байна уу?',color:'#fbbf24'},
              {key:'service',label:'Та манай рестораныг бусдад санал болгох уу?',color:'#22d3ee'},
            ].map(q=>{
              const a=avg(q.key as keyof Survey);
              return(
                <div key={q.key} style={{marginBottom:'0.875rem'}}>
                  <div style={{display:'flex',justifyContent:'space-between',marginBottom:'0.3rem'}}>
                    <span style={{color:C.muted,fontSize:'0.82rem'}}>{q.label}</span>
                    <span style={{color:C.text,fontWeight:'700',fontSize:'0.82rem'}}>{a||'–'}</span>
                  </div>
                  <div style={{height:'8px',background:C.inpBg,borderRadius:'4px',overflow:'hidden'}}>
                    <div style={{height:'100%',width:`${(a/5)*100}%`,background:q.color,borderRadius:'4px',transition:'width 0.3s'}}/>
                  </div>
                </div>
              );
            })}
          </div>
        </>}

        {/* ── COMPLAINTS ── */}
        {tab==='complaints'&&<>
          <ComplaintTabs branchId={branchId} pending={pending} resolved={resolved} anonymous={anonymous}
            onResolve={(id,note)=>setSurveyResolved(branchId,id,true,note)} onUnresolve={id=>setSurveyResolved(branchId,id,false)}/>
        </>}

        {/* ── MENU ── */}
        {tab==='menu'&&<>
          <button onClick={()=>setMenuModal({name:'',category:'',price:'',description:'',allergens:'',available:true,image:''})}
            style={{padding:'0.7rem 1.5rem',background:C.orange,color:'white',border:'none',borderRadius:'10px',fontWeight:'700',cursor:'pointer',marginBottom:'1rem',fontSize:'0.875rem'}}>
            + Шинэ хоол нэмэх
          </button>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))',gap:'0.75rem'}}>
            {menuItems.map(item=>(
              <div key={item.id} style={{...card,marginBottom:0,padding:0,overflow:'hidden'}}>
                {item.image&&<div style={{height:'160px',overflow:'hidden'}}><img src={item.image} alt={item.name} style={{width:'100%',height:'100%',objectFit:'cover'}} onError={e=>{(e.target as HTMLImageElement).parentElement!.style.display='none';}}/></div>}
                <div style={{padding:'0.875rem'}}>
                  <div style={{display:'flex',justifyContent:'space-between',marginBottom:'0.25rem'}}>
                    <span style={{fontWeight:'800',color:C.text,fontSize:'0.9rem'}}>{item.name}</span>
                    <span style={{color:C.yellow,fontWeight:'700',fontSize:'0.9rem'}}>{formatPrice(item.price)}</span>
                  </div>
                  {(item as any).allergens&&<p style={{color:C.muted,fontSize:'0.75rem',margin:'0 0 0.5rem'}}>Орц: {(item as any).allergens}</p>}
                  <div style={{display:'flex',gap:'0.5rem',marginTop:'0.5rem'}}>
                    <button onClick={()=>setMenuModal({id:item.id,name:item.name,category:item.category,price:String(item.price),description:item.description||'',allergens:(item as any).allergens||'',available:item.available,image:item.image||''})}
                      style={{flex:1,padding:'0.45rem',border:`1px solid ${C.border}`,borderRadius:'8px',background:C.inpBg,color:C.text,cursor:'pointer',fontWeight:'600',fontSize:'0.78rem'}}>Засах</button>
                    <button onClick={()=>setDeleteTarget(item.id||null)}
                      style={{width:'36px',border:'none',borderRadius:'8px',background:'rgba(231,76,60,0.15)',color:C.red,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>🗑️</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>}

        {/* ── TABLES & QR ── */}
        {tab==='tables'&&<>
          <div style={{...card}}>
            <p style={{fontWeight:'700',color:C.text,marginBottom:'0.75rem'}}>Ширээний тоо тохируулах</p>
            <div style={{display:'flex',gap:'0.5rem'}}>
              <input type="number" value={tableCount} onChange={e=>setTableCount(e.target.value)} min="1" max="200" style={{...inp,flex:1,width:'auto'}}/>
              <button onClick={async()=>{const n=parseInt(tableCount);if(!n)return;await setTablesDB(branchId,n);}} style={{padding:'0.65rem 1.25rem',background:C.orange,color:'white',border:'none',borderRadius:'8px',fontWeight:'700',cursor:'pointer'}}>Хадгалах</button>
            </div>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))',gap:'0.75rem'}}>
            {tables.map(t=>(
              <div key={t.id} style={{...card,marginBottom:0,borderTop:`3px solid ${t.status==='occupied'?C.red:C.green}`}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'0.75rem'}}>
                  <span style={{fontWeight:'800',color:C.text}}>Ширээ {t.number}</span>
                  <span style={{fontSize:'0.7rem',padding:'0.15rem 0.5rem',borderRadius:'20px',fontWeight:'700',background:t.status==='occupied'?`${C.red}22`:`${C.green}22`,color:t.status==='occupied'?C.red:C.green}}>{t.status==='occupied'?'Дүүрэн':'Сул'}</span>
                </div>
                <button onClick={()=>setShowQR(showQR===t.number?null:t.number)}
                  style={{width:'100%',padding:'0.45rem',border:`1px solid ${C.yellow}`,borderRadius:'8px',color:C.yellow,background:'transparent',fontWeight:'700',cursor:'pointer',fontSize:'0.78rem'}}>
                  {showQR===t.number?'✕ Хаах':'📱 QR харах'}
                </button>
                {showQR===t.number&&<div style={{marginTop:'0.75rem',textAlign:'center'}}>
                  <img src={buildQR(branchId,t.number)} alt="" style={{width:'100%',borderRadius:'8px'}}/>
                  <a href={buildLink(branchId,t.number)} target="_blank" rel="noreferrer" style={{color:C.yellow,fontSize:'0.72rem',display:'block',marginTop:'0.35rem'}}>↗ Нээх</a>
                </div>}
              </div>
            ))}
          </div>
        </>}

        {/* ── STAFF ── */}
        {tab==='staff'&&<>
          <div style={card}>
            <p style={{fontWeight:'700',color:C.text,marginBottom:'0.75rem'}}>Ажилтан нэмэх</p>
            <div style={{display:'flex',flexDirection:'column',gap:'0.6rem'}}>
              <input value={newStaffName} onChange={e=>setNewStaffName(e.target.value)} placeholder="Нэр" style={inp}/>
              <select value={newStaffRole} onChange={e=>setNewStaffRole(e.target.value as any)} style={{...inp}}><option value="chef">👨‍🍳 Тогооч</option><option value="waiter">🛎️ Зөөгч</option></select>
              <input value={newStaffPin} onChange={e=>setNewStaffPin(e.target.value)} type="password" placeholder="PIN" style={inp}/>
              <button onClick={async()=>{if(!newStaffName||!newStaffPin)return;await addStaff(branchId,newStaffName,newStaffRole as 'chef'|'waiter',newStaffPin);getStaff(branchId).then(setStaffList);setNewStaffName('');setNewStaffPin('');}}
                style={{padding:'0.7rem',background:C.orange,color:'white',border:'none',borderRadius:'8px',fontWeight:'700',cursor:'pointer'}}>➕ Нэмэх</button>
            </div>
          </div>
          {staffList.map(s=>(
            <div key={s.id} style={{...card,display:'flex',alignItems:'center',justifyContent:'space-between'}}>
              <div style={{display:'flex',alignItems:'center',gap:'0.75rem'}}>
                <div style={{width:'40px',height:'40px',borderRadius:'50%',background:C.inpBg,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'1.3rem'}}>{s.role==='chef'?'👨‍🍳':'🛎️'}</div>
                <div><p style={{fontWeight:'700',color:C.text,margin:0}}>{s.name}</p><p style={{fontSize:'0.75rem',color:C.muted,margin:0}}>{s.role==='chef'?'Тогооч':'Зөөгч'}</p></div>
              </div>
              <button onClick={async()=>{await removeStaff(branchId,s.id);getStaff(branchId).then(setStaffList);}}
                style={{background:`${C.red}22`,border:'none',color:C.red,borderRadius:'8px',padding:'0.4rem 0.75rem',cursor:'pointer',fontWeight:'600',fontSize:'0.8rem'}}>Устгах</button>
            </div>
          ))}
        </>}

        {tab==='settings'&&<SettingsTab branchId={branchId} tables={tables} onSetTables={setTablesDB} inp={inp}/> }

        {/* ── ORDERS (Kitchen view with tabs) ── */}
        {tab==='orders'&&<OrdersKitchenView orders={orders} branchId={branchId}/>}
        {tab==='logs'&&<>
          <p style={{color:C.muted,fontSize:'0.8rem',margin:'0 0 1rem'}}>Сүүлийн 150 үйл ажиллагаа</p>
          {!logs.length&&<div style={{textAlign:'center',padding:'3rem',color:'rgba(255,255,255,0.3)'}}><div style={{fontSize:'3rem'}}>📜</div><p>Лог байхгүй</p></div>}
          {logs.map(l=>(
            <div key={l.id} style={{background:C.card,borderRadius:'10px',padding:'0.75rem 1rem',border:`1px solid ${C.border}`,marginBottom:'0.5rem',display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:'1rem'}}>
              <div style={{flex:1,minWidth:0}}>
                <p style={{color:'rgba(255,255,255,0.85)',fontWeight:'700',margin:'0 0 0.15rem',fontSize:'0.875rem'}}>{l.action}</p>
                {l.details&&<p style={{color:'rgba(255,255,255,0.5)',margin:0,fontSize:'0.78rem',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' as const}}>{l.details}</p>}
              </div>
              <div style={{textAlign:'right',flexShrink:0}}>
                <p style={{color:C.yellow,fontSize:'0.78rem',fontWeight:'600',margin:'0 0 0.1rem'}}>{l.staffName}</p>
                <p style={{color:'rgba(255,255,255,0.35)',fontSize:'0.72rem',margin:0}}>{formatDate(l.createdAt)} {formatTime(l.createdAt)}</p>
              </div>
            </div>
          ))}
        </>}
      </div>

      </div>{/* /maxWidth wrapper */}
      {/* Menu Modal */}
      {menuModal&&<MenuItemModal branchId={branchId} initial={menuModal} onClose={()=>setMenuModal(null)}/>}

      {/* Delete confirm */}
      {deleteTarget&&<div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.8)',zIndex:100,display:'flex',alignItems:'center',justifyContent:'center',padding:'1rem'}}>
        <div style={{background:C.card,borderRadius:'20px',padding:'1.5rem',maxWidth:'300px',width:'100%',textAlign:'center',border:`1px solid ${C.border}`}}>
          <div style={{fontSize:'2.5rem',marginBottom:'0.75rem'}}>🗑️</div>
          <p style={{fontWeight:'800',color:C.text,margin:'0 0 0.5rem'}}>Устгах уу?</p>
          <p style={{color:C.muted,fontSize:'0.875rem',margin:'0 0 1.25rem'}}>Энэ үйлдлийг буцаах боломжгүй.</p>
          <div style={{display:'flex',gap:'0.75rem'}}>
            <button onClick={()=>setDeleteTarget(null)} style={{flex:1,padding:'0.75rem',border:`1px solid ${C.border}`,borderRadius:'10px',background:'transparent',color:C.muted,fontWeight:'700',cursor:'pointer'}}>Болих</button>
            <button onClick={async()=>{
              if(deleteTarget){
                const item=menuItems.find(i=>i.id===deleteTarget);
                await deleteMenuItem(branchId,deleteTarget);
                await logActivity(branchId,'Менежер','Хоол устгагдлаа',item?.name||deleteTarget);
              }
              setDeleteTarget(null);
            }} style={{flex:1,padding:'0.75rem',background:C.red,color:'white',border:'none',borderRadius:'10px',fontWeight:'800',cursor:'pointer'}}>Устгах</button>
          </div>
        </div>
      </div>}
    </div>
  );
}

// ════════════════════════════════════════════════════════
// SURVEY CARD (module-level to prevent remount/input bug)
// ════════════════════════════════════════════════════════
const CQ = [
  {k:'foodQuality',   l:'Хоолны амт, чанар хэр байсан бэ?'},
  {k:'ambiance',      l:'Рестораны орчин тойрон, цэвэр байдал:'},
  {k:'staffAttitude', l:'Үйлчилгээний ажилтан, зөөгчийн харилцаа хандлага:'},
  {k:'priceValue',    l:'Хоолны үнэ өртөг чанартаа нийцэж байна уу?:'},
  {k:'service',       l:'Нийт сэтгэл ханамж хэр байна?:'},
];

// ════════════════════════════════════════════════════════
// ORDERS KITCHEN VIEW (shared for manager, chef, waiter)
// ════════════════════════════════════════════════════════
type KitchenFilter = 'all'|'pending'|'preparing'|'ready';

function OrderCard({o,branchId}:{key?:React.Key;o:Order;branchId:string}) {
  const NEXT:Partial<Record<Order['status'],Order['status']>>={pending:'preparing',preparing:'ready',ready:'served'};
  const NEXT_LABEL:Partial<Record<Order['status'],string>>={pending:'👨‍🍳 Бэлтгэж эхлэх',preparing:'✅ Бэлэн боллоо',ready:'🛎️ Хүргэгдсэн'};
  const NEXT_COLOR:Partial<Record<Order['status'],string>>={pending:'#3B82F6',preparing:'#10B981',ready:'#8B5CF6'};
  const elapsed = Math.floor((Date.now()-o.createdAt)/60000);
  return(
    <div style={{background:C.card,borderRadius:'14px',overflow:'hidden',border:`1px solid ${C.border}`,borderTop:`4px solid ${ORDER_STATUS_COLORS[o.status]}`,marginBottom:'0.75rem'}}>
      <div style={{padding:'0.875rem 1rem',display:'flex',justifyContent:'space-between',alignItems:'center',borderBottom:`1px solid ${C.border}`}}>
        <div style={{display:'flex',alignItems:'baseline',gap:'0.5rem'}}>
          <span style={{fontSize:'2rem',fontWeight:'900',color:C.text,lineHeight:1}}>Ширээ {o.tableNumber}</span>
        </div>
        <div style={{textAlign:'right'}}>
          <div style={{fontSize:'0.72rem',padding:'0.25rem 0.65rem',borderRadius:'20px',fontWeight:'700',background:ORDER_STATUS_COLORS[o.status]+'22',color:ORDER_STATUS_COLORS[o.status],marginBottom:'0.2rem'}}>{ORDER_STATUS_LABELS[o.status]}</div>
          <div style={{fontSize:'0.72rem',color:elapsed>=15?C.red:elapsed>=5?C.yellow:C.muted,fontWeight:'600'}}>
            {formatTime(o.createdAt)} · {elapsed}мин өмнө
          </div>
        </div>
      </div>
      <div style={{padding:'0.875rem 1rem'}}>
        {o.items.map((item,i)=>(
          <div key={i} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'0.35rem 0',borderBottom:i<o.items.length-1?`1px dashed rgba(255,255,255,0.05)`:'none'}}>
            <span style={{fontWeight:'700',color:'rgba(255,255,255,0.9)',fontSize:'0.95rem'}}>{item.name}</span>
            <span style={{background:'rgba(255,255,255,0.1)',borderRadius:'20px',padding:'0.15rem 0.65rem',fontWeight:'800',color:C.text,fontSize:'0.85rem'}}>×{item.quantity}</span>
          </div>
        ))}
        {o.notes&&<div style={{marginTop:'0.6rem',background:`${C.yellow}11`,border:`1px solid ${C.yellow}33`,borderRadius:'8px',padding:'0.4rem 0.65rem'}}>
          <p style={{margin:0,fontSize:'0.82rem',color:C.yellow,fontWeight:'600'}}>📝 {o.notes}</p>
        </div>}
        {o.customerPhone&&<p style={{margin:'0.4rem 0 0',fontSize:'0.75rem',color:'rgba(255,255,255,0.4)'}}>☎ {o.customerPhone}</p>}
      </div>
      {NEXT[o.status]&&(
        <div style={{padding:'0 1rem 1rem'}}>
          <button onClick={async()=>{await updateOrderStatus(branchId,o.id,NEXT[o.status]!);await logActivity(branchId,'Ажилтан',`Захиалгын төлөв өөрчлөгдлөө`,`Ширээ ${o.tableNumber}: ${NEXT_LABEL[o.status]}`);}}
            style={{width:'100%',padding:'0.8rem',background:NEXT_COLOR[o.status],color:'white',border:'none',borderRadius:'10px',fontWeight:'800',cursor:'pointer',fontSize:'0.9rem'}}>
            {NEXT_LABEL[o.status]}
          </button>
        </div>
      )}
    </div>
  );
}

function OrdersKitchenView({orders,branchId}:{orders:Order[];branchId:string}) {
  const [filter,setFilter]=useState<KitchenFilter>('all');
  const active=orders.filter(o=>o.status!=='served').sort((a,b)=>a.createdAt-b.createdAt);
  const counts={
    all:active.length,
    pending:active.filter(o=>o.status==='pending').length,
    preparing:active.filter(o=>o.status==='preparing').length,
    ready:active.filter(o=>o.status==='ready').length,
  };
  const filtered=filter==='all'?active:active.filter(o=>o.status===filter);

  const TABS:{id:KitchenFilter;label:string;color:string}[]=[
    {id:'all',label:`📋 Бүгд (${counts.all})`,color:C.yellow},
    {id:'pending',label:`🟡 Хүлээгдэж байна (${counts.pending})`,color:'#F59E0B'},
    {id:'preparing',label:`🔵 Бэлтгэж байна (${counts.preparing})`,color:'#3B82F6'},
    {id:'ready',label:`🟢 Бэлэн болсон (${counts.ready})`,color:'#10B981'},
  ];

  return(
    <div>
      {/* Status tabs */}
      <div style={{display:'flex',gap:'0.5rem',marginBottom:'1.25rem',flexWrap:'wrap'}}>
        {TABS.map(t=>(
          <button key={t.id} onClick={()=>setFilter(t.id)}
            style={{padding:'0.5rem 1rem',borderRadius:'20px',border:`1px solid ${filter===t.id?t.color:C.border}`,background:filter===t.id?`${t.color}22`:'transparent',color:filter===t.id?t.color:'rgba(255,255,255,0.55)',fontWeight:filter===t.id?'700':'500',cursor:'pointer',fontSize:'0.82rem',whiteSpace:'nowrap' as const}}>
            {t.label}
          </button>
        ))}
      </div>
      {filtered.length===0&&(
        <div style={{textAlign:'center',padding:'4rem 2rem',color:'rgba(255,255,255,0.35)'}}>
          <div style={{fontSize:'3.5rem',marginBottom:'0.75rem'}}>🎉</div>
          <p style={{fontWeight:'700',fontSize:'1rem',margin:0}}>Захиалга байхгүй</p>
        </div>
      )}
      {filtered.map(o=><OrderCard key={o.id} o={o} branchId={branchId}/>)}
    </div>
  );
}

function SurveyCard({s,showActions,note,onNoteChange,onResolve,onUnresolve}:{key?:React.Key;s:Survey;showActions:boolean;note:string;onNoteChange:(v:string)=>void;onResolve:()=>void;onUnresolve:()=>void}) {
  return(
    <div style={{background:C.card,borderRadius:'14px',padding:'1.25rem',border:`1px solid ${C.border}`,marginBottom:'0.75rem'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'0.875rem'}}>
        <div>
          <p style={{color:'rgba(255,255,255,0.45)',fontSize:'0.68rem',letterSpacing:'0.05em',margin:'0 0 0.2rem',textTransform:'uppercase'as const}}>ҮНЭЛГЭЭ</p>
          <p style={{color:'rgba(255,255,255,0.75)',fontSize:'0.8rem',margin:0,fontWeight:'600'}}>{formatDate(s.createdAt)}, {formatTime(s.createdAt)}</p>
        </div>
        {s.phone&&<div style={{display:'flex',alignItems:'center',gap:'0.4rem',background:`${C.green}18`,border:`1px solid ${C.green}55`,borderRadius:'8px',padding:'0.35rem 0.8rem'}}>
          <span style={{color:C.green}}>📞</span>
          <span style={{color:C.green,fontWeight:'800',fontSize:'0.85rem'}}>Утас: {s.phone}</span>
        </div>}
      </div>
      <div style={{marginBottom:'0.75rem'}}>
        {CQ.filter(q=>(s as any)[q.k]).map(q=>(
          <div key={q.k} style={{display:'flex',justifyContent:'space-between',padding:'0.3rem 0',fontSize:'0.84rem',borderBottom:'1px solid rgba(255,255,255,0.05)'}}>
            <span style={{color:'rgba(255,255,255,0.82)',fontWeight:'500'}}>♦ {q.l}</span>
            <span style={{color:(s as any)[q.k]>=4?C.green:(s as any)[q.k]>=3?C.yellow:C.red,fontWeight:'800'}}>{(s as any)[q.k]} / 5</span>
          </div>
        ))}
      </div>
      {s.feedback&&<div style={{background:'rgba(255,255,255,0.04)',borderRadius:'8px',padding:'0.75rem',marginBottom:'0.75rem',border:'1px solid rgba(255,255,255,0.07)'}}>
        <p style={{color:'rgba(255,255,255,0.88)',fontSize:'0.85rem',margin:0,fontStyle:'italic'}}>"{s.feedback}"</p>
      </div>}
      {showActions&&<div style={{display:'flex',gap:'0.5rem',alignItems:'center'}}>
        <input value={note} onChange={e=>onNoteChange(e.target.value)}
          placeholder="Шийдвэрлэлтийн тэмдэглэл..."
          style={{flex:1,padding:'0.55rem 0.75rem',border:`1px solid ${C.border}`,borderRadius:'8px',fontSize:'0.82rem',outline:'none',background:'#1e1e2c',color:'#ffffff'}}/>
        <button onClick={onResolve}
          style={{padding:'0.5rem 1.1rem',background:C.green,color:'white',border:'none',borderRadius:'8px',fontWeight:'700',cursor:'pointer',fontSize:'0.82rem',flexShrink:0,whiteSpace:'nowrap'as const}}>Шийдсэн</button>
      </div>}
      {s.resolved&&<div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginTop:'0.5rem'}}>
        {s.resolvedNote&&<p style={{color:'rgba(255,255,255,0.6)',fontSize:'0.75rem',margin:0}}>📝 {s.resolvedNote}</p>}
        <button onClick={onUnresolve} style={{padding:'0.35rem 0.75rem',background:C.inpBg,border:`1px solid ${C.border}`,borderRadius:'8px',color:'rgba(255,255,255,0.5)',cursor:'pointer',fontSize:'0.75rem'}}>Буцаах</button>
      </div>}
    </div>
  );
}

// ════════════════════════════════════════════════════════
// COMPLAINT TABS
// ════════════════════════════════════════════════════════
function ComplaintTabs({ branchId, pending, resolved, anonymous, onResolve, onUnresolve }: {
  branchId:string; pending:Survey[]; resolved:Survey[]; anonymous:Survey[];
  onResolve:(id:string,note:string)=>void; onUnresolve:(id:string)=>void;
}) {
  const [activeTab, setActiveTab] = useState<'pending'|'resolved'|'anon'>('pending');
  const [notes, setNotes] = useState<Record<string,string>>({});
  const setNote=(id:string,v:string)=>setNotes(p=>({...p,[id]:v}));

  return(
    <div>
      <div style={{display:'flex',gap:'0.5rem',marginBottom:'1.25rem',flexWrap:'wrap'}}>
        {[
          {id:'pending',label:`🔴 Хүлээгдэж буй`,count:pending.length,color:C.orange},
          {id:'resolved',label:`✅ Шийдвэрлэсэн`,count:resolved.length,color:C.green},
          {id:'anon',label:`💬 Аноним сэтгэгдэл`,count:anonymous.length,color:'rgba(255,255,255,0.5)'},
        ].map(t=>(
          <button key={t.id} onClick={()=>setActiveTab(t.id as any)}
            style={{padding:'0.5rem 1.1rem',borderRadius:'20px',border:`1px solid ${activeTab===t.id?t.color:C.border}`,background:activeTab===t.id?`${t.color}22`:'transparent',color:activeTab===t.id?t.color:'rgba(255,255,255,0.55)',fontWeight:activeTab===t.id?'700':'500',cursor:'pointer',fontSize:'0.82rem',display:'flex',alignItems:'center',gap:'0.35rem'}}>
            {t.label} <span style={{background:`${t.color}33`,borderRadius:'20px',padding:'0 0.4rem',fontSize:'0.72rem',fontWeight:'700'}}>{t.count}</span>
          </button>
        ))}
      </div>
      {activeTab==='pending'&&(pending.length
        ?pending.map(s=><SurveyCard key={s.id} s={s} showActions note={notes[s.id]||''} onNoteChange={v=>setNote(s.id,v)} onResolve={()=>onResolve(s.id,notes[s.id]||'')} onUnresolve={()=>onUnresolve(s.id)}/>)
        :<p style={{textAlign:'center',color:'rgba(255,255,255,0.4)',padding:'3rem'}}>Хүлээгдэж буй санал байхгүй</p>
      )}
      {activeTab==='resolved'&&(resolved.length
        ?resolved.map(s=><SurveyCard key={s.id} s={s} showActions={false} note="" onNoteChange={()=>{}} onResolve={()=>{}} onUnresolve={()=>onUnresolve(s.id)}/>)
        :<p style={{textAlign:'center',color:'rgba(255,255,255,0.4)',padding:'3rem'}}>Шийдвэрлэсэн санал байхгүй</p>
      )}
      {activeTab==='anon'&&(anonymous.length
        ?anonymous.map(s=><SurveyCard key={s.id} s={s} showActions={false} note="" onNoteChange={()=>{}} onResolve={()=>{}} onUnresolve={()=>{}}/>)
        :<p style={{textAlign:'center',color:'rgba(255,255,255,0.4)',padding:'3rem'}}>Аноним сэтгэгдэл байхгүй</p>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════
// ════════════════════════════════════════════════════════
// SETTINGS TAB
// ════════════════════════════════════════════════════════
function SettingsTab({branchId,tables,onSetTables,inp}:{branchId:string;tables:Table[];onSetTables:(id:string,n:number)=>Promise<void>;inp:React.CSSProperties}) {
  const [tableCount,setTableCount]=useState(String(tables.length||5));
  const [qrTopText,setQrTopText]=useState('МЕНЮ');
  const [qrBottomText,setQrBottomText]=useState('⭐ Сэтгэл ханамжийн судалгаа бөглөх боломжтой');
  const [questions,setQuestions]=useState<string[]>([]);
  const [editQ,setEditQ]=useState<{idx:number;val:string}|null>(null);
  const [newQ,setNewQ]=useState('');
  const [loading,setLoading]=useState(false);
  const [saved,setSaved]=useState(false);

  useEffect(()=>{
    getSettings(branchId).then(s=>{
      if(s.qrTopText)setQrTopText(s.qrTopText);
      if(s.qrBottomText)setQrBottomText(s.qrBottomText);
      if(s.surveyQuestions)setQuestions(s.surveyQuestions);
      else setQuestions(['Хоолны амт, чанар хэр байсан бэ?','Рестораны орчин тойрон, цэвэр байдал','Үйлчилгээний ажилтан, зөөгчийн харилцаа хандлага','Хоолны үнэ өртөг чанартаа нийцэж байна уу?','Нийт сэтгэл ханамж хэр байна?']);
    });
  },[branchId]);

  useEffect(()=>{setTableCount(String(tables.length||5));},[tables.length]);

  const saveAll=async()=>{
    setLoading(true);
    await saveSettings(branchId,{qrTopText,qrBottomText,surveyQuestions:questions});
    setLoading(false);setSaved(true);setTimeout(()=>setSaved(false),2000);
  };

  const buildQR=(bId:string,t:number)=>`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(`${window.location.origin}${window.location.pathname}?b=${bId}&t=${t}`)}`;
  const buildLink=(bId:string,t:number)=>`${window.location.origin}${window.location.pathname}?b=${bId}&t=${t}`;
  const [showQR,setShowQR]=useState<number|null>(null);

  const s2={background:C.card,borderRadius:'14px',padding:'1.25rem',border:`1px solid ${C.border}`,marginBottom:'0.75rem'};
  const lbl:React.CSSProperties={color:'rgba(255,255,255,0.45)',fontSize:'0.7rem',letterSpacing:'0.05em',textTransform:'uppercase' as const,margin:'0 0 0.6rem'};

  return(
    <div>
      {/* TABLE MANAGEMENT */}
      <div style={s2}>
        <p style={lbl}>🪑 ШИРЭЭНИЙ ТООГ ТОХИРУУЛАХ</p>
        <div style={{display:'flex',gap:'0.5rem',marginBottom:'0.875rem'}}>
          <input type="number" value={tableCount} onChange={e=>setTableCount(e.target.value)} min="1" max="200" style={{...inp,flex:1,width:'auto'}}/>
          <button onClick={async()=>{const n=parseInt(tableCount);if(!n)return;await onSetTables(branchId,n);logActivity(branchId,'Системийн тохиргоо',`Ширээний тоо ${n} болгон өөрчиллоо`);}}
            style={{padding:'0.65rem 1.25rem',background:C.orange,color:'white',border:'none',borderRadius:'8px',fontWeight:'700',cursor:'pointer',fontSize:'0.875rem'}}>Хадгалах</button>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(120px,1fr))',gap:'0.5rem'}}>
          {tables.map(t=>(
            <div key={t.id} style={{background:C.inpBg,borderRadius:'8px',padding:'0.5rem 0.75rem',border:`1px solid ${t.status==='occupied'?'rgba(239,68,68,0.4)':'rgba(46,204,113,0.3)'}`,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <span style={{color:'rgba(255,255,255,0.8)',fontSize:'0.82rem',fontWeight:'700'}}>Ширээ {t.number}</span>
              <span style={{fontSize:'0.65rem',color:t.status==='occupied'?C.red:C.green,fontWeight:'700'}}>{t.status==='occupied'?'•':'○'}</span>
            </div>
          ))}
        </div>
      </div>

      {/* QR PRINTING */}
      <div style={s2}>
        <p style={lbl}>📱 QR ХЭВЛЭЛТ ТОХИРГОО</p>
        <div style={{display:'flex',flexDirection:'column' as const,gap:'0.6rem',marginBottom:'0.875rem'}}>
          <div>
            <label style={{...lbl,margin:'0 0 0.3rem',display:'block'}}>Дээд хэсгийн текст</label>
            <input value={qrTopText} onChange={e=>setQrTopText(e.target.value)} style={inp} placeholder="МЕНЮ"/>
          </div>
          <div>
            <label style={{...lbl,margin:'0 0 0.3rem',display:'block'}}>Доод хэсгийн текст</label>
            <textarea value={qrBottomText} onChange={e=>setQrBottomText(e.target.value)} rows={2} style={{...inp,resize:'none' as const}}/>
          </div>
        </div>
        <div style={{display:'flex',gap:'0.75rem',alignItems:'center',flexWrap:'wrap' as const}}>
          <CustomSelect value={String(showQR||'')} onChange={v=>setShowQR(Number(v)||null)} placeholder="Ширээ сонгох" options={tables.map(t=>({value:String(t.number),label:`Ширээ ${t.number}`}))} style={{width:'160px'}}/>
          {showQR&&<>
            <button onClick={()=>{
              const w=window.open('','_blank');
              if(w){
                w.document.write(`<!DOCTYPE html><html><head><meta charset='utf-8'><style>@page{margin:0}body{margin:0;font-family:sans-serif;background:white;display:flex;align-items:center;justify-content:center;min-height:100vh}.card{border:2px solid #f0f0f0;border-radius:16px;padding:32px 28px;max-width:280px;text-align:center;box-shadow:0 4px 16px rgba(0,0,0,0.08)}.top{font-size:1.6rem;font-weight:900;color:#F5C120;letter-spacing:0.08em;margin-bottom:4px}.sub{font-size:0.75rem;color:#888;margin-bottom:16px}.name{font-size:1rem;font-weight:700;color:#222;margin:12px 0 4px}.table{font-size:0.85rem;color:#555;margin-bottom:12px}.divider{border:none;border-top:1px solid #eee;margin:12px 0}.survey{font-size:0.78rem;color:#666;line-height:1.5}</style></head><body><div class='card'><div class='top'>${qrTopText}</div><div class='sub'>QR код скан хийж захиалгаа өгнө үү</div><img src='${buildQR(branchId,showQR)}' style='width:200px'/><div class='name'></div><div class='table'>Ширээ ${showQR}</div><hr class='divider'/><div class='survey'>${qrBottomText}</div></div><script>window.onload=function(){window.print()}<\/script></body></html>`);
                w.document.close();
              }
            }}
            style={{padding:'0.6rem 1.25rem',background:C.orange,border:'none',borderRadius:'10px',color:'white',cursor:'pointer',fontWeight:'700',fontSize:'0.82rem',display:'flex',alignItems:'center',gap:'0.4rem'}}>
              🖨️ QR ХЭВЛЭХ
            </button>
            <img src={buildQR(branchId,showQR)} alt="" style={{width:'70px',borderRadius:'8px'}}/>
          </>}
        </div>
      </div>

      {/* SURVEY QUESTIONS */}
      <div style={s2}>
        <p style={lbl}>⭐ СУДАЛГААНЫ АСУУЛТУУД (засах боломжтой)</p>
        <div style={{marginBottom:'0.75rem'}}>
          {questions.map((q,i)=>(
            <div key={i} style={{display:'flex',alignItems:'center',gap:'0.5rem',marginBottom:'0.4rem'}}>
              <span style={{color:'rgba(255,255,255,0.4)',fontSize:'0.75rem',width:'18px',flexShrink:0}}>{i+1}.</span>
              {editQ?.idx===i
                ?<>
                   <input value={editQ.val} onChange={e=>setEditQ({idx:i,val:e.target.value})} style={{...inp,flex:1,padding:'0.4rem 0.65rem',fontSize:'0.82rem'}} autoFocus/>
                   <button onClick={()=>{const q=[...questions];q[i]=editQ.val;setQuestions(q);setEditQ(null);}} style={{padding:'0.4rem 0.75rem',background:C.green,border:'none',borderRadius:'6px',color:'white',cursor:'pointer',fontSize:'0.75rem',fontWeight:'700'}}>✓</button>
                   <button onClick={()=>setEditQ(null)} style={{padding:'0.4rem 0.5rem',background:C.inpBg,border:`1px solid ${C.border}`,borderRadius:'6px',color:C.muted,cursor:'pointer',fontSize:'0.75rem'}}>✕</button>
                 </>
                :<>
                   <div style={{flex:1,padding:'0.4rem 0.75rem',background:'rgba(255,255,255,0.04)',borderRadius:'8px',border:`1px solid ${C.border}`}}>
                     <span style={{color:'rgba(255,255,255,0.85)',fontSize:'0.82rem'}}>{q}</span>
                   </div>
                   <button onClick={()=>setEditQ({idx:i,val:q})} style={{padding:'0.35rem 0.6rem',background:C.inpBg,border:`1px solid ${C.border}`,borderRadius:'6px',color:C.muted,cursor:'pointer',fontSize:'0.75rem'}}>✏️</button>
                   <button onClick={()=>setQuestions(questions.filter((_,j)=>j!==i))} style={{padding:'0.35rem 0.5rem',background:`${C.red}22`,border:'none',borderRadius:'6px',color:C.red,cursor:'pointer',fontSize:'0.75rem'}}>🗑</button>
                 </>
              }
            </div>
          ))}
          <p style={{color:'rgba(255,255,255,0.3)',fontSize:'0.72rem',margin:'0.35rem 0 0'}}>+ NPS: Найз нөхөддөө санал болгох магадлал (0-10) — тогтмол</p>
        </div>
        <div style={{display:'flex',gap:'0.5rem'}}>
          <input value={newQ} onChange={e=>setNewQ(e.target.value)} placeholder="Шинэ асуулт нэмэх..." style={{...inp,flex:1,padding:'0.5rem 0.75rem',fontSize:'0.82rem'}}
            onKeyDown={e=>{if(e.key==='Enter'&&newQ.trim()){setQuestions([...questions,newQ.trim()]);setNewQ('');}}}/>
          <button onClick={()=>{if(newQ.trim()){setQuestions([...questions,newQ.trim()]);setNewQ('');}}}
            style={{padding:'0.5rem 0.875rem',background:C.orange,border:'none',borderRadius:'8px',color:'white',cursor:'pointer',fontWeight:'700',fontSize:'0.82rem'}}>+</button>
        </div>
      </div>

      {/* Save button */}
      <button onClick={saveAll} disabled={loading}
        style={{width:'100%',padding:'0.875rem',background:saved?C.green:C.orange,color:'white',border:'none',borderRadius:'12px',fontWeight:'800',cursor:'pointer',fontSize:'0.9rem',transition:'background 0.2s'}}>
        {loading?'Хадгалж байна...':saved?'✅ Хадгалагдлаа!':'💾 Бүгдийг хадгалах'}
      </button>
    </div>
  );
}

function MenuItemModal({ branchId, initial, onClose }: { branchId:string; initial:any; onClose:()=>void }) {
  const [form, setForm] = useState(initial);
  const [preview, setPreview] = useState(initial.image||'');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = async(e:React.ChangeEvent<HTMLInputElement>)=>{
    const file=e.target.files?.[0]; if(!file) return;
    setUploading(true);
    try{ const b64=await compressImage(file,700,0.78); setPreview(b64); setForm((f:any)=>({...f,image:b64})); }
    catch{ setError('Зураг уншихад алдаа гарлаа'); }
    setUploading(false);
  };

  const handleSave = async()=>{
    if(!form.name||!form.category||!form.price||isNaN(Number(form.price))) return setError('Нэр, ангилал, үнэ шаардлагатай');
    setUploading(true);
    try{
      await saveMenuItem(branchId,{name:form.name.trim(),category:form.category.trim(),price:Number(form.price),description:form.description||'',allergens:form.allergens||'',image:form.image||'',available:form.available!==false},form.id);
      await logActivity(branchId,'Менежер',form.id?'Хоол засагдлаа':'Шинэ хоол нэмэгдлэв',`${form.name} — ₮${form.price}`);
      onClose();
    }catch{ setError('Хадгалахад алдаа гарлаа'); setUploading(false); }
  };

  const inp:React.CSSProperties={padding:'0.65rem 0.875rem',border:`1px solid ${C.border}`,borderRadius:'8px',fontSize:'0.875rem',outline:'none',background:'#1e1e2c',color:'#ffffff',width:'100%',boxSizing:'border-box',colorScheme:'dark' as any};
  const lbl:React.CSSProperties={display:'block',color:C.muted,fontSize:'0.75rem',fontWeight:'600',marginBottom:'0.3rem',letterSpacing:'0.04em'};

  return(
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.8)',zIndex:100,display:'flex',alignItems:'center',justifyContent:'center',padding:'1rem'}} onClick={onClose}>
      <div style={{background:C.card,borderRadius:'16px',padding:'1.25rem',width:'100%',maxWidth:'480px',maxHeight:'90vh',overflowY:'auto',border:`1px solid ${C.border}`}} onClick={e=>e.stopPropagation()}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'1.25rem'}}>
          <h3 style={{fontWeight:'800',color:C.yellow,margin:0}}>{form.id?'✏️ Хоол засах':'➕ Шинэ хоол нэмэх'}</h3>
          <button onClick={onClose} style={{background:C.inpBg,border:'none',width:'32px',height:'32px',borderRadius:'50%',cursor:'pointer',color:C.muted,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'1.1rem'}}>✕</button>
        </div>

        {/* Image */}
        <div style={{marginBottom:'1rem'}}>
          <label style={lbl}>🖼️ ХООЛНЫ ЗУРАГ</label>
          {preview
            ?<div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:'0.5rem',marginBottom:'0.5rem'}}>
               <div style={{position:'relative',borderRadius:'10px',overflow:'hidden',width:'200px',height:'150px'}}>
                 <img src={preview} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/>
               </div>
               <button onClick={()=>{setPreview('');setForm((f:any)=>({...f,image:''}));}} style={{padding:'0.3rem 0.875rem',background:`${C.red}22`,border:'none',color:C.red,borderRadius:'20px',cursor:'pointer',fontSize:'0.78rem',fontWeight:'700'}}>✕ Зураг устгах</button>
             </div>
            :<div onClick={()=>fileRef.current?.click()}
               style={{height:'68px',border:`2px dashed ${C.border}`,borderRadius:'10px',display:'flex',flexDirection:'row',alignItems:'center',justifyContent:'center',cursor:'pointer',background:C.inpBg,marginBottom:'0.5rem',gap:'0.6rem'}}
               onMouseOver={e=>{e.currentTarget.style.borderColor=C.yellow;}} onMouseOut={e=>{e.currentTarget.style.borderColor='rgba(255,255,255,0.08)';}}>
               <span style={{fontSize:'2rem'}}>{uploading?'⏳':'📷'}</span>
               <div><p style={{margin:0,fontWeight:'700',color:C.text,fontSize:'0.875rem'}}>{uploading?'Боловсруулж байна...':'Зураг оруулах'}</p><p style={{margin:0,fontSize:'0.72rem',color:C.muted}}>JPG, PNG · Автоматаар жижигрэнэ</p></div>
             </div>}
          <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} style={{display:'none'}}/>
          {!preview&&<button onClick={()=>fileRef.current?.click()} style={{padding:'0.4rem 0.875rem',border:`1px solid ${C.border}`,borderRadius:'8px',background:'transparent',color:C.muted,cursor:'pointer',fontWeight:'600',fontSize:'0.78rem'}}>📁 Файл сонгох</button>}
        </div>

        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0.6rem',marginBottom:'0.6rem'}}>
          <div style={{gridColumn:'1/-1'}}><label style={lbl}>ХООЛНЫ НЭР *</label><input value={form.name} onChange={e=>setForm((f:any)=>({...f,name:e.target.value}))} placeholder="Жишээ: Цуйван" style={inp}/></div>
          <div><label style={lbl}>АНГИЛАЛ *</label><input value={form.category} onChange={e=>setForm((f:any)=>({...f,category:e.target.value}))} placeholder="Үндсэн хоол" style={inp}/></div>
          <div><label style={lbl}>ҮНЭ (₮) *</label><input type="number" value={form.price} onChange={e=>setForm((f:any)=>({...f,price:e.target.value}))} placeholder="12000" style={inp}/></div>
          <div style={{gridColumn:'1/-1'}}><label style={lbl}>ТАЙЛБАР</label><textarea value={form.description} onChange={e=>setForm((f:any)=>({...f,description:e.target.value}))} rows={2} placeholder="Хоолны товч тайлбар..." style={{...inp,resize:'none'}}/></div>
          <div style={{gridColumn:'1/-1'}}><label style={lbl}>ОРЦ / ДАРХЛААНЫ ХАРШИХ НАЙРЛАГА</label><input value={form.allergens} onChange={e=>setForm((f:any)=>({...f,allergens:e.target.value}))} placeholder="Гурил, Мах, Өндөг..." style={inp}/></div>
          <div style={{gridColumn:'1/-1',display:'flex',alignItems:'center',gap:'0.75rem',padding:'0.75rem',background:C.inpBg,borderRadius:'10px',border:`1px solid ${C.border}`}}>
            <label style={{position:'relative',display:'inline-block',width:'44px',height:'24px',cursor:'pointer',flexShrink:0}}>
              <input type="checkbox" checked={form.available} onChange={e=>setForm((f:any)=>({...f,available:e.target.checked}))} style={{opacity:0,width:0,height:0}}/>
              <span style={{position:'absolute',inset:0,background:form.available?C.green:'rgba(255,255,255,0.1)',borderRadius:'12px',transition:'0.2s'}}/>
              <span style={{position:'absolute',left:form.available?'22px':'2px',top:'2px',width:'20px',height:'20px',background:'white',borderRadius:'50%',transition:'0.2s',boxShadow:'0 1px 3px rgba(0,0,0,0.3)'}}/>
            </label>
            <span style={{color:C.text,fontSize:'0.875rem',fontWeight:'600'}}>Цэсэнд харагдах</span>
          </div>
        </div>

        {error&&<p style={{color:C.red,fontSize:'0.85rem',textAlign:'center',background:`${C.red}11`,padding:'0.5rem',borderRadius:'8px',margin:'0 0 1rem'}}>{error}</p>}
        <div style={{display:'flex',gap:'0.6rem',marginTop:'0.25rem'}}>
          <button onClick={onClose} style={{padding:'0.7rem 1.25rem',border:`1px solid ${C.border}`,borderRadius:'10px',background:'transparent',color:C.muted,fontWeight:'700',cursor:'pointer',fontSize:'0.875rem'}}>Болих</button>
          <button onClick={handleSave} disabled={uploading} style={{flex:1,padding:'0.7rem',background:C.orange,color:'white',border:'none',borderRadius:'10px',fontWeight:'800',cursor:'pointer',opacity:uploading?0.7:1,fontSize:'0.875rem'}}>
            {uploading?'Хадгалж байна...':'✅ Хадгалах'}
          </button>
        </div>
      </div>
    </div>
  );
}
