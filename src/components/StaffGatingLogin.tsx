import React, { useState } from 'react';
import { Lock, ShieldAlert, Check, X, ArrowLeft } from 'lucide-react';

interface Employee {
  id: string;
  name: string;
  username: string;
  pin: string;
  role: 'admin' | 'chef' | 'waiter';
  createdAt: string;
}

interface StaffGatingLoginProps {
  lang: 'mn' | 'en';
  employees: Employee[];
  currentUser: Employee | null;
  setCurrentUser: (emp: Employee | null) => void;
  showNotification: (msg: string) => void;
  setViewMode: (mode: 'customer' | 'admin') => void;
}

export default function StaffGatingLogin({
  lang,
  employees,
  currentUser,
  setCurrentUser,
  showNotification,
  setViewMode
}: StaffGatingLoginProps) {
  const [selectedEmp, setSelectedEmp] = useState<Employee | null>(null);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState(false);

  const handleKeyPress = (num: string) => {
    if (!selectedEmp) return;
    if (pinInput.length < 4) {
      const newVal = pinInput + num;
      setPinInput(newVal);
      setPinError(false);
      
      if (newVal.length === 4) {
        if (newVal === selectedEmp.pin) {
          setCurrentUser(selectedEmp);
          setSelectedEmp(null);
          setPinInput('');
          setPinError(false);
          showNotification(lang === 'mn' ? 'Амжилттай нэвтэрлээ!' : 'Access Granted!');
        } else {
          setPinError(true);
          setPinInput('');
        }
      }
    }
  };

  const handleClear = () => {
    setPinInput('');
    setPinError(false);
  };

  const handleCustomSubmit = () => {
    if (!selectedEmp) return;
    if (pinInput === selectedEmp.pin) {
      setCurrentUser(selectedEmp);
      setSelectedEmp(null);
      setPinInput('');
      setPinError(false);
      showNotification(lang === 'mn' ? 'Амжилттай нэвтэрлээ!' : 'Access Granted!');
    } else {
      setPinError(true);
      setPinInput('');
    }
  };

  return (
    <div className="max-w-md mx-auto my-12 bg-white border border-slate-200 rounded-3xl p-6 shadow-xl flex flex-col gap-6 animate-fade-in" id="backoffice_gating_panel">
      <div className="flex flex-col items-center text-center gap-2 border-b border-slate-100 pb-4">
        <div className="w-12 h-12 bg-orange-600 rounded-2xl flex items-center justify-center text-white font-bold shadow-lg shadow-orange-600/20">
          <Lock className="w-6 h-6" />
        </div>
        <div>
          <h2 className="font-extrabold text-base text-slate-800 tracking-tight">
            {lang === 'mn' ? 'БЭНТО АЖИЛТНЫ НЭВТРЭХ ХЭСЭГ' : 'BENTO STAFF WORKSPACE ACCESS'}
          </h2>
          <p className="text-[10.5px] text-slate-400 font-medium tracking-wide">
            {lang === 'mn' ? 'Ажлын талбар луу өөрийн бүртгэлийг сонгон нэвтэрнэ үү.' : 'Choose your worker profile and type your PIN.'}
          </p>
        </div>
      </div>

      {pinError && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs p-3 rounded-2xl font-bold flex items-center gap-2 animate-pulse">
          <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
          <span>
            {lang === 'mn' ? 'Нэвтрэх ПИН код буруу байна! Дахин оролдоно уу.' : 'PIN is incorrect. Please try again.'}
          </span>
        </div>
      )}

      {selectedEmp === null ? (
        <div className="flex flex-col gap-3">
          <span className="font-extrabold text-[10px] text-slate-400 uppercase tracking-widest block mb-1 text-center">
            {lang === 'mn' ? 'Ажлын бүртгэлээ Сонгоно уу:' : 'Select Staff Account:'}
          </span>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" id="gating_employee_grid">
            {employees.map((emp) => {
              const roleBadgeColor = emp.role === 'admin' ? 'bg-indigo-50 text-indigo-700 border-indigo-100' :
                                    emp.role === 'chef' ? 'bg-rose-50 text-rose-700 border-rose-100' :
                                    'bg-amber-50 text-amber-700 border-amber-100';
              const roleLabel = emp.role === 'admin' ? (lang === 'mn' ? 'Менежер' : 'Manager') :
                               emp.role === 'chef' ? (lang === 'mn' ? 'Тогооч' : 'Chef') :
                               (lang === 'mn' ? 'Зөөгч' : 'Waiter');
              return (
                <button
                  key={emp.id}
                  type="button"
                  onClick={() => {
                    setSelectedEmp(emp);
                    setPinInput('');
                    setPinError(false);
                  }}
                  className="p-4 bg-slate-50 hover:bg-orange-50/20 border border-slate-200 hover:border-orange-500 rounded-2xl text-left transition-all flex items-center gap-3 cursor-pointer group"
                >
                  <div className="w-10 h-10 rounded-full bg-slate-200 text-slate-705 font-extrabold flex items-center justify-center text-sm group-hover:bg-orange-600 group-hover:text-white transition-colors">
                    {emp.name.charAt(0)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="font-bold text-xs text-slate-800 block leading-tight truncate group-hover:text-slate-950">{emp.name}</span>
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border inline-block mt-1 ${roleBadgeColor}`}>
                      {roleLabel}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          <div className="flex items-center justify-between bg-orange-50/40 border border-orange-100 p-3.5 rounded-2xl">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-full bg-orange-600 text-white font-extrabold flex items-center justify-center text-sm shadow shadow-orange-500/20">
                {selectedEmp.name.charAt(0)}
              </div>
              <div className="min-w-0">
                <span className="font-extrabold text-xs text-slate-800 block truncate">{selectedEmp.name}</span>
                <span className="text-[10px] text-slate-400 capitalize font-medium">
                  {lang === 'mn' ? 'Үүрэг:' : 'Role:'} <strong className="font-bold text-orange-600">{selectedEmp.role}</strong>
                </span>
              </div>
            </div>
            
            <button
              type="button"
              onClick={() => setSelectedEmp(null)}
              className="text-[10px] text-slate-500 hover:text-slate-800 font-bold hover:underline py-1 px-2.5 border border-slate-200 bg-white rounded-lg cursor-pointer"
            >
              {lang === 'mn' ? 'Буцах' : 'Back'}
            </button>
          </div>

          <div className="flex flex-col gap-2">
            <label className="font-bold text-[10px] text-slate-400 uppercase tracking-widest block text-center">
              {lang === 'mn' ? 'ПИН КОДОО ОРУУЛНА УУ' : 'ENTER 4-DIGIT SECURITY PIN'}
            </label>
            <input
              type="password"
              maxLength={4}
              value={pinInput}
              readOnly
              placeholder="••••"
              className="w-full text-center text-2xl font-mono tracking-[0.25em] border border-slate-200 bg-slate-50/50 rounded-xl py-2 px-3 outline-none"
            />
          </div>

          <div className="grid grid-cols-3 gap-2 text-sm font-bold" id="gating_keypad">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
              <button
                key={num}
                type="button"
                onClick={() => handleKeyPress(num)}
                className="py-3 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200/80 rounded-xl cursor-pointer transition-colors text-base font-mono font-semibold active:scale-95 duration-75"
              >
                {num}
              </button>
            ))}
            <button
              type="button"
              onClick={handleClear}
              className="py-3 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-100 rounded-xl cursor-pointer transition-colors text-xs font-bold active:scale-95"
            >
              C
            </button>
            <button
              type="button"
              onClick={() => handleKeyPress('0')}
              className="py-3 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl cursor-pointer transition-colors text-base font-mono font-semibold active:scale-95"
            >
              0
            </button>
            <button
              type="button"
              onClick={handleCustomSubmit}
              className="py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-xl cursor-pointer transition-colors text-xs font-bold active:scale-95"
            >
              OK
            </button>
          </div>
        </div>
      )}

      <div className="text-center pt-2 border-t border-slate-100 mt-2">
        <button
          type="button"
          onClick={() => setViewMode('customer')}
          className="text-[10px] text-slate-400 hover:text-slate-800 hover:underline active:scale-95 font-bold uppercase tracking-wider cursor-pointer"
        >
          {lang === 'mn' ? '← Буцах (Хэрэглэгчийн цэс)' : '← Exit Workspace (Client Menu)'}
        </button>
      </div>
    </div>
  );
}
