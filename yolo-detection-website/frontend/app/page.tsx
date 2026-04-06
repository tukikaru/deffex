"use client";
import { useState, useEffect } from "react";

const BASE_URL = "http://localhost:8000";
type Counters = Record<string, { good: number; bad: number }>;

export default function Dashboard() {
  const [counters, setCounters] = useState<Counters>({});
  const [connected, setConnected] = useState(false);

  // Poll counter setiap 1 detik
  useEffect(() => {
    const fetchCounters = () => {
      fetch(`${BASE_URL}/counters`)
        .then((r) => r.json())
        .then((data) => {
          setCounters(data);
          setConnected(true);
        })
        .catch(() => setConnected(false));
    };

    fetchCounters();
    const interval = setInterval(fetchCounters, 1000);
    return () => clearInterval(interval);
  }, []);

  async function handleReset() {
    await fetch(`${BASE_URL}/reset`, { method: "POST" });
    const fresh = await fetch(`${BASE_URL}/counters`).then((r) => r.json());
    setCounters(fresh);
  }

  const totalGood = Object.values(counters).reduce((s, c) => s + c.good, 0);
  const totalBad = Object.values(counters).reduce((s, c) => s + c.bad, 0);
  const totalAll = totalGood + totalBad;

  return (
    <div className="flex min-h-screen" style={{ background: "#00171f" }}>
      {/* Sidebar */}
      <aside
        className="w-48 p-5 flex flex-col"
        style={{ background: "#003459" }}
      >
        <div className="text-white font-bold tracking-widest mb-1">YOLO</div>
        <div className="text-xs mb-6" style={{ color: "#5fb3d4" }}>
          DEFECT DETECTION
        </div>
        {["Dashboard", "Detection", "Products", "History"].map((item, i) => (
          <div
            key={i}
            className="py-2 px-3 text-xs tracking-widest mb-1 rounded cursor-pointer"
            style={
              i === 0
                ? {
                    background: "#004a7c",
                    color: "#fff",
                    borderLeft: "3px solid #00a8e8",
                  }
                : { color: "#5fb3d4" }
            }
          >
            {item.toUpperCase()}
          </div>
        ))}
        <div className="mt-auto">
          <div
            className="text-xs tracking-widest mb-1"
            style={{ color: "#5fb3d4" }}
          >
            BACKEND
          </div>
          <div
            className="text-xs font-bold"
            style={{ color: connected ? "#00ff88" : "#ff4d4d" }}
          >
            {connected ? "● CONNECTED" : "● OFFLINE"}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-6">
        {/* Topbar */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-white tracking-widest text-lg">
            PRODUCTION MONITOR
          </h1>
          <div className="flex gap-2">
            <span
              className="text-xs px-3 py-1 rounded border"
              style={{
                background: "#003459",
                borderColor: "#00a8e8",
                color: "#00ff88",
              }}
            >
              ● REAL-TIME DETECTION
            </span>
            <button
              onClick={handleReset}
              className="text-xs px-3 py-1 rounded border cursor-pointer"
              style={{
                background: "#003459",
                borderColor: "#ff4d4d",
                color: "#ff4d4d",
              }}
            >
              RESET
            </button>
          </div>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-4 gap-3 mb-6">
          {[
            { label: "TOTAL SCANNED", value: totalAll, color: "#ffffff" },
            { label: "GOOD PRODUCTS", value: totalGood, color: "#00ff88" },
            { label: "BAD / DEFECT", value: totalBad, color: "#ff4d4d" },
            {
              label: "GOOD RATE",
              value: totalAll
                ? Math.round((totalGood / totalAll) * 100) + "%"
                : "—",
              color: "#00a8e8",
            },
          ].map((s, i) => (
            <div
              key={i}
              className="p-4 rounded-lg border"
              style={{ background: "#003459", borderColor: "#004a7c" }}
            >
              <div
                className="text-xs tracking-widest mb-2"
                style={{ color: "#5fb3d4" }}
              >
                {s.label}
              </div>
              <div className="text-3xl font-bold" style={{ color: s.color }}>
                {s.value}
              </div>
            </div>
          ))}
        </div>

        {/* Stream + Counter */}
        <div className="grid grid-cols-2 gap-4">
          {/* Live Stream YOLO */}
          <div
            className="p-4 rounded-lg border"
            style={{ background: "#003459", borderColor: "#004a7c" }}
          >
            <div className="flex items-center justify-between mb-3">
              <div
                className="text-xs tracking-widest"
                style={{ color: "#5fb3d4" }}
              >
                LIVE CAMERA FEED
              </div>
              <span
                className="text-xs px-2 py-0.5 rounded"
                style={{ background: "#003320", color: "#00ff88" }}
              >
                AUTO DETECT
              </span>
            </div>

            {/* MJPEG Stream - langsung dari backend */}
            <div
              className="w-full rounded-lg overflow-hidden"
              style={{ background: "#00171f", border: "1px solid #004a7c" }}
            >
              {connected ? (
                <img
                  src={`${BASE_URL}/stream`}
                  alt="YOLO Live Stream"
                  className="w-full"
                  style={{ display: "block" }}
                />
              ) : (
                <div className="aspect-video flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-2xl mb-2" style={{ color: "#ff4d4d" }}>
                      ●
                    </div>
                    <div
                      className="text-xs tracking-widest"
                      style={{ color: "#5fb3d4" }}
                    >
                      BACKEND OFFLINE
                    </div>
                    <div className="text-xs mt-1" style={{ color: "#004a7c" }}>
                      Jalankan: python main.py
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Product Counter */}
          <div
            className="p-4 rounded-lg border"
            style={{ background: "#003459", borderColor: "#004a7c" }}
          >
            <div
              className="text-xs tracking-widest mb-4"
              style={{ color: "#5fb3d4" }}
            >
              PRODUCT COUNTERS
            </div>
            <div className="flex flex-col gap-3">
              {Object.entries(counters).map(([name, count]) => {
                const total = count.good + count.bad;
                const pct =
                  total > 0 ? Math.round((count.good / total) * 100) : 0;
                return (
                  <div
                    key={name}
                    className="p-3 rounded-lg"
                    style={{
                      background: "#00171f",
                      borderLeft: "3px solid #004a7c",
                    }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span
                        className="text-xs font-bold tracking-widest"
                        style={{ color: "#8ab4c9" }}
                      >
                        {name.toUpperCase()}
                      </span>
                      <div className="flex gap-2">
                        <span
                          className="text-xs px-2 py-1 rounded font-bold"
                          style={{ background: "#003320", color: "#00ff88" }}
                        >
                          ✓ {count.good}
                        </span>
                        <span
                          className="text-xs px-2 py-1 rounded font-bold"
                          style={{ background: "#330a0a", color: "#ff4d4d" }}
                        >
                          ✗ {count.bad}
                        </span>
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div
                      className="w-full rounded-full h-1.5"
                      style={{ background: "#004a7c" }}
                    >
                      <div
                        className="h-1.5 rounded-full transition-all duration-500"
                        style={{ width: `${pct}%`, background: "#00ff88" }}
                      />
                    </div>
                    <div className="text-xs mt-1" style={{ color: "#5fb3d4" }}>
                      {pct}% good rate · {total} total
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Summary bawah */}
            {totalAll > 0 && (
              <div
                className="mt-4 pt-3 border-t flex justify-between text-xs"
                style={{ borderColor: "#004a7c", color: "#5fb3d4" }}
              >
                <span>
                  Total deteksi:{" "}
                  <strong style={{ color: "#fff" }}>{totalAll}</strong>
                </span>
                <span>
                  Defect rate:{" "}
                  <strong style={{ color: "#ff4d4d" }}>
                    {Math.round((totalBad / totalAll) * 100)}%
                  </strong>
                </span>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
