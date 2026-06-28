import { useState, useEffect, useRef, useMemo, Component, Fragment } from 'react';
import type { ReactNode, CSSProperties, ChangeEvent } from 'react';
import * as XLSX from 'xlsx';
import {
  Branch, Table, Order, Survey, Staff, MenuItem, Category,
  getAllBranches, subscribeToBranches, subscribeToBranchesByLicenseKey, createSubBranch,
  createBranch, getBranch, verifyManagerPin, verifyStaffPin,
  setTables as setTablesDB, subscribeToTables,
  subscribeToOrders, subscribeToTableOrders, createOrder, updateOrderStatus,
  subscribeToSurveys, createSurvey, setSurveyResolved,
  subscribeToMenu, addMenuItem, saveMenuItem, updateMenuItem, deleteMenuItem, compressImage,
  subscribeToCategories, saveCategory, updateCategory, deleteCategory,
  getStaff, addStaff, removeStaff, updateStaff, subscribeToStaff,
  getSettings, saveSettings, saveSurveyQuestions, subscribeToSettings,
  logActivity, subscribeToLogs, ActivityLog,
  getBranchLicenseStatus, LicenseCheck, getLicense, License, subscribeToLicense,
  getSalesReport,
  formatPrice, formatTime, formatDate,
  ORDER_STATUS_LABELS, ORDER_STATUS_COLORS,
} from './lib/db';

type SalesData = { totalRevenue:number; orderCount:number; avgOrder:number; products:{name:string;qty:number;revenue:number}[]; dailyRevenue:{date:string;revenue:number}[] };
type AdminTab = 'dashboard'|'complaints'|'menu'|'categories'|'staff'|'orders'|'settings'|'sales'|'logs'|'multibranch';
type KFilter = 'all'|'pending'|'preparing'|'ready'|'served';
type CartItem = { item:MenuItem; qty:number };

const C = { bg:'#0d0d12', sidebar:'#111117', card:'#1a1a22', border:'rgba(255,255,255,0.08)', yellow:'#F5C120', orange:'#E87B2F', green:'#2ECC71', red:'#E74C3C', text:'#ffffff', muted:'rgba(255,255,255,0.5)', inpBg:'rgba(255,255,255,0.06)' };
const IS: Record<string,any> = { padding:'0.65rem 0.875rem', border:`1px solid rgba(255,255,255,0.08)`, borderRadius:'8px', fontSize:'0.875rem', outline:'none', background:'#1e1e2c', color:'#fff', width:'100%', boxSizing:'border-box', colorScheme:'dark' as any };
const CS: Record<string,any> = { background:'#1a1a22', borderRadius:'14px', padding:'1.25rem', border:'1px solid rgba(255,255,255,0.08)', marginBottom:'0.75rem' };
const LS: Record<string,any> = { color:'rgba(255,255,255,0.45)', fontSize:'0.7rem', letterSpacing:'0.05em', textTransform:'uppercase' as const, display:'block', marginBottom:'0.3rem' };

const getQR = () => { const p=new URLSearchParams(window.location.search); return {b:p.get('b')||'',t:Number(p.get('t'))||0,staff:p.get('staff')||'',kds:p.get('kds')||''}; };
const buildQR = (bId:string,t:number) => `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(window.location.origin+window.location.pathname+'?b='+bId+'&t='+t)}`;
const buildLink = (bId:string,t:number) => `${window.location.origin}${window.location.pathname}?b=${bId}&t=${t}`;

const SEED: Omit<MenuItem,'id'>[] = [
  {name:'Цуйван',description:'Гурилтай шарсан мах',price:12000,category:'Үндсэн хоол',image:'',available:true,allergens:'Гурил'},
  {name:'Хуушуур',description:'4 ширхэг',price:8000,category:'Үндсэн хоол',image:'',available:true},
  {name:'Банштай шөл',description:'Уламжлалт',price:9000,category:'Шөл',image:'',available:true},
  {name:'Кофе',description:'Эспрессо',price:4500,category:'Ундаа',image:'',available:true},
];
const SEED_CATS = ['Үндсэн хоол','Шөл','Ундаа'];
const DEF_Q = ['Хоолны амт, чанар хэр байсан бэ?','Рестораны орчин тойрон, цэвэр байдал','Үйлчилгээний ажилтан хандлага','Хоолны үнэ өртөг чанартаа нийцэж байна уу?','Нийт сэтгэл ханамж'];

const KEYS = ['foodQuality','ambiance','staffAttitude','priceValue','service'] as const;
type SK = typeof KEYS[number];


function Toggle({on,onChange}:{on:boolean;onChange:(v:boolean)=>void}) {
  return <button onClick={()=>onChange(!on)} style={{width:'44px',height:'24px',borderRadius:'12px',border:'none',cursor:'pointer',position:'relative',background:on?C.green:'rgba(255,255,255,0.15)',transition:'background 0.2s',padding:0,flexShrink:0}}>
    <span style={{position:'absolute',top:'2px',left:on?'22px':'2px',width:'20px',height:'20px',borderRadius:'50%',background:'white',transition:'left 0.2s',boxShadow:'0 1px 3px rgba(0,0,0,0.3)'}}/>
  </button>;
}

function CSelect({value,onChange,options,placeholder,style}:{value:string;onChange:(v:string)=>void;options:{value:string;label:string}[];placeholder:string;style?:Record<string,any>}) {
  const [open,setOpen]=useState(false);
  const ref=useRef<HTMLDivElement>(null);
  useEffect(()=>{const h=(e:MouseEvent)=>{if(ref.current&&!ref.current.contains(e.target as Node))setOpen(false);};document.addEventListener('mousedown',h);return()=>document.removeEventListener('mousedown',h);},[]);
  const sel=options.find(o=>o.value===value);
  return <div ref={ref} style={{position:'relative',...style}}>
    <div onClick={()=>setOpen(!open)} style={{padding:'0.65rem 0.875rem',background:'#1e1e2c',border:`1px solid ${open?C.yellow:C.border}`,borderRadius:'8px',cursor:'pointer',color:value?'#fff':'rgba(255,255,255,0.4)',display:'flex',justifyContent:'space-between',alignItems:'center',fontSize:'0.875rem',userSelect:'none' as const,colorScheme:'dark' as any}}>
      <span>{sel?sel.label:placeholder}</span>
      <span style={{color:C.muted,fontSize:'0.65rem',display:'inline-block',transform:open?'rotate(180deg)':'none',transition:'transform 0.2s'}}>▼</span>
    </div>
    {open&&<div style={{position:'absolute',top:'calc(100% + 4px)',left:0,right:0,background:'#1e1e2c',border:`1px solid ${C.yellow}44`,borderRadius:'8px',zIndex:9999,overflow:'hidden',boxShadow:'0 8px 24px rgba(0,0,0,0.5)'}}>
      {options.map(opt=><div key={opt.value} onClick={()=>{onChange(opt.value);setOpen(false);}} style={{padding:'0.65rem 0.875rem',cursor:'pointer',color:opt.value===value?C.yellow:'rgba(255,255,255,0.85)',background:opt.value===value?`${C.yellow}18`:'transparent',fontSize:'0.875rem',borderBottom:'1px solid rgba(255,255,255,0.04)'}} onMouseOver={e=>{if(opt.value!==value)e.currentTarget.style.background='rgba(255,255,255,0.06)';}} onMouseOut={e=>{e.currentTarget.style.background=opt.value===value?`${C.yellow}18`:'transparent';}}>{opt.label}</div>)}
    </div>}
  </div>;
}

// ════════════════════════════════════════════════════════════
// ERROR BOUNDARY - catches runtime errors and shows them
// ════════════════════════════════════════════════════════════
interface EBState { error: string|null }
class ErrorBoundary extends Component<{children:ReactNode},EBState> {
  state: EBState = {error:null};
  static getDerivedStateFromError(e:Error): EBState {return{error:e.message+'\n'+e.stack};}
  componentDidCatch(e:Error,info:any){console.error('App Error:',e,info);}
  render(){
    const {error}=this.state;
    if(error){
      return(
        <div style={{minHeight:'100vh',background:'#0d0d12',display:'flex',alignItems:'center',justifyContent:'center',padding:'2rem'}}>
          <div style={{background:'#1a1a22',borderRadius:'16px',padding:'2rem',maxWidth:'700px',width:'100%',border:'1px solid rgba(231,76,60,0.4)'}}>
            <h2 style={{color:'#E74C3C',margin:'0 0 1rem',fontSize:'1.1rem'}}>🚨 Runtime Error — надад screenshot илгээнэ үү</h2>
            <pre style={{color:'rgba(255,255,255,0.8)',fontSize:'0.75rem',background:'rgba(0,0,0,0.4)',padding:'1rem',borderRadius:'8px',overflow:'auto',maxHeight:'400px',whiteSpace:'pre-wrap',wordBreak:'break-all'}}>
              {error}
            </pre>
            <button onClick={()=>window.location.reload()} style={{marginTop:'1rem',padding:'0.6rem 1.5rem',background:'#E87B2F',color:'white',border:'none',borderRadius:'8px',cursor:'pointer',fontWeight:'700'}}>
              🔄 Дахин ачаалах
            </button>
          </div>
        </div>
      );
    }
    // @ts-ignore
    return this.props.children;
  }
}

function AppInner() {
  const [view,setView]=useState<'landing'|'customer'|'admin'>('landing');
  const [branchId,setBranchId]=useState('');
  const [tableNum,setTableNum]=useState(0);
  const [isManager,setIsManager]=useState(false);
  const [staff,setStaff]=useState<Staff|null>(null);
  const [license,setLicense]=useState<LicenseCheck|null>(null);
  const [isOnline,setIsOnline]=useState(navigator.onLine);

  useEffect(()=>{
    const p=getQR();
    if(p.b&&p.t){setBranchId(p.b);setTableNum(p.t);setView('customer');}
    else if(p.b&&(p.staff||p.kds)){setBranchId(p.b);setView('admin');}
    else if(p.b){setBranchId(p.b);setTableNum(1);setView('customer');}
    const goOn=()=>setIsOnline(true);
    const goOff=()=>setIsOnline(false);
    window.addEventListener('online',goOn);
    window.addEventListener('offline',goOff);
    return()=>{window.removeEventListener('online',goOn);window.removeEventListener('offline',goOff);};
  },[]);
  const logout=()=>{setView('landing');setBranchId('');setIsManager(false);setStaff(null);setLicense(null);};
  const goAdmin=(id:string,isMan:boolean,s:Staff|null)=>{
    if(isMan){setIsManager(true);}else{setStaff(s);}
    setBranchId(id);setView('admin');
    getBranchLicenseStatus(id).then(setLicense);
  };
  return(<>
    {!isOnline&&<div style={{position:'fixed',top:0,left:0,right:0,zIndex:9999,background:'#E74C3C',color:'white',textAlign:'center',padding:'0.4rem 1rem',fontSize:'0.78rem',fontWeight:'700',display:'flex',alignItems:'center',justifyContent:'center',gap:'0.5rem'}}>
      <span>📵</span><span>Интернэтгүй — офлайн горим</span>
    </div>}
    {view==='landing'&&<LandingView onManager={id=>goAdmin(id,true,null)} onStaff={(id,s)=>goAdmin(id,false,s)}/>}
    {view==='customer'&&<CustomerView branchId={branchId} tableNum={tableNum}/>}
    {view==='admin'&&<AdminPanel branchId={branchId} isManager={isManager} staff={staff} license={license} onLogout={logout}/>}
  </>);
}

