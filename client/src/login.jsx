import { useState } from "react";
import { request } from "./api";

export default function Login({ onLogin }) {
  const [mode, setMode] = useState("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      if (mode === "register") {
        await request("/register", { method: "POST", body: { name, email, password } });
      }
      const data = await request("/login", { method: "POST", body: { email, password } });
      onLogin(data);
    } catch (err) {
      setError(err.message);
    }
    setBusy(false);
  }

  const input = "w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500";

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4">
      <form onSubmit={submit} className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-sm space-y-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">SiteSentinel</h1>
          <p className="text-sm text-slate-500">Construction risk monitoring</p>
        </div>

        {mode === "register" && (
          <input className={input} placeholder="Full name" value={name}
                 onChange={(e) => setName(e.target.value)} required />
        )}
        <input className={input} type="email" placeholder="Email" value={email}
               onChange={(e) => setEmail(e.target.value)} required />
        <input className={input} type="password" placeholder="Password" value={password}
               onChange={(e) => setPassword(e.target.value)} required />

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button disabled={busy}
                className="w-full bg-teal-600 hover:bg-teal-700 text-white font-medium rounded-lg py-2 disabled:opacity-60">
          {busy ? "Please wait..." : mode === "login" ? "Log in" : "Create account"}
        </button>

        <p className="text-sm text-center text-slate-500">
          {mode === "login" ? "New here? " : "Already have an account? "}
          <button type="button" className="text-teal-700 font-medium"
                  onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); }}>
            {mode === "login" ? "Create an account" : "Log in"}
          </button>
        </p>
      </form>
    </div>
  );
}