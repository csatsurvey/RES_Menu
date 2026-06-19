import React, { useState } from 'react';
import { Star, Clock, Trash2, ShieldAlert, Calendar, HelpCircle, Download, Printer } from 'lucide-react';

interface CustomerFeedback {
  id: string;
  tableNumber: string;
  tasteRating: number;
  serviceRating: number;
  comment: string;
  phone?: string;
  status: string;
  timestamp: string;
  createdAt?: string;
  ratings?: Record<string, number>;
}

interface SurveysDashboardProps {
  lang: 'mn' | 'en';
  feedbacks: CustomerFeedback[];
  setFeedbacks: React.Dispatch<React.SetStateAction<CustomerFeedback[]>>;
  showNotification: (msg: string) => void;
  
  surveyDateInterval: 'all' | 'today' | 'week' | 'month' | 'custom';
  setSurveyDateInterval: (val: 'all' | 'today' | 'week' | 'month' | 'custom') => void;
  surveyStartDate: string;
  setSurveyStartDate: (val: string) => void;
  surveyEndDate: string;
  setSurveyEndDate: (val: string) => void;
}

export default function SurveysDashboard({
  lang,
  feedbacks,
  setFeedbacks,
  showNotification,
  surveyDateInterval,
  setSurveyDateInterval,
  surveyStartDate,
  setSurveyStartDate,
  surveyEndDate,
  setSurveyEndDate
}: SurveysDashboardProps) {
  
  // Status filtering state specifically for dashboard
  const [feedbackFilter, setFeedbackFilter] = useState<string>('all');

  // Quantitative state helpers: count by status (on all date-filtered surveys)
  const getFilteredFeedbacksByDate = () => {
    return feedbacks.filter(f => {
      if (!f.createdAt) return true;
      const fDate = new Date(f.createdAt);
      const now = new Date();
      
      if (surveyDateInterval === 'today') {
        return fDate.toDateString() === now.toDateString();
      } else if (surveyDateInterval === 'week') {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(now.getDate() - 7);
        return fDate >= sevenDaysAgo;
      } else if (surveyDateInterval === 'month') {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(now.getDate() - 30);
        return fDate >= thirtyDaysAgo;
      } else if (surveyDateInterval === 'custom') {
        if (surveyStartDate && surveyEndDate) {
          const start = new Date(surveyStartDate);
          start.setHours(0, 0, 0, 0);
          const end = new Date(surveyEndDate);
          end.setHours(23, 59, 59, 999);
          return fDate >= start && fDate <= end;
        } else if (surveyStartDate) {
          const start = new Date(surveyStartDate);
          start.setHours(0, 0, 0, 0);
          return fDate >= start;
        } else if (surveyEndDate) {
          const end = new Date(surveyEndDate);
          end.setHours(23, 59, 59, 999);
          return fDate <= end;
        }
      }
      return true;
    });
  };

  const dateFilteredFeedbacks = getFilteredFeedbacksByDate();

  // Final filtered list based on Status-tag as well
  const finalFiltered = dateFilteredFeedbacks.filter(f => {
    if (feedbackFilter === 'all') return true;
    return f.status === feedbackFilter;
  });

  const handleUpdateFeedbackStatus = (id: string, newStatus: CustomerFeedback['status']) => {
    setFeedbacks(prev => {
      const updated = prev.map(f => f.id === id ? { ...f, status: newStatus } : f);
      localStorage.setItem('gourmet_feedbacks', JSON.stringify(updated));
      return updated;
    });
    showNotification(lang === 'mn' ? 'Асуудлын шийдвэрлэлтийн төлөв шинэчлэгдлээ.' : 'Feedback resolution status updated.');
  };

  // Metric aggregates on selected date-filtered population
  const population = dateFilteredFeedbacks;
  const avgOverall = population.length > 0
    ? (((population.reduce((acc, f) => acc + f.tasteRating, 0) / population.length + population.reduce((acc, f) => acc + f.serviceRating, 0) / population.length) / 2)).toFixed(1)
    : '5.0';

  const avgTaste = population.length > 0
    ? (population.reduce((acc, f) => acc + f.tasteRating, 0) / population.length).toFixed(1)
    : '5.0';

  const avgService = population.length > 0
    ? (population.reduce((acc, f) => acc + f.serviceRating, 0) / population.length).toFixed(1)
    : '5.0';

  const downloadCSV = (headers: string[], data: any[][], fileName: string) => {
    const csvRows = [headers.join(",")];
    for (const row of data) {
      const escaped = row.map(val => {
        const s = String(val ?? '').replace(/"/g, '""');
        return `"${s}"`;
      });
      csvRows.push(escaped.join(","));
    }
    const blob = new Blob(["\uFEFF" + csvRows.join("\n")], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", fileName);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportSurveysToCSV = () => {
    const headers = [
      lang === 'mn' ? 'ID' : "ID",
      lang === 'mn' ? 'Ширээ' : "Table",
      lang === 'mn' ? 'Хоолны амт' : "Taste Rating",
      lang === 'mn' ? 'Үйлчилгээ' : "Service Rating",
      lang === 'mn' ? 'Санал хүсэлт' : "Comment",
      lang === 'mn' ? 'Утас' : "Phone",
      lang === 'mn' ? 'Шийдвэрлэлт' : "Status",
      lang === 'mn' ? 'Огноо' : "Date"
    ];
    const data = finalFiltered.map(f => [
      f.id,
      f.tableNumber,
      f.tasteRating,
      f.serviceRating,
      f.comment,
      f.phone || '',
      f.status,
      f.timestamp
    ]);
    downloadCSV(headers, data, `surveys_${new Date().toISOString().substring(0,10)}.csv`);
    showNotification(lang === 'mn' ? 'Судалгааны тайлан (Excel / CSV) татагдлаа!' : 'Surveys (Excel / CSV) downloaded!');
  };

  const exportSurveysToPDF = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      showNotification(lang === 'mn' ? 'Хөтөчийн pop-up хаалттай байна!' : 'Popup blocker active!');
      return;
    }
    const title = lang === 'mn' ? 'Сэтгэл ханамжийн судалгааны тайлан' : 'Satisfaction Surveys Report';
    const html = `
      <html>
      <head>
        <title>${title}</title>
        <style>
          body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 30px; color: #1e293b; background: #fff; }
          .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #e2e8f0; padding-bottom: 15px; margin-bottom: 20px; }
          h1 { font-size: 20px; color: #0f172a; margin: 0; font-weight: 800; }
          .meta { font-size: 11px; color: #64748b; font-weight: 500; }
          table { width: 100%; border-collapse: collapse; margin-top: 15px; }
          th, td { border: 1px solid #e2e8f0; padding: 10px 12px; text-align: left; font-size: 11.5px; }
          th { background-color: #f8fafc; color: #475569; font-weight: 700; }
          tr:nth-child(even) { background-color: #f8fafc; }
          .stars { color: #f59e0b; font-weight: bold; }
        </style>
      </head>
      <body onload="window.print()">
        <div class="header">
          <div>
            <h1>${title}</h1>
            <p style="margin: 5px 0 0; font-size: 12px; color: #64748b;">${lang === 'mn' ? 'Шүүлтүүрийн төлөв:' : 'Filter state:'} ${feedbackFilter.toUpperCase()}</p>
          </div>
          <div class="meta">
            <div>${lang === 'mn' ? 'Хэвлэсэн:' : 'Printed:'} ${new Date().toLocaleDateString()}</div>
            <div>${lang === 'mn' ? 'Нийт судалгаа:' : 'Count:'} ${finalFiltered.length}</div>
          </div>
        </div>
        <table>
          <thead>
            <tr>
              <th>${lang === 'mn' ? 'Ширээ' : 'Table'}</th>
              <th>${lang === 'mn' ? 'Хоолны амт' : 'Taste'}</th>
              <th>${lang === 'mn' ? 'Үйлчилгээ' : 'Service'}</th>
              <th>${lang === 'mn' ? 'Тайлбар' : 'Comment'}</th>
              <th>${lang === 'mn' ? 'Утас' : 'Phone'}</th>
              <th>${lang === 'mn' ? 'Шийдвэрлэлт' : 'Status'}</th>
            </tr>
          </thead>
          <tbody>
            ${finalFiltered.map(f => `
              <tr>
                <td style="font-weight: bold;">${f.tableNumber}</td>
                <td class="stars">${'★'.repeat(f.tasteRating)}</td>
                <td class="stars">${'★'.repeat(f.serviceRating)}</td>
                <td>${f.comment}</td>
                <td>${f.phone || '-'}</td>
                <td style="font-weight: 600; text-transform: uppercase; font-size: 10px;">${f.status}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </body>
      </html>
    `;
    printWindow.document.write(html);
    printWindow.document.close();
  };

  const clearAllFeedbacks = () => {
    if (window.confirm(lang === 'mn' ? 'Бүх судалгааг бүрмөсөн устгахдаа итгэлтэй байна уу?' : 'Are you sure you want to delete all customer surveys?')) {
      setFeedbacks([]);
      localStorage.setItem('gourmet_feedbacks', JSON.stringify([]));
      showNotification(lang === 'mn' ? 'Судалгаануудыг устгалаа.' : 'Feedback entries cleared.');
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs flex flex-col gap-6 animate-fade-in" id="feedback_executive_board">
      
      {/* Target Title & Clean Purger */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-100">
        <div>
          <h3 className="text-slate-800 font-extrabold text-sm tracking-tight flex items-center gap-2">
            <Calendar className="w-4.5 h-4.5 text-orange-600 font-bold" />
            {lang === 'mn' ? 'Сэтгэл Ханамжийн Судалгаа & Санал Хүсэлтүүд' : 'Satisfaction Surveys & Support Tracker'}
          </h3>
          <p className="text-[10px] text-slate-400 font-medium">
            {lang === 'mn' ? 'Судалгааг хугацааны интервал, тоо хэмжээ төлөвөөр ялган шүүх' : 'Filter complaints and reviews by custom time intervals'}
          </p>
        </div>

        {feedbacks.length > 0 && (
          <div className="flex flex-wrap items-center gap-3 self-start sm:self-center">
            <div className="flex items-center gap-1.5 border-none border-slate-200 sm:border-r sm:pr-3 sm:mr-1">
              <button
                type="button"
                onClick={exportSurveysToCSV}
                className="px-2.5 py-1 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-800 text-slate-705 text-[10px] font-extrabold rounded-lg inline-flex items-center gap-1 transition-all cursor-pointer border border-transparent hover:border-emerald-200"
              >
                <Download className="w-3 h-3 text-slate-500" />
                <span>EXCEL (CSV)</span>
              </button>
              <button
                type="button"
                onClick={exportSurveysToPDF}
                className="px-2.5 py-1 bg-orange-50 hover:bg-orange-100 text-orange-705 border border-orange-150 text-[10px] font-extrabold rounded-lg inline-flex items-center gap-1 transition-all cursor-pointer"
              >
                <Printer className="w-3 h-3 text-orange-600" />
                <span>PDF / PRINT</span>
              </button>
            </div>
            
            <button
              type="button"
              onClick={clearAllFeedbacks}
              className="text-[10.5px] text-rose-600 hover:text-rose-800 font-bold flex items-center gap-1 cursor-pointer hover:underline"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{lang === 'mn' ? 'Түүх цэвэрлэх' : 'Purger Logs'}</span>
            </button>
          </div>
        )}
      </div>

      {/* 1. TIME INTERVAL FILTERS */}
      <div className="bg-slate-50 border border-slate-100/50 rounded-2xl p-4 flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <span className="font-extrabold text-[10px] text-slate-400 uppercase tracking-widest block">
            {lang === 'mn' ? '1. ХУГАЦААНЫ ИНТЕРВАЛ ШҮҮХ:' : '1. TIME INTERVAL FILTER:'}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {([
            { id: 'all', labelMn: 'Бүх хугацаа', labelEn: 'All time' },
            { id: 'today', labelMn: 'Өнөөдөр', labelEn: 'Today' },
            { id: 'week', labelMn: 'Сүүлийн 7 хоног', labelEn: '7 Days' },
            { id: 'month', labelMn: 'Сүүлийн 30 хоног', labelEn: '30 Days' },
            { id: 'custom', labelMn: 'Хугацаа сонгох...', labelEn: 'Custom Calendar' }
          ] as const).map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => setSurveyDateInterval(opt.id)}
              className={`px-3 py-1.5 rounded-xl text-[10.5px] font-bold border transition-all cursor-pointer ${
                surveyDateInterval === opt.id
                  ? 'bg-orange-600 text-white border-orange-500 shadow-sm shadow-orange-500/10'
                  : 'bg-white text-slate-650 hover:bg-slate-50 border-slate-200'
              }`}
            >
              {lang === 'mn' ? opt.labelMn : opt.labelEn}
            </button>
          ))}
        </div>

        {/* Custom date range calendar fields */}
        {surveyDateInterval === 'custom' && (
          <div className="grid grid-cols-2 gap-3 mt-1.5 pt-3 border-t border-slate-200/60 animate-fade-in">
            <div className="flex flex-col gap-1">
              <span className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider">
                {lang === 'mn' ? 'Эхлэх хугацаа:' : 'Start Date:'}
              </span>
              <input
                type="date"
                value={surveyStartDate}
                onChange={(e) => setSurveyStartDate(e.target.value)}
                className="bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-slate-705 cursor-pointer outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-100"
              />
            </div>
            
            <div className="flex flex-col gap-1">
              <span className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider">
                {lang === 'mn' ? 'Дуусах хугацаа:' : 'End Date:'}
              </span>
              <input
                type="date"
                value={surveyEndDate}
                onChange={(e) => setSurveyEndDate(e.target.value)}
                className="bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-slate-705 cursor-pointer outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-100"
              />
            </div>
          </div>
        )}
      </div>

      {/* 2. STATS KPI CARDS OVERVIEW */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4" id="kpi_ratings_widget">
        {/* KPI 1: Overall Average */}
        <div className="bg-indigo-50/50 border border-indigo-100 rounded-2xl p-4 text-center flex flex-col justify-center items-center">
          <span className="text-[10px] font-extrabold text-indigo-600 uppercase tracking-widest mb-1 block">
            {lang === 'mn' ? 'НҮГДҮҮЛСЭН ДУНДАЖ' : 'OVERALL AVG RATING'}
          </span>
          <div className="flex items-center gap-1.5 bg-white px-3.5 py-1 rounded-xl shadow-xs border border-indigo-100/50">
            <span className="text-xl font-mono font-extrabold text-indigo-950">
              {avgOverall}
            </span>
            <Star className="w-5 h-5 fill-amber-400 text-amber-400 shrink-0" />
          </div>
        </div>

        {/* KPI 2: Taste Average */}
        <div className="bg-orange-50/50 border border-orange-100 rounded-2xl p-4 text-center flex flex-col justify-center items-center">
          <span className="text-[10px] font-extrabold text-orange-600 uppercase tracking-widest mb-1 block">
            {lang === 'mn' ? 'ХООЛНЫ АМТНЫ ДУНДАЖ' : 'TASTE AVG RATING'}
          </span>
          <div className="flex items-center gap-1.5 bg-white px-3.5 py-1 rounded-xl shadow-xs border border-orange-100/50">
            <span className="text-xl font-mono font-extrabold text-orange-950">
              {avgTaste}
            </span>
            <span className="text-[10px] text-orange-400 font-bold">/ 5.0</span>
          </div>
        </div>

        {/* KPI 3: Service Average */}
        <div className="bg-emerald-50/50 border border-emerald-100 rounded-2xl p-4 text-center flex flex-col justify-center items-center">
          <span className="text-[10px] font-extrabold text-emerald-600 uppercase tracking-widest mb-1 block">
            {lang === 'mn' ? 'ҮЙЛЧИЛГЭЭНИЙ ДУНДАЖ' : 'SERVICE AVG RATING'}
          </span>
          <div className="flex items-center gap-1.5 bg-white px-3.5 py-1 rounded-xl shadow-xs border border-emerald-100/50">
            <span className="text-xl font-mono font-extrabold text-emerald-950">
              {avgService}
            </span>
            <span className="text-[10px] text-emerald-400 font-bold">/ 5.0</span>
          </div>
        </div>
      </div>

      {/* 3. QUANTITY STATUS RECONCILIATION BAR */}
      <div className="bg-slate-50 border border-slate-250/100 rounded-2xl p-4 flex flex-col gap-3">
        <span className="font-extrabold text-[10px] text-slate-400 uppercase tracking-widest block font-sans">
          {lang === 'mn' ? '2. ТО-ХЭМЖЭЭ ТӨЛӨВӨӨР ЯЛГАХ:' : '2. QUANTITY BY STATUS TAG:'}
        </span>
        
        <div className="flex flex-wrap items-center gap-1.5 text-xs font-normal">
          {([
            { id: 'all', mn: 'Бүгд', en: 'All' },
            { id: 'pending', mn: 'Шийдээгүй / Шинэ', en: 'Unresolved' },
            { id: 'inprogress', mn: 'Хийгдэж байна', en: 'In progress' },
            { id: 'solved', mn: 'Шийдсэн', en: 'Resolved' },
            { id: 'uncontactable', mn: 'Холбогдож чадаагүй', en: 'Uncontactable' }
          ] as const).map((st) => {
            const countValue = st.id === 'all' 
              ? dateFilteredFeedbacks.length 
              : dateFilteredFeedbacks.filter(x => x.status === st.id).length;

            const badgeBg = feedbackFilter === st.id 
              ? 'bg-orange-600 text-white' 
              : 'bg-white text-slate-700 hover:bg-slate-100/80 border-slate-200';

            return (
              <button
                key={st.id}
                type="button"
                onClick={() => setFeedbackFilter(st.id)}
                className={`px-3 py-1.5 rounded-xl border text-[10px] font-extrabold text-center transition-all cursor-pointer flex items-center gap-1.5 ${badgeBg}`}
              >
                <span>{lang === 'mn' ? st.mn : st.en}</span>
                <span className={`text-[9.5px] px-2 py-0.5 rounded-full font-mono ${
                  feedbackFilter === st.id ? 'bg-orange-700 text-orange-50' : 'bg-slate-100 text-slate-500'
                }`}>
                  {countValue}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. SURVEYS COMPLAINTS LIST FEED */}
      <div className="flex flex-col gap-4">
        {feedbacks.length === 0 ? (
          <div className="py-12 text-center text-slate-400 border border-dashed border-slate-150 rounded-2xl flex flex-col items-center justify-center gap-2">
            <HelpCircle className="w-8 h-8 text-slate-200" />
            <p className="text-xs">
              {lang === 'mn' ? 'Системд ямар нэгэн судалгаа одоогоор бүртгэгдээгүй байна.' : 'No evaluations recorded in database yet.'}
            </p>
          </div>
        ) : finalFiltered.length === 0 ? (
          <div className="py-10 text-center text-slate-450 border border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center gap-2">
            <p className="text-xs font-semibold text-slate-500">
              {lang === 'mn' ? `Сонгосон шүүлтүүрт тохирох судалгаа олдсонгүй.` : 'No surveys match the specified filtering conditions.'}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-4 max-h-[500px] overflow-y-auto pr-1">
            {finalFiltered.map((feedback) => (
              <div 
                key={feedback.id} 
                className={`border rounded-2xl p-4 bg-slate-50/40 hover:bg-slate-50/70 transition-colors flex flex-col gap-3 relative ${
                  feedback.status === 'solved' ? 'border-emerald-200/50' :
                  feedback.status === 'inprogress' ? 'border-amber-200/50' :
                  'border-slate-200'
                }`}
              >
                {/* Header row: Table & Time */}
                <div className="flex items-center justify-between gap-3 pb-2 border-b border-zinc-100">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-extrabold text-[10px] bg-slate-900 text-white rounded-lg px-2.5 py-0.5 font-mono">
                      {lang === 'mn' ? `ШИРЭЭ ${feedback.tableNumber}` : `TABLE ${feedback.tableNumber}`}
                    </span>
                    {feedback.phone && (
                      <span className="text-[10px] bg-orange-50 text-orange-700 font-mono font-bold px-2.5 py-0.5 rounded-lg border border-orange-100 shrink-0">
                        {lang === 'mn' ? `Утас: ${feedback.phone}` : `Call: ${feedback.phone}`}
                      </span>
                    )}
                  </div>
                  <span className="text-[9.5px] font-mono text-slate-400 font-medium flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {feedback.timestamp}
                  </span>
                </div>

                {/* Star breakdown details */}
                <div className="grid grid-cols-2 gap-3 bg-white p-2.5 rounded-xl border border-slate-100 text-[10.5px]">
                  <div className="flex items-center gap-2 text-slate-650 font-bold">
                    <span>{lang === 'mn' ? 'Хоолны амт:' : 'Food Taste:'}</span>
                    <div className="flex items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map((st) => (
                        <Star 
                          key={st} 
                          className={`w-3.5 h-3.5 ${st <= feedback.tasteRating ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}`} 
                        />
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-slate-650 font-bold">
                    <span>{lang === 'mn' ? 'Үйлчилгээ:' : 'Service:'}</span>
                    <div className="flex items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map((st) => (
                        <Star 
                          key={st} 
                          className={`w-3.5 h-3.5 ${st <= feedback.serviceRating ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}`} 
                        />
                      ))}
                    </div>
                  </div>
                </div>

                {/* Comment box */}
                {feedback.comment ? (
                  <p className="text-xs text-slate-700 leading-relaxed font-normal bg-orange-50/20 p-2.5 rounded-xl border border-orange-100/30">
                    "{feedback.comment}"
                  </p>
                ) : (
                  <span className="text-[10.5px] text-slate-400 italic font-medium">
                    {lang === 'mn' ? 'Нэмэлт тайлбар үлдээгээгүй.' : 'No written remarks.'}
                  </span>
                )}

                {/* PROGRESS MANIPULATION CONTROLS */}
                <div className="flex items-center justify-between gap-4 pt-2 border-t border-slate-100">
                  <span className="text-[9px] uppercase tracking-widest text-slate-400 font-extrabold block">
                    {lang === 'mn' ? 'Асуудлын шийдвэрлэлтийн төлөв:' : 'Complaint State:'}
                  </span>
                  
                  <div className="flex items-center gap-1">
                    <select
                      id={`feedback_status_selector_${feedback.id}`}
                      value={feedback.status}
                      onChange={(e) => handleUpdateFeedbackStatus(feedback.id, e.target.value as CustomerFeedback['status'])}
                      className={`text-[10.5px] font-extrabold rounded-xl px-3 py-1.5 outline-none border focus:ring-2 cursor-pointer transition-all ${
                        feedback.status === 'solved' 
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200 focus:ring-emerald-200' 
                          : feedback.status === 'inprogress'
                          ? 'bg-amber-50 text-amber-850 border-amber-200 focus:ring-amber-200'
                          : feedback.status === 'uncontactable'
                          ? 'bg-indigo-50 text-indigo-805 border-indigo-200 focus:ring-indigo-200'
                          : 'bg-rose-50 text-rose-800 border-rose-200 focus:ring-rose-200'
                      }`}
                    >
                      <option value="pending" className="bg-white text-rose-800 font-extrabold">
                        {lang === 'mn' ? 'Шийдээгүй' : 'Unresolved'}
                      </option>
                      <option value="inprogress" className="bg-white text-amber-850 font-extrabold">
                        {lang === 'mn' ? 'Хийгдэж байна' : 'In Progress'}
                      </option>
                      <option value="solved" className="bg-white text-emerald-800 font-extrabold">
                        {lang === 'mn' ? 'Шийдвэрлэсэн' : 'Resolved'}
                      </option>
                      <option value="uncontactable" className="bg-white text-indigo-800 font-extrabold">
                        {lang === 'mn' ? 'Холбогдож чадаагүй' : 'Uncontactable'}
                      </option>
                    </select>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