function LandingView({onManager,onStaff}:{onManager:(id:string)=>void;onStaff:(id:string,s:Staff)=>void}) {
  type LMode='select'|'mgr-lic'|'mgr-branches'|'staff-lic'|'staff-branches'|'staff-pin';
  const MGR_LIC_LS='res_mgr_license_key';
  const STF_LIC_LS='res_staff_license_key';

  const [mode,setMode]=useState<LMode>('select');
  const [error,setError]=useState('');
  const [loading,setLoading]=useState(false);
  const resetErr=()=>setError('');

  // Manager
  const [mgrLicInput,setMgrLicInput]=useState('');
  const [mgrLicKey,setMgrLicKey]=useState('');
  const [mgrBranches,setMgrBranches]=useState<Branch[]>([]);
  const [mgrBranchId,setMgrBranchId]=useState('');
  const [mgrPin,setMgrPin]=useState('');

  // Staff — same pattern as manager
  const [staffLicInput,setStaffLicInput]=useState('');
  const [staffLicKey,setStaffLicKey]=useState('');
  const [staffBranches,setStaffBranches]=useState<Branch[]>([]); // only THIS license's branches
  const [staffBranchId,setStaffBranchId]=useState('');
  const [staffBranchName,setStaffBranchName]=useState('');
  const [staffPin,setStaffPin]=useState('');

  // All branches + loaded flag
  const [allBranches,setAllBranches]=useState<Branch[]>([]);
  const [branchesLoaded,setBranchesLoaded]=useState(false);
  const [branchesError,setBranchesError]=useState(false);

  useEffect(()=>{
    const sub=subscribeToBranches((data)=>{setAllBranches(data);setBranchesLoaded(true);});
    const savedMgr=localStorage.getItem(MGR_LIC_LS)||'';
    if(savedMgr)setMgrLicKey(savedMgr);
    const savedStf=localStorage.getItem(STF_LIC_LS)||'';
    if(savedStf)setStaffLicKey(savedStf);
    return sub;
  },[]);

  // Manager: filter branches by licenseKey when key+branches ready
  useEffect(()=>{
    if(!mgrLicKey||!branchesLoaded)return;
    const filtered=allBranches.filter(b=>(b as any).licenseKey===mgrLicKey);
    setMgrBranches(filtered);
    if(filtered.length===1)setMgrBranchId(filtered[0].id);
  },[mgrLicKey,allBranches,branchesLoaded]);

  // Staff: when returning with saved key, reload filtered branches
  useEffect(()=>{
    if(!staffLicKey||!branchesLoaded)return;
    const byKey=allBranches.filter(b=>{
      const k=((b as any).licenseKey||'').trim().toUpperCase();
      return k===staffLicKey;
    });
    const active=byKey.filter(b=>(b as any).active!==false&&!(b as any).deletedAt);
    setStaffBranches(active);
  },[staffLicKey,allBranches,branchesLoaded]);

  // ── Manager login ──
  const goManager=async()=>{
    resetErr();setMgrPin('');setMgrBranchId('');
    if(mgrLicKey){
      try{
        const lic=await getLicense(mgrLicKey);
        if(!lic||lic.status==='blocked'){
          setMgrLicKey('');try{localStorage.removeItem(MGR_LIC_LS);}catch{}
          setError('⛔ Лиценц хаагдсан');setMode('mgr-lic');return;
        }
        const exp=lic.expiresAt||(lic as any).endDate||0;
        if(exp&&exp<Date.now()){
          setMgrLicKey('');try{localStorage.removeItem(MGR_LIC_LS);}catch{}
          setError('🔴 Лицензийн хугацаа дууссан');setMode('mgr-lic');return;
        }
      }catch{}
      setMode('mgr-branches');
    }else{setMgrLicInput('');setMode('mgr-lic');}
  };
  const verifyMgr=async()=>{
    const code=mgrLicInput.trim().toUpperCase();
    if(!code)return setError('Лиценцийн код оруулна уу');
    setLoading(true);resetErr();
    try{
      const lic=await getLicense(code);
      if(!lic){setError('Лиценцийн код олдсонгүй');setLoading(false);return;}
      if(lic.status==='blocked'){setError('⛔ Лиценц хаагдсан');setLoading(false);return;}
      const exp=lic.expiresAt||(lic as any).endDate||0;
      if(exp&&exp<Date.now()){setError('🔴 Лицензийн хугацаа дууссан');setLoading(false);return;}
      setMgrLicKey(code);
      try{localStorage.setItem(MGR_LIC_LS,code);}catch{}
      setMode('mgr-branches');
    }catch{setError('Алдаа гарлаа');}
    setLoading(false);
  };
  const loginManager=async()=>{
    if(!mgrBranchId)return setError('Салбар сонгоно уу');
    if(!mgrPin)return setError('PIN оруулна уу');
    setLoading(true);resetErr();
    const ok=await verifyManagerPin(mgrBranchId,mgrPin);
    setLoading(false);
    if(!ok)return setError('PIN буруу');
    onManager(mgrBranchId);
  };

  // ── Staff login ──
  const goStaff=()=>{resetErr();setStaffPin('');setStaffBranchId('');setStaffBranchName('');if(staffLicKey)setMode('staff-branches');else{setStaffLicInput('');setMode('staff-lic');}};
  const verifyStaff=async()=>{
    const code=staffLicInput.trim().toUpperCase();
    if(!code)return setError('Лиценцийн код оруулна уу');
    if(!branchesLoaded){setError('Ачааллаж байна...');return;}
    setLoading(true);resetErr();
    try{
      const lic=await getLicense(code);
      if(!lic){setError('Лиценцийн код олдсонгүй');setLoading(false);return;}
      if(lic.status==='blocked'){setError('⛔ Лиценц хаагдсан');setLoading(false);return;}
      const exp=lic.expiresAt||(lic as any).endDate||0;
      if(exp&&exp<Date.now()){setError('🔴 Лицензийн хугацаа дууссан');setLoading(false);return;}

      // Зөвхөн ЭНЭХҮҮ лиценцийн салбаруудыг шүүнэ (менежертэй адил)
      const byKey=allBranches.filter(b=>{
        const k=((b as any).licenseKey||'').trim().toUpperCase();
        return k===code;
      });
      // Үндсэн салбарыг нэмнэ (licenseKey тохируулаагүй хуучин branch-ийн үед)
      const mainBr=lic.branchId?allBranches.find(b=>b.id===lic.branchId):null;
      const seen=new Set<string>();
      const merged:Branch[]=[];
      [mainBr,...byKey].forEach(b=>{if(b&&!seen.has(b.id)){seen.add(b.id);merged.push(b);}});

      // Зөвхөн идэвхтэй салбар
      const active=merged.filter(b=>(b as any).active!==false&&!(b as any).deletedAt);

      setStaffBranches(active);
      setStaffLicKey(code);
      try{localStorage.setItem(STF_LIC_LS,code);}catch{}
      setMode('staff-branches');
    }catch{setError('Алдаа гарлаа');}
    setLoading(false);
  };
  const loginStaff=async()=>{
    if(!staffBranchId)return setError('Салбар сонгоно уу');
    if(!staffPin.trim())return setError('PIN оруулна уу');
    setLoading(true);resetErr();
    const s=await verifyStaffPin(staffBranchId,staffPin);
    setLoading(false);
    if(!s)return setError('PIN буруу');
    if((s as any).active===false)return setError('Таны эрх идэвхгүй байна');
    onStaff(staffBranchId,s);
  };
  const resetStaffLic=()=>{setStaffLicKey('');setStaffLicInput('');try{localStorage.removeItem(STF_LIC_LS);}catch{}};

  // ── Shared UI styles ──
  const cardStyle:CSSProperties={width:'100%',maxWidth:'420px',background:C.card,borderRadius:'24px',padding:'2rem 1.5rem',border:`1px solid ${C.border}`,display:'flex',flexDirection:'column',gap:'0.875rem',overflow:'hidden',boxSizing:'border-box'};
  const BT=(p:{label:string;icon:string;sub:string;onClick:()=>void})=>(
    <button onClick={p.onClick} style={{padding:'1rem',background:'rgba(255,255,255,0.04)',border:`1px solid ${C.border}`,borderRadius:'14px',cursor:'pointer',textAlign:'left' as const,display:'flex',alignItems:'center',gap:'0.875rem'}}>
      <span style={{fontSize:'1.6rem'}}>{p.icon}</span>
      <div><p style={{color:C.text,fontWeight:'700',margin:'0 0 0.1rem'}}>{p.label}</p><p style={{color:C.muted,fontSize:'0.75rem',margin:0}}>{p.sub}</p></div>
    </button>
  );

  return(
    <div style={{minHeight:'100vh',background:C.bg,display:'flex',alignItems:'center',justifyContent:'center',padding:'1rem',overflowX:'hidden',boxSizing:'border-box' as const}}>
      <div style={{...cardStyle,width:'calc(100% - 0px)',maxWidth:'420px'}}>

        {/* Logo */}
        <div style={{textAlign:'center' as const,marginBottom:'0.5rem'}}>
          <div style={{fontSize:'2.5rem',marginBottom:'0.5rem'}}>🍽️</div>
          <h1 style={{color:C.yellow,fontWeight:'900',fontSize:'1.5rem',letterSpacing:'0.05em',margin:'0 0 0.2rem'}}>РЕСТОРАН СИСТЕМ</h1>
          <p style={{color:C.muted,fontSize:'0.8rem',margin:0}}>Нэвтрэх эрхээ сонгоно уу</p>
          <p style={{color:'rgba(255,255,255,0.15)',fontSize:'0.62rem',margin:0}}>v2.1 — staff-branches</p>
        </div>

        {/* ── SELECT ── */}
        {mode==='select'&&<>
          <button onClick={goStaff} style={{padding:'1rem',background:`${C.green}11`,border:`1px solid ${C.green}33`,borderRadius:'14px',cursor:'pointer',textAlign:'left' as const,display:'flex',alignItems:'center',gap:'0.875rem'}}>
            <span style={{fontSize:'1.6rem'}}>👨‍🍳</span>
            <div><p style={{color:C.text,fontWeight:'700',margin:'0 0 0.1rem'}}>Тогооч / Зөөгч</p><p style={{color:C.muted,fontSize:'0.75rem',margin:0}}>PIN кодоор нэвтрэх</p></div>
          </button>
          <button onClick={goManager} style={{padding:'1rem',background:`${C.orange}11`,border:`1px solid ${C.orange}33`,borderRadius:'14px',cursor:'pointer',textAlign:'left' as const,display:'flex',alignItems:'center',gap:'0.875rem'}}>
            <span style={{fontSize:'1.6rem'}}>👔</span>
            <div><p style={{color:C.text,fontWeight:'700',margin:'0 0 0.1rem'}}>Менежер</p><p style={{color:C.muted,fontSize:'0.75rem',margin:0}}>Удирдлагын самбар</p></div>
          </button>
        </>}

        {/* ── MANAGER: License code ── */}
        {mode==='mgr-lic'&&<>
          <div style={{background:`${C.orange}11`,border:`1px solid ${C.orange}33`,borderRadius:'12px',padding:'0.875rem',textAlign:'center' as const}}>
            <p style={{color:C.orange,fontWeight:'800',margin:'0 0 0.15rem'}}>👔 Менежер нэвтрэлт</p>
            <p style={{color:C.muted,fontSize:'0.75rem',margin:0}}>Лиценцийн кодоо оруулна уу</p>
          </div>
          <input value={mgrLicInput} onChange={e=>{setMgrLicInput(e.target.value.toUpperCase().replace(/[^A-Z0-9\-]/g,''));resetErr();}}
            onKeyDown={e=>e.key==='Enter'&&verifyMgr()} placeholder="RES-XXXX-XXXX"
            style={{...IS,letterSpacing:'0.12em',fontFamily:'monospace',fontSize:'1.1rem',textAlign:'center' as const}} autoFocus/>
          {error&&<p style={{color:C.red,fontSize:'0.82rem',textAlign:'center' as const,margin:0}}>{error}</p>}
          <button onClick={verifyMgr} disabled={loading||mgrLicInput.length<8}
            style={{padding:'0.875rem',background:C.orange,color:'white',border:'none',borderRadius:'14px',fontWeight:'700',cursor:'pointer',opacity:(loading||mgrLicInput.length<8)?0.6:1}}>
            {loading?'Шалгаж байна...':'✅ Шалгах'}
          </button>
          <button onClick={()=>{setMode('select');resetErr();}} style={{background:'none',border:'none',color:C.muted,cursor:'pointer',fontSize:'0.82rem'}}>← Буцах</button>
        </>}

        {/* ── MANAGER: Branch + PIN ── */}
        {mode==='mgr-branches'&&<>
          <div style={{background:`${C.orange}11`,border:`1px solid ${C.orange}33`,borderRadius:'12px',padding:'0.75rem',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <div><p style={{color:C.orange,fontWeight:'800',fontSize:'0.82rem',margin:'0 0 0.1rem'}}>👔 Менежер</p><p style={{color:C.muted,fontSize:'0.72rem',margin:0}}>{mgrLicKey}</p></div>
            <button onClick={()=>{setMgrLicKey('');try{localStorage.removeItem(MGR_LIC_LS);}catch{}setMode('mgr-lic');resetErr();}} style={{background:'none',border:`1px solid ${C.border}`,borderRadius:'6px',color:C.muted,cursor:'pointer',fontSize:'0.7rem',padding:'0.2rem 0.5rem'}}>Код өөрчлөх</button>
          </div>
          {!branchesLoaded&&<p style={{color:C.muted,textAlign:'center' as const,fontSize:'0.8rem'}}>⏳ Салбар ачааллаж байна...</p>}
          {branchesLoaded&&mgrBranches.length===0&&<p style={{textAlign:'center' as const,color:C.red,fontSize:'0.82rem'}}>Тухайн лиценцтэй салбар олдсонгүй</p>}
          {mgrBranches.length>0&&<>
            <CSelect
              value={mgrBranchId}
              onChange={v=>{setMgrBranchId(v);setMgrPin('');resetErr();}}
              placeholder="— Салбар сонгоно уу —"
              options={mgrBranches.filter(b=>(b as any).active!==false&&!(b as any).deletedAt).map(b=>({value:b.id,label:b.name}))}
            />
            {mgrBranchId&&<>
              <input type="password" value={mgrPin} onChange={e=>{setMgrPin(e.target.value);resetErr();}}
                onKeyDown={e=>e.key==='Enter'&&mgrPin&&loginManager()} placeholder="Менежерийн PIN"
                style={{...IS,textAlign:'center' as const,letterSpacing:'0.2em'}} autoFocus inputMode="numeric"/>
              {error&&<p style={{color:C.red,fontSize:'0.82rem',textAlign:'center' as const,margin:0}}>{error}</p>}
              <button onClick={loginManager} disabled={loading||!mgrPin}
                style={{padding:'0.875rem',background:C.orange,color:'white',border:'none',borderRadius:'14px',fontWeight:'700',cursor:'pointer',opacity:(loading||!mgrPin)?0.6:1}}>
                {loading?'Нэвтрэж байна...':'Нэвтрэх'}
              </button>
            </>}
          </>}
          <button onClick={()=>{setMode('select');resetErr();setMgrPin('');setMgrBranchId('');}} style={{background:'none',border:'none',color:C.muted,cursor:'pointer',fontSize:'0.82rem'}}>← Буцах</button>
        </>}

        {/* ── STAFF: License code ── */}
        {mode==='staff-lic'&&<>
          <div style={{background:`${C.green}11`,border:`1px solid ${C.green}33`,borderRadius:'12px',padding:'0.875rem',textAlign:'center' as const}}>
            <p style={{color:C.green,fontWeight:'800',margin:'0 0 0.15rem'}}>👨‍🍳 Тогооч / Зөөгч</p>
            <p style={{color:C.muted,fontSize:'0.75rem',margin:0}}>Менежерийнхээ лиценцийн кодыг нэг удаа оруулна уу</p>
          </div>
          {!branchesLoaded&&<p style={{color:C.muted,textAlign:'center' as const,fontSize:'0.75rem',margin:0}}>⏳ Ачааллаж байна...</p>}
          <input value={staffLicInput} onChange={e=>{setStaffLicInput(e.target.value.toUpperCase().replace(/[^A-Z0-9\-]/g,''));resetErr();}}
            onKeyDown={e=>e.key==='Enter'&&verifyStaff()} placeholder="RES-XXXX-XXXX"
            style={{...IS,letterSpacing:'0.12em',fontFamily:'monospace',fontSize:'1.1rem',textAlign:'center' as const}} autoFocus/>
          {error&&<p style={{color:C.red,fontSize:'0.82rem',textAlign:'center' as const,margin:0}}>{error}</p>}
          <button onClick={verifyStaff} disabled={loading||staffLicInput.length<8||!branchesLoaded}
            style={{padding:'0.875rem',background:C.green,color:'white',border:'none',borderRadius:'14px',fontWeight:'700',cursor:'pointer',opacity:(loading||staffLicInput.length<8||!branchesLoaded)?0.6:1}}>
            {loading?'Шалгаж байна...':!branchesLoaded?'Ачааллаж байна...':'✅ Шалгах'}
          </button>
          <button onClick={()=>{setMode('select');resetErr();}} style={{background:'none',border:'none',color:C.muted,cursor:'pointer',fontSize:'0.82rem'}}>← Буцах</button>
        </>}

        {/* ── STAFF: Branch selection — зөвхөн тухайн лиценцийн идэвхтэй салбарууд ── */}
        {mode==='staff-branches'&&<>
          <div style={{background:`${C.green}11`,border:`1px solid ${C.green}33`,borderRadius:'12px',padding:'0.75rem',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <div><p style={{color:C.green,fontWeight:'800',fontSize:'0.82rem',margin:'0 0 0.1rem'}}>👨‍🍳 Тогооч / Зөөгч</p><p style={{color:C.muted,fontSize:'0.72rem',margin:0}}>Салбараа сонгоно уу</p></div>
            <button onClick={()=>{resetStaffLic();setStaffBranches([]);setMode('staff-lic');setStaffBranchId('');resetErr();}} style={{background:'none',border:`1px solid ${C.border}`,borderRadius:'6px',color:C.muted,cursor:'pointer',fontSize:'0.7rem',padding:'0.2rem 0.5rem'}}>Код өөрчлөх</button>
          </div>
          {staffBranches.length===0
            ?<p style={{color:C.red,textAlign:'center' as const,fontSize:'0.82rem'}}>Тухайн лиценцтэй салбар олдсонгүй</p>
            :<CSelect
              value={staffBranchId}
              onChange={v=>{
                const b=staffBranches.find(x=>x.id===v);
                setStaffBranchId(v);
                setStaffBranchName(b?.name||'');
                setStaffPin('');resetErr();
                if(v)setMode('staff-pin');
              }}
              placeholder="— Салбар сонгоно уу —"
              options={staffBranches.map(b=>({value:b.id,label:b.name}))}
            />
          }
          <button onClick={()=>{setMode('select');resetErr();setStaffBranchId('');}} style={{background:'none',border:'none',color:C.muted,cursor:'pointer',fontSize:'0.82rem'}}>← Буцах</button>
        </>}

        {/* ── STAFF: PIN ── */}
        {mode==='staff-pin'&&<>
          <div style={{background:`${C.green}11`,border:`1px solid ${C.green}44`,borderRadius:'12px',padding:'0.875rem',textAlign:'center' as const}}>
            <p style={{color:C.green,fontWeight:'700',fontSize:'0.75rem',margin:'0 0 0.25rem'}}>✅ Салбар сонгогдлоо</p>
            <p style={{color:C.text,fontWeight:'900',fontSize:'1.1rem',margin:0}}>{staffBranchName}</p>
          </div>
          <button onClick={()=>{setMode('staff-branches');setStaffPin('');resetErr();}}
            style={{background:'none',border:`1px dashed ${C.border}`,borderRadius:'8px',color:C.muted,cursor:'pointer',fontSize:'0.78rem',padding:'0.4rem',width:'100%'}}>
            ← Өөр салбар сонгох
          </button>
          <input type="password" value={staffPin} onChange={e=>{setStaffPin(e.target.value.replace(/\D/g,''));resetErr();}}
            onKeyDown={e=>e.key==='Enter'&&staffPin&&loginStaff()}
            placeholder="PIN оруулна уу" style={{...IS,textAlign:'center' as const,fontSize:'1.3rem',letterSpacing:'0.35em'}}
            autoFocus inputMode="numeric" maxLength={8}/>
          {error&&<p style={{color:C.red,fontSize:'0.85rem',textAlign:'center' as const,margin:0,fontWeight:'700'}}>{error}</p>}
          <button onClick={loginStaff} disabled={loading||!staffPin}
            style={{padding:'0.9rem',background:C.green,color:'white',border:'none',borderRadius:'14px',fontWeight:'800',cursor:'pointer',fontSize:'1rem',opacity:(loading||!staffPin)?0.6:1}}>
            {loading?'Нэвтрэж байна...':'Нэвтрэх'}
          </button>
          <button onClick={()=>{setMode('select');resetErr();setStaffBranchId('');setStaffPin('');}} style={{background:'none',border:'none',color:C.muted,cursor:'pointer',fontSize:'0.82rem'}}>← Буцах</button>
        </>}

      </div>
    </div>
  );
}


function SurveyPage({branchId,tableNum,onBack}:{branchId:string;tableNum:number;onBack:()=>void}) {
  const [sc,setSc]=useState<Record<SK,number>>({foodQuality:0,ambiance:0,staffAttitude:0,priceValue:0,service:0});
  const [nps,setNps]=useState(-1);
  const [fb,setFb]=useState('');
  const [ph,setPh]=useState('');
  const [loading,setLoading]=useState(false);
  const [ok,setOk]=useState(false);
  const [qs,setQs]=useState(DEF_Q);
  useEffect(()=>{getSettings(branchId).then(s=>{if((s as any).surveyQuestions?.length)setQs((s as any).surveyQuestions);});},[branchId]);
  const [err,setErr]=useState('');
  const can=KEYS.some(k=>sc[k]>0);
  const submit=async()=>{
    if(!can||loading)return;
    setErr('');setLoading(true);
    try{
      const rated=KEYS.filter(k=>sc[k]>0);
      const csat=rated.length?Math.round(rated.reduce((s,k)=>s+sc[k],0)/rated.length):0;
      const data:any={tableNumber:tableNum,...sc,csat,nps:nps>=0?nps:5,feedback:fb||''};
      if(ph.length===8)data.phone=ph;
      await createSurvey(branchId,data);
      setOk(true);
      setTimeout(()=>onBack(),2000);
    }catch(e:any){
      console.error(e);
      setErr('Алдаа: '+(e?.message||String(e)||'Firebase холбогдохгүй байна'));
      setLoading(false);
    }
  };
  if(ok)return(
    <div style={{minHeight:'100vh',background:C.bg,display:'flex',flexDirection:'column' as const,alignItems:'center',justifyContent:'center',gap:'1rem'}}>
      <div style={{fontSize:'4rem'}}>🙏</div>
      <p style={{color:C.green,fontWeight:'800',fontSize:'1.3rem',margin:0}}>Баярлалаа!</p>
    </div>
  );
  return(
    <div style={{height:'100vh',background:C.bg,display:'flex',flexDirection:'column' as const}}>
      {/* Header */}
      <div style={{background:C.sidebar,borderBottom:`1px solid ${C.border}`,padding:'0.875rem 1.25rem',display:'flex',alignItems:'center',gap:'0.75rem',flexShrink:0}}>
        <button onClick={onBack} style={{background:'none',border:'none',color:C.muted,fontSize:'1.3rem',cursor:'pointer',padding:'0.25rem',lineHeight:1}}>←</button>
        <h2 style={{color:C.yellow,fontWeight:'800',margin:0,fontSize:'1rem'}}>⭐ Сэтгэл ханамжийн судалгаа</h2>
      </div>

      {/* Scrollable content */}
      <div style={{flex:1,overflowY:'auto' as const,padding:'1rem',WebkitOverflowScrolling:'touch' as any}}>
        <div style={{maxWidth:'480px',margin:'0 auto',paddingBottom:'1rem'}}>
          {qs.map((q,i)=>(
            <div key={i} style={{background:C.card,borderRadius:'12px',padding:'1rem',marginBottom:'0.75rem',border:`1px solid ${C.border}`}}>
              <p style={{color:C.text,fontWeight:'600',margin:'0 0 0.75rem',fontSize:'0.9rem'}}>{i+1}. {q}</p>
              <div style={{display:'flex',gap:'0.5rem'}}>
                {[1,2,3,4,5].map(n=>(
                  <button key={n} onClick={()=>setSc(s=>({...s,[KEYS[i]]:n}))}
                    style={{flex:1,fontSize:'1.8rem',background:'none',border:'none',cursor:'pointer',opacity:sc[KEYS[i]]>=n?1:0.25,padding:'0.5rem 0',lineHeight:1,touchAction:'manipulation' as any}}>⭐</button>
                ))}
              </div>
            </div>
          ))}
          <div style={{background:C.card,borderRadius:'12px',padding:'1rem',marginBottom:'0.75rem',border:`1px solid ${C.border}`}}>
            <p style={{color:C.text,fontWeight:'600',margin:'0 0 0.6rem',fontSize:'0.9rem'}}>Найз нөхөддөө санал болгох уу? <span style={{color:C.muted,fontWeight:'400',fontSize:'0.78rem'}}>(заавал биш)</span></p>
            <div style={{display:'grid',gridTemplateColumns:'repeat(6,1fr)',gap:'0.3rem'}}>
              {Array.from({length:11},(_,i)=>(
                <button key={i} onClick={()=>setNps(i)}
                  style={{padding:'0.6rem 0',borderRadius:'8px',border:`1px solid ${nps===i?C.yellow:C.border}`,fontWeight:'700',cursor:'pointer',background:nps===i?C.yellow:'transparent',color:nps===i?'#000':C.muted,fontSize:'0.85rem',touchAction:'manipulation' as any}}>
                  {i}
                </button>
              ))}
            </div>
          </div>
          <div style={{background:'rgba(255,255,255,0.03)',borderRadius:'12px',padding:'1rem',border:`1px dashed rgba(255,255,255,0.1)`}}>
            <p style={{color:C.muted,fontSize:'0.75rem',margin:'0 0 0.6rem'}}>💬 Нэмэлт санал / утас (заавал биш)</p>
            <textarea value={fb} onChange={e=>setFb(e.target.value)} rows={2} placeholder="Санал, гомдол..." style={{...IS,resize:'none' as const,marginBottom:'0.5rem',fontSize:'0.875rem'}}/>
            <input value={ph} onChange={e=>setPh(e.target.value.replace(/\D/g,'').slice(0,8))} placeholder="☎ Утасны дугаар" style={{...IS,fontSize:'0.875rem'}} inputMode="numeric"/>
          </div>
        </div>
      </div>

      {/* Fixed submit button at bottom */}
      <div style={{flexShrink:0,padding:'0.875rem 1rem',background:C.bg,borderTop:`1px solid ${C.border}`}}>
        {err&&<p style={{color:'#ff6b6b',fontSize:'0.8rem',margin:'0 0 0.5rem',textAlign:'center' as const}}>⚠️ {err}</p>}
        <button
          onClick={submit}
          disabled={!can||loading}
          style={{width:'100%',padding:'1rem',borderRadius:'14px',border:'none',
            background:can?C.green:'#2a2a35',
            color:can?'white':'rgba(255,255,255,0.3)',
            fontWeight:'900',fontSize:'1.1rem',
            cursor:can?'pointer':'default',
            boxShadow:can?'0 4px 20px rgba(46,204,113,0.4)':'none',
            letterSpacing:'0.04em',
            touchAction:'manipulation' as any,
            WebkitTapHighlightColor:'transparent' as any}}>
          {loading?'⏳ Илгээж байна...':can?'✅  ИЛГЭЭХ':'⭐ Дор хаяж нэг үнэлгээ өгнө үү'}
        </button>
      </div>
    </div>
  );
}

function CustomerView({branchId,tableNum}:{branchId:string;tableNum:number}) {
  const [items,setItems]=useState<MenuItem[]>([]);
  const [cart,setCart]=useState<CartItem[]>([]);
  const [orders,setOrders]=useState<Order[]>([]);
  const [cats,setCats]=useState<Category[]>([]);
  const [activeCat,setActiveCat]=useState('');
  const [showSurvey,setShowSurvey]=useState(false);
  const [showCart,setShowCart]=useState(false);
  const [showTrack,setShowTrack]=useState(false);
  const [bName,setBName]=useState('');
  const [notes,setNotes]=useState('');
  const [loading,setLoading]=useState(false);
  const [lightbox,setLightbox]=useState<string|null>(null);
  const [orderSuccess,setOrderSuccess]=useState(false);

  const [dataLoaded,setDataLoaded]=useState(false);

  useEffect(()=>{
    if(!branchId)return;
    getBranch(branchId).then(b=>b&&setBName(b.name));
    let itemsLoaded=false,catsLoaded=false;
    const trySetLoaded=()=>{if(itemsLoaded&&catsLoaded)setDataLoaded(true);};
    const u1=subscribeToMenu(branchId,it=>{setItems(it.filter(i=>i.available));itemsLoaded=true;trySetLoaded();});
    const u2=subscribeToTableOrders(branchId,tableNum,setOrders);
    const u3=subscribeToCategories(branchId,c=>{setCats(c.filter(x=>x.visible));catsLoaded=true;trySetLoaded();});
    return()=>{u1();u2();u3();};
  },[branchId,tableNum]);

  const mCats=[...new Set(items.map(i=>i.category))];
  const visCats=cats.length?cats.filter(c=>mCats.includes(c.name)).map(c=>c.name):mCats;
  useEffect(()=>{if(visCats.length&&!activeCat)setActiveCat(visCats[0]);},[visCats.length]);

  const chg=(item:MenuItem,d:number)=>setCart(prev=>{
    const ex=prev.find(c=>c.item.id===item.id);
    if(!ex)return d>0?[...prev,{item,qty:1}]:prev;
    const nq=ex.qty+d;if(nq<=0)return prev.filter(c=>c.item.id!==item.id);
    return prev.map(c=>c.item.id===item.id?{...c,qty:nq}:c);
  });
  const qty=(id:string)=>cart.find(c=>c.item.id===id)?.qty||0;
  const total=cart.reduce((s,c)=>s+c.item.price*c.qty,0);
  const cnt=cart.reduce((s,c)=>s+c.qty,0);
  const activeOrders=orders.filter(o=>o.status!=='served');

  const placeOrder=async()=>{
    if(!cart.length)return;setLoading(true);
    await createOrder(branchId,tableNum,cart.map(c=>({menuItemId:c.item.id,name:c.item.name,price:c.item.price,quantity:c.qty})),undefined,notes||undefined);
    setCart([]);setNotes('');setShowCart(false);setLoading(false);
    setOrderSuccess(true);
    setTimeout(()=>setOrderSuccess(false),3500);
  };

  if(showSurvey)return<SurveyPage branchId={branchId} tableNum={tableNum} onBack={()=>setShowSurvey(false)}/>;

  // Ачааллаж байх үед spinner харуулна
  if(!dataLoaded)return(
    <div style={{minHeight:'100vh',background:C.bg,display:'flex',flexDirection:'column' as const,alignItems:'center',justifyContent:'center',gap:'1rem'}}>
      <div style={{width:'48px',height:'48px',border:`3px solid ${C.border}`,borderTop:`3px solid ${C.yellow}`,borderRadius:'50%',animation:'spin 0.8s linear infinite'}}/>
      <p style={{color:C.muted,fontSize:'0.85rem',margin:0}}>Цэс ачааллаж байна...</p>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  return(
    <div style={{minHeight:'100vh',background:C.bg,paddingBottom:'80px'}}>
      <div style={{background:C.sidebar,borderBottom:`1px solid ${C.border}`,padding:'0.75rem 1.25rem',display:'flex',alignItems:'center',justifyContent:'space-between',position:'sticky',top:0,zIndex:30}}>
        <h1 style={{color:C.yellow,fontWeight:'800',margin:0,fontSize:'1rem',letterSpacing:'0.05em'}}>{bName.toUpperCase()||'РЕСТОРАН'}</h1>
        <div style={{display:'flex',gap:'0.5rem'}}>
          {activeOrders.length>0&&<button onClick={()=>setShowTrack(true)} style={{background:`${C.yellow}22`,border:`1px solid ${C.yellow}44`,borderRadius:'8px',padding:'0.4rem 0.75rem',color:C.yellow,cursor:'pointer',fontWeight:'700',fontSize:'0.75rem'}}>📋 ({activeOrders.length})</button>}
          <button onClick={()=>setShowCart(true)} style={{background:C.inpBg,border:`1px solid ${C.border}`,borderRadius:'8px',padding:'0.4rem 0.75rem',color:C.text,cursor:'pointer',fontWeight:'600',fontSize:'0.75rem',display:'flex',alignItems:'center',gap:'0.35rem'}}>
            🛒{cnt>0&&<span style={{background:C.orange,color:'white',borderRadius:'50%',width:'18px',height:'18px',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'0.68rem',fontWeight:'800'}}>{cnt}</span>}
          </button>
        </div>
      </div>
      <div style={{textAlign:'center',padding:'1.25rem 1rem 0.75rem'}}><h2 style={{fontFamily:'Georgia,serif',fontSize:'2rem',fontStyle:'italic',color:C.yellow,margin:0,fontWeight:'400'}}>Меню</h2></div>
      <div style={{padding:'0 1rem 0.75rem',display:'flex',gap:'0.4rem',overflowX:'auto'}}>
        {visCats.map(cat=><button key={cat} onClick={()=>setActiveCat(cat)} style={{padding:'0.4rem 1rem',borderRadius:'6px',border:`1.5px solid ${activeCat===cat?C.orange:C.border}`,cursor:'pointer',whiteSpace:'nowrap',fontWeight:'700',fontSize:'0.78rem',textTransform:'uppercase' as const,background:activeCat===cat?C.orange:'transparent',color:activeCat===cat?'white':C.muted,transition:'all 0.15s'}}>{cat}</button>)}
      </div>
      <div style={{padding:'0 1rem',maxWidth:'720px',margin:'0 auto'}}>
        {items.filter(i=>i.category===activeCat).map(item=>{
          const q=qty(item.id);
          return(
            <div key={item.id} style={{background:C.card,borderRadius:'14px',overflow:'hidden',border:`1px solid ${C.border}`,marginBottom:'0.75rem'}}>
              <div style={{padding:'1rem'}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'0.3rem'}}>
                  <h3 style={{color:C.text,fontWeight:'800',fontSize:'1rem',margin:0,flex:1,paddingRight:'0.75rem',lineHeight:1.3}}>{item.name}</h3>
                  <span style={{color:C.yellow,fontWeight:'800',fontSize:'0.95rem',flexShrink:0}}>
                    {(item as any).discountPercent>0
                      ?<><span style={{textDecoration:'line-through',color:C.muted,fontSize:'0.78rem',marginRight:'0.25rem'}}>₮{item.price.toLocaleString('mn-MN')}</span>₮{Math.round(item.price*(1-(item as any).discountPercent/100)).toLocaleString('mn-MN')}</>
                      :`₮${item.price.toLocaleString('mn-MN')}`}
                  </span>
                </div>
                {item.description&&<p style={{color:C.muted,fontSize:'0.8rem',margin:'0 0 0.5rem',lineHeight:1.5}}>{item.description}</p>}
                {(item as any).allergens&&<div style={{background:`${C.yellow}10`,border:`1px solid ${C.yellow}22`,borderRadius:'6px',padding:'0.3rem 0.6rem',marginBottom:'0.5rem'}}><p style={{color:`${C.yellow}99`,fontSize:'0.72rem',margin:0}}>🌿 Орц: {(item as any).allergens}</p></div>}
                {((item as any).isSpecial||(item as any).discountPercent>0)&&<div style={{display:'flex',gap:'0.35rem',marginBottom:'0.4rem',flexWrap:'wrap' as const}}>
                  {(item as any).isSpecial&&<span style={{fontSize:'0.65rem',background:`${C.yellow}22`,color:C.yellow,padding:'0.1rem 0.45rem',borderRadius:'6px',fontWeight:'700'}}>⭐ Онцлох</span>}
                  {(item as any).discountPercent>0&&<span style={{fontSize:'0.65rem',background:`${C.green}22`,color:C.green,padding:'0.1rem 0.45rem',borderRadius:'6px',fontWeight:'700'}}>🏷️ -{(item as any).discountPercent}%</span>}
                </div>}
              </div>
              {item.image&&<div onClick={()=>setLightbox(item.image)} style={{maxHeight:'200px',overflow:'hidden',cursor:'zoom-in'}}><img src={item.image} alt={item.name} style={{width:'100%',height:'200px',objectFit:'cover',display:'block',transition:'transform 0.2s'}} onMouseOver={e=>{(e.target as HTMLImageElement).style.transform='scale(1.02)';}} onMouseOut={e=>{(e.target as HTMLImageElement).style.transform='scale(1)';}} onError={e=>{(e.target as HTMLImageElement).parentElement!.style.display='none';}}/></div>}
              <div style={{padding:'0.75rem 1rem',display:'flex',alignItems:'center',justifyContent:'space-between',borderTop:`1px solid ${C.border}`}}>
                <span style={{color:C.muted,fontSize:'0.75rem'}}>Ширхэг:</span>
                {q===0?<button onClick={()=>chg(item,1)} style={{padding:'0.4rem 1.1rem',background:C.yellow,color:'#000',border:'none',borderRadius:'8px',fontWeight:'700',cursor:'pointer',fontSize:'0.82rem'}}>+ Нэмэх</button>
                :<div style={{display:'flex',alignItems:'center',gap:'0.5rem'}}>
                  <button onClick={()=>chg(item,-1)} style={{width:'30px',height:'30px',border:`1px solid ${C.border}`,borderRadius:'6px',background:C.inpBg,color:C.text,cursor:'pointer',fontWeight:'700'}}>−</button>
                  <span style={{color:C.yellow,fontWeight:'800',minWidth:'24px',textAlign:'center' as const}}>{q}</span>
                  <button onClick={()=>chg(item,1)} style={{width:'30px',height:'30px',border:'none',borderRadius:'6px',background:C.yellow,color:'#000',cursor:'pointer',fontWeight:'700'}}>+</button>
                </div>}
              </div>
            </div>
          );
        })}
        {!items.filter(i=>i.category===activeCat).length&&<div style={{textAlign:'center',padding:'3rem',color:C.muted}}><div style={{fontSize:'3rem'}}>🍽️</div><p>Хоол байхгүй</p></div>}
      </div>
      <div style={{position:'fixed',bottom:0,left:0,right:0,background:C.sidebar,borderTop:`1px solid ${C.border}`,padding:'0.75rem 1rem',display:'flex',gap:'0.75rem',zIndex:30}}>
        <button onClick={()=>setShowSurvey(true)} style={{flex:1,padding:'0.75rem',background:C.inpBg,border:`1px solid ${C.border}`,borderRadius:'12px',color:C.yellow,cursor:'pointer',fontWeight:'700',fontSize:'0.82rem'}}>⭐ Үнэлгээ өгөх</button>
        <button onClick={()=>setShowCart(true)} disabled={cnt===0} style={{flex:2,padding:'0.75rem',background:cnt>0?C.orange:C.inpBg,border:'none',borderRadius:'12px',color:cnt>0?'white':C.muted,cursor:'pointer',fontWeight:'800',fontSize:'0.875rem'}}>
          {cnt>0?`ЗАХИАЛГА (${formatPrice(total)})`:'ЗАХИАЛГА ИЛГЭЭХ'}
        </button>
      </div>
      {showCart&&<div onClick={()=>setShowCart(false)} style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.8)',zIndex:50,display:'flex',alignItems:'flex-end'}}>
        <div onClick={e=>e.stopPropagation()} style={{background:C.card,borderRadius:'20px 20px 0 0',padding:'1.5rem',width:'100%',maxHeight:'85vh',overflowY:'auto',border:`1px solid ${C.border}`,borderBottom:'none'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'1.25rem'}}>
            <h3 style={{color:C.yellow,fontWeight:'800',margin:0}}>🛒 Захиалга · Ширээ {tableNum}</h3>
            <button onClick={()=>setShowCart(false)} style={{background:C.inpBg,border:'none',color:C.muted,width:'32px',height:'32px',borderRadius:'50%',cursor:'pointer'}}>✕</button>
          </div>
          {cart.length===0?<p style={{textAlign:'center',color:C.muted,padding:'2rem'}}>Сагс хоосон</p>:<>
            {cart.map((c,i)=>(
              <div key={i} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'0.75rem 0',borderBottom:`1px solid ${C.border}`}}>
                <div><p style={{color:C.text,fontWeight:'700',margin:0,fontSize:'0.9rem'}}>{c.item.name}</p><p style={{color:C.muted,fontSize:'0.78rem',margin:0}}>{formatPrice(c.item.price)} × {c.qty}</p></div>
                <div style={{display:'flex',alignItems:'center',gap:'0.5rem'}}>
                  <button onClick={()=>chg(c.item,-1)} style={{width:'28px',height:'28px',borderRadius:'6px',border:`1px solid ${C.border}`,background:C.inpBg,color:C.text,cursor:'pointer',fontWeight:'700'}}>−</button>
                  <span style={{color:C.yellow,fontWeight:'800',minWidth:'20px',textAlign:'center' as const}}>{c.qty}</span>
                  <button onClick={()=>chg(c.item,1)} style={{width:'28px',height:'28px',borderRadius:'6px',border:'none',background:C.yellow,color:'#000',cursor:'pointer',fontWeight:'700'}}>+</button>
                </div>
              </div>
            ))}
            <div style={{display:'flex',justifyContent:'space-between',margin:'1rem 0',fontWeight:'800',fontSize:'1.05rem'}}><span style={{color:C.text}}>Нийт</span><span style={{color:C.yellow}}>{formatPrice(total)}</span></div>
            <textarea value={notes} onChange={e=>setNotes(e.target.value)} placeholder="📝 Нэмэлт тайлбар..." rows={2} style={{...IS,resize:'none' as const,marginBottom:'1rem'}}/>
            <button onClick={placeOrder} disabled={loading} style={{width:'100%',padding:'1rem',background:C.orange,color:'white',border:'none',borderRadius:'12px',fontWeight:'800',cursor:'pointer',opacity:loading?0.7:1}}>{loading?'Илгээж байна...':'✅ ЗАХИАЛГА БАТЛАХ'}</button>
          </>}
        </div>
      </div>}
      {showTrack&&<div onClick={()=>setShowTrack(false)} style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.8)',zIndex:50,display:'flex',alignItems:'flex-end'}}>
        <div onClick={e=>e.stopPropagation()} style={{background:C.card,borderRadius:'20px 20px 0 0',padding:'1.5rem',width:'100%',maxHeight:'85vh',overflowY:'auto',border:`1px solid ${C.border}`,borderBottom:'none'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'1.25rem'}}>
            <h3 style={{color:C.yellow,fontWeight:'800',margin:0}}>📋 Захиалгын явц · Ширээ {tableNum}</h3>
            <button onClick={()=>setShowTrack(false)} style={{background:C.inpBg,border:'none',color:C.muted,width:'32px',height:'32px',borderRadius:'50%',cursor:'pointer'}}>✕</button>
          </div>
          {activeOrders.length===0?<p style={{textAlign:'center',color:C.muted,padding:'2rem'}}>Идэвхтэй захиалга байхгүй</p>
          :activeOrders.map((ord,idx)=>(
            <div key={ord.id} style={{background:C.inpBg,borderRadius:'12px',padding:'1rem',marginBottom:'0.75rem',border:`1px solid ${ORDER_STATUS_COLORS[ord.status]}44`}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'0.6rem'}}>
                <span style={{color:'rgba(255,255,255,0.5)',fontSize:'0.72rem',fontWeight:'600'}}>ЗАХИАЛГА #{idx+1}</span>
                <span style={{fontWeight:'800',padding:'0.25rem 0.65rem',borderRadius:'20px',fontSize:'0.72rem',background:ORDER_STATUS_COLORS[ord.status]+'22',color:ORDER_STATUS_COLORS[ord.status]}}>{ORDER_STATUS_LABELS[ord.status]}</span>
              </div>
              {ord.items.map((it,i)=><div key={i} style={{display:'flex',justifyContent:'space-between',fontSize:'0.82rem',color:'rgba(255,255,255,0.7)',padding:'0.2rem 0'}}><span>{it.name} × {it.quantity}</span><span>{formatPrice(it.price*it.quantity)}</span></div>)}
              <div style={{display:'flex',justifyContent:'space-between',marginTop:'0.6rem',paddingTop:'0.6rem',borderTop:`1px solid ${C.border}`,fontWeight:'800'}}><span style={{color:C.text,fontSize:'0.82rem'}}>Нийт</span><span style={{color:C.yellow}}>{formatPrice(ord.totalAmount)}</span></div>
            </div>
          ))}
        </div>
      </div>}
      {lightbox&&<div onClick={()=>setLightbox(null)} style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.95)',zIndex:200,display:'flex',alignItems:'center',justifyContent:'center',padding:'1rem',cursor:'zoom-out'}}>
        <img src={lightbox} alt="" style={{maxWidth:'100%',maxHeight:'90vh',objectFit:'contain',borderRadius:'8px'}}/>
        <button onClick={()=>setLightbox(null)} style={{position:'absolute',top:'1rem',right:'1rem',background:'rgba(255,255,255,0.1)',border:'none',color:'white',width:'40px',height:'40px',borderRadius:'50%',cursor:'pointer',fontSize:'1.2rem'}}>✕</button>
      </div>}
      {showSurvey&&null}

      {/* ── ORDER SUCCESS TOAST ── */}
      {orderSuccess&&<div style={{position:'fixed',bottom:'100px',left:'50%',transform:'translateX(-50%)',background:'linear-gradient(135deg,#2ECC71,#27AE60)',color:'white',padding:'1rem 1.75rem',borderRadius:'16px',fontWeight:'800',zIndex:150,boxShadow:'0 8px 24px rgba(0,0,0,0.4)',whiteSpace:'nowrap',textAlign:'center',animation:'slideUp 0.3s ease'}}>
        <div style={{fontSize:'1.5rem',marginBottom:'0.2rem'}}>✅</div>
        <div style={{fontSize:'0.95rem'}}>Захиалга амжилттай илгээгдлээ!</div>
        <div style={{fontSize:'0.75rem',opacity:0.85,marginTop:'0.15rem'}}>Гал тогоо хүлээн авлаа</div>
        <style>{`@keyframes slideUp{from{opacity:0;transform:translateX(-50%) translateY(20px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}`}</style>
      </div>}
    </div>
  );
}

