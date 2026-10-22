import { useState, useCallback } from "react";
import Landing from "./Landing";
import Login from "./Login";
import Dashboard from "./Dashboard";

export default function App() {
  const [auth, setAuth] = useState(() => {
    try { return JSON.parse(localStorage.getItem("auth")); } catch { return null; }
  });
  const [screen, setScreen] = useState("landing");   // landing, login or register

  const handleLogin = (data) => {
    localStorage.setItem("auth", JSON.stringify(data));
    setAuth(data);
  };

  const handleLogout = useCallback(() => {
    localStorage.removeItem("auth");
    setAuth(null);
    setScreen("landing");
  }, []);

  if (auth) return <Dashboard token={auth.token} user={auth.user} onLogout={handleLogout} />;

  if (screen === "landing") {
    return <Landing onLogin={() => setScreen("login")} onRegister={() => setScreen("register")} />;
  }

  return (
    <Login
      initialMode={screen === "register" ? "register" : "login"}
      onLogin={handleLogin}
      onBack={() => setScreen("landing")}
    />
  );
}
