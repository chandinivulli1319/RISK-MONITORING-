import { useState, useCallback } from "react";
import Login from "./login";
import Dashboard from "./dashboard";

export default function App() {
  const [auth, setAuth] = useState(() => {
    try { return JSON.parse(localStorage.getItem("auth")); } catch { return null; }
  });

  const handleLogin = (data) => {
    localStorage.setItem("auth", JSON.stringify(data));
    setAuth(data);
  };

  const handleLogout = useCallback(() => {
    localStorage.removeItem("auth");
    setAuth(null);
  }, []);

  if (!auth) return <Login onLogin={handleLogin} />;
  return <Dashboard token={auth.token} user={auth.user} onLogout={handleLogout} />;
}