function OrderCard({o,branchId,branchLabel}:{o:Order;branchId:string;branchLabel?:string}) {
  const NEXT:Partial<Record<Order['status'],Order['status']>>={pending:'preparing',preparing:'ready',ready:'served'};
  const NL:Partial<Record<Order['status'],string>>={pending:'👨‍🍳 Бэлтгэж эхлэх',preparing:'📢 Бэлэн болгох',ready:'🛎️ Хүргэсэн тэмдэглэх'};
  const NC:Partial<Record<Order['status'],string>>={pending:'#3B82F6',preparing:'#10B981',ready:'#8B5CF6'};
  const el=Math.floor((Date.now()-o.createdAt)/60000);
  return(
    <div style={{background:C.card,borderRadius:'14px',overflow:'hidden',border:`1px solid ${C.border}`,borderTop:`4px solid ${ORDER_STATUS_COLORS[o.status]}`,marginBottom:'0.75rem'}}>
      <div style={{padding:'0.875rem 1rem',display:'flex',justifyContent:'space-between',alignItems:'center',borderBottom:`1px solid ${C.border}`}}>
        <div>
          <div style={{display:'flex',alignItems:'baseline',gap:'0.5rem'}}>
            <span style={{fontSize:'2rem',fontWeight:'900',color:C.text,lineHeight:1}}>Ширээ {o.tableNumber}</span>
            {(o as any).orderNumber&&<span style={{fontSize:'0.9rem',fontWeight:'800',color:C.yellow,background:`${C.yellow}18`,padding:'0.1rem 0.5rem',borderRadius:'8px'}}>{(o as any).orderNumber}</span>}
          </div>
          {branchLabel&&<div style={{fontSize:'0.65rem',color:C.orange,fontWeight:'700',marginTop:'0.1rem'}}>📍 {branchLabel}</div>}
        </div>
        <div style={{textAlign:'right' as const}}>
          <div style={{fontSize:'0.72rem',padding:'0.25rem 0.65rem',borderRadius:'20px',fontWeight:'700',background:ORDER_STATUS_COLORS[o.status]+'22',color:ORDER_STATUS_COLORS[o.status],marginBottom:'0.2rem'}}>{ORDER_STATUS_LABELS[o.status]}</div>
          <div style={{fontSize:'0.7rem',color:el>=15?C.red:el>=5?C.yellow:C.muted,fontWeight:'600'}}>{formatTime(o.createdAt)} · {el}мин</div>
        </div>
      </div>
      <div style={{padding:'0.875rem 1rem'}}>
        {o.items.map((item,i)=>(
          <div key={i} style={{display:'flex',justifyContent:'space-between',padding:'0.3rem 0',borderBottom:i<o.items.length-1?'1px dashed rgba(255,255,255,0.05)':'none'}}>
            <span style={{fontWeight:'700',color:'rgba(255,255,255,0.9)',fontSize:'0.9rem'}}>{item.name}</span>
            <span style={{background:'rgba(255,255,255,0.1)',borderRadius:'20px',padding:'0.1rem 0.6rem',fontWeight:'800',color:C.text,fontSize:'0.82rem'}}>×{item.quantity}</span>
          </div>
        ))}
        {o.notes&&<div style={{marginTop:'0.6rem',background:`${C.yellow}11`,border:`1px solid ${C.yellow}33`,borderRadius:'8px',padding:'0.4rem 0.65rem'}}><p style={{margin:0,fontSize:'0.82rem',color:C.yellow,fontWeight:'600'}}>📝 {o.notes}</p></div>}
      </div>
      {NEXT[o.status]&&<div style={{padding:'0 1rem 0.75rem',display:'flex',gap:'0.5rem'}}>
        <button onClick={async()=>{await updateOrderStatus(branchId,o.id,NEXT[o.status]!);await logActivity(branchId,'Ажилтан',`Захиалгын төлөв`,`Ширээ ${o.tableNumber}: ${NL[o.status]}`);}}
          style={{flex:1,padding:'0.8rem',background:NC[o.status],color:'white',border:'none',borderRadius:'10px',fontWeight:'800',cursor:'pointer',fontSize:'0.9rem',touchAction:'manipulation' as const}}>
          {NL[o.status]}
        </button>
        {['pending','preparing'].includes(o.status)&&<button onClick={async()=>{
          if(!confirm(`Ширээ ${o.tableNumber}-н захиалгыг цуцлах уу?`))return;
          await updateOrderStatus(branchId,o.id,'served');
          await logActivity(branchId,'Ажилтан','Захиалга цуцлагдлаа',`Ширээ ${o.tableNumber}`);
        }} style={{padding:'0.8rem 0.875rem',background:`${C.red}22`,border:`1px solid ${C.red}44`,borderRadius:'10px',color:C.red,cursor:'pointer',fontWeight:'700',fontSize:'0.82rem',touchAction:'manipulation' as const}}>
          ❌
        </button>}
      </div>}
    </div>
  );
}

function OrdersKitchenView({orders,branchId,showBranchName,branchNames,currentBranchId}:{orders:Order[];branchId:string;showBranchName?:boolean;branchNames?:Record<string,string>;currentBranchId?:string}) {
  const [sf,setSf]=useState<KFilter>('all');
  const [df,setDf]=useState<'today'|'all'>('today');
  const ts=new Date();ts.setHours(0,0,0,0);
  const todayOrders=df==='today'?orders.filter(o=>o.createdAt>=ts.getTime()):orders;
  const active=todayOrders.filter(o=>o.status!=='served').sort((a,b)=>a.createdAt-b.createdAt);
  const served=todayOrders.filter(o=>o.status==='served').sort((a,b)=>b.updatedAt-a.updatedAt);
  const filtered=sf==='served'?served:sf==='all'?active:active.filter(o=>o.status===sf);
  const cnt={pending:active.filter(o=>o.status==='pending').length,preparing:active.filter(o=>o.status==='preparing').length,ready:active.filter(o=>o.status==='ready').length};
  return(
    <div>
      <div style={{display:'flex',gap:'0.4rem',marginBottom:'0.75rem',flexWrap:'wrap' as const,alignItems:'center'}}>
        {[{k:'today',l:'📅 Өнөөдөр'},{k:'all',l:'Бүгд'}].map(t=><button key={t.k} onClick={()=>setDf(t.k as any)} style={{padding:'0.4rem 0.875rem',borderRadius:'20px',border:`1px solid ${df===t.k?C.yellow:C.border}`,background:df===t.k?`${C.yellow}22`:'transparent',color:df===t.k?C.yellow:C.muted,fontWeight:df===t.k?'700':'500',cursor:'pointer',fontSize:'0.78rem'}}>{t.l}</button>)}
        <span style={{color:'rgba(255,255,255,0.3)',fontSize:'0.75rem',marginLeft:'0.25rem'}}>{active.length} идэвхтэй</span>
        <button onClick={()=>setSf(sf==='served'?'all':'served')} style={{marginLeft:'auto',padding:'0.4rem 0.875rem',borderRadius:'20px',border:`1px solid ${sf==='served'?'#6B7280':'rgba(255,255,255,0.15)'}`,background:sf==='served'?'rgba(107,114,128,0.22)':'transparent',color:sf==='served'?'#9CA3AF':C.muted,fontWeight:sf==='served'?'700':'500',cursor:'pointer',fontSize:'0.78rem'}}>
          📦 Хүргэгдсэн ({served.length})
        </button>
      </div>
      {sf!=='served'&&<div style={{display:'flex',gap:'0.4rem',marginBottom:'1.25rem',flexWrap:'wrap' as const}}>
        {[{k:'all',l:`📋 Бүгд (${active.length})`,c:C.yellow},{k:'pending',l:`🟡 Хүлээж (${cnt.pending})`,c:'#F59E0B'},{k:'preparing',l:`🔵 Бэлтгэж (${cnt.preparing})`,c:'#3B82F6'},{k:'ready',l:`🟢 Бэлэн (${cnt.ready})`,c:'#10B981'}].map(t=><button key={t.k} onClick={()=>setSf(t.k as any)} style={{padding:'0.4rem 0.875rem',borderRadius:'20px',border:`1px solid ${sf===t.k?t.c:C.border}`,background:sf===t.k?`${t.c}22`:'transparent',color:sf===t.k?t.c:C.muted,fontWeight:sf===t.k?'700':'500',cursor:'pointer',fontSize:'0.78rem',whiteSpace:'nowrap' as const}}>{t.l}</button>)}
      </div>}
      {sf==='served'&&<div style={{background:'rgba(107,114,128,0.12)',borderRadius:'10px',padding:'0.6rem 1rem',marginBottom:'1rem',border:'1px solid rgba(107,114,128,0.25)'}}>
        <p style={{color:'#9CA3AF',fontSize:'0.78rem',margin:0}}>📦 Хүргэгдсэн захиалгын архив — {served.length} захиалга</p>
      </div>}
      {filtered.length===0&&<div style={{textAlign:'center',padding:'4rem 2rem',color:C.muted}}><div style={{fontSize:'3.5rem',marginBottom:'0.75rem'}}>{sf==='served'?'📦':'🎉'}</div><p style={{fontWeight:'700'}}>{sf==='served'?'Хүргэгдсэн захиалга байхгүй':'Захиалга байхгүй'}</p></div>}
      {filtered.map(o=><div key={o.id}><OrderCard o={o} branchId={(o as any)._bid||branchId} branchLabel={showBranchName&&branchNames?(branchNames[(o as any)._bid||branchId]||''):undefined}/></div>)}
    </div>
  );
}

function SimpleBarChart({data}:{data:{name:string;qty:number;revenue:number}[]}) {
  if(!data.length)return null;
  const mx=Math.max(...data.map(d=>d.revenue),1);
  const COLS=[C.yellow,C.orange,'#10B981','#3B82F6','#8B5CF6','#EC4899','#14B8A6','#F97316'];
  return(
    <div style={{display:'flex',alignItems:'flex-end',gap:'6px',height:'140px',padding:'0 0 32px',overflowX:'auto' as const}}>
      {data.map((d,i)=>(
        <div key={d.name} style={{flex:'0 0 auto',minWidth:'50px',maxWidth:'80px',display:'flex',flexDirection:'column' as const,alignItems:'center' as const,height:'100%',justifyContent:'flex-end' as const}} title={`${d.name}: ${formatPrice(d.revenue)} (${d.qty}ш)`}>
          <div style={{fontSize:'0.65rem',color:C.muted,marginBottom:'2px',fontWeight:'700'}}>{d.qty}ш</div>
          <div style={{width:'100%',background:COLS[i%COLS.length],borderRadius:'4px 4px 0 0',height:`${Math.max(6,(d.revenue/mx)*100)}px`,minHeight:'6px'}}/>
          <div style={{fontSize:'0.6rem',color:C.muted,marginTop:'4px',textAlign:'center' as const,wordBreak:'break-all' as const}}>{d.name.length>8?d.name.slice(0,7)+'…':d.name}</div>
        </div>
      ))}
    </div>
  );
}

const SF=[{k:'today',l:'Өнөөдөр',ms:86400000},{k:'7d',l:'7 хоног',ms:604800000},{k:'14d',l:'14 хоног',ms:1209600000},{k:'1m',l:'1 сар',ms:2592000000},{k:'3m',l:'3 сар',ms:7776000000},{k:'6m',l:'6 сар',ms:15552000000},{k:'12m',l:'12 сар',ms:31536000000},{k:'custom',l:'Сонголтот',ms:0}];

const getDateRangeStr=(filter:string,fd:string,td:string):string=>{
  if(filter==='custom'&&fd&&td)return `${fd} — ${td}`;
  const f=SF.find(x=>x.k===filter);if(!f)return '';
  const from=new Date(Date.now()-f.ms);
  const to=new Date();
  return `${from.toLocaleDateString('mn-MN')} — ${to.toLocaleDateString('mn-MN')}`;
};

function SalesTab({branchId}:{branchId:string}) {
  const [filter,setFilter]=useState('today');
  const [fd,setFd]=useState('');
  const [td,setTd]=useState('');
  const [data,setData]=useState<SalesData|null>(null);
  const [loading,setLoading]=useState(false);
  const [err,setErr]=useState('');

  const load=async()=>{
    setLoading(true);setErr('');
    try{
      let fMs=Date.now()-86400000,tMs=Date.now();
      if(filter==='custom'&&fd&&td){fMs=new Date(fd).getTime();tMs=new Date(td).getTime()+86399999;}
      else{const f=SF.find(f2=>f2.k===filter);if(f)fMs=Date.now()-f.ms;}
      setData(await getSalesReport(branchId,fMs,tMs));
    }catch(e){setErr(String(e));}
    setLoading(false);
  };
  useEffect(()=>{load();},[filter,fd,td]);

  const dateLabel=getDateRangeStr(filter,fd,td);

  const expPDF=()=>{
    if(!data)return;const w=window.open('','_blank');if(!w)return;
    const rows=data.products.map((p,i)=>`<tr><td>${i+1}</td><td>${p.name}</td><td style="text-align:center">${p.qty}</td><td style="text-align:right">${formatPrice(p.revenue)}</td></tr>`).join('');
    w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Борлуулалтын тайлан</title><style>body{font-family:sans-serif;padding:24px}h1{color:#E87B2F}table{width:100%;border-collapse:collapse;margin-top:16px}th,td{padding:8px 12px;border:1px solid #ddd}th{background:#f5f5f5}.sum{display:flex;gap:16px;margin:16px 0}.card{border:1px solid #ddd;border-radius:8px;padding:12px;min-width:120px}.v{font-size:1.4rem;font-weight:bold;color:#E87B2F;margin:0}.l{font-size:.75rem;color:#666;margin:4px 0 0}</style></head><body><h1>Борлуулалтын тайлан</h1><p>${dateLabel||SF.find(f=>f.k===filter)?.l||''}</p><div class="sum"><div class="card"><p class="v">${formatPrice(data.totalRevenue)}</p><p class="l">Нийт орлого</p></div><div class="card"><p class="v">${data.orderCount}</p><p class="l">Захиалга</p></div><div class="card"><p class="v">${formatPrice(data.avgOrder)}</p><p class="l">Дундаж</p></div></div><table><thead><tr><th>#</th><th>Бүтээгдэхүүн</th><th>Тоо ш</th><th>Орлого</th></tr></thead><tbody>${rows}</tbody><tfoot><tr><td colspan="2"><b>Нийт</b></td><td style="text-align:center"><b>${data.products.reduce((s,p)=>s+p.qty,0)}</b></td><td style="text-align:right"><b>${formatPrice(data.totalRevenue)}</b></td></tr></tfoot></table><script>window.onload=()=>window.print()<\/script></body></html>`);
    w.document.close();
  };

  const expXLSX=()=>{
    if(!data)return;
    const summaryRows=[
      {'Үзүүлэлт':'Нийт орлого','Утга':data.totalRevenue},
      {'Үзүүлэлт':'Захиалгын тоо','Утга':data.orderCount},
      {'Үзүүлэлт':'Дундаж захиалга','Утга':data.avgOrder},
    ];
    const productRows=data.products.map((p,i)=>({'#':i+1,'Бүтээгдэхүүн':p.name,'Тоо ш':p.qty,'Орлого (₮)':p.revenue}));
    const wb=XLSX.utils.book_new();
    const wsSum=XLSX.utils.json_to_sheet(summaryRows);
    XLSX.utils.book_append_sheet(wb,wsSum,'Хураангуй');
    const wsProd=XLSX.utils.json_to_sheet(productRows);
    XLSX.utils.book_append_sheet(wb,wsProd,'Бүтээгдэхүүн');
    XLSX.writeFile(wb,`sales_${new Date().toLocaleDateString('mn-MN').replace(/\//g,'-')}.xlsx`);
  };

  return(
    <div>
      <div style={{display:'flex',gap:'0.35rem',flexWrap:'wrap' as const,marginBottom:'0.5rem',alignItems:'center'}}>
        {SF.map(f=><button key={f.k} onClick={()=>setFilter(f.k)} style={{padding:'0.38rem 0.75rem',borderRadius:'20px',border:`1px solid ${filter===f.k?C.yellow:C.border}`,background:filter===f.k?`${C.yellow}22`:'transparent',color:filter===f.k?C.yellow:C.muted,fontWeight:filter===f.k?'700':'500',cursor:'pointer',fontSize:'0.75rem'}}>{f.l}</button>)}
        {filter==='custom'&&<>
          <input type="date" value={fd} onChange={e=>setFd(e.target.value)} style={{...IS,width:'140px',padding:'0.38rem 0.6rem',fontSize:'0.78rem'}}/>
          <span style={{color:C.muted}}>—</span>
          <input type="date" value={td} onChange={e=>setTd(e.target.value)} style={{...IS,width:'140px',padding:'0.38rem 0.6rem',fontSize:'0.78rem'}}/>
        </>}
        <div style={{marginLeft:'auto',display:'flex',gap:'0.4rem'}}>
          <button onClick={expPDF} disabled={!data} style={{padding:'0.38rem 0.75rem',background:`${C.red}22`,border:`1px solid ${C.red}44`,borderRadius:'8px',color:C.red,cursor:'pointer',fontSize:'0.75rem',fontWeight:'700'}}>📄 PDF</button>
          <button onClick={expXLSX} disabled={!data} style={{padding:'0.38rem 0.75rem',background:`${C.green}22`,border:`1px solid ${C.green}44`,borderRadius:'8px',color:C.green,cursor:'pointer',fontSize:'0.75rem',fontWeight:'700'}}>📊 XLSX</button>
        </div>
      </div>
      {dateLabel&&<div style={{marginBottom:'0.75rem',padding:'0.4rem 0.875rem',background:'rgba(245,193,32,0.08)',border:'1px solid rgba(245,193,32,0.2)',borderRadius:'8px',display:'inline-flex',alignItems:'center',gap:'0.5rem'}}>
        <span style={{fontSize:'0.7rem',color:C.muted}}>📅</span>
        <span style={{fontSize:'0.78rem',color:C.yellow,fontWeight:'700'}}>{dateLabel}</span>
      </div>}
      {err&&<div style={{background:`${C.red}11`,border:`1px solid ${C.red}33`,borderRadius:'10px',padding:'0.875rem',color:C.red,fontSize:'0.82rem',marginBottom:'1rem'}}>⚠️ {err}</div>}
      {loading&&<div style={{textAlign:'center',padding:'3rem',color:C.muted}}>⏳ Ачаалж байна...</div>}
      {data&&!loading&&<>
        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'0.6rem',marginBottom:'1rem'}}>
          {[{l:'Нийт орлого',v:formatPrice(data.totalRevenue),c:C.green},{l:'Захиалгын тоо',v:String(data.orderCount),c:C.yellow},{l:'Дундаж захиалга',v:formatPrice(data.avgOrder),c:'#5eead4'}].map(s=>(
            <div key={s.l} style={{...CS,marginBottom:0,textAlign:'center' as const}}>
              <p style={{color:s.c,fontWeight:'800',fontSize:'1.2rem',margin:'0 0 0.2rem'}}>{s.v}</p>
              <p style={{color:C.muted,fontSize:'0.7rem',margin:0}}>{s.l}</p>
            </div>
          ))}
        </div>
        {data.products.length>0&&<div style={{...CS,marginBottom:'1rem'}}><p style={{color:C.yellow,fontWeight:'700',fontSize:'0.78rem',letterSpacing:'0.04em',textTransform:'uppercase' as const,margin:'0 0 0.875rem'}}>📊 Top бүтээгдэхүүн</p><SimpleBarChart data={data.products.slice(0,10)}/></div>}
        <div style={{background:C.card,borderRadius:'14px',border:`1px solid ${C.border}`,overflow:'hidden'}}>
          <div style={{padding:'0.875rem 1rem',borderBottom:`1px solid ${C.border}`,display:'flex',justifyContent:'space-between'}}>
            <p style={{color:C.yellow,fontWeight:'700',fontSize:'0.78rem',letterSpacing:'0.04em',textTransform:'uppercase' as const,margin:0}}>🍽️ Дэлгэрэнгүй</p>
            <span style={{color:C.muted,fontSize:'0.72rem'}}>{data.products.length} бүтээгдэхүүн</span>
          </div>
          {data.products.length===0?<p style={{textAlign:'center' as const,color:C.muted,padding:'2rem'}}>Борлуулалт байхгүй</p>
          :<table style={{width:'100%',borderCollapse:'collapse' as const,fontSize:'0.82rem'}}>
            <thead><tr style={{background:'rgba(255,255,255,0.04)'}}>
              {['#','Бүтээгдэхүүн','Тоо ш','Орлого'].map(h=><th key={h} style={{padding:'0.6rem 1rem',textAlign:'left' as const,color:C.muted,fontWeight:'600',fontSize:'0.7rem',letterSpacing:'0.04em',textTransform:'uppercase' as const,borderBottom:`1px solid ${C.border}`}}>{h}</th>)}
            </tr></thead>
            <tbody>
              {data.products.map((p,i)=>(
                <tr key={p.name} style={{borderBottom:`1px solid ${C.border}`}}>
                  <td style={{padding:'0.6rem 1rem',color:C.muted,width:'36px'}}>{i+1}</td>
                  <td style={{padding:'0.6rem 1rem',color:'rgba(255,255,255,0.88)',fontWeight:'700'}}>{p.name}</td>
                  <td style={{padding:'0.6rem 1rem',color:C.yellow,fontWeight:'800',textAlign:'center' as const}}>{p.qty} ш</td>
                  <td style={{padding:'0.6rem 1rem',color:C.green,fontWeight:'800',textAlign:'right' as const}}>{formatPrice(p.revenue)}</td>
                </tr>
              ))}
              <tr style={{background:'rgba(255,255,255,0.04)'}}>
                <td colSpan={2} style={{padding:'0.6rem 1rem',color:C.muted,fontWeight:'700'}}>Нийт</td>
                <td style={{padding:'0.6rem 1rem',color:C.yellow,fontWeight:'800',textAlign:'center' as const}}>{data.products.reduce((s,p)=>s+p.qty,0)} ш</td>
                <td style={{padding:'0.6rem 1rem',color:C.green,fontWeight:'800',textAlign:'right' as const}}>{formatPrice(data.totalRevenue)}</td>
              </tr>
            </tbody>
          </table>}
        </div>
      </>}
    </div>
  );
}

