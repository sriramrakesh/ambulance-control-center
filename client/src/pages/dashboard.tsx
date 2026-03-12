import { useState, useCallback, type ReactNode } from "react";
import { Layout } from "@/components/layout";
import { MapView, VehicleState, SignalState } from "@/components/map-view";
import { VEHICLES_CONFIG } from "@/lib/simulation-config";

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
  const distRemaining = state ? state.totalDistance - state.distanceTraveled : 0;

  return (
    <div style={{ background: "rgba(2,6,23,0.9)", border: `1px solid ${isActive ? config.color + "55" : "#1e293b"}`, borderRadius: 10, padding: "8px 9px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 17 }}>{config.icon}</span>
          <div style={{ fontSize: 11, fontWeight: 700 }}>{config.label}</div>
        </div>
        <button onClick={onToggle} style={{ fontSize: 9, padding: "2px 6px", borderRadius: 6, border: "1px solid #334155", background: "transparent", color: isActive ? "#ef4444" : "#22c55e" }}>{isActive ? "STOP" : "GO"}</button>
      </div>
      <div style={{ height: 3, borderRadius: 99, background: "#1e293b", overflow: "hidden", marginBottom: 6 }}>
        <div style={{ width: `${progress}%`, height: "100%", background: config.color, transition: "width 0.2s" }} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 4, fontSize: 9, color: "#94a3b8" }}>
        <span><b style={{ color: "#f8fafc" }}>{speed}</b> mph</span>
        <span><b style={{ color: "#f8fafc" }}>{Math.max(0, distRemaining).toFixed(1)}</b> km</span>
        <button onClick={onFollow} style={{ border: "none", background: "transparent", color: isFollowed ? "#22d3ee" : "#64748b", fontSize: 9, fontWeight: 700, cursor: "pointer" }}>{isFollowed ? "TRACKING" : "FOLLOW"}</button>
      </div>
    </div>
  );
}

function SignalPanel({ signals }: { signals: SignalState[] }) {
  const green = signals.filter(s => s.status === "green").length;
  const red = signals.filter(s => s.status === "red").length;

  return (
    <div style={{ background: "rgba(2,6,23,0.7)", border: "1px solid #1e293b", borderRadius: 12, padding: "10px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontSize: 10 }}>
        <strong style={{ color: "#94a3b8" }}>TRAFFIC SIGNALS</strong>
        <span style={{ color: "#22c55e" }}>{green} GREEN</span>
      </div>
      <div style={{ fontSize: 10, color: "#ef4444", marginBottom: 8 }}>{red} RED (default)</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
        {signals.map(sig => (
          <div key={sig.id} style={{ fontSize: 9, border: `1px solid ${sig.status === "green" ? "#22c55e44" : "#ef444433"}`, borderRadius: 6, padding: "2px 6px", color: sig.status === "green" ? "#22c55e" : "#ef4444" }}>
            {sig.id}
          </div>
        ))}
      </div>
    </div>
  );
}

function CollapsibleSection({ title, defaultOpen = true, children }: { title: string; defaultOpen?: boolean; children: ReactNode }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ border: "1px solid #1e293b", borderRadius: 12, overflow: "hidden", background: "rgba(2,6,23,0.55)" }}>
      <button onClick={() => setOpen(v => !v)} style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 10px", background: "transparent", border: "none", color: "#cbd5e1", fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", cursor: "pointer" }}>
        {title}
        <span>{open ? "▾" : "▸"}</span>
      </button>
      {open && <div style={{ padding: "0 10px 10px 10px" }}>{children}</div>}
    </div>
  );
}

