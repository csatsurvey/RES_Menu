import { useState, useEffect, useRef } from 'react';
import {
  Branch, Table, Order, Survey, Staff, MenuItem, OrderItem,
  getAllBranches, createBranch, getBranch, verifyManagerPin, verifyStaffPin,
  setTables as setTablesDB, subscribeToTables,
  subscribeToOrders, subscribeToTableOrders, createOrder, updateOrderStatus,
  subscribeToSurveys, createSurvey, setSurveyResolved,
  subscribeToMenu, saveMenuItem, deleteMenuItem, compressImage,
  getStaff, addStaff, removeStaff,
  formatPrice, formatTime, formatDate,
  ORDER_STATUS_LABELS, ORDER_STATUS_COLORS,
} from './lib/db';

const getQRParams = () => { const p = new URLSearchParams(window.location.search); return { b: p.get('b')||'', t: Number(p.get('t'))||0 }; };
const buildQR = (bId:string,t:number)=>`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(`${window.location.origin}${window.location.pathname}?b=${bId}&t=${t}`)}`;
const buildLink = (bId:string,t:number)=>`${window.location.origin}${window.location.pathname}?b=${bId}&t=${t}`;

const SEED_MENU: Omit<MenuItem, 'id'>[] = [
  { name:'Цуйван', description:'Гурилтай шарсан мах, хүнсний ногоо', price:12000, category:'Үндсэн хоол', image:'', available:true, allergens:'Gluten' },
  { name:'Хуушуур', description:'4 ширхэг шарсан гурилтай мах', price:8000, category:'Үндсэн хоол', image:'', available:true, allergens:'Gluten' },
  { name:'Банштай шөл', description:'Уламжлалт банш, чанасан мах', price:9000, category:'Үндсэн хоол', image:'', available:true },
  { name:'Тахианы шөл', description:'Хөнгөн, тэжээллэг', price:7000, category:'Шөл', image:'', available:true },
  { name:'Кофе Американо', description:'Хос эспрессо', price:4500, category:'Ундаа', image:'', available:true },
  { name:'Ногоон цай', description:'Байгалийн', price:3000, category:'Ундаа', image:'', available:true },
  { name:'Жүүс', description:'Улбар шар / Алим', price:4000, category:'Ундаа', image:'', available:true },
  { name:'Ус', description:'500мл', price:1500, category:'Ундаа', image:'', available:true },
];

type AppView='landing'|'customer'|'manager'|'kitchen';

export default function App() {
  const [view,setView]=useState<AppView>('landing');
  const [branchId,setBranchId]=useState('');
  const [tableNum,setTableNum]=useState(0);
  const [staff,setStaff]=useState<Staff|null>(null);
  useEffect(()=>{ const{b,t}=getQRParams(); if(b&&t){setBranchId(b);setTableNum(t);setView('customer');} },[]);
  const logout=()=>{setView('landing');setBranchId('');setStaff(null);};
  if(view==='customer') return <CustomerView branchId={branchId} tableNum={tableNum}/>;
  if(view==='manager') return <ManagerPanel branchId={branchId} onLogout={logout}/>;
  if(view==='kitchen') return <KitchenPanel branchId={branchId} staff={staff!} onLogout={logout}/>;
  return <LandingView onManager={id=>{setBranchId(id);setView('manager');}} onStaff={(id,s)=>{setBranchId(id);setStaff(s);setView('kitchen');}}/>;
}

