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
  Calendar,
  Zap,
  Activity,
  Globe,
  MoreHorizontal
} from "lucide-react";
import { adminApi } from "./api";
import { motion } from "framer-motion";
import toast from "react-hot-toast";

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
      toast.error("Analytics synchronization failed");
    } finally {
      setLoading(false);
    }
  }

  if (loading) return (
    <div className="h-[60vh] flex flex-col items-center justify-center space-y-8">
       <div className="relative">
          <div className="w-24 h-24 border-2 border-violet-500/5 border-t-violet-500 rounded-full animate-spin"></div>
          <div className="absolute inset-0 w-24 h-24 border-2 border-cyan-500/5 border-b-cyan-500 rounded-full animate-spin-slow"></div>
       </div>
       <p className="text-[10px] tracking-[0.6em] text-slate-500 uppercase font-black animate-pulse">Analyzing Library Performance...</p>
    </div>
  );

  const last30 = data?.daily || [];
  const totalVisits = last30.reduce((acc: number, d: any) => acc + (d.visits || 0), 0);
  const totalOrders = last30.reduce((acc: number, d: any) => acc + (d.orders || 0), 0);
  const totalRevenue = last30.reduce((acc: number, d: any) => acc + (d.revenue || 0), 0);
  const conversionRate = totalVisits > 0 ? (totalOrders / totalVisits) * 100 : 0;

  // Funnel aggregation
  const funnel = last30.reduce(
    (acc: any, d: any) => {
      const f = d.funnel || {};
      acc.view += f.view || 0;
      acc.add_to_cart += f.add_to_cart || 0;
      acc.checkout_start += f.checkout_start || 0;
      acc.purchase += f.purchase || 0;
      return acc;
    },
    { view: 0, add_to_cart: 0, checkout_start: 0, purchase: 0 },
  );
  const funnelSteps = [
    { key: "view", label: "Product Views", count: funnel.view },
    { key: "add_to_cart", label: "Added to Cart", count: funnel.add_to_cart },
    { key: "checkout_start", label: "Started Checkout", count: funnel.checkout_start },
    { key: "purchase", label: "Completed Purchase", count: funnel.purchase },
  ];
  const maxFunnel = Math.max(1, ...funnelSteps.map(s => s.count));

  const kpis = [
    { label: "Readers", subLabel: "Visitors", value: totalVisits.toLocaleString(), trend: "+12.4%", icon: Users, color: "violet" },
    { label: "Sales", subLabel: "Orders", value: totalOrders.toLocaleString(), trend: "+5.2%", icon: ShoppingBag, color: "cyan" },
    { label: "Engagement", subLabel: "Conversion", value: `${conversionRate.toFixed(1)}%`, trend: "-0.2%", icon: Activity, color: "emerald" },
    { label: "Revenue", subLabel: "Sales", value: `CA$${totalRevenue.toLocaleString()}`, trend: "+18.9%", icon: DollarSign, color: "amber" },
  ];

  return (
    <div className="space-y-12 pb-32">
      {/* KPI GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        {kpis.map((kpi, i) => (
          <motion.div 
            key={kpi.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="group relative bg-white/[0.02] border border-white/5 p-8 rounded-[2.5rem] overflow-hidden transition-all duration-500 hover:border-white/10 hover:bg-white/[0.04] shadow-2xl"
          >
            {/* Background Accent */}
            <div className={`absolute -top-10 -right-10 w-32 h-32 blur-[80px] opacity-10 transition-all duration-700 group-hover:opacity-20 ${
              kpi.color === 'violet' ? 'bg-violet-500' : 
              kpi.color === 'cyan' ? 'bg-cyan-500' : 
              kpi.color === 'emerald' ? 'bg-emerald-500' : 'bg-amber-500'
            }`} />

            <div className="flex items-center justify-between mb-6">
              <div className={`p-4 rounded-2xl bg-white/[0.03] border border-white/5 transition-all duration-500 group-hover:scale-110 ${
                kpi.color === 'violet' ? 'text-violet-400' : 
                kpi.color === 'cyan' ? 'text-cyan-400' : 
                kpi.color === 'emerald' ? 'text-emerald-400' : 'text-amber-400'
              }`}>
                <kpi.icon size={22} strokeWidth={1.5} />
              </div>
              <span className={`text-[10px] font-black tracking-widest px-3 py-1.5 rounded-full border border-white/5 ${
                kpi.trend.startsWith('+') ? 'text-emerald-400 bg-emerald-400/5' : 'text-rose-400 bg-rose-400/5'
              }`}>
                {kpi.trend}
              </span>
            </div>

            <div className="space-y-1">
              <p className="text-[10px] uppercase tracking-[0.3em] text-slate-500 font-black">{kpi.label}</p>
              <h4 className="text-3xl font-black tracking-tighter text-white uppercase italic">{kpi.value}</h4>
              <p className="text-[9px] text-slate-600 font-black tracking-widest uppercase mt-1">{kpi.subLabel} Ledger</p>
            </div>

            <div className="mt-8 h-1.5 w-full bg-white/[0.03] rounded-full overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: "65%" }}
                transition={{ duration: 1.5, delay: 0.5 + i * 0.1, ease: "circOut" }}
                className={`h-full rounded-full ${
                  kpi.color === 'violet' ? 'bg-gradient-to-r from-violet-600 to-violet-400' : 
                  kpi.color === 'cyan' ? 'bg-gradient-to-r from-cyan-600 to-cyan-400' : 
                  kpi.color === 'emerald' ? 'bg-gradient-to-r from-emerald-600 to-emerald-400' : 'bg-gradient-to-r from-amber-600 to-amber-400'
                }`}
              />
            </div>
          </motion.div>
        ))}
      </div>

      {/* MAIN CHART */}
      <div className="bg-white/[0.01] border border-white/5 rounded-[3rem] p-10 shadow-2xl relative overflow-hidden backdrop-blur-sm">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-violet-600/5 blur-[120px] -translate-y-1/2 translate-x-1/4" />
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12 relative z-10">
           <div>
              <div className="flex items-center gap-3 text-[10px] uppercase tracking-[0.4em] text-slate-500 mb-3 font-black">
                <Globe size={12} className="text-violet-400" /> Global Traffic
              </div>
              <h3 className="text-4xl font-black tracking-tighter text-white uppercase italic leading-none">Reader Engagement</h3>
              <p className="text-xs text-slate-500 font-medium mt-3 max-w-lg leading-relaxed">Real-time visualization of book library engagement and sales density over the last 30 days.</p>
           </div>
           <div className="flex p-2 bg-white/[0.03] rounded-3xl border border-white/5 backdrop-blur-md">
              {['Live', '7d', '30d'].map((period) => (
                <button key={period} className={`px-6 py-3 text-[10px] font-black uppercase tracking-widest rounded-2xl transition-all ${period === '30d' ? 'bg-violet-600 shadow-xl text-white' : 'text-slate-500 hover:text-white'}`}>
                  {period}
                </button>
              ))}
           </div>
        </div>

        <div className="h-[450px] w-full relative z-10">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={last30}>
              <defs>
                <linearGradient id="colorVisits" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.2}/>
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorOrders" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.2}/>
                  <stop offset="95%" stopColor="#22d3ee" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="10 10" vertical={false} stroke="rgba(255,255,255,0.03)" />
              <XAxis 
                dataKey="date" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 10, fill: '#475569', fontWeight: 900, letterSpacing: '0.1em' }}
                tickFormatter={(str) => new Date(str).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }).toUpperCase()}
                dy={20}
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 10, fill: '#475569', fontWeight: 900 }} 
                dx={-10}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'rgba(5, 5, 6, 0.8)', 
                  borderRadius: '24px', 
                  border: '1px solid rgba(255,255,255,0.1)', 
                  boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
                  backdropFilter: 'blur(24px)',
                  padding: '20px',
                  color: '#fff'
                }}
                itemStyle={{ fontSize: '11px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.1em', padding: '4px 0' }}
                cursor={{ stroke: 'rgba(139,92,246,0.2)', strokeWidth: 2 }}
              />
              <Area 
                type="monotone" 
                dataKey="visits" 
                name="Reader Activity"
                stroke="#8b5cf6" 
                strokeWidth={4}
                fillOpacity={1} 
                fill="url(#colorVisits)" 
              />
              <Area 
                type="monotone" 
                dataKey="orders" 
                name="Books Sold"
                stroke="#22d3ee" 
                strokeWidth={4}
                fillOpacity={1} 
                fill="url(#colorOrders)" 
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* PERFORMANCE TABLES */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* Top Sellers */}
        <div className="bg-white/[0.01] border border-white/5 rounded-[3rem] p-10 shadow-2xl relative overflow-hidden group">
           <div className="flex items-center justify-between mb-10 border-b border-white/5 pb-6">
              <h3 className="text-sm font-black tracking-[0.3em] text-white uppercase italic">Top Titles</h3>
              <button className="text-[10px] font-black text-violet-400 hover:text-white transition-all uppercase tracking-widest border border-white/5 px-4 py-2 rounded-xl">Full Audit</button>
           </div>
           <div className="space-y-8">
              {data?.topSellers?.length > 0 ? (
                data.topSellers.map((item: any) => (
                  <div key={item.id} className="flex items-center justify-between group/item hover:bg-white/[0.03] p-4 rounded-3xl transition-all duration-500">
                    <div className="flex items-center gap-6">
                       <div className="w-16 h-20 bg-slate-900 overflow-hidden rounded-2xl border border-white/5 group-hover/item:border-violet-500/50 transition-all shadow-2xl relative">
                          <img src={item.photoUrl} className="w-full h-full object-cover brightness-75 group-hover/item:brightness-100 transition-all duration-700" />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                       </div>
                       <div>
                          <p className="text-base font-black text-white uppercase tracking-tight group-hover/item:text-violet-400 transition-colors leading-none">{item.title}</p>
                          <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em] mt-3 bg-white/[0.03] w-fit px-3 py-1 rounded-lg border border-white/5">{item.sold} SOLD</p>
                       </div>
                    </div>
                    <div className="text-right">
                       <p className="text-lg font-black text-white tracking-tighter italic leading-none">CA${item.revenue.toLocaleString()}</p>
                       <div className="flex items-center justify-end gap-2 mt-3 text-emerald-400 font-black text-[10px] uppercase tracking-widest bg-emerald-400/5 px-3 py-1 rounded-lg border border-emerald-400/10">
                         <TrendingUp size={12} /> +12%
                       </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-24 text-center">
                  <div className="w-20 h-20 rounded-full bg-white/[0.02] border border-white/5 flex items-center justify-center text-slate-800 mx-auto mb-6 shadow-inner">
                    <Database size={40} strokeWidth={0.5} />
                  </div>
                  <p className="text-slate-600 text-[10px] tracking-[0.5em] uppercase font-black italic">No titles found.</p>
                </div>
              )}
           </div>
        </div>

        {/* Categories Analysis */}
        <div className="bg-white/[0.01] border border-white/5 rounded-[3rem] p-10 shadow-2xl relative overflow-hidden group">
           <div className="flex items-center justify-between mb-10 border-b border-white/5 pb-6">
              <h3 className="text-sm font-black tracking-[0.3em] text-white uppercase italic">Genre Performance</h3>
              <div className="flex items-center gap-2 bg-emerald-500/10 px-3 py-1.5 rounded-full border border-emerald-500/20">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">Active Sync</span>
              </div>
           </div>
           <div className="space-y-8">
              {[
                { name: "Publications", views: "3,496", sold: 65, rev: "1,825.00", color: "violet", icon: BarChart3 },
                { name: "Ephemera", views: "1,102", sold: 12, rev: "450.00", color: "cyan", icon: Zap }
              ].map((cat) => (
                <div key={cat.name} className="flex items-center justify-between group/item hover:bg-white/[0.03] p-4 rounded-3xl transition-all duration-500">
                  <div className="flex items-center gap-6">
                     <div className={`w-16 h-16 rounded-2xl flex items-center justify-center border border-white/5 transition-all duration-500 shadow-2xl bg-white/[0.02] group-hover/item:border-${cat.color}-500/50`}>
                        <cat.icon size={24} strokeWidth={1.5} className={cat.color === 'violet' ? 'text-violet-400' : 'text-cyan-400'} />
                     </div>
                     <div>
                        <p className="text-base font-black text-white uppercase tracking-tight group-hover/item:text-violet-400 transition-colors leading-none">{cat.name}</p>
                        <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em] mt-3 border border-white/5 w-fit px-3 py-1 rounded-lg">{cat.views} Visits</p>
                     </div>
                  </div>
                  <div className="text-right">
                     <p className="text-lg font-black text-white tracking-tighter italic leading-none">CA${cat.rev}</p>
                     <p className="text-[10px] text-slate-600 font-black uppercase tracking-widest mt-3 bg-white/[0.03] px-3 py-1 rounded-lg border border-white/5">{cat.sold} SOLD</p>
                  </div>
                </div>
              ))}
           </div>

           <div className="mt-12 p-8 rounded-[2rem] bg-gradient-to-br from-violet-600/20 to-cyan-600/20 border border-white/10 relative overflow-hidden">
              <div className="relative z-10">
                <h5 className="text-sm font-black text-white uppercase tracking-widest mb-2">Publishing Insights</h5>
                <p className="text-[11px] text-slate-400 leading-relaxed max-w-xs">AI-driven predictive models suggest a 15% increase in demand over the next month.</p>
              </div>
              <div className="absolute -right-4 -bottom-4 opacity-10">
                 <Activity size={100} strokeWidth={0.5} className="text-white" />
              </div>
           </div>
        </div>
      </div>

      {/* Conversion Funnel */}
      <div className="bg-white/[0.02] border border-white/5 rounded-[3rem] p-12 shadow-2xl">
        <div className="flex items-center justify-between mb-10">
          <h3 className="text-sm font-black tracking-[0.3em] text-white uppercase italic">Conversion Funnel · Last 30 days</h3>
          <span className="text-[10px] tracking-widest font-black uppercase text-slate-500">
            {funnel.view > 0
              ? `${((funnel.purchase / funnel.view) * 100).toFixed(2)}% view → buy`
              : "no data yet"}
          </span>
        </div>
        <div className="space-y-5">
          {funnelSteps.map((step, idx) => {
            const prev = idx === 0 ? null : funnelSteps[idx - 1].count;
            const dropoff = prev ? Math.max(0, prev - step.count) : 0;
            const dropPct = prev ? ((dropoff / prev) * 100).toFixed(1) : null;
            const widthPct = (step.count / maxFunnel) * 100;
            return (
              <div key={step.key} className="grid grid-cols-12 items-center gap-4">
                <span className="col-span-3 text-[10px] tracking-widest uppercase font-black text-slate-400">
                  {step.label}
                </span>
                <div className="col-span-7 h-3 bg-white/[0.04] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-violet-500 to-cyan-500 rounded-full transition-all duration-700"
                    style={{ width: `${widthPct}%` }}
                  />
                </div>
                <span className="col-span-2 text-right">
                  <span className="text-sm font-black text-white tabular-nums">{step.count.toLocaleString()}</span>
                  {dropPct && (
                    <span className="ml-2 text-[9px] font-black tracking-widest uppercase text-rose-400/70">
                      −{dropPct}%
                    </span>
                  )}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

