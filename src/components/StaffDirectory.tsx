import React, { useState } from 'react';
import { UserPlus, Edit, Trash2, HelpCircle, UserCheck, Eye, EyeOff } from 'lucide-react';

interface Employee {
  id: string;
  name: string;
  username: string;
  pin: string;
  role: 'admin' | 'chef' | 'waiter';
  createdAt: string;
}

interface StaffDirectoryProps {
  lang: 'mn' | 'en';
  employees: Employee[];
  setEmployees: React.Dispatch<React.SetStateAction<Employee[]>>;
  currentUser: Employee | null;
  setCurrentUser: (emp: Employee | null) => void;
  showNotification: (msg: string) => void;
}

export default function StaffDirectory({
  lang,
  employees,
  setEmployees,
  currentUser,
  setCurrentUser,
  showNotification
}: StaffDirectoryProps) {
  
  // Local form states
  const [editingId, setEditingId] = useState<string | null>(null);
  const [nameInput, setNameInput] = useState('');
  const [usernameInput, setUsernameInput] = useState('');
  const [pinInput, setPinInput] = useState('');
  const [roleInput, setRoleInput] = useState<'admin' | 'chef' | 'waiter'>('waiter');

  // Security toggling states for PIN code visibility
  const [revealedPins, setRevealedPins] = useState<Record<string, boolean>>({});

  const togglePinReveal = (id: string) => {
    setRevealedPins(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const handleEditSelect = (emp: Employee) => {
    setEditingId(emp.id);
    setNameInput(emp.name);
    setUsernameInput(emp.username);
    setPinInput(emp.pin);
    setRoleInput(emp.role);
    showNotification(lang === 'mn' ? `Ажилтан засахаар сонгогдлоо: ${emp.name}` : `Selected for editing: ${emp.name}`);
  };

  const handleCancelEditing = () => {
    setEditingId(null);
    setNameInput('');
    setUsernameInput('');
    setPinInput('');
    setRoleInput('waiter');
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const formattedName = nameInput.trim();
    const formattedUsername = usernameInput.trim().toLowerCase();
    const formattedPin = pinInput.trim();

    if (!formattedName || !formattedUsername || !formattedPin) {
      showNotification(lang === 'mn' ? 'Ажилтны бүх мэдээллийг гүйцэт бөглөнө үү.' : 'Please enter all employee information fields.');
      return;
    }

    if (formattedPin.length !== 4 || !/^\d+$/.test(formattedPin)) {
      showNotification(lang === 'mn' ? 'Хамгаалалтын ПИН код нь яг 4 оронтой тоо байх ёстой!' : 'Security PIN code must be exactly 4 numeric digits!');
      return;
    }

    // Check duplicate username
    const exists = employees.some(emp => emp.username === formattedUsername && emp.id !== editingId);
    if (exists) {
      showNotification(lang === 'mn' ? 'Энэ бүртгэлийн нэвтрэх нэр аль хэдийн өөр ажилтанд бүртгэгдсэн байна!' : 'This login username is already registered to another staff member!');
      return;
    }

    if (editingId) {
      // Edit mode
      setEmployees(prev => {
        const updated = prev.map(emp => emp.id === editingId ? {
          ...emp,
          name: formattedName,
          username: formattedUsername,
          pin: formattedPin,
          role: roleInput
        } : emp);
        localStorage.setItem('gourmet_employees', JSON.stringify(updated));
        return updated;
      });

      // Update current logged-in user session if they modified themselves
      if (currentUser && currentUser.id === editingId) {
        const updatedSession = {
          ...currentUser,
          name: formattedName,
          username: formattedUsername,
          pin: formattedPin,
          role: roleInput
        };
        setCurrentUser(updatedSession);
        localStorage.setItem('gourmet_current_user', JSON.stringify(updatedSession));
      }

      showNotification(lang === 'mn' ? 'Ажилтны мэдээлэл шинэчлэгдлээ.' : 'Staff details updated.');
    } else {
      // Create mode
      const newEmployee: Employee = {
        id: `emp-${Date.now()}`,
        name: formattedName,
        username: formattedUsername,
        pin: formattedPin,
        role: roleInput,
        createdAt: new Date().toISOString()
      };

      setEmployees(prev => {
        const updated = [...prev, newEmployee];
        localStorage.setItem('gourmet_employees', JSON.stringify(updated));
        return updated;
      });

      showNotification(lang === 'mn' ? 'Шинэ ажилтны бүртгэл үүсгэлээ.' : 'Registered new employee profile.');
    }

    // Reset Form Input Fields
    handleCancelEditing();
  };

  const handleDeleteClick = (id: string) => {
    if (id === 'emp-1') {
      showNotification(lang === 'mn' ? 'Системийн үндсэн Админыг устгахыг хориглоно!' : 'Deleting the default system Admin is prohibited!');
      return;
    }

    if (currentUser && currentUser.id === id) {
      showNotification(lang === 'mn' ? 'Та одоо идэвхтэй ажиллаж буй өөрийн бүртгэлийг устгах боломжгүй!' : 'You cannot delete your own active account session!');
      return;
    }

    if (window.confirm(lang === 'mn' ? 'Энэхүү ажилтныг бүртгэлээс хасахдаа итгэлтэй байна уу?' : 'Are you sure you want to delete this employee?')) {
      setEmployees(prev => {
        const updated = prev.filter(emp => emp.id !== id);
        localStorage.setItem('gourmet_employees', JSON.stringify(updated));
        return updated;
      });
      showNotification(lang === 'mn' ? 'Ажилтны бүртгэлийг хаслаа.' : 'Employee removed from directory.');
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fade-in" id="bento_staff_directory_layout">
      
      {/* LEFT 8 COLUMNS: ROSTER LIST DIRECTORY */}
      <div className="lg:col-span-8 flex flex-col gap-4">
        <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs">
          <div className="pb-3 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="font-extrabold text-slate-800 text-sm tracking-tight flex items-center gap-2">
                <UserCheck className="w-4.5 h-4.5 text-orange-600" />
                {lang === 'mn' ? 'Ажилчдын Нэгдсэн Бүртгэл / Рорстер' : 'Staff Roster & Accounts Directory'}
              </h3>
              <p className="text-[10px] text-slate-400 font-medium">
                {lang === 'mn' ? 'Ажлын талбар дахь нийт ажилтнуудын хандах эрх, үүргийн мэдээлэл' : 'Active team members authorized to control Bento panels'}
              </p>
            </div>
            <span className="text-[11px] font-mono font-bold bg-slate-100 text-slate-600 rounded-full px-2.5 py-0.5">
              {employees.length} Members
            </span>
          </div>

          <div className="flex flex-col gap-3 mt-4" id="staff_members_feed">
            {employees.length === 0 ? (
              <div className="py-12 text-center text-slate-400 flex flex-col justify-center items-center gap-2">
                <HelpCircle className="w-8 h-8 text-slate-200 animate-pulse" />
                <p className="text-xs">
                  {lang === 'mn' ? 'Бүртгэлтэй ажилтан одоогоор байхгүй байна.' : 'No employees currently registered.'}
                </p>
              </div>
            ) : (
              employees.map((emp) => {
                const isActiveUser = currentUser && currentUser.id === emp.id;
                const isPinRevealed = !!revealedPins[emp.id];
                
                const roleBadgeColor = emp.role === 'admin' ? 'bg-indigo-50 text-indigo-700 border-indigo-100' :
                                      emp.role === 'chef' ? 'bg-rose-50 text-rose-700 border-rose-100' :
                                      'bg-amber-50 text-amber-700 border-amber-100';
                                      
                const roleLabel = emp.role === 'admin' ? (lang === 'mn' ? 'Админ' : 'Admin') :
                                 emp.role === 'chef' ? (lang === 'mn' ? 'Тогооч' : 'Chef') :
                                 (lang === 'mn' ? 'Зөөгч' : 'Waiter');

                return (
                  <div 
                    key={emp.id} 
                    className={`p-3.5 border rounded-2xl flex items-center justify-between gap-4 transition-all hover:border-slate-350 ${
                      isActiveUser ? 'bg-orange-50/20 border-orange-200' : 'bg-slate-50/50 border-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-3.5 min-w-0 flex-1">
                      {/* Avatar initial */}
                      <div className={`w-11 h-11 rounded-full text-sm font-extrabold flex items-center justify-center shrink-0 border shadow-xs ${
                        isActiveUser ? 'bg-orange-600 text-white border-orange-500' : 'bg-white text-slate-700 border-slate-200'
                      }`}>
                        {emp.name.charAt(0)}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-extrabold text-xs text-slate-800 truncate block">
                            {emp.name}
                          </span>
                          {isActiveUser && (
                            <span className="text-[9px] bg-orange-600 text-white px-1.5 py-0.5 rounded font-bold uppercase tracking-wider font-mono">
                              {lang === 'mn' ? 'Идэвхтэй' : 'Active'}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-x-3 gap-y-1 flex-wrap mt-1 text-[10.5px] text-slate-500 font-medium font-sans">
                          <span>
                            {lang === 'mn' ? 'ID (Нэвтрэх нэр):' : 'Username:'} <strong className="text-slate-700 font-mono font-bold select-all">{emp.username}</strong>
                          </span>
                          
                          <span className="flex items-center gap-1 bg-white border border-slate-205/60 px-2 py-0.5 rounded font-semibold text-slate-600">
                            <span>PIN:</span>
                            <span className="font-mono font-bold tracking-wider text-orange-600">
                              {isPinRevealed ? emp.pin : '••••'}
                            </span>
                            <button
                              type="button"
                              onClick={() => togglePinReveal(emp.id)}
                              className="p-0.5 text-slate-400 hover:text-slate-700 ml-1 cursor-pointer"
                              title={isPinRevealed ? 'PIN Нуух' : 'PIN Харуулах'}
                            >
                              {isPinRevealed ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                            </button>
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0" id={`member_opts_${emp.id}`}>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border mr-1 ${roleBadgeColor}`}>
                        {roleLabel}
                      </span>
                      
                      <button
                        type="button"
                        onClick={() => handleEditSelect(emp)}
                        className="p-2 hover:bg-white text-slate-650 hover:text-slate-800 border border-slate-200 rounded-xl cursor-pointer transition-colors"
                        title={lang === 'mn' ? 'Засах' : 'Edit Profile'}
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      
                      {emp.id !== 'emp-1' && !isActiveUser && (
                        <button
                          type="button"
                          onClick={() => handleDeleteClick(emp.id)}
                          className="p-2 hover:bg-white text-rose-600 border border-slate-200 rounded-xl cursor-pointer transition-colors"
                          title={lang === 'mn' ? 'Устгах' : 'Delete Member'}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* RIGHT 4 COLUMNS: MANAGE FORM (ADD/EDIT) */}
      <div className="lg:col-span-4 flex flex-col gap-4" id="employee_form_card">
        <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs">
          <div className="pb-3 border-b border-slate-100 flex items-center justify-between mb-4">
            <h3 className="font-extrabold text-xs uppercase tracking-wider text-slate-450 flex items-center gap-1.5">
              <UserPlus className="w-4 h-4 text-orange-600" />
              {editingId ? (lang === 'mn' ? 'Ажилтны эрх засах' : 'EDIT STAFF') : (lang === 'mn' ? 'Шинэ ажилтан нэмэх' : 'NEW WORKER')}
            </h3>
            {editingId && (
              <button
                type="button"
                onClick={handleCancelEditing}
                className="text-[10.5px] text-slate-400 hover:text-slate-850 font-bold hover:underline"
              >
                {lang === 'mn' ? 'Болих' : 'Cancel'}
              </button>
            )}
          </div>

          <form onSubmit={handleFormSubmit} className="flex flex-col gap-4 text-xs font-semibold text-slate-605">
            {/* 1. Name */}
            <div className="flex flex-col gap-1.5 font-normal">
              <label className="font-extrabold text-[10px] uppercase tracking-wider text-slate-450" htmlFor="emp_name_name">
                {lang === 'mn' ? 'Ажилтны бүтэн нэр:' : 'Full name:'}
              </label>
              <input
                id="emp_name_name"
                type="text"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                placeholder="Жишээ нь: Болдсайхан"
                required
                className="bg-slate-50 border border-slate-200 focus:bg-white focus:border-orange-500 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-orange-100 font-semibold"
              />
            </div>

            {/* 2. Login Username */}
            <div className="flex flex-col gap-1.5 font-normal">
              <label className="font-extrabold text-[10px] uppercase tracking-wider text-slate-450" htmlFor="emp_unm_input">
                {lang === 'mn' ? 'Нэвтрэх нэр (Username):' : 'System Username:'}
              </label>
              <input
                id="emp_unm_input"
                type="text"
                value={usernameInput}
                disabled={editingId === 'emp-1'} // Default master admin cannot change username
                onChange={(e) => setUsernameInput(e.target.value)}
                placeholder="Жишээ: bold123"
                required
                className="bg-slate-50 border border-slate-200 focus:bg-white focus:border-orange-500 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-orange-100 font-semibold disabled:opacity-50"
              />
            </div>

            {/* 3. PIN Passcode code */}
            <div className="flex flex-col gap-1.5 font-normal">
              <label className="font-extrabold text-[10px] uppercase tracking-wider text-slate-450" htmlFor="emp_pin_code">
                {lang === 'mn' ? 'Аюулгүйн ПИН код (4 оронтой тоо):' : '4-Digit PIN code:'}
              </label>
              <input
                id="emp_pin_code"
                type="password"
                maxLength={4}
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value.replace(/[^0-9]/g, ''))}
                placeholder="••••"
                required
                className="bg-slate-50 border border-slate-200 focus:bg-white focus:border-orange-500 tracking-[0.2em] rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-orange-100 font-mono font-bold"
              />
              <p className="text-[9.5px] text-slate-400 font-normal leading-relaxed">
                {lang === 'mn' ? 'Тогооч, зөөгч нар систем рүү нэвтрэхдээ ашиглах 4 оронтой тоо.' : 'Workers will type this 4-digit numeric code to unlock.'}
              </p>
            </div>

            {/* 4. Role Assignment badge chooser */}
            <div className="flex flex-col gap-1.5 font-normal">
              <label className="font-extrabold text-[10px] uppercase tracking-wider text-slate-450" htmlFor="emp_role_picker">
                {lang === 'mn' ? 'Үүрэг роль оноох:' : 'Assign Position Role:'}
              </label>
              <select
                id="emp_role_picker"
                value={roleInput}
                disabled={editingId === 'emp-1'} // Default master admin role is untweakable
                onChange={(e) => setRoleInput(e.target.value as Employee['role'])}
                className="w-full bg-slate-50 border border-slate-205 rounded-xl px-3 py-2 text-xs focus:outline-none font-bold text-slate-705 cursor-pointer disabled:opacity-50"
              >
                <option value="admin">{lang === 'mn' ? 'Админ / Менежер' : 'Admin & Manager'}</option>
                <option value="chef">{lang === 'mn' ? 'Тогооч' : 'Chef'}</option>
                <option value="waiter">{lang === 'mn' ? 'Зөөгч' : 'Waiter'}</option>
              </select>
            </div>

            {/* Submit */}
            <button
              type="submit"
              className="w-full mt-2 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow cursor-pointer transition-all uppercase tracking-wider"
            >
              {editingId ? (lang === 'mn' ? 'Мэдээлэл Шинэчлэх' : 'Tweak Account') : (lang === 'mn' ? 'Ажилтан Нэмэх' : 'Create Account')}
            </button>
          </form>
        </div>
      </div>

    </div>
  );
}
