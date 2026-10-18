import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  Cell, PieChart, Pie, Legend, CartesianGrid
} from 'recharts';
import {
  Download, Smartphone, Globe, MousePointer, Trophy, Bot,
  Clock, TrendingUp, AlertTriangle, Zap, TrendingDown
} from 'lucide-react';
import { saveAs } from 'file-saver';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

// --- CONFIGURATION ---
const ANALYTICS_API_URL = "https://smartlink-analytics-1.onrender.com";

const AnalyticsDashboard = ({ hubId }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState('all');
  const dashboardRef = useRef();

  // --- DATA FETCHING ---
  useEffect(() => {
    if (!hubId) return;
    setLoading(true);
    
    const safetyTimer = setTimeout(() => {
       if(loading) setLoading(false); 
    }, 8000);

    fetch(`${ANALYTICS_API_URL}/dashboard/${hubId}?range=${range}`)
      .then(res => {
        if (!res.ok) throw new Error("API Error");
        return res.json();
      })
      .then(json => {
        setData(json);
        setLoading(false);
        clearTimeout(safetyTimer);
      })
      .catch(err => {
        console.error("Fetch Error:", err);
        setLoading(false); 
      });

    return () => clearTimeout(safetyTimer);
  }, [hubId, range]);

  // --- CHART DATA PREPARATION ---
  const hourlyData = useMemo(() => {
    // Robust check: Default to empty object if byHour is missing
    const hours = data?.byHour || {};
    return Array.from({ length: 24 }, (_, i) => ({
      hour: i,
      label: i === 0 ? '12 AM' : i === 12 ? '12 PM' : i > 12 ? `${i-12} PM` : `${i} AM`,
      clicks: hours[i] || hours[String(i)] || 0
    }));
  }, [data]);

  const categoryData = useMemo(() => {
    if (!data?.categoryBreakdown) return [];
    return Object.entries(data.categoryBreakdown)
      .map(([name, value]) => ({ name, value }))
      .filter(i => i.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [data]);

  const countryData = useMemo(() => {
    if (!data?.countryBreakdown) return [];
    return Object.entries(data.countryBreakdown)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [data]);

  const linkTableData = useMemo(() => {
    if (!data?.detailedLinkStats) return [];
    return Object.entries(data.detailedLinkStats)
      .map(([id, clicks]) => ({ id, clicks }))
      .sort((a, b) => b.clicks - a.clicks);
  }, [data]);

  const leastPerformingLink = useMemo(() => {
    if (!data?.detailedLinkStats) return null;
    const entries = Object.entries(data.detailedLinkStats);
    if (entries.length === 0) return null;
    // Returns [id, clicks] of the lowest performer
    return entries.sort((a, b) => a[1] - b[1])[0];
  }, [data]);

  // --- EXPORT FUNCTIONS ---
  const exportJSON = () => {
    const blob = new Blob([JSON.stringify(data || {}, null, 2)], { type: 'application/json' });
    saveAs(blob, `analytics-${hubId || 'hub'}-${range}.json`);
  };

  const exportPDF = async () => {
    if (!dashboardRef.current) return;
    const canvas = await html2canvas(dashboardRef.current, { scale: 2, backgroundColor: "#000000" });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('landscape', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    pdf.save(`analytics-${hubId}-${range}.pdf`);
  };

  const exportCSV = () => {
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Metric,Value\n";
    csvContent += `Total Visits,${data?.totalVisits || 0}\n`;
    csvContent += `Top Link,${data?.topPerformingLink?.id || 'N/A'}\n\n`;
    csvContent += "Link ID,Clicks\n";
    linkTableData.forEach(row => csvContent += `${row.id},${row.clicks}\n`);
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `analytics-${hubId}.csv`);
    document.body.appendChild(link);
    link.click();
  };

  // --- RENDER HELPERS ---
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-black border border-green-500 p-2 rounded shadow-xl shadow-green-900/20">
          <p className="text-green-400 font-bold text-xs">{label}</p>
          <p className="text-white text-sm">Clicks: {payload[0].value}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div ref={dashboardRef} className="min-h-screen bg-black text-gray-100 font-sans p-4 md:p-8 selection:bg-green-500/30">
      
      {/* 1. HEADER SECTION */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 border-b border-gray-800 pb-6 gap-4">
        <div>
          <h1 className="text-4xl font-extrabold text-white tracking-tight flex items-center gap-3">
            ANALYTICS <span className="text-green-500">HUB</span>
          </h1>
          <p className="text-gray-500 mt-2 text-sm font-medium">
            LIVE MONITORING • <span className="text-green-400 font-mono uppercase">{data?.period || 'INITIALIZING...'}</span>
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Range selector */}
          <div className="flex flex-wrap gap-2 bg-gray-900 p-1 rounded-lg border border-gray-800" role="tablist" aria-label="Time range">
            {['today', 'yesterday', '7d', '30d', '90d', 'all'].map(r => (
              <button
                key={r}
                onClick={() => setRange(r)}
                aria-pressed={range === r}
                role="tab"
                tabIndex={0}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all focus:outline-none focus:ring-2 focus:ring-green-500 ${
                  range === r ? 'bg-green-600 text-white shadow-lg shadow-green-900/50' : 'text-gray-400 hover:text-white hover:bg-gray-800'
                }`}
                title={`Show ${r === 'all' ? 'All time' : r}`}
              >
                {r === 'all' ? 'All Time' : r.toUpperCase()}
              </button>
            ))}
          </div>

          {/* Export menu - FIXED: Absolute positioning to prevent header resize */}
          <div className="relative">
            <details className="group relative">
              <summary className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-gray-900 border border-gray-800 cursor-pointer focus:outline-none focus:ring-2 focus:ring-green-500 hover:bg-gray-800 transition-colors list-none">
                <Download className="h-4 w-4 text-green-400" />
                <span className="text-xs text-gray-200">Export</span>
              </summary>
              
              {/* Dropdown Content with z-index and absolute positioning */}
              <div className="absolute right-0 top-full mt-2 w-44 bg-gray-900 border border-gray-800 rounded shadow-xl p-2 z-50">
                <button onClick={exportCSV} className="w-full text-left px-2 py-2 text-sm text-gray-300 hover:bg-gray-800 hover:text-green-400 rounded transition-colors">Export CSV</button>
                <button onClick={exportJSON} className="w-full text-left px-2 py-2 text-sm text-gray-300 hover:bg-gray-800 hover:text-green-400 rounded transition-colors">Export JSON</button>
                <button onClick={exportPDF} className="w-full text-left px-2 py-2 text-sm text-gray-300 hover:bg-gray-800 hover:text-green-400 rounded transition-colors">Export PDF</button>
              </div>
            </details>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="h-96 flex flex-col items-center justify-center space-y-4 animate-pulse">
           <Zap size={48} className="text-green-500" />
           <div className="text-green-500 font-mono text-lg">ESTABLISHING SECURE CONNECTION...</div>
        </div>
      ) : !data || data.totalVisits === 0 ? (
        <div className="flex flex-col items-center justify-center h-96 border border-dashed border-gray-800 rounded-xl bg-gray-900/20">
           <AlertTriangle size={64} className="text-gray-700 mb-4" />
           <h3 className="text-xl font-bold text-gray-300">No Data Detected</h3>
           <p className="text-gray-500 max-w-md text-center mt-2">
             Your hub is live, but we haven't tracked any visitors in this time range yet. Share your link to start the engine!
           </p>
           {data?.suggestions?.length > 0 && (
             <div className="mt-8 p-4 bg-green-900/10 border border-green-900 rounded-lg max-w-lg">
                <p className="text-green-400 text-sm font-mono flex items-center gap-2">
                  <Bot size={16}/> AI ADVICE: {data.suggestions[0].replace(/\*\*/g, '')}
                </p>
             </div>
           )}
        </div>
      ) : (
        <div className="space-y-6">

          {/* 2. AI INSIGHTS ENGINE */}
          {data.suggestions?.length > 0 && (
            <div className="bg-gradient-to-r from-gray-900 via-gray-900 to-black border-l-4 border-green-500 rounded-r-xl p-6 shadow-2xl relative overflow-hidden group">
              <div className="absolute -right-10 -top-10 opacity-5 transition-opacity group-hover:opacity-10"><Bot size={150} /></div>
              
              <h3 className="flex items-center gap-2 text-green-400 font-bold uppercase tracking-widest text-xs mb-4">
                <Bot size={16} /> Intelligent Growth Engine
              </h3>
              
              <div className="grid md:grid-cols-2 gap-6">
                {data.suggestions.map((s, i) => (
                  <div key={i} className="flex gap-4 items-start">
                    <div className="mt-1 w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_8px_#22c55e] shrink-0"></div>
                    <p className="text-sm text-gray-300 leading-relaxed font-light" 
                       dangerouslySetInnerHTML={{__html: s.replace(/\*\*(.*?)\*\*/g, '<span class="text-white font-bold">$1</span>')}} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 3. KPI CARDS */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <KpiCard 
              label="Total Visits" 
              value={data.totalVisits} 
              icon={<MousePointer size={20} className="text-green-500"/>} 
            />
            <KpiCard 
              label="Top Performer" 
              value={data.topPerformingLink?.id || '-'} 
              subValue={`${data.topPerformingLink?.clicks || 0} clicks`}
              icon={<Trophy size={20} className="text-yellow-500"/>} 
              truncate
            />
            
            {/* Needs Boost Logic */}
            <KpiCard 
              label="Needs Boost" 
              value={leastPerformingLink ? leastPerformingLink[0] : '-'}
              subValue={leastPerformingLink ? `${leastPerformingLink[1]} clicks` : 'N/A'}
              icon={<TrendingDown size={20} className="text-red-500"/>}
              truncate
              borderColor="hover:border-red-500/30"
            />

             <KpiCard 
              label="Peak Traffic" 
              value={getPeakTimeLabel(data.byHour)} 
              icon={<Clock size={20} className="text-blue-500"/>} 
            />
            <KpiCard 
              label="Top Country" 
              value={countryData[0]?.name || '-'} 
              icon={<Globe size={20} className="text-purple-500"/>} 
            />
          </div>

          {/* 4. PRIMARY CHARTS */}
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-[#0f0f0f] border border-gray-800 rounded-xl p-6">
              <h3 className="text-gray-400 font-bold uppercase text-xs mb-6 flex items-center gap-2">
                <TrendingUp size={16} className="text-green-500"/> Activity Volume (24h)
              </h3>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={hourlyData}>
                    <defs>
                      <linearGradient id="colorClicks" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                    <XAxis dataKey="label" tick={{fill:'#666', fontSize:10}} axisLine={false} tickLine={false} interval={3}/>
                    <Tooltip content={<CustomTooltip />} cursor={{stroke: '#22c55e', strokeWidth: 1}}/>
                    <Area type="monotone" dataKey="clicks" stroke="#22c55e" strokeWidth={3} fillOpacity={1} fill="url(#colorClicks)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-[#0f0f0f] border border-gray-800 rounded-xl p-6">
              <h3 className="text-gray-400 font-bold uppercase text-xs mb-6">Content Strategy</h3>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={categoryData} layout="vertical">
                    <XAxis type="number" hide />
                    <YAxis dataKey="name" type="category" width={100} tick={{fill:'#999', fontSize:11}} tickLine={false} axisLine={false}/>
                    <Tooltip cursor={{fill: 'rgba(34,197,94,0.1)'}} content={<CustomTooltip />} />
                    <Bar dataKey="value" fill="#22c55e" radius={[0, 4, 4, 0]} barSize={20} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* 5. SECONDARY METRICS */}
          <div className="grid lg:grid-cols-3 gap-6">
            
            {/* LINK PERFORMANCE TABLE */}
            <div className="lg:col-span-2 bg-[#0f0f0f] border border-gray-800 rounded-xl p-6 flex flex-col">
              <h3 className="text-gray-400 font-bold uppercase text-xs mb-4">Detailed Link Performance</h3>
              <div className="flex-1 overflow-auto max-h-64 custom-scrollbar">
                <table className="w-full text-left">
                  <thead className="sticky top-0 bg-[#0f0f0f] z-10">
                    <tr className="text-gray-600 text-xs border-b border-gray-800">
                      <th className="pb-3 pl-2">LINK ID</th>
                      <th className="pb-3 text-right">CLICKS</th>
                      <th className="pb-3 text-right pr-2">TRAFFIC SHARE</th>
                    </tr>
                  </thead>
                  <tbody>
                    {linkTableData.map((row, i) => (
                      <tr key={i} className="border-b border-gray-800/50 hover:bg-gray-800 hover:text-green-400 transition-colors group cursor-default">
                        <td className="py-3 pl-2 text-sm font-mono text-gray-300 group-hover:text-green-400 truncate max-w-[200px]">{row.id}</td>
                        <td className="py-3 text-sm text-gray-400 text-right font-mono">{row.clicks}</td>
                        <td className="py-3 pr-2 text-xs text-gray-600 text-right">
                          <div className="flex items-center justify-end gap-2">
                             <span>{((row.clicks / data.totalVisits) * 100).toFixed(0)}%</span>
                             <div className="w-12 h-1 bg-gray-800 rounded-full overflow-hidden">
                               <div className="h-full bg-green-500" style={{width: `${(row.clicks / data.totalVisits) * 100}%`}}></div>
                             </div>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* DEVICE & GEO MINI CARDS */}
            <div className="flex flex-col gap-4">
              <div className="bg-[#0f0f0f] border border-gray-800 rounded-xl p-5 flex-1 min-h-[200px]">
                <h3 className="text-gray-400 font-bold uppercase text-xs mb-2 flex items-center gap-2">
                  <Smartphone size={14}/> Device Types
                </h3>
                <div className="h-full w-full min-h-[160px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie 
                        data={Object.entries(data.deviceBreakdown || {}).map(([k,v]) => ({name:k, value:v}))}
                        innerRadius={40} outerRadius={60} paddingAngle={5} dataKey="value" stroke="none"
                      >
                        {[1,2,3,4].map((_, i) => <Cell key={i} fill={i === 0 ? '#22c55e' : '#15803d'} />)}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                      <Legend verticalAlign="middle" align="right" layout="vertical" iconType="circle" wrapperStyle={{fontSize:'12px', color:'#999'}}/>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-[#0f0f0f] border border-gray-800 rounded-xl p-5 flex-1">
                 <h3 className="text-gray-400 font-bold uppercase text-xs mb-4 flex items-center gap-2">
                  <Globe size={14}/> Top Locations
                </h3>
                <div className="space-y-3">
                  {countryData.slice(0,3).map((c, i) => (
                    <div key={i} className="flex justify-between items-center text-sm">
                      <span className="text-gray-300">{c.name}</span>
                      <span className="text-green-500 font-mono">{c.value}</span>
                    </div>
                  ))}
                  {countryData.length === 0 && <span className="text-gray-600 text-xs">No location data yet</span>}
                </div>
              </div>

            </div>
          </div>

        </div>
      )}
    </div>
  );
};

// --- SUB-COMPONENTS ---

const KpiCard = ({ label, value, subValue, icon, truncate, borderColor }) => (
  <div className={`bg-[#0f0f0f] p-5 rounded-xl border border-gray-800 ${borderColor || 'hover:border-green-500/30'} transition-colors group`}>
    <div className="flex justify-between items-start mb-2">
      <span className="text-gray-500 text-[10px] uppercase font-bold tracking-widest">{label}</span>
      <div className="opacity-50 group-hover:opacity-100 transition-opacity">{icon}</div>
    </div>
    <div className={`text-2xl font-bold text-white ${truncate ? 'truncate' : ''}`} title={truncate ? value : ''}>
      {value}
    </div>
    {subValue && <div className="text-xs text-gray-500 mt-1">{subValue}</div>}
  </div>
);

const getPeakTimeLabel = (byHour) => {
  // FIXED: Safety check + Safe reduce logic
  if (!byHour || Object.keys(byHour).length === 0) return "N/A";
  
  // Convert keys to numbers for correct comparison
  const peakHour = Object.keys(byHour).reduce((a, b) => byHour[a] > byHour[b] ? a : b);
  
  const h = parseInt(peakHour);
  if (isNaN(h)) return "N/A";

  const suffix = h >= 12 ? 'PM' : 'AM';
  const displayH = h % 12 || 12;
  return `${displayH} ${suffix}`;
};

export default AnalyticsDashboard;