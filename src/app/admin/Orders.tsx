import { useState, useEffect } from "react";
import { Search, Grid, List as ListIcon, ChevronRight, Package, DollarSign } from "lucide-react";
import { adminApi } from "./api";
import { motion } from "motion/react";

export function Orders({ onSelectOrder }: { onSelectOrder: (order: any) => void }) {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("Open");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    loadOrders();
  }, []);

  async function loadOrders() {
    try {
      const data = await adminApi.getOrders();
      setOrders(data);
    } catch (err) {
      console.error("Failed to load orders", err);
    } finally {
      setLoading(false);
    }
  }

  const filteredOrders = orders.filter(o => {
    const matchesTab = 
      activeTab === "All orders" || 
      (activeTab === "Open" && o.status === "open") ||
      (activeTab === "Completed" && o.status === "completed");
    
    const matchesSearch = 
      o.orderId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.customer?.name?.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesTab && matchesSearch;
  });

  return (
    <div className="space-y-8">
      <header className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-light tracking-tight">Orders</h2>
          <p className="text-[10px] tracking-widest text-neutral-400 uppercase mt-1">Fulfillment & Sales Tracking</p>
        </div>
        <button className="flex items-center gap-2 border border-neutral-200 bg-white px-6 py-2.5 rounded-full text-[10px] tracking-[.3em] font-bold hover:bg-neutral-50 transition-all">
          EXPORT ORDERS
        </button>
      </header>

      <div className="flex flex-col md:flex-row gap-6 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-300" size={16} />
          <input 
            type="text"
            placeholder="Search Order ID or Customer..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white border border-neutral-100 rounded-2xl py-3 pl-12 pr-6 text-sm focus:ring-1 focus:ring-black outline-none transition-all"
          />
        </div>

        <div className="flex bg-white rounded-full p-1 border border-neutral-100">
           {["Open", "Completed", "All orders"].map(tab => (
             <button
               key={tab}
               onClick={() => setActiveTab(tab)}
               className={`px-6 py-2 rounded-full text-[10px] tracking-widest font-bold transition-all ${
                 activeTab === tab ? 'bg-black text-white shadow-lg' : 'text-neutral-400 hover:text-black'
               }`}
             >
               {tab.toUpperCase()}
             </button>
           ))}
        </div>
      </div>

      {loading ? (
        <div className="py-20 text-center text-neutral-400 text-[10px] tracking-[0.4em] animate-pulse uppercase">Accessing Order Registry...</div>
      ) : filteredOrders.length === 0 ? (
        <div className="py-32 flex flex-col items-center justify-center border-2 border-dashed border-neutral-100 rounded-[3rem] bg-neutral-50/50">
          <Package size={48} strokeWidth={1} className="text-neutral-200 mb-6" />
          <h3 className="text-xl font-light text-neutral-400 mb-2">No orders found</h3>
          <p className="text-[10px] tracking-widest text-neutral-400 uppercase mb-8">Wait for your first customer transaction</p>
          <button 
            onClick={async () => {
              const samples = [
                { name: "Patrick Kane", email: "patkanephoto@gmail.com", address: "5207 55 St, Yellowknife, NT X1A 1X4", total: 85, items: 1 },
                { name: "Selena PB", email: "selena.pb@example.com", address: "123 Main St, Toronto, ON M5V 1A1", total: 85, items: 1 },
                { name: "William Boland", email: "w.boland@example.com", address: "456 Oak Ave, Vancouver, BC V6B 1A1", total: 81, items: 1 }
              ];
              for (const s of samples) {
                await adminApi.createOrder({
                  customer: { name: s.name, email: s.email, address: { street: s.address, city: "", state: "", zip: "", country: "Canada" } },
                  items: [{ title: "[PRESALE] - The Hound by Ian Willms", price: s.total, quantity: s.items, photoUrl: "https://images.unsplash.com/photo-1544377193-33dcf4d68fb5?auto=format" }],
                  total: s.total, subtotal: s.total, shipping: 0, discount: 0,
                  paymentStatus: "paid", status: "open"
                });
              }
              loadOrders();
            }}
            className="bg-black text-white px-8 py-3 rounded-full text-[10px] tracking-[.3em] font-bold hover:scale-105 transition-all shadow-xl"
          >
            GENERATE SAMPLE ORDERS
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredOrders.map((order, i) => (
            <motion.div
              key={order.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => onSelectOrder(order)}
              className="bg-white border border-neutral-100 rounded-[2.5rem] overflow-hidden group cursor-pointer hover:shadow-2xl hover:-translate-y-1 transition-all duration-500"
            >
              <div className="aspect-[4/3] bg-neutral-100 relative overflow-hidden">
                <img 
                  src={order.items?.[0]?.photoUrl || "https://images.unsplash.com/photo-1544377193-33dcf4d68fb5?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwzfHxhYnN0cmFjdCUyMGJsYWNrJTIwYW5kJTIwd2hpdGUlMjBuYXR1cmUlMjB0ZXh0dXJlJTIwcGhvdG9ncmFwaHl8ZW58MXx8fHwxNzc1ODczMTk4fDA&ixlib=rb-4.1.0&q=80&w=1080"} 
                  className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700"
                />
                <div className="absolute top-4 right-4 flex gap-2">
                   <span className={`text-[8px] font-bold tracking-[.3em] px-3 py-1.5 rounded-full ${order.status === 'open' ? 'bg-yellow-400 text-black' : 'bg-green-500 text-white'}`}>
                     {order.status.toUpperCase()}
                   </span>
                </div>
              </div>
              <div className="p-8">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h4 className="text-lg font-bold tracking-tighter mb-1">{order.orderId}</h4>
                    <p className="text-[10px] text-neutral-400 tracking-widest">{new Date(order.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
                
                <div className="space-y-1">
                  <p className="text-xs font-semibold">{order.customer?.name}</p>
                  <p className="text-[10px] text-neutral-400 uppercase tracking-widest">
                    {order.items?.length || 0} ITEM{order.items?.length === 1 ? '' : 'S'} • ${order.total?.toFixed(2)}
                  </p>
                </div>

                <div className="mt-8 pt-6 border-t border-neutral-50 flex items-center justify-between">
                   <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${order.paymentStatus === 'paid' ? 'bg-green-500' : 'bg-red-500'} shadow-sm`}></div>
                      <span className="text-[9px] font-bold tracking-widest text-neutral-400 uppercase">PAID</span>
                   </div>
                   <ChevronRight size={14} className="text-neutral-200 group-hover:text-black group-hover:translate-x-1 transition-all" />
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