// ════════════════════════════════════════════════════════
// LANDING
// ════════════════════════════════════════════════════════
function LandingView({onManager,onStaff}:{onManager:(id:string)=>void;onStaff:(id:string,s:Staff)=>void}) {
  const [branches,setBranches]=useState<Branch[]>([]);
  const [mode,setMode]=useState<'select'|'manager'|'staff'|'new'>('select');
  const [branchId,setBranchId]=useState('');
  const [pin,setPin]=useState('');
  const [error,setError]=useState('');
  const [loading,setLoading]=useState(false);
  const [newName,setNewName]=useState('');
  const [newAddr,setNewAddr]=useState('');
  const [newPin,setNewPin]=useState('');
  useEffect(()=>{getAllBranches().then(setBranches);},[]);
  const inp:React.CSSProperties={padding:'0.75rem 1rem',border:'2px solid #E7E5E4',borderRadius:'12px',fontSize:'0.9rem',outline:'none',width:'100%',boxSizing:'border-box'};
  const login=async(type:'manager'|'staff')=>{
    if(!branchId||!pin) return setError('Салбар болон PIN оруулна уу');
    setLoading(true);
    if(type==='manager'){const ok=await verifyManagerPin(branchId,pin);setLoading(false);return ok?onManager(branchId):setError('PIN буруу байна');}
    const s=await verifyStaffPin(branchId,pin);setLoading(false);return s?onStaff(branchId,s):setError('PIN буруу байна');
  };
  const handleCreate=async()=>{
    if(!newName||!newPin) return setError('Нэр болон PIN шаардлагатай');
    if(newPin.length<4) return setError('PIN дор хаяж 4 оронтой');
    setLoading(true);
    try{ const id=await createBranch(newName,newAddr,newPin); for(const item of SEED_MENU) await saveMenuItem(id,item); await setTablesDB(id,5); onManager(id); }
    catch{ setError('Алдаа гарлаа'); setLoading(false); }
  };
  return (
    <div style={{minHeight:'100vh',background:'linear-gradient(135deg,#FF6B35,#F7931E,#FFD700)',display:'flex',alignItems:'center',justifyContent:'center',padding:'1rem'}}>
      <div style={{width:'100%',maxWidth:'380px',background:'white',borderRadius:'24px',padding:'2rem',boxShadow:'0 25px 60px rgba(0,0,0,0.2)'}}>
        <div style={{textAlign:'center',marginBottom:'2rem'}}>
          <div style={{fontSize:'3.5rem'}}>🍽️</div>
          <h1 style={{fontSize:'1.5rem',fontWeight:'800',color:'#1C1917',margin:'0.5rem 0 0.25rem'}}>Ресторан систем</h1>
          <p style={{color:'#78716C',fontSize:'0.875rem',margin:0}}>Нэвтрэх эрхээ сонгоно уу</p>
        </div>
        {mode==='select'&&<div style={{display:'flex',flexDirection:'column',gap:'0.75rem'}}>
          <button onClick={()=>setMode('manager')} style={{padding:'0.875rem',background:'#FF6B35',color:'white',border:'none',borderRadius:'14px',fontWeight:'700',fontSize:'1rem',cursor:'pointer'}}>👔 Менежер</button>
          <button onClick={()=>setMode('staff')} style={{padding:'0.875rem',background:'#10B981',color:'white',border:'none',borderRadius:'14px',fontWeight:'700',fontSize:'1rem',cursor:'pointer'}}>👨‍🍳 Тогооч / Зөөгч</button>
          <button onClick={()=>setMode('new')} style={{padding:'0.875rem',background:'transparent',border:'2px dashed #E7E5E4',borderRadius:'14px',color:'#78716C',fontWeight:'600',cursor:'pointer'}}>➕ Шинэ салбар үүсгэх</button>
        </div>}
        {(mode==='manager'||mode==='staff')&&<div style={{display:'flex',flexDirection:'column',gap:'1rem'}}>
          <div style={{background:mode==='manager'?'#FFF7ED':'#ECFDF5',borderRadius:'12px',padding:'0.6rem',textAlign:'center',fontWeight:'700',color:mode==='manager'?'#FF6B35':'#10B981',fontSize:'0.9rem'}}>
            {mode==='manager'?'👔 Менежер нэвтрэх':'👨‍🍳 Ажилтан нэвтрэх'}
          </div>
          <select value={branchId} onChange={e=>setBranchId(e.target.value)} style={{...inp,background:'white'}}>
            <option value="">Салбар сонгоно уу</option>
            {branches.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
          <input type="password" value={pin} onChange={e=>{setPin(e.target.value);setError('');}} placeholder="PIN оруулна уу" onKeyDown={e=>e.key==='Enter'&&login(mode)} style={inp}/>
          {error&&<p style={{color:'#EF4444',fontSize:'0.85rem',textAlign:'center',margin:0}}>{error}</p>}
          <button onClick={()=>login(mode)} disabled={loading} style={{padding:'0.875rem',background:mode==='manager'?'#FF6B35':'#10B981',color:'white',border:'none',borderRadius:'14px',fontWeight:'700',cursor:'pointer',opacity:loading?0.6:1}}>
            {loading?'Нэвтрэж байна...':'Нэвтрэх'}
          </button>
          <button onClick={()=>{setMode('select');setError('');setPin('');}} style={{background:'none',border:'none',color:'#9CA3AF',cursor:'pointer'}}>← Буцах</button>
        </div>}
        {mode==='new'&&<div style={{display:'flex',flexDirection:'column',gap:'1rem'}}>
          <div style={{background:'#FFF7ED',borderRadius:'12px',padding:'0.6rem',textAlign:'center',fontWeight:'700',color:'#FF6B35'}}>✨ Шинэ салбар үүсгэх</div>
          <input value={newName} onChange={e=>setNewName(e.target.value)} placeholder="Салбарын нэр *" style={inp}/>
          <input value={newAddr} onChange={e=>setNewAddr(e.target.value)} placeholder="Хаяг (заавал биш)" style={inp}/>
          <input type="password" value={newPin} onChange={e=>setNewPin(e.target.value)} placeholder="Менежерийн PIN (4+ тоо) *" style={inp}/>
          {error&&<p style={{color:'#EF4444',fontSize:'0.85rem',textAlign:'center',margin:0}}>{error}</p>}
          <button onClick={handleCreate} disabled={loading} style={{padding:'0.875rem',background:'#FF6B35',color:'white',border:'none',borderRadius:'14px',fontWeight:'700',cursor:'pointer',opacity:loading?0.6:1}}>
            {loading?'Үүсгэж байна...':'✅ Салбар үүсгэх'}
          </button>
          <button onClick={()=>{setMode('select');setError('');}} style={{background:'none',border:'none',color:'#9CA3AF',cursor:'pointer'}}>← Буцах</button>
        </div>}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════
// CUSTOMER VIEW — dark style
// ════════════════════════════════════════════════════════
type CartItem={item:MenuItem;qty:number};
type CPhase='menu'|'tracking'|'survey'|'done';
const ST:Order['status'][]=['pending','preparing','ready','served'];
const D={bg:'#131316',card:'#1e1e24',border:'rgba(255,255,255,0.08)',text:'#ffffff',muted:'rgba(255,255,255,0.55)',accent:'#c9a96e',orange:'#FF6B35'};

function CustomerView({branchId,tableNum}:{branchId:string;tableNum:number}) {
  const [items,setItems]=useState<MenuItem[]>([]);
  const [cart,setCart]=useState<CartItem[]>([]);
  const [orders,setOrders]=useState<Order[]>([]);
  const [phase,setPhase]=useState<CPhase>('menu');
  const [phone,setPhone]=useState('');
  const [notes,setNotes]=useState('');
  const [survey,setSurvey]=useState({nps:0,csat:0,feedback:''});
  const [loading,setLoading]=useState(false);
  const [branchName,setBranchName]=useState('');
  const [activeCat,setActiveCat]=useState('');
  const [showCart,setShowCart]=useState(false);

  useEffect(()=>{
    getBranch(branchId).then(b=>b&&setBranchName(b.name));
    const u1=subscribeToMenu(branchId,it=>setItems(it.filter(i=>i.available)));
    const u2=subscribeToTableOrders(branchId,tableNum,setOrders);
    return()=>{u1();u2();};
  },[branchId,tableNum]);

  const cats=[...new Set(items.map(i=>i.category))];
  useEffect(()=>{if(cats.length&&!activeCat)setActiveCat(cats[0]);},[cats.length]);
  useEffect(()=>{
    if(phase==='tracking'&&orders.length>0&&orders.every(o=>o.status==='served')){
      const t=setTimeout(()=>setPhase('survey'),2000); return()=>clearTimeout(t);
    }
  },[orders,phase]);

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
    await createOrder(branchId,tableNum,cart.map(c=>({menuItemId:c.item.id,name:c.item.name,price:c.item.price,quantity:c.qty})),phone||undefined,notes||undefined);
    setCart([]);setShowCart(false);setLoading(false);setPhase('tracking');
  };
  const submitSurvey=async()=>{
    if(!survey.nps||!survey.csat) return;
    await createSurvey(branchId,{tableNumber:tableNum,nps:survey.nps,csat:survey.csat,feedback:survey.feedback,phone:phone||undefined});
    setPhase('done');
  };

  if(phase==='done') return(
    <div style={{minHeight:'100vh',background:D.bg,display:'flex',alignItems:'center',justifyContent:'center',flexDirection:'column',gap:'1rem',padding:'2rem',textAlign:'center'}}>
      <div style={{fontSize:'4rem'}}>🙏</div>
      <h2 style={{fontWeight:'800',color:D.text,margin:0}}>Баярлалаа!</h2>
      <p style={{color:D.muted,margin:0}}>Таны санал бидэнд маш чухал</p>
      <button onClick={()=>{setPhase('menu');setSurvey({nps:0,csat:0,feedback:''}); }} style={{marginTop:'1rem',padding:'0.875rem 2rem',background:D.orange,color:'white',border:'none',borderRadius:'14px',fontWeight:'700',cursor:'pointer'}}>➕ Дахин захиалах</button>
    </div>
  );

  if(phase==='survey') return(
    <div style={{minHeight:'100vh',background:D.bg,padding:'1.5rem'}}>
      <div style={{maxWidth:'480px',margin:'0 auto'}}>
        <div style={{textAlign:'center',padding:'1.5rem 0'}}><div style={{fontSize:'3rem'}}>⭐</div><h2 style={{fontWeight:'800',color:D.text,margin:'0.5rem 0 0.25rem'}}>Сэтгэл ханамжийн судалгаа</h2></div>
        <div style={{background:D.card,borderRadius:'16px',padding:'1.5rem',border:`1px solid ${D.border}`,display:'flex',flexDirection:'column',gap:'1.25rem'}}>
          <div>
            <p style={{fontWeight:'700',color:D.text,marginBottom:'0.75rem'}}>Ресторанг найздаа зөвлөх үү? (0-10)</p>
            <div style={{display:'flex',gap:'0.3rem',flexWrap:'wrap'}}>
              {Array.from({length:11},(_,i)=>(
                <button key={i} onClick={()=>setSurvey(s=>({...s,nps:i}))} style={{width:'38px',height:'38px',borderRadius:'8px',border:`1px solid ${survey.nps===i?D.accent:D.border}`,fontWeight:'700',cursor:'pointer',background:survey.nps===i?D.accent:'transparent',color:survey.nps===i?'#1a1a1e':D.muted}}>{i}</button>
              ))}
            </div>
          </div>
          <div>
            <p style={{fontWeight:'700',color:D.text,marginBottom:'0.5rem'}}>Үйлчилгээ хэдэн одтой?</p>
            <div style={{display:'flex',gap:'0.5rem'}}>{[1,2,3,4,5].map(n=><button key={n} onClick={()=>setSurvey(s=>({...s,csat:n}))} style={{fontSize:'2rem',background:'none',border:'none',cursor:'pointer',opacity:survey.csat>=n?1:0.2}}>⭐</button>)}</div>
          </div>
          <textarea value={survey.feedback} onChange={e=>setSurvey(s=>({...s,feedback:e.target.value}))} rows={3} placeholder="Санал, сэтгэгдэл..." style={{width:'100%',padding:'0.75rem',background:'rgba(255,255,255,0.05)',border:`1px solid ${D.border}`,borderRadius:'12px',fontSize:'0.9rem',outline:'none',resize:'none',color:D.text,boxSizing:'border-box'}}/>
          <input value={phone} onChange={e=>setPhone(e.target.value)} placeholder="☎ Утасны дугаар (заавал биш)" style={{padding:'0.75rem',background:'rgba(255,255,255,0.05)',border:`1px solid ${D.border}`,borderRadius:'12px',fontSize:'0.9rem',outline:'none',color:D.text}}/>
          <button onClick={submitSurvey} disabled={!survey.nps||!survey.csat} style={{padding:'1rem',background:D.accent,color:'#1a1a1e',border:'none',borderRadius:'12px',fontWeight:'800',cursor:'pointer',opacity:(!survey.nps||!survey.csat)?0.4:1}}>Илгээх</button>
        </div>
      </div>
    </div>
  );

  if(phase==='tracking') return(
    <div style={{minHeight:'100vh',background:D.bg,padding:'1.5rem'}}>
      <div style={{maxWidth:'480px',margin:'0 auto'}}>
        <div style={{textAlign:'center',padding:'1rem 0'}}><p style={{color:D.muted,margin:'0 0 0.25rem'}}>{branchName}</p><h2 style={{fontWeight:'800',color:D.text,margin:0}}>Ширээ {tableNum} · Захиалга</h2></div>
        {activeOrder&&<div style={{background:D.card,borderRadius:'16px',padding:'1.5rem',border:`1px solid ${D.border}`,marginBottom:'1rem'}}>
          <div style={{display:'flex',justifyContent:'space-between',marginBottom:'1.25rem',paddingBottom:'1rem',borderBottom:`1px solid ${D.border}`}}>
            {ST.map((s,i)=>{
              const done=i<=ST.indexOf(activeOrder.status);
              return<div key={s} style={{flex:1,textAlign:'center'}}>
                <div style={{width:'44px',height:'44px',borderRadius:'50%',background:done?ORDER_STATUS_COLORS[s]:'rgba(255,255,255,0.1)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'1.2rem',margin:'0 auto 0.4rem'}}>{done?['📋','👨‍🍳','✅','🛎️'][i]:'○'}</div>
                <p style={{fontSize:'0.62rem',color:done?ORDER_STATUS_COLORS[s]:D.muted,fontWeight:done?'700':'400',margin:0,lineHeight:1.2}}>
                  {['Хүлээж байна','Бэлтгэж байна','Бэлэн болсон','Хүргэгдсэн'][i]}
                </p>
              </div>;
            })}
          </div>
          {activeOrder.items.map((item,i)=><div key={i} style={{display:'flex',justifyContent:'space-between',padding:'0.3rem 0',fontSize:'0.9rem',color:D.text,borderBottom:`1px solid ${D.border}`}}><span>{item.name} × {item.quantity}</span><span style={{color:D.accent,fontWeight:'700'}}>{formatPrice(item.price*item.quantity)}</span></div>)}
          <div style={{display:'flex',justifyContent:'space-between',marginTop:'0.75rem',paddingTop:'0.75rem',borderTop:`1px solid ${D.border}`,fontWeight:'800'}}><span style={{color:D.text}}>Нийт</span><span style={{color:D.accent}}>{formatPrice(activeOrder.totalAmount)}</span></div>
        </div>}
        <button onClick={()=>setPhase('menu')} style={{width:'100%',padding:'1rem',background:D.orange,color:'white',border:'none',borderRadius:'14px',fontWeight:'700',cursor:'pointer'}}>➕ Нэмж захиалах</button>
      </div>
    </div>
  );

  return(
    <div style={{minHeight:'100vh',background:D.bg,paddingBottom:cnt>0?'90px':'2rem'}}>
      {/* Header */}
      <div style={{background:'#1a1e2a',borderBottom:`1px solid ${D.border}`,padding:'0.875rem 1.25rem',display:'flex',alignItems:'center',justifyContent:'space-between',position:'sticky',top:0,zIndex:30}}>
        <div>
          <h1 style={{color:D.text,fontWeight:'800',margin:0,fontSize:'1rem'}}>{branchName||'Ресторан'}</h1>
          <p style={{color:D.muted,margin:0,fontSize:'0.7rem'}}>Ширээ {tableNum}</p>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:'0.75rem'}}>
          {activeOrder&&<button onClick={()=>setPhase('tracking')} style={{background:'rgba(255,255,255,0.08)',border:`1px solid ${D.border}`,color:ORDER_STATUS_COLORS[activeOrder.status],borderRadius:'20px',padding:'0.3rem 0.75rem',fontSize:'0.72rem',cursor:'pointer',fontWeight:'700'}}>● {ORDER_STATUS_LABELS[activeOrder.status]}</button>}
          <button onClick={()=>setShowCart(true)} style={{background:'rgba(255,255,255,0.08)',border:`1px solid ${D.border}`,borderRadius:'10px',padding:'0.4rem 0.75rem',color:D.text,cursor:'pointer',fontWeight:'600',fontSize:'0.82rem',display:'flex',alignItems:'center',gap:'0.4rem'}}>
            🛒 {cnt>0&&<span style={{background:D.orange,color:'white',borderRadius:'50%',width:'18px',height:'18px',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'0.7rem',fontWeight:'800'}}>{cnt}</span>}
          </button>
        </div>
      </div>
      {/* Hero */}
      <div style={{textAlign:'center',padding:'1.25rem 1rem 0.75rem'}}>
        <h2 style={{fontFamily:'Georgia,serif',fontSize:'2.2rem',fontStyle:'italic',color:D.accent,margin:0,fontWeight:'400'}}>Меню</h2>
      </div>
      {/* Category tabs */}
      <div style={{padding:'0 1rem 1rem',display:'flex',gap:'0.5rem',overflowX:'auto'}}>
        {cats.map(cat=>(
          <button key={cat} onClick={()=>setActiveCat(cat)} style={{padding:'0.45rem 1.1rem',borderRadius:'6px',border:`1.5px solid ${activeCat===cat?D.accent:D.border}`,cursor:'pointer',whiteSpace:'nowrap',fontWeight:'700',fontSize:'0.78rem',letterSpacing:'0.04em',background:activeCat===cat?D.accent:'transparent',color:activeCat===cat?'#1a1a1e':D.muted,textTransform:'uppercase' as const,transition:'all 0.15s'}}>{cat}</button>
        ))}
      </div>
      {/* Menu list */}
      <div style={{padding:'0 1rem'}}>
        {items.filter(i=>i.category===activeCat).map(item=>{
          const q=qty(item.id);
          return(
            <div key={item.id} style={{borderBottom:`1px solid ${D.border}`,paddingBottom:'1.5rem',marginBottom:'1.5rem'}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'0.25rem'}}>
                <h3 style={{color:D.text,fontWeight:'700',fontSize:'1rem',margin:0,flex:1,paddingRight:'1rem',lineHeight:1.3}}>{item.name}</h3>
                <span style={{color:D.text,fontWeight:'700',fontSize:'0.9rem',flexShrink:0}}>₮ {item.price.toLocaleString('mn-MN')}</span>
              </div>
              {item.description&&<p style={{color:D.muted,fontSize:'0.82rem',margin:'0 0 0.5rem',lineHeight:1.5}}>{item.description}</p>}
              {(item as any).allergens&&<p style={{color:'rgba(239,68,68,0.7)',fontSize:'0.72rem',margin:'0 0 0.75rem'}}>🌶️ {(item as any).allergens}</p>}
              {item.image&&<div style={{borderRadius:'12px',overflow:'hidden',marginBottom:'0.75rem',maxHeight:'220px'}}><img src={item.image} alt={item.name} style={{width:'100%',height:'220px',objectFit:'cover',display:'block'}} onError={e=>{(e.target as HTMLImageElement).parentElement!.style.display='none';}}/></div>}
              {q===0
                ?<button onClick={()=>chg(item,1)} style={{padding:'0.5rem 1.25rem',border:`1.5px solid ${D.accent}`,borderRadius:'6px',color:D.accent,background:'transparent',fontWeight:'700',cursor:'pointer',fontSize:'0.82rem',letterSpacing:'0.03em'}} onMouseOver={e=>{e.currentTarget.style.background=D.accent;e.currentTarget.style.color='#1a1a1e';}} onMouseOut={e=>{e.currentTarget.style.background='transparent';e.currentTarget.style.color=D.accent;}}>+ Сагсанд нэмэх</button>
                :<div style={{display:'flex',alignItems:'center',gap:'0.75rem'}}>
                  <button onClick={()=>chg(item,-1)} style={{width:'32px',height:'32px',border:`1px solid ${D.border}`,borderRadius:'6px',background:'transparent',color:D.text,fontWeight:'700',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'1.1rem'}}>−</button>
                  <span style={{color:D.accent,fontWeight:'800',minWidth:'24px',textAlign:'center',fontSize:'1rem'}}>{q}</span>
                  <button onClick={()=>chg(item,1)} style={{width:'32px',height:'32px',border:'none',borderRadius:'6px',background:D.accent,color:'#1a1a1e',fontWeight:'700',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'1.1rem'}}>+</button>
                </div>
              }
            </div>
          );
        })}
      </div>
      {/* Float cart */}
      {cnt>0&&<div style={{position:'fixed',bottom:0,left:0,right:0,padding:'1rem',background:`linear-gradient(to top,${D.bg} 70%,transparent)`,zIndex:40}}>
        <button onClick={()=>setShowCart(true)} style={{width:'100%',padding:'1rem 1.5rem',background:D.orange,color:'white',border:'none',borderRadius:'14px',fontWeight:'800',fontSize:'1rem',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'space-between',boxShadow:'0 8px 30px rgba(255,107,53,0.35)'}}>
          <span style={{background:'rgba(255,255,255,0.2)',borderRadius:'50%',width:'28px',height:'28px',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:'800',fontSize:'0.85rem'}}>{cnt}</span>
          <span>Захиалга харах</span>
          <span>{formatPrice(total)}</span>
        </button>
      </div>}
      {/* Cart sheet */}
      {showCart&&<div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.7)',zIndex:50,display:'flex',alignItems:'flex-end'}} onClick={()=>setShowCart(false)}>
        <div style={{background:D.card,borderRadius:'20px 20px 0 0',padding:'1.5rem',width:'100%',maxHeight:'85vh',overflowY:'auto',border:`1px solid ${D.border}`,borderBottom:'none'}} onClick={e=>e.stopPropagation()}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'1.25rem'}}>
            <h3 style={{margin:0,fontWeight:'800',color:D.text,fontSize:'1.1rem'}}>🛒 Сагс · Ширээ {tableNum}</h3>
            <button onClick={()=>setShowCart(false)} style={{background:'rgba(255,255,255,0.08)',border:'none',color:D.muted,width:'32px',height:'32px',borderRadius:'50%',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>✕</button>
          </div>
          {cart.length===0?<p style={{textAlign:'center',color:D.muted,padding:'2rem 0'}}>Сагс хоосон байна</p>:<>
            {cart.map((c,i)=><div key={i} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'0.75rem 0',borderBottom:`1px solid ${D.border}`}}>
              <div><p style={{margin:0,fontWeight:'700',color:D.text,fontSize:'0.9rem'}}>{c.item.name}</p><p style={{margin:0,fontSize:'0.78rem',color:D.muted}}>{formatPrice(c.item.price)} × {c.qty}</p></div>
              <div style={{display:'flex',alignItems:'center',gap:'0.5rem'}}>
                <button onClick={()=>chg(c.item,-1)} style={{width:'28px',height:'28px',borderRadius:'6px',border:`1px solid ${D.border}`,background:'transparent',color:D.text,cursor:'pointer',fontWeight:'700',display:'flex',alignItems:'center',justifyContent:'center'}}>−</button>
                <span style={{fontWeight:'700',color:D.accent,minWidth:'20px',textAlign:'center'}}>{c.qty}</span>
                <button onClick={()=>chg(c.item,1)} style={{width:'28px',height:'28px',borderRadius:'6px',border:'none',background:D.accent,color:'#1a1a1e',cursor:'pointer',fontWeight:'700',display:'flex',alignItems:'center',justifyContent:'center'}}>+</button>
              </div>
            </div>)}
            <div style={{display:'flex',justifyContent:'space-between',marginTop:'1rem',paddingTop:'1rem',borderTop:`1px solid ${D.border}`,fontWeight:'800',fontSize:'1.1rem'}}><span style={{color:D.text}}>Нийт</span><span style={{color:D.accent}}>{formatPrice(total)}</span></div>
            <div style={{marginTop:'1rem',display:'flex',flexDirection:'column',gap:'0.75rem'}}>
              <input value={phone} onChange={e=>setPhone(e.target.value)} placeholder="☎ Утасны дугаар" style={{padding:'0.75rem',background:'rgba(255,255,255,0.05)',border:`1px solid ${D.border}`,borderRadius:'12px',fontSize:'0.9rem',outline:'none',color:D.text}}/>
              <textarea value={notes} onChange={e=>setNotes(e.target.value)} placeholder="📝 Нэмэлт тайлбар..." rows={2} style={{padding:'0.75rem',background:'rgba(255,255,255,0.05)',border:`1px solid ${D.border}`,borderRadius:'12px',fontSize:'0.9rem',outline:'none',color:D.text,resize:'none'}}/>
              <button onClick={placeOrder} disabled={loading} style={{padding:'1rem',background:D.orange,color:'white',border:'none',borderRadius:'14px',fontWeight:'800',cursor:'pointer',opacity:loading?0.7:1,fontSize:'1rem'}}>{loading?'Илгээж байна...':'✅ Захиалах'}</button>
            </div>
          </>}
        </div>
      </div>}
    </div>
  );
}