function LogsTab({logs,sibLogs,siblingBranches,branchId,bName,isMulti}:{logs:ActivityLog[];sibLogs?:Record<string,ActivityLog[]>;siblingBranches?:Branch[];branchId?:string;bName?:string;isMulti?:boolean}) {
  const [f,setF]=useState<'today'|'7d'|'1m'>('7d');
  const [s,setS]=useState('');
  const [logBranch,setLogBranch]=useState<string>('all');
  const now=Date.now();const ms={today:86400000,'7d':604800000,'1m':2592000000};

  // Merge logs from all branches with branch label
  const allLogs=useMemo(()=>{
    if(!isMulti||logBranch===branchId)return logs.map(l=>({...l,_bn:''}));
    if(logBranch==='all'){
      const cur=logs.map(l=>({...l,_bn:bName||''}));
      const sib=Object.entries(sibLogs||{}).flatMap(([bid,bLogs])=>{
        const name=siblingBranches?.find(b=>b.id===bid)?.name||'';
        return bLogs.map(l=>({...l,_bn:name}));
      });
      return [...cur,...sib].sort((a,b)=>b.createdAt-a.createdAt);
    }
    const sibBLogs=(sibLogs||{})[logBranch]||[];
    return sibBLogs.map(l=>({...l,_bn:''}));
  },[logBranch,logs,sibLogs,siblingBranches,bName,branchId,isMulti]);

  const filtered=allLogs.filter(l=>(now-l.createdAt)<=ms[f]&&(!s||l.action.toLowerCase().includes(s.toLowerCase())||l.staffName.toLowerCase().includes(s.toLowerCase())||l.details.toLowerCase().includes(s.toLowerCase())));
  return(
    <div>
      {/* Branch selector for logs */}
      {isMulti&&<div style={{background:'rgba(255,255,255,0.03)',border:`1px solid ${C.border}`,borderRadius:'10px',padding:'0.5rem 0.75rem',marginBottom:'0.75rem',display:'flex',gap:'0.4rem',flexWrap:'wrap' as const,alignItems:'center'}}>
        <span style={{color:C.muted,fontSize:'0.72rem',fontWeight:'600'}}>🏢 Салбар:</span>
        {[{id:'all',name:'Бүгд'},...(branchId?[{id:branchId,name:bName||'Үндсэн'}]:[]),...(siblingBranches||[])].map(b=>(
          <button key={b.id} onClick={()=>setLogBranch(b.id)}
            style={{padding:'0.22rem 0.6rem',borderRadius:'16px',border:`1px solid ${logBranch===b.id?C.yellow:C.border}`,background:logBranch===b.id?`${C.yellow}22`:'transparent',color:logBranch===b.id?C.yellow:C.muted,fontSize:'0.72rem',fontWeight:logBranch===b.id?'700':'400',cursor:'pointer'}}>
            {b.name}
          </button>
        ))}
      </div>}
      <div style={{display:'flex',gap:'0.4rem',marginBottom:'0.875rem',flexWrap:'wrap' as const,alignItems:'center'}}>
        {[{k:'today',l:'Өнөөдөр'},{k:'7d',l:'7 хоног'},{k:'1m',l:'1 сар'}].map(t=><button key={t.k} onClick={()=>setF(t.k as any)} style={{padding:'0.38rem 0.75rem',borderRadius:'20px',border:`1px solid ${f===t.k?C.yellow:C.border}`,background:f===t.k?`${C.yellow}22`:'transparent',color:f===t.k?C.yellow:C.muted,fontWeight:f===t.k?'700':'500',cursor:'pointer',fontSize:'0.78rem'}}>{t.l}</button>)}
        <input value={s} onChange={e=>setS(e.target.value)} placeholder="🔍 Хайх..." style={{...IS,flex:1,minWidth:'160px',padding:'0.38rem 0.75rem',fontSize:'0.78rem'}}/>
        <span style={{color:C.muted,fontSize:'0.72rem'}}>{filtered.length} бичилт</span>
      </div>
      {filtered.length===0&&<div style={{textAlign:'center',padding:'3rem',color:C.muted}}><div style={{fontSize:'3rem'}}>📜</div><p>Лог байхгүй</p></div>}
      {filtered.map(l=>(
        <div key={`${(l as any)._bn||''}${l.id}`} style={{...CS,display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:'1rem',padding:'0.75rem 1rem'}}>
          <div style={{flex:1,minWidth:0}}>
            <p style={{color:'rgba(255,255,255,0.88)',fontWeight:'700',margin:'0 0 0.12rem',fontSize:'0.875rem'}}>{l.action}</p>
            {l.details&&<p style={{color:C.muted,margin:0,fontSize:'0.75rem',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' as const}}>{l.details}</p>}
            {(l as any)._bn&&<span style={{fontSize:'0.65rem',background:`${C.orange}22`,color:C.orange,padding:'0.08rem 0.4rem',borderRadius:'5px',marginTop:'0.2rem',display:'inline-block'}}>📍{(l as any)._bn}</span>}
          </div>
          <div style={{textAlign:'right' as const,flexShrink:0}}>
            <p style={{color:C.yellow,fontSize:'0.75rem',fontWeight:'700',margin:'0 0 0.1rem'}}>{l.staffName}</p>
            <p style={{color:'rgba(255,255,255,0.3)',fontSize:'0.7rem',margin:0}}>{formatDate(l.createdAt)} {formatTime(l.createdAt)}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function CatTab({branchId,logAct}:{branchId:string;logAct:(a:string,d?:string)=>void}) {
  const [cats,setCats]=useState<Category[]>([]);
  useEffect(()=>{const u=subscribeToCategories(branchId,setCats);return u;},[branchId]);
  const [nm,setNm]=useState('');
  const [eId,setEId]=useState<string|null>(null);
  const [eNm,setENm]=useState('');
  const add=async()=>{if(!nm.trim())return;await saveCategory(branchId,nm.trim());logAct('Ангилал нэмлээ',nm);setNm('');};
  const sv=async()=>{if(!eId||!eNm.trim())return;await updateCategory(branchId,eId,{name:eNm.trim()});logAct('Ангилал засагдлаа',eNm);setEId(null);setENm('');};
  const tog=async(c:Category)=>{await updateCategory(branchId,c.id,{visible:!c.visible});logAct(`Ангилал ${c.visible?'нуугдлаа':'харагдах болов'}`,c.name);};
  const del=async(c:Category)=>{if(!window.confirm(`"${c.name}" устгах уу?`))return;await deleteCategory(branchId,c.id);logAct('Ангилал устгасан',c.name);};
  return(
    <div>
      <div style={{...CS}}>
        <p style={{color:C.yellow,fontSize:'0.78rem',letterSpacing:'0.05em',fontWeight:'700',textTransform:'uppercase' as const,margin:'0 0 0.6rem'}}>+ Шинэ ангилал</p>
        <div style={{display:'flex',gap:'0.5rem'}}>
          <input value={nm} onChange={e=>setNm(e.target.value)} onKeyDown={e=>e.key==='Enter'&&add()} placeholder="Ангилалын нэр" style={{...IS,flex:1}}/>
          <button onClick={add} disabled={!nm.trim()} style={{padding:'0.65rem 1.25rem',background:C.orange,color:'white',border:'none',borderRadius:'8px',fontWeight:'700',cursor:'pointer',opacity:!nm.trim()?0.5:1}}>+ Нэмэх</button>
        </div>
      </div>
      {cats.length===0&&<div style={{textAlign:'center',padding:'3rem',color:C.muted}}><div style={{fontSize:'3rem'}}>🏷️</div><p>Ангилал байхгүй</p></div>}
      {cats.map(cat=>(
        <div key={cat.id} style={{...CS,display:'flex',alignItems:'center',gap:'0.75rem',padding:'0.75rem 1rem',opacity:cat.visible?1:0.55}}>
          <Toggle on={cat.visible} onChange={()=>tog(cat)}/>
          {eId===cat.id
            ?<input value={eNm} onChange={e=>setENm(e.target.value)} style={{...IS,flex:1}} onKeyDown={e=>e.key==='Enter'&&sv()} autoFocus/>
            :<span style={{flex:1,color:cat.visible?C.text:C.muted,fontWeight:'700',fontSize:'0.9rem'}}>{cat.name}</span>}
          <span style={{fontSize:'0.68rem',color:cat.visible?C.green:C.muted,fontWeight:'600',flexShrink:0}}>{cat.visible?'Харагдаж байна':'Нуугдсан'}</span>
          <div style={{display:'flex',gap:'0.35rem'}}>
            {eId===cat.id
              ?<><button onClick={sv} style={{padding:'0.3rem 0.6rem',background:C.green,border:'none',borderRadius:'6px',color:'white',cursor:'pointer',fontSize:'0.75rem',fontWeight:'700'}}>✓</button>
                <button onClick={()=>{setEId(null);setENm('');}} style={{padding:'0.3rem 0.5rem',background:C.inpBg,border:`1px solid ${C.border}`,borderRadius:'6px',color:C.muted,cursor:'pointer',fontSize:'0.75rem'}}>✕</button></>
              :<><button onClick={()=>{setEId(cat.id);setENm(cat.name);}} style={{padding:'0.3rem 0.6rem',background:`${C.yellow}22`,border:`1px solid ${C.yellow}44`,borderRadius:'6px',color:C.yellow,cursor:'pointer',fontSize:'0.75rem',fontWeight:'700'}}>✏️</button>
                <button onClick={()=>del(cat)} style={{padding:'0.3rem 0.5rem',background:`${C.red}22`,border:'none',borderRadius:'6px',color:C.red,cursor:'pointer',fontSize:'0.75rem'}}>🗑</button></>}
          </div>
        </div>
      ))}
    </div>
  );
}

function MenuTab({branchId,onEdit,onDel,onNew,logAct}:{branchId:string;onEdit:(i:MenuItem)=>void;onDel:(id:string)=>void;onNew:()=>void;logAct:(a:string,d:string)=>void}) {
  const [menuItems,setMenuItems]=useState<MenuItem[]>([]);
  const [cats,setCats]=useState<Category[]>([]);
  useEffect(()=>{
    const u1=subscribeToMenu(branchId,setMenuItems);
    const u2=subscribeToCategories(branchId,setCats);
    return()=>{u1();u2();};
  },[branchId]);
  const [cf,setCf]=useState('__all__');
  const aCats=[...new Set(menuItems.map(i=>i.category))];
  const ai=menuItems.filter(i=>i.available),ini=menuItems.filter(i=>!i.available);
  const disp=cf==='__inactive__'?ini:cf==='__all__'?ai:ai.filter(i=>i.category===cf);
  const tog=async(item:MenuItem)=>{await updateMenuItem(branchId,item.id!,{available:!item.available});logAct(item.available?'Хоол хаагдлаа':'Хоол нээгдлэв',item.name);};
  return(
    <div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'0.875rem',flexWrap:'wrap' as const,gap:'0.5rem'}}>
        <div style={{display:'flex',gap:'0.35rem',flexWrap:'wrap' as const}}>
          {[{k:'__all__',l:`Бүгд (${ai.length})`},{k:'__inactive__',l:`Идэвхгүй (${ini.length})`},...aCats.map(c=>({k:c,l:c}))].map(t=>(
            <button key={t.k} onClick={()=>setCf(t.k)} style={{padding:'0.35rem 0.7rem',borderRadius:'20px',border:`1px solid ${cf===t.k?C.yellow:C.border}`,background:cf===t.k?`${C.yellow}22`:'transparent',color:cf===t.k?C.yellow:C.muted,fontWeight:cf===t.k?'700':'500',cursor:'pointer',fontSize:'0.75rem'}}>
              {t.l}
            </button>
          ))}
        </div>
        <button onClick={onNew} style={{padding:'0.5rem 1.1rem',background:C.orange,color:'white',border:'none',borderRadius:'8px',fontWeight:'700',cursor:'pointer',fontSize:'0.82rem'}}>+ Шинэ хоол</button>
      </div>
      {disp.length===0&&<div style={{textAlign:'center',padding:'3rem',color:C.muted}}><div style={{fontSize:'3rem'}}>🍽️</div><p>{cf==='__inactive__'?'Идэвхгүй хоол байхгүй':'Хоол байхгүй'}</p></div>}
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(min(240px,100%),1fr))',gap:'0.75rem',overflow:'hidden'}}>
        {disp.map(item=>(
          <div key={item.id} style={{...CS,marginBottom:0,padding:0,overflow:'hidden',opacity:item.available?1:0.6,minWidth:0}}>
            {item.image&&<div style={{height:'140px',overflow:'hidden'}}><img src={item.image} alt={item.name} style={{width:'100%',height:'100%',objectFit:'cover'}} onError={e=>{(e.target as HTMLImageElement).parentElement!.style.display='none';}}/></div>}
            <div style={{padding:'0.875rem'}}>
              <div style={{display:'flex',justifyContent:'space-between',marginBottom:'0.15rem',alignItems:'flex-start'}}>
                <span style={{fontWeight:'800',color:C.text,fontSize:'0.88rem',flex:1,paddingRight:'0.5rem'}}>{item.name}</span>
                <span style={{color:C.yellow,fontWeight:'700',fontSize:'0.88rem',flexShrink:0}}>{formatPrice(item.price)}</span>
              </div>
              <span style={{fontSize:'0.7rem',color:C.muted}}>{item.category}</span>
              {!item.available&&<span style={{fontSize:'0.65rem',color:C.red,background:`${C.red}15`,borderRadius:'4px',padding:'0.1rem 0.4rem',marginLeft:'0.4rem'}}>Идэвхгүй</span>}
              <div style={{display:'flex',gap:'0.4rem',marginTop:'0.6rem',alignItems:'center'}}>
                <button onClick={()=>onEdit(item)} style={{flex:1,padding:'0.38rem',border:`1px solid ${C.border}`,borderRadius:'6px',background:C.inpBg,color:C.text,cursor:'pointer',fontWeight:'600',fontSize:'0.72rem'}}>✏️ Засах</button>
                <Toggle on={item.available} onChange={()=>tog(item)}/>
                <button onClick={()=>onDel(item.id||'')} style={{width:'32px',height:'32px',border:'none',borderRadius:'6px',background:C.red,color:'white',cursor:'pointer',fontSize:'0.95rem',display:'flex',alignItems:'center',justifyContent:'center'}}>🗑</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MenuModal({branchId,init,cats,onClose,logAct}:{branchId:string;init:any;cats:Category[];onClose:()=>void;logAct:(a:string,d:string)=>void}) {
  const [form,setForm]=useState(init);
  const [prev,setPrev]=useState(init.image||'');
  const [upl,setUpl]=useState(false);
  const [err,setErr]=useState('');
  const fRef=useRef<HTMLInputElement>(null);
  const hFile=async(e:ChangeEvent<HTMLInputElement>)=>{const file=e.target.files?.[0];if(!file)return;setUpl(true);try{const b=await compressImage(file,700,0.78);setPrev(b);setForm((f:any)=>({...f,image:b}));}catch{setErr('Зураг алдаа');}setUpl(false);};
  const save=async()=>{
    if(!form.name||!form.category||!form.price||isNaN(Number(form.price)))return setErr('Нэр, ангилал, үнэ шаардлагатай');
    setUpl(true);
    try{await saveMenuItem(branchId,{name:form.name.trim(),category:form.category.trim(),price:Number(form.price),description:form.description||'',allergens:form.allergens||'',image:form.image||'',available:form.available!==false,isSpecial:!!form.isSpecial,discountPercent:Number(form.discountPercent)||0} as any,form.id);
      logAct(form.id?'Хоол засагдлаа':'Шинэ хоол нэмэгдлэв',`${form.name} — ₮${form.price}`);
      onClose();}catch{setErr('Хадгалах алдаа');setUpl(false);}
  };
  const visCats=cats.filter(c=>c.visible);
  return(
    <div onClick={onClose} style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.8)',zIndex:100,display:'flex',alignItems:'center',justifyContent:'center',padding:'1rem'}}>
      <div onClick={e=>e.stopPropagation()} style={{background:C.card,borderRadius:'16px',padding:'1.25rem',width:'100%',maxWidth:'480px',maxHeight:'90vh',overflowY:'auto',border:`1px solid ${C.border}`}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'1.25rem'}}>
          <h3 style={{fontWeight:'800',color:C.yellow,margin:0}}>{form.id?'✏️ Хоол засах':'➕ Шинэ хоол'}</h3>
          <button onClick={onClose} style={{background:C.inpBg,border:'none',width:'32px',height:'32px',borderRadius:'50%',cursor:'pointer',color:C.muted}}>✕</button>
        </div>
        <div style={{marginBottom:'0.875rem'}}>
          <label style={LS}>🖼️ Хоолны зураг</label>
          {prev
            ?<div style={{display:'flex',flexDirection:'column' as const,alignItems:'center',gap:'0.5rem',marginBottom:'0.5rem'}}>
               <div style={{position:'relative' as const,borderRadius:'10px',overflow:'hidden',width:'200px',height:'150px'}}><img src={prev} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/></div>
               <button onClick={()=>{setPrev('');setForm((f:any)=>({...f,image:''}));}} style={{padding:'0.3rem 0.875rem',background:`${C.red}22`,border:'none',color:C.red,borderRadius:'20px',cursor:'pointer',fontSize:'0.78rem'}}>✕ Устгах</button>
             </div>
            :<div onClick={()=>fRef.current?.click()} style={{height:'68px',border:`2px dashed ${C.border}`,borderRadius:'10px',display:'flex',flexDirection:'row' as const,alignItems:'center',justifyContent:'center',cursor:'pointer',background:C.inpBg,marginBottom:'0.5rem',gap:'0.6rem'}} onMouseOver={e=>{e.currentTarget.style.borderColor=C.yellow;}} onMouseOut={e=>{e.currentTarget.style.borderColor='rgba(255,255,255,0.08)';}}>
               <span style={{fontSize:'1.8rem'}}>{upl?'⏳':'📷'}</span>
               <div><p style={{margin:0,fontWeight:'700',color:C.text,fontSize:'0.875rem'}}>{upl?'Боловсруулж байна...':'Зураг оруулах'}</p><p style={{margin:0,fontSize:'0.72rem',color:C.muted}}>Автоматаар жижигрэнэ</p></div>
             </div>}
          <input ref={fRef} type="file" accept="image/*" onChange={hFile} style={{display:'none'}}/>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0.6rem',marginBottom:'0.6rem'}}>
          <div style={{gridColumn:'1/-1'}}><label style={LS}>Хоолны нэр *</label><input value={form.name} onChange={e=>setForm((f:any)=>({...f,name:e.target.value}))} style={IS}/></div>
          <div>
            <label style={LS}>Ангилал *</label>
            {visCats.length>0?<CSelect value={form.category} onChange={v=>setForm((f:any)=>({...f,category:v}))} placeholder="Сонгоно уу" options={visCats.map(c=>({value:c.name,label:c.name}))}/>
            :<input value={form.category} onChange={e=>setForm((f:any)=>({...f,category:e.target.value}))} placeholder="Үндсэн хоол" style={IS}/>}
          </div>
          <div><label style={LS}>Үнэ (₮) *</label><input type="number" value={form.price} onChange={e=>setForm((f:any)=>({...f,price:e.target.value}))} style={IS}/></div>
          <div style={{gridColumn:'1/-1'}}><label style={LS}>Тайлбар</label><textarea value={form.description} onChange={e=>setForm((f:any)=>({...f,description:e.target.value}))} rows={2} style={{...IS,resize:'none' as const}}/></div>
          <div style={{gridColumn:'1/-1'}}><label style={LS}>Орц / Харших найрлага</label><input value={form.allergens} onChange={e=>setForm((f:any)=>({...f,allergens:e.target.value}))} placeholder="Гурил, Мах..." style={IS}/></div>
          <div style={{gridColumn:'1/-1',display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0.5rem'}}>
            <div style={{display:'flex',alignItems:'center',gap:'0.75rem',padding:'0.65rem 0.875rem',background:C.inpBg,borderRadius:'10px',border:`1px solid ${C.border}`}}>
              <Toggle on={!!form.isSpecial} onChange={v=>setForm((f:any)=>({...f,isSpecial:v}))}/>
              <span style={{color:C.text,fontSize:'0.82rem',fontWeight:'600'}}>⭐ Онцлох хоол</span>
            </div>
            <div>
              <label style={LS}>Хямдрал (%)</label>
              <input type="number" min="0" max="100" value={form.discountPercent||''} onChange={e=>setForm((f:any)=>({...f,discountPercent:e.target.value}))} placeholder="0" style={IS}/>
            </div>
          </div>
          <div style={{gridColumn:'1/-1',display:'flex',alignItems:'center',gap:'0.75rem',padding:'0.75rem',background:C.inpBg,borderRadius:'10px',border:`1px solid ${C.border}`}}>
            <Toggle on={form.available!==false} onChange={v=>setForm((f:any)=>({...f,available:v}))}/>
            <span style={{color:C.text,fontSize:'0.875rem',fontWeight:'600'}}>Цэсэнд харагдах</span>
          </div>
        </div>
        {err&&<p style={{color:C.red,fontSize:'0.82rem',textAlign:'center',background:`${C.red}11`,padding:'0.5rem',borderRadius:'8px',margin:'0 0 0.875rem'}}>{err}</p>}
        <div style={{display:'flex',gap:'0.6rem'}}>
          <button onClick={onClose} style={{padding:'0.75rem 1.25rem',border:`1px solid ${C.border}`,borderRadius:'10px',background:'transparent',color:C.muted,fontWeight:'700',cursor:'pointer',fontSize:'0.875rem'}}>Болих</button>
          <button onClick={save} disabled={upl} style={{flex:1,padding:'0.75rem',background:C.orange,color:'white',border:'none',borderRadius:'10px',fontWeight:'800',cursor:'pointer',opacity:upl?0.7:1}}>{upl?'Хадгалж байна...':'✅ Хадгалах'}</button>
        </div>
      </div>
    </div>
  );
}

function StaffEditModal({branchId,s,onClose,onSaved,logAct}:{branchId:string;s:Staff;onClose:()=>void;onSaved:()=>void;logAct:(a:string,d:string)=>void}) {
  const [nm,setNm]=useState(s.name);
  const [rl,setRl]=useState<'chef'|'waiter'|'admin'>((s.role as any)||'chef');
  const [pin,setPin]=useState('');
  const [loading,setLoading]=useState(false);
  const [err,setErr]=useState('');
  const save=async()=>{
    if(!nm.trim())return setErr('Нэр оруулна уу');
    if(pin&&pin.length<4)return setErr('PIN дор хаяж 4 орон');
    setLoading(true);const d:any={name:nm.trim(),role:rl};if(pin)d.pin=pin;
    await updateStaff(branchId,s.id,d);logAct('Ажилтан засагдлаа',`${nm} (${rl})`);
    setLoading(false);onSaved();onClose();
  };
  return(
    <div onClick={onClose} style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.8)',zIndex:200,display:'flex',alignItems:'center',justifyContent:'center',padding:'1rem'}}>
      <div onClick={e=>e.stopPropagation()} style={{background:C.card,borderRadius:'16px',padding:'1.5rem',width:'100%',maxWidth:'360px',border:`1px solid ${C.border}`}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'1.25rem'}}>
          <h3 style={{color:C.yellow,fontWeight:'800',margin:0,fontSize:'1rem'}}>✏️ Ажилтан засах</h3>
          <button onClick={onClose} style={{background:C.inpBg,border:'none',color:C.muted,width:'30px',height:'30px',borderRadius:'50%',cursor:'pointer'}}>✕</button>
        </div>
        <div style={{display:'flex',flexDirection:'column' as const,gap:'0.75rem'}}>
          <div><label style={LS}>Нэр *</label><input value={nm} onChange={e=>setNm(e.target.value)} style={IS}/></div>
          <div><label style={LS}>Роль</label><CSelect value={rl} onChange={v=>setRl(v as any)} placeholder="Роль" options={[{value:'chef',label:'👨‍🍳 Тогооч'},{value:'waiter',label:'🛎️ Зөөгч'},{value:'admin',label:'🔑 Ажлын Менежер'}]}/></div>
          <div><label style={LS}>Шинэ PIN (хоосон = өөрчлөхгүй)</label><input value={pin} onChange={e=>setPin(e.target.value.replace(/\D/g,'').slice(0,8))} type="password" placeholder="••••" style={IS} inputMode="numeric"/></div>
          {err&&<p style={{color:C.red,fontSize:'0.82rem',margin:0,textAlign:'center' as const}}>{err}</p>}
          <div style={{display:'flex',gap:'0.6rem'}}>
            <button onClick={onClose} style={{padding:'0.75rem 1.25rem',border:`1px solid ${C.border}`,borderRadius:'10px',background:'transparent',color:C.muted,fontWeight:'700',cursor:'pointer'}}>Болих</button>
            <button onClick={save} disabled={loading} style={{flex:1,padding:'0.75rem',background:C.orange,color:'white',border:'none',borderRadius:'10px',fontWeight:'800',cursor:'pointer',opacity:loading?0.7:1}}>{loading?'Хадгалж байна...':'✅ Хадгалах'}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function SettingsTab({branchId,tables,managerName,onManagerNameChange,onLogAct}:{branchId:string;tables:Table[];managerName?:string;onManagerNameChange?:(n:string)=>void;onLogAct?:(a:string,d?:string)=>void}) {
  const [top,setTop]=useState('МЕНЮ');
  const [bot,setBot]=useState('⭐ Сэтгэл ханамжийн судалгаа бөглөх боломжтой');
  const [qs,setQs]=useState(DEF_Q);
  const [tc,setTc]=useState(String(tables.length||5));
  const [eQ,setEQ]=useState<{idx:number;val:string}|null>(null);
  const [nQ,setNQ]=useState('');
  const [logo,setLogo]=useState('');
  const [saved,setSaved]=useState(false);
  const [nameSaved,setNS]=useState(false);
  const [loading,setLoading]=useState(false);
  const [qrT,setQrT]=useState<number|null>(null);
  const [mgrN,setMgrN]=useState(managerName||'');
  const lRef=useRef<HTMLInputElement>(null);
  useEffect(()=>{setTc(String(tables.length||5));},[tables.length]);
  useEffect(()=>{setMgrN(managerName||'');},[managerName]);
  useEffect(()=>{getSettings(branchId).then(s=>{if(s.qrTopText)setTop(s.qrTopText);if(s.qrBottomText)setBot(s.qrBottomText);if((s as any).surveyQuestions?.length)setQs((s as any).surveyQuestions);if((s as any).brandLogo)setLogo((s as any).brandLogo);if((s as any).managerName){setMgrN((s as any).managerName);onManagerNameChange?.((s as any).managerName);}});},[branchId]);
  const saveAll=async()=>{setLoading(true);await saveSettings(branchId,{qrTopText:top,qrBottomText:bot,surveyQuestions:qs,...(logo?{brandLogo:logo}:{}),managerName:mgrN} as any);if(mgrN)onManagerNameChange?.(mgrN);setLoading(false);setSaved(true);setTimeout(()=>setSaved(false),2000);};
  // Survey questions use saveSurveyQuestions (set() instead of update()) to avoid Firebase array stale key bug
  const saveQs=async(nq:string[])=>{await saveSurveyQuestions(branchId,nq);setSaved(true);setTimeout(()=>setSaved(false),2000);};
  const prtQR=(t:number)=>{const w=window.open('','_blank');if(!w)return;const logoHtml=logo?`<img src="${logo}" style="width:60px;height:60px;object-fit:cover;border-radius:10px;margin-bottom:8px;display:block;margin-left:auto;margin-right:auto"/>`:'' ;w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><style>@page{margin:0}body{margin:0;font-family:sans-serif;background:white;display:flex;align-items:center;justify-content:center;min-height:100vh}.c{border:2px solid #f0f0f0;border-radius:16px;padding:32px 28px;max-width:280px;text-align:center;box-shadow:0 4px 16px rgba(0,0,0,0.08)}.t{font-size:1.6rem;font-weight:900;color:#F5C120;letter-spacing:0.08em;margin-bottom:4px}.s{font-size:.75rem;color:#888;margin-bottom:16px}.nm{font-size:.85rem;color:#555;margin:12px 0 2px}hr{border:none;border-top:1px solid #eee;margin:10px 0}.b{font-size:.78rem;color:#666;line-height:1.5}</style></head><body><div class="c">${logoHtml}<div class="t">${top}</div><div class="s">QR код скан хийж захиалгаа өгнө үү</div><img src="${buildQR(branchId,t)}" style="width:200px"/><div class="nm">Ширээ ${t}</div><hr/><div class="b">${bot}</div></div><script>window.onload=()=>window.print()<\/script></body></html>`);w.document.close();};
  return(
    <div>
      <div style={CS}>
        <p style={{color:C.yellow,fontWeight:'700',fontSize:'0.78rem',letterSpacing:'0.05em',textTransform:'uppercase' as const,margin:'0 0 0.6rem'}}>🏷️ РЕСТОРАН/САЛБАРЫН НЭР</p>
        <div style={{display:'flex',gap:'0.5rem'}}>
          <input value={top} onChange={e=>setTop(e.target.value)} placeholder="Ресторан нэр" style={{...IS,flex:1}}/>
          <button onClick={async()=>{await saveSettings(branchId,{qrTopText:top} as any);setNS(true);setTimeout(()=>setNS(false),2000);}} style={{padding:'0.5rem 1rem',background:nameSaved?C.green:C.orange,border:'none',borderRadius:'8px',color:'white',fontWeight:'700',cursor:'pointer',fontSize:'0.8rem',flexShrink:0,transition:'background 0.2s'}}>{nameSaved?'✓ Хадгалагдлаа':'Хадгалах'}</button>
        </div>
        <p style={{color:C.muted,fontSize:'0.7rem',margin:'0.25rem 0 0'}}>QR хэвлэлт болон sidebar-д харагдана</p>
      </div>
      <div style={CS}>
        <p style={{color:C.yellow,fontWeight:'700',fontSize:'0.78rem',letterSpacing:'0.05em',textTransform:'uppercase' as const,margin:'0 0 0.6rem'}}>🖼️ БАЙГУУЛЛАГЫН ЛОГО</p>
        {logo?<div style={{display:'flex',alignItems:'center',gap:'0.75rem',marginBottom:'0.5rem'}}>
          <img src={logo} alt="logo" style={{width:'64px',height:'64px',borderRadius:'10px',objectFit:'cover',border:`1px solid ${C.border}`}}/>
          <button onClick={()=>setLogo('')} style={{padding:'0.35rem 0.75rem',background:`${C.red}22`,border:'none',color:C.red,borderRadius:'8px',cursor:'pointer',fontSize:'0.78rem'}}>✕ Устгах</button>
          <button onClick={async()=>{await saveSettings(branchId,{brandLogo:logo} as any);setSaved(true);setTimeout(()=>setSaved(false),2000);}} style={{padding:'0.35rem 0.875rem',background:C.orange,border:'none',color:'white',borderRadius:'8px',cursor:'pointer',fontSize:'0.78rem',fontWeight:'700'}}>💾 Хадгалах</button>
        </div>
        :<div onClick={()=>lRef.current?.click()} style={{height:'64px',border:`2px dashed ${C.border}`,borderRadius:'10px',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',gap:'0.5rem',marginBottom:'0.5rem'}} onMouseOver={e=>{e.currentTarget.style.borderColor=C.yellow;}} onMouseOut={e=>{e.currentTarget.style.borderColor='rgba(255,255,255,0.08)';}}>
          <span style={{fontSize:'1.5rem'}}>🏷️</span><span style={{color:C.muted,fontSize:'0.82rem'}}>Лого зураг оруулах</span>
        </div>}
        <input ref={lRef} type="file" accept="image/*" onChange={async e=>{const f=e.target.files?.[0];if(!f)return;const b=await compressImage(f,200,0.85);setLogo(b);}} style={{display:'none'}}/>
      </div>
      <div style={CS}>
        <p style={{color:C.yellow,fontWeight:'700',fontSize:'0.78rem',letterSpacing:'0.05em',textTransform:'uppercase' as const,margin:'0 0 0.6rem'}}>🪑 ШИРЭЭНИЙ ТОО</p>
        <div style={{display:'flex',gap:'0.5rem',marginBottom:'0.875rem'}}>
          <input type="number" value={tc} onChange={e=>setTc(e.target.value)} min="1" max="200" style={{...IS,flex:1,width:'auto'}}/>
          <button onClick={async()=>{const n=parseInt(tc);if(!n)return;await setTablesDB(branchId,n);onLogAct?.(`Ширээний тоо ${n} болгон өөрчиллоо`);}} style={{padding:'0.65rem 1.25rem',background:C.orange,color:'white',border:'none',borderRadius:'8px',fontWeight:'700',cursor:'pointer',fontSize:'0.875rem'}}>Хадгалах</button>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(110px,1fr))',gap:'0.5rem'}}>
          {tables.map(t=><div key={t.id} style={{background:C.inpBg,borderRadius:'8px',padding:'0.5rem 0.75rem',border:`1px solid ${t.status==='occupied'?`${C.red}44`:`${C.green}33`}`,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <span style={{color:'rgba(255,255,255,0.8)',fontSize:'0.8rem',fontWeight:'700'}}>Ширээ {t.number}</span>
            <div style={{display:'flex',alignItems:'center',gap:'0.3rem'}}>
              <span style={{fontSize:'0.65rem',color:t.status==='occupied'?C.red:C.green,fontWeight:'700'}}>{t.status==='occupied'?'●':'○'}</span>
              <button onClick={()=>setQrT(qrT===t.number?null:t.number)} style={{background:'transparent',border:`1px solid ${C.yellow}44`,borderRadius:'4px',color:C.yellow,cursor:'pointer',fontSize:'0.62rem',padding:'0.1rem 0.3rem'}}>QR</button>
            </div>
          </div>)}
        </div>
      </div>
      <div style={CS}>
        <p style={{color:C.yellow,fontWeight:'700',fontSize:'0.78rem',letterSpacing:'0.05em',textTransform:'uppercase' as const,margin:'0 0 0.6rem'}}>📱 QR ХЭВЛЭЛТ</p>
        <div style={{marginBottom:'0.75rem'}}><label style={{...LS,marginBottom:'0.3rem',display:'block'}}>Доод хэсгийн текст</label><textarea value={bot} onChange={e=>setBot(e.target.value)} rows={2} style={{...IS,resize:'none' as const}}/></div>
        <div style={{display:'flex',gap:'0.75rem',alignItems:'center',flexWrap:'wrap' as const}}>
          <CSelect value={String(qrT||'')} onChange={v=>setQrT(Number(v)||null)} placeholder="Ширээ сонгох" options={tables.map(t=>({value:String(t.number),label:`Ширээ ${t.number}`}))} style={{width:'160px'}}/>
          {qrT&&<><button onClick={()=>prtQR(qrT!)} style={{padding:'0.6rem 1.25rem',background:C.orange,border:'none',borderRadius:'10px',color:'white',cursor:'pointer',fontWeight:'700',fontSize:'0.82rem'}}>🖨️ QR Хэвлэх</button><img src={buildQR(branchId,qrT!)} alt="" style={{width:'70px',borderRadius:'8px'}}/></>}
        </div>
      </div>
      <div style={CS}>
        <p style={{color:C.yellow,fontWeight:'700',fontSize:'0.78rem',letterSpacing:'0.05em',textTransform:'uppercase' as const,margin:'0 0 0.6rem'}}>⭐ СУДАЛГААНЫ АСУУЛТУУД</p>
        {qs.map((q,i)=>(
          <div key={i} style={{display:'flex',alignItems:'center',gap:'0.5rem',marginBottom:'0.4rem'}}>
            <span style={{color:C.muted,fontSize:'0.72rem',width:'18px',flexShrink:0}}>{i+1}.</span>
            {eQ?.idx===i
              ?<><input value={eQ.val} onChange={e=>setEQ({idx:i,val:e.target.value})} onKeyDown={async e=>{if(e.key==='Enter'){const nq=[...qs];nq[i]=eQ.val;setQs(nq);setEQ(null);await saveQs(nq);}}} style={{...IS,flex:1,padding:'0.38rem 0.65rem',fontSize:'0.82rem'}} autoFocus/>
                <button onClick={async()=>{const nq=[...qs];nq[i]=eQ.val;setQs(nq);setEQ(null);await saveQs(nq);}} style={{padding:'0.38rem 0.6rem',background:C.green,border:'none',borderRadius:'6px',color:'white',cursor:'pointer',fontSize:'0.75rem',fontWeight:'700'}}>✓</button>
                <button onClick={()=>setEQ(null)} style={{padding:'0.38rem 0.5rem',background:C.inpBg,border:`1px solid ${C.border}`,borderRadius:'6px',color:C.muted,cursor:'pointer',fontSize:'0.75rem'}}>✕</button></>
              :<><div style={{flex:1,padding:'0.38rem 0.65rem',background:C.inpBg,borderRadius:'8px',border:`1px solid ${C.border}`}}><span style={{color:'rgba(255,255,255,0.85)',fontSize:'0.82rem'}}>{q}</span></div>
                <button onClick={()=>setEQ({idx:i,val:q})} style={{padding:'0.3rem 0.5rem',background:`${C.yellow}22`,border:`1px solid ${C.yellow}44`,borderRadius:'6px',color:C.yellow,cursor:'pointer',fontSize:'0.72rem'}}>✏️</button>
                <button onClick={async()=>{if(!window.confirm('Устгах уу?'))return;const nq=qs.filter((_,j)=>j!==i);setQs(nq);await saveQs(nq);}} style={{padding:'0.3rem 0.45rem',background:`${C.red}22`,border:'none',borderRadius:'6px',color:C.red,cursor:'pointer',fontSize:'0.72rem'}}>🗑</button></>}
          </div>
        ))}
        <p style={{color:C.muted,fontSize:'0.7rem',margin:'0.35rem 0 0.5rem'}}>+ NPS (0-10) — тогтмол</p>
        <div style={{display:'flex',gap:'0.5rem'}}>
          <input value={nQ} onChange={e=>setNQ(e.target.value)} onKeyDown={async e=>{if(e.key==='Enter'&&nQ.trim()){const nq=[...qs,nQ.trim()];setQs(nq);setNQ('');await saveQs(nq);}}} placeholder="Шинэ асуулт нэмэх..." style={{...IS,flex:1,padding:'0.5rem 0.75rem',fontSize:'0.82rem'}}/>
          <button onClick={async()=>{if(nQ.trim()){const nq=[...qs,nQ.trim()];setQs(nq);setNQ('');await saveQs(nq);}}} style={{padding:'0.5rem 0.875rem',background:C.orange,border:'none',borderRadius:'8px',color:'white',cursor:'pointer',fontWeight:'700',fontSize:'0.82rem'}}>+</button>
        </div>
      </div>

      {/* Менежерийн нэр — логд харуулах */}
      <div style={CS}>
        <p style={{color:C.yellow,fontWeight:'700',fontSize:'0.78rem',textTransform:'uppercase' as const,margin:'0 0 0.75rem',letterSpacing:'0.04em'}}>👤 Менежерийн нэр (лог дээр харагдана)</p>
        <div style={{display:'flex',gap:'0.5rem'}}>
          <input value={mgrN} onChange={e=>setMgrN(e.target.value)} placeholder="Жишээ: Батаа" style={{...IS,flex:1}}/>
          <button onClick={async()=>{if(mgrN.trim()){await saveSettings(branchId,{managerName:mgrN.trim()} as any);onManagerNameChange?.(mgrN.trim());setNS(true);setTimeout(()=>setNS(false),2000);}}}
            style={{padding:'0.5rem 0.875rem',background:nameSaved?C.green:C.orange,border:'none',borderRadius:'8px',color:'white',cursor:'pointer',fontWeight:'700',fontSize:'0.82rem',minWidth:'80px'}}>
            {nameSaved?'✅':'Хадгалах'}
          </button>
        </div>
        <p style={{color:C.muted,fontSize:'0.72rem',margin:'0.35rem 0 0'}}>Лог: "<b style={{color:'rgba(255,255,255,0.6)'}}>Батаа</b> — Хоол засагдлаа — Бууз" гэж харагдана</p>
      </div>

      <button onClick={saveAll} disabled={loading} style={{width:'100%',padding:'0.875rem',background:saved?C.green:C.orange,color:'white',border:'none',borderRadius:'12px',fontWeight:'800',cursor:'pointer',fontSize:'0.9rem',transition:'background 0.2s'}}>{loading?'Хадгалж байна...':saved?'✅ Хадгалагдлаа!':'💾 Бүгдийг хадгалах'}</button>
    </div>
  );
}


function SurveyCard({s,sa,branchId,onLog}:{s:Survey;sa:boolean;branchId:string;onLog:(a:string,d:string)=>void}) {
  const [note,setNote]=useState('');
  const QS=[{k:'foodQuality',l:'Хоолны амт'},{k:'ambiance',l:'Орчин байдал'},{k:'staffAttitude',l:'Ажилтан хандлага'},{k:'priceValue',l:'Үнэ/Чанар'},{k:'service',l:'Нийт ханамж'}];
  return(
    <div style={{...CS,padding:'1.25rem'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'0.875rem'}}>
        <p style={{color:'rgba(255,255,255,0.55)',fontSize:'0.78rem',margin:0}}>{formatDate(s.createdAt)} {formatTime(s.createdAt)}</p>
        {s.phone&&<div style={{display:'flex',alignItems:'center',gap:'0.4rem',background:`${C.green}18`,border:`1px solid ${C.green}55`,borderRadius:'8px',padding:'0.35rem 0.8rem'}}><span style={{color:C.green,fontWeight:'800',fontSize:'0.85rem'}}>📞 {s.phone}</span></div>}
      </div>
      <div style={{marginBottom:'0.75rem'}}>
        {QS.filter(q=>(s as any)[q.k]).map(q=>(
          <div key={q.k} style={{display:'flex',justifyContent:'space-between',padding:'0.25rem 0',fontSize:'0.82rem',borderBottom:'1px solid rgba(255,255,255,0.05)'}}>
            <span style={{color:'rgba(255,255,255,0.75)'}}>{q.l}</span>
            <span style={{color:(s as any)[q.k]>=4?C.green:(s as any)[q.k]>=3?C.yellow:C.red,fontWeight:'800'}}>{(s as any)[q.k]}/5</span>
          </div>
        ))}
        <div style={{display:'flex',justifyContent:'space-between',padding:'0.25rem 0',fontSize:'0.82rem'}}>
          <span style={{color:'rgba(255,255,255,0.75)'}}>NPS</span>
          <span style={{color:s.nps>=9?C.green:s.nps<=6?C.red:C.yellow,fontWeight:'800'}}>{s.nps}/10</span>
        </div>
      </div>
      {s.feedback&&<div style={{background:'rgba(255,255,255,0.04)',borderRadius:'8px',padding:'0.75rem',marginBottom:'0.75rem',border:'1px solid rgba(255,255,255,0.07)'}}><p style={{color:'rgba(255,255,255,0.88)',fontSize:'0.85rem',margin:0,fontStyle:'italic'}}>"{s.feedback}"</p></div>}
      {sa&&<div style={{display:'flex',gap:'0.5rem',alignItems:'center'}}>
        <input value={note} onChange={e=>setNote(e.target.value)} placeholder="Шийдвэрлэлтийн тэмдэглэл..." style={{...IS,flex:1,padding:'0.5rem 0.75rem',fontSize:'0.82rem'}}/>
        <button onClick={async()=>{await setSurveyResolved(branchId,s.id,true,note);onLog('Гомдол шийдвэрлэгдлэв',s.phone||'');}} style={{padding:'0.5rem 1rem',background:C.green,color:'white',border:'none',borderRadius:'8px',fontWeight:'700',cursor:'pointer',fontSize:'0.8rem',whiteSpace:'nowrap' as const}}>Шийдсэн</button>
      </div>}
      {s.resolved&&<div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginTop:'0.5rem'}}>
        {s.resolvedNote&&<p style={{color:'rgba(255,255,255,0.5)',fontSize:'0.75rem',margin:0}}>📝 {s.resolvedNote}</p>}
        <button onClick={()=>setSurveyResolved(branchId,s.id,false)} style={{padding:'0.35rem 0.75rem',background:C.inpBg,border:`1px solid ${C.border}`,borderRadius:'8px',color:C.muted,cursor:'pointer',fontSize:'0.75rem'}}>Буцаах</button>
      </div>}
    </div>
  );
}
function AdminPanel({branchId,isManager,staff,license,onLogout}:{branchId:string;isManager:boolean;staff:Staff|null;license:LicenseCheck|null;onLogout:()=>void}) {
  const [tab,setTab]=useState<AdminTab>(isManager?'dashboard':'orders');
  const [surveys,setSurveys]=useState<Survey[]>([]);
  const [orders,setOrders]=useState<Order[]>([]);
  const [menuItems,setMenuItems]=useState<MenuItem[]>([]);
  const [tables,setTables]=useState<Table[]>([]);
  const [staffList,setStaffList]=useState<Staff[]>([]);
  const [cats,setCats]=useState<Category[]>([]);
  const [logs,setLogs]=useState<ActivityLog[]>([]);
  const [bName,setBName]=useState('');
  const [menuModal,setMenuModal]=useState<any>(null);
  const [delTarget,setDelTarget]=useState<string|null>(null);
  const [editStaff,setEditStaff]=useState<Staff|null>(null);
  const [nName,setNName]=useState('');
  const [nRole,setNRole]=useState<'chef'|'waiter'|'admin'>('chef');
  const [nPin,setNPin]=useState('');
  const [df,setDf]=useState<'today'|'7d'|'1m'|'3m'|'1y'>('7d');
  const pending=orders.filter(o=>o.status==='pending').length;
  const [managerName,setManagerName]=useState('');
  const managerNameRef=useRef('');
  // Ref-г state-тэй sync байлга (stale closure-аас сэргийлнэ)
  useEffect(()=>{managerNameRef.current=managerName;},[managerName]);
  const [isMainBranch,setIsMainBranch]=useState(false);
  const logAct=(a:string,d?:string)=>logActivity(branchId,isManager?(managerNameRef.current||'Менежер'):(staff?.name||'Ажилтан'),a,d||'');

  // ── Multi-branch: sibling branches + global branch filter ──
  const [siblingBranches,setSiblingBranches]=useState<Branch[]>([]);
  const mgrLicKey=useMemo(()=>localStorage.getItem('res_mgr_license_key')||'',[]);
  // Global branch filter: 'all' | branchId
  const [gbf,setGbf]=useState<string>('all');
  // Sibling branch data
  const [sibOrds,setSibOrds]=useState<Record<string,Order[]>>({});
  const [sibSrvs,setSibSrvs]=useState<Record<string,Survey[]>>({});
  const [sibStf,setSibStf]=useState<Record<string,Staff[]>>({});
  const [sibLogs,setSibLogs]=useState<Record<string,ActivityLog[]>>({});

  useEffect(()=>{
    getBranch(branchId).then(b=>b&&setBName(b.name));
    const u1=subscribeToSurveys(branchId,setSurveys);
    const u2=subscribeToOrders(branchId,setOrders);
    const u3=subscribeToMenu(branchId,setMenuItems);
    const u4=subscribeToTables(branchId,setTables);
    const u5=subscribeToLogs(branchId,setLogs);
    const u6=subscribeToCategories(branchId,setCats);
    const u7=subscribeToStaff(branchId,setStaffList);
    // Real-time settings — manager name тэр дороо ачаална
    const u9=subscribeToSettings(branchId,(s:any)=>{
      if(s.managerName){setManagerName(s.managerName);managerNameRef.current=s.managerName;}
    });
    let cancelled=false;
    let u8:()=>void=()=>{};
    if(isManager&&mgrLicKey){
      getLicense(mgrLicKey).then(lic=>{
        if(cancelled)return;
        const isMain=!lic?.branchId||lic.branchId===branchId;
        setIsMainBranch(isMain);
        if(isMain){
          u8=subscribeToBranchesByLicenseKey(mgrLicKey,(brs)=>{
            setSiblingBranches(brs.filter(b=>b.id!==branchId));
          });
        }
      });
    }
    return()=>{cancelled=true;u1();u2();u3();u4();u5();u6();u7();u8();u9();};
  },[branchId]);

  // ── Real-time лиценз шалгалт — дуусах хугацаа болоход тэр дороо хаана ──
  const [localLicense,setLocalLicense]=useState<LicenseCheck|null>(license);
  useEffect(()=>{setLocalLicense(license);},[license]);
  useEffect(()=>{
    if(!mgrLicKey||!isManager)return;
    const u=subscribeToLicense(mgrLicKey,(check)=>{
      setLocalLicense(check);
    });
    // 1 минут тутам дахин шалгана (time-based expiry)
    const timer=setInterval(()=>{
      getBranchLicenseStatus(branchId).then(setLocalLicense);
    },60000);
    return()=>{u();clearInterval(timer);};
  },[mgrLicKey,branchId,isManager]);
  useEffect(()=>{
    if(!isManager||!isMainBranch||siblingBranches.length===0)return;
    const unsubs=siblingBranches.map(b=>{
      const u1=subscribeToOrders(b.id,o=>setSibOrds(p=>({...p,[b.id]:o})));
      const u2=subscribeToSurveys(b.id,s=>setSibSrvs(p=>({...p,[b.id]:s})));
      const u3=subscribeToStaff(b.id,s=>setSibStf(p=>({...p,[b.id]:s})));
      const u4=subscribeToLogs(b.id,l=>setSibLogs(p=>({...p,[b.id]:l})));
      return[u1,u2,u3,u4];
    });
    return()=>unsubs.flat().forEach(u=>u());
  },[siblingBranches,isMainBranch]);

  // ── Effective data — isMulti зөвхөн үндсэн салбарын менежерт ──
  const isMulti=isManager&&isMainBranch&&siblingBranches.length>0;
  const allBranchOpts=useMemo(()=>[
    {id:branchId,name:bName||'Үндсэн салбар'},
    ...siblingBranches.map(b=>({id:b.id,name:b.name}))
  ],[branchId,bName,siblingBranches]);

  const effectiveSurveys=useMemo(()=>{
    if(!isMulti||gbf===branchId)return surveys;
    if(gbf==='all')return[...surveys,...Object.values(sibSrvs).flat()];
    return sibSrvs[gbf]||[];
  },[isMulti,gbf,surveys,sibSrvs,branchId]);

  const effectiveOrders=useMemo(()=>{
    if(!isMulti||gbf===branchId)return orders;
    if(gbf==='all')return[...orders,...Object.values(sibOrds).flat()];
    return sibOrds[gbf]||[];
  },[isMulti,gbf,orders,sibOrds,branchId]);

  type StaffEx=Staff&{_bn:string;_bid:string};
  const effectiveStaff=useMemo(():StaffEx[]=>{
    const cur=staffList.map(s=>({...s,_bn:bName||'',_bid:branchId}));
    if(!isMulti||gbf===branchId)return cur;
    if(gbf==='all')return[...cur,...Object.entries(sibStf as Record<string,Staff[]>).flatMap(([bid,stf])=>stf.map(s=>({...s,_bn:allBranchOpts.find(b=>b.id===bid)?.name||'',_bid:bid})))];
    return(sibStf[gbf]||[]).map(s=>({...s,_bn:allBranchOpts.find(b=>b.id===gbf)?.name||'',_bid:gbf}));
  },[isMulti,gbf,staffList,sibStf,bName,branchId,allBranchOpts]);

  const now=Date.now();
  const fms:{[k:string]:number}={today:86400000,'7d':604800000,'1m':2592000000,'3m':7776000000,'1y':31536000000};
  const effectivePending=effectiveOrders.filter(o=>o.status==='pending').length;
  const fsv=effectiveSurveys.filter(s=>(now-s.createdAt)<=fms[df]);
  const npsArr=fsv.filter(s=>s.nps>=0).map(s=>s.nps);
  const nps=npsArr.length?Math.round(((npsArr.filter(n=>n>=9).length-npsArr.filter(n=>n<=6).length)/npsArr.length)*100):null;
  const csat=fsv.length?Math.round(fsv.filter(s=>s.csat>=4).length/fsv.length*100):null;
  const oAvg=fsv.length?+(fsv.reduce((s,x)=>s+x.csat,0)/fsv.length).toFixed(1):0;
  const avg=(k:string)=>fsv.length?+(fsv.reduce((s,x)=>s+(x as any)[k]||0,0)/fsv.length).toFixed(1):0;

  const hasMultiBranch=isMulti; // зөвхөн үндсэн салбарын менежер

  // Active branch name label for display
  const gbfLabel=gbf==='all'?'Бүгд':allBranchOpts.find(b=>b.id===gbf)?.name||'';
  // Which branchId to use for actions
  const activeBranchId=gbf==='all'||gbf===branchId?branchId:gbf;

  const NAV=[
    ...(hasMultiBranch?[{id:'multibranch',label:'Бүх салбар нэгтгэж харах',icon:'🏢',mo:true}]:[]),
    {id:'dashboard',label:'Үнэлгээний Дашбоард',icon:'📊',mo:true},
    {id:'complaints',label:'Санал хүсэлт',icon:'📞',mo:true},
    {id:'menu',label:'Хоолны цэс удирдах',icon:'🍽️',mo:true},
    {id:'categories',label:'Ангилал удирдах',icon:'🏷️',mo:true},
    {id:'orders',label:`Ширээний захиалгууд${effectivePending>0?` (${effectivePending})`:''}`,icon:'📋',mo:false},
    {id:'sales',label:'Борлуулалтын тайлан',icon:'💰',mo:true},
    {id:'staff',label:'Ажилтан & ПИН',icon:'👤',mo:true},
    {id:'settings',label:'Тохиргоо & QR',icon:'⚙️',mo:true},
    {id:'logs',label:'Үйл ажиллагааны лог',icon:'📜',mo:true},
  ] as const;

  const [cTab,setCTab]=useState<'p'|'r'|'a'>('p');
  const [surveyDf,setSurveyDf]=useState<'7d'|'14d'|'1m'|'custom'>('7d');
  const [surveyFrom,setSurveyFrom]=useState('');
  const [surveyTo,setSurveyTo]=useState('');

  // Date-filtered surveys for complaints (uses effectiveSurveys)
  const filteredSurveys=useMemo(()=>{
    if(surveyDf==='custom'&&surveyFrom&&surveyTo){
      const from=new Date(surveyFrom).getTime();
      const to=new Date(surveyTo).getTime()+86399999;
      return effectiveSurveys.filter(s=>s.createdAt>=from&&s.createdAt<=to);
    }
    const ms:Record<string,number>={'7d':604800000,'14d':1209600000,'1m':2592000000};
    return effectiveSurveys.filter(s=>(now-s.createdAt)<=(ms[surveyDf]||604800000));
  },[effectiveSurveys,surveyDf,surveyFrom,surveyTo,now]);

  const expSurveysXLSX=()=>{
    const rows=filteredSurveys.map(s=>({
      'Огноо':formatDate(s.createdAt),
      'Цаг':formatTime(s.createdAt),
      'Ширээ':s.tableNumber,
      'Хоолны амт':s.foodQuality,
      'Орчин':s.ambiance,
      'Ажилтан':s.staffAttitude,
      'Үнэ/Чанар':s.priceValue,
      'Үйлчилгээ':s.service,
      'CSAT':s.csat,
      'NPS':s.nps,
      'Санал':s.feedback||'',
      'Утас':s.phone||'',
      'Шийдвэрлэсэн':s.resolved?'Тийм':'Үгүй',
    }));
    const ws=XLSX.utils.json_to_sheet(rows);
    const wb=XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb,ws,'Санал хүсэлт');
    XLSX.writeFile(wb,`survey_${new Date().toLocaleDateString('mn-MN').replace(/\//g,'-')}.xlsx`);
  };

  // Complaints — enriched with branch name for multi-branch mode
  const filtSrvEnriched=filteredSurveys.map(s=>{
    if(!isMulti||gbf===branchId)return{...s,_bn:''};
    if(gbf==='all'){
      if(surveys.find(x=>x.id===s.id))return{...s,_bn:bName||''};
      const bid=Object.entries(sibSrvs as Record<string,Survey[]>).find(([,arr])=>arr.find(x=>x.id===s.id))?.[0];
      return{...s,_bn:allBranchOpts.find(b=>b.id===bid)?.name||''};
    }
    return{...s,_bn:allBranchOpts.find(b=>b.id===gbf)?.name||''};
  });
  const wPhone=filtSrvEnriched.filter(s=>s.phone&&s.phone.trim());
  const cpd=wPhone.filter(s=>!s.resolved),crs=wPhone.filter(s=>s.resolved),can=filteredSurveys.filter(s=>!s.phone||!s.phone.trim());


  // SCard is defined outside AdminPanel (see below)

  const curSurveys=cTab==='p'?cpd:cTab==='r'?crs:can;

  const [showSidebar,setShowSidebar]=useState(false);
  const mob=typeof window!=='undefined'&&window.innerWidth<768;

  return(
    <div style={{minHeight:'100vh',background:C.bg,display:'flex'}}>
      {/* ── MOBILE OVERLAY ── */}
      {mob&&showSidebar&&<div onClick={()=>setShowSidebar(false)} style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.65)',zIndex:40}}/>}

      {/* ── SIDEBAR ── */}
      <div style={{
        width:'220px',background:C.sidebar,borderRight:`1px solid ${C.border}`,
        display:'flex',flexDirection:'column' as const,flexShrink:0,
        position:mob?'fixed' as const:'sticky' as const,
        top:0,left:mob?(showSidebar?0:-225):0,
        height:'100vh',overflowY:'auto' as const,
        zIndex:mob?50:1,
        transition:mob?'left 0.22s ease':'none',
      }}>
        <div style={{padding:'1.25rem 1rem',borderBottom:`1px solid ${C.border}`,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <div>
            <p style={{color:C.yellow,fontWeight:'800',fontSize:'0.85rem',letterSpacing:'0.06em',margin:0}}>{bName.toUpperCase()||'РЕСТОРАН'}</p>
            <p style={{color:C.muted,fontSize:'0.7rem',margin:'0.2rem 0 0'}}>{isManager?'👔 Менежер':staff?.role==='admin'?'🔑 Ажлын Менежер':staff?.role==='chef'?'👨‍🍳 Тогооч':'🛎️ Зөөгч'}</p>
          </div>
          {mob&&<button onClick={()=>setShowSidebar(false)} style={{background:'none',border:'none',color:C.muted,fontSize:'1.3rem',cursor:'pointer',padding:'0.2rem'}}>✕</button>}
        </div>
        <nav style={{flex:1,padding:'0.5rem 0'}}>
          {NAV.filter(n=>isManager||!n.mo).map(n=>(
            <button key={n.id} onClick={()=>{setTab(n.id as AdminTab);if(mob)setShowSidebar(false);}} style={{width:'100%',padding:'0.7rem 1rem',border:'none',background:tab===n.id?`${C.orange}22`:'transparent',color:tab===n.id?C.yellow:C.muted,fontWeight:tab===n.id?'700':'500',cursor:'pointer',textAlign:'left' as const,fontSize:'0.82rem',display:'flex',alignItems:'center',gap:'0.6rem',borderLeft:tab===n.id?`3px solid ${C.orange}`:'3px solid transparent',transition:'all 0.15s'}}>
              <span>{n.icon}</span><span style={{flex:1}}>{n.label}</span>
            </button>
          ))}
        </nav>
        {localLicense!==null&&<div style={{margin:'0.5rem 1rem 0',padding:'0.6rem 0.75rem',borderRadius:'8px',background:localLicense.valid?(localLicense.status==='trial'?`${C.yellow}18`:`${C.green}18`):`${C.red}18`,border:`1px solid ${localLicense.valid?(localLicense.status==='trial'?`${C.yellow}44`:`${C.green}44`):`${C.red}44`}`}}>
          <p style={{color:localLicense.valid?(localLicense.status==='trial'?C.yellow:C.green):C.red,fontSize:'0.75rem',fontWeight:'800',margin:0,lineHeight:1.3}}>{localLicense.message||'Шалгаж байна...'}</p>
        </div>}
        <button onClick={onLogout} style={{margin:'0.5rem 1rem 1rem',padding:'0.6rem',background:C.inpBg,border:`1px solid ${C.border}`,borderRadius:'8px',color:C.muted,cursor:'pointer',fontSize:'0.8rem',fontWeight:'600',display:'flex',alignItems:'center',justifyContent:'center',gap:'0.4rem'}}>↪ Гарах</button>
      </div>

      {/* ── MAIN CONTENT ── */}
      <div style={{flex:1,minWidth:0,display:'flex',flexDirection:'column' as const,overflow:'hidden'}}>
        {/* Mobile top bar */}
        {mob&&<div style={{background:C.sidebar,borderBottom:`1px solid ${C.border}`,padding:'0.65rem 1rem',paddingTop:'calc(0.65rem + env(safe-area-inset-top, 0px))',display:'flex',alignItems:'center',gap:'0.75rem',position:'sticky' as const,top:0,zIndex:10,flexShrink:0}}>
          <button onClick={()=>setShowSidebar(true)} style={{background:'none',border:'none',color:C.yellow,fontSize:'1.5rem',cursor:'pointer',padding:0,lineHeight:1,touchAction:'manipulation' as any}}>☰</button>
          <p style={{color:C.yellow,fontWeight:'800',fontSize:'0.82rem',margin:0,flex:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' as const}}>{bName.toUpperCase()||'РЕСТОРАН'}</p>
          <span style={{color:C.muted,fontSize:'0.72rem'}}>{NAV.find(n=>n.id===tab)?.label}</span>
        </div>}
        <div style={{flex:1,padding:mob?'0.875rem':'1.25rem 1.5rem',overflowY:'auto' as const}}>
        <div style={{maxWidth:'960px',margin:'0 auto'}}>
        {(localLicense!==null&&!localLicense.valid)&&<div style={{textAlign:'center' as const,padding:'4rem 2rem'}}>
          <div style={{fontSize:'4rem',marginBottom:'1rem'}}>🔒</div>
          <h2 style={{color:C.red,fontWeight:'800',marginBottom:'0.75rem',fontSize:'1.2rem'}}>{localLicense.message}</h2>
          <p style={{color:C.muted,fontSize:'0.875rem',marginBottom:'1.5rem',lineHeight:1.6}}>
            {localLicense.status==='none'?'Энэ салбарт лиценз холбоогүй байна.':
             localLicense.status==='blocked'?'Лиценз хаагдсан байна. Системийн удирдагчтай холбоо барина уу.':
             '⏰ Лицензийн хугацаа дууссан байна. Сунгуулахын тулд холбоо барина уу.'}
          </p>
          <button onClick={onLogout} style={{padding:'0.75rem 2rem',background:C.red,color:'white',border:'none',borderRadius:'10px',fontWeight:'700',cursor:'pointer',fontSize:'0.9rem'}}>
            ↩ Гарах
          </button>
        </div>}
        {(localLicense===null||localLicense.valid)&&<>

          {/* ── GLOBAL BRANCH FILTER (multi-branch managers only) ── */}
          {isMulti&&tab!=='multibranch'&&tab!=='settings'&&tab!=='logs'&&<div style={{background:'rgba(255,255,255,0.03)',border:`1px solid ${C.border}`,borderRadius:'12px',padding:'0.5rem 0.75rem',marginBottom:'0.875rem',display:'flex',gap:'0.5rem',flexWrap:'wrap' as const,alignItems:'center'}}>
            <span style={{color:C.muted,fontSize:'0.7rem',fontWeight:'600',marginRight:'0.25rem'}}>🏢 Салбар:</span>
            {[{id:'all',name:'Бүгд'},...allBranchOpts].map(b=>(
              <button key={b.id} onClick={()=>setGbf(b.id)}
                style={{padding:'0.25rem 0.7rem',borderRadius:'20px',border:`1px solid ${gbf===b.id?C.orange:C.border}`,background:gbf===b.id?`${C.orange}22`:'transparent',color:gbf===b.id?C.orange:C.muted,fontWeight:gbf===b.id?'700':'500',cursor:'pointer',fontSize:'0.73rem',whiteSpace:'nowrap' as const}}>
                {b.name}{b.id===branchId&&b.id!=='all'?' ✓':''}
              </button>
            ))}
            {gbf!=='all'&&<span style={{color:C.muted,fontSize:'0.68rem',marginLeft:'auto'}}>📍 {gbfLabel}</span>}
          </div>}

          {tab==='multibranch'&&<MultiBranchTab
            currentBranchId={branchId}
            currentBranchName={bName}
            siblingBranches={siblingBranches}
            currentOrders={orders}
            currentSurveys={surveys}
          />}

          {tab==='dashboard'&&<>
            <div style={{display:'flex',gap:'0.5rem',marginBottom:'1.25rem',flexWrap:'wrap' as const}}>
              {[{k:'today',l:'Өнөөдөр'},{k:'7d',l:'7 хоног'},{k:'1m',l:'1 сар'},{k:'3m',l:'3 сар'},{k:'1y',l:'1 жил'}].map(f=>(
                <button key={f.k} onClick={()=>setDf(f.k as any)} style={{padding:'0.4rem 0.875rem',borderRadius:'20px',border:`1px solid ${df===f.k?C.yellow:C.border}`,background:df===f.k?`${C.yellow}22`:'transparent',color:df===f.k?C.yellow:C.muted,fontWeight:df===f.k?'700':'500',cursor:'pointer',fontSize:'0.8rem'}}>{f.l}</button>
              ))}
            </div>
            {/* CSAT / NPS тайлбар */}
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0.6rem',marginBottom:'1rem'}}>
              <div style={{background:'rgba(59,130,246,0.08)',border:'1px solid rgba(59,130,246,0.25)',borderRadius:'10px',padding:'0.75rem 1rem'}}>
                <p style={{color:'#60a5fa',fontWeight:'700',fontSize:'0.75rem',margin:'0 0 0.3rem',letterSpacing:'0.04em'}}>📊 CSAT гэж юу вэ?</p>
                <p style={{color:'rgba(255,255,255,0.6)',fontSize:'0.7rem',margin:0,lineHeight:1.5}}>Customer Satisfaction — 4-5 оноо өгсөн хэрэглэгчийн хувь. <b style={{color:'#60a5fa'}}>80%+</b> маш сайн, <b style={{color:C.yellow}}>60-79%</b> дундаж, <b style={{color:C.red}}>&lt;60%</b> сайжруулах шаардлагатай.</p>
              </div>
              <div style={{background:'rgba(16,185,129,0.08)',border:'1px solid rgba(16,185,129,0.25)',borderRadius:'10px',padding:'0.75rem 1rem'}}>
                <p style={{color:'#34d399',fontWeight:'700',fontSize:'0.75rem',margin:'0 0 0.3rem',letterSpacing:'0.04em'}}>📈 NPS гэж юу вэ?</p>
                <p style={{color:'rgba(255,255,255,0.6)',fontSize:'0.7rem',margin:0,lineHeight:1.5}}>Net Promoter Score — санал болгогч (9-10) − шүүмжлэгч (0-6). <b style={{color:'#34d399'}}>+50</b> маш сайн, <b style={{color:C.yellow}}>0-49</b> дундаж, <b style={{color:C.red}}>&lt;0</b> сайжруулна.</p>
              </div>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))',gap:'0.75rem',marginBottom:'1.25rem'}}>
              {[
                {l:'CSAT',v:csat!==null?`${csat}%`:'–',c:csat===null?C.muted:csat>=80?C.green:csat>=60?C.orange:C.red,desc:csat===null?'':csat>=80?'Маш сайн 🟢':csat>=60?'Дундаж 🟡':csat>=40?'Анхаар 🟠':'Муу 🔴'},
                {l:'NPS ОНОО',v:nps!==null?`${nps>0?'+':''}${nps}`:'–',c:nps===null?C.muted:nps>=50?C.green:nps>=0?C.orange:C.red,desc:nps===null?'':nps>=50?'Маш сайн 🟢':nps>=0?'Дундаж 🟡':'Сайжруулна 🔴'},
                {l:'ЕРӨНХИЙ',v:oAvg?`${oAvg}/5`:'–',c:oAvg>=4?C.green:oAvg>=3?C.orange:oAvg>0?C.red:C.muted,desc:oAvg>=4?'Сайн 🟢':oAvg>=3?'Дундаж 🟡':oAvg>0?'Муу 🔴':''},
                {l:'ХАРИУЛТ',v:String(fsv.length),c:C.yellow,desc:fsv.length>=10?'Хангалттай':fsv.length>=5?'Дундаж':'Цөөн'}
              ].map(s=>(
                <div key={s.l} style={{...CS,marginBottom:0}}>
                  <p style={{color:C.muted,fontSize:'0.65rem',letterSpacing:'0.06em',margin:'0 0 0.4rem',textTransform:'uppercase' as const}}>{s.l}</p>
                  <p style={{color:s.c,fontSize:'1.8rem',fontWeight:'900',margin:'0 0 0.2rem',lineHeight:1}}>{s.v}</p>
                  {s.desc&&<p style={{color:s.c,fontSize:'0.68rem',fontWeight:'600',margin:0,opacity:0.85}}>{s.desc}</p>}
                </div>
              ))}
            </div>
            <div style={CS}>
              <p style={{color:C.text,fontWeight:'800',fontSize:'0.82rem',letterSpacing:'0.04em',margin:'0 0 1rem',textTransform:'uppercase' as const}}>📊 Талбар бүрийн дундаж</p>
              {[{k:'foodQuality',l:'Хоолны амт, чанар',c:'#818cf8'},{k:'ambiance',l:'Орчин, цэвэр байдал',c:'#f472b6'},{k:'staffAttitude',l:'Ажилтан хандлага',c:'#34d399'},{k:'priceValue',l:'Үнэ өртөг/Чанар',c:'#fbbf24'},{k:'service',l:'Нийт ханамж',c:'#22d3ee'}].map(q=>{
                const a=avg(q.k);
                return(
                  <div key={q.k} style={{marginBottom:'0.875rem'}}>
                    <div style={{display:'flex',justifyContent:'space-between',marginBottom:'0.3rem'}}>
                      <span style={{color:C.muted,fontSize:'0.82rem'}}>{q.l}</span>
                      <span style={{color:C.text,fontWeight:'700',fontSize:'0.82rem'}}>{a||'–'}</span>
                    </div>
                    <div style={{height:'8px',background:C.inpBg,borderRadius:'4px',overflow:'hidden'}}><div style={{height:'100%',width:`${(a/5)*100}%`,background:q.c,borderRadius:'4px',transition:'width 0.3s'}}/></div>
                  </div>
                );
              })}
            </div>
            <div style={CS}>
              <p style={{color:C.yellow,fontWeight:'700',fontSize:'0.78rem',letterSpacing:'0.04em',textTransform:'uppercase' as const,margin:'0 0 0.75rem'}}>💰 Борлуулалтын товч</p>
              {isMulti&&gbf==='all'
                ?<DashSalesInline orders={effectiveOrders} fromMs={now-fms[df]}/>
                :<DashSales branchId={isMulti&&gbf!=='all'&&gbf!==branchId?gbf:branchId} fromMs={now-fms[df]}/>}
            </div>
          </>}

          {tab==='complaints'&&<>
            {/* Огнооны шүүлт */}
            <div style={{display:'flex',gap:'0.4rem',marginBottom:'0.75rem',flexWrap:'wrap' as const,alignItems:'center'}}>
              {[{k:'7d',l:'7 хоног'},{k:'14d',l:'14 хоног'},{k:'1m',l:'1 сар'},{k:'custom',l:'Тусгай'}].map(f=>(
                <button key={f.k} onClick={()=>setSurveyDf(f.k as any)} style={{padding:'0.38rem 0.75rem',borderRadius:'20px',border:`1px solid ${surveyDf===f.k?C.yellow:C.border}`,background:surveyDf===f.k?`${C.yellow}22`:'transparent',color:surveyDf===f.k?C.yellow:C.muted,fontWeight:surveyDf===f.k?'700':'500',cursor:'pointer',fontSize:'0.75rem'}}>{f.l}</button>
              ))}
              {surveyDf==='custom'&&<>
                <input type="date" value={surveyFrom} onChange={e=>setSurveyFrom(e.target.value)} style={{...IS,width:'140px',padding:'0.38rem 0.6rem',fontSize:'0.78rem'}}/>
                <span style={{color:C.muted}}>—</span>
                <input type="date" value={surveyTo} onChange={e=>setSurveyTo(e.target.value)} style={{...IS,width:'140px',padding:'0.38rem 0.6rem',fontSize:'0.78rem'}}/>
              </>}
              <button onClick={expSurveysXLSX} disabled={filteredSurveys.length===0} style={{marginLeft:'auto',padding:'0.38rem 0.875rem',background:`${C.green}22`,border:`1px solid ${C.green}44`,borderRadius:'8px',color:C.green,cursor:'pointer',fontSize:'0.75rem',fontWeight:'700',opacity:filteredSurveys.length===0?0.5:1}}>📊 XLSX татах</button>
            </div>
            <div style={{display:'flex',gap:'0.5rem',marginBottom:'1.25rem',flexWrap:'wrap' as const}}>
              {[{id:'p',l:`🔴 Хүлээгдэж буй`,n:cpd.length,c:C.orange},{id:'r',l:`✅ Шийдвэрлэсэн`,n:crs.length,c:C.green},{id:'a',l:`💬 Аноним`,n:can.length,c:C.muted}].map(t=>(
                <button key={t.id} onClick={()=>setCTab(t.id as any)} style={{padding:'0.5rem 1.1rem',borderRadius:'20px',border:`1px solid ${cTab===t.id?t.c:C.border}`,background:cTab===t.id?`${t.c}22`:'transparent',color:cTab===t.id?t.c:C.muted,fontWeight:cTab===t.id?'700':'500',cursor:'pointer',fontSize:'0.82rem',display:'flex',alignItems:'center',gap:'0.35rem'}}>
                  {t.l} <span style={{background:`${t.c}33`,borderRadius:'20px',padding:'0 0.4rem',fontSize:'0.72rem',fontWeight:'700'}}>{t.n}</span>
                </button>
              ))}
            </div>
            {curSurveys.length===0?<div style={{textAlign:'center',padding:'3rem',color:C.muted}}><div style={{fontSize:'3rem'}}>💬</div><p>Санал байхгүй</p></div>:curSurveys.map(s=><div key={s.id}><SurveyCard s={s} sa={cTab==='p'} branchId={branchId} onLog={(a,d)=>logAct(a,d)}/></div>)}
          </>}

          {tab==='menu'&&<>
            {isMulti&&<div style={{background:'rgba(255,255,255,0.03)',border:`1px solid ${C.border}`,borderRadius:'10px',padding:'0.5rem 0.75rem',marginBottom:'0.75rem',display:'flex',gap:'0.5rem',flexWrap:'wrap' as const,alignItems:'center'}}>
              <span style={{color:C.muted,fontSize:'0.72rem',fontWeight:'600'}}>🏢 Цэс харах салбар:</span>
              {[{id:branchId,name:bName||'Үндсэн'},...siblingBranches].map(b=>(
                <button key={b.id} onClick={()=>setGbf(b.id)}
                  style={{padding:'0.22rem 0.6rem',borderRadius:'16px',border:`1px solid ${gbf===b.id?C.yellow:C.border}`,background:gbf===b.id?`${C.yellow}22`:'transparent',color:gbf===b.id?C.yellow:C.muted,fontSize:'0.72rem',fontWeight:gbf===b.id?'700':'400',cursor:'pointer'}}>
                  {b.name}{b.id===branchId?' ✓':''}
                </button>
              ))}
            </div>}
            <MenuTab branchId={isMulti&&gbf!=='all'&&gbf!==branchId?gbf:branchId} onEdit={item=>setMenuModal({id:item.id,name:item.name,category:item.category,price:String(item.price),description:item.description||'',allergens:(item as any).allergens||'',available:item.available,image:item.image||'',isSpecial:!!(item as any).isSpecial,discountPercent:String((item as any).discountPercent||'')})} onDel={id=>setDelTarget(id)} onNew={()=>setMenuModal({name:'',category:'',price:'',description:'',allergens:'',available:true,image:'',isSpecial:false,discountPercent:''})} logAct={(a,d)=>logAct(a,d)}/>
          </>}

          {tab==='categories'&&<>
            {isMulti&&<div style={{background:'rgba(255,255,255,0.03)',border:`1px solid ${C.border}`,borderRadius:'10px',padding:'0.5rem 0.75rem',marginBottom:'0.75rem',display:'flex',gap:'0.5rem',flexWrap:'wrap' as const,alignItems:'center'}}>
              <span style={{color:C.muted,fontSize:'0.72rem',fontWeight:'600'}}>🏢 Ангилал харах салбар:</span>
              {[{id:branchId,name:bName||'Үндсэн'},...siblingBranches].map(b=>(
                <button key={b.id} onClick={()=>setGbf(b.id)}
                  style={{padding:'0.22rem 0.6rem',borderRadius:'16px',border:`1px solid ${gbf===b.id?C.orange:C.border}`,background:gbf===b.id?`${C.orange}22`:'transparent',color:gbf===b.id?C.orange:C.muted,fontSize:'0.72rem',fontWeight:gbf===b.id?'700':'400',cursor:'pointer'}}>
                  {b.name}{b.id===branchId?' ✓':''}
                </button>
              ))}
            </div>}
            <CatTab branchId={isMulti&&gbf!=='all'&&gbf!==branchId?gbf:branchId} logAct={(a,d)=>logAct(a,d)}/>
          </>}

          {tab==='orders'&&<OrdersKitchenView orders={effectiveOrders} branchId={activeBranchId} showBranchName={isMulti&&gbf==='all'} branchNames={Object.fromEntries(allBranchOpts.map(b=>[b.id,b.name]))} currentBranchId={branchId}/>}

          {tab==='sales'&&(isMulti&&gbf==='all'
            ?<MultiSalesView allBranchOpts={allBranchOpts} currentBranchId={branchId} sibOrds={sibOrds} currentOrders={orders}/>
            :<SalesTab branchId={isMulti&&gbf!=='all'?gbf:branchId}/>
          )}

          {tab==='staff'&&<>
            {/* Add staff: only for current branch or selected specific branch */}
            {(!isMulti||gbf!=='all')&&<div style={CS}>
              <p style={{color:C.yellow,fontWeight:'700',fontSize:'0.78rem',letterSpacing:'0.04em',textTransform:'uppercase' as const,margin:'0 0 0.875rem'}}>➕ Шинэ ажилтан нэмэх {isMulti&&gbf!=='all'&&<span style={{color:C.orange,fontWeight:'600',fontSize:'0.72rem'}}>({gbfLabel})</span>}</p>
              <div style={{display:'flex',flexDirection:'column' as const,gap:'0.6rem'}}>
                <input value={nName} onChange={e=>setNName(e.target.value)} placeholder="Нэр" style={IS}/>
                <CSelect value={nRole} onChange={v=>setNRole(v as any)} placeholder="Роль" options={[{value:'chef',label:'👨‍🍳 Тогооч'},{value:'waiter',label:'🛎️ Зөөгч'},{value:'admin',label:'🔑 Ажлын Менежер'}]}/>
                <input value={nPin} onChange={e=>setNPin(e.target.value.replace(/\D/g,''))} type="password" placeholder="PIN (4+)" style={IS} inputMode="numeric"/>
                <button onClick={async()=>{if(!nName||!nPin||nPin.length<4)return;await addStaff(activeBranchId,nName,nRole,nPin);await logAct('Ажилтан нэмлээ',`${nName} (${nRole})`);setNName('');setNPin('');}} style={{padding:'0.7rem',background:C.orange,color:'white',border:'none',borderRadius:'8px',fontWeight:'700',cursor:'pointer'}}>➕ Нэмэх</button>
              </div>
            </div>}
            {isMulti&&gbf==='all'&&<div style={{background:'rgba(59,130,246,0.08)',border:'1px solid rgba(59,130,246,0.2)',borderRadius:'10px',padding:'0.6rem 0.875rem',marginBottom:'0.875rem',fontSize:'0.78rem',color:'rgba(147,197,253,0.9)'}}>
              ℹ️ Ажилтан нэмэх бол дээрх шүүлтрээс тухайн салбарыг сонгоно уу.
            </div>}
            {effectiveStaff.map(s=>{
              const active=(s as any).active!==false;
              const ri=s.role==='admin'?'🔑':s.role==='chef'?'👨‍🍳':'🛎️';
              const rl=s.role==='admin'?'Ажлын Менежер':s.role==='chef'?'Тогооч':'Зөөгч';
              const sBid=(s as any)._bid||branchId;
              const sBn=(s as any)._bn||'';
              return(
                <div key={`${sBid}_${s.id}`} style={{...CS,opacity:active?1:0.55}}>
                  <div style={{display:'flex',alignItems:'center',gap:'0.75rem'}}>
                    <div style={{width:'42px',height:'42px',borderRadius:'50%',background:C.inpBg,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'1.3rem'}}>{ri}</div>
                    <div style={{flex:1}}>
                      <p style={{fontWeight:'700',color:active?C.text:C.muted,margin:'0 0 0.1rem'}}>{s.name}</p>
                      <div style={{display:'flex',alignItems:'center',gap:'0.4rem',flexWrap:'wrap' as const}}>
                        <span style={{fontSize:'0.72rem',color:C.muted}}>{rl}{!active?' · Идэвхгүй':''}</span>
                        {isMulti&&gbf==='all'&&sBn&&<span style={{fontSize:'0.62rem',background:`${C.orange}22`,color:C.orange,padding:'0.1rem 0.4rem',borderRadius:'6px',fontWeight:'600'}}>📍 {sBn}</span>}
                      </div>
                    </div>
                    <div style={{display:'flex',gap:'0.4rem',alignItems:'center'}}>
                      {sBid===branchId&&<>
                        <button onClick={()=>setEditStaff(s)} style={{padding:'0.4rem 0.8rem',background:C.yellow,border:'none',borderRadius:'8px',color:'#1a1a1e',cursor:'pointer',fontSize:'0.78rem',fontWeight:'800'}}>✏️ Засах</button>
                        <Toggle on={active} onChange={async()=>{await updateStaff(sBid,s.id,{active:!active});await logAct(`Ажилтан ${active?'хаагдлаа':'нээгдлэв'}`,s.name);}}/>
                        <button onClick={async()=>{if(!window.confirm(`${s.name}-г устгах уу?`))return;await removeStaff(sBid,s.id);await logAct('Ажилтан устгасан',s.name);}} style={{padding:'0.4rem 0.6rem',background:`${C.red}22`,border:'none',color:C.red,borderRadius:'8px',cursor:'pointer',fontSize:'0.78rem'}}>🗑</button>
                      </>}
                      {sBid!==branchId&&<span style={{fontSize:'0.72rem',color:C.muted}}>← Тус салбарыг сонгоно уу</span>}
                    </div>
                  </div>
                </div>
              );
            })}
            {!effectiveStaff.length&&<p style={{textAlign:'center' as const,color:C.muted,padding:'2rem'}}>Ажилтан байхгүй</p>}
          </>}

          {tab==='settings'&&<SettingsTab branchId={branchId} tables={tables} managerName={managerName} onManagerNameChange={setManagerName} onLogAct={(a,d)=>logAct(a,d)}/>}
          {tab==='logs'&&<LogsTab logs={logs} sibLogs={sibLogs} siblingBranches={siblingBranches} branchId={branchId} bName={bName} isMulti={isMulti}/>}
        </>}
        </div>
      </div>
      {menuModal&&<MenuModal branchId={activeBranchId} init={menuModal} cats={cats} onClose={()=>setMenuModal(null)} logAct={(a,d)=>logAct(a,d)}/>}
      {editStaff&&<StaffEditModal branchId={branchId} s={editStaff} onClose={()=>setEditStaff(null)} onSaved={()=>{}} logAct={(a,d)=>logAct(a,d)}/>}
      {delTarget&&<div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.8)',zIndex:100,display:'flex',alignItems:'center',justifyContent:'center',padding:'1rem'}}>
        <div style={{background:C.card,borderRadius:'20px',padding:'1.5rem',maxWidth:'300px',width:'100%',textAlign:'center' as const,border:`1px solid ${C.border}`}}>
          <div style={{fontSize:'2.5rem',marginBottom:'0.75rem'}}>🗑️</div>
          <p style={{fontWeight:'800',color:C.text,margin:'0 0 0.5rem'}}>Устгах уу?</p>
          <p style={{color:C.muted,fontSize:'0.875rem',margin:'0 0 1.25rem'}}>Буцаах боломжгүй.</p>
          <div style={{display:'flex',gap:'0.75rem'}}>
            <button onClick={()=>setDelTarget(null)} style={{flex:1,padding:'0.75rem',border:`1px solid ${C.border}`,borderRadius:'10px',background:'transparent',color:C.muted,fontWeight:'700',cursor:'pointer'}}>Болих</button>
            <button onClick={async()=>{if(delTarget){const it=menuItems.find(i=>i.id===delTarget);await deleteMenuItem(branchId,delTarget);await logAct('Хоол устгасан',it?.name||'');}setDelTarget(null);}} style={{flex:1,padding:'0.75rem',background:C.red,color:'white',border:'none',borderRadius:'10px',fontWeight:'800',cursor:'pointer'}}>Устгах</button>
          </div>
        </div>
      </div>}
        </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════
// MULTI-BRANCH CONSOLIDATED VIEW
// ══════════════════════════════════════════════════════════
function BranchStatCard({branchId,branchName,isCurrent,currentOrders,currentSurveys,filterMs}:{branchId:string;branchName:string;isCurrent:boolean;currentOrders?:Order[];currentSurveys?:Survey[];filterMs:number}) {
  const [orders,setOrders]=useState<Order[]>(currentOrders||[]);
  const [surveys,setSurveys]=useState<Survey[]>(currentSurveys||[]);

  useEffect(()=>{
    if(isCurrent)return;
    const u1=subscribeToOrders(branchId,setOrders);
    const u2=subscribeToSurveys(branchId,setSurveys);
    return()=>{u1();u2();};
  },[branchId,isCurrent]);

  useEffect(()=>{if(isCurrent&&currentOrders)setOrders(currentOrders);},[currentOrders]);
  useEffect(()=>{if(isCurrent&&currentSurveys)setSurveys(currentSurveys);},[currentSurveys]);

  const now=Date.now();
  const todayStart=new Date();todayStart.setHours(0,0,0,0);

  // Filtered by selected period
  const filtOrd=filterMs===86400000
    ?orders.filter(o=>o.createdAt>=todayStart.getTime())
    :orders.filter(o=>(now-o.createdAt)<=filterMs);
  const filtSrv=filterMs===86400000
    ?surveys.filter(s=>s.createdAt>=todayStart.getTime())
    :surveys.filter(s=>(now-s.createdAt)<=filterMs);

  const revenue=filtOrd.filter(o=>o.status==='served').reduce((s,o)=>s+o.totalAmount,0);
  const activeOrders=orders.filter(o=>o.status!=='served').length;

  // 🔴 Slow orders: pending/preparing > 15 min
  const SLOW=15*60*1000;
  const slowOrders=orders.filter(o=>(o.status==='pending'||o.status==='preparing')&&(now-o.createdAt)>SLOW);

  // ⚠️ Unresolved complaints (with phone number, not resolved)
  const unresolvedComplaints=surveys.filter(s=>s.phone&&s.phone.trim()&&!s.resolved).length;

  const csat=filtSrv.length?Math.round(filtSrv.filter(s=>s.csat>=4).length/filtSrv.length*100):null;
  const avgScore=filtSrv.length?+(filtSrv.reduce((s,x)=>s+x.csat,0)/filtSrv.length).toFixed(1):null;

  // NPS calculation
  const npsArr=filtSrv.filter(s=>s.nps>=0).map(s=>s.nps);
  const npsScore=npsArr.length?Math.round(((npsArr.filter(n=>n>=9).length-npsArr.filter(n=>n<=6).length)/npsArr.length)*100):null;

  const hasAlerts=slowOrders.length>0||unresolvedComplaints>0;

  return(
    <div style={{background:isCurrent?`${C.orange}09`:C.card,border:`1.5px solid ${isCurrent?C.orange:hasAlerts?`${C.red}55`:C.border}`,borderRadius:'14px',padding:'1.125rem',flex:'1 1 240px',minWidth:'240px',maxWidth:'340px'}}>
      {/* Header */}
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'0.875rem'}}>
        <div>
          <p style={{color:C.text,fontWeight:'800',fontSize:'0.9rem',margin:'0 0 0.2rem'}}>{branchName}</p>
          <div style={{display:'flex',gap:'0.35rem',flexWrap:'wrap' as const}}>
            {isCurrent&&<span style={{fontSize:'0.62rem',background:`${C.orange}33`,color:C.orange,padding:'0.1rem 0.5rem',borderRadius:'10px',fontWeight:'700'}}>Одоогийн</span>}
            {activeOrders>0&&<span style={{fontSize:'0.62rem',background:`${C.yellow}22`,color:C.yellow,padding:'0.1rem 0.5rem',borderRadius:'10px',fontWeight:'700'}}>🔔 {activeOrders} захиалга</span>}
          </div>
        </div>
      </div>

      {/* Key metrics */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0.5rem',marginBottom:'0.75rem'}}>
        {[
          {l:'Захиалга',v:String(filtOrd.length),c:C.yellow},
          {l:'Орлого (₮)',v:revenue>0?formatPrice(revenue):'—',c:C.green},
          {l:'CSAT',v:csat!==null?`${csat}%`:'—',c:csat===null?C.muted:csat>=70?C.green:csat>=50?C.orange:C.red},
          {l:'Дундаж оноо',v:avgScore?`${avgScore}/5`:'—',c:avgScore===null?C.muted:avgScore>=4?C.green:avgScore>=3?C.orange:C.red},
          {l:'NPS оноо',v:npsScore!==null?`${npsScore>0?'+':''}${npsScore}`:'—',c:npsScore===null?C.muted:npsScore>=50?C.green:npsScore>=0?C.orange:C.red},
          {l:'Судалгаа',v:`${filtSrv.length} хариулт`,c:filtSrv.length>0?C.yellow:C.muted},
        ].map(s=>(
          <div key={s.l} style={{background:'rgba(255,255,255,0.04)',borderRadius:'8px',padding:'0.5rem 0.65rem'}}>
            <p style={{color:s.c,fontWeight:'800',fontSize:'0.9rem',margin:'0 0 0.1rem'}}>{s.v}</p>
            <p style={{color:C.muted,fontSize:'0.62rem',margin:0}}>{s.l}</p>
          </div>
        ))}
      </div>

      {/* Alerts */}
      {hasAlerts&&<div style={{borderTop:`1px solid ${C.border}`,paddingTop:'0.6rem',display:'flex',flexDirection:'column' as const,gap:'0.35rem'}}>
        {slowOrders.length>0&&<div style={{background:`${C.red}11`,border:`1px solid ${C.red}33`,borderRadius:'8px',padding:'0.45rem 0.65rem',display:'flex',alignItems:'flex-start',gap:'0.5rem'}}>
          <span style={{flexShrink:0}}>⏰</span>
          <div>
            <p style={{color:C.red,fontWeight:'700',fontSize:'0.75rem',margin:'0 0 0.1rem'}}>{slowOrders.length} захиалга 15+ минут болсон</p>
            <div style={{display:'flex',flexDirection:'column' as const,gap:'0.1rem'}}>
              {slowOrders.slice(0,3).map(o=>{
                const mins=Math.floor((now-o.createdAt)/60000);
                return<p key={o.id} style={{color:'rgba(255,255,255,0.5)',fontSize:'0.68rem',margin:0}}>Ширээ {o.tableNumber}: {mins} мин ({ORDER_STATUS_LABELS[o.status]})</p>;
              })}
              {slowOrders.length>3&&<p style={{color:'rgba(255,255,255,0.35)',fontSize:'0.68rem',margin:0}}>...болон {slowOrders.length-3} захиалга</p>}
            </div>
          </div>
        </div>}
        {unresolvedComplaints>0&&<div style={{background:`${C.orange}11`,border:`1px solid ${C.orange}33`,borderRadius:'8px',padding:'0.45rem 0.65rem',display:'flex',alignItems:'center',gap:'0.5rem'}}>
          <span>⚠️</span>
          <p style={{color:C.orange,fontWeight:'700',fontSize:'0.75rem',margin:0}}>{unresolvedComplaints} гомдол шийдвэрлэгдэгүй байна</p>
        </div>}
      </div>}

      {!hasAlerts&&<div style={{borderTop:`1px solid ${C.border}`,paddingTop:'0.5rem'}}>
        <p style={{color:C.green,fontSize:'0.72rem',fontWeight:'600',margin:0}}>✅ Анхаарал татах асуудал байхгүй</p>
      </div>}
    </div>
  );
}

function MultiBranchTab({currentBranchId,currentBranchName,siblingBranches,currentOrders,currentSurveys}:{currentBranchId:string;currentBranchName:string;siblingBranches:Branch[];currentOrders:Order[];currentSurveys:Survey[]}) {
  const [df,setDf]=useState<'today'|'7d'|'1m'|'3m'>('today');
  const [focusBranch,setFocusBranch]=useState<string>('all');
  const [activeTab,setActiveTab]=useState<'compare'|'sales'|'complaints'>('compare');

  const fms:{[k:string]:number}={today:86400000,'7d':604800000,'1m':2592000000,'3m':7776000000};
  const dfLabel:{[k:string]:string}={today:'Өнөөдөр','7d':'7 хоног','1m':'1 сар','3m':'3 сар'};

  const allBranches=[
    {id:currentBranchId,name:currentBranchName,isCurrent:true},
    ...siblingBranches.map(b=>({...b,isCurrent:false}))
  ];

  // Collect sibling branches' data
  const [siblingData,setSiblingData]=useState<Record<string,{orders:Order[];surveys:Survey[]}>>({});
  useEffect(()=>{
    const unsubs=siblingBranches.map(b=>{
      const u1=subscribeToOrders(b.id,orders=>setSiblingData(p=>{const prev=p[b.id]||{orders:[],surveys:[]};return{...p,[b.id]:{...prev,orders}};}));
      const u2=subscribeToSurveys(b.id,surveys=>setSiblingData(p=>{const prev=p[b.id]||{orders:[],surveys:[]};return{...p,[b.id]:{...prev,surveys}};}));
      return[u1,u2];
    });
    return()=>unsubs.flat().forEach(u=>u());
  },[siblingBranches]);

  // All data combined
  const now=Date.now();
  const todayStart=new Date();todayStart.setHours(0,0,0,0);
  const todayMs=todayStart.getTime();

  const allDataByBranch:{[id:string]:{name:string;orders:Order[];surveys:Survey[]}}={
    [currentBranchId]:{name:currentBranchName,orders:currentOrders,surveys:currentSurveys},
    ...Object.fromEntries(siblingBranches.map(b=>([b.id,{name:b.name,orders:siblingData[b.id]?.orders||[],surveys:siblingData[b.id]?.surveys||[]}])))
  };

  const filterOrd=(orders:Order[])=>df==='today'?orders.filter(o=>o.createdAt>=todayMs):orders.filter(o=>(now-o.createdAt)<=fms[df]);
  const filterSrv=(surveys:Survey[])=>df==='today'?surveys.filter(s=>s.createdAt>=todayMs):surveys.filter(s=>(now-s.createdAt)<=fms[df]);

  // All combined
  const allOrders=Object.values(allDataByBranch).flatMap(d=>filterOrd(d.orders));
  const allSurveys=Object.values(allDataByBranch).flatMap(d=>filterSrv(d.surveys));

  // Combined sales
  const totalRevenue=allOrders.filter(o=>o.status==='served').reduce((s,o)=>s+o.totalAmount,0);
  const productMap:Record<string,{rev:number;qty:number}>={};
  allOrders.filter(o=>o.status==='served').forEach(o=>o.items?.forEach(item=>{
    if(!productMap[item.name])productMap[item.name]={rev:0,qty:0};
    productMap[item.name].rev+=item.price*item.quantity;
    productMap[item.name].qty+=item.quantity;
  }));
  const topProducts=Object.entries(productMap).map(([name,d])=>({name,...d})).sort((a,b)=>b.rev-a.rev);

  // Branch revenue breakdown
  const branchRevMap=Object.entries(allDataByBranch).map(([id,d])=>({
    id,name:d.name,
    revenue:filterOrd(d.orders).filter(o=>o.status==='served').reduce((s,o)=>s+o.totalAmount,0),
    orders:filterOrd(d.orders).length
  })).sort((a,b)=>b.revenue-a.revenue);

  // Combined complaints (all surveys with phone, not resolved)
  const allComplaintsRaw=Object.entries(allDataByBranch).flatMap(([bId,d])=>
    d.surveys.filter(s=>s.phone&&s.phone.trim()).map(s=>({...s,_bId:bId,_bName:d.name}))
  ).sort((a,b)=>b.createdAt-a.createdAt);
  const [cmplTab,setCmplTab]=useState<'open'|'closed'>('open');
  const openComplaints=allComplaintsRaw.filter(s=>!s.resolved);
  const closedComplaints=allComplaintsRaw.filter(s=>s.resolved);
  const curComplaints=cmplTab==='open'?openComplaints:closedComplaints;

  const displayBranches=focusBranch==='all'?allBranches:allBranches.filter(b=>b.id===focusBranch);

  return(
    <div>
      {/* Title + tabs */}
      <div style={{display:'flex',alignItems:'center',gap:'0.75rem',marginBottom:'1rem',flexWrap:'wrap' as const}}>
        <h2 style={{color:C.yellow,fontWeight:'800',fontSize:'1rem',margin:0}}>🏢 Бүх салбарын нэгтгэсэн харагдац</h2>
        <span style={{background:`${C.yellow}22`,color:C.yellow,borderRadius:'20px',padding:'0.2rem 0.75rem',fontSize:'0.72rem',fontWeight:'700'}}>{allBranches.length} салбар</span>
      </div>

      {/* Main tab nav */}
      <div style={{display:'flex',gap:'0.4rem',marginBottom:'1rem',background:'rgba(255,255,255,0.04)',borderRadius:'12px',padding:'0.3rem'}}>
        {[{k:'compare',l:'📊 Харьцуулах'},{k:'sales',l:'💰 Борлуулалт'},{k:'complaints',l:'📞 Гомдол'}].map(t=>(
          <button key={t.k} onClick={()=>setActiveTab(t.k as any)} style={{flex:1,padding:'0.5rem 0.75rem',borderRadius:'10px',border:'none',cursor:'pointer',fontWeight:activeTab===t.k?'700':'500',fontSize:'0.8rem',background:activeTab===t.k?C.card:'transparent',color:activeTab===t.k?C.yellow:C.muted,transition:'all 0.15s'}}>{t.l}</button>
        ))}
      </div>

      {/* Date filter (shared) */}
      <div style={{display:'flex',gap:'0.4rem',marginBottom:'1rem',flexWrap:'wrap' as const,alignItems:'center'}}>
        {[{k:'today',l:'Өнөөдөр'},{k:'7d',l:'7 хоног'},{k:'1m',l:'1 сар'},{k:'3m',l:'3 сар'}].map(f=>(
          <button key={f.k} onClick={()=>setDf(f.k as any)} style={{padding:'0.35rem 0.75rem',borderRadius:'20px',border:`1px solid ${df===f.k?C.yellow:C.border}`,background:df===f.k?`${C.yellow}22`:'transparent',color:df===f.k?C.yellow:C.muted,fontWeight:df===f.k?'700':'500',cursor:'pointer',fontSize:'0.75rem'}}>{f.l}</button>
        ))}
        <span style={{color:C.muted,fontSize:'0.7rem',marginLeft:'0.25rem'}}>📅 {dfLabel[df]}</span>
      </div>

      {/* ── TAB: COMPARE ── */}
      {activeTab==='compare'&&<>
        {allBranches.length>2&&<div style={{display:'flex',gap:'0.4rem',marginBottom:'1rem',flexWrap:'wrap' as const}}>
          <button onClick={()=>setFocusBranch('all')} style={{padding:'0.35rem 0.75rem',borderRadius:'20px',border:`1px solid ${focusBranch==='all'?C.orange:C.border}`,background:focusBranch==='all'?`${C.orange}22`:'transparent',color:focusBranch==='all'?C.orange:C.muted,fontWeight:focusBranch==='all'?'700':'500',cursor:'pointer',fontSize:'0.75rem'}}>Бүгд</button>
          {allBranches.map(b=>(
            <button key={b.id} onClick={()=>setFocusBranch(b.id)} style={{padding:'0.35rem 0.75rem',borderRadius:'20px',border:`1px solid ${focusBranch===b.id?C.orange:C.border}`,background:focusBranch===b.id?`${C.orange}22`:'transparent',color:focusBranch===b.id?C.orange:C.muted,fontWeight:focusBranch===b.id?'700':'500',cursor:'pointer',fontSize:'0.75rem'}}>{b.name}{b.isCurrent?' ✓':''}</button>
          ))}
        </div>}
        <div style={{display:'flex',gap:'0.75rem',flexWrap:'wrap' as const}}>
          {displayBranches.map(b=>(
            <Fragment key={b.id}>
              <BranchStatCard branchId={b.id} branchName={b.name} isCurrent={b.isCurrent} filterMs={fms[df]}
                currentOrders={b.isCurrent?currentOrders:undefined} currentSurveys={b.isCurrent?currentSurveys:undefined}/>
            </Fragment>
          ))}
        </div>
      </>}

      {/* ── TAB: SALES ── */}
      {activeTab==='sales'&&<>
        {/* Totals */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'0.6rem',marginBottom:'1rem'}}>
          {[{l:'Нийт орлого',v:formatPrice(totalRevenue),c:C.green},{l:'Нийт захиалга',v:String(allOrders.length),c:C.yellow},{l:'Дундаж/захиалга',v:allOrders.filter(o=>o.status==='served').length?formatPrice(Math.round(totalRevenue/allOrders.filter(o=>o.status==='served').length)):'—',c:'#5eead4'}].map(s=>(
            <div key={s.l} style={{...CS,marginBottom:0,textAlign:'center' as const}}>
              <p style={{color:s.c,fontWeight:'800',fontSize:'1.1rem',margin:'0 0 0.2rem'}}>{s.v}</p>
              <p style={{color:C.muted,fontSize:'0.7rem',margin:0}}>{s.l}</p>
            </div>
          ))}
        </div>
        {/* Branch revenue breakdown */}
        <div style={{...CS,marginBottom:'1rem'}}>
          <p style={{color:C.yellow,fontWeight:'700',fontSize:'0.78rem',letterSpacing:'0.04em',textTransform:'uppercase' as const,margin:'0 0 0.75rem'}}>🏢 Салбараар</p>
          {branchRevMap.map((b,i)=>{
            const pct=totalRevenue>0?Math.round(b.revenue/totalRevenue*100):0;
            return<div key={b.id} style={{marginBottom:'0.6rem'}}>
              <div style={{display:'flex',justifyContent:'space-between',marginBottom:'0.2rem'}}>
                <span style={{color:C.text,fontSize:'0.82rem',fontWeight:'700'}}>{b.name}{b.id===currentBranchId?' ✓':''}</span>
                <span style={{color:C.green,fontSize:'0.82rem',fontWeight:'800'}}>{formatPrice(b.revenue)} <span style={{color:C.muted,fontWeight:'400'}}>({pct}%)</span></span>
              </div>
              <div style={{height:'6px',background:C.inpBg,borderRadius:'3px'}}><div style={{height:'100%',width:`${pct}%`,background:['#2ECC71','#3B82F6','#F59E0B','#8B5CF6'][i%4],borderRadius:'3px',transition:'width 0.3s'}}/></div>
            </div>;
          })}
        </div>
        {/* Top products */}
        {topProducts.length>0&&<div style={{background:C.card,borderRadius:'14px',border:`1px solid ${C.border}`,overflow:'hidden'}}>
          <div style={{padding:'0.875rem 1rem',borderBottom:`1px solid ${C.border}`}}>
            <p style={{color:C.yellow,fontWeight:'700',fontSize:'0.78rem',letterSpacing:'0.04em',textTransform:'uppercase' as const,margin:0}}>🍽️ Бүх салбарын нийт борлуулалт</p>
          </div>
          <table style={{width:'100%',borderCollapse:'collapse' as const,fontSize:'0.82rem'}}>
            <thead><tr style={{background:'rgba(255,255,255,0.04)'}}>
              {['#','Бүтээгдэхүүн','Тоо','Орлого'].map(h=><th key={h} style={{padding:'0.5rem 0.875rem',textAlign:'left' as const,color:C.muted,fontSize:'0.7rem',fontWeight:'600',borderBottom:`1px solid ${C.border}`}}>{h}</th>)}
            </tr></thead>
            <tbody>{topProducts.map((p,i)=>(
              <tr key={p.name} style={{borderBottom:`1px solid ${C.border}`}}>
                <td style={{padding:'0.5rem 0.875rem',color:C.muted}}>{i+1}</td>
                <td style={{padding:'0.5rem 0.875rem',color:'rgba(255,255,255,0.88)',fontWeight:'700'}}>{p.name}</td>
                <td style={{padding:'0.5rem 0.875rem',color:C.yellow,fontWeight:'800'}}>{p.qty}ш</td>
                <td style={{padding:'0.5rem 0.875rem',color:C.green,fontWeight:'800'}}>{formatPrice(p.rev)}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>}
        {topProducts.length===0&&<div style={{textAlign:'center',padding:'3rem',color:C.muted}}><div style={{fontSize:'2.5rem'}}>💰</div><p>Борлуулалт байхгүй</p></div>}
      </>}

      {/* ── TAB: COMPLAINTS ── */}
      {activeTab==='complaints'&&<>
        <div style={{display:'flex',gap:'0.5rem',marginBottom:'1rem'}}>
          {[{k:'open',l:`🔴 Нээлттэй (${openComplaints.length})`,c:C.orange},{k:'closed',l:`✅ Шийдвэрлэсэн (${closedComplaints.length})`,c:C.green}].map(t=>(
            <button key={t.k} onClick={()=>setCmplTab(t.k as any)} style={{padding:'0.5rem 1rem',borderRadius:'20px',border:`1px solid ${cmplTab===t.k?t.c:C.border}`,background:cmplTab===t.k?`${t.c}22`:'transparent',color:cmplTab===t.k?t.c:C.muted,fontWeight:cmplTab===t.k?'700':'500',cursor:'pointer',fontSize:'0.82rem'}}>{t.l}</button>
          ))}
        </div>
        {curComplaints.length===0&&<div style={{textAlign:'center',padding:'3rem',color:C.muted}}><div style={{fontSize:'2.5rem'}}>{cmplTab==='open'?'🎉':'📋'}</div><p>{cmplTab==='open'?'Нээлттэй гомдол байхгүй':'Шийдвэрлэсэн гомдол байхгүй'}</p></div>}
        {curComplaints.map(s=>(
          <div key={s.id} style={{...CS,padding:'1rem',borderLeft:`3px solid ${(s as any)._bId===currentBranchId?C.orange:'rgba(59,130,246,0.6)'}`}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'0.5rem'}}>
              <div>
                <span style={{fontSize:'0.72rem',background:'rgba(255,255,255,0.08)',color:'rgba(255,255,255,0.6)',padding:'0.15rem 0.5rem',borderRadius:'8px',fontWeight:'600'}}>{(s as any)._bName}</span>
                <p style={{color:C.muted,fontSize:'0.72rem',margin:'0.2rem 0 0'}}>{formatDate(s.createdAt)} {formatTime(s.createdAt)}</p>
              </div>
              <div style={{display:'flex',gap:'0.5rem',alignItems:'center'}}>
                <span style={{color:C.green,fontWeight:'800',fontSize:'0.85rem'}}>📞 {s.phone}</span>
                <span style={{padding:'0.2rem 0.5rem',borderRadius:'8px',fontSize:'0.68rem',fontWeight:'700',background:`${s.csat>=4?C.green:s.csat>=3?C.orange:C.red}22`,color:s.csat>=4?C.green:s.csat>=3?C.orange:C.red}}>{s.csat}/5</span>
              </div>
            </div>
            {s.feedback&&<p style={{color:'rgba(255,255,255,0.8)',fontSize:'0.82rem',fontStyle:'italic',background:'rgba(255,255,255,0.04)',borderRadius:'8px',padding:'0.5rem 0.75rem',margin:'0 0 0.5rem'}}>"{s.feedback}"</p>}
            {cmplTab==='open'&&<button onClick={async()=>await setSurveyResolved((s as any)._bId,s.id,true,'')} style={{padding:'0.4rem 1rem',background:`${C.green}22`,border:`1px solid ${C.green}44`,borderRadius:'8px',color:C.green,cursor:'pointer',fontSize:'0.78rem',fontWeight:'700'}}>✅ Шийдвэрлэсэн тэмдэглэх</button>}
          </div>
        ))}
      </>}
    </div>
  );
}

// Multi-branch combined sales view
function MultiSalesView({allBranchOpts,currentBranchId,sibOrds,currentOrders}:{allBranchOpts:{id:string;name:string}[];currentBranchId:string;sibOrds:Record<string,Order[]>;currentOrders:Order[]}) {
  const [filter,setFilter]=useState('today');
  const SF2=[{k:'today',l:'Өнөөдөр',ms:86400000},{k:'7d',l:'7 хоног',ms:604800000},{k:'14d',l:'14 хоног',ms:1209600000},{k:'1m',l:'1 сар',ms:2592000000},{k:'3m',l:'3 сар',ms:7776000000}];
  const now=Date.now();
  const todayStart=new Date();todayStart.setHours(0,0,0,0);
  const getFiltered=(ords:Order[])=>{
    const f=SF2.find(x=>x.k===filter);
    if(filter==='today')return ords.filter(o=>o.createdAt>=todayStart.getTime());
    return ords.filter(o=>(now-o.createdAt)<=(f?.ms||86400000));
  };
  const allOrders=[...getFiltered(currentOrders),...Object.values(sibOrds).flatMap(o=>getFiltered(o))];
  const totalRevenue=allOrders.filter(o=>o.status==='served').reduce((s,o)=>s+o.totalAmount,0);
  // By branch
  const branchRev=allBranchOpts.map(b=>{
    const ords=b.id===currentBranchId?getFiltered(currentOrders):getFiltered(sibOrds[b.id]||[]);
    return{...b,revenue:ords.filter(o=>o.status==='served').reduce((s,o)=>s+o.totalAmount,0),count:ords.length};
  }).sort((a,b)=>b.revenue-a.revenue);
  // Top products
  const pm:Record<string,{rev:number;qty:number}>={};
  allOrders.filter(o=>o.status==='served').forEach(o=>o.items?.forEach(item=>{
    if(!pm[item.name])pm[item.name]={rev:0,qty:0};
    pm[item.name].rev+=item.price*item.quantity;pm[item.name].qty+=item.quantity;
  }));
  const top=Object.entries(pm).map(([name,d])=>({name,...d})).sort((a,b)=>b.rev-a.rev);
  return(
    <div>
      <div style={{display:'flex',gap:'0.35rem',flexWrap:'wrap' as const,marginBottom:'1rem',alignItems:'center'}}>
        {SF2.map(f=><button key={f.k} onClick={()=>setFilter(f.k)} style={{padding:'0.38rem 0.75rem',borderRadius:'20px',border:`1px solid ${filter===f.k?C.yellow:C.border}`,background:filter===f.k?`${C.yellow}22`:'transparent',color:filter===f.k?C.yellow:C.muted,fontWeight:filter===f.k?'700':'500',cursor:'pointer',fontSize:'0.75rem'}}>{f.l}</button>)}
        <span style={{marginLeft:'auto',color:C.orange,fontSize:'0.75rem',fontWeight:'700'}}>🏢 Бүх салбар нэгтгэсэн</span>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'0.6rem',marginBottom:'1rem'}}>
        {[{l:'Нийт орлого',v:formatPrice(totalRevenue),c:C.green},{l:'Захиалга',v:String(allOrders.length),c:C.yellow},{l:'Дундаж',v:allOrders.filter(o=>o.status==='served').length?formatPrice(Math.round(totalRevenue/allOrders.filter(o=>o.status==='served').length)):'—',c:'#5eead4'}].map(s=>(
          <div key={s.l} style={{...CS,marginBottom:0,textAlign:'center' as const}}>
            <p style={{color:s.c,fontWeight:'800',fontSize:'1.1rem',margin:'0 0 0.2rem'}}>{s.v}</p>
            <p style={{color:C.muted,fontSize:'0.7rem',margin:0}}>{s.l}</p>
          </div>
        ))}
      </div>
      <div style={{...CS,marginBottom:'1rem'}}>
        <p style={{color:C.yellow,fontWeight:'700',fontSize:'0.78rem',textTransform:'uppercase' as const,margin:'0 0 0.75rem',letterSpacing:'0.04em'}}>📍 Салбараар</p>
        {branchRev.map((b,i)=>{
          const pct=totalRevenue>0?Math.round(b.revenue/totalRevenue*100):0;
          return<div key={b.id} style={{marginBottom:'0.6rem'}}>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:'0.2rem'}}>
              <span style={{color:b.id===currentBranchId?C.orange:C.text,fontSize:'0.82rem',fontWeight:'700'}}>{b.name}{b.id===currentBranchId?' ✓':''}</span>
              <span style={{color:C.green,fontSize:'0.82rem',fontWeight:'800'}}>{formatPrice(b.revenue)} <span style={{color:C.muted,fontWeight:'400'}}>({b.count} зах, {pct}%)</span></span>
            </div>
            <div style={{height:'6px',background:C.inpBg,borderRadius:'3px'}}><div style={{height:'100%',width:`${pct}%`,background:['#2ECC71','#3B82F6','#F59E0B','#8B5CF6'][i%4],borderRadius:'3px'}}/></div>
          </div>;
        })}
      </div>
      {top.length>0&&<div style={{background:C.card,borderRadius:'14px',border:`1px solid ${C.border}`,overflow:'hidden'}}>
        <div style={{padding:'0.875rem 1rem',borderBottom:`1px solid ${C.border}`}}>
          <p style={{color:C.yellow,fontWeight:'700',fontSize:'0.78rem',textTransform:'uppercase' as const,margin:0,letterSpacing:'0.04em'}}>🍽️ Нийт борлуулалт — бүх салбар</p>
        </div>
        <table style={{width:'100%',borderCollapse:'collapse' as const,fontSize:'0.82rem'}}>
          <thead><tr style={{background:'rgba(255,255,255,0.04)'}}>
            {['#','Бүтээгдэхүүн','Тоо','Орлого'].map(h=><th key={h} style={{padding:'0.5rem 0.875rem',textAlign:'left' as const,color:C.muted,fontSize:'0.7rem',fontWeight:'600',borderBottom:`1px solid ${C.border}`}}>{h}</th>)}
          </tr></thead>
          <tbody>{top.slice(0,15).map((p,i)=>(
            <tr key={p.name} style={{borderBottom:`1px solid ${C.border}`}}>
              <td style={{padding:'0.5rem 0.875rem',color:C.muted}}>{i+1}</td>
              <td style={{padding:'0.5rem 0.875rem',color:'rgba(255,255,255,0.88)',fontWeight:'700'}}>{p.name}</td>
              <td style={{padding:'0.5rem 0.875rem',color:C.yellow,fontWeight:'800'}}>{p.qty}ш</td>
              <td style={{padding:'0.5rem 0.875rem',color:C.green,fontWeight:'800'}}>{formatPrice(p.rev)}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>}
    </div>
  );
}

function DashSalesInline({orders,fromMs}:{orders:Order[];fromMs:number}) {
  const filtered=orders.filter(o=>o.status==='served'&&o.createdAt>=fromMs);
  const totalRevenue=filtered.reduce((s,o)=>s+o.totalAmount,0);
  const orderCount=filtered.length;
  const avgOrder=orderCount?Math.round(totalRevenue/orderCount):0;
  const pm:Record<string,{rev:number;qty:number}>={};
  filtered.forEach(o=>o.items?.forEach(it=>{
    if(!pm[it.name])pm[it.name]={rev:0,qty:0};
    pm[it.name].rev+=it.price*it.quantity;pm[it.name].qty+=it.quantity;
  }));
  const products=Object.entries(pm).map(([name,d])=>({name,revenue:d.rev,qty:d.qty})).sort((a,b)=>b.revenue-a.revenue);
  return(
    <div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'0.5rem',marginBottom:'0.75rem'}}>
        {[{l:'Нийт орлого',v:formatPrice(totalRevenue),c:C.green},{l:'Захиалга',v:String(orderCount),c:C.yellow},{l:'Дундаж',v:formatPrice(avgOrder),c:'#5eead4'}].map(s=>(
          <div key={s.l} style={{background:C.inpBg,borderRadius:'8px',padding:'0.65rem',textAlign:'center' as const}}>
            <p style={{color:s.c,fontWeight:'800',fontSize:'1rem',margin:'0 0 0.15rem'}}>{s.v}</p>
            <p style={{color:C.muted,fontSize:'0.65rem',margin:0}}>{s.l}</p>
          </div>
        ))}
      </div>
      {products.length>0&&<>
        <p style={{color:C.muted,fontSize:'0.7rem',letterSpacing:'0.04em',textTransform:'uppercase' as const,margin:'0 0 0.4rem'}}>TOP 5 (бүх салбар)</p>
        <div style={{display:'grid',gridTemplateColumns:'auto 1fr auto auto',gap:'0 0.5rem',fontSize:'0.78rem',alignItems:'center'}}>
          {products.slice(0,5).map((p,i)=>[
            <span key={`n${i}`} style={{color:C.muted,padding:'0.25rem 0',borderBottom:'1px solid rgba(255,255,255,0.04)'}}>{i+1}.</span>,
            <span key={`t${i}`} style={{color:'rgba(255,255,255,0.82)',padding:'0.25rem 0',borderBottom:'1px solid rgba(255,255,255,0.04)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' as const}}>{p.name}</span>,
            <span key={`q${i}`} style={{color:C.yellow,fontWeight:'700',padding:'0.25rem 0',borderBottom:'1px solid rgba(255,255,255,0.04)',textAlign:'right' as const}}>{p.qty}ш</span>,
            <span key={`r${i}`} style={{color:C.green,fontWeight:'700',padding:'0.25rem 0',borderBottom:'1px solid rgba(255,255,255,0.04)',textAlign:'right' as const}}>{formatPrice(p.revenue)}</span>,
          ])}
        </div>
      </>}
      {orderCount===0&&<p style={{color:C.muted,fontSize:'0.82rem',textAlign:'center' as const,padding:'0.5rem 0'}}>Борлуулалт байхгүй</p>}
    </div>
  );
}

function DashSales({branchId,fromMs}:{branchId:string;fromMs:number}) {
  const [data,setData]=useState<SalesData|null>(null);
  useEffect(()=>{getSalesReport(branchId,fromMs).then(setData).catch(()=>setData(null));},[branchId,fromMs]);
  if(!data)return<p style={{color:C.muted,fontSize:'0.82rem',margin:0}}>Ачаалж байна...</p>;
  return(
    <div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'0.5rem',marginBottom:'0.75rem'}}>
        {[{l:'Нийт орлого',v:formatPrice(data.totalRevenue),c:C.green},{l:'Захиалга',v:String(data.orderCount),c:C.yellow},{l:'Дундаж',v:formatPrice(data.avgOrder),c:'#5eead4'}].map(s=>(
          <div key={s.l} style={{background:C.inpBg,borderRadius:'8px',padding:'0.65rem',textAlign:'center' as const}}>
            <p style={{color:s.c,fontWeight:'800',fontSize:'1rem',margin:'0 0 0.15rem'}}>{s.v}</p>
            <p style={{color:C.muted,fontSize:'0.65rem',margin:0}}>{s.l}</p>
          </div>
        ))}
      </div>
      {data.products.length>0&&<>
        <p style={{color:C.muted,fontSize:'0.7rem',letterSpacing:'0.04em',textTransform:'uppercase' as const,margin:'0 0 0.4rem'}}>TOP 5 хамгийн их борлуулалттай</p>
        <div style={{display:'grid',gridTemplateColumns:'auto 1fr auto auto',gap:'0 0.5rem',fontSize:'0.78rem',alignItems:'center'}}>
          {data.products.slice(0,5).map((p,i)=>[
            <span key={`n${i}`} style={{color:C.muted,padding:'0.25rem 0',borderBottom:'1px solid rgba(255,255,255,0.04)'}}>{i+1}.</span>,
            <span key={`t${i}`} style={{color:'rgba(255,255,255,0.82)',padding:'0.25rem 0',borderBottom:'1px solid rgba(255,255,255,0.04)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' as const}}>{p.name}</span>,
            <span key={`q${i}`} style={{color:C.yellow,fontWeight:'700',padding:'0.25rem 0',borderBottom:'1px solid rgba(255,255,255,0.04)',textAlign:'right' as const}}>{p.qty}ш</span>,
            <span key={`r${i}`} style={{color:C.green,fontWeight:'700',padding:'0.25rem 0',borderBottom:'1px solid rgba(255,255,255,0.04)',textAlign:'right' as const}}>{formatPrice(p.revenue)}</span>,
          ])}
        </div>
      </>}
      {data.orderCount===0&&<p style={{color:C.muted,fontSize:'0.82rem',textAlign:'center' as const,padding:'0.5rem 0'}}>Борлуулалт байхгүй</p>}
    </div>
  );
}

export default function App(){return<ErrorBoundary><AppInner/></ErrorBoundary>;}
