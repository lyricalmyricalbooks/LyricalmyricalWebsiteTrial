import { useState } from "react";
import { motion } from "motion/react";
import { Lock, ArrowRight, Shovel } from "lucide-react";
import { adminApi } from "./api";

interface LoginProps {
  onLogin: (token: string) => void;
}

export function Login({ onLogin }: LoginProps) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const data = await adminApi.login(password);
      localStorage.setItem("adminToken", data.token);
      onLogin(data.token);
    } catch (err: any) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4 font-sans">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full"
      >
        <div className="text-center mb-12">
          <h1 className="text-4xl text-white tracking-[0.3em] font-light italic mb-2">F✶M</h1>
          <p className="text-[10px] tracking-[0.4em] text-white/40 uppercase">Internal Console</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-neutral-900/50 backdrop-blur-xl p-10 rounded-3xl border border-white/5 shadow-2xl">
          <div className="mb-8">
            <label className="block text-[10px] tracking-[.2em] text-white/40 uppercase mb-4">Secure Access Key</label>
            <div className="relative">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-black/40 border border-white/10 rounded-2xl py-4 px-6 text-white placeholder:text-white/10 focus:outline-none focus:border-white/30 transition-all tracking-widest"
                required
              />
              <div className="absolute right-4 top-1/2 -translate-y-1/2">
                <Lock size={16} className="text-white/10" />
              </div>
            </div>
            {error && <p className="text-red-400 text-[10px] mt-4 tracking-wider uppercase text-center">{error}</p>}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-white text-black rounded-2xl py-4 flex items-center justify-center gap-3 text-[10px] tracking-[0.3em] font-bold hover:bg-neutral-200 transition-all disabled:opacity-50"
          >
            {loading ? "AUTHENTICATING..." : "AUTHORIZE"}
            <ArrowRight size={14} />
          </button>
        </form>

        <div className="mt-12 text-center">
          <p className="text-white/20 text-[9px] tracking-[0.3em] uppercase">Private System — Authorized Access Only</p>
        </div>
      </motion.div>
    </div>
  );
}