// ════════════════════════════════════════════════════════
// MENU ITEM FORM MODAL
// ════════════════════════════════════════════════════════
type MenuFormData = { id?:string; name:string; category:string; price:string; description:string; allergens:string; available:boolean; image:string; };
const EMPTY_FORM:MenuFormData={name:'',category:'',price:'',description:'',allergens:'',available:true,image:''};

function MenuItemModal({branchId,initial,onClose}:{branchId:string;initial:MenuFormData;onClose:()=>void}) {
  const [form,setForm]=useState<MenuFormData>(initial);
  const [preview,setPreview]=useState(initial.image||'');
  const [uploading,setUploading]=useState(false);
  const [error,setError]=useState('');
  const fileRef=useRef<HTMLInputElement>(null);

  const handleFile=async(e:React.ChangeEvent<HTMLInputElement>)=>{
    const file=e.target.files?.[0]; if(!file) return;
    setUploading(true);
    try{
      const b64=await compressImage(file,700,0.78);
      setPreview(b64); setForm(f=>({...f,image:b64}));
    }catch{ setError('Зураг уншихад алдаа гарлаа'); }
    setUploading(false);
  };

  const handleSave=async()=>{
    if(!form.name.trim()) return setError('Нэр оруулна уу');
    if(!form.category.trim()) return setError('Ангилал оруулна уу');
    if(!form.price||isNaN(Number(form.price))||Number(form.price)<=0) return setError('Үнэ оруулна уу');
    setUploading(true);
    try{
      await saveMenuItem(branchId,{
        name:form.name.trim(), category:form.category.trim(),
        price:Number(form.price), description:form.description.trim(),
        allergens:form.allergens.trim(), image:form.image, available:form.available,
      }, form.id);
      onClose();
    }catch{ setError('Хадгалахад алдаа гарлаа'); setUploading(false); }
  };

  const inp:React.CSSProperties={padding:'0.7rem 0.875rem',border:'2px solid #E7E5E4',borderRadius:'10px',fontSize:'0.875rem',outline:'none',width:'100%',boxSizing:'border-box'};
  const lbl:React.CSSProperties={display:'block',fontWeight:'700',color:'#44403C',marginBottom:'0.35rem',fontSize:'0.8rem'};

  return(
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.55)',zIndex:100,display:'flex',alignItems:'flex-end'}} onClick={onClose}>
      <div style={{background:'white',borderRadius:'20px 20px 0 0',padding:'1.5rem',width:'100%',maxHeight:'92vh',overflowY:'auto'}} onClick={e=>e.stopPropagation()}>
        {/* Header */}
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'1.25rem'}}>
          <h3 style={{fontWeight:'800',color:'#1C1917',margin:0,fontSize:'1.1rem'}}>{form.id?'✏️ Хоол засах':'➕ Шинэ хоол нэмэх'}</h3>
          <button onClick={onClose} style={{background:'#F5F5F4',border:'none',width:'34px',height:'34px',borderRadius:'50%',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'1rem',color:'#78716C'}}>✕</button>
        </div>

        {/* Image upload */}
        <div style={{marginBottom:'1rem'}}>
          <label style={lbl}>🖼️ Хоолны зураг</label>
          {preview
            ?<div style={{position:'relative',borderRadius:'14px',overflow:'hidden',height:'200px',marginBottom:'0.5rem'}}>
               <img src={preview} alt="" style={{width:'100%',height:'100%',objectFit:'cover',display:'block'}}/>
               <button onClick={()=>{setPreview('');setForm(f=>({...f,image:''}));}} style={{position:'absolute',top:'8px',right:'8px',background:'rgba(0,0,0,0.6)',border:'none',color:'white',borderRadius:'20px',padding:'0.3rem 0.75rem',cursor:'pointer',fontSize:'0.78rem',fontWeight:'700'}}>✕ Устгах</button>
             </div>
            :<div onClick={()=>fileRef.current?.click()}
               style={{height:'90px',border:'2px dashed #E7E5E4',borderRadius:'14px',display:'flex',flexDirection:'row',alignItems:'center',justifyContent:'center',cursor:'pointer',background:'#FAFAFA',marginBottom:'0.5rem',gap:'0.75rem'}}
               onMouseOver={e=>{e.currentTarget.style.borderColor='#FF6B35';e.currentTarget.style.background='#FFF7ED';}} onMouseOut={e=>{e.currentTarget.style.borderColor='#E7E5E4';e.currentTarget.style.background='#FAFAFA';}}>
               <span style={{fontSize:'2rem'}}>{uploading?'⏳':'📷'}</span>
               <div><p style={{margin:0,fontWeight:'700',color:'#44403C',fontSize:'0.875rem'}}>{uploading?'Боловсруулж байна...':'Зураг оруулах'}</p><p style={{margin:0,fontSize:'0.75rem',color:'#9CA3AF'}}>JPG, PNG · Автоматаар жижигрэнэ</p></div>
             </div>}
          <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} style={{display:'none'}}/>
          {!preview&&<button onClick={()=>fileRef.current?.click()} style={{padding:'0.5rem 1rem',border:'1.5px solid #E7E5E4',borderRadius:'10px',background:'transparent',color:'#78716C',cursor:'pointer',fontWeight:'600',fontSize:'0.8rem'}}>📁 Файл сонгох</button>}
        </div>

        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0.75rem',marginBottom:'0.75rem'}}>
          <div style={{gridColumn:'1/-1'}}>
            <label style={lbl}>Хоолны нэр *</label>
            <input value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="Жишээ: Цуйван" style={inp}/>
          </div>
          <div>
            <label style={lbl}>Ангилал *</label>
            <input value={form.category} onChange={e=>setForm(f=>({...f,category:e.target.value}))} placeholder="Үндсэн хоол" style={inp}/>
          </div>
          <div>
            <label style={lbl}>Үнэ (₮) *</label>
            <input type="number" value={form.price} onChange={e=>setForm(f=>({...f,price:e.target.value}))} placeholder="12000" style={inp}/>
          </div>
          <div style={{gridColumn:'1/-1'}}>
            <label style={lbl}>Тайлбар</label>
            <textarea value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))} rows={2} placeholder="Хоолны товч тайлбар..." style={{...inp,resize:'none'}}/>
          </div>
          <div style={{gridColumn:'1/-1'}}>
            <label style={lbl}>Орц / дархлааны харших найрлага</label>
            <input value={form.allergens} onChange={e=>setForm(f=>({...f,allergens:e.target.value}))} placeholder="Gluten, Dairy, Eggs..." style={inp}/>
          </div>
          <div style={{gridColumn:'1/-1',display:'flex',alignItems:'center',gap:'0.75rem',padding:'0.75rem',background:'#F9F9F9',borderRadius:'10px'}}>
            <label style={{position:'relative',display:'inline-block',width:'42px',height:'24px',cursor:'pointer'}}>
              <input type="checkbox" checked={form.available} onChange={e=>setForm(f=>({...f,available:e.target.checked}))} style={{opacity:0,width:0,height:0}}/>
              <span style={{position:'absolute',inset:0,background:form.available?'#FF6B35':'#E7E5E4',borderRadius:'12px',transition:'0.2s'}}/>
              <span style={{position:'absolute',left:form.available?'20px':'2px',top:'2px',width:'20px',height:'20px',background:'white',borderRadius:'50%',transition:'0.2s',boxShadow:'0 1px 3px rgba(0,0,0,0.2)'}}/>
            </label>
            <span style={{fontWeight:'600',color:'#44403C',fontSize:'0.875rem'}}>Цэсэнд харагдах</span>
          </div>
        </div>

        {error&&<p style={{color:'#EF4444',fontSize:'0.85rem',textAlign:'center',margin:'0 0 1rem',background:'#FEF2F2',padding:'0.5rem',borderRadius:'8px'}}>{error}</p>}
        <div style={{display:'flex',gap:'0.75rem'}}>
          <button onClick={onClose} style={{flex:1,padding:'0.875rem',border:'2px solid #E7E5E4',borderRadius:'12px',background:'white',color:'#44403C',fontWeight:'700',cursor:'pointer'}}>Болих</button>
          <button onClick={handleSave} disabled={uploading} style={{flex:2,padding:'0.875rem',background:'#FF6B35',color:'white',border:'none',borderRadius:'12px',fontWeight:'800',cursor:'pointer',opacity:uploading?0.7:1,fontSize:'0.95rem'}}>
            {uploading?'Хадгалж байна...':'✅ Хадгалах'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════
// MANAGER PANEL
// ════════════════════════════════════════════════════════
type ManagerTab='tables'|'orders'|'csat'|'complaints'|'staff'|'menu';

function ManagerPanel({branchId,onLogout}:{branchId:string;onLogout:()=>void}) {
  const [tab,setTab]=useState<ManagerTab>('menu');
  const [tables,setTablesState]=useState<Table[]>([]);
  const [orders,setOrders]=useState<Order[]>([]);
  const [surveys,setSurveys]=useState<Survey[]>([]);
  const [staffList,setStaffList]=useState<Staff[]>([]);
  const [menuItems,setMenuItems]=useState<MenuItem[]>([]);
  const [branchName,setBranchName]=useState('');
  const [tableCount,setTableCount]=useState('5');
  const [loading,setLoading]=useState(false);
  const [showQR,setShowQR]=useState<number|null>(null);
  const [newStaffName,setNewStaffName]=useState('');
  const [newStaffRole,setNewStaffRole]=useState<'chef'|'waiter'>('chef');
  const [newStaffPin,setNewStaffPin]=useState('');
  const [resolveNote,setResolveNote]=useState<Record<string,string>>({});
  const [menuModal,setMenuModal]=useState<MenuFormData|null>(null);
  const [deleteTarget,setDeleteTarget]=useState<string|null>(null);

  useEffect(()=>{
    getBranch(branchId).then(b=>b&&setBranchName(b.name));
    getStaff(branchId).then(setStaffList);
    const u1=subscribeToTables(branchId,t=>{setTablesState(t);setTableCount(String(t.length||5));});
    const u2=subscribeToOrders(branchId,setOrders);
    const u3=subscribeToSurveys(branchId,setSurveys);
    const u4=subscribeToMenu(branchId,setMenuItems);
    return()=>{u1();u2();u3();u4();};
  },[branchId]);

  const npsArr=surveys.map(s=>s.nps);
  const npsScore=npsArr.length?Math.round(((npsArr.filter(n=>n>=9).length-npsArr.filter(n=>n<=6).length)/npsArr.length)*100):null;
  const avgCsat=surveys.length?(surveys.reduce((s,x)=>s+x.csat,0)/surveys.length).toFixed(1):null;
  const pendingCount=orders.filter(o=>o.status==='pending').length;
  const pendingComplaints=surveys.filter(s=>!s.resolved&&(s.phone||s.feedback)).length;

  const TABS:{id:ManagerTab;label:string}[]=[
    {id:'menu',label:'🍽️ Цэс'},
    {id:'tables',label:'🪑 Ширээ'},
    {id:'orders',label:`📋 Захиалга${pendingCount>0?` (${pendingCount})`:''}`},
    {id:'csat',label:'📊 CSAT'},
    {id:'complaints',label:`💬 Гомдол${pendingComplaints>0?` (${pendingComplaints})`:''}`},
    {id:'staff',label:'👥 Ажилтан'},
  ];

  const inp:React.CSSProperties={padding:'0.75rem 1rem',border:'2px solid #E7E5E4',borderRadius:'12px',fontSize:'0.9rem',outline:'none',width:'100%',boxSizing:'border-box'};
  const card:React.CSSProperties={background:'white',borderRadius:'16px',padding:'1.25rem',boxShadow:'0 2px 12px rgba(0,0,0,0.05)',marginBottom:'0.75rem'};

  return(
    <div style={{minHeight:'100vh',background:'#FFF7ED'}}>
      {/* Header */}
      <div style={{background:'linear-gradient(135deg,#FF6B35,#F7931E)',padding:'1rem 1.25rem',display:'flex',justifyContent:'space-between',alignItems:'center',position:'sticky',top:0,zIndex:20}}>
        <div><p style={{color:'rgba(255,255,255,0.8)',fontSize:'0.75rem',margin:0}}>👔 Менежер</p><h1 style={{color:'white',fontWeight:'800',margin:0,fontSize:'1.1rem'}}>{branchName}</h1></div>
        <button onClick={onLogout} style={{background:'rgba(255,255,255,0.2)',border:'none',color:'white',borderRadius:'10px',padding:'0.5rem 1rem',cursor:'pointer',fontWeight:'600'}}>Гарах</button>
      </div>

      {/* Stats */}
      <div style={{display:'flex',gap:'0.5rem',padding:'0.75rem',overflowX:'auto'}}>
        {[{label:'Шинэ захиалга',value:pendingCount,color:'#F59E0B'},{label:'NPS',value:npsScore!==null?`${npsScore>0?'+':''}${npsScore}`:'–',color:'#10B981'},{label:'CSAT',value:avgCsat?`${avgCsat}★`:'–',color:'#6366F1'},{label:'Гомдол',value:pendingComplaints,color:'#EF4444'}].map(s=>(
          <div key={s.label} style={{background:'white',borderRadius:'14px',padding:'0.875rem 1.1rem',textAlign:'center',minWidth:'80px',boxShadow:'0 2px 8px rgba(0,0,0,0.05)',flexShrink:0}}>
            <p style={{fontSize:'1.4rem',fontWeight:'800',color:s.color,margin:'0 0 0.1rem'}}>{s.value}</p>
            <p style={{fontSize:'0.65rem',color:'#78716C',margin:0}}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{background:'white',display:'flex',overflowX:'auto',borderBottom:'2px solid #F5F5F4',position:'sticky',top:'62px',zIndex:10}}>
        {TABS.map(t=><button key={t.id} onClick={()=>setTab(t.id)} style={{padding:'0.875rem 1rem',border:'none',borderBottom:`3px solid ${tab===t.id?'#FF6B35':'transparent'}`,background:'none',color:tab===t.id?'#FF6B35':'#78716C',fontWeight:tab===t.id?'700':'500',cursor:'pointer',whiteSpace:'nowrap',fontSize:'0.82rem',transition:'all 0.2s'}}>{t.label}</button>)}
      </div>

      <div style={{padding:'0.75rem',maxWidth:'720px',margin:'0 auto'}}>

        {/* ── MENU TAB ── */}
        {tab==='menu'&&<>
          <button onClick={()=>setMenuModal({...EMPTY_FORM})} style={{width:'100%',padding:'0.875rem',background:'#FF6B35',color:'white',border:'none',borderRadius:'14px',fontWeight:'800',cursor:'pointer',fontSize:'0.95rem',marginBottom:'1rem',display:'flex',alignItems:'center',justifyContent:'center',gap:'0.5rem'}}>
            ➕ Шинэ хоол нэмэх
          </button>
          {menuItems.length===0&&<div style={{textAlign:'center',padding:'3rem',color:'#78716C'}}><div style={{fontSize:'3rem'}}>🍽️</div><p>Хоол байхгүй байна</p></div>}
          {menuItems.map(item=>(
            <div key={item.id} style={{...card,display:'flex',gap:'0.875rem',alignItems:'flex-start'}}>
              {/* Thumbnail */}
              <div style={{width:'70px',height:'70px',borderRadius:'12px',overflow:'hidden',flexShrink:0,background:item.available?'#FFF7ED':'#F5F5F4',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'2rem'}}>
                {item.image?<img src={item.image} alt={item.name} style={{width:'100%',height:'100%',objectFit:'cover'}} onError={e=>{(e.target as HTMLImageElement).style.display='none';}}/>:'🍽️'}
              </div>
              {/* Info */}
              <div style={{flex:1,minWidth:0}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'0.2rem'}}>
                  <p style={{fontWeight:'800',color:'#1C1917',margin:0,fontSize:'0.9rem'}}>{item.name}</p>
                  <span style={{fontWeight:'800',color:'#FF6B35',fontSize:'0.9rem',flexShrink:0,marginLeft:'0.5rem'}}>{formatPrice(item.price)}</span>
                </div>
                <p style={{color:'#78716C',fontSize:'0.75rem',margin:'0 0 0.15rem'}}>{item.category}</p>
                {item.description&&<p style={{color:'#9CA3AF',fontSize:'0.72rem',margin:'0 0 0.35rem',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{item.description}</p>}
                <div style={{display:'flex',alignItems:'center',gap:'0.5rem'}}>
                  <span style={{fontSize:'0.7rem',padding:'0.15rem 0.5rem',borderRadius:'20px',fontWeight:'700',background:item.available?'#DCFCE7':'#F5F5F4',color:item.available?'#16A34A':'#9CA3AF'}}>
                    {item.available?'● Харагдаж байна':'○ Нуусан'}
                  </span>
                </div>
              </div>
              {/* Actions */}
              <div style={{display:'flex',flexDirection:'column',gap:'0.4rem',flexShrink:0}}>
                <button onClick={()=>setMenuModal({id:item.id,name:item.name,category:item.category,price:String(item.price),description:item.description||'',allergens:(item as any).allergens||'',available:item.available,image:item.image||''})}
                  style={{padding:'0.35rem 0.75rem',background:'#EEF2FF',border:'none',borderRadius:'8px',color:'#6366F1',cursor:'pointer',fontWeight:'700',fontSize:'0.78rem'}}>✏️ Засах</button>
                <button onClick={()=>setDeleteTarget(item.id||null)}
                  style={{padding:'0.35rem 0.75rem',background:'#FEE2E2',border:'none',borderRadius:'8px',color:'#EF4444',cursor:'pointer',fontWeight:'700',fontSize:'0.78rem'}}>🗑️ Устгах</button>
              </div>
            </div>
          ))}
        </>}

        {/* ── TABLES TAB ── */}
        {tab==='tables'&&<>
          <div style={card}>
            <p style={{fontWeight:'700',color:'#1C1917',marginBottom:'0.75rem'}}>Ширээний тоо тохируулах</p>
            <div style={{display:'flex',gap:'0.5rem'}}>
              <input type="number" value={tableCount} onChange={e=>setTableCount(e.target.value)} min="1" max="200" style={{...inp,flex:1,width:'auto'}}/>
              <button onClick={async()=>{const n=parseInt(tableCount);if(!n)return;setLoading(true);await setTablesDB(branchId,n);setLoading(false);}} disabled={loading} style={{padding:'0.75rem 1.25rem',background:'#FF6B35',color:'white',border:'none',borderRadius:'12px',fontWeight:'700',cursor:'pointer'}}>{loading?'...':'Хадгалах'}</button>
            </div>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))',gap:'0.75rem'}}>
            {tables.map(t=>(
              <div key={t.id} style={{background:'white',borderRadius:'16px',padding:'1rem',boxShadow:'0 2px 8px rgba(0,0,0,0.05)',borderTop:`4px solid ${t.status==='occupied'?'#EF4444':'#10B981'}`}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'0.75rem'}}>
                  <span style={{fontWeight:'800',color:'#1C1917'}}>Ширээ {t.number}</span>
                  <span style={{fontSize:'0.7rem',padding:'0.2rem 0.5rem',borderRadius:'20px',fontWeight:'700',background:t.status==='occupied'?'#FEE2E2':'#DCFCE7',color:t.status==='occupied'?'#EF4444':'#16A34A'}}>{t.status==='occupied'?'Дүүрэн':'Сул'}</span>
                </div>
                <button onClick={()=>setShowQR(showQR===t.number?null:t.number)} style={{width:'100%',padding:'0.5rem',border:'2px solid #FF6B35',borderRadius:'10px',color:'#FF6B35',background:'transparent',fontWeight:'700',cursor:'pointer',fontSize:'0.8rem'}}>{showQR===t.number?'✕ Хаах':'📱 QR'}</button>
                {showQR===t.number&&<div style={{marginTop:'0.75rem',textAlign:'center'}}>
                  <img src={buildQR(branchId,t.number)} alt="" style={{width:'100%',borderRadius:'8px'}}/>
                  <div style={{display:'flex',gap:'0.5rem',marginTop:'0.5rem',justifyContent:'center'}}>
                    <a href={buildLink(branchId,t.number)} target="_blank" rel="noreferrer" style={{fontSize:'0.75rem',color:'#FF6B35',textDecoration:'none',fontWeight:'600'}}>↗ Нээх</a>
                    <button onClick={()=>{const w=window.open('','_blank');if(w){w.document.write(`<html><body style="text-align:center;font-family:sans-serif;padding:30px"><h2 style="color:#FF6B35">Ширээ ${t.number}</h2><img src="${buildQR(branchId,t.number)}" style="width:200px"><br><p style="font-size:11px">${buildLink(branchId,t.number)}</p><script>window.print()<\/script></body></html>`);w.document.close();}}} style={{fontSize:'0.75rem',background:'#F5F5F4',border:'none',borderRadius:'8px',padding:'0.25rem 0.5rem',cursor:'pointer'}}>🖨️ Хэвлэх</button>
                  </div>
                </div>}
              </div>
            ))}
          </div>
        </>}

        {/* ── ORDERS TAB ── */}
        {tab==='orders'&&<>
          {!orders.length&&<div style={{textAlign:'center',padding:'3rem',color:'#78716C'}}><div style={{fontSize:'3rem'}}>📋</div><p>Захиалга байхгүй</p></div>}
          {orders.map(o=>(
            <div key={o.id} style={{...card,borderLeft:`4px solid ${ORDER_STATUS_COLORS[o.status]}`}}>
              <div style={{display:'flex',justifyContent:'space-between',marginBottom:'0.5rem'}}>
                <span style={{fontWeight:'800',color:'#1C1917'}}>Ширээ {o.tableNumber}</span>
                <span style={{fontSize:'0.75rem',padding:'0.25rem 0.65rem',borderRadius:'20px',fontWeight:'700',background:ORDER_STATUS_COLORS[o.status]+'20',color:ORDER_STATUS_COLORS[o.status]}}>{ORDER_STATUS_LABELS[o.status]}</span>
              </div>
              {o.items.map((item,i)=><div key={i} style={{display:'flex',justifyContent:'space-between',fontSize:'0.875rem',color:'#78716C',padding:'0.2rem 0'}}><span>{item.name} × {item.quantity}</span><span>{formatPrice(item.price*item.quantity)}</span></div>)}
              {o.notes&&<p style={{margin:'0.5rem 0 0',fontSize:'0.8rem',color:'#D97706',background:'#FFFBEB',padding:'0.4rem 0.6rem',borderRadius:'8px'}}>📝 {o.notes}</p>}
              <div style={{display:'flex',justifyContent:'space-between',marginTop:'0.5rem',paddingTop:'0.5rem',borderTop:'1px solid #F5F5F4'}}>
                <span style={{fontSize:'0.75rem',color:'#9CA3AF'}}>{formatTime(o.createdAt)}{o.customerPhone&&` · ☎ ${o.customerPhone}`}</span>
                <span style={{fontWeight:'800',color:'#FF6B35'}}>{formatPrice(o.totalAmount)}</span>
              </div>
            </div>
          ))}
        </>}

        {/* ── CSAT TAB ── */}
        {tab==='csat'&&<>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0.75rem',marginBottom:'1rem'}}>
            {[{label:'NPS оноо',value:npsScore!==null?`${npsScore>0?'+':''}${npsScore}`:'–',color:npsScore!==null&&npsScore>=0?'#10B981':'#EF4444',bg:'#ECFDF5'},{label:'CSAT дундаж',value:avgCsat?`${avgCsat}/5`:'–',color:'#6366F1',bg:'#EEF2FF'},{label:'Нийт хариулт',value:String(surveys.length),color:'#1C1917',bg:'#F5F5F4'},{label:'Шийдвэрлэгдсэн',value:String(surveys.filter(s=>s.resolved).length),color:'#10B981',bg:'#ECFDF5'}].map(c=>(
              <div key={c.label} style={{background:c.bg,borderRadius:'16px',padding:'1.25rem',textAlign:'center'}}>
                <p style={{fontSize:'2rem',fontWeight:'800',color:c.color,margin:'0 0 0.25rem'}}>{c.value}</p>
                <p style={{fontSize:'0.75rem',color:'#78716C',margin:0}}>{c.label}</p>
              </div>
            ))}
          </div>
          {surveys.filter(s=>s.feedback).map(s=><div key={s.id} style={card}><div style={{display:'flex',justifyContent:'space-between',marginBottom:'0.4rem'}}><span style={{fontSize:'0.75rem',color:'#9CA3AF'}}>{formatDate(s.createdAt)} · Ширээ {s.tableNumber}</span><span>{'⭐'.repeat(s.csat)}</span></div><p style={{margin:0,color:'#44403C',fontSize:'0.9rem'}}>{s.feedback}</p></div>)}
          {!surveys.filter(s=>s.feedback).length&&<div style={{textAlign:'center',padding:'3rem',color:'#78716C'}}><div style={{fontSize:'3rem'}}>📊</div><p>Сэтгэгдэл байхгүй</p></div>}
        </>}

        {/* ── COMPLAINTS TAB ── */}
        {tab==='complaints'&&<>
          {!surveys.filter(s=>s.phone||s.feedback).length&&<div style={{textAlign:'center',padding:'3rem',color:'#78716C'}}><div style={{fontSize:'3rem'}}>💬</div><p>Гомдол байхгүй</p></div>}
          {surveys.filter(s=>s.phone||s.feedback).map(s=>(
            <div key={s.id} style={{...card,borderLeft:`4px solid ${s.resolved?'#10B981':'#F59E0B'}`}}>
              <div style={{display:'flex',justifyContent:'space-between',marginBottom:'0.5rem'}}>
                <div><p style={{fontWeight:'800',color:'#1C1917',margin:'0 0 0.15rem'}}>{s.phone||'Дугаар байхгүй'}</p><p style={{fontSize:'0.75rem',color:'#9CA3AF',margin:0}}>{formatDate(s.createdAt)} · Ширээ {s.tableNumber}</p></div>
                <div style={{display:'flex',gap:'0.35rem'}}><span style={{fontSize:'0.7rem',padding:'0.2rem 0.5rem',background:'#F5F5F4',borderRadius:'8px'}}>NPS {s.nps}</span><span style={{fontSize:'0.7rem',padding:'0.2rem 0.5rem',background:'#F5F5F4',borderRadius:'8px'}}>⭐{s.csat}</span></div>
              </div>
              {s.feedback&&<p style={{background:'#FFF7ED',padding:'0.6rem 0.75rem',borderRadius:'10px',fontSize:'0.875rem',color:'#44403C',margin:'0 0 0.75rem'}}>{s.feedback}</p>}
              {!s.resolved&&<input value={resolveNote[s.id]||''} onChange={e=>setResolveNote(n=>({...n,[s.id]:e.target.value}))} placeholder="Шийдвэрлэлтийн тэмдэглэл..." style={{...inp,marginBottom:'0.5rem',fontSize:'0.82rem',padding:'0.55rem 0.75rem'}}/>}
              <button onClick={()=>setSurveyResolved(branchId,s.id,!s.resolved,resolveNote[s.id])} style={{padding:'0.5rem 1rem',border:'none',borderRadius:'10px',cursor:'pointer',fontWeight:'700',fontSize:'0.85rem',background:s.resolved?'#DCFCE7':'#FEF3C7',color:s.resolved?'#16A34A':'#D97706'}}>{s.resolved?'✅ Шийдэгдсэн':'🔴 Шийдвэрлэсэн болгох'}</button>
            </div>
          ))}
        </>}

        {/* ── STAFF TAB ── */}
        {tab==='staff'&&<>
          <div style={card}>
            <p style={{fontWeight:'700',color:'#1C1917',marginBottom:'0.75rem'}}>Ажилтан нэмэх</p>
            <div style={{display:'flex',flexDirection:'column',gap:'0.75rem'}}>
              <input value={newStaffName} onChange={e=>setNewStaffName(e.target.value)} placeholder="Нэр" style={inp}/>
              <select value={newStaffRole} onChange={e=>setNewStaffRole(e.target.value as any)} style={{...inp,background:'white'}}><option value="chef">👨‍🍳 Тогооч</option><option value="waiter">🛎️ Зөөгч</option></select>
              <input value={newStaffPin} onChange={e=>setNewStaffPin(e.target.value)} type="password" placeholder="PIN" style={inp}/>
              <button onClick={async()=>{if(!newStaffName||!newStaffPin)return;await addStaff(branchId,newStaffName,newStaffRole,newStaffPin);getStaff(branchId).then(setStaffList);setNewStaffName('');setNewStaffPin('');}} style={{padding:'0.875rem',background:'#FF6B35',color:'white',border:'none',borderRadius:'12px',fontWeight:'700',cursor:'pointer'}}>➕ Нэмэх</button>
            </div>
          </div>
          {staffList.map(s=><div key={s.id} style={{...card,display:'flex',alignItems:'center',justifyContent:'space-between'}}>
            <div style={{display:'flex',alignItems:'center',gap:'0.75rem'}}>
              <div style={{width:'42px',height:'42px',borderRadius:'50%',background:s.role==='chef'?'#FFF7ED':'#ECFDF5',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'1.4rem'}}>{s.role==='chef'?'👨‍🍳':'🛎️'}</div>
              <div><p style={{fontWeight:'700',color:'#1C1917',margin:0}}>{s.name}</p><p style={{fontSize:'0.75rem',color:'#78716C',margin:0}}>{s.role==='chef'?'Тогооч':'Зөөгч'}</p></div>
            </div>
            <button onClick={async()=>{await removeStaff(branchId,s.id);getStaff(branchId).then(setStaffList);}} style={{background:'#FEE2E2',border:'none',color:'#EF4444',borderRadius:'8px',padding:'0.4rem 0.75rem',cursor:'pointer',fontWeight:'600',fontSize:'0.8rem'}}>Устгах</button>
          </div>)}
          {!staffList.length&&<p style={{textAlign:'center',color:'#9CA3AF',padding:'2rem'}}>Ажилтан байхгүй</p>}
        </>}
      </div>

      {/* Menu Item Modal */}
      {menuModal&&<MenuItemModal branchId={branchId} initial={menuModal} onClose={()=>setMenuModal(null)}/>}

      {/* Delete confirm */}
      {deleteTarget&&<div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',zIndex:100,display:'flex',alignItems:'center',justifyContent:'center',padding:'1rem'}}>
        <div style={{background:'white',borderRadius:'20px',padding:'1.5rem',maxWidth:'320px',width:'100%',textAlign:'center'}}>
          <div style={{fontSize:'2.5rem',marginBottom:'0.75rem'}}>🗑️</div>
          <p style={{fontWeight:'800',color:'#1C1917',margin:'0 0 0.5rem',fontSize:'1rem'}}>Устгах уу?</p>
          <p style={{color:'#78716C',fontSize:'0.875rem',margin:'0 0 1.25rem'}}>Энэ үйлдлийг буцаах боломжгүй.</p>
          <div style={{display:'flex',gap:'0.75rem'}}>
            <button onClick={()=>setDeleteTarget(null)} style={{flex:1,padding:'0.75rem',border:'2px solid #E7E5E4',borderRadius:'12px',background:'white',color:'#44403C',fontWeight:'700',cursor:'pointer'}}>Болих</button>
            <button onClick={async()=>{if(deleteTarget){await deleteMenuItem(branchId,deleteTarget);}setDeleteTarget(null);}} style={{flex:1,padding:'0.75rem',background:'#EF4444',color:'white',border:'none',borderRadius:'12px',fontWeight:'800',cursor:'pointer'}}>Устгах</button>
          </div>
        </div>
      </div>}
    </div>
  );
}

// ════════════════════════════════════════════════════════
// KITCHEN PANEL
// ════════════════════════════════════════════════════════
function KitchenPanel({branchId,staff,onLogout}:{branchId:string;staff:Staff;onLogout:()=>void}) {
  const [orders,setOrders]=useState<Order[]>([]);
  const [filter,setFilter]=useState<Order['status']|'all'>('all');
  useEffect(()=>subscribeToOrders(branchId,setOrders),[branchId]);
  const NEXT:Partial<Record<Order['status'],Order['status']>>={pending:'preparing',preparing:'ready',ready:'served'};
  const NEXT_LABEL:Partial<Record<Order['status'],string>>={pending:'👨‍🍳 Бэлтгэж эхлэх',preparing:'✅ Бэлэн боллоо',ready:'🛎️ Хүргэгдсэн'};
  const NEXT_COLOR:Partial<Record<Order['status'],string>>={pending:'#3B82F6',preparing:'#10B981',ready:'#8B5CF6'};
  const counts={pending:orders.filter(o=>o.status==='pending').length,preparing:orders.filter(o=>o.status==='preparing').length,ready:orders.filter(o=>o.status==='ready').length};
  const active=filter==='all'?orders.filter(o=>o.status!=='served'):orders.filter(o=>o.status===filter);
  return(
    <div style={{minHeight:'100vh',background:'#F8FAFC'}}>
      <div style={{background:staff.role==='chef'?'linear-gradient(135deg,#1E3A5F,#2D5A8E)':'linear-gradient(135deg,#064E3B,#065F46)',padding:'1rem 1.25rem',display:'flex',justifyContent:'space-between',alignItems:'center',position:'sticky',top:0,zIndex:20}}>
        <div><p style={{color:'rgba(255,255,255,0.7)',fontSize:'0.75rem',margin:0}}>{staff.role==='chef'?'👨‍🍳 Тогооч':'🛎️ Зөөгч'}</p><h1 style={{color:'white',fontWeight:'800',margin:0,fontSize:'1.1rem'}}>{staff.name}</h1></div>
        <div style={{display:'flex',alignItems:'center',gap:'0.75rem'}}>
          {counts.pending>0&&<div style={{background:'#F59E0B',color:'white',borderRadius:'20px',padding:'0.3rem 0.8rem',fontSize:'0.8rem',fontWeight:'800'}}>🔔 {counts.pending} шинэ</div>}
          <button onClick={onLogout} style={{background:'rgba(255,255,255,0.15)',border:'none',color:'white',borderRadius:'10px',padding:'0.5rem 1rem',cursor:'pointer',fontWeight:'600'}}>Гарах</button>
        </div>
      </div>
      <div style={{background:'white',display:'flex',gap:'0.5rem',padding:'0.75rem 1rem',overflowX:'auto',borderBottom:'1px solid #E7E5E4',position:'sticky',top:'58px',zIndex:10}}>
        {[{id:'all' as const,label:'Бүгд',color:'#FF6B35'},{id:'pending' as const,label:`🟡 Шинэ${counts.pending?` (${counts.pending})`:''}`,color:'#F59E0B'},{id:'preparing' as const,label:`🔵 Бэлтгэж${counts.preparing?` (${counts.preparing})`:''}`,color:'#3B82F6'},{id:'ready' as const,label:`🟢 Бэлэн${counts.ready?` (${counts.ready})`:''}`,color:'#10B981'}].map(f=>(
          <button key={f.id} onClick={()=>setFilter(f.id)} style={{padding:'0.5rem 1rem',border:'none',borderRadius:'20px',cursor:'pointer',whiteSpace:'nowrap',fontWeight:'700',fontSize:'0.82rem',background:filter===f.id?f.color:'#F5F5F4',color:filter===f.id?'white':'#78716C',transition:'all 0.2s'}}>{f.label}</button>
        ))}
      </div>
      <div style={{padding:'0.75rem',display:'flex',flexDirection:'column',gap:'0.75rem',maxWidth:'720px',margin:'0 auto'}}>
        {!active.length&&<div style={{textAlign:'center',padding:'4rem 2rem',color:'#78716C'}}><div style={{fontSize:'4rem',marginBottom:'0.75rem'}}>🎉</div><p style={{fontWeight:'700'}}>Захиалга байхгүй</p></div>}
        {active.map(order=>(
          <div key={order.id} style={{background:'white',borderRadius:'20px',overflow:'hidden',boxShadow:'0 4px 16px rgba(0,0,0,0.07)',borderTop:`5px solid ${ORDER_STATUS_COLORS[order.status]}`}}>
            <div style={{padding:'1rem 1.25rem',display:'flex',justifyContent:'space-between',alignItems:'center',borderBottom:'1px solid #F5F5F4'}}>
              <div style={{display:'flex',alignItems:'baseline',gap:'0.5rem'}}><span style={{fontSize:'2.5rem',fontWeight:'900',color:'#1C1917',lineHeight:1}}>{order.tableNumber}</span><span style={{color:'#78716C',fontWeight:'600'}}>ширээ</span></div>
              <div style={{textAlign:'right'}}><div style={{fontSize:'0.75rem',padding:'0.25rem 0.75rem',borderRadius:'20px',fontWeight:'700',background:ORDER_STATUS_COLORS[order.status]+'20',color:ORDER_STATUS_COLORS[order.status]}}>{ORDER_STATUS_LABELS[order.status]}</div><p style={{fontSize:'0.72rem',color:'#9CA3AF',margin:'0.25rem 0 0'}}>{formatTime(order.createdAt)}</p></div>
            </div>
            <div style={{padding:'1rem 1.25rem'}}>
              {order.items.map((item,i)=><div key={i} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'0.4rem 0',borderBottom:i<order.items.length-1?'1px dashed #F5F5F4':'none'}}><span style={{fontWeight:'700',color:'#1C1917',fontSize:'0.95rem'}}>{item.name}</span><span style={{background:'#F5F5F4',borderRadius:'20px',padding:'0.2rem 0.75rem',fontWeight:'800',color:'#44403C'}}>×{item.quantity}</span></div>)}
              {order.notes&&<div style={{marginTop:'0.75rem',background:'#FFFBEB',border:'1px solid #FDE68A',borderRadius:'10px',padding:'0.5rem 0.75rem'}}><p style={{margin:0,fontSize:'0.85rem',color:'#D97706',fontWeight:'600'}}>📝 {order.notes}</p></div>}
              {order.customerPhone&&<p style={{margin:'0.5rem 0 0',fontSize:'0.78rem',color:'#9CA3AF'}}>☎ {order.customerPhone}</p>}
            </div>
            {NEXT[order.status]&&<div style={{padding:'0 1.25rem 1.25rem'}}><button onClick={()=>updateOrderStatus(branchId,order.id,NEXT[order.status]!)} style={{width:'100%',padding:'0.875rem',background:NEXT_COLOR[order.status],color:'white',border:'none',borderRadius:'14px',fontWeight:'800',cursor:'pointer',fontSize:'0.95rem'}}>{NEXT_LABEL[order.status]}</button></div>}
          </div>
        ))}
      </div>
    </div>
  );
}
