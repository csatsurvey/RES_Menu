import React from 'react';
import { 
  Briefcase, 
  Clock, 
  Sparkles, 
  Plus, 
  Trash2, 
  LogOut, 
  ShieldAlert, 
  Undo, 
  Settings, 
  AlertCircle, 
  UserCheck 
} from 'lucide-react';
import StaffGatingLogin from './StaffGatingLogin';
import SurveysDashboard from './SurveysDashboard';
import StaffDirectory from './StaffDirectory';

interface MenuDish {
  id: string;
  category: 'traditional' | 'western' | 'desserts' | 'beverages';
  nameMn: string;
  nameEn: string;
  descMn: string;
  descEn: string;
  price: number;
  image: string;
  isSpicy: boolean;
  isVegetarian: boolean;
  isChefSpecial: boolean;
  allergens?: string;
}

interface RestaurantOrder {
  id: string;
  tableNumber: string;
  items: Array<{
    dishId: string;
    name: string;
    priceAtSale: number;
    quantity: number;
  }>;
  totalAmount: number;
  status: 'pending' | 'preparing' | 'ready' | 'delivered' | 'cancelled';
  timestamp: string;
  notes?: string;
}

interface CustomerFeedback {
  id: string;
  tableNumber: string;
  tasteRating: number;
  serviceRating: number;
  comment: string;
  phone?: string;
  status: 'pending' | 'inprogress' | 'solved' | 'uncontactable';
  timestamp: string;
  createdAt?: string;
}

interface Employee {
  id: string;
  name: string;
  username: string;
  pin: string;
  role: 'admin' | 'chef' | 'waiter';
  createdAt: string;
}

interface AdminPanelContainerProps {
  lang: 'mn' | 'en';
  t: any;
  dishes: MenuDish[];
  setDishes: React.Dispatch<React.SetStateAction<MenuDish[]>>;
  orders: RestaurantOrder[];
  setOrders: React.Dispatch<React.SetStateAction<RestaurantOrder[]>>;
  feedbacks: CustomerFeedback[];
  setFeedbacks: React.Dispatch<React.SetStateAction<CustomerFeedback[]>>;
  employees: Employee[];
  setEmployees: React.Dispatch<React.SetStateAction<Employee[]>>;
  currentUser: Employee | null;
  setCurrentUser: (emp: Employee | null) => void;
  adminActiveTab: 'orders' | 'surveys' | 'catalog' | 'employees';
  setAdminActiveTab: (tab: 'orders' | 'surveys' | 'catalog' | 'employees') => void;
  surveyDateInterval: 'all' | 'today' | 'week' | 'month' | 'custom';
  setSurveyDateInterval: (val: 'all' | 'today' | 'week' | 'month' | 'custom') => void;
  surveyStartDate: string;
  setSurveyStartDate: (val: string) => void;
  surveyEndDate: string;
  setSurveyEndDate: (val: string) => void;
  showNotification: (msg: string) => void;
  setViewMode: (mode: 'customer' | 'admin') => void;
  adminTableFilter: string;
  setAdminTableFilter: (val: string) => void;
  handleAdminStatusChange: (id: string, newStatus: RestaurantOrder['status']) => void;
  
  handleEditDishSelect: (dish: MenuDish) => void;
  handleDeleteDish: (id: string) => void;
  resetDishForm: () => void;
  handleSaveDish: (e: React.FormEvent) => void;
  
  dishCategory: MenuDish['category'];
  setDishCategory: (category: MenuDish['category']) => void;
  dishNameMn: string;
  setDishNameMn: (val: string) => void;
  dishNameEn: string;
  setDishNameEn: (val: string) => void;
  dishPrice: string;
  setDishPrice: (val: string) => void;
  
  aiGeneratingDescription: boolean;
  generateAiDescription: () => Promise<void>;
  
  dishDescMn: string;
  setDishDescMn: (val: string) => void;
  dishDescEn: string;
  setDishDescEn: (val: string) => void;
  dishAllergens: string;
  setDishAllergens: (val: string) => void;
  
