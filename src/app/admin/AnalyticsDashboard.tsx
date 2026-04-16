import { useState, useEffect } from "react";
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from "recharts";
import { 
  Users, 
  ShoppingBag, 
  TrendingUp, 
  DollarSign, 
  ArrowUpRight, 
  ArrowDownRight,
  Database,
  BarChart3,
  Calendar
} from "lucide-react";
import { adminApi } from "./api";
import { motion } from "framer-motion";

export function AnalyticsDashboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
  }, []);

  async function loadAnalytics() {
    try {
      const result = await adminApi.getAnalytics();
      setData(result);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const seedData = async () => {
    if (confirm("Generate 30 days of sample traffic and sales data?")) {
      setLoading(true);
      await adminApi.seedAnalyticsData();
      await loadAnalytics();
    }
  };

  if (loading) return <div className="h-96 flex items-center justify-center text-neutral-400 text-[10px] tracking-[.4em] uppercase animate-pulse">Calculating Market Vector...</div>;

  // Calculate high-level stats from daily data
  const last30 = data?.daily || [];
  const totalVisits = last30.reduce((acc: number, d: any) => acc + (d.visits || 0), 0);
  const totalOrders = last30.reduce((acc: number, d: any) => acc + (d.orders || 0), 0);
  const totalRevenue = last30.reduce((acc: number, d: any) => acc + (d.revenue || 0), 0);
  const conversionRate = totalVisits > 0 ? (totalOrders / totalVisits) * 100 : 0;

  const kpis = [
    { label: "Visitors", value: totalVisits.toLocaleString(), trend: "+12%", icon: Users, up: true },
    { label: "Orders", value: totalOrders.toLocaleString(), trend: "+5%", icon: ShoppingBag, up: true },
    { label: "Conversion", value: `${conversionRate.toFixed(1)}%`, trend: "-0.2%", icon: TrendingUp, up: false },
    { label: "Revenue", value: `CA$${totalRevenue.toLocaleString()}`, trend: "+18%", icon: DollarSign, up: true },
  ];

  return (
    <div className="space-y-12">
      <header className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-light tracking-tight">Intelligence</h2>
          <p className="text-[10px] tracking-widest text-neutral-400 uppercase mt-1">Real-time performance metrics</p>
        </div>
        <div className="flex gap-4">
           {!data?.daily?.length && (
             <button onClick={seedData} className="flex items-center gap-2 border border-neutral-200 px-6 py-2 rounded-full text-[9px] font-bold tracking-[.2em] hover:bg-neutral-50 transition-all">
               <Database size={12} /> SEED ANALYTICS
             </button>
           )}
           <div className="bg-white border border-neutral-100 rounded-full px-4 py-2 flex items-center gap-2 text-[10px] font-bold tracking-widest text-neutral-400">
              <Calendar size={12} /> LAST 30 DAYS
           </div>
        </div>
      </header>

      {/* KPI GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpis.map((kpi, i) => (
          <motion.div 
            key={kpi.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white border border-neutral-100 p-8 rounded-[2.5rem] shadow-sm hover:shadow-md transition-shadow group"
          >
            <div className="flex justify-between items-start mb-6">
              <div className="p-3 bg-neutral-50 rounded-2xl group-hover:bg-black group-hover:text-white transition-all">
                <kpi.icon size={20} />
              </div>
              <div className={`flex items-center gap-1 text-[10px] font-bold tracking-tight ${kpi.up ? 'text-green-500' : 'text-neutral-300'}`}>
                {kpi.up ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />} {kpi.trend}
              </div>
            </div>
            <p className="text-[10px] tracking-[.3em] text-neutral-400 uppercase mb-1 font-bold">{kpi.label}</p>
            <h3 className="text-3xl font-bold tracking-tighter">{kpi.value}</h3>
          </motion.div>
        ))}
      </div>

      {/* MAIN CHART */}
      <div className="bg-white border border-neutral-100 rounded-[3rem] p-10 shadow-sm overflow-hidden">
        <div className="flex justify-between items-center mb-12">
           <h3 className="text-sm font-bold tracking-widest uppercase flex items-center gap-3">
              <BarChart3 size={18} className="text-neutral-300" /> Interaction Trends
           </h3>
           <div className="flex gap-6 items-center">
              <div className="flex items-center gap-2">
                 <div className="w-3 h-3 rounded-full bg-black"></div>
                 <span className="text-[9px] font-bold tracking-widest text-neutral-400 uppercase">VISITORS</span>
              </div>
              <div className="flex items-center gap-2">
                 <div className="w-3 h-3 rounded-full bg-cyan-400"></div>
                 <span className="text-[9px] font-bold tracking-widest text-neutral-400 uppercase">ORDERS</span>
              </div>
           </div>
        </div>

        <div className="h-80 w-full mb-4">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={last30}>
              <defs>
                <linearGradient id="colorVisits" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#000" stopOpacity={0.05}/>
                  <stop offset="95%" stopColor="#000" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorOrders" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.1}/>
                  <stop offset="95%" stopColor="#22d3ee" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
              <XAxis 
                dataKey="date" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 9, fill: '#aaa', fontWeight: 600 }}
                tickFormatter={(str) => new Date(str).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 9, fill: '#aaa', fontWeight: 600 }} 
              />
              <Tooltip 
                contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)', fontSize: '10px', fontStyle: 'bold' }}
                cursor={{ stroke: '#000', strokeWidth: 1 }}
              />
              <Area 
                type="monotone" 
                dataKey="visits" 
                name="Visitors"
                stroke="#000" 
                strokeWidth={3}
                fillOpacity={1} 
                fill="url(#colorVisits)" 
              />
              <Area 
                type="monotone" 
                dataKey="orders" 
                name="Orders"
                stroke="#22d3ee" 
                strokeWidth={3}
                fillOpacity={1} 
                fill="url(#colorOrders)" 
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* PERFORMANCE TABLES */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Top Sellers */}
        <div className="bg-white border border-neutral-100 rounded-[2.5rem] p-10 overflow-hidden shadow-sm">
           <h3 className="text-[10px] tracking-[.4em] text-neutral-400 uppercase mb-10 border-b border-neutral-50 pb-4 flex justify-between">
              Top Sellers <button className="hover:text-black">SEE ALL →</button>
           </h3>
           <div className="space-y-6">
              {data?.topSellers?.length > 0 ? (
                data.topSellers.map((item: any) => (
                  <div key={item.id} className="flex items-center justify-between group">
                    <div className="flex items-center gap-4">
                       <div className="w-10 h-14 bg-neutral-100 overflow-hidden rounded-lg grayscale group-hover:grayscale-0 transition-all">
                          <img src={item.photoUrl} className="w-full h-full object-cover" />
                       </div>
                       <div>
                          <p className="text-[11px] font-bold tracking-tight uppercase">{item.title}</p>
                          <p className="text-[9px] text-neutral-400 tracking-widest mt-0.5">{item.sold} SOLD</p>
                       </div>
                    </div>
                    <div className="text-right">
                       <p className="text-xs font-bold font-mono">CA${item.revenue.toLocaleString()}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-20 text-center text-neutral-300 text-[10px] tracking-widest uppercase italic">The archive is silent.</div>
              )}
           </div>
        </div>

        {/* Top Categories Placeholder */}
        <div className="bg-white border border-neutral-100 rounded-[2.5rem] p-10 overflow-hidden shadow-sm">
           <h3 className="text-[10px] tracking-[.4em] text-neutral-400 uppercase mb-10 border-b border-neutral-50 pb-4">Top Categories</h3>
           <div className="space-y-6">
              {[
                { name: "Publicatons", views: "3,496", sold: 65, rev: "1,825.00" },
                { name: "Ephemera", views: "1,102", sold: 12, rev: "450.00" }
              ].map((cat) => (
                <div key={cat.name} className="flex items-center justify-between group">
                  <div className="flex items-center gap-4">
                     <div className="w-10 h-10 bg-neutral-50 rounded-2xl flex items-center justify-center">
                        <BarChart3 size={16} className="text-neutral-300" />
                     </div>
                     <div>
                        <p className="text-[11px] font-bold tracking-tight uppercase">{cat.name}</p>
                        <p className="text-[9px] text-neutral-400 tracking-widest mt-0.5">{cat.views} VIEWS</p>
                     </div>
                  </div>
                  <div className="text-right">
                     <p className="text-xs font-bold font-mono">CA${cat.rev}</p>
                     <p className="text-[9px] text-neutral-400 font-bold uppercase tracking-widest">{cat.sold} SOLD</p>
                  </div>
                </div>
              ))}
           </div>
        </div>
      </div>
    </div>
  );
}
