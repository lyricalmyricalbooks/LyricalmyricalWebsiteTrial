import { useState } from "react";
import { motion } from "motion/react";
import { BookOpen } from "lucide-react";
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
    <div className="admin-reso min-h-screen bg-[#f6f8fb] flex items-center justify-center p-4 font-sans text-[#10182d] relative overflow-hidden">
      <div className="absolute -top-40 -right-32 h-96 w-96 rounded-full bg-violet-200/40 blur-3xl" aria-hidden="true" />
      <div className="absolute -bottom-48 -left-28 h-96 w-96 rounded-full bg-cyan-100/60 blur-3xl" aria-hidden="true" />
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full"
      >
        <div className="text-center mb-12">
          <div className="mx-auto mb-6 h-14 w-14 rounded-2xl bg-[#6339f5] text-white shadow-[0_10px_30px_rgba(99,57,245,.3)] flex items-center justify-center"><BookOpen size={25} /></div>
          <h1 className="text-3xl tracking-[-0.04em] font-black italic uppercase mb-2">Lyrical <span className="text-[#6339f5]">Myrical</span></h1>
          <p className="text-[9px] tracking-[0.4em] text-[#526078] uppercase font-black">Publishing House · Admin</p>
        </div>

        <div className="bg-white p-10 rounded-[2.5rem] border border-[#dce3ee] shadow-[0_18px_60px_rgba(25,39,70,.08)]">
          <div className="mb-8 text-center">
            <label className="block text-[10px] tracking-[.2em] text-[#526078] uppercase mb-8 font-black">Identity verification required</label>
            
            <button
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full bg-[#6339f5] text-white rounded-2xl py-4 flex items-center justify-center gap-4 text-[10px] tracking-[0.25em] font-black hover:bg-[#5329e8] shadow-[0_10px_24px_rgba(99,57,245,.24)] transition-all disabled:opacity-50"
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
          <p className="text-[#78859a] text-[9px] tracking-[0.3em] uppercase font-bold">Private system — authorized access only</p>
        </div>
      </motion.div>
    </div>
  );
}