  dishIsChefSpecial: boolean;
  setDishIsChefSpecial: (val: boolean) => void;
  dishIsSpicy: boolean;
  setDishIsSpicy: (val: boolean) => void;
  dishIsVeg: boolean;
  setDishIsVeg: (val: boolean) => void;
  
  editDishId: string | null;
  
  tempNameMn: string;
  setTempNameMn: (val: string) => void;
  tempNameEn: string;
  setTempNameEn: (val: string) => void;
  handleUpdateProfile: (e: React.FormEvent) => void;
}

export default function AdminPanelContainer({
  lang,
  t,
  dishes,
  setDishes,
  orders,
  setOrders,
  feedbacks,
  setFeedbacks,
  employees,
  setEmployees,
  currentUser,
  setCurrentUser,
  adminActiveTab,
  setAdminActiveTab,
  surveyDateInterval,
  setSurveyDateInterval,
  surveyStartDate,
  setSurveyStartDate,
  surveyEndDate,
  setSurveyEndDate,
  showNotification,
  setViewMode,
  adminTableFilter,
  setAdminTableFilter,
  handleAdminStatusChange,
  handleEditDishSelect,
  handleDeleteDish,
  resetDishForm,
  handleSaveDish,
  dishCategory,
  setDishCategory,
  dishNameMn,
  setDishNameMn,
  dishNameEn,
  setDishNameEn,
  dishPrice,
  setDishPrice,
  aiGeneratingDescription,
  generateAiDescription,
  dishDescMn,
  setDishDescMn,
  dishDescEn,
  setDishDescEn,
  dishAllergens,
  setDishAllergens,
  dishIsChefSpecial,
  setDishIsChefSpecial,
  dishIsSpicy,
  setDishIsSpicy,
  dishIsVeg,
  setDishIsVeg,
  editDishId,
  tempNameMn,
  setTempNameMn,
  tempNameEn,
  setTempNameEn,
  handleUpdateProfile
}: AdminPanelContainerProps) {

  // Dynamic filter lists
  const filteredOrders = orders.filter(order => {
    if (adminTableFilter !== 'all' && order.tableNumber !== adminTableFilter) return false;
    return true;
  });

  const uniqueOrderTables = Array.from(new Set(orders.map(o => o.tableNumber)))
    .filter((tb): tb is string => typeof tb === 'string' && tb.trim().length > 0)
    .sort((a, b) => {
      const numA = parseInt(a) || 0;
      const numB = parseInt(b) || 0;
      return numA - numB;
    });

  return (
    <div className="flex flex-col gap-6" id="admin_root_canvas">
      {!currentUser ? (
        <StaffGatingLogin
          lang={lang}
          employees={employees}
          currentUser={currentUser}
          setCurrentUser={setCurrentUser}
          showNotification={showNotification}
          setViewMode={setViewMode}
        />
      ) : (
        <div className="flex flex-col gap-6">
          
          {/* Back-office navigation title & logged-in staff info */}
          <div className="bg-slate-900 border border-slate-800 text-white rounded-3xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-md animate-fade-in" id="admin_subrole_switch_toolbar">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-600/10 border border-orange-500/20 rounded-xl flex items-center justify-center text-orange-400 shrink-0">
                <UserCheck className="w-5 h-5 text-orange-505" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm tracking-tight text-white">
                  {lang === 'mn' ? `Тавтай морил, ${currentUser.name}` : `Welcome back, ${currentUser.name}`}
                </h3>
                <p className="text-[10px] text-slate-400 font-medium">
                  {lang === 'mn' 
                    ? `Хандах эрх: ${currentUser.role === 'admin' ? 'Админ / Менежер' : currentUser.role === 'chef' ? 'Тогооч (Chef)' : 'Зөөгч (Waiter)'}` 
                    : `Worker Authorization: ${currentUser.role}`}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setCurrentUser(null);
                  showNotification(lang === 'mn' ? 'Системээс гарлаа!' : 'Logged out successfully!');
                }}
                className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-[10.5px] font-extrabold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>{lang === 'mn' ? 'Гарч нэвтрэх' : 'Sign out'}</span>
              </button>
            </div>
          </div>

          {/* Subtabs chooser specifically for System Admin / Managers */}
          {currentUser.role === 'admin' && (
            <div className="bg-white border border-slate-200 p-2.5 rounded-2xl flex flex-wrap items-center gap-1.5 shadow-xs" id="admin_tabs_toolbar">
              {([
                { id: 'orders', labelMn: 'Захиалга Хянах (Live)', labelEn: 'Active Orders' },
                { id: 'surveys', labelMn: 'Сэтгэл ханамж & Судалгаа', labelEn: 'Feedback Dashboard' },
                { id: 'catalog', labelMn: 'Хоолны цэс засварлах', labelEn: 'Dishes Catalog' },
                { id: 'employees', labelMn: 'Ажилчдын мэдээлэл удирдах', labelEn: 'Staff Management' }
              ] as const).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setAdminActiveTab(tab.id)}
                  className={`px-4 py-2 rounded-xl text-[11px] font-extrabold tracking-wide transition-all cursor-pointer flex items-center gap-1.5 ${
                    adminActiveTab === tab.id
                      ? 'bg-orange-600 text-white shadow-sm shadow-orange-500/15'
                      : 'bg-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100/50'
                  }`}
                >
                  {lang === 'mn' ? tab.labelMn : tab.labelEn}
                </button>
              ))}
            </div>
          )}

          {/* Prompt banner for constrained staff (cook / wait staff) */}
          {currentUser.role !== 'admin' && (
            <div className="bg-orange-50/70 border border-orange-100 rounded-2xl px-4 py-3 text-[11px] font-normal leading-relaxed text-orange-950 flex items-start gap-2.5 animate-fade-in">
              <ShieldAlert className="w-4 h-4 text-orange-600 shrink-0 mt-0.5" />
              <div>
                {currentUser.role === 'waiter' && (
                  <p>
                    {lang === 'mn' 
                      ? 'Та ЗӨӨГЧ эрхээр нэвтэрсэн байна. Зөвхөн ширээний захиалгын урсгал хянах, хүргэлт тэмдэглэх боломжтой. Студи, үнэ шинэчлэл хязгаарлагдсан.' 
                      : 'Switched to constrained WAITER dashboard. Toggling delivered status and ticket status authorized only.'}
                  </p>
                )}
                {currentUser.role === 'chef' && (
                  <p>
                    {lang === 'mn' 
                      ? 'Та ТОГООЧ эрхээр нэвтэрсэн байна. Зөвхөн захиалсан хоолнуудыг харах, бэлтгэж эхлэх, бэлэн болсон төлөвт оруулах боломжтой. Үнэ болон ажилчдын бүртгэл хаалттай.' 
                      : 'Switched to CHEF setup. Authorized only to audit pending dishes and ingredient prep logs.'}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* TAB RENDERING CONDITIONALS */}
          
          {/* 1. ORDERS LIVE LIST TICKET TRAFFIC (Manager 'orders' tab, waiter, or chef) */}
          {((currentUser.role === 'admin' && adminActiveTab === 'orders') || currentUser.role !== 'admin') && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="incoming_orders_session">
              <div className="lg:col-span-12 flex flex-col gap-5">
                
                {/* Visual stats layout cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
                    <span className="text-[9.5px] font-extrabold text-slate-400 uppercase tracking-widest block mb-1">
                      {lang === 'mn' ? 'ХҮЛЭЭГДЭЖ БУЙ ЗАХИАЛГА:' : 'PENDING TICKETS COUNT:'}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-mono font-extrabold text-slate-900">
                        {orders.filter(o => o.status !== 'delivered' && o.status !== 'cancelled').length}
                      </span>
                      <span className="text-[10px] text-orange-600 bg-orange-50 border border-orange-100 rounded-full px-2 py-0.5 font-bold animate-pulse">
                        Live Monitor
                      </span>
                    </div>
                  </div>

                  <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
                    <span className="text-[9.5px] font-extrabold text-slate-400 uppercase tracking-widest block mb-1">
                      {lang === 'mn' ? 'РЕСТОРАНЫ ИДЭВХТЭЙ ХООЛ:' : 'TOTAL ACTIVE DISHES:'}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-mono font-extrabold text-slate-900 text-indigo-950">
                        {dishes.length}
                      </span>
                      <span className="text-[10px] text-indigo-600 bg-indigo-50 border border-indigo-100 rounded-full px-2 py-0.5 font-bold">
                        Bake Ledger
                      </span>
                    </div>
                  </div>
                </div>

                {/* ACTIVE CUSTOMER ORDERS LEDGER TICKET */}
                <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs flex flex-col gap-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                    <h3 className="text-slate-800 font-extrabold text-sm tracking-tight flex items-center gap-2">
                      <Clock className="w-4 h-4 text-orange-600" />
                      {lang === 'mn' ? 'Ширээний Захиалгуудын Хяналтын Хэсэг' : 'Incoming Client Orders Monitor'}
                    </h3>

                    {/* Table filtering spinner dropdown */}
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                        {lang === 'mn' ? 'Шүүх ширээ:' : 'Filter Table:'}
                      </span>
                      <select
                        id="table_filter_dropdown"
                        value={adminTableFilter}
                        onChange={(e) => setAdminTableFilter(e.target.value)}
                        className="bg-slate-50 border border-slate-200 text-[11px] font-bold rounded-xl px-2.5 py-1 text-slate-700 outline-none focus:border-orange-500 cursor-pointer"
                      >
                        <option value="all">
                          {lang === 'mn' ? 'Бүх ширээ (All)' : 'All Tables'}
                        </option>
                        {uniqueOrderTables.map((tb) => (
                          <option key={tb} value={tb}>
                            {lang === 'mn' ? `${tb}-р ширээ` : `Table ${tb}`}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {filteredOrders.length === 0 ? (
                    <div className="py-12 text-center text-slate-400 flex flex-col items-center justify-center gap-2 font-normal">
                      <AlertCircle className="w-8 h-8 text-slate-200" />
                      <p className="text-xs">
                        {lang === 'mn' ? 'Энэ баганад идэвхтэй захиалга олдсонгүй.' : 'No active orders registered in this group.'}
                      </p>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-4 animate-fade-in">
                      {filteredOrders.map((order) => {
                        const isClosed = order.status === 'delivered' || order.status === 'cancelled';
                        return (
                          <div 
                            key={order.id} 
                            className={`border rounded-2xl p-4 flex flex-col gap-3 transition-colors ${
                              order.status === 'pending' ? 'bg-orange-50/10 border-orange-200' :
                              order.status === 'preparing' ? 'bg-blue-50/10 border-blue-200' :
                              order.status === 'ready' ? 'bg-emerald-50/10 border-emerald-200' :
                              'bg-slate-50 border-slate-200 opacity-70'
                            }`}
                          >
                            <div className="flex justify-between items-start gap-4 pb-2 border-b border-slate-100">
                              <div>
                                <span className="font-extrabold text-xs bg-slate-900 text-white rounded-lg px-2.5 py-1 mr-2 font-mono">
                                  {t[lang].table} {order.tableNumber}
                                </span>
                                <span className="text-[10.5px] font-mono text-slate-400 font-bold">{order.timestamp}</span>
                              </div>
                              
                              <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-lg ${
                                order.status === 'pending' ? 'bg-orange-100 text-orange-850' :
                                order.status === 'preparing' ? 'bg-blue-100 text-blue-700' :
                                order.status === 'ready' ? 'bg-emerald-100 text-emerald-805' :
                                order.status === 'delivered' ? 'bg-slate-200 text-slate-700' :
                                'bg-red-100 text-red-700'
                              }`}>
                                {t[lang][`orderStatus_${order.status}` as keyof typeof t['mn']]}
                              </span>
                            </div>

                            {/* Ticket dishes details */}
                            <div className="bg-white p-3 rounded-xl border border-slate-100 flex flex-col gap-2">
                              {order.items.map((it, dIdx) => (
                                <div key={dIdx} className="flex justify-between items-center text-xs text-slate-700">
                                  <span className="font-semibold">
                                    {it.quantity}x <strong className="font-extrabold text-slate-800">{it.name}</strong>
                                  </span>
                                  <span className="font-mono text-slate-500 font-bold">
                                    {(it.priceAtSale * it.quantity).toLocaleString()}{t[lang].currency}
                                  </span>
                                </div>
                              ))}
                              {order.notes && (
                                <div className="mt-1 pt-2 border-t border-dashed border-slate-150 text-[10px] text-slate-550 italic font-medium leading-normal">
                                  <span className="font-extrabold text-orange-650 block not-italic uppercase tracking-wider text-[8.5px]">{t[lang].specialNotes}</span>
                                  "{order.notes}"
                                </div>
                              )}
                            </div>

                            {/* Footer parameters & statuses change buttons */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                              <div className="text-xs text-slate-650 font-bold">
                                {lang === 'mn' ? 'Захиалгын нийт төлбөр:' : 'Total Ticket Price:'} <strong className="font-mono font-extrabold text-slate-900">{(order.totalAmount).toLocaleString()}{t[lang].currency}</strong>
                              </div>

                              <div className="flex items-center gap-1.5 self-end sm:self-auto">
                                {!isClosed && (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => handleAdminStatusChange(order.id, 'cancelled')}
                                      className="px-2.5 py-1.5 rounded-xl border border-red-200 hover:bg-red-50 text-red-650 text-[10px] font-bold cursor-pointer transition-colors"
                                    >
                                      {t[lang].cancelOrder}
                                    </button>

                                    {order.status === 'pending' && currentUser.role !== 'waiter' && (
                                      <button
                                        type="button"
                                        onClick={() => handleAdminStatusChange(order.id, 'preparing')}
                                        className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-extrabold rounded-xl cursor-pointer shadow"
                                      >
                                        {t[lang].cookBtn}
                                      </button>
                                    )}

                                    {(order.status === 'preparing' || order.status === 'pending') && currentUser.role !== 'waiter' && (
                                      <button
                                        type="button"
                                        onClick={() => handleAdminStatusChange(order.id, 'ready')}
                                        className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-extrabold rounded-xl cursor-pointer shadow"
                                      >
                                        {lang === 'mn' ? 'Бэлэн болсон' : 'Mark Ready'}
                                      </button>
                                    )}

                                    {order.status === 'ready' && currentUser.role !== 'chef' && (
                                      <button
                                        type="button"
                                        onClick={() => handleAdminStatusChange(order.id, 'delivered')}
                                        className="px-3.5 py-1.5 bg-slate-950 hover:bg-slate-850 text-white text-[10px] font-extrabold rounded-xl cursor-pointer shadow"
                                      >
                                        {t[lang].servedBtn}
                                      </button>
                                    )}
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

              </div>
            </div>
          )}

          {/* 2. CUSTOMER EVALUATION REPORT FEED */}
          {currentUser.role === 'admin' && adminActiveTab === 'surveys' && (
            <SurveysDashboard
              lang={lang}
              feedbacks={feedbacks}
              setFeedbacks={setFeedbacks}
              showNotification={showNotification}
              surveyDateInterval={surveyDateInterval}
              setSurveyDateInterval={setSurveyDateInterval}
              surveyStartDate={surveyStartDate}
              setSurveyStartDate={setSurveyStartDate}
              surveyEndDate={surveyEndDate}
              setSurveyEndDate={setSurveyEndDate}
            />
          )}

          {/* 3. DISH CATALOGS EDITING MANAGEMENT (FOR MANAGERS ONLY) */}
          {currentUser.role === 'admin' && adminActiveTab === 'catalog' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fade-in">
              {/* Dishes Directory ledger */}
              <div className="lg:col-span-8 flex flex-col gap-4">
                <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs">
                  <h3 className="text-slate-800 font-extrabold text-sm tracking-tight pb-3 border-b border-slate-100">
                    {lang === 'mn' ? 'Манай цэсэнд байгаа хоолнуудын жагсаалт' : 'Food Dishes Catalogue ledgers'}
                  </h3>

                  <div className="flex flex-col gap-2 mt-4">
                    {dishes.map((dish) => (
                      <div 
                        key={dish.id} 
                        className="flex items-center justify-between gap-4 p-3 bg-slate-50 border border-slate-200 rounded-2xl hover:border-slate-350 transition-colors"
                      >
                        <div className="flex items-center gap-3.5 min-w-0 flex-1">
                          <img 
                            src={dish.image} 
                            alt="" 
                            referrerPolicy="no-referrer"
                            className="w-11 h-11 object-cover rounded-xl bg-white shrink-0 border border-slate-200/50" 
                          />
                          <div className="min-w-0">
                            <span className="font-extrabold text-xs text-slate-850 block truncate">
                              {lang === 'mn' ? dish.nameMn : dish.nameEn}
                            </span>
                            <span className="text-[10px] font-mono font-bold text-indigo-700 flex items-center gap-1.5 mt-0.5">
                              <span className="bg-indigo-50 border border-indigo-100 px-1.5 py-0.5 rounded-lg">
                                {t[lang].categories[dish.category]}
                              </span>
                              <span>
                                {dish.price.toLocaleString()}{t[lang].currency}
                              </span>
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleEditDishSelect(dish)}
                            className="px-2.5 py-1.5 bg-white hover:bg-slate-50 border border-slate-300 rounded-xl text-slate-700 text-[10.5px] font-bold cursor-pointer transition-colors"
                          >
                            {lang === 'mn' ? 'Засах' : 'Edit'}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteDish(dish.id)}
                            className="p-1.5 bg-white hover:bg-red-50 hover:text-red-700 text-slate-400 border border-slate-200 rounded-xl cursor-pointer transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Add/Tweak form panel */}
              <div className="lg:col-span-4 flex flex-col gap-6">
                <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs">
                  <div className="flex justify-between items-center pb-3 border-b border-slate-100 mb-4">
                    <h3 className="font-extrabold text-xs uppercase tracking-wider text-slate-450 flex items-center gap-1.5">
                      <Plus className="w-4 h-4 text-orange-600 font-bold" />
                      {editDishId ? t[lang].editDish : t[lang].addDish}
                    </h3>
                    {editDishId && (
                      <button 
                        type="button" 
                        onClick={resetDishForm}
                        className="p-1 hover:bg-slate-100 rounded-lg text-slate-505 cursor-pointer"
                      >
                        <Undo className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <form onSubmit={handleSaveDish} className="flex flex-col gap-4 text-xs font-semibold text-slate-605">
                    <div className="flex flex-col gap-1.5 font-normal">
                      <label className="font-extrabold text-[10px] uppercase tracking-wider text-slate-450" htmlFor="admin_form_category">
                        {t[lang].categorySelection}
                      </label>
                      <select
                        id="admin_form_category"
                        value={dishCategory}
                        onChange={(e) => setDishCategory(e.target.value as MenuDish['category'])}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-orange-500 font-bold text-slate-705 cursor-pointer"
                      >
                        <option value="traditional">{t[lang].categories.traditional}</option>
                        <option value="western">{t[lang].categories.western}</option>
                        <option value="desserts">{t[lang].categories.desserts}</option>
                        <option value="beverages">{t[lang].categories.beverages}</option>
                      </select>
                    </div>

                    <div className="flex flex-col gap-1.5 font-normal">
                      <label className="font-extrabold text-[10px] uppercase tracking-wider text-slate-450" htmlFor="dish_name_mn_fd">
                        {t[lang].dishNameMn}
                      </label>
                      <input
                        id="dish_name_mn_fd"
                        type="text"
                        value={dishNameMn}
                        onChange={(e) => setDishNameMn(e.target.value)}
                        placeholder="Жишээ: Бууз, Цуйван гэх мэт"
                        className="bg-slate-50 border border-slate-200 focus:bg-white focus:border-orange-500 rounded-xl px-3 py-2 text-xs focus:outline-none transition-all font-semibold"
                        required
                      />
                    </div>

                    <div className="flex flex-col gap-1.5 font-normal">
                      <label className="font-extrabold text-[10px] uppercase tracking-wider text-slate-450" htmlFor="dish_name_en_fd">
                        {t[lang].dishNameEn}
                      </label>
                      <input
                        id="dish_name_en_fd"
                        type="text"
                        value={dishNameEn}
                        onChange={(e) => setDishNameEn(e.target.value)}
                        placeholder="E.g., Steamed dumpling"
                        className="bg-slate-50 border border-slate-200 focus:bg-white focus:border-orange-500 rounded-xl px-3 py-2 text-xs focus:outline-none transition-all font-semibold"
                        required
                      />
                    </div>

                    <div className="flex flex-col gap-1.5 font-normal">
                      <label className="font-extrabold text-[10px] uppercase tracking-wider text-slate-450 flex justify-between" htmlFor="dish_price_fd">
                        <span>{t[lang].price}</span>
                        <span className="font-mono text-orange-600 font-bold">{parseInt(dishPrice).toLocaleString()}{t[lang].currency}</span>
                      </label>
                      <input
                        id="dish_price_fd"
                        type="range"
                        min="1000"
                        max="90000"
                        step="500"
                        value={dishPrice}
                        onChange={(e) => setDishPrice(e.target.value)}
                        className="accent-orange-500 cursor-pointer"
                      />
                    </div>

                    <div className="flex flex-col gap-1 border-t border-slate-100 pt-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-extrabold text-[10px] uppercase tracking-wider text-slate-450">
                          {lang === 'mn' ? 'Gemini AI Тайбар бичигч:' : 'Gemini AI Assistant:'}
                        </span>
                        <button
                          type="button"
                          disabled={aiGeneratingDescription}
                          onClick={generateAiDescription}
                          className="px-2 py-1 bg-amber-505 hover:bg-amber-600 hover:text-white disabled:bg-slate-200 text-slate-800 font-extrabold text-[9px] rounded-lg tracking-wider uppercase transition-all flex items-center gap-1 cursor-pointer"
                        >
                          <Sparkles className="w-3 h-3 text-amber-955 animate-pulse" />
                          <span>{aiGeneratingDescription ? '...' : (lang === 'mn' ? 'AI бичих' : 'Gemini write')}</span>
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-col gap-1.5 font-normal">
                      <label className="font-extrabold text-[10px] uppercase tracking-wider text-slate-450" htmlFor="dish_desc_mn_fd">
                        {t[lang].descMn}
                      </label>
                      <textarea
                        id="dish_desc_mn_fd"
                        rows={2}
                        value={dishDescMn}
                        onChange={(e) => setDishDescMn(e.target.value)}
                        className="bg-slate-50 border border-slate-200 focus:bg-white focus:border-orange-500 rounded-xl p-2.5 text-xs focus:outline-none font-medium leading-relaxed"
                      />
                    </div>

                    <div className="flex flex-col gap-1.5 font-normal">
                      <label className="font-extrabold text-[10px] uppercase tracking-wider text-slate-450" htmlFor="dish_desc_en_fd">
                        {t[lang].descEn}
                      </label>
                      <textarea
                        id="dish_desc_en_fd"
                        rows={2}
                        value={dishDescEn}
                        onChange={(e) => setDishDescEn(e.target.value)}
                        className="bg-slate-50 border border-slate-200 focus:bg-white focus:border-orange-500 rounded-xl p-2.5 text-xs focus:outline-none font-medium leading-relaxed"
                      />
                    </div>

                    <div className="flex flex-col gap-1.5 font-normal">
                      <label className="font-extrabold text-[10px] uppercase tracking-wider text-slate-450" htmlFor="dish_aller_fd">
                        {t[lang].allergens}
                      </label>
                      <input
                        id="dish_aller_fd"
                        type="text"
                        value={dishAllergens}
                        onChange={(e) => setDishAllergens(e.target.value)}
                        className="bg-slate-50 border border-slate-200 focus:bg-white focus:border-orange-500 rounded-xl px-3 py-2 text-xs focus:outline-none font-semibold"
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-2 py-1 font-normal text-xs">
                      <label className="flex items-center gap-1 cursor-pointer" htmlFor="check_spec">
                        <input
                          id="check_spec"
                          type="checkbox"
                          checked={dishIsChefSpecial}
                          onChange={(e) => setDishIsChefSpecial(e.target.checked)}
                          className="accent-orange-500 cursor-pointer w-3.5 h-3.5"
                        />
                        <span className="text-[10px] text-slate-500 font-bold">Special</span>
                      </label>

                      <label className="flex items-center gap-1 cursor-pointer" htmlFor="check_spicy">
                        <input
                          id="check_spicy"
                          type="checkbox"
                          checked={dishIsSpicy}
                          onChange={(e) => setDishIsSpicy(e.target.checked)}
                          className="accent-orange-500 cursor-pointer w-3.5 h-3.5"
                        />
                        <span className="text-[10px] text-slate-500 font-bold">Spicy</span>
                      </label>

                      <label className="flex items-center gap-1 cursor-pointer" htmlFor="check_veg">
                        <input
                          id="check_veg"
                          type="checkbox"
                          checked={dishIsVeg}
                          onChange={(e) => setDishIsVeg(e.target.checked)}
                          className="accent-orange-500 cursor-pointer w-3.5 h-3.5"
                        />
                        <span className="text-[10px] text-slate-500 font-bold">Veg 🌱</span>
                      </label>
                    </div>

                    <button
                      type="submit"
                      className="w-full mt-2 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow cursor-pointer transition-all uppercase tracking-wider"
                    >
                      {editDishId ? t[lang].updateDish : t[lang].saveDish}
                    </button>
                  </form>
                </div>

                {/* Profile panel */}
                <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs">
                  <div className="pb-3 border-b border-slate-100 flex items-center gap-2 mb-4">
                    <Settings className="w-4 h-4 text-orange-605" />
                    <h3 className="font-extrabold text-xs uppercase tracking-wider text-slate-450">
                      {t[lang].editProfileTitle}
                    </h3>
                  </div>

                  <form onSubmit={handleUpdateProfile} className="flex flex-col gap-4 font-normal text-xs select-none">
                    <div className="flex flex-col gap-1.5 font-normal">
                      <label className="font-extrabold text-[10px] uppercase tracking-wider text-slate-400" htmlFor="profile_name_mn">
                        {t[lang].restNameLabelMn}
                      </label>
                      <input
                        id="profile_name_mn"
                        type="text"
                        value={tempNameMn}
                        onChange={(e) => setTempNameMn(e.target.value)}
                        className="bg-slate-50 border border-slate-200 focus:bg-white focus:border-orange-500 rounded-xl px-3 py-2 text-xs focus:outline-none font-semibold"
                        required
                      />
                    </div>

                    <div className="flex flex-col gap-1.5 font-normal">
                      <label className="font-extrabold text-[10px] uppercase tracking-wider text-slate-400" htmlFor="profile_name_en">
                        {t[lang].restNameLabelEn}
                      </label>
                      <input
                        id="profile_name_en"
                        type="text"
                        value={tempNameEn}
                        onChange={(e) => setTempNameEn(e.target.value)}
                        className="bg-slate-50 border border-slate-200 focus:bg-white focus:border-orange-505 rounded-xl px-3 py-2 text-xs focus:outline-none font-semibold"
                        required
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full mt-2 py-2.5 bg-orange-650 hover:bg-orange-700 text-white font-bold text-xs rounded-xl shadow cursor-pointer transition-all uppercase tracking-wider"
                    >
                      {t[lang].saveProfileBtn}
                    </button>
                  </form>
                </div>
              </div>
            </div>
          )}

          {/* 4. STAFF ROSTER USER DIRECTORY */}
          {currentUser.role === 'admin' && adminActiveTab === 'employees' && (
            <StaffDirectory
              lang={lang}
              employees={employees}
              setEmployees={setEmployees}
              currentUser={currentUser}
              setCurrentUser={setCurrentUser}
              showNotification={showNotification}
            />
          )}

        </div>
      )}
    </div>
  );
}
