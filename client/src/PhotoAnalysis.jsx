import { useEffect, useState } from "react";
import { request, SERVER } from "./api";

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

const card = "bg-white rounded-xl shadow-sm border border-slate-200 p-5";

// A separate tab: upload a photo, get the model's detections and a score from that photo alone.
export default function PhotoAnalysis({ token, siteId, onSaved, onAuthError }) {
  const [photo, setPhoto] = useState(null);
  const [preview, setPreview] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!photo) { setPreview(""); return undefined; }
    const url = URL.createObjectURL(photo);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [photo]);

  async function analyze() {
    setLoading(true);
    setError("");
    try {
      const form = new FormData();
      form.append("site_id", siteId);
      form.append("photo", photo);
      const data = await request("/analyze-photo", { method: "POST", token, body: form });
      setResult(data);
      if (onSaved) onSaved();
    } catch (e) {
      if (/token|Login required/i.test(e.message)) onAuthError();
      else setError(e.message);
    }
    setLoading(false);
  }

  const d = result && result.detection;
  const tiles = d
    ? [
        ["Workers", d.people, false],
        ["Helmets", d.helmets, false],
        ["Vests", d.vests, false],
        ["No helmet", d.no_helmet, true],
        ["No gloves", d.no_gloves, true],
        ["No goggles", d.no_goggle, true],
        ["No boots", d.no_boots, true],
      ]
    : [];

  return (
    <div className="grid md:grid-cols-3 gap-6">
      <div className={`${card} space-y-4`}>
        <h2 className="font-semibold">Upload a site photo</h2>
        <p className="text-sm text-slate-600">
          The trained model counts workers and checks for helmets, vests, gloves, goggles and boots.
          This result comes from the photo alone, separate from the Analyze tab.
        </p>
        <input type="file" accept="image/jpeg,image/png,image/webp" aria-label="Site photo"
               className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
               onChange={(e) => setPhoto(e.target.files[0] || null)} />
        {preview && <img src={preview} alt="Selected site" className="w-full rounded-lg border border-slate-200" />}
        <button onClick={analyze} disabled={loading || !photo || !siteId}
                className="w-full bg-teal-600 hover:bg-teal-700 text-white font-medium rounded-lg py-2 disabled:opacity-60">
          {loading ? "Analyzing photo..." : "Analyze photo"}
        </button>
        {loading && <p className="text-xs text-slate-500">The first photo can take a little longer while the model loads.</p>}
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>

      <div className="md:col-span-2 space-y-6">
        {!result && (
          <div className={`${card} text-sm text-slate-500`}>
            Choose a photo and click Analyze photo. The detections, risk score and recommended actions appear here.
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
                  Based only on what is visible in the photo. Equipment faults and weather are covered in the Analyze tab.
                </p>
                {result.emailSent && <p className="text-sm text-green-700">Alert email sent.</p>}
              </div>
            </div>

            <div className={card}>
              <h3 className="font-semibold mb-3">What the model saw</h3>
              <div className="grid md:grid-cols-2 gap-4 items-start">
                <img src={`${SERVER}${result.annotated_url}`} alt="Photo with detections marked"
                     className="w-full rounded-lg border border-slate-200" />
                <div>
                  <div className="grid grid-cols-2 gap-2">
                    {tiles.map(([label, count, isViolation]) => (
                      <div key={label}
                           className={`rounded-lg border p-3 ${isViolation && count > 0 ? "border-red-200 bg-red-50" : "border-slate-200 bg-slate-50"}`}>
                        <div className={`text-2xl font-bold ${isViolation && count > 0 ? "text-red-700" : ""}`}>{count}</div>
                        <div className="text-xs text-slate-600">{label}</div>
                      </div>
                    ))}
                  </div>
                  {d.people === 0 && (
                    <p className="text-sm text-slate-500 mt-3">
                      No workers were detected. Try a clearer photo where people are closer to the camera.
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className={card}>
                <h3 className="font-semibold mb-2">Violations found ({result.hazards.length})</h3>
                {result.hazards.length === 0 ? (
                  <p className="text-sm text-slate-500">No missing protective equipment was detected.</p>
                ) : (
                  <table className="w-full text-sm">
                    <tbody>
                      {result.hazards.map((h, i) => (
                        <tr key={i} className="border-b last:border-0">
                          <td className="py-2">{h.description}</td>
                          <td className={`font-medium uppercase ${sevColor[h.severity]}`}>{h.severity}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
              <div className={card}>
                <h3 className="font-semibold mb-2">Recommended actions</h3>
                <ul className="list-disc ml-5 text-sm space-y-2 text-slate-700">
                  {result.recommendations.map((r, i) => <li key={i}>{r}</li>)}
                </ul>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
