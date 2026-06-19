import React, { useState, useEffect } from 'react';
import { 
  Utensils, 
  ShoppingBag, 
  Search, 
  Settings, 
  User, 
  Plus, 
  Minus, 
  Trash2, 
  Check, 
  ChevronRight, 
  Sparkles, 
  HelpCircle, 
  AlertCircle, 
  Clock, 
  Coffee, 
  Flame, 
  Send, 
  Undo,
  TrendingUp,
  FileText,
  DollarSign,
  Briefcase,
  X,
  Languages,
  QrCode,
  Printer,
  Star,
  Lock,
  ShieldAlert,
  LogOut,
  UserCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import StaffGatingLogin from './components/StaffGatingLogin';
import SurveysDashboard from './components/SurveysDashboard';
import StaffDirectory from './components/StaffDirectory';
import AdminPanelContainer from './components/AdminPanelContainer';

// Language translation dict
const t = {
  mn: {
    appName: "Гурмэ Бэнто Ресторан",
    appSubtitle: "Интерактив цахим меню болон ухаалаг AI захиалгын систем",
    searchPlaceholder: "Хайх хоол, найрлага...",
    allDishes: "Бүх цэс",
    customerView: "Хэрэглэгчийн цэс",
    adminView: "Гал тогоо / Админ хяналт",
    cartTitle: "Таны сагс",
    tableNo: "Ширээний дугаар:",
    specialNotes: "Тогоочид өгөх тусгай заавар:",
    notesPlaceholder: "Жишээ нь: Сонгиногүй хийгээрэй, Давс багатай гэх мэт...",
    emptyCart: "Захиалгын сагс хоосон байна.",
    addToCart: "Сагсанд нэмэх",
    placeOrder: "Захиалга илгээх",
    total: "Нийт үнэ:",
    currency: "₮",
    spicy: "Халуун ногоотой",
    veg: "Цагаан хоол",
    chefSpecial: "Онцлох хоол",
    aiAssistantTitle: "AI меню зөвлөх",
    aiAssistantPlaceholder: "Цэсний талаар асуух зүйлээ энд бичнэ үү...",
    aiAssistantWelcome: "Сайн байна уу! Би таны хоолны сонголтод туслах AI туслах байна. Та 'Онцлох хоолнууд юу байна?', 'Махгүй ямар сонголт байна?', 'Хамгийн хямд хоол?' гэх мэтээр асуугаарай.",
    activeOrderTracking: "Захиалга боловсруулалт",
    orderStatus_pending: "Илгээсэн",
    orderStatus_preparing: "Бэлтгэж байна",
    orderStatus_ready: "Бэлэн болсон",
    orderStatus_delivered: "Хүргэгдсэн",
    orderStatus_cancelled: "Цуцлагдсан",
    orderStatusDesc: "Гал тогооноос таны захиалгыг хүлээн авч бэлтгэж буй явц:",
    successOrder: "Захиалга амжилттай баталгаажлаа! Сонгосон ширээнд тань удахгүй хүргэнэ.",
    adminDashboardTitle: "Бэк-Офис Хянах Самбар",
    ordersCount: "Нийт идэвхтэй захиалга",
    menuItemsCount: "Цэсэн дэх хоол",
    addDish: "Цэсэнд шинэ хоол нэмэх",
    dishNameMn: "Хоолны нэр (Монгол хэл дээр):",
    dishNameEn: "Хоолны нэр (Англи хэл дээр):",
    descMn: "Тайлбар (Монгол хэл дээр):",
    descEn: "Тайлбар (Англи хэл дээр):",
    price: "Үнэ (₮):",
    categorySelection: "Ангилал сонгох:",
    saveDish: "Хоолыг хадгалах",
    aiDescriptionBtn: "AI тайлбар үүсгэх",
    aiDescriptionLoading: "AI ажиллаж байна...",
    dishAddedSuccess: "Шинэ хоол цэсэнд амжилттай нэмэгдлээ!",
    deleteConfirm: "Та энэ хоолыг устгахдаа итгэлтэй байна уу?",
    orderStatusUpdated: "Захиалгын төлөв шинэчлэгдлээ.",
    noActiveOrders: "Одоогоор шинээр орж ирсэн захиалга байхгүй байна.",
    table: "Ширээ",
    actions: "Үйлдэл",
    items: "Хоолнууд",
    time: "Хугацаа",
    cancelOrder: "Цуцлах",
    servedBtn: "Хүргэснээр тэмдэглэх",
    cookBtn: "Бэлтгэж эхлэх",
    categories: {
      all: "Бүгд",
      traditional: "Монгол хоол",
      western: "Европ хоол",
      desserts: "Амттан",
      beverages: "Ундаа & Уух зүйлс"
    },
    spiceAlert: "Хурц халуун ногоотой",
    allergens: "Дархлааны харшил ба найрлага",
    editDish: "Хоол засах",
    updateDish: "Сайжруулан хадгалах",
    filters: "Шүүлтүүр",
    editProfileTitle: "Рестораны мэдээлэл засах",
    restNameLabelMn: "Рестораны нэр (Монгол хэл дээр):",
    restNameLabelEn: "Рестораны нэр (Англи хэл дээр):",
    restSubLabelMn: "Тайлбар / Дэд гарчиг (Монгол):",
    restSubLabelEn: "Тайлбар / Дэд гарчиг (Англи):",
    saveProfileBtn: "Мэдээллийг шинэчлэх",
    profileSavedSuccess: "Рестораны мэдээлэл амжилттай шинэчлэгдлээ!",
    qrTitle: "Ширээний байнгын QR код",
    qrSub: "Уг QR код нь хэзээ ч хүчингүй болохгүй бөгөөд олон жилийн дараа уншуулсан ч идэвхтэй байна.",
    surveyTitle: "Сэтгэл ханамжийн судалгаа",
    surveySub: "Та манай хоол болон үйлчилгээг үнэлж, цаашид сайжруулахад тусална уу.",
    srvTasteRating: "Хоолны амт, чанар:",
    srvServiceRating: "Үйлчилгээ, хурд хэмжээ:",
    srvComment: "Таны санал хүсэлт, өгөх зөвлөмж:",
    srvCommentPlaceholder: "Энд өөрийн сэтгэгдлийг хуваалцана уу (жишээ нь: тогоочид урам өгөх, засах зүйл)...",
    srvSubmitBtn: "Судалгааг илгээх",
    srvSuccess: "Санал хүсэлт өгсөнд баярлалаа! Бид улам хичээх болно.",
    adminFeedbackTitle: "Үйлчлүүлэгчдийн Сэтгэл Ханамж & Судалгаа",
    allFeedbacksCount: "Ирсэн нийт судалгаа",
    feedtableRating: "Амт / Үйлчилгээ",
    feedtableComment: "Санал хүсэлт, сэтгэгдэл",
    averageStats: "Судалгааны дундаж үзүүлэлт",
    tasteAvg: "Хоолны амтны дүн",
    serviceAvg: "Үйлчилгээний дүн",
    surveyClearAlert: "Сэтгэл ханамжийн бүх мэдээллийг устгах уу?",
    srvPhoneLabel: "Утасны дугаар (Холбоо барих):",
    srvPhonePlaceholder: "Утасны дугаараа оруулбал бид эргэн холбогдож шийдвэрлэх боломжтой...",
    srvStatusLabel: "Шийдвэрлэлтийн төлөв:",
    status_pending: "Шийдээгүй",
    status_inprogress: "Шийдэгдэж байгаа",
    status_solved: "Шийдсэн",
    status_uncontactable: "Холбогдож чадаагүй",
    statusChangeNotification: "Санал хүсэлтийн төлөв шинэчлэгдлээ!",
    feedbackStatusFilter: "Төлөвөөр шүүх:",
    allFeedbacks: "Бүгд"
  },
  en: {
    appName: "Gourmet Bento Restaurant",
    appSubtitle: "Interactive digital menu and smart AI order assistant",
    searchPlaceholder: "Search for meals, ingredients...",
    allDishes: "Full Menu",
    customerView: "Customer Menu",
    adminView: "Kitchen / Admin Panel",
    cartTitle: "Your Order Cart",
    tableNo: "Table Number:",
    specialNotes: "Special instructions for Chef:",
    notesPlaceholder: "E.g., No onion, less salt, extra dressing...",
    emptyCart: "Your order cart is currently empty.",
    addToCart: "Add to Cart",
    placeOrder: "Confirm & Order",
    total: "Total Price:",
    currency: "₮",
    spicy: "Spicy",
    veg: "Vegetarian",
    chefSpecial: "Chef Special",
    aiAssistantTitle: "AI Menu Advisor",
    aiAssistantPlaceholder: "Ask me anything about the dishes...",
    aiAssistantWelcome: "Hello! I am your AI assistant to help configure your perfect meal. Try asking: 'What are the chef specials?', 'Any sugar-free desserts?', 'Suggest a traditional Mongolian dish'!",
    activeOrderTracking: "Order Blueprint Status",
    orderStatus_pending: "Placed",
    orderStatus_preparing: "Preparing",
    orderStatus_ready: "Cooked",
    orderStatus_delivered: "Served",
    orderStatus_cancelled: "Cancelled",
    orderStatusDesc: "Live update directly from the kitchen chefs:",
    successOrder: "Your order is confirmed! It will be brought to your table shortly.",
    adminDashboardTitle: "Back-office Command",
    ordersCount: "Active Client Tickets",
    menuItemsCount: "Dishes in Directory",
    addDish: "Add Custom Dish to Menu",
    dishNameMn: "Dish Name (Mongolian):",
    dishNameEn: "Dish Name (English):",
    descMn: "Description (Mongolian):",
    descEn: "Description (English):",
    price: "Price (₮):",
    categorySelection: "Select Category:",
    saveDish: "Save Dish Entry",
    aiDescriptionBtn: "GenAI Auto Description",
    aiDescriptionLoading: "AI drafting...",
    dishAddedSuccess: "Dish dynamically added to active restaurant directory!",
    deleteConfirm: "Are you sure you want to delete this dish?",
    orderStatusUpdated: "Client ticket state successfully updated.",
    noActiveOrders: "No active incoming table orders right now.",
    table: "Table",
    actions: "Actions",
    items: "Items Ordered",
    time: "Time Placed",
    cancelOrder: "Cancel",
    servedBtn: "Mark Served",
    cookBtn: "Start Preparing",
    categories: {
      all: "All Categories",
      traditional: "Mongolian Heritage",
      western: "Western Cuisine",
      desserts: "Desserts & Sweets",
      beverages: "Gourmet Beverages"
    },
    spiceAlert: "Highly Spiced Hot!",
    allergens: "Allergens & Composition",
    editDish: "Modify Dish Details",
    updateDish: "Save Updates",
    filters: "Filters",
    editProfileTitle: "Edit Restaurant Profile",
    restNameLabelMn: "Restaurant Name (Mongolian):",
    restNameLabelEn: "Restaurant Name (English):",
    restSubLabelMn: "Description / Subtitle (Mongolian):",
    restSubLabelEn: "Description / Subtitle (English):",
    saveProfileBtn: "Update Profile Info",
    profileSavedSuccess: "Restaurant profile successfully updated!",
    qrTitle: "Permanent Table QR Dispatch",
    qrSub: "Scan to open digital menu instantly. This link NEVER expires and will remain active for years to come!",
    surveyTitle: "Customer Satisfaction Survey",
    surveySub: "Please rate your experience and help us elevate our restaurant services",
    srvTasteRating: "Food Taste & Quality:",
    srvServiceRating: "Service & Staff Speed:",
    srvComment: "Your Feedback or Advice:",
    srvCommentPlaceholder: "Write your suggestions here (cheers to chefs, improvements)...",
    srvSubmitBtn: "Submit Feedback Survey",
    srvSuccess: "Grand thanks for your feedback! Your voice drives our daily improvements.",
    adminFeedbackTitle: "Client Satisfaction & Reviews Feed",
    allFeedbacksCount: "Total Feedbacks Received",
    feedtableRating: "Taste / Service",
    feedtableComment: "Comments / Reviews",
    averageStats: "Average Rating Stats",
    tasteAvg: "Food Taste",
    serviceAvg: "Service Speed",
    surveyClearAlert: "Are you sure you want to clear all survey logs?",
    srvPhoneLabel: "Phone Number (Contact):",
    srvPhonePlaceholder: "Enter contact number so we can reach back to resolve issues...",
    srvStatusLabel: "Resolution Status:",
    status_pending: "Pending / Unsolved",
    status_inprogress: "In Progress",
    status_solved: "Solved",
    status_uncontactable: "Unable to Contact",
    statusChangeNotification: "Feedback status updated successfully!",
    feedbackStatusFilter: "Status Filter:",
    allFeedbacks: "All"
  }
};

interface MenuDish {
  id: string;
  nameMn: string;
  nameEn: string;
  descMn: string;
  descEn: string;
  price: number;
  category: string;
  image: string;
  isSpicy: boolean;
  isVegetarian: boolean;
  isChefSpecial: boolean;
  allergens?: string;
  cookingTimeMinutes: number;
  isHidden?: boolean; // manager hide/unhide toggle
}

interface CartItem {
  dish: MenuDish;
  quantity: number;
}

interface RestaurantOrder {
  id: string;
  tableNumber: string;
  items: { dishId: string; name: string; quantity: number; priceAtSale: number }[];
  totalAmount: number;
  notes: string;
  status: 'pending' | 'preparing' | 'ready' | 'delivered' | 'cancelled';
  timestamp: string;
  placedAt?: string;
  preparingAt?: string;
  readyAt?: string;
  deliveredAt?: string;
}

interface Employee {
  id: string;
  name: string;
  username: string;
  pin: string;
  role: 'admin' | 'chef' | 'waiter';
  createdAt: string;
  phone?: string;
  isActive?: boolean;
}

const INITIAL_EMPLOYEES: Employee[] = [
  { id: 'emp-1', name: 'Болд (Админ)', username: 'admin', pin: '1234', role: 'admin', createdAt: '2026-06-17T07:20:55.000Z', phone: '99112233', isActive: true },
  { id: 'emp-2', name: 'Ууганхүү (Тогооч)', username: 'chef', pin: '2222', role: 'chef', createdAt: '2026-06-17T07:20:55.000Z', phone: '88114422', isActive: true },
  { id: 'emp-3', name: 'Сүхбат (Зөөгч)', username: 'waiter', pin: '3333', role: 'waiter', createdAt: '2026-06-17T07:20:55.000Z', phone: '95156633', isActive: true },
];

interface CustomerFeedback {
  id: string;
  tableNumber: string;
  tasteRating: number; // 1-5 fallback
  serviceRating: number; // 1-5 fallback
  comment: string;
  phone?: string;
  status: string; // Dynamic status resolution states
  timestamp: string;
  createdAt?: string;
  ratings?: Record<string, number>; // Dynamic question ratings
}

const INITIAL_DISHES: MenuDish[] = [
  {
    id: "dish-1",
    nameMn: "Уламжлалт Шүүслэг Хуушуур",
    nameEn: "Savory Steamed Khuushuur",
    descMn: "Үхрийн шинэхэн махтай, гараар татаж амталсан шүүслэг амттай уламжлалт хайрсан дугуй хуушуур. 5 ширхэг.",
    descEn: "Traditional deep-fried crispy pastry stuffed with freshly minced seasoned premium beef. Served as 5 pieces.",
    price: 16500,
    category: "traditional",
    image: "https://images.unsplash.com/photo-1541532713592-79a0317b6b77?auto=format&fit=crop&w=600&q=80",
    isSpicy: false,
    isVegetarian: false,
    isChefSpecial: true,
    allergens: "Gluten, Onion",
    cookingTimeMinutes: 15
  },
  {
    id: "dish-2",
    nameMn: "Утаат Таван Тэнгэр Цуйван",
    nameEn: "Smoky Traditional Tsuivan",
    descMn: "Гэртээ гараар зүсэж уураар жигнэсэн гурил, шаргал шарсан үхрийн мах, шинэхэн ногоотой цуг утаагаар амталж шарсан цуйван.",
    descEn: "Stir-fried home-made noodles cooked with slow-braised tender local beef, crispy carrots, and direct seasoning oils.",
    price: 18000,
    category: "traditional",
    image: "https://images.unsplash.com/photo-1585032226651-759b368d7246?auto=format&fit=crop&w=600&q=80",
    isSpicy: false,
    isVegetarian: false,
    isChefSpecial: true,
    allergens: "Gluten, Sesame",
    cookingTimeMinutes: 12
  },
  {
    id: "dish-3",
    nameMn: "Их Британи Сортын Үхрийн Стейк",
    nameEn: "Premium Angus Ribeye Steak",
    descMn: "Өндөр чанарын ангус үхрийн тослог махыг цөцгийн тос, розмарин өвсөөр амталж, шарсан төмс болон халуун соустай хамт олгоно.",
    descEn: "Grade-A beef ribeye pan-seared in rich garlic herb butter, presented alongside rosemary potato wedges and demi-glace.",
    price: 42000,
    category: "western",
    image: "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=600&q=80",
    isSpicy: false,
    isVegetarian: false,
    isChefSpecial: false,
    allergens: "Dairy",
    cookingTimeMinutes: 20
  },
  {
    id: "dish-4",
    nameMn: "Тахианы Халуун чинжүүтэй Салат",
    nameEn: "Spicy Sichuan Chicken Salad",
    descMn: "Шарсан тахианы цээж мах, шинэ өргөст хэмх, амтат улаан чинжүүтэй халуун ба улаан перецээр амталсан сэргэг хөнгөн хоол.",
    descEn: "Julienned grilled chicken breast paired with cucumber ribbons and shredded peppers tossed in standard aromatic chili-sesame vinaigrette.",
    price: 14500,
    category: "western",
    image: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=600&q=80",
    isSpicy: true,
    isVegetarian: false,
    isChefSpecial: false,
    allergens: "Sesame, Soy",
    cookingTimeMinutes: 8
  },
  {
    id: "dish-5",
    nameMn: "Гүзээлзгэний Цэлцэгнүүртэй Чизкейк",
    nameEn: "Classic Strawberry Jelly Cheesecake",
    descMn: "Зөөлөн цөцгийтэй бяслаг, ваниль ургамалтай хөөс, орой дээрээ сэргэг гүзээлзгэнийгээр бүрхсэн амтат амттан.",
    descEn: "Slow-baked creamy rich cream cheese base topped with vibrant strawberry coulis jelly glaze, fresh cut strawberry slice decoration.",
    price: 11000,
    category: "desserts",
    image: "https://images.unsplash.com/photo-1524351199679-46cddf530c04?auto=format&fit=crop&w=600&q=80",
    isSpicy: false,
    isVegetarian: true,
    isChefSpecial: false,
    allergens: "Gluten, Dairy, Eggs",
    cookingTimeMinutes: 5
  },
  {
    id: "dish-6",
    nameMn: "Уламжлалт Хужрын Давстай Сүүтэй Цай",
    nameEn: "Aromatic Salted Mongolian Milk Tea",
    descMn: "Алтан галтай ялтсан хөх цайг шинэхэн шар тос болон Хөвсгөлийн хужрын зөөлөн давсаар сүлж болгосон дээд зэргийн сүүтэй цай.",
    descEn: "Loose-leaf rich brick tea slow-brewed with organic milk, dynamic yellow butter, and organic natural Khujir salt.",
    price: 4500,
    category: "beverages",
    image: "https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&w=600&q=80",
    isSpicy: false,
    isVegetarian: true,
    isChefSpecial: true,
    allergens: "Dairy",
    cookingTimeMinutes: 5
  }
];

interface MenuCategory {
  id: string;
  nameMn: string;
  nameEn: string;
  isHidden: boolean;
}

interface SurveyQuestion {
  id: string;
  textMn: string;
  textEn: string;
  type: 'rating' | 'text';
}

interface CustomStatus {
  id: string;
  nameMn: string;
  nameEn: string;
  colorClass: string;
}

const DEFAULT_CATEGORIES: MenuCategory[] = [
  { id: 'traditional', nameMn: 'Монгол хоол', nameEn: 'Mongolian Heritage', isHidden: false },
  { id: 'western', nameMn: 'Европ хоол', nameEn: 'Western Cuisine', isHidden: false },
  { id: 'desserts', nameMn: 'Амттан', nameEn: 'Desserts & Sweets', isHidden: false },
  { id: 'beverages', nameMn: 'Ундаа & Уух зүйлс', nameEn: 'Gourmet Beverages', isHidden: false }
];

const DEFAULT_SURVEY_QUESTIONS: SurveyQuestion[] = [
  { id: 'q-taste', textMn: 'Хоолны амт, чанар', textEn: 'Food Taste & Quality', type: 'rating' },
  { id: 'q-service', textMn: 'Үйлчилгээ, хурд хэмжээ', textEn: 'Service & Staff Speed', type: 'rating' }
];

const DEFAULT_CUSTOM_STATUSES: CustomStatus[] = [
  { id: 'pending', nameMn: 'Шийдээгүй / Шинэ', nameEn: 'Unresolved / New', colorClass: 'bg-rose-50 text-rose-800 border-rose-205 focus:ring-rose-200' },
  { id: 'inprogress', nameMn: 'Шийдэгдэж байгаа', nameEn: 'In Progress', colorClass: 'bg-amber-50 text-amber-850 border-amber-205 focus:ring-amber-200' },
  { id: 'solved', nameMn: 'Шийдсэн', nameEn: 'Resolved', colorClass: 'bg-emerald-50 text-emerald-800 border-emerald-205 focus:ring-emerald-200' },
  { id: 'uncontactable', nameMn: 'Холбогдож чадаагүй', nameEn: 'Uncontactable', colorClass: 'bg-indigo-50 text-indigo-805 border-indigo-205 focus:ring-indigo-100' }
];

export default function App() {
  const [lang, setLang] = useState<'mn' | 'en'>('mn');
  
  // Multi-tenant Organization Key State
  const [restaurantKey, setRestaurantKey] = useState<string>(() => {
    return localStorage.getItem('gourmet_restaurant_key') || 'BENTO-GRAND';
  });

  const [viewMode, setViewMode] = useState<'customer' | 'admin'>('customer');
  const [adminRole, setAdminRole] = useState<'manager' | 'waiter' | 'chef'>('manager');
  const [passcodeModalOpen, setPasscodeModalOpen] = useState(false);
  const [passcodeInput, setPasscodeInput] = useState('');
  const [passcodeError, setPasscodeError] = useState(false);
  const [workspaceModalOpen, setWorkspaceModalOpen] = useState(false);
  const [newWorkspaceKeyInput, setNewWorkspaceKeyInput] = useState('');

  // Dynamic Workspace States partitioned by the Active restaurantKey
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [dishes, setDishes] = useState<MenuDish[]>([]);
  const [orders, setOrders] = useState<RestaurantOrder[]>([]);
  const [feedbacks, setFeedbacks] = useState<CustomerFeedback[]>([]);
  
  const [restNameMn, setRestNameMn] = useState('Гурмэ Бэнто Ресторан');
  const [restNameEn, setRestNameEn] = useState('Gourmet Bento Restaurant');
  const [restSubMn, setRestSubMn] = useState('Интерактив цахим меню болон ухаалаг AI захиалгын систем');
  const [restSubEn, setRestSubEn] = useState('Interactive digital menu and smart AI order assistant');

  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [surveyQuestions, setSurveyQuestions] = useState<SurveyQuestion[]>([]);
  const [customStatuses, setCustomStatuses] = useState<CustomStatus[]>([]);

  // Reload partition data on restaurantKey change!
  useEffect(() => {
    localStorage.setItem('gourmet_restaurant_key', restaurantKey);

    const savedEmp = localStorage.getItem(`gourmet_employees_${restaurantKey}`);
    setEmployees(savedEmp ? JSON.parse(savedEmp) : INITIAL_EMPLOYEES);

    const savedDishes = localStorage.getItem(`gourmet_dishes_${restaurantKey}`);
    setDishes(savedDishes ? JSON.parse(savedDishes) : INITIAL_DISHES);

    const savedOrders = localStorage.getItem(`gourmet_orders_${restaurantKey}`);
    setOrders(savedOrders ? JSON.parse(savedOrders) : []);

    const savedFeedbacks = localStorage.getItem(`gourmet_feedbacks_${restaurantKey}`);
    if (savedFeedbacks) {
      try {
        setFeedbacks(JSON.parse(savedFeedbacks));
      } catch (e) {
        setFeedbacks([]);
      }
    } else {
      setFeedbacks([]);
    }

    setRestNameMn(localStorage.getItem(`rest_name_mn_${restaurantKey}`) || 'Гурмэ Бэнто Ресторан');
    setRestNameEn(localStorage.getItem(`rest_name_en_${restaurantKey}`) || 'Gourmet Bento Restaurant');
    setRestSubMn(localStorage.getItem(`rest_sub_mn_${restaurantKey}`) || 'Интерактив цахим меню болон ухаалаг AI захиалгын систем');
    setRestSubEn(localStorage.getItem(`rest_sub_en_${restaurantKey}`) || 'Interactive digital menu and smart AI order assistant');

    const savedCats = localStorage.getItem(`gourmet_categories_${restaurantKey}`);
    setCategories(savedCats ? JSON.parse(savedCats) : DEFAULT_CATEGORIES);

    const savedQs = localStorage.getItem(`gourmet_questions_${restaurantKey}`);
    setSurveyQuestions(savedQs ? JSON.parse(savedQs) : DEFAULT_SURVEY_QUESTIONS);

    const savedStats = localStorage.getItem(`gourmet_custom_statuses_${restaurantKey}`);
    setCustomStatuses(savedStats ? JSON.parse(savedStats) : DEFAULT_CUSTOM_STATUSES);

    // Reset client structures
    setCart([]);
    const savedActiveOrder = localStorage.getItem(`active_client_order_id_${restaurantKey}`);
    setActiveClientOrderId(savedActiveOrder || null);
  }, [restaurantKey]);

  // Persist states reactively
  useEffect(() => {
    if (employees.length > 0) {
      localStorage.setItem(`gourmet_employees_${restaurantKey}`, JSON.stringify(employees));
    }
  }, [employees, restaurantKey]);

  useEffect(() => {
    if (dishes.length > 0) {
      localStorage.setItem(`gourmet_dishes_${restaurantKey}`, JSON.stringify(dishes));
    }
  }, [dishes, restaurantKey]);

  useEffect(() => {
    localStorage.setItem(`gourmet_orders_${restaurantKey}`, JSON.stringify(orders));
  }, [orders, restaurantKey]);

  useEffect(() => {
    localStorage.setItem(`gourmet_feedbacks_${restaurantKey}`, JSON.stringify(feedbacks));
  }, [feedbacks, restaurantKey]);

  useEffect(() => {
    if (categories.length > 0) {
      localStorage.setItem(`gourmet_categories_${restaurantKey}`, JSON.stringify(categories));
    }
  }, [categories, restaurantKey]);

  useEffect(() => {
    if (surveyQuestions.length > 0) {
      localStorage.setItem(`gourmet_questions_${restaurantKey}`, JSON.stringify(surveyQuestions));
    }
  }, [surveyQuestions, restaurantKey]);

  useEffect(() => {
    if (customStatuses.length > 0) {
      localStorage.setItem(`gourmet_custom_statuses_${restaurantKey}`, JSON.stringify(customStatuses));
    }
  }, [customStatuses, restaurantKey]);

  const [currentUser, setCurrentUser] = useState<Employee | null>(() => {
    const saved = localStorage.getItem('gourmet_current_user');
    return saved ? JSON.parse(saved) : null;
  });

  // Current employee selecting during back-office entry
  const [selectedLoginEmployee, setSelectedLoginEmployee] = useState<Employee | null>(null);

  // Tabbed navigation inside back-office manager
  const [adminActiveTab, setAdminActiveTab] = useState<'orders' | 'surveys' | 'catalog' | 'employees'>('orders');

  // Customer Surveys analytics date filtering options
  const [surveyDateInterval, setSurveyDateInterval] = useState<'all' | 'today' | 'week' | 'month' | 'custom'>('all');
  const [surveyStartDate, setSurveyStartDate] = useState<string>('');
  const [surveyEndDate, setSurveyEndDate] = useState<string>('');

  // Form states to create/edit employee profiles
  const [editingEmployeeId, setEditingEmployeeId] = useState<string | null>(null);
  const [empName, setEmpName] = useState('');
  const [empUsername, setEmpUsername] = useState('');
  const [empPin, setEmpPin] = useState('');
  const [empRole, setEmpRole] = useState<'admin' | 'chef' | 'waiter'>('waiter');

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('gourmet_current_user', JSON.stringify(currentUser));
      setAdminRole(currentUser.role === 'admin' ? 'manager' : currentUser.role);
    } else {
      localStorage.removeItem('gourmet_current_user');
    }
  }, [currentUser]);

  // State for customer survey re-submission
  const [surveySubmitted, setSurveySubmitted] = useState(false);
  const [feedbackSubmitCount, setFeedbackSubmitCount] = useState(0);
  const [adminTableFilter, setAdminTableFilter] = useState<string>('all');
  
  // Client side Selection filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [filterSpicy, setFilterSpicy] = useState(false);
  const [filterVeg, setFilterVeg] = useState(false);
  const [filterChefSpecial, setFilterChefSpecial] = useState(false);

  // Cart State
  const [cart, setCart] = useState<CartItem[]>([]);
  const [tableNo, setTableNo] = useState<string>('3');
  const [notes, setNotes] = useState('');

  // Active Submitted Order monitoring for the specific client table
  const [activeClientOrderId, setActiveClientOrderId] = useState<string | null>(null);

  // AI Assistant Chat State
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatHistory, setChatHistory] = useState<{ role: 'user' | 'assistant'; text: string }[]>([
    { role: 'assistant', text: t[lang].aiAssistantWelcome }
  ]);
  const [chatLoading, setChatLoading] = useState(false);

  // Form states for Admin to add/modify dish
  const [editDishId, setEditDishId] = useState<string | null>(null);
  const [dishNameMn, setDishNameMn] = useState('');
  const [dishNameEn, setDishNameEn] = useState('');
  const [dishDescMn, setDishDescMn] = useState('');
  const [dishDescEn, setDishDescEn] = useState('');
  const [dishPrice, setDishPrice] = useState<string>('15000');
  const [dishCategory, setDishCategory] = useState<MenuDish['category']>('traditional');
  const [dishIsSpicy, setDishIsSpicy] = useState(false);
  const [dishIsVeg, setDishIsVeg] = useState(false);
  const [dishIsChefSpecial, setDishIsChefSpecial] = useState(false);
  const [dishAllergens, setDishAllergens] = useState('');
  const [aiGeneratingDescription, setAiGeneratingDescription] = useState(false);

  // Form states for profile inputs
  const [tempNameMn, setTempNameMn] = useState(restNameMn);
  const [tempNameEn, setTempNameEn] = useState(restNameEn);
  const [tempSubMn, setTempSubMn] = useState(restSubMn);
  const [tempSubEn, setTempSubEn] = useState(restSubEn);

  useEffect(() => {
    setTempNameMn(restNameMn);
    setTempNameEn(restNameEn);
    setTempSubMn(restSubMn);
    setTempSubEn(restSubEn);
  }, [restNameMn, restNameEn, restSubMn, restSubEn]);

  const handleUpdateProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setRestNameMn(tempNameMn);
    setRestNameEn(tempNameEn);
    setRestSubMn(tempSubMn);
    setRestSubEn(tempSubEn);
    localStorage.setItem(`rest_name_mn_${restaurantKey}`, tempNameMn);
    localStorage.setItem(`rest_name_en_${restaurantKey}`, tempNameEn);
    localStorage.setItem(`rest_sub_mn_${restaurantKey}`, tempSubMn);
    localStorage.setItem(`rest_sub_en_${restaurantKey}`, tempSubEn);
    showNotification(t[lang].profileSavedSuccess);
  };

  // Notifications
  const [notification, setNotification] = useState<string | null>(null);

  const [feedbackFilter, setFeedbackFilter] = useState<'all' | 'pending' | 'inprogress' | 'solved'>('all');

  // Table loading from URL query parameters (e.g. ?table=5)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tableParam = params.get('table');
    if (tableParam) {
      setTableNo(tableParam);
      showNotification(lang === 'mn' ? `Таныг Ширээ ${tableParam} дээр бүртгэлээ!` : `Assigned to VIP Table ${tableParam}!`);
    }
  }, []);

  // Customer satisfaction survey state variable
  const [surveyTaste, setSurveyTaste] = useState(5);
  const [surveyService, setSurveyService] = useState(5);
  const [surveyRatings, setSurveyRatings] = useState<Record<string, number>>({});
  const [surveyComment, setSurveyComment] = useState('');
  const [surveyPhone, setSurveyPhone] = useState('');

  const handleSubmitSurvey = (e: React.FormEvent) => {
    e.preventDefault();
    const tasteVal = surveyRatings['q-taste'] || surveyRatings[surveyQuestions[0]?.id] || 5;
    const serviceVal = surveyRatings['q-service'] || surveyRatings[surveyQuestions[1]?.id] || 5;
    
    // Ensure we fill values for all active questions
    const finalRatings = { ...surveyRatings };
    surveyQuestions.forEach((q) => {
      if (finalRatings[q.id] === undefined) {
        finalRatings[q.id] = 5; // default to 5-stars if not specifically touched
      }
    });

    const newFeedback: CustomerFeedback = {
      id: `feedback-${Date.now()}`,
      tableNumber: tableNo,
      tasteRating: tasteVal,
      serviceRating: serviceVal,
      comment: surveyComment.trim(),
      phone: surveyPhone.trim(),
      status: 'pending',
      timestamp: new Date().toLocaleTimeString(lang === 'mn' ? 'mn-MN' : 'en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' ' + new Date().toLocaleDateString(lang === 'mn' ? 'mn-MN' : 'en-US', { month: 'short', day: 'numeric' }),
      createdAt: new Date().toISOString(),
      ratings: finalRatings
    };
    setFeedbacks(prev => [newFeedback, ...prev]);
    setSurveyComment('');
    setSurveyPhone('');
    setSurveyRatings({});
    setSurveySubmitted(true);
    setFeedbackSubmitCount(prev => prev + 1);
    showNotification(t[lang].srvSuccess);
  };

  const getPublicQrLink = (tableNum: string) => {
    let origin = window.location.origin;
    if (origin.includes('-dev-')) {
      origin = origin.replace('-dev-', '-pre-');
    }
    return `${origin}${window.location.pathname}?table=${tableNum}`;
  };

  const handlePrintQR = () => {
    const qrLink = getPublicQrLink(tableNo);
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(qrLink)}`;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    
    const tableLabel = lang === 'mn' ? `ШИРЭЭ ${tableNo}` : `TABLE ${tableNo}`;
    const qrSubText = t[lang].qrSub;
    const footerLabel = lang === 'mn' ? 'Утсаараа уншуулан цэс харах & захиалах' : 'Scan to view interactive menu & review experience';
    const restTitle = lang === 'mn' ? restNameMn : restNameEn;

    printWindow.document.write(`
      <html>
        <head>
          <title>${lang === 'mn' ? 'Ширээний QR Код' : 'Table QR Code'}</title>
          <style>
            body {
              font-family: system-ui, -apple-system, sans-serif;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              height: 100vh;
              margin: 0;
              background: #fff;
              color: #1e293b;
            }
            .card {
              border: 3px solid #f97316;
              border-radius: 24px;
              padding: 40px;
              text-align: center;
              max-width: 400px;
              box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1);
            }
            h1 {
              font-size: 24px;
              margin: 0 0 8px 0;
              color: #0f172a;
            }
            h2 {
              font-size: 32px;
              margin: 10px 0;
              color: #ea580c;
              font-weight: 800;
            }
            p {
              font-size: 13px;
              color: #64748b;
              line-height: 1.6;
              margin: 15px 0;
            }
            img {
              width: 250px;
              height: 250px;
              margin: 20px 0;
            }
            .footer {
              font-size: 10px;
              text-transform: uppercase;
              letter-spacing: 0.1em;
              color: #94a3b8;
              margin-top: 15px;
            }
          </style>
        </head>
        <body>
          <div class="card">
            <h1>${restTitle}</h1>
            <h2>${tableLabel}</h2>
            <p>${qrSubText}</p>
            <img src="${qrCodeUrl}" alt="QR" />
            <p style="font-weight: 600; color: #475569;">${footerLabel}</p>
            <div class="footer">POWERED BY GOURMET BENTO</div>
          </div>
          <script>
            window.onload = function() {
              window.print();
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Adjust Chat Welcome when language changes
  useEffect(() => {
    setChatHistory(prev => {
      const copy = [...prev];
      if (copy.length === 1 && copy[0].role === 'assistant') {
        copy[0].text = t[lang].aiAssistantWelcome;
      }
      return copy;
    });
  }, [lang]);

  const showNotification = (message: string) => {
    setNotification(message);
    setTimeout(() => {
      setNotification(null);
    }, 3500);
  };

  // Cart Functions
  const handleAddToCart = (dish: MenuDish) => {
    setCart(prev => {
      const idx = prev.findIndex(item => item.dish.id === dish.id);
      if (idx > -1) {
        const copy = [...prev];
        copy[idx].quantity += 1;
        return copy;
      }
      return [...prev, { dish, quantity: 1 }];
    });
    showNotification(lang === 'mn' ? `${dish.nameMn} сагсанд нэмэгдлээ!` : `${dish.nameEn} added to order card!`);
  };

  const handleUpdateQuantity = (dishId: string, delta: number) => {
    setCart(prev => {
      const idx = prev.findIndex(item => item.dish.id === dishId);
      if (idx === -1) return prev;
      const copy = [...prev];
      copy[idx].quantity += delta;
      if (copy[idx].quantity <= 0) {
        copy.splice(idx, 1);
      }
      return copy;
    });
  };

  const handleClearCart = () => {
    setCart([]);
  };

  const calculateTotal = () => {
    return cart.reduce((sum, item) => sum + item.dish.price * item.quantity, 0);
  };

  // Submitting Order
  const handlePlaceOrder = () => {
    if (cart.length === 0) return;
    const newOrder: RestaurantOrder = {
      id: `order-${Date.now()}`,
      tableNumber: tableNo,
      items: cart.map(item => ({
        dishId: item.dish.id,
        name: lang === 'mn' ? item.dish.nameMn : item.dish.nameEn,
        quantity: item.quantity,
        priceAtSale: item.dish.price
      })),
      totalAmount: calculateTotal(),
      notes: notes,
      status: 'pending',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    };

    setOrders(prev => [newOrder, ...prev]);
    setActiveClientOrderId(newOrder.id);
    setCart([]);
    setNotes('');
    showNotification(t[lang].successOrder);
  };

  // Admin Change State Functions
  const handleAdminStatusChange = (orderId: string, newStatus: RestaurantOrder['status']) => {
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
    showNotification(t[lang].orderStatusUpdated);
  };

  const handleDeleteDish = (dishId: string) => {
    if (confirm(t[lang].deleteConfirm)) {
      setDishes(prev => prev.filter(d => d.id !== dishId));
      showNotification(lang === 'mn' ? 'Хоолыг устгалаа.' : 'Dish successfully removed.');
    }
  };

  const handleEditDishSelect = (dish: MenuDish) => {
    setEditDishId(dish.id);
    setDishNameMn(dish.nameMn);
    setDishNameEn(dish.nameEn);
    setDishDescMn(dish.descMn);
    setDishDescEn(dish.descEn);
    setDishPrice(String(dish.price));
    setDishCategory(dish.category);
    setDishIsSpicy(dish.isSpicy);
    setDishIsVeg(dish.isVegetarian);
    setDishIsChefSpecial(dish.isChefSpecial);
    setDishAllergens(dish.allergens || '');
    
    // Smooth scroll to form
    const elem = document.getElementById('admin_form_viewport');
    if (elem) elem.scrollIntoView({ behavior: 'smooth' });
  };

  const resetDishForm = () => {
    setEditDishId(null);
    setDishNameMn('');
    setDishNameEn('');
    setDishDescMn('');
    setDishDescEn('');
    setDishPrice('15000');
    setDishCategory('traditional');
    setDishIsSpicy(false);
    setDishIsVeg(false);
    setDishIsChefSpecial(false);
    setDishAllergens('');
  };

  const handleSaveDish = (e: React.FormEvent) => {
    e.preventDefault();
    if (!dishNameMn || !dishNameEn) {
      alert(lang === 'mn' ? 'Та хоолны нэрийг оруулна уу.' : 'Please enter dish names.');
      return;
    }

    const priceNum = parseInt(dishPrice) || 0;

    if (editDishId) {
      // Edit existing
      setDishes(prev => prev.map(d => d.id === editDishId ? {
        ...d,
        nameMn: dishNameMn,
        nameEn: dishNameEn,
        descMn: dishDescMn,
        descEn: dishDescEn,
        price: priceNum,
        category: dishCategory,
        isSpicy: dishIsSpicy,
        isVegetarian: dishIsVeg,
        isChefSpecial: dishIsChefSpecial,
        allergens: dishAllergens,
      } : d));
      showNotification(lang === 'mn' ? 'Хоолны мэдээллийг шинэчиллээ.' : 'Dish details successfully updated.');
    } else {
      // Add new
      const newDish: MenuDish = {
        id: `dish-${Date.now()}`,
        nameMn: dishNameMn,
        nameEn: dishNameEn,
        descMn: dishDescMn,
        descEn: dishDescEn,
        price: priceNum,
        category: dishCategory,
        image: selectPlaceholderImage(dishCategory),
        isSpicy: dishIsSpicy,
        isVegetarian: dishIsVeg,
        isChefSpecial: dishIsChefSpecial,
        allergens: dishAllergens,
        cookingTimeMinutes: 10
      };
      setDishes(prev => [...prev, newDish]);
      showNotification(t[lang].dishAddedSuccess);
    }
    resetDishForm();
  };

  const handleEditEmployeeSelect = (emp: Employee) => {
    setEditingEmployeeId(emp.id);
    setEmpName(emp.name);
    setEmpUsername(emp.username);
    setEmpPin(emp.pin);
    setEmpRole(emp.role);
    
    // Smooth scroll to form
    const elem = document.getElementById('employee_form_card');
    if (elem) elem.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSaveEmployeeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!empName.trim() || !empUsername.trim() || !empPin.trim()) {
      showNotification(lang === 'mn' ? 'Ажилтны нэр, нэвтрэх нэр, ПИН кодыг гүйцэт бөглөнө үү.' : 'Please fill out employee name, username, and PIN.');
      return;
    }
    if (empPin.trim().length !== 4 || !/^\d+$/.test(empPin.trim())) {
      showNotification(lang === 'mn' ? 'Нэвтрэх ПИН код нь яг 4 оронтой тоо байх ёстой!' : 'Login PIN code must be exactly 4 digits!');
      return;
    }

    const usernameLower = empUsername.trim().toLowerCase();
    const isDuplicate = employees.some(emp => emp.username === usernameLower && emp.id !== editingEmployeeId);
    if (isDuplicate) {
      showNotification(lang === 'mn' ? 'Уг нэвтрэх нэр аль хэдийн өөр ажилтанд бүртгэгдсэн байна!' : 'This username is already taken by another employee!');
      return;
    }

    if (editingEmployeeId) {
      // Edit existing
      setEmployees(prev => prev.map(emp => emp.id === editingEmployeeId ? {
        ...emp,
        name: empName.trim(),
        username: usernameLower,
        pin: empPin.trim(),
        role: empRole
      } : emp));
      
      // If currently logged-in user edited their own info, update current user session too!
      if (currentUser && currentUser.id === editingEmployeeId) {
        setCurrentUser(prev => prev ? {
          ...prev,
          name: empName.trim(),
          username: usernameLower,
          pin: empPin.trim(),
          role: empRole
        } : null);
      }
      
      showNotification(lang === 'mn' ? 'Ажилтны мэдээллийг шинэчиллээ.' : 'Employee profile successfully updated.');
      setEditingEmployeeId(null);
    } else {
      // Add new
      const newEmp: Employee = {
        id: `emp-${Date.now()}`,
        name: empName.trim(),
        username: usernameLower,
        pin: empPin.trim(),
        role: empRole,
        createdAt: new Date().toISOString()
      };
      setEmployees(prev => [...prev, newEmp]);
      showNotification(lang === 'mn' ? 'Шинэ ажилтныг амжилттай бүртгэлээ.' : 'New employee registered successfully.');
    }

    // Reset fields
    setEmpName('');
    setEmpUsername('');
    setEmpPin('');
    setEmpRole('waiter');
  };

  const handleDeleteEmployee = (id: string) => {
    if (id === 'emp-1') {
      showNotification(lang === 'mn' ? 'Үндсэн Систем админыг устгах боломжгүй!' : 'Cannot delete default system Admin!');
      return;
    }
    if (currentUser && currentUser.id === id) {
      showNotification(lang === 'mn' ? 'Та одоогоор нэвтэрсэн байгаа өөрийн бүртгэлийг устгах боломжгүй!' : 'Cannot delete your own active session account!');
      return;
    }

    if (window.confirm(lang === 'mn' ? 'Та уг ажилтныг бүртгэлээс хасахдаа итгэлтэй байна уу?' : 'Are you sure you want to delete this staff member?')) {
      setEmployees(prev => prev.filter(emp => emp.id !== id));
      showNotification(lang === 'mn' ? 'Ажилтанг бүртгэлээс хаслаа.' : 'Employee deleted successfully.');
    }
  };

  const selectPlaceholderImage = (category: MenuDish['category']) => {
    switch (category) {
      case 'traditional':
        return "https://images.unsplash.com/photo-1585032226651-759b368d7246?auto=format&fit=crop&w=600&q=80";
      case 'western':
        return "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=600&q=80";
      case 'desserts':
        return "https://images.unsplash.com/photo-1524351199679-46cddf530c04?auto=format&fit=crop&w=600&q=80";
      case 'beverages':
        return "https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&w=600&q=80";
    }
  };

  // Generative AI Trigger Integration!
  const generateAiDescription = async () => {
    const activeDishName = lang === 'mn' ? dishNameMn : dishNameEn;
    if (!activeDishName) {
      alert(lang === 'mn' ? 'AI тайлбар бичихийн өмнө хоолны нэрийг оруулна уу!' : 'Please write dish name to let Gemini write an exclusive description!');
      return;
    }

    setAiGeneratingDescription(true);
    try {
      const queryPrompt = `Write a premium, mouthwatering, sensory restaurant menu description for a food named "${activeDishName}". You MUST supply exactly two translations in a clean format: 
MONGOLIAN: <mouthwatering short mongolian text about how delicious it is under 30 words>
ENGLISH: <mouthwatering short english text under 30 words>
Do not include any extra introductory markdown or conversational code block headers. Just supply the raw text formatted like above.`;

      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          prompt: queryPrompt,
          temperature: 0.7,
          model: 'gemini-3.5-flash'
        })
      });

      const result = await response.json();
      if (result.success && result.text) {
        const fullText: string = result.text;
        
        let mnPart = '';
        let enPart = '';

        if (fullText.includes('MONGOLIAN:') && fullText.includes('ENGLISH:')) {
          const split = fullText.split('ENGLISH:');
          mnPart = split[0].replace('MONGOLIAN:', '').trim();
          enPart = split[1] ? split[1].trim() : '';
        } else {
          mnPart = fullText;
          enPart = fullText;
        }

        setDishDescMn(mnPart);
        setDishDescEn(enPart);
        showNotification(lang === 'mn' ? 'AI Текст үүсгэлээ!' : 'Gemini AI crafted dish descriptions!');
      } else {
        throw new Error(result.error || 'Server error');
      }
    } catch (err: any) {
      console.error(err);
      alert(lang === 'mn' ? 'Загварын холболт амжилтгүй. Та өөрөө гараар тайлбараа оруулаарай.' : 'AI Server unavailable. Fallback to manual entry.');
    } finally {
      setAiGeneratingDescription(false);
    }
  };

  // AI Menu assistant live chatting!
  const handleSendChatMessage = async () => {
    if (!chatInput.trim()) return;
    const userMsg = chatInput.trim();
    setChatInput('');
    setChatHistory(prev => [...prev, { role: 'user', text: userMsg }]);
    setChatLoading(true);

    try {
      // Serialize current dishes data to feed as standard system context
      const serializedMenuContext = dishes.map(d => {
        return `- ${d.nameEn} (${d.nameMn}): Category: ${d.category}, Price: ${d.price} MNT, Description: ${d.descEn}/${d.descMn}, Spicy: ${d.isSpicy}, Vegetarian: ${d.isVegetarian}, Chef Special: ${d.isChefSpecial}, Allergens: ${d.allergens || 'None'}`;
      }).join('\n');

      const systemInstruction = `You are a helpful, extremely polite, and gourmet-focused interactive restaurant water or sommelier named "Gourmet Bento Assistant".
Your primary job is advising clients on what to choose from our active menu.
Reply in the language the visitor speaks (Mongolian or English).
Here is our standard active menu catalog:
${serializedMenuContext}

Keep your answer friendly, tasty, clear, and very concise (under 2-3 short sentences). Always recommend real options from the list above. Do not hallucinate external foods. Custom Table Number selection is available in the user's sidebar.`;

      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          prompt: userMsg,
          systemInstruction,
          temperature: 0.5,
          model: 'gemini-3.5-flash'
        })
      });

      const result = await response.json();
      if (result.success && result.text) {
        setChatHistory(prev => [...prev, { role: 'assistant', text: result.text }]);
      } else {
        throw new Error(result.error || 'Server error');
      }
    } catch (err: any) {
      console.error(err);
      setChatHistory(prev => [...prev, { role: 'assistant', text: lang === 'mn' ? 'Уучлаарай бэлтгэл холболт тасарлаа. Би таны захиалгыг гараар авахад бэлэн шүү.' : 'Sorry, connection spike occurred. Ask me anything again shortly.' }]);
    } finally {
      setChatLoading(false);
    }
  };

  // Filtering out dishes based on visual query
  const filteredDishes = dishes.filter(dish => {
    if (dish.isHidden === true) return false;
    
    const catOfDish = categories.find(c => c.id === dish.category);
    if (catOfDish && catOfDish.isHidden === true) return false;

    const matchesKeyword = 
      dish.nameMn.toLowerCase().includes(searchQuery.toLowerCase()) ||
      dish.nameEn.toLowerCase().includes(searchQuery.toLowerCase()) ||
      dish.descMn.toLowerCase().includes(searchQuery.toLowerCase()) ||
      dish.descEn.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = activeCategory === 'all' || dish.category === activeCategory;
    const matchesSpicy = !filterSpicy || dish.isSpicy;
    const matchesVeg = !filterVeg || dish.isVegetarian;
    const matchesSpecial = !filterChefSpecial || dish.isChefSpecial;

    return matchesKeyword && matchesCategory && matchesSpicy && matchesVeg && matchesSpecial;
  });

  const activeClientOrder = orders.find(o => o.id === activeClientOrderId);

  // Extract unique active table numbers from standard orders
  const uniqueOrderTables = Array.from(new Set(orders.map(o => o.tableNumber)))
    .filter((tb): tb is string => typeof tb === 'string' && tb.trim().length > 0)
    .sort((a, b) => {
      const numA = parseInt(a) || 0;
      const numB = parseInt(b) || 0;
      return numA - numB;
    });

  const filteredOrders = orders.filter(order => {
    if (adminTableFilter !== 'all' && order.tableNumber !== adminTableFilter) return false;
    return true;
  });

  return (
    <div className="min-h-screen bg-[#FAFAF8] text-slate-800 flex flex-col font-sans transition-colors relative" id="gourmet_app">
      
      {/* Dynamic Pop-up Notification Banner */}
      <AnimatePresence>
        {notification && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-slate-900 border border-slate-700 text-white font-medium text-xs rounded-full py-2.5 px-6 shadow-xl flex items-center gap-2"
          >
            <Sparkles className="w-3.5 h-3.5 text-yellow-400 animate-pulse" />
            <span>{notification}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Luxury Header */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-orange-100/50" id="main_restaurant_navbar">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
          
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-600 flex items-center justify-center text-white font-semibold shadow-lg shadow-orange-500/20">
              <Utensils className="w-5 h-5" id="nav_icon" />
            </div>
            <div>
              <h1 className="font-bold text-base md:text-lg text-slate-900 tracking-tight flex items-center gap-2">
                {lang === 'mn' ? restNameMn : restNameEn}
                <span className="text-[10px] bg-orange-50 text-orange-600 font-mono border border-orange-100 px-1.5 py-0.5 rounded-full font-bold">
                  BENTO V2
                </span>
              </h1>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                {lang === 'mn' ? restSubMn : restSubEn}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Workspace switcher button in header */}
            <button
              type="button"
              id="workspace_switch_hdr_btn"
              onClick={() => {
                setNewWorkspaceKeyInput(restaurantKey);
                setWorkspaceModalOpen(true);
              }}
              className="px-2.5 py-1.5 rounded-lg border border-orange-200 bg-orange-50 hover:bg-orange-100 text-orange-700 text-xs font-mono font-bold cursor-pointer transition-all flex items-center gap-1.5"
              title={lang === 'mn' ? 'Байгууллага солих' : 'Switch Workspace/Restaurant'}
            >
              <Briefcase className="w-3.5 h-3.5 text-orange-600" />
              <span className="hidden leading-none xs:inline font-bold">KEY: {restaurantKey}</span>
            </button>

            {/* Lang Switch */}
            <button 
              type="button"
              id="lang_switch_button"
              onClick={() => setLang(lang === 'mn' ? 'en' : 'mn')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold cursor-pointer transition-all"
            >
              <Languages className="w-3.5 h-3.5 text-slate-450" />
              <span className="uppercase tracking-wider">{lang === 'mn' ? 'English' : 'Монгол'}</span>
            </button>

            {/* Quick View Switches (Only show rail if admin view has been unlocked with a staff session!) */}
            {currentUser !== null && (
              <div className="bg-slate-100 p-1 rounded-xl flex items-center gap-0.5" id="view_modes_rail">
                <button
                  type="button"
                  id="mode_customer_btn"
                  onClick={() => setViewMode('customer')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                    viewMode === 'customer' 
                      ? 'bg-white text-slate-905 shadow-xs' 
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  <ShoppingBag className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">{t[lang].customerView}</span>
                </button>

                <button
                  type="button"
                  id="mode_admin_btn"
                  onClick={() => setViewMode('admin')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                    viewMode === 'admin' 
                      ? 'bg-slate-900 text-white shadow-xs'  
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  <Settings className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">{t[lang].adminView}</span>
                  {orders.filter(o => o.status === 'pending' || o.status === 'preparing').length > 0 && (
                    <span className="w-4 h-4 bg-orange-600 text-[9px] text-white rounded-full flex items-center justify-center font-bold animate-bounce" id="alert_order_badge">
                      {orders.filter(o => o.status === 'pending' || o.status === 'preparing').length}
                    </span>
                  )}
                </button>
              </div>
            )}

          </div>

        </div>
      </header>

      {/* Main Core Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 flex-1 w-full" id="root_core_main">

        {/* VIEW 1: CUSTOMER EXPERIENCES */}
        {viewMode === 'customer' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="customer_grid_layout">
            
            {/* Left Block - Menu Selection / Catalog (8 columns) */}
            <section className="lg:col-span-8 flex flex-col gap-5" id="menu_catalog_section">
              
              {/* Search & filters bar */}
              <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs flex flex-col gap-4" id="catalog_filters_block">
                
                {/* Search */}
                <div className="relative" id="menu_search_wrapper">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    id="menu_search_input"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={t[lang].searchPlaceholder}
                    className="w-full bg-slate-50 hover:bg-slate-50/50 border border-slate-200 focus:bg-white focus:border-orange-500 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none transition-all"
                  />
                  {searchQuery && (
                    <button 
                      type="button" 
                      onClick={() => setSearchQuery('')} 
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-350 hover:text-slate-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Categories */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1" id="category_scroll_rail">
                  <button
                    key="all"
                    type="button"
                    id={`category_btn_all`}
                    onClick={() => setActiveCategory('all')}
                    className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap cursor-pointer transition-all ${
                      activeCategory === 'all'
                        ? 'bg-orange-600 text-white shadow-md shadow-orange-500/15'
                        : 'bg-slate-55 border border-slate-200 text-slate-650 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    {lang === 'mn' ? 'Бүгд' : 'All'}
                  </button>
                  {categories.filter(cat => !cat.isHidden).map(cat => {
                    const isActive = activeCategory === cat.id;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        id={`category_btn_${cat.id}`}
                        onClick={() => setActiveCategory(cat.id)}
                        className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap cursor-pointer transition-all ${
                          isActive 
                            ? 'bg-orange-600 text-white shadow-md shadow-orange-500/15'
                            : 'bg-slate-55 border border-slate-200 text-slate-650 hover:bg-slate-100 hover:text-slate-900'
                        }`}
                      >
                        {lang === 'mn' ? cat.nameMn : cat.nameEn}
                      </button>
                    );
                  })}
                </div>

                {/* Dietary Filter Tags */}
                <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-slate-500 pt-1" id="dietary_filters_row">
                  <span className="font-semibold text-slate-400 uppercase tracking-wider text-[10px]">{t[lang].filters}:</span>
                  
                  <label className="flex items-center gap-1.5 cursor-pointer hover:text-slate-850 transition-colors" htmlFor="checkbox_special">
                    <input
                      id="checkbox_special"
                      type="checkbox"
                      checked={filterChefSpecial}
                      onChange={(e) => setFilterChefSpecial(e.target.checked)}
                      className="accent-orange-600 rounded cursor-pointer w-3.5 h-3.5"
                    />
                    <Sparkles className="w-3.5 h-3.5 text-yellow-500 shrink-0" />
                    <span>{t[lang].chefSpecial}</span>
                  </label>

                  <label className="flex items-center gap-1.5 cursor-pointer hover:text-slate-850 transition-colors" htmlFor="checkbox_spicy">
                    <input
                      id="checkbox_spicy"
                      type="checkbox"
                      checked={filterSpicy}
                      onChange={(e) => setFilterSpicy(e.target.checked)}
                      className="accent-orange-600 rounded cursor-pointer w-3.5 h-3.5"
                    />
                    <Flame className="w-3.5 h-3.5 text-red-500 shrink-0" />
                    <span>{t[lang].spicy}</span>
                  </label>

                  <label className="flex items-center gap-1.5 cursor-pointer hover:text-slate-850 transition-colors" htmlFor="checkbox_vegetarian">
                    <input
                      id="checkbox_vegetarian"
                      type="checkbox"
                      checked={filterVeg}
                      onChange={(e) => setFilterVeg(e.target.checked)}
                      className="accent-orange-600 rounded cursor-pointer w-3.5 h-3.5"
                    />
                    <span className="text-[12px] shrink-0 text-emerald-500">🌱</span>
                    <span>{t[lang].veg}</span>
                  </label>
                </div>

              </div>

              {/* Dynamic Grid Results */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4" id="dish_catalog_grid">
                {filteredDishes.length === 0 ? (
                  <div className="col-span-full bg-white border border-slate-200 py-12 px-6 rounded-2xl text-center flex flex-col items-center gap-3" id="blank_results_view">
                    <AlertCircle className="w-8 h-8 text-slate-400" />
                    <p className="text-slate-500 font-medium text-xs">
                      {lang === 'mn' ? 'Хайлт болон шүүлтүүрт тохирох хоол олдсонгүй.' : 'No dishes matched the selected active filters.'}
                    </p>
                    <button 
                      type="button" 
                      onClick={() => {
                        setSearchQuery('');
                        setActiveCategory('all');
                        setFilterSpicy(false);
                        setFilterVeg(false);
                        setFilterChefSpecial(false);
                      }}
                      className="text-xs text-orange-600 hover:underline font-semibold"
                    >
                      {lang === 'mn' ? 'Шүүлтүүрийг цэвэрлэх' : 'Reset search queries'}
                    </button>
                  </div>
                ) : (
                  filteredDishes.map(dish => (
                    <div 
                      key={dish.id} 
                      className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col group relative"
                      id={`dish_card_${dish.id}`}
                    >
                      {/* Badge Badges overlay */}
                      <div className="absolute top-3 left-3 z-10 flex flex-col gap-1.5" id="dish_badges_row">
                        {dish.isChefSpecial && (
                          <span className="bg-yellow-500 text-white rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider flex items-center gap-1 shadow-sm">
                            <Sparkles className="w-2.5 h-2.5" />
                            {t[lang].chefSpecial}
                          </span>
                        )}
                        {dish.isSpicy && (
                          <span className="bg-red-600 text-white rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider flex items-center gap-1 shadow-sm">
                            <Flame className="w-2.5 h-2.5" />
                            {t[lang].spicy}
                          </span>
                        )}
                        {dish.isVegetarian && (
                          <span className="bg-emerald-500 text-white rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider flex items-center gap-1 shadow-sm">
                            <span>🌱</span>
                            {t[lang].veg}
                          </span>
                        )}
                      </div>

                      {/* Food Image */}
                      <div className="h-44 w-full bg-slate-100 relative overflow-hidden" id="dish_image_mask">
                        <img 
                          src={dish.image} 
                          alt={lang === 'mn' ? dish.nameMn : dish.nameEn}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      </div>

                      {/* Content panel */}
                      <div className="p-4 flex-1 flex flex-col gap-2.5" id="dish_description_box">
                        <div className="flex justify-between items-start gap-2" id="dish_title_price_row">
                          <h3 className="font-bold text-slate-900 group-hover:text-orange-650 transition-colors text-sm flex-1 leading-normal">
                            {lang === 'mn' ? dish.nameMn : dish.nameEn}
                          </h3>
                          <span className="text-orange-600 font-mono font-bold text-xs bg-orange-50 border border-orange-100 px-2 py-0.5 rounded-lg shrink-0">
                            {dish.price.toLocaleString()}{t[lang].currency}
                          </span>
                        </div>

                        <p className="text-[11px] text-slate-500 leading-relaxed font-normal flex-1 line-clamp-3">
                          {lang === 'mn' ? dish.descMn : dish.descEn}
                        </p>

                        {/* Composition & Allergens indicators */}
                        {dish.allergens && (
                          <div className="text-[10px] text-slate-400 font-mono flex items-center gap-1 pb-1" id="dish_allergens_subtext">
                            <span className="font-semibold">{t[lang].allergens}:</span>
                            <span className="font-normal">{dish.allergens}</span>
                          </div>
                        )}

                        <button
                          type="button"
                          id={`add_to_cart_btn_${dish.id}`}
                          onClick={() => handleAddToCart(dish)}
                          className="w-full mt-1.5 py-2 hover:bg-orange-600/5 bg-white border border-orange-200 hover:border-orange-500 text-orange-600 font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          {t[lang].addToCart}
                        </button>
                      </div>

                    </div>
                  ))
                )}
              </div>

            </section>

            {/* Right Block - Ordering Sidebar (4 columns) */}
            <section className="lg:col-span-4 flex flex-col gap-5" id="sidebar_ordering_section">
              
              {/* Table check box */}
              <div className="bg-white px-5 py-4 rounded-2xl border border-slate-100 shadow-xs flex flex-col gap-3" id="table_selector_block">
                <div className="flex items-center gap-2 text-slate-800 pb-1" id="table_head">
                  <Clock className="w-4.5 h-4.5 text-orange-600" />
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">{t[lang].tableNo}</span>
                </div>
                <div className="flex gap-2" id="table_selector_row">
                  <select
                    id="table_dropdown"
                    value={tableNo}
                    onChange={(e) => setTableNo(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-orange-500 rounded-xl px-3.5 py-2 text-xs font-semibold focus:outline-none transition-all cursor-pointer"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(no => (
                      <option key={no} value={String(no)}>{lang === 'mn' ? `Ширээ ${no}` : `VIP Table ${no}`}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Order Cart */}
              <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex flex-col gap-4" id="order_cart_block">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100" id="cart_header">
                  <div className="flex items-center gap-2">
                    <ShoppingBag className="w-4 h-4 text-slate-400" />
                    <h3 className="font-bold text-xs tracking-wider uppercase text-slate-500">{t[lang].cartTitle}</h3>
                  </div>
                  {cart.length > 0 && (
                    <button 
                      type="button" 
                      onClick={handleClearCart}
                      className="text-[10px] text-red-500 hover:underline flex items-center gap-1 font-semibold cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                      {lang === 'mn' ? 'Цэвэрлэх' : 'Clear'}
                    </button>
                  )}
                </div>

                {cart.length === 0 ? (
                  <div className="py-8 text-center text-slate-400 flex flex-col items-center gap-2" id="empty_cart_block">
                    <Coffee className="w-8 h-8 text-slate-200" />
                    <p className="text-[11px] font-normal leading-normal">{t[lang].emptyCart}</p>
                  </div>
                ) : (
                  <>
                    {/* Cart dishes list */}
                    <div className="flex flex-col gap-3 max-h-[220px] overflow-y-auto pr-1" id="cart_items_scroller">
                      {cart.map(item => (
                        <div key={item.dish.id} className="flex items-center justify-between gap-2.5 p-2 bg-slate-50 rounded-xl border border-slate-100" id={`cart_cell_${item.dish.id}`}>
                          <div className="min-w-0 flex-1">
                            <span className="text-[11px] font-bold text-slate-850 block truncate">
                              {lang === 'mn' ? item.dish.nameMn : item.dish.nameEn}
                            </span>
                            <span className="text-[10px] font-mono text-slate-400">
                              {item.dish.price.toLocaleString()}{t[lang].currency}
                            </span>
                          </div>
                          
                          {/* Stepper buttons */}
                          <div className="flex items-center gap-1.5 shrink-0 bg-white border border-slate-200 rounded-lg p-0.5">
                            <button
                              type="button"
                              onClick={() => handleUpdateQuantity(item.dish.id, -1)}
                              className="p-1 hover:bg-slate-100 rounded-md text-slate-500 cursor-pointer"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="text-xs font-bold font-mono px-1 min-w-4 text-center">
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleUpdateQuantity(item.dish.id, 1)}
                              className="p-1 hover:bg-slate-100 rounded-md text-slate-500 cursor-pointer"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Notes */}
                    <div className="flex flex-col gap-1.5 pt-2" id="cart_notes_container">
                      <label className="text-[10px] uppercase tracking-wider font-bold text-slate-400" htmlFor="cart_notes_textarea">
                        {t[lang].specialNotes}
                      </label>
                      <textarea
                        id="cart_notes_textarea"
                        rows={2}
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder={t[lang].notesPlaceholder}
                        className="w-full bg-slate-50 focus:bg-white text-[11px] leading-relaxed border border-slate-200 focus:border-orange-500 rounded-xl p-2.5 outline-none placeholder:text-slate-400 font-normal transition-all"
                      ></textarea>
                    </div>

                    {/* Total math */}
                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between" id="cart_total_block">
                      <span className="text-xs font-bold text-slate-700">{t[lang].total}</span>
                      <span className="text-sm font-bold text-orange-600 font-mono">
                        {calculateTotal().toLocaleString()}{t[lang].currency}
                      </span>
                    </div>

                    <button
                      type="button"
                      id="submit_order_btn"
                      onClick={handlePlaceOrder}
                      className="w-full py-2.5 bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs rounded-xl transition-all cursor-pointer shadow-md shadow-orange-600/10 flex items-center justify-center gap-1.5"
                    >
                      <Check className="w-4 h-4" />
                      {t[lang].placeOrder}
                    </button>
                  </>
                )}
              </div>

              {/* Active Client Table Orders tracking panel */}
              {orders.filter(o => o.tableNumber === tableNo).length > 0 && (
                <div className="bg-slate-900 text-white p-5 rounded-2xl shadow-lg border border-slate-800 flex flex-col gap-4 animate-fade-in" id="order_tracker_card">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-orange-400 animate-pulse animate-duration-1000" />
                      {lang === 'mn' ? 'Таны ширээний захиалгын түүх' : 'Table Live Orders Hub'}
                    </span>
                    <span className="text-[10px] bg-slate-800 text-orange-400 px-2.5 py-0.5 rounded font-mono font-bold border border-slate-700">
                      {lang === 'mn' ? `${tableNo}-р ширээ` : `Table ${tableNo}`}
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-400 leading-relaxed font-normal">
                    {lang === 'mn' 
                      ? 'Дахин захиалгууд цаг, минут, секундийн дарааллаар харагдана.' 
                      : 'Subsequent and repeated orders listed by precise hours & minutes.'}
                  </p>

                  <div className="flex flex-col gap-4.5 max-h-[350px] overflow-y-auto pr-1" id="client_orders_timeline">
                    {orders.filter(o => o.tableNumber === tableNo).map((tOrder) => (
                      <div key={tOrder.id} className="border-b border-slate-850/60 pb-4 last:border-0 last:pb-0 flex flex-col gap-2.5 animate-fade-in" id={`client_row_${tOrder.id}`}>
                        <div className="flex justify-between items-center bg-slate-950/40 p-2 rounded-lg border border-slate-850">
                          <span className="font-mono text-[10px] text-orange-450 font-bold">
                            #{tOrder.id.split('-')[1]}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                            {tOrder.timestamp}
                          </span>
                        </div>

                        {/* List items */}
                        <div className="flex flex-col gap-1 text-[11px] text-slate-300 px-1 font-medium">
                          {tOrder.items.map((item, id) => (
                            <div key={id} className="flex justify-between">
                              <span className="truncate max-w-[140px] text-slate-200">
                                {item.name}
                              </span>
                              <span className="text-slate-450 font-mono">
                                x{item.quantity} ({ (item.priceAtSale * item.quantity).toLocaleString() }₮)
                              </span>
                            </div>
                          ))}
                        </div>

                        {/* Status tracker visual bullets */}
                        <div className="grid grid-cols-4 gap-1 text-[9px] text-center pt-1 font-bold">
                          {(['pending', 'preparing', 'ready', 'delivered'] as const).map((st) => {
                            const statuses = ['pending', 'preparing', 'ready', 'delivered'];
                            const currentIdx = statuses.indexOf(tOrder.status);
                            const stepIdx = statuses.indexOf(st);
                            const isDone = stepIdx <= currentIdx;
                            const isActive = stepIdx === currentIdx;

                            return (
                              <div key={st} className="flex flex-col items-center gap-1">
                                <div className={`h-1.5 w-full rounded-full transition-colors ${
                                  isActive ? 'bg-orange-500 animate-pulse' :
                                  isDone ? 'bg-emerald-500' : 'bg-slate-800'
                                }`} />
                                <span className={`${
                                  isActive ? 'text-orange-400 font-extrabold' :
                                  isDone ? 'text-emerald-400' : 'text-slate-600'
                                }`}>
                                  {t[lang][`orderStatus_${st}` as keyof typeof t['mn']]}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Customer Satisfaction Survey component */}
              <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex flex-col gap-4" id="customer_satisfaction_survey_block">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                  <TrendingUp className="w-4.5 h-4.5 text-emerald-600" />
                  <h3 className="font-bold text-xs tracking-wider uppercase text-slate-500">{t[lang].surveyTitle}</h3>
                </div>

                <p className="text-[11px] text-slate-450 leading-normal font-normal">
                  {t[lang].surveySub}
                </p>

                {surveySubmitted ? (
                  <div className="bg-emerald-50 border border-emerald-100/80 rounded-xl p-5 text-center flex flex-col items-center gap-3 animate-fade-in" id="survey_success_card">
                    <span className="text-3xl animate-bounce">🎉</span>
                    <h4 className="font-bold text-emerald-900 text-xs uppercase tracking-wider">
                      {lang === 'mn' ? 'Судалгаа амжилттай илгээгдлээ!' : 'Survey Successfully Received!'}
                    </h4>
                    <p className="text-[11px] text-slate-600 leading-relaxed font-normal">
                      {lang === 'mn' 
                        ? `Санал хүсэлт өгсөнд маш их баярлалаа! Та манайд нийт ${feedbackSubmitCount} удаа хариулсан байна. Бид улам бүр хичээх болно.` 
                        : `Thank you for supporting our service improvement! You have completed the survey ${feedbackSubmitCount} time(s).`}
                    </p>
                    <button
                      type="button"
                      onClick={() => setSurveySubmitted(false)}
                      className="mt-2 w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow transition-all cursor-pointer uppercase tracking-wider"
                    >
                      {lang === 'mn' ? 'Дахин судалгаа бөглөх' : 'Submit Another Feedback'}
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmitSurvey} className="flex flex-col gap-4 font-normal text-xs" id="survey_form">
                    {surveyQuestions.map((q) => {
                      const currentVal = surveyRatings[q.id] || 5;
                      return (
                        <div key={q.id} className="flex flex-col gap-1.5">
                          <span className="font-bold text-[10px] uppercase tracking-wider text-slate-500">
                            {lang === 'mn' ? q.textMn : q.textEn}
                          </span>
                          <div className="flex items-center gap-1">
                            {[1, 2, 3, 4, 5].map((starVal) => (
                              <button
                                key={starVal}
                                type="button"
                                onClick={() => setSurveyRatings(prev => ({ ...prev, [q.id]: starVal }))}
                                className="p-1 hover:scale-110 transition-transform cursor-pointer"
                              >
                                <Star 
                                  className={`w-5 h-5 ${
                                    starVal <= currentVal ? 'fill-amber-400 text-amber-400' : 'text-slate-300'
                                  }`} 
                                />
                              </button>
                            ))}
                            <span className="text-[11px] font-mono font-bold text-slate-500 ml-2">
                              {currentVal}/5
                            </span>
                          </div>
                        </div>
                      );
                    })}

                    {/* Comments */}
                    <div className="flex flex-col gap-1.5">
                      <label className="font-bold text-[10px] uppercase tracking-wider text-slate-450" htmlFor="survey_comm">
                        {t[lang].srvComment}
                      </label>
                      <textarea
                        id="survey_comm"
                        rows={2}
                        value={surveyComment}
                        onChange={(e) => setSurveyComment(e.target.value)}
                        placeholder={t[lang].srvCommentPlaceholder}
                        className="w-full bg-slate-50 focus:bg-white text-[11px] leading-relaxed border border-slate-200 focus:border-orange-500 rounded-xl p-2.5 outline-none font-medium placeholder:text-slate-400 transition-all text-slate-700"
                      ></textarea>
                    </div>

                    {/* Phone Number */}
                    <div className="flex flex-col gap-1.5">
                      <label className="font-bold text-[10px] uppercase tracking-wider text-slate-450" htmlFor="survey_phone">
                        {t[lang].srvPhoneLabel}
                      </label>
                      <input
                        id="survey_phone"
                        type="tel"
                        value={surveyPhone}
                        onChange={(e) => setSurveyPhone(e.target.value)}
                        placeholder={t[lang].srvPhonePlaceholder}
                        className="w-full bg-slate-50 focus:bg-white text-[11px] border border-slate-200 focus:border-orange-500 rounded-xl px-3 py-2 outline-none font-medium placeholder:text-slate-400 transition-all text-slate-700"
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all uppercase tracking-wider cursor-pointer"
                    >
                      {t[lang].srvSubmitBtn}
                    </button>
                  </form>
                )}
              </div>

            </section>

          </div>
        )}

        {/* VIEW 2: BACK-OFFICE ADMIN KITCHEN PANELS */}
        {viewMode === 'admin' && (
          <AdminPanelContainer
            lang={lang}
            t={t}
            dishes={dishes}
            setDishes={setDishes}
            orders={orders}
            setOrders={setOrders}
            feedbacks={feedbacks}
            setFeedbacks={setFeedbacks}
            employees={employees}
            setEmployees={setEmployees}
            currentUser={currentUser}
            setCurrentUser={setCurrentUser}
            adminActiveTab={adminActiveTab}
            setAdminActiveTab={setAdminActiveTab}
            surveyDateInterval={surveyDateInterval}
            setSurveyDateInterval={setSurveyDateInterval}
            surveyStartDate={surveyStartDate}
            setSurveyStartDate={setSurveyStartDate}
            surveyEndDate={surveyEndDate}
            setSurveyEndDate={setSurveyEndDate}
            showNotification={showNotification}
            setViewMode={setViewMode}
            adminTableFilter={adminTableFilter}
            setAdminTableFilter={setAdminTableFilter}
            handleAdminStatusChange={handleAdminStatusChange}
            handleEditDishSelect={handleEditDishSelect}
            handleDeleteDish={handleDeleteDish}
            resetDishForm={resetDishForm}
            handleSaveDish={handleSaveDish}
            dishCategory={dishCategory}
            setDishCategory={setDishCategory}
            dishNameMn={dishNameMn}
            setDishNameMn={setDishNameMn}
            dishNameEn={dishNameEn}
            setDishNameEn={setDishNameEn}
            dishPrice={dishPrice}
            setDishPrice={setDishPrice}
            aiGeneratingDescription={aiGeneratingDescription}
            generateAiDescription={generateAiDescription}
            dishDescMn={dishDescMn}
            setDishDescMn={setDishDescMn}
            dishDescEn={dishDescEn}
            setDishDescEn={setDishDescEn}
            dishAllergens={dishAllergens}
            setDishAllergens={setDishAllergens}
            dishIsChefSpecial={dishIsChefSpecial}
            setDishIsChefSpecial={setDishIsChefSpecial}
            dishIsSpicy={dishIsSpicy}
            setDishIsSpicy={setDishIsSpicy}
            dishIsVeg={dishIsVeg}
            setDishIsVeg={setDishIsVeg}
            editDishId={editDishId}
            tempNameMn={tempNameMn}
            setTempNameMn={setTempNameMn}
            tempNameEn={tempNameEn}
            setTempNameEn={setTempNameEn}
            handleUpdateProfile={handleUpdateProfile}
            restaurantKey={restaurantKey}
            setRestaurantKey={setRestaurantKey}
            categories={categories}
            setCategories={setCategories}
            surveyQuestions={surveyQuestions}
            setSurveyQuestions={setSurveyQuestions}
            customStatuses={customStatuses}
            setCustomStatuses={setCustomStatuses}
          />
        )}

        {/* UNREACHABLE DEADCODE TO SECURE COMPONENT SUCCESS */}
        {false && (
          <div className="flex flex-col gap-6" id="admin_root_canvas">
            
            {/* Sub-Role Selector Toolbar */}
            <div className="bg-slate-900 border border-slate-800 text-white rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 animate-fade-in" id="admin_subrole_switch_toolbar">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-600/10 border border-orange-500/20 rounded-xl flex items-center justify-center text-orange-400 shrink-0">
                  <Briefcase className="w-5 h-5 text-orange-500" />
                </div>
                <div>
                  <h3 className="font-bold text-sm tracking-tight">
                    {lang === 'mn' ? 'Нэвтэрсэн ажилтны үүрэг' : 'Workspace Employee Role'}
                  </h3>
                  <p className="text-[10px] text-slate-400 font-normal">
                    {lang === 'mn' ? 'Захиалга удирдах, тогооч, зөөгч нарын харах хэсгийг тохируулах.' : 'Select waiter, chef, or manager role to view constrained screens.'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
                {(['manager', 'waiter', 'chef'] as const).map((role) => {
                  const roleLabel = role === 'manager' ? (lang === 'mn' ? 'МЕНЕЖЕР' : 'MANAGER') :
                                    role === 'waiter' ? (lang === 'mn' ? 'ЗӨӨГЧ' : 'WAITER') :
                                    (lang === 'mn' ? 'ТОГООЧ' : 'CHEF');
                  return (
                    <button
                      key={role}
                      type="button"
                      onClick={() => {
                        setAdminRole(role);
                        showNotification(lang === 'mn' ? `${roleLabel} эрх амжилттай идэвхжлээ.` : `Switched to ${roleLabel} view.`);
                      }}
                      className={`px-3 py-1.5 rounded-lg text-[9px] font-extrabold tracking-wider transition-all cursor-pointer ${
                        adminRole === role
                          ? 'bg-orange-600 text-white shadow-xs'
                          : 'text-slate-500 hover:text-slate-300 bg-transparent'
                      }`}
                    >
                      {roleLabel}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Current sub-role rules prompt banner */}
            <div className="bg-orange-50/70 border border-orange-100 rounded-xl px-4 py-3 text-[11px] font-normal leading-relaxed text-orange-950 flex items-start gap-2.5 animate-fade-in">
              <ShieldAlert className="w-4 h-4 text-orange-600 shrink-0 mt-0.5" />
              <div>
                {adminRole === 'manager' && (
                  <p>
                    {lang === 'mn' 
                      ? 'Та МЕНЕЖЕР эрхээр нэвтэрсэн байна. Бүх захиалга, цэсийн тохиргоо, сэтгэл ханамжийн нэгдсэн судалгааг удирдах боломжтой.' 
                      : 'Logged in as MANAGER. Full access to incoming tickets, aggregated surveys/feedback, and edit forms.'}
                  </p>
                )}
                {adminRole === 'waiter' && (
                  <p>
                    {lang === 'mn' 
                      ? 'Та ЗӨӨГЧ эрхээр нэвтэрсэн байна. Зүүн баганаас зөвхөн ширээний захиалгыг удирдах ба хүргэгдсэнээр тэмдэглэх боломжтой. Студи, цэс засварлах хэсгүүд аюулгүй байдлын үүднээс хязгаарлагдсан.' 
                      : 'Logged in as WAITER. Authorized to view table orders and toggling serving status only. Configuration panels restricted.'}
                  </p>
                )}
                {adminRole === 'chef' && (
                  <p>
                    {lang === 'mn' 
                      ? 'Та ТОГООЧ эрхээр нэвтэрсэн байна. Зөвхөн хоолны бэлтгэл удирдах, захиалгыг бэлтгэж эхлэх болон бэлэн болгох төлөв рүү шилжүүлэх боломжтой. Цэс удирдах болон судалгаа харах хэсэг хаалттай.' 
                      : 'Logged in as CHEF. Authorized to track ingredients and updating preparation status. Feedback feed and catalog edit locked.'}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="admin_grid_layout">
            
            {/* Admin left column - orders & existing foods manager (takes full width for waiter and chef) */}
            <div className={`${adminRole === 'manager' ? 'lg:col-span-8' : 'lg:col-span-12'} flex flex-col gap-6`} id="admin_left_canvas">
              
              {/* Back office counters */}
              <div className="grid grid-cols-2 gap-4" id="admin_kpi_row">
                <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs" id="kpi_active_orders">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">
                    {t[lang].ordersCount}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-bold text-slate-900 font-mono">
                      {orders.filter(o => o.status !== 'delivered' && o.status !== 'cancelled').length}
                    </span>
                    <span className="text-[10px] text-orange-600 bg-orange-50 border border-orange-100 rounded-full px-2 py-0.5 font-bold animate-pulse">
                      Live
                    </span>
                  </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs" id="kpi_menu_items">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">
                    {t[lang].menuItemsCount}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-bold text-slate-900 font-mono">
                      {dishes.length}
                    </span>
                    <span className="text-[10px] text-slate-500 bg-slate-100 rounded-full px-2 py-0.5">
                      Catalog
                    </span>
                  </div>
                </div>
              </div>

              {/* ACTIVE CLIENT ORDERS LEDGER */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs" id="incoming_tickets_hub">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                  <h3 className="text-slate-800 font-bold text-sm tracking-tight flex items-center gap-2">
                    <Clock className="w-4 h-4 text-orange-600 font-bold" />
                    {lang === 'mn' ? 'Ширээний идэвхтэй захиалгуудын хяналт' : 'Active Table Orders Tracker'}
                  </h3>

                  {/* Active table filtering for staff members and waiters */}
                  <div className="flex items-center gap-2" id="ledger_table_selector_container">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                      {lang === 'mn' ? 'Шүүх ширээ:' : 'Filter Table:'}
                    </span>
                    <select
                      id="table_filter_dropdown"
                      value={adminTableFilter}
                      onChange={(e) => setAdminTableFilter(e.target.value)}
                      className="bg-slate-50 border border-slate-200 text-[11px] font-bold rounded-lg px-2.5 py-1 text-slate-700 outline-none focus:border-orange-500 cursor-pointer"
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
                  <div className="py-12 text-center text-slate-400 flex flex-col items-center justify-center gap-2 font-normal" id="blank_orders_panel">
                    <AlertCircle className="w-8 h-8 text-slate-200" />
                    <p className="text-xs">
                      {lang === 'mn' ? 'Идэвхтэй захиалга олдсонгүй.' : 'No active orders found for this selection.'}
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-4 mt-4" id="ledger_list">
                    {filteredOrders.map(order => {
                      const isClosed = order.status === 'delivered' || order.status === 'cancelled';
                      return (
                        <div 
                          key={order.id} 
                          className={`border rounded-xl p-4 flex flex-col gap-3 transition-colors ${
                            order.status === 'pending' ? 'bg-orange-50/20 border-orange-200' :
                            order.status === 'preparing' ? 'bg-blue-50/20 border-blue-200' :
                            order.status === 'ready' ? 'bg-emerald-50/20 border-emerald-200' :
                            'bg-slate-50 border-slate-200 opacity-70'
                          }`}
                          id={`order_ticket_${order.id}`}
                        >
                          {/* Header row */}
                          <div className="flex justify-between items-start gap-4">
                            <div>
                              <span className="font-bold text-xs bg-slate-900 text-white rounded px-2 py-0.5 mr-2">
                                {t[lang].table} {order.tableNumber}
                              </span>
                              <span className="text-[11px] font-mono text-slate-450">{order.timestamp}</span>
                            </div>
                            
                            <div className="flex items-center gap-2">
                              {/* Status Badge */}
                              <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                                order.status === 'pending' ? 'bg-orange-100 text-orange-850' :
                                order.status === 'preparing' ? 'bg-blue-100 text-blue-700' :
                                order.status === 'ready' ? 'bg-emerald-100 text-emerald-800' :
                                order.status === 'delivered' ? 'bg-slate-200 text-slate-700' :
                                'bg-red-100 text-red-700'
                              }`}>
                                {t[lang][`orderStatus_${order.status}` as keyof typeof t['mn']]}
                              </span>
                            </div>
                          </div>

                          {/* Ordered dishes list */}
                          <div className="bg-white/80 p-3 rounded-lg border border-slate-100 flex flex-col gap-1.5" id="ticket_items">
                            <span className="text-[9px] uppercase tracking-wider font-bold text-slate-400 block mb-1">
                              {t[lang].items}
                            </span>
                            {order.items.map((it, dIdx) => (
                              <div key={dIdx} className="flex justify-between items-center text-xs font-normal" id={`order_it_${dIdx}`}>
                                <span className="font-semibold text-slate-800">
                                  {it.quantity}x <span className="font-medium text-slate-700">{it.name}</span>
                                </span>
                                <span className="font-mono text-slate-500">
                                  {(it.priceAtSale * it.quantity).toLocaleString()}{t[lang].currency}
                                </span>
                              </div>
                            ))}
                            {order.notes && (
                              <div className="mt-2 pt-2 border-t border-dashed border-slate-150 text-[10px] text-slate-500 leading-normal font-normal">
                                <span className="font-bold text-slate-650 block">{t[lang].specialNotes}</span>
                                {order.notes}
                              </div>
                            )}
                          </div>

                          {/* Controls row */}
                          <div className="flex justify-between items-center gap-4 pt-1">
                            <div className="text-xs text-slate-705">
                              {lang === 'mn' ? 'Нийт төлбөр:' : 'Total Ticket:'} <strong className="font-normal font-mono text-slate-900">{(order.totalAmount).toLocaleString()}{t[lang].currency}</strong>
                            </div>

                            <div className="flex items-center gap-1.5" id="ticket_actions">
                              {!isClosed && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => handleAdminStatusChange(order.id, 'cancelled')}
                                    className="p-1.5 rounded-lg border border-red-200 hover:bg-red-50 text-red-600 text-[10px] font-semibold cursor-pointer transition-colors"
                                  >
                                    {t[lang].cancelOrder}
                                  </button>

                                  {order.status === 'pending' && (
                                    <button
                                      type="button"
                                      onClick={() => handleAdminStatusChange(order.id, 'preparing')}
                                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold rounded-lg cursor-pointer transition-colors"
                                    >
                                      {t[lang].cookBtn}
                                    </button>
                                  )}

                                  {(order.status === 'preparing' || order.status === 'pending') && (
                                    <button
                                      type="button"
                                      onClick={() => handleAdminStatusChange(order.id, 'ready')}
                                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold rounded-lg cursor-pointer transition-colors"
                                    >
                                      {lang === 'mn' ? 'Бэлэн болгох' : 'Mark Ready'}
                                    </button>
                                  )}

                                  {order.status === 'ready' && (
                                    <button
                                      type="button"
                                      onClick={() => handleAdminStatusChange(order.id, 'delivered')}
                                      className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-[10px] font-bold rounded-lg cursor-pointer transition-all"
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

              {adminRole === 'manager' && (
                <>
                  {/* ADMIN SATISFACTION FEEDBACK LOGS */}
                  <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs" id="admin_reviews_hub">
                <div className="flex justify-between items-center pb-3 border-b border-slate-100 mb-4">
                  <h3 className="text-slate-800 font-bold text-sm tracking-tight flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-emerald-600 animate-bounce" />
                    {t[lang].adminFeedbackTitle}
                  </h3>
                  {feedbacks.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm(t[lang].surveyClearAlert)) {
                          setFeedbacks([]);
                          localStorage.setItem('gourmet_feedbacks', JSON.stringify([]));
                        }
                      }}
                      className="text-[10px] text-red-500 hover:underline flex items-center gap-1 font-semibold cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      {lang === 'mn' ? 'Бүх судалгааг устгах' : 'Clear All Surveys'}
                    </button>
                  )}
                </div>

                {/* Rating KPI Cards & Summary Indicators */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5" id="feedback_avg_stats_grid">
                  
                  {/* KPI 1: Overall Average */}
                  <div className="bg-indigo-50/40 border border-indigo-100 rounded-xl p-3 text-center flex flex-col justify-center items-center">
                    <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider mb-0.5">
                      {lang === 'mn' ? 'Нэгдсэн дундаж' : 'Overall rating'}
                    </span>
                    <div className="flex items-center gap-1">
                      <span className="text-xl font-mono font-bold text-indigo-900">
                        {feedbacks.length > 0 ? (((feedbacks.reduce((acc, f) => acc + f.tasteRating, 0) / feedbacks.length + feedbacks.reduce((acc, f) => acc + f.serviceRating, 0) / feedbacks.length) / 2)).toFixed(1) : '5.0'}
                      </span>
                      <Star className="w-4.5 h-4.5 fill-amber-400 text-amber-400 shrink-0" />
                    </div>
                  </div>

                  {/* KPI 2: Taste Average */}
                  <div className="bg-orange-50/40 border border-orange-100 rounded-xl p-3 text-center flex flex-col justify-center items-center">
                    <span className="text-[10px] font-bold text-orange-600 uppercase tracking-wider mb-0.5">
                      {t[lang].tasteAvg}
                    </span>
                    <div className="flex items-center gap-1">
                      <span className="text-xl font-mono font-bold text-orange-950">
                        {feedbacks.length > 0 ? (feedbacks.reduce((acc, f) => acc + f.tasteRating, 0) / feedbacks.length).toFixed(1) : '5.0'}
                      </span>
                      <span className="text-xs text-orange-400">/5</span>
                    </div>
                  </div>

                  {/* KPI 3: Service Average */}
                  <div className="bg-emerald-50/40 border border-emerald-100 rounded-xl p-3 text-center flex flex-col justify-center items-center">
                    <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider mb-0.5">
                      {t[lang].serviceAvg}
                    </span>
                    <div className="flex items-center gap-1">
                      <span className="text-xl font-mono font-bold text-emerald-950">
                        {feedbacks.length > 0 ? (feedbacks.reduce((acc, f) => acc + f.serviceRating, 0) / feedbacks.length).toFixed(1) : '5.0'}
                      </span>
                      <span className="text-xs text-emerald-400">/5</span>
                    </div>
                  </div>

                </div>

                {/* Status Filter Tabs */}
                {feedbacks.length > 0 && (
                  <div className="flex flex-wrap items-center justify-between gap-2.5 bg-slate-50 border border-slate-200/80 rounded-xl p-2 mb-4 text-xs font-normal" id="survey_filter_tabs">
                    <span className="font-bold text-[10px] uppercase tracking-wider text-slate-500">
                      {t[lang].feedbackStatusFilter}
                    </span>
                    <div className="flex items-center gap-1">
                      {(['all', 'pending', 'inprogress', 'solved'] as const).map((st) => {
                        const count = st === 'all' ? feedbacks.length : feedbacks.filter(x => x.status === st).length;
                        return (
                          <button
                            key={st}
                            type="button"
                            onClick={() => setFeedbackFilter(st)}
                            className={`px-2.5 py-1 text-[10px] font-bold rounded-lg cursor-pointer transition-all flex items-center gap-1 ${
                              feedbackFilter === st
                                ? 'bg-orange-600 text-white shadow-xs'
                                : 'bg-slate-200/40 text-slate-600 hover:bg-slate-200/60'
                            }`}
                          >
                            <span>{st === 'all' ? t[lang].allFeedbacks : t[lang][`status_${st}`]}</span>
                            <span className={`text-[9px] px-1 rounded-full ${feedbackFilter === st ? 'bg-orange-700 text-orange-100' : 'bg-slate-200 text-slate-500'}`}>
                              {count}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {(() => {
                  const filtered = feedbacks.filter(f => feedbackFilter === 'all' || f.status === feedbackFilter);
                  if (feedbacks.length === 0) {
                    return (
                      <div className="py-8 text-center text-slate-400 border border-dashed border-slate-150 rounded-xl flex flex-col items-center justify-center gap-2 font-normal">
                        <HelpCircle className="w-8 h-8 text-slate-200" />
                        <p className="text-xs">
                          {lang === 'mn' ? 'Анкетын идэвхтэй судалгаа бүртгэгдээгүй байна.' : 'No active client satisfaction surveys registered yet.'}
                        </p>
                      </div>
                    );
                  }
                  if (filtered.length === 0) {
                    return (
                      <div className="py-8 text-center text-slate-450 border border-dashed border-slate-150 rounded-xl flex flex-col items-center justify-center gap-1 font-normal">
                        <p className="text-xs font-semibold text-slate-500">
                          {lang === 'mn' ? `"${t[lang][`status_${feedbackFilter}`]}" төлөвтэй судалгаа одоогоор байхгүй байна.` : `No surveys registered under "${t[lang][`status_${feedbackFilter}`]}" status yet.`}
                        </p>
                      </div>
                    );
                  }
                  return (
                    <div className="flex flex-col gap-3.5 max-h-[400px] overflow-y-auto pr-1" id="admin_feedbacks_scroller">
                      {filtered.map((f) => (
                        <div key={f.id} className="border border-slate-150/85 rounded-xl p-3.5 bg-slate-50/50 flex flex-col gap-2 relative">
                          {/* Header Row with Table No */}
                          <div className="flex items-center justify-between gap-3 pb-1.5 border-b border-zinc-100">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-[10px] bg-slate-900 text-white rounded px-2 py-0.5 font-mono">
                                {lang === 'mn' ? `ШИРЭЭ ${f.tableNumber}` : `TABLE ${f.tableNumber}`}
                              </span>
                              {f.phone && (
                                <span className="text-[10px] bg-orange-55/60 text-orange-700 font-mono font-bold px-1.5 py-0.5 rounded border border-orange-100 shrink-0">
                                  {lang === 'mn' ? `Утас: ${f.phone}` : `Phone: ${f.phone}`}
                                </span>
                              )}
                            </div>
                            <span className="text-[9px] font-mono text-slate-400">{f.timestamp}</span>
                          </div>

                          {/* Stars breakdown */}
                          <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px]" id="stars_box">
                            <div className="flex items-center gap-1.5 font-semibold text-slate-600">
                              <span>{lang === 'mn' ? 'Амт:' : 'Taste:'}</span>
                              <div className="flex items-center gap-0.5">
                                {[1, 2, 3, 4, 5].map((st) => (
                                  <Star 
                                    key={st} 
                                    className={`w-3 h-3 ${st <= f.tasteRating ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}`} 
                                  />
                                ))}
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5 font-semibold text-slate-600">
                              <span>{lang === 'mn' ? 'Үйлчилгээ:' : 'Service:'}</span>
                              <div className="flex items-center gap-0.5">
                                {[1, 2, 3, 4, 5].map((st) => (
                                  <Star 
                                    key={st} 
                                    className={`w-3 h-3 ${st <= f.serviceRating ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}`} 
                                  />
                                ))}
                              </div>
                            </div>
                          </div>

                          {/* Comment text */}
                          {f.comment ? (
                            <p className="text-[11px] text-slate-700 leading-relaxed bg-white rounded-lg p-2.5 border border-slate-100 font-medium">
                              {f.comment}
                            </p>
                          ) : (
                            <span className="text-[10px] text-slate-400 italic">
                              {lang === 'mn' ? 'Нэмэлт сэтгэгдэл үлдээгээгүй' : 'No written commentary provided'}
                            </span>
                          )}

                          {/* Status selection widget */}
                          <div className="flex items-center justify-between gap-1 mt-1 pt-2 border-t border-slate-100">
                            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                              {t[lang].srvStatusLabel}
                            </span>
                            <select
                              value={f.status}
                              onChange={(e) => {
                                const newStatus = e.target.value as 'pending' | 'inprogress' | 'solved';
                                setFeedbacks(prev => prev.map(item => item.id === f.id ? { ...item, status: newStatus } : item));
                                showNotification(t[lang].statusChangeNotification);
                              }}
                              className={`text-[10px] font-bold rounded-lg px-2 py-1 outline-none border focus:ring-1 cursor-pointer transition-all ${
                                f.status === 'solved' 
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-250 focus:ring-emerald-300' 
                                  : f.status === 'inprogress'
                                  ? 'bg-amber-50 text-amber-700 border-amber-250 focus:ring-amber-300'
                                  : 'bg-rose-50 text-rose-700 border-rose-200 focus:ring-rose-300'
                              }`}
                            >
                              <option value="pending" className="bg-white text-rose-800 font-bold">{t[lang].status_pending}</option>
                              <option value="inprogress" className="bg-white text-amber-850 font-bold">{t[lang].status_inprogress}</option>
                              <option value="solved" className="bg-white text-emerald-800 font-bold">{t[lang].status_solved}</option>
                            </select>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>

              {/* EXISTING RESTAURANT FOODS CATALOG IN BACKOFFICE */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs" id="foods_ledger_hub">
                <h3 className="text-slate-800 font-bold text-sm tracking-tight pb-3 border-b border-slate-100">
                  {lang === 'mn' ? 'Идэвхтэй хоолны жагсаалт удирдах' : 'Active Dishes Ledger Management'}
                </h3>

                <div className="flex flex-col gap-2 mt-4" id="ledger_foods">
                  {dishes.map(dish => (
                    <div 
                      key={dish.id} 
                      className="flex items-center justify-between gap-4 p-3 bg-slate-50 border border-slate-200 rounded-xl hover:border-slate-350 transition-colors"
                      id={`edit_row_${dish.id}`}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <img 
                          src={dish.image} 
                          alt="" 
                          referrerPolicy="no-referrer"
                          className="w-10 h-10 object-cover rounded-lg bg-white shrink-0" 
                        />
                        <div className="min-w-0">
                          <span className="font-bold text-xs text-slate-800 block truncate">
                            {lang === 'mn' ? dish.nameMn : dish.nameEn}
                          </span>
                          <span className="text-[10px] font-mono text-indigo-600 font-semibold uppercase">
                            {t[lang].categories[dish.category]} • {dish.price.toLocaleString()}{t[lang].currency}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0" id="ledger_dish_actions">
                        <button
                          type="button"
                          onClick={() => handleEditDishSelect(dish)}
                          className="p-1.5 hover:bg-slate-200 border border-slate-300 rounded-lg text-slate-700 text-[10px] font-semibold cursor-pointer transition-colors"
                        >
                          {lang === 'mn' ? 'Засах' : 'Edit'}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteDish(dish.id)}
                          className="p-1.5 hover:bg-slate-200 border border-slate-300 rounded-lg text-red-600 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
                </>
              )}

            </div>

            {/* Admin right column - add/modify dish form & restaurant profile (4 columns) */}
            {adminRole === 'manager' && (
              <div className="lg:col-span-4 flex flex-col gap-6" id="admin_right_canvas">
                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs" id="admin_form_viewport">
                
                <div className="flex justify-between items-center pb-3 border-b border-slate-100 mb-4" id="admin_form_header">
                  <div className="flex items-center gap-2">
                    <Plus className="w-4 h-4 text-orange-600" />
                    <h3 className="font-bold text-xs uppercase tracking-wider text-slate-400">
                      {editDishId ? t[lang].editDish : t[lang].addDish}
                    </h3>
                  </div>
                  {editDishId && (
                    <button 
                      type="button" 
                      onClick={resetDishForm}
                      className="p-1 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-800"
                    >
                      <Undo className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <form onSubmit={handleSaveDish} className="flex flex-col gap-4 font-normal text-xs" id="add_dish_form">
                  
                  {/* Category select */}
                  <div className="flex flex-col gap-1.5">
                    <label className="font-bold text-[10px] uppercase tracking-wider text-slate-400" htmlFor="admin_form_category">
                      {t[lang].categorySelection}
                    </label>
                    <select
                      id="admin_form_category"
                      value={dishCategory}
                      onChange={(e) => setDishCategory(e.target.value as MenuDish['category'])}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-orange-500 font-semibold cursor-pointer"
                    >
                      <option value="traditional">{t[lang].categories.traditional}</option>
                      <option value="western">{t[lang].categories.western}</option>
                      <option value="desserts">{t[lang].categories.desserts}</option>
                      <option value="beverages">{t[lang].categories.beverages}</option>
                    </select>
                  </div>

                  {/* Name MN */}
                  <div className="flex flex-col gap-1.5">
                    <label className="font-bold text-[10px] uppercase tracking-wider text-slate-400" htmlFor="admin_form_name_mn">
                      {t[lang].dishNameMn}
                    </label>
                    <input
                      id="admin_form_name_mn"
                      type="text"
                      value={dishNameMn}
                      onChange={(e) => setDishNameMn(e.target.value)}
                      placeholder="Жишээ: Шүүслэг хурганы хавирга"
                      className="bg-slate-50 border border-slate-200 focus:bg-white focus:border-orange-500 rounded-xl px-3 py-2 text-xs focus:outline-none transition-all"
                    />
                  </div>

                  {/* Name EN */}
                  <div className="flex flex-col gap-1.5">
                    <label className="font-bold text-[10px] uppercase tracking-wider text-slate-400" htmlFor="admin_form_name_en">
                      {t[lang].dishNameEn}
                    </label>
                    <input
                      id="admin_form_name_en"
                      type="text"
                      value={dishNameEn}
                      onChange={(e) => setDishNameEn(e.target.value)}
                      placeholder="E.g., Crispy lamb chops"
                      className="bg-slate-50 border border-slate-200 focus:bg-white focus:border-orange-500 rounded-xl px-3 py-2 text-xs focus:outline-none transition-all"
                    />
                  </div>

                  {/* Pricing */}
                  <div className="flex flex-col gap-1.5">
                    <label className="font-bold text-[10px] uppercase tracking-wider text-slate-400" htmlFor="admin_form_price">
                      {t[lang].price}
                    </label>
                    <input
                      id="admin_form_price"
                      type="number"
                      value={dishPrice}
                      onChange={(e) => setDishPrice(e.target.value)}
                      className="bg-slate-50 border border-slate-200 focus:bg-white focus:border-orange-500 rounded-xl px-3 py-2 text-xs font-mono focus:outline-none transition-all"
                    />
                  </div>

                  {/* AI drafting button trigger */}
                  <div className="pt-1">
                    <button
                      type="button"
                      id="draft_desc_gemini_btn"
                      onClick={generateAiDescription}
                      disabled={aiGeneratingDescription}
                      className="w-full py-1.5 bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-700 font-bold text-[10px] uppercase tracking-wider rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-purple-600 animate-pulse" />
                      {aiGeneratingDescription ? t[lang].aiDescriptionLoading : t[lang].aiDescriptionBtn}
                    </button>
                  </div>

                  {/* Description MN */}
                  <div className="flex flex-col gap-1.5">
                    <label className="font-bold text-[10px] uppercase tracking-wider text-slate-400" htmlFor="admin_form_desc_mn">
                      {t[lang].descMn}
                    </label>
                    <textarea
                      id="admin_form_desc_mn"
                      rows={3}
                      value={dishDescMn}
                      onChange={(e) => setDishDescMn(e.target.value)}
                      placeholder="Шүүслэг зөөлөн махтай, гойд сайхан амттай..."
                      className="bg-slate-50 border border-slate-200 focus:bg-white focus:border-orange-500 rounded-xl p-2.5 text-xs focus:outline-none leading-relaxed transition-all"
                    ></textarea>
                  </div>

                  {/* Description EN */}
                  <div className="flex flex-col gap-1.5">
                    <label className="font-bold text-[10px] uppercase tracking-wider text-slate-400" htmlFor="admin_form_desc_en">
                      {t[lang].descEn}
                    </label>
                    <textarea
                      id="admin_form_desc_en"
                      rows={3}
                      value={dishDescEn}
                      onChange={(e) => setDishDescEn(e.target.value)}
                      placeholder="Slow cooked premium lamb with seasonal spices..."
                      className="bg-slate-50 border border-slate-200 focus:bg-white focus:border-orange-500 rounded-xl p-2.5 text-xs focus:outline-none leading-relaxed transition-all"
                    ></textarea>
                  </div>

                  {/* Allergens list */}
                  <div className="flex flex-col gap-1.5">
                    <label className="font-bold text-[10px] uppercase tracking-wider text-slate-400" htmlFor="admin_form_allergens">
                      {t[lang].allergens}
                    </label>
                    <input
                      id="admin_form_allergens"
                      type="text"
                      value={dishAllergens}
                      onChange={(e) => setDishAllergens(e.target.value)}
                      placeholder="Dairy, Soy, Gluten..."
                      className="bg-slate-50 border border-slate-200 focus:bg-white focus:border-orange-500 rounded-xl px-3 py-2 text-xs focus:outline-none transition-all"
                    />
                  </div>

                  {/* Checkboxes row */}
                  <div className="grid grid-cols-3 gap-2 py-1 select-none" id="admin_checkboxes_layout">
                    <label className="flex items-center gap-1 cursor-pointer hover:text-slate-900" htmlFor="form_check_special">
                      <input
                        id="form_check_special"
                        type="checkbox"
                        checked={dishIsChefSpecial}
                        onChange={(e) => setDishIsChefSpecial(e.target.checked)}
                        className="accent-orange-600 rounded cursor-pointer w-3.5 h-3.5"
                      />
                      <span className="text-[10px] text-slate-500">Special</span>
                    </label>

                    <label className="flex items-center gap-1 cursor-pointer hover:text-slate-900" htmlFor="form_check_spicy">
                      <input
                        id="form_check_spicy"
                        type="checkbox"
                        checked={dishIsSpicy}
                        onChange={(e) => setDishIsSpicy(e.target.checked)}
                        className="accent-orange-600 rounded cursor-pointer w-3.5 h-3.5"
                      />
                      <span className="text-[10px] text-slate-500">Spicy</span>
                    </label>

                    <label className="flex items-center gap-1 cursor-pointer hover:text-slate-900" htmlFor="form_check_veg">
                      <input
                        id="form_check_veg"
                        type="checkbox"
                        checked={dishIsVeg}
                        onChange={(e) => setDishIsVeg(e.target.checked)}
                        className="accent-orange-600 rounded cursor-pointer w-3.5 h-3.5"
                      />
                      <span className="text-[10px] text-slate-500">Veg 🌱</span>
                    </label>
                  </div>

                  <button
                    type="submit"
                    id="save_dish_submit"
                    className="w-full mt-2 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow cursor-pointer transition-all uppercase tracking-wider"
                  >
                    {editDishId ? t[lang].updateDish : t[lang].saveDish}
                  </button>

                </form>

              </div>

              {/* Restaurant Profile Customization Form */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs" id="admin_profile_viewport">
                <div className="flex justify-between items-center pb-3 border-b border-slate-100 mb-4" id="admin_profile_header">
                  <div className="flex items-center gap-2">
                    <Settings className="w-4 h-4 text-orange-600 animate-spin-slow" />
                    <h3 className="font-bold text-xs uppercase tracking-wider text-slate-400">
                      {t[lang].editProfileTitle}
                    </h3>
                  </div>
                </div>

                <form onSubmit={handleUpdateProfile} className="flex flex-col gap-4 font-normal text-xs" id="edit_profile_form">
                  {/* Name MN */}
                  <div className="flex flex-col gap-1.5 font-normal">
                    <label className="font-bold text-[10px] uppercase tracking-wider text-slate-400" htmlFor="profile_name_mn">
                      {t[lang].restNameLabelMn}
                    </label>
                    <input
                      id="profile_name_mn"
                      type="text"
                      value={tempNameMn}
                      onChange={(e) => setTempNameMn(e.target.value)}
                      placeholder="Жишээ: Гурмэ Бэнто Ресторан"
                      className="bg-slate-50 border border-slate-200 focus:bg-white focus:border-orange-500 rounded-xl px-3 py-2 text-xs focus:outline-none transition-all font-semibold"
                      required
                    />
                  </div>

                  {/* Name EN */}
                  <div className="flex flex-col gap-1.5 font-normal">
                    <label className="font-bold text-[10px] uppercase tracking-wider text-slate-400" htmlFor="profile_name_en">
                      {t[lang].restNameLabelEn}
                    </label>
                    <input
                      id="profile_name_en"
                      type="text"
                      value={tempNameEn}
                      onChange={(e) => setTempNameEn(e.target.value)}
                      placeholder="E.g., Gourmet Bento Restaurant"
                      className="bg-slate-50 border border-slate-200 focus:bg-white focus:border-orange-500 rounded-xl px-3 py-2 text-xs focus:outline-none transition-all font-semibold"
                      required
                    />
                  </div>

                  {/* Subtitle MN */}
                  <div className="flex flex-col gap-1.5 font-normal">
                    <label className="font-bold text-[10px] uppercase tracking-wider text-slate-400" htmlFor="profile_sub_mn">
                      {t[lang].restSubLabelMn}
                    </label>
                    <textarea
                      id="profile_sub_mn"
                      rows={2}
                      value={tempSubMn}
                      onChange={(e) => setTempSubMn(e.target.value)}
                      placeholder="Жишээ: Интерактив цахим меню болон ухаалаг AI захиалгын систем"
                      className="bg-slate-50 border border-slate-200 focus:bg-white focus:border-orange-500 rounded-xl p-2.5 text-xs focus:outline-none leading-relaxed transition-all font-medium"
                      required
                    ></textarea>
                  </div>

                  {/* Subtitle EN */}
                  <div className="flex flex-col gap-1.5 font-normal">
                    <label className="font-bold text-[10px] uppercase tracking-wider text-slate-400" htmlFor="profile_sub_en">
                      {t[lang].restSubLabelEn}
                    </label>
                    <textarea
                      id="profile_sub_en"
                      rows={2}
                      value={tempSubEn}
                      onChange={(e) => setTempSubEn(e.target.value)}
                      placeholder="E.g., Interactive digital menu and smart AI order assistant"
                      className="bg-slate-50 border border-slate-200 focus:bg-white focus:border-orange-500 rounded-xl p-2.5 text-xs focus:outline-none leading-relaxed transition-all font-medium"
                      required
                    ></textarea>
                  </div>

                  <button
                    type="submit"
                    id="save_profile_submit"
                    className="w-full mt-2 py-2.5 bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs rounded-xl shadow cursor-pointer transition-all uppercase tracking-wider"
                  >
                    {t[lang].saveProfileBtn}
                  </button>
                </form>
              </div>

            </div>
            )}

          </div>
        </div>
      )}

      </main>

      {/* Floating AI Waiter Chat Bubble System */}
      <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-3" id="floating_chat_system">
        
        {/* Expanded chatting board */}
        <AnimatePresence>
          {chatOpen && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 30 }}
              className="w-80 md:w-96 h-[460px] bg-white border border-slate-200/90 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
              id="ai_chat_window"
            >
              {/* Box header */}
              <div className="bg-slate-900 text-white p-4 flex items-center justify-between" id="chat_header">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-orange-600 flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <span className="font-bold text-xs block leading-tight">{t[lang].aiAssistantTitle}</span>
                    <span className="text-[9px] text-[#A1A1AA] font-mono tracking-widest uppercase">Gemini Agent</span>
                  </div>
                </div>
                <button 
                  type="button" 
                  id="chat_close_x"
                  onClick={() => setChatOpen(false)} 
                  className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Chat histories viewport scroll */}
              <div className="flex-1 p-4 overflow-y-auto flex flex-col gap-3 bg-[#FCFCFA]" id="chat_conversation_area">
                {chatHistory.map((msg, index) => {
                  const isUser = msg.role === 'user';
                  return (
                    <div 
                      key={index} 
                      className={`flex flex-col max-w-[80%] ${isUser ? 'self-end items-end' : 'self-start items-start'}`}
                      id={`chat_bubble_${index}`}
                    >
                      <div className={`p-3 rounded-2xl text-[11px] leading-relaxed font-normal shadow-xs ${
                        isUser 
                          ? 'bg-orange-600 text-white rounded-br-none' 
                          : 'bg-white border border-slate-200 text-slate-850 rounded-bl-none'
                      }`}>
                        {msg.text}
                      </div>
                    </div>
                  );
                })}
                {chatLoading && (
                  <div className="flex gap-1.5 self-start items-center bg-white border border-slate-200 p-3 rounded-2xl rounded-bl-none" id="chat_bubble_loading">
                    <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"></span>
                    <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                    <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:0.4s]"></span>
                  </div>
                )}
              </div>

              {/* Interactive preset click suggestions */}
              <div className="p-2 border-t border-slate-100 flex gap-1.5 overflow-x-auto bg-slate-50" id="preset_chat_prompts_row">
                {[
                  lang === 'mn' ? "Онцлох хоол?" : "Recommend special?",
                  lang === 'mn' ? "Халуун сүүтэй цай ууя?" : "Salted Milk tea?",
                  lang === 'mn' ? "Цагаан хоол байна уу?" : "Any vegetarian?",
                ].map((suggest, sIdx) => (
                  <button
                    key={sIdx}
                    type="button"
                    onClick={() => {
                      setChatInput(suggest);
                    }}
                    className="whitespace-nowrap bg-white hover:bg-slate-100 text-slate-650 px-2.5 py-1 border border-slate-200 rounded-lg text-[9px] font-semibold cursor-pointer shrink-0 transition-colors"
                  >
                    {suggest}
                  </button>
                ))}
              </div>

              {/* Box input sender */}
              <form 
                onSubmit={(e) => { e.preventDefault(); handleSendChatMessage(); }} 
                className="p-3 border-t border-slate-100 flex items-center gap-2 bg-white"
                id="chat_input_form"
              >
                <input
                  type="text"
                  id="chat_input_box"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder={t[lang].aiAssistantPlaceholder}
                  className="flex-1 bg-slate-50 border border-slate-200 focus:bg-white focus:border-orange-500 rounded-xl px-3.5 py-2 text-xs focus:outline-none transition-all font-normal"
                />
                <button
                  type="submit"
                  id="chat_send_submit"
                  className="bg-orange-600 hover:bg-orange-700 text-white p-2.5 rounded-xl transition-all cursor-pointer shrink-0 shadow shadow-orange-600/10"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </form>

            </motion.div>
          )}
        </AnimatePresence>

        {/* Primary floating launcher bubble */}
        <button
          type="button"
          id="chat_bubble_launcher_btn"
          onClick={() => setChatOpen(!chatOpen)}
          className="w-14 h-14 bg-slate-900 border border-slate-800 text-white rounded-full flex items-center justify-center shadow-2xl hover:scale-105 hover:bg-slate-850 cursor-pointer transition-transform relative"
          title="Open AI Sommelier Advisor"
        >
          <Sparkles className="w-5 h-5 text-yellow-400 animate-pulse" />
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-orange-600 text-[10px] text-white rounded-full flex items-center justify-center font-bold border-2 border-white font-mono shrink-0">
            AI
          </span>
        </button>

      </div>

      {/* Passcode Authentication Modal */}
      <AnimatePresence>
        {passcodeModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs animate-fade-in" id="passcode_gating_modal">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white border border-slate-200 p-6 rounded-2xl w-full max-w-sm shadow-2xl flex flex-col gap-4 relative"
            >
              <button
                type="button"
                onClick={() => setPasscodeModalOpen(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-900 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
                <div className="p-2 bg-slate-100 rounded-xl text-slate-800">
                  <Lock className="w-5 h-5 text-orange-605" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900 tracking-tight">
                    {lang === 'mn' ? 'Ажилтны Хэсэг рүү Нэвтрэх' : 'Staff Access Gateway'}
                  </h3>
                  <p className="text-[10px] text-slate-500 font-normal">
                    {lang === 'mn' ? 'Системд нэвтрэх 4 оронтой нууц кодоо оруулна уу.' : 'Please enter 4-digit PIN code to unlock.'}
                  </p>
                </div>
              </div>

              {passcodeError && (
                <div className="bg-rose-50 border border-rose-200 text-rose-800 text-[10px] p-2.5 rounded-xl font-bold flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-rose-700 shrink-0" />
                  <span>
                    {lang === 'mn' ? 'Нууц код буруу байна. (Код: 1234)' : 'Incorrect passcode. (PIN: 1234)'}
                  </span>
                </div>
              )}

              <div className="flex flex-col gap-1 text-xs">
                <label className="font-bold text-[10px] text-slate-450 uppercase tracking-widest" htmlFor="pin_input">
                  {lang === 'mn' ? 'Нэвтрэх код' : 'Passcode PIN:'}
                </label>
                <input
                  id="pin_input"
                  type="password"
                  maxLength={4}
                  value={passcodeInput}
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^0-9]/g, '');
                    setPasscodeInput(val);
                    setPasscodeError(false);
                    if (val === '1234') {
                      setViewMode('admin');
                      setPasscodeModalOpen(false);
                      showNotification(lang === 'mn' ? 'Амжилттай нэвтэрлээ!' : 'Access Granted!');
                    }
                  }}
                  autoFocus
                  placeholder="••••"
                  className="w-full text-center text-xl font-mono border border-slate-200 focus:border-orange-500 rounded-xl py-2 px-3 outline-none transition-all placeholder:text-slate-350"
                />
              </div>

              {/* Simple virtual numeric keyboard helper */}
              <div className="grid grid-cols-3 gap-2 text-xs font-bold pt-1" id="numeric_keyboard">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => {
                      if (passcodeInput.length < 4) {
                        const newVal = passcodeInput + num;
                        setPasscodeInput(newVal);
                        setPasscodeError(false);
                        if (newVal === '1234') {
                          setViewMode('admin');
                          setPasscodeModalOpen(false);
                          showNotification(lang === 'mn' ? 'Амжилттай нэвтэрлээ!' : 'Access Granted!');
                        }
                      }
                    }}
                    className="py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200/60 rounded-xl cursor-pointer transition-colors text-base font-mono"
                  >
                    {num}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setPasscodeInput('')}
                  className="py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200/55 rounded-xl cursor-pointer transition-colors text-xs uppercase"
                >
                  {lang === 'mn' ? 'Арилгах' : 'Clear'}
                </button>
                <button
                  key={0}
                  type="button"
                  onClick={() => {
                    if (passcodeInput.length < 4) {
                      const newVal = passcodeInput + '0';
                      setPasscodeInput(newVal);
                      setPasscodeError(false);
                      if (newVal === '1234') {
                        setViewMode('admin');
                        setPasscodeModalOpen(false);
                        showNotification(lang === 'mn' ? 'Амжилттай нэвтэрлээ!' : 'Access Granted!');
                      }
                    }
                  }}
                  className="py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200/60 rounded-xl cursor-pointer transition-colors text-base font-mono"
                >
                  0
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (passcodeInput === '1234') {
                      setViewMode('admin');
                      setPasscodeModalOpen(false);
                      showNotification(lang === 'mn' ? 'Амжилттай нэвтэрлээ!' : 'Access Granted!');
                    } else {
                      setPasscodeError(true);
                      setPasscodeInput('');
                    }
                  }}
                  className="py-2.5 bg-orange-600 hover:bg-orange-700 text-white border border-orange-500 rounded-xl cursor-pointer transition-colors text-xs uppercase font-extrabold shadow-sm"
                >
                  {lang === 'mn' ? 'Орох' : 'Ok'}
                </button>
              </div>

              <div className="text-center text-[10px] text-slate-400 font-medium">
                {lang === 'mn' ? 'Хөгжүүлэлтийн код: 1234' : 'Developer passcode: 1234'}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Workspace Switching Modal */}
      <AnimatePresence>
        {workspaceModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs animate-fade-in" id="workspace_switcher_modal">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white border border-slate-200 p-6 rounded-2xl w-full max-w-sm shadow-2xl flex flex-col gap-4 relative"
            >
              <button
                type="button"
                onClick={() => setWorkspaceModalOpen(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-900 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
                <div className="p-2 bg-orange-50 rounded-xl text-orange-700">
                  <Briefcase className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900 tracking-tight">
                    {lang === 'mn' ? 'Салбар / Салбарт Холбох' : 'Multi-Tenant Workspace Hub'}
                  </h3>
                  <p className="text-[10px] text-slate-500 font-normal">
                    {lang === 'mn' ? 'Өөрийн рестораны түлхүүрийг оруулан тусдаа мэдээллээ удирдана уу.' : 'Switch branches or create a customized new restaurant partition.'}
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-1.5 text-xs">
                <label className="font-bold text-[10px] text-slate-450 uppercase tracking-widest" htmlFor="workspace_key_in">
                  {lang === 'mn' ? 'Байгууллагын Түлхүүр (KEY)' : 'Organization Workspace Key:'}
                </label>
                <input
                  id="workspace_key_in"
                  type="text"
                  value={newWorkspaceKeyInput}
                  onChange={(e) => setNewWorkspaceKeyInput(e.target.value.toUpperCase().replace(/\s/g, ''))}
                  placeholder="E.G. BENTO-GRAND"
                  className="w-full text-center text-sm font-mono border border-slate-200 focus:border-orange-500 rounded-xl py-2 px-3 outline-none transition-all placeholder:text-slate-350"
                />
              </div>

              {/* Presets Row */}
              <div className="flex flex-col gap-2 pt-1">
                <span className="font-bold text-[9px] text-slate-400 uppercase tracking-widest block">
                  {lang === 'mn' ? 'Сонгох болон турших салбарууд:' : 'Select preconfigured branches:'}
                </span>
                <div className="grid grid-cols-1 gap-1.5 max-h-[140px] overflow-y-auto">
                  {([
                    { key: 'BENTO-GRAND', nameMn: '🍱 Bento Grand Lounge (Үндсэн)', nameEn: '🍱 Bento Grand Lounge (Master)' },
                    { key: 'KHAAN-BUUZ', nameMn: '🥟 Хаан Бууз Сүлжээ', nameEn: '🥟 Khaan Buuz Chain' },
                    { key: 'SAKURA-SUSHI', nameMn: '🍣 Сакура Сүши Бар', nameEn: '🍣 Sakura Sushi Bar' }
                  ]).map((prest) => (
                    <button
                      key={prest.key}
                      type="button"
                      onClick={() => {
                        setNewWorkspaceKeyInput(prest.key);
                      }}
                      className={`text-[11px] font-medium p-2 text-left rounded-xl transition-colors border cursor-pointer ${
                        newWorkspaceKeyInput === prest.key 
                          ? 'bg-orange-50 border-orange-200 text-orange-950 font-bold' 
                          : 'bg-slate-50 hover:bg-slate-100 border-transparent text-slate-700'
                      }`}
                    >
                      <div>{lang === 'mn' ? prest.nameMn : prest.nameEn}</div>
                      <div className="text-[9px] font-mono text-slate-400 font-bold">KEY: {prest.key}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                <button
                  type="button"
                  onClick={() => setWorkspaceModalOpen(false)}
                  className="py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-750 font-bold rounded-xl cursor-pointer transition-colors uppercase text-center"
                >
                  {lang === 'mn' ? 'Болих' : 'Cancel'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const cleanKey = newWorkspaceKeyInput.trim().toUpperCase();
                    if (cleanKey.length > 0) {
                      setRestaurantKey(cleanKey);
                      setWorkspaceModalOpen(false);
                      showNotification(lang === 'mn' ? `Амжилттай холбогдсон: ${cleanKey}` : `Workspace switched to: ${cleanKey}`);
                    }
                  }}
                  className="py-2.5 bg-orange-600 hover:bg-orange-700 text-white font-extrabold rounded-xl cursor-pointer transition-colors uppercase text-center"
                >
                  {lang === 'mn' ? 'Холбох' : 'Switch'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Luxury Footer */}
      <footer className="mt-auto border-t border-slate-200/60 py-6 bg-white text-center" id="gourmet_footer">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-slate-400 font-normal">
          <p className="text-[10px] text-slate-400 font-mono uppercase tracking-widest" id="footer_credit">
            © 2026 {lang === 'mn' ? restNameMn : restNameEn} • Powered by Bento v2
          </p>
          <div className="flex items-center gap-3">
            {viewMode === 'admin' ? (
              <button
                type="button"
                onClick={() => setViewMode('customer')}
                className="text-orange-600 font-bold text-[10px] uppercase tracking-wider flex items-center gap-1 cursor-pointer hover:underline"
              >
                <span>{lang === 'mn' ? 'Үйлчлүүлэгчийн цэс рүү буцах' : 'Back to Customer Menu'}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setPasscodeError(false);
                  setPasscodeInput('');
                  setPasscodeModalOpen(true);
                }}
                className="text-slate-400 hover:text-slate-800 font-bold text-[10px] uppercase tracking-wider flex items-center gap-1 cursor-pointer hover:underline"
                id="discreet_admin_trigger"
              >
                <Lock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>{lang === 'mn' ? 'Ажилтны нэвтрэх хэсэг' : 'Staff Admin Panel Login'}</span>
              </button>
            )}
          </div>
        </div>
      </footer>

    </div>
  );
}
