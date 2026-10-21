import { useState } from "react";

// To show your demo: save the recording as client/public/demo.mp4
// or paste the id of an unlisted YouTube video (the part after "v=") below.
const DEMO_VIDEO = "/demo.mp4";
const YOUTUBE_ID = "";

const TAPE = "repeating-linear-gradient(-45deg, #F2C811 0 16px, #17212B 16px 32px)";

const steps = [
  {
    title: "Upload a site photo",
    text: "The detection model finds each worker and checks for helmets, vests, gloves, goggles and boots.",
  },
  {
    title: "The agent adds context",
    text: "It pulls in live weather, faulty equipment and open incidents for that site.",
  },
  {
    title: "Every hazard gets a rating",
    text: "Hazards are weighted by how severe, how likely and how many workers are exposed, then combined into one score from 0 to 100.",
  },
  {
    title: "Serious risk reaches you",
    text: "High and critical results are saved as alerts and emailed, so someone can act the same day.",
  },
];

const focus =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#17212B]";

export default function Landing({ onLogin, onRegister }) {
  const [videoFailed, setVideoFailed] = useState(false);

  return (
    <div className="min-h-screen bg-[#E9EBED] text-[#17212B] font-sans">
      <header className="max-w-6xl mx-auto px-5 py-4 flex items-center justify-between">
        <span className="font-display text-2xl font-bold tracking-tight">SiteSentinel</span>
        <nav className="flex items-center gap-2">
          <button
            onClick={onLogin}
            className={`px-4 py-2 text-sm font-semibold rounded-md hover:bg-black/5 ${focus}`}
          >
            Log in
          </button>
          <button
            onClick={onRegister}
            className={`px-4 py-2 text-sm font-semibold rounded-md bg-[#17212B] text-white hover:bg-[#2A3A4B] ${focus}`}
          >
            Create account
          </button>
        </nav>
      </header>

      <div aria-hidden="true" className="h-3.5 w-full" style={{ backgroundImage: TAPE }} />

      <section className="max-w-6xl mx-auto px-5 pt-14 pb-14 grid md:grid-cols-[1.35fr_1fr] gap-10 items-end">
        <h1 className="font-display text-5xl sm:text-6xl md:text-7xl font-bold leading-[0.95] tracking-tight">
          Catch site hazards before they become incidents.
        </h1>
        <div>
          <p className="text-lg leading-relaxed max-w-md">
            SiteSentinel reads site photos, weather and inspection notes, scores the risk from 0 to
            100, and emails you when it gets serious.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <a
              href="#demo"
              className={`px-5 py-3 rounded-md bg-[#F2C811] font-semibold hover:bg-[#FFD92E] ${focus}`}
            >
              Watch the demo
            </a>
            <button
              onClick={onLogin}
              className={`px-5 py-3 rounded-md border-2 border-[#17212B] font-semibold hover:bg-white ${focus}`}
            >
              Log in
            </button>
          </div>
        </div>
      </section>

      <section id="demo" className="max-w-6xl mx-auto px-5 pb-16 scroll-mt-6">
        <h2 className="font-display text-3xl sm:text-4xl font-bold mb-4">See a risk check from start to finish</h2>
        <div className="aspect-video w-full bg-[#17212B] border-4 border-[#17212B] rounded-md overflow-hidden">
          {YOUTUBE_ID ? (
            <iframe
              className="w-full h-full"
              src={`https://www.youtube.com/embed/${YOUTUBE_ID}`}
              title="SiteSentinel demo"
              allowFullScreen
            />
          ) : videoFailed ? (
            <div className="w-full h-full flex items-center justify-center text-white/80 px-6 text-center">
              Demo video coming soon.
            </div>
          ) : (
            <video
              className="w-full h-full"
              src={DEMO_VIDEO}
              controls
              preload="metadata"
              onError={() => setVideoFailed(true)}
            />
          )}
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-5 pb-16">
        <h2 className="font-display text-3xl sm:text-4xl font-bold mb-6">How a check works</h2>
        <ol className="grid sm:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-8">
          {steps.map((s, i) => (
            <li key={s.title} className="border-t-4 border-[#17212B] pt-4">
              <span className="font-display text-4xl font-bold text-[#17212B]/40">{i + 1}</span>
              <h3 className="font-semibold text-lg mt-1">{s.title}</h3>
              <p className="mt-2 leading-relaxed text-[#17212B]/80">{s.text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="bg-[#17212B] text-white">
        <div aria-hidden="true" className="h-3.5 w-full" style={{ backgroundImage: TAPE }} />
        <div className="max-w-6xl mx-auto px-5 py-12 flex flex-wrap items-center justify-between gap-6">
          <p className="font-display text-3xl sm:text-4xl font-bold max-w-xl leading-tight">
            Run your first risk check in under a minute.
          </p>
          <button
            onClick={onRegister}
            className="px-6 py-3 rounded-md bg-[#F2C811] text-[#17212B] font-semibold hover:bg-[#FFD92E] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            Create account
          </button>
        </div>
        <p className="max-w-6xl mx-auto px-5 pb-8 text-sm text-white/60">
          Built as Milestone 1 of the Agentic Construction Risk Intelligence Platform.
        </p>
      </section>
    </div>
  );
}
