import { useEffect, useState, useCallback } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid,
} from "recharts";
import { request, SERVER } from "./api";
import PhotoAnalysis from "./PhotoAnalysis";
import Profile from "./Profile";

const levelBadge = {
  Low: "bg-green-100 text-green-800",
  Medium: "bg-yellow-100 text-yellow-800",
  High: "bg-orange-100 text-orange-800",
  Critical: "bg-red-100 text-red-800",
};
const ringColor = {
  Low: "border-green-500", Medium: "border-yellow-500",
  High: "border-orange-500", Critical: "border-red-600",
};
const sevColor = {
  low: "text-green-700", medium: "text-yellow-700",
  high: "text-orange-700", critical: "text-red-700",
};

const TABS = [
  ["analyze", "Analyze"],
  ["photo", "Photo analysis"],
  ["history", "History"],
  ["alerts", "Alerts"],
  ["profile", "Profile"],
];
const NEEDS_SITE = ["analyze", "photo", "history"];

export default function Dashboard({ token, user, onLogout }) {
  const [me, setMe] = useState(user);              // updated when the profile is saved
  const [tab, setTab] = useState("analyze");
  const [sites, setSites] = useState([]);
  const [siteId, setSiteId] = useState("");
  const [helmets, setHelmets] = useState(0);
  const [equipment, setEquipment] = useState("");
  const [incidents, setIncidents] = useState("");
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fail = useCallback((e) => {
    if (/token|Login required/i.test(e.message)) onLogout();
    else setError(e.message);
  }, [onLogout]);

  const loadAlerts = useCallback(async () => {
    try { setAlerts(await request("/alerts", { token })); } catch (e) { fail(e); }
  }, [token, fail]);

  const loadHistory = useCallback(async (id) => {
    if (!id) return;
    try { setHistory(await request(`/sites/${id}/history`, { token })); } catch (e) { fail(e); }
  }, [token, fail]);

  useEffect(() => {
    (async () => {
      try {
        const s = await request("/sites", { token });
        setSites(s);
        if (s.length) setSiteId(String(s[0].id));
      } catch (e) { fail(e); }
    })();
    loadAlerts();
  }, [token, fail, loadAlerts]);

  useEffect(() => { loadHistory(siteId); }, [siteId, loadHistory]);

  const lines = (text) => text.split("\n").map((s) => s.trim()).filter(Boolean);

  async function analyze() {
    setLoading(true);
    setError("");
    try {
      const data = await request(`/analyze/${siteId}`, {
        method: "POST",
        token,
        body: {
          workers_without_helmet: Number(helmets) || 0,
          faulty_equipment: lines(equipment),
          open_incidents: lines(incidents),
        },
      });
      setResult(data);
      loadHistory(siteId);
      loadAlerts();
    } catch (e) { fail(e); }
    setLoading(false);
  }

  const breakdownData = result
    ? Object.entries(result.breakdown).map(([name, value]) => ({ name: name.replace("_", " "), value }))
    : [];
  const historyData = [...history].reverse().map((h, i) => ({ n: i + 1, score: h.score }));

  const field = "w-full border border-slate-300 rounded-lg px-3 py-2 text-sm";
  const card = "bg-white rounded-xl shadow-sm border border-slate-200 p-5";

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="bg-slate-900 text-white px-6 py-3 flex items-center justify-between">
        <div className="font-bold text-lg">SiteSentinel</div>
        <div className="flex items-center gap-4 text-sm">
          <button onClick={() => setTab("profile")} className="text-slate-200 hover:text-white hover:underline">
            {me.name}
          </button>
          <button onClick={onLogout} className="bg-slate-700 hover:bg-slate-600 px-3 py-1 rounded">Log out</button>
        </div>
      </header>

      <nav className="bg-white border-b border-slate-200 px-6 flex gap-6 overflow-x-auto" aria-label="Sections">
        {TABS.map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)} aria-current={tab === id ? "page" : undefined}
                  className={`py-3 text-sm font-medium whitespace-nowrap border-b-2 ${
                    tab === id ? "border-teal-600 text-teal-700" : "border-transparent text-slate-500"}`}>
            {id === "alerts" ? `Alerts (${alerts.length})` : label}
          </button>
        ))}
      </nav>

      <main className="p-6 max-w-6xl mx-auto space-y-6">
        {error && <div className="bg-red-50 text-red-700 border border-red-200 rounded-lg p-3 text-sm">{error}</div>}

        {NEEDS_SITE.includes(tab) && (
          <div className="flex items-center gap-3">
            <label htmlFor="site" className="text-sm text-slate-600">Site</label>
            <select id="site" className="border border-slate-300 rounded-lg px-3 py-2 bg-white text-sm"
                    value={siteId} onChange={(e) => setSiteId(e.target.value)}>
              {sites.map((s) => <option key={s.id} value={s.id}>{s.name} - {s.location}</option>)}
            </select>
          </div>
        )}

        {tab === "analyze" && (
          <div className="grid md:grid-cols-3 gap-6">
            <div className={`${card} space-y-4`}>
              <h2 className="font-semibold">Site observations</h2>
              <div>
                <label className="text-sm text-slate-600" htmlFor="helmets">Workers without helmets</label>
                <input id="helmets" type="number" min="0" className={field} value={helmets}
                       onChange={(e) => setHelmets(e.target.value)} />
              </div>
              <div>
                <label className="text-sm text-slate-600" htmlFor="equipment">Faulty equipment (one per line)</label>
                <textarea id="equipment" rows="3" className={field} value={equipment}
                          onChange={(e) => setEquipment(e.target.value)} />
              </div>
              <div>
                <label className="text-sm text-slate-600" htmlFor="incidents">Open incidents (one per line)</label>
                <textarea id="incidents" rows="3" className={field} value={incidents}
                          onChange={(e) => setIncidents(e.target.value)} />
              </div>
              <button onClick={analyze} disabled={loading || !siteId}
                      className="w-full bg-teal-600 hover:bg-teal-700 text-white font-medium rounded-lg py-2 disabled:opacity-60">
                {loading ? "Analyzing..." : "Run risk analysis"}
              </button>
            </div>

            <div className="md:col-span-2 space-y-6">
              {!result && (
                <div className={`${card} text-slate-500 text-sm`}>
                  Enter the site observations and run the analysis to see the risk score here.
                  To analyze a photo instead, use the Photo analysis tab.
                </div>
              )}

              {result && (
                <>
                  <div className={`${card} flex items-center gap-6`}>
                    <div className={`w-32 h-32 shrink-0 rounded-full border-8 flex flex-col items-center justify-center ${ringColor[result.level]}`}>
                      <span className="text-4xl font-bold">{result.score}</span>
                      <span className="text-xs text-slate-500">of 100</span>
                    </div>
                    <div className="space-y-2">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${levelBadge[result.level]}`}>
                        {result.level} risk
                      </span>
                      <p className="text-sm text-slate-600">
                        {result.weather.temperature}&deg;C, wind {result.weather.wind_speed} km/h,
                        rain {result.weather.precipitation} mm
                      </p>
                      {result.emailSent && <p className="text-sm text-green-700">Alert email sent.</p>}
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                    <div className={card}>
                      <h3 className="font-semibold mb-2">Risk by category (%)</h3>
                      <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={breakdownData}>
                          <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                          <YAxis />
                          <Tooltip />
                          <Bar dataKey="value" fill="#0d9488" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    <div className={card}>
                      <h3 className="font-semibold mb-2">Recommended actions</h3>
                      <ul className="list-disc ml-5 text-sm space-y-2 text-slate-700">
                        {result.recommendations.map((r, i) => <li key={i}>{r}</li>)}
                      </ul>
                    </div>
                  </div>

                  <div className={`${card} overflow-x-auto`}>
                    <h3 className="font-semibold mb-3">Detected hazards ({result.hazards.length})</h3>
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-slate-500 border-b">
                          <th className="py-2">Hazard</th><th>Category</th><th>Severity</th><th>Risk</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.hazards.map((h, i) => (
                          <tr key={i} className="border-b last:border-0">
                            <td className="py-2">{h.description}</td>
                            <td className="text-slate-500">{h.category.replace("_", " ")}</td>
                            <td className={`font-medium uppercase ${sevColor[h.severity]}`}>{h.severity}</td>
                            <td>{h.risk}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {tab === "photo" && (
          <PhotoAnalysis
            token={token}
            siteId={siteId}
            onSaved={() => { loadHistory(siteId); loadAlerts(); }}
            onAuthError={onLogout}
          />
        )}

        {tab === "history" && (
          <div className="space-y-6">
            <div className={card}>
              <h2 className="font-semibold mb-2">Risk score over time</h2>
              {historyData.length === 0 ? (
                <p className="text-sm text-slate-500">No analyses yet for this site.</p>
              ) : (
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={historyData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="n" label={{ value: "Analysis #", position: "insideBottom", offset: -2 }} />
                    <YAxis domain={[0, 100]} />
                    <Tooltip />
                    <Line type="monotone" dataKey="score" stroke="#0d9488" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
            <div className={`${card} overflow-x-auto`}>
              <h2 className="font-semibold mb-3">Past analyses</h2>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-500 border-b">
                    <th className="py-2">Date</th><th>Score</th><th>Level</th><th>Type</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((h) => (
                    <tr key={h.id} className="border-b last:border-0">
                      <td className="py-2">{new Date(h.created_at).toLocaleString()}</td>
                      <td>{h.score}</td>
                      <td><span className={`px-2 py-0.5 rounded-full text-xs ${levelBadge[h.level]}`}>{h.level}</span></td>
                      <td>
                        {h.image_path
                          ? <a className="text-teal-700 underline" href={`${SERVER}${h.image_path}`} target="_blank" rel="noreferrer">Photo</a>
                          : <span className="text-slate-500">Typed details</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === "alerts" && (
          <div className={card}>
            <h2 className="font-semibold mb-3">Safety alerts</h2>
            {alerts.length === 0 && <p className="text-sm text-slate-500">No alerts yet.</p>}
            <ul className="space-y-2">
              {alerts.map((a) => (
                <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 border border-slate-200 rounded-lg p-3 text-sm">
                  <span>{a.message}</span>
                  <span className="text-slate-400">
                    {a.email_sent ? "Email sent, " : "No email, "}
                    {new Date(a.created_at).toLocaleString()}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {tab === "profile" && (
          <Profile token={token} user={me} onUpdated={setMe} onAuthError={onLogout} />
        )}
      </main>
    </div>
  );
}
