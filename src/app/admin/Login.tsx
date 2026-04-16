import { useState } from "react";
import { motion } from "framer-motion";
import { Lock, ArrowRight, Settings } from "lucide-react";
import { adminApi } from "./api";

interface LoginProps {
  onLogin: (token: string) => void;
}

export function Login({ onLogin }: LoginProps) {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError("");
    try {
      const { token } = await adminApi.login();
      localStorage.setItem("adminToken", token);
      onLogin(token);
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

        <div className="bg-neutral-900/50 backdrop-blur-xl p-10 rounded-3xl border border-white/5 shadow-2xl">
          <div className="mb-8 text-center">
            <label className="block text-[10px] tracking-[.2em] text-white/40 uppercase mb-8">Identity Verification Required</label>
            
            <button
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full bg-white text-black rounded-2xl py-4 flex items-center justify-center gap-4 text-[10px] tracking-[0.3em] font-bold hover:bg-neutral-200 transition-all disabled:opacity-50"
            >
              {loading ? (
                "AUTHENTICATING..."
              ) : (
                <>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 12-4.53z" fill="#EA4335"/>
                  </svg>
                  SIGN IN WITH GOOGLE
                </>
              )}
            </button>

            {error && <p className="text-red-400 text-[10px] mt-6 tracking-wider uppercase">{error}</p>}
          </div>
        </div>

        <div className="mt-12 text-center">
          <p className="text-white/20 text-[9px] tracking-[0.3em] uppercase">Private System — Authorized Access Only</p>
        </div>
      </motion.div>
    </div>
  );
}
