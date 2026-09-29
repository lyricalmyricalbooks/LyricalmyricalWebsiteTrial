import { useState } from "react";
import { BookOpen } from "lucide-react";
import { adminApi } from "./api";
import { PrimaryButton } from "./riso/components";

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
    <div className="rp">
      <main className="rp-login">
        <div className="rp-card rp-login-card">
          <div style={{ textAlign: "center", marginBottom: 28 }}>
            <span className="rp-brand-mark" style={{ margin: "0 auto 16px", width: 52, height: 52 }}><BookOpen size={24} aria-hidden /></span>
            <h1 className="rp-page-title" style={{ fontSize: "2.5rem" }}>Lyrical<span style={{ color: "var(--rp-primary)" }}>myrical</span></h1>
            <p className="rp-wordmark-sub">Publishing House · Admin</p>
          </div>
          <p className="rp-card-desc" style={{ textAlign: "center", marginBottom: 20 }}>
            Sign in with the authorized administrator Google account.
          </p>
          <PrimaryButton onClick={handleGoogleLogin} disabled={loading} style={{ width: "100%" }}>
            {loading ? "Authenticating…" : "Sign in with Google"}
          </PrimaryButton>
          {error && <p role="alert" className="rp-error-text" style={{ marginTop: 16, textAlign: "center" }}>{error}</p>}
          <p className="rp-hint" style={{ marginTop: 24, textAlign: "center" }}>Private system — authorized access only</p>
        </div>
      </main>
    </div>
  );
}