export default function Dashboard() {
  const [activeVehicleIds, setActiveVehicleIds] = useState<string[]>(VEHICLES_CONFIG.map(v => v.id));
  const [followVehicleId, setFollowVehicleId] = useState<string | null>("AMB-01");
  const [vehicleStates, setVehicleStates] = useState<VehicleState[]>([]);
  const [signalStates, setSignalStates] = useState<SignalState[]>([]);

  const handleVehiclesUpdate = useCallback((vs: VehicleState[]) => setVehicleStates(vs), []);
  const handleSignalsUpdate = useCallback((ss: SignalState[]) => setSignalStates(ss), []);

  const activeCount = vehicleStates.filter(v => v.isActive && !v.isFinished).length;
  const arrivedCount = vehicleStates.filter(v => v.isFinished).length;

  return (
    <Layout>
      <div style={{ display: "grid", gridTemplateColumns: "30% 70%", width: "100%", height: "100%" }}>
        <div style={{ borderRight: "1px solid rgba(255,255,255,0.06)", padding: 12, display: "flex", flexDirection: "column", gap: 10, overflowY: "auto", background: "rgba(2,6,23,0.6)" }}>
          <div style={{ paddingBottom: 8, borderBottom: "1px solid #1e293b" }}>
            <div style={{ fontSize: 10, color: "#64748b", letterSpacing: "0.15em", fontWeight: 700 }}>COMMAND CENTER</div>
            <div style={{ fontSize: 18, fontWeight: 800 }}>EMERGENCY DISPATCH</div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, fontSize: 10 }}>
            <div style={{ background: "#020617", border: "1px solid #1e293b", borderRadius: 8, padding: 8 }}>ACTIVE <b style={{ color: "#22d3ee" }}>{activeCount}</b></div>
            <div style={{ background: "#020617", border: "1px solid #1e293b", borderRadius: 8, padding: 8 }}>ARRIVED <b style={{ color: "#a855f7" }}>{arrivedCount}</b></div>
          </div>

          <CollapsibleSection title="LIVE MAP" defaultOpen>
            <p style={{ fontSize: 11, color: "#94a3b8", lineHeight: 1.5 }}>OpenStreetMap routing is active. Emergency vehicles follow road-based routes, hospitals remain visible, and fire incidents are highlighted for dispatch.</p>
          </CollapsibleSection>

          <CollapsibleSection title="ALERTS LOG" defaultOpen>
            <ul style={{ fontSize: 11, color: "#94a3b8", display: "grid", gap: 4, lineHeight: 1.5 }}>
              <li>• Ambulance dispatched</li>
              <li>• Fire engine responding</li>
              <li>• Traffic signal cleared</li>
            </ul>
          </CollapsibleSection>

          <CollapsibleSection title="ANALYTICS" defaultOpen>
            <div style={{ display: "grid", gap: 8, marginBottom: 8, fontSize: 10 }}>
              <div style={{ background: "#020617", border: "1px solid #1e293b", borderRadius: 8, padding: 8 }}>TOTAL ACTIVE VEHICLES <b style={{ color: "#22d3ee" }}>{activeCount}</b></div>
              <div style={{ background: "#020617", border: "1px solid #1e293b", borderRadius: 8, padding: 8 }}>AVERAGE RESPONSE TIME <b style={{ color: "#a78bfa" }}>8.4 min</b></div>
              <div style={{ background: "#020617", border: "1px solid #1e293b", borderRadius: 8, padding: 8 }}>SIGNALS CLEARED <b style={{ color: "#22c55e" }}>{signalStates.filter((s) => s.status === "green").length}</b></div>
              <div style={{ background: "#020617", border: "1px solid #1e293b", borderRadius: 8, padding: 8 }}>EMERGENCIES HANDLED <b style={{ color: "#f97316" }}>{arrivedCount}</b></div>
            </div>
            <SignalPanel signals={signalStates} />
          </CollapsibleSection>
        </div>

        <div style={{ position: "relative", minWidth: 0 }}>
          <MapView
            followVehicleId={followVehicleId}
            activeVehicleIds={activeVehicleIds}
            onVehiclesUpdate={handleVehiclesUpdate}
            onSignalsUpdate={handleSignalsUpdate}
          />

          <div style={{ position: "absolute", top: 12, right: 12, zIndex: 500, width: 260, maxHeight: "70%", overflowY: "auto", display: "flex", flexDirection: "column", gap: 8, background: "rgba(2,6,23,0.85)", border: "1px solid #1e293b", borderRadius: 12, padding: 8 }}>
            <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.1em", color: "#22d3ee" }}>VEHICLE PANEL</div>
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
                  onToggle={() => setActiveVehicleIds(prev => prev.includes(cfg.id) ? prev.filter(id => id !== cfg.id) : [...prev, cfg.id])}
                />
              );
            })}
          </div>
        </div>
      </div>
    </Layout>
  );
}
