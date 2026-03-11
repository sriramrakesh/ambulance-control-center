import { useState, useCallback } from "react";
import { Layout } from "@/components/layout";
import { MapView, VehicleState, SignalState } from "@/components/map-view";
import { VEHICLES_CONFIG } from "@/lib/simulation-config";

// ─────────────────────────────────────────────────────────────────────────────
// VEHICLE CARD
// ─────────────────────────────────────────────────────────────────────────────

interface VehicleCardProps {
  config: typeof VEHICLES_CONFIG[number];
  state?: VehicleState;
  isFollowed: boolean;
  isActive: boolean;
  onFollow: () => void;
  onToggle: () => void;
}

function VehicleCard({ config, state, isFollowed, isActive, onFollow, onToggle }: VehicleCardProps) {
  const progress = state?.progress ?? 0;
  const speed = state?.speed ?? config.speed;
  const distTraveled = state?.distanceTraveled ?? 0;
  const distRemaining = state ? state.totalDistance - state.distanceTraveled : 0;
  const isFinished = state?.isFinished ?? false;

  const etaMins = speed > 0 && !isFinished
    ? Math.ceil((distRemaining / speed) * 60)
    : 0;

  const statusLabel = !isActive ? "STANDBY"
    : isFinished ? "ARRIVED"
    : "EN ROUTE";

  const statusColor = !isActive ? "#64748b"
    : isFinished ? "#22c55e"
    : config.type === "fire" ? "#f97316" : "#06b6d4";

  return (
    <div
      style={{
        background: "rgba(2,6,23,0.8)",
        border: `1.5px solid ${isActive ? config.color + "55" : "#1e293b"}`,
        borderRadius: 12,
        padding: "10px 12px",
        transition: "all 0.3s",
        boxShadow: isActive && !isFinished ? `0 0 12px ${config.color}22` : "none",
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 20 }}>{config.icon}</span>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#f1f5f9", letterSpacing: "0.03em" }}>
              {config.label}
            </div>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", color: statusColor }}>
              {statusLabel}
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          <button
            onClick={onFollow}
            style={{
              padding: "3px 8px", borderRadius: 6, fontSize: 10, fontWeight: 700,
              background: isFollowed ? config.color + "33" : "transparent",
              border: `1px solid ${isFollowed ? config.color : "#334155"}`,
              color: isFollowed ? config.color : "#64748b",
              cursor: "pointer", letterSpacing: "0.05em", transition: "all 0.2s",
            }}
          >
            {isFollowed ? "📍 LIVE" : "FOLLOW"}
          </button>
          <button
            onClick={onToggle}
            style={{
              padding: "3px 8px", borderRadius: 6, fontSize: 10, fontWeight: 700,
              background: isActive ? "rgba(239,68,68,0.1)" : "rgba(34,197,94,0.1)",
              border: `1px solid ${isActive ? "#ef444455" : "#22c55e55"}`,
              color: isActive ? "#ef4444" : "#22c55e",
              cursor: "pointer", letterSpacing: "0.05em", transition: "all 0.2s",
            }}
          >
            {isActive ? "DEACTIVATE" : "DISPATCH"}
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div style={{ marginBottom: 8 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
          <span style={{ fontSize: 10, color: "#64748b", letterSpacing: "0.05em" }}>ROUTE PROGRESS</span>
          <span style={{ fontSize: 10, fontWeight: 700, color: config.color }}>{Math.round(progress)}%</span>
        </div>
        <div style={{ height: 4, background: "#1e293b", borderRadius: 2, overflow: "hidden" }}>
          <div style={{
            height: "100%", width: `${progress}%`,
            background: `linear-gradient(90deg, ${config.color}, ${config.type === "fire" ? "#ef4444" : "#a855f7"})`,
            borderRadius: 2, transition: "width 0.3s",
          }} />
        </div>
      </div>

      {/* Metrics grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
        {[
          { label: "SPEED", value: `${speed}`, unit: "mph" },
          { label: "DIST", value: distTraveled.toFixed(2), unit: "mi" },
          { label: "ETA", value: isFinished ? "0" : etaMins.toString(), unit: isFinished ? "—" : "min" },
        ].map(m => (
          <div key={m.label} style={{
            background: "rgba(15,23,42,0.6)", borderRadius: 6, padding: "5px 6px",
            border: "1px solid #1e293b",
          }}>
            <div style={{ fontSize: 8, color: "#64748b", fontWeight: 700, letterSpacing: "0.1em", marginBottom: 2 }}>{m.label}</div>
            <div style={{ fontSize: 14, fontWeight: 800, color: "#f1f5f9", fontFamily: "monospace" }}>
              {m.value} <span style={{ fontSize: 9, color: "#64748b", fontWeight: 400 }}>{m.unit}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Destination */}
      {state && (
        <div style={{ marginTop: 8, fontSize: 10, color: "#64748b", display: "flex", alignItems: "center", gap: 4 }}>
          <span>{config.type === "fire" ? "🔥" : "🏥"}</span>
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {state.destinationName}
          </span>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SIGNAL MINI PANEL
// ─────────────────────────────────────────────────────────────────────────────

function SignalPanel({ signals }: { signals: SignalState[] }) {
  const green = signals.filter(s => s.status === "green").length;
  const red = signals.filter(s => s.status === "red").length;

  return (
    <div style={{ marginTop: 12, background: "rgba(2,6,23,0.8)", border: "1.5px solid #1e293b", borderRadius: 12, padding: "10px 12px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: "#64748b", letterSpacing: "0.1em" }}>TRAFFIC SIGNALS</span>
        <div style={{ display: "flex", gap: 8 }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: "#22c55e" }}>●{green} GREEN</span>
          <span style={{ fontSize: 10, fontWeight: 700, color: "#ef4444" }}>●{red} RED</span>
        </div>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
        {signals.map(sig => (
          <div key={sig.id} style={{
            display: "flex", alignItems: "center", gap: 4, padding: "3px 7px",
            borderRadius: 6, fontSize: 9, fontWeight: 700, letterSpacing: "0.05em",
            background: sig.status === "green" ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.08)",
            border: `1px solid ${sig.status === "green" ? "#22c55e44" : "#ef444433"}`,
            color: sig.status === "green" ? "#22c55e" : "#ef4444",
            transition: "all 0.4s",
          }}>
            <span style={{
              width: 6, height: 6, borderRadius: "50%",
              background: sig.status === "green" ? "#22c55e" : "#ef4444",
              boxShadow: sig.status === "green" ? "0 0 6px #22c55e" : "none",
              display: "inline-block",
            }} />
            {sig.id}
            {sig.priorityVehicle && (
              <span style={{ color: "#06b6d4", marginLeft: 2 }}>({sig.priorityVehicle})</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DASHBOARD
// ─────────────────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const [activeVehicleIds, setActiveVehicleIds] = useState<string[]>(VEHICLES_CONFIG.map(v => v.id));
  const [followVehicleId, setFollowVehicleId] = useState<string | null>("AMB-01");
  const [vehicleStates, setVehicleStates] = useState<VehicleState[]>([]);
  const [signalStates, setSignalStates] = useState<SignalState[]>([]);

  const handleVehiclesUpdate = useCallback((vs: VehicleState[]) => {
    setVehicleStates(vs);
  }, []);

  const handleSignalsUpdate = useCallback((ss: SignalState[]) => {
    setSignalStates(ss);
  }, []);

  const activeCount = vehicleStates.filter(v => v.isActive && !v.isFinished).length;
  const greenSignals = signalStates.filter(s => s.status === "green").length;
  const arrivedCount = vehicleStates.filter(v => v.isFinished).length;

  return (
    <Layout>
      <div style={{ display: "flex", width: "100%", height: "100%", position: "relative" }}>

        {/* ── LEFT CONTROL PANEL ── */}
        <div style={{
          width: 280, minWidth: 280, height: "100%", overflowY: "auto",
          background: "rgba(2,6,23,0.7)", backdropFilter: "blur(16px)",
          borderRight: "1px solid rgba(255,255,255,0.05)",
          padding: "16px 12px", display: "flex", flexDirection: "column", gap: 12, zIndex: 10,
        }}>

          {/* Header */}
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.15em", color: "#64748b", marginBottom: 4 }}>
              COMMAND CENTER
            </div>
            <div style={{ fontSize: 18, fontWeight: 800, color: "#f1f5f9", letterSpacing: "0.06em" }}>
              EMERGENCY DISPATCH
            </div>
          </div>

          {/* Live status strip */}
          <div style={{
            display: "grid", gridTemplateColumns: "1fr 1fr 1fr",
            gap: 6, padding: "8px 0", borderTop: "1px solid #1e293b", borderBottom: "1px solid #1e293b",
          }}>
            {[
              { label: "ACTIVE", value: activeCount, color: "#06b6d4" },
              { label: "SIGNALS", value: `${greenSignals}▲`, color: "#22c55e" },
              { label: "ARRIVED", value: arrivedCount, color: "#a855f7" },
            ].map(s => (
              <div key={s.label} style={{ textAlign: "center" }}>
                <div style={{ fontSize: 18, fontWeight: 800, color: s.color, fontFamily: "monospace" }}>{s.value}</div>
                <div style={{ fontSize: 8, color: "#64748b", fontWeight: 700, letterSpacing: "0.1em" }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Section label */}
          <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.12em", color: "#64748b" }}>
            EMERGENCY VEHICLES — {activeVehicleIds.length} DISPATCHED
          </div>

          {/* Vehicle Cards */}
          {VEHICLES_CONFIG.map(cfg => {
            const state = vehicleStates.find(v => v.id === cfg.id);
            return (
              <VehicleCard
                key={cfg.id}
                config={cfg}
                state={state}
                isFollowed={followVehicleId === cfg.id}
                isActive={activeVehicleIds.includes(cfg.id)}
                onFollow={() => setFollowVehicleId(prev => prev === cfg.id ? null : cfg.id)}
                onToggle={() => setActiveVehicleIds(prev =>
                  prev.includes(cfg.id) ? prev.filter(id => id !== cfg.id) : [...prev, cfg.id]
                )}
              />
            );
          })}

          {/* Signal Panel */}
          <SignalPanel signals={signalStates} />

          {/* Legend */}
          <div style={{
            marginTop: "auto", padding: "10px 0", borderTop: "1px solid #1e293b",
            fontSize: 10, color: "#64748b",
          }}>
            <div style={{ fontWeight: 700, letterSpacing: "0.1em", marginBottom: 6 }}>LEGEND</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {[
                { icon: "🚑", label: "Ambulance → Hospital" },
                { icon: "🚒", label: "Fire Engine → Incident" },
                { icon: "🔴", label: "Signal: RED (normal)" },
                { icon: "🟢", label: "Signal: GREEN (override)" },
                { icon: "🔥", label: "Active fire incident" },
              ].map(l => (
                <div key={l.icon} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 13 }}>{l.icon}</span>
                  <span>{l.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── MAP ── */}
        <div style={{ flex: 1, position: "relative" }}>
          <MapView
            followVehicleId={followVehicleId}
            activeVehicleIds={activeVehicleIds}
            onVehiclesUpdate={handleVehiclesUpdate}
            onSignalsUpdate={handleSignalsUpdate}
          />

          {/* Top overlay: system title */}
          <div style={{
            position: "absolute", top: 16, left: 16, zIndex: 400,
            background: "rgba(2,6,23,0.85)", backdropFilter: "blur(12px)",
            border: "1px solid rgba(6,182,212,0.3)", borderRadius: 10,
            padding: "8px 14px", pointerEvents: "none",
          }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: "#06b6d4", letterSpacing: "0.12em" }}>
              SMART AMBULANCE DETECTION SYSTEM
            </div>
            <div style={{ display: "flex", gap: 14, marginTop: 4 }}>
              <span style={{ fontSize: 9, color: "#64748b", display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#ef4444", display: "inline-block", boxShadow: "0 0 6px #ef4444" }} />
                Active Responders
              </span>
              <span style={{ fontSize: 9, color: "#64748b", display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#22c55e", display: "inline-block", boxShadow: "0 0 6px #22c55e" }} />
                Signal Override Active
              </span>
              <span style={{ fontSize: 9, color: "#64748b", display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#f97316", display: "inline-block", boxShadow: "0 0 6px #f97316" }} />
                Fire Incident
              </span>
            </div>
          </div>

          {/* Follow mode badge */}
          {followVehicleId && (
            <div style={{
              position: "absolute", bottom: 20, left: "50%", transform: "translateX(-50%)", zIndex: 400,
              background: "rgba(2,6,23,0.9)", backdropFilter: "blur(12px)",
              border: "1px solid rgba(6,182,212,0.4)", borderRadius: 24,
              padding: "6px 16px", display: "flex", alignItems: "center", gap: 8,
              boxShadow: "0 0 20px rgba(6,182,212,0.2)",
            }}>
              <span style={{
                width: 8, height: 8, borderRadius: "50%", background: "#06b6d4",
                boxShadow: "0 0 8px #06b6d4", display: "inline-block", animation: "blink 1s ease-in-out infinite",
              }} />
              <span style={{ fontSize: 11, fontWeight: 700, color: "#06b6d4", letterSpacing: "0.1em" }}>
                TRACKING {followVehicleId}
              </span>
              <button
                onClick={() => setFollowVehicleId(null)}
                style={{
                  background: "transparent", border: "none", color: "#64748b",
                  fontSize: 11, cursor: "pointer", fontWeight: 700, marginLeft: 4,
                }}
              >✕</button>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
