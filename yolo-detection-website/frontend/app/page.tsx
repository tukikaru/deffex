"use client";
import { useState, useEffect } from "react";
import { detectImage, getCounters, resetCounters } from "@/lib/api";

type Counters = Record<string, { good: number; bad: number }>;

export default function Dashboard() {
  const [counters, setCounters] = useState<Counters>({});
  const [detections, setDetections] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  // Ambil counter saat halaman load
  useEffect(() => {
    getCounters().then(setCounters);
  }, []);

  // Hitung total
  const totalGood = Object.values(counters).reduce((s, c) => s + c.good, 0);
  const totalBad  = Object.values(counters).reduce((s, c) => s + c.bad, 0);
  const totalAll  = totalGood + totalBad;

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setPreview(URL.createObjectURL(file));
    setLoading(true);

    const result = await detectImage(file);
    setDetections(result.detections);
    setCounters(result.counters);
    setLoading(false);
  }

  async function handleReset() {
    await resetCounters();
    const fresh = await getCounters();
    setCounters(fresh);
    setDetections([]);
    setPreview(null);
  }

  return (
    <div className="flex min-h-screen" style={{ background: "#00171f" }}>
      {/* Sidebar */}
      <aside className="w-48 p-5" style={{ background: "#003459" }}>
        <div className="text-white font-bold tracking-widest mb-1">YOLO</div>
        <div className="text-xs mb-6" style={{ color: "#5fb3d4" }}>DEFECT DETECTION</div>
        {["Dashboard", "Detection", "Products", "History"].map((item, i) => (
          <div key={i} className={`py-2 px-3 text-xs tracking-widest mb-1 rounded cursor-pointer
            ${i === 0 ? "text-white border-l-2 border-sky-400" : "text-slate-400"}`}
            style={i === 0 ? { background: "#004a7c" } : {}}>
            {item.toUpperCase()}
          </div>
        ))}
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-white tracking-widest text-lg">PRODUCTION MONITOR</h1>
          <div className="flex gap-2">
            <span className="text-xs px-3 py-1 rounded border text-green-400 border-sky-600"
              style={{ background: "#003459" }}>
              ● LIVE
            </span>
            <button onClick={handleReset}
              className="text-xs px-3 py-1 rounded border text-red-400 border-red-700"
              style={{ background: "#003459" }}>
              RESET
            </button>
          </div>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-4 gap-3 mb-6">
          {[
            { label: "TOTAL SCANNED", value: totalAll,  color: "white" },
            { label: "GOOD PRODUCTS", value: totalGood, color: "#00ff88" },
            { label: "BAD / DEFECT",  value: totalBad,  color: "#ff4d4d" },
            { label: "GOOD RATE", value: totalAll ? Math.round(totalGood / totalAll * 100) + "%" : "—", color: "#00a8e8" },
          ].map((s, i) => (
            <div key={i} className="p-4 rounded-lg border"
              style={{ background: "#003459", borderColor: "#004a7c" }}>
              <div className="text-xs tracking-widest mb-2" style={{ color: "#5fb3d4" }}>{s.label}</div>
              <div className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Detection + Counter */}
        <div className="grid grid-cols-2 gap-4">
          {/* Upload & Preview */}
          <div className="p-4 rounded-lg border" style={{ background: "#003459", borderColor: "#004a7c" }}>
            <div className="text-xs tracking-widest mb-3" style={{ color: "#5fb3d4" }}>DETECTION INPUT</div>
            <label className="block w-full aspect-video border-2 border-dashed rounded-lg
              flex items-center justify-center cursor-pointer mb-3 relative overflow-hidden"
              style={{ borderColor: "#004a7c", background: "#00171f" }}>
              {preview
                ? <img src={preview} className="w-full h-full object-cover" />
                : <span className="text-xs tracking-widest" style={{ color: "#5fb3d4" }}>
                    UPLOAD IMAGE / PHOTO
                  </span>
              }
              <input type="file" accept="image/*" className="hidden" onChange={handleUpload} />
            </label>
            {loading && <div className="text-xs text-sky-400 tracking-widest">DETECTING...</div>}
            {detections.map((d, i) => (
              <div key={i} className="flex justify-between text-xs py-1 border-b"
                style={{ borderColor: "#004a7c", color: d.label === "good" ? "#00ff88" : "#ff4d4d" }}>
                <span>{d.product}</span>
                <span>{d.label.toUpperCase()} {d.confidence}%</span>
              </div>
            ))}
          </div>

          {/* Product Counter */}
          <div className="p-4 rounded-lg border" style={{ background: "#003459", borderColor: "#004a7c" }}>
            <div className="text-xs tracking-widest mb-3" style={{ color: "#5fb3d4" }}>PRODUCT COUNTERS</div>
            <div className="flex flex-col gap-2">
              {Object.entries(counters).map(([name, count]) => (
                <div key={name} className="flex items-center justify-between p-3 rounded-lg"
                  style={{ background: "#00171f", borderLeft: "3px solid #004a7c" }}>
                  <span className="text-xs tracking-widest" style={{ color: "#8ab4c9" }}>{name.toUpperCase()}</span>
                  <div className="flex gap-2">
                    <span className="text-xs px-2 py-1 rounded font-bold"
                      style={{ background: "#003320", color: "#00ff88" }}>✓ {count.good}</span>
                    <span className="text-xs px-2 py-1 rounded font-bold"
                      style={{ background: "#330a0a", color: "#ff4d4d" }}>✗ {count.bad}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}