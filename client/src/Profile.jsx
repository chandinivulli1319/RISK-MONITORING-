import { useEffect, useState } from "react";
import { request } from "./api";

const card = "bg-white rounded-xl shadow-sm border border-slate-200";
const field = "w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500";

const icon = (d) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
       strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg>
);
const BRIEFCASE = "M3 7h18v12H3z M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2";
const CALENDAR = "M4 6h16v14H4z M4 10h16 M8 3v4 M16 3v4";
const LOCK = "M6 11h12v9H6z M8 11V8a4 4 0 0 1 8 0v3";

// Profile page: an identity card on the left and the editable details on the right.
export default function Profile({ token, user, onUpdated, onAuthError }) {
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState({ name: "", email: "", job_title: "", phone: "" });
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  const fail = (e) => {
    if (/token|Login required/i.test(e.message)) onAuthError();
    else setError(e.message);
  };

  useEffect(() => {
    request("/profile", { token })
      .then((p) => {
        setProfile(p);
        setForm({ name: p.name, email: p.email, job_title: p.job_title || "", phone: p.phone || "" });
      })
      .catch(fail);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const set = (key) => (e) => { setForm({ ...form, [key]: e.target.value }); setSaved(false); };

  async function save(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      const p = await request("/profile", { method: "PUT", token, body: form });
      setProfile(p);
      setSaved(true);
      // keep the name in the header and after a page refresh
      try {
        const stored = JSON.parse(localStorage.getItem("auth"));
        if (stored) {
          stored.user = { ...stored.user, name: p.name, email: p.email };
          localStorage.setItem("auth", JSON.stringify(stored));
        }
      } catch (err) { /* ignore */ }
      if (onUpdated) onUpdated({ ...user, name: p.name, email: p.email });
    } catch (err) { fail(err); }
    setSaving(false);
  }

  if (!profile && error) return <div className="bg-red-50 text-red-700 border border-red-200 rounded-lg p-3 text-sm">{error}</div>;
  if (!profile) return <p className="text-sm text-slate-500">Loading...</p>;

  const joined = profile.created_at ? new Date(profile.created_at).toLocaleDateString() : "";

  return (
    <div>
      <p className="text-slate-600 mb-5">Manage your personal details and workspace identity.</p>
      <div className="grid md:grid-cols-5 gap-6">
        <div className={`${card} p-6 md:col-span-2`}>
          <div className="w-24 h-24 rounded-2xl bg-teal-100 text-teal-700 flex items-center justify-center text-4xl font-bold">
            {(profile.name || "?").charAt(0).toUpperCase()}
          </div>
          <h2 className="mt-4 text-2xl font-bold">{profile.name}</h2>
          <p className="text-slate-500 text-sm break-all">{profile.email}</p>
          <span className="inline-block mt-2 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-xs font-medium">User</span>

          <ul className="mt-5 pt-5 border-t border-slate-200 space-y-3 text-sm text-slate-600">
            <li className="flex items-center gap-3">{icon(BRIEFCASE)} {profile.job_title}</li>
            <li className="flex items-center gap-3">{icon(CALENDAR)} Joined {joined}</li>
            <li className="flex items-center gap-3">{icon(LOCK)} Secure JWT authentication</li>
          </ul>
        </div>

        <form onSubmit={save} className={`${card} p-6 md:col-span-3 space-y-4`}>
          <div>
            <h2 className="text-xl font-bold">Personal information</h2>
            <p className="text-sm text-slate-500">Keep your profile details up to date.</p>
          </div>
          <div>
            <label htmlFor="p-name" className="block text-sm font-medium text-slate-700 mb-1">Full name</label>
            <input id="p-name" className={field} value={form.name} onChange={set("name")} required maxLength={100} />
          </div>
          <div>
            <label htmlFor="p-email" className="block text-sm font-medium text-slate-700 mb-1">Email address</label>
            <input id="p-email" type="email" className={field} value={form.email} onChange={set("email")} required />
          </div>
          <div>
            <label htmlFor="p-job" className="block text-sm font-medium text-slate-700 mb-1">Job title</label>
            <input id="p-job" className={field} value={form.job_title} onChange={set("job_title")} maxLength={100} />
          </div>
          <div>
            <label htmlFor="p-phone" className="block text-sm font-medium text-slate-700 mb-1">Phone number</label>
            <input id="p-phone" type="tel" className={field} value={form.phone} onChange={set("phone")} maxLength={20} />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          {saved && <p className="text-sm text-green-700">Profile updated.</p>}
          <button disabled={saving}
                  className="bg-teal-600 hover:bg-teal-700 text-white font-medium rounded-lg px-5 py-2.5 disabled:opacity-60">
            {saving ? "Saving..." : "Save changes"}
          </button>
        </form>
      </div>
    </div>
  );
}
