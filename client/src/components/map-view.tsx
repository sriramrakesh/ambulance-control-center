import { useEffect, useState, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline, Circle } from "react-leaflet";
import L from "leaflet";
import { useHospitals } from "@/hooks/use-hospitals";
import { VEHICLES_CONFIG, SIGNALS_CONFIG } from "@/lib/simulation-config";

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

const GREEN_THRESHOLD_MILES = 0.12;
const ANIMATION_DURATION = 45;
const MAP_CENTER: [number, number] = [40.7310, -73.9930];

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3959;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function interpolateRoute(route: [number, number][], t: number): [number, number] {
  if (route.length < 2) return route[0] ?? [0, 0];
  const segs: number[] = [];
  let total = 0;
  for (let i = 0; i < route.length - 1; i++) {
    const d = haversineDistance(route[i][0], route[i][1], route[i + 1][0], route[i + 1][1]);
    segs.push(d);
    total += d;
  }
  let target = t * total;
  for (let i = 0; i < segs.length; i++) {
    if (target <= segs[i]) {
      const frac = segs[i] > 0 ? target / segs[i] : 0;
      return [
        route[i][0] + (route[i + 1][0] - route[i][0]) * frac,
        route[i][1] + (route[i + 1][1] - route[i][1]) * frac,
      ];
    }
    target -= segs[i];
  }
  return route[route.length - 1];
}

// ─────────────────────────────────────────────────────────────────────────────
// ICON FACTORIES
// ─────────────────────────────────────────────────────────────────────────────

function createVehicleIcon(emoji: string, color: string, isMoving: boolean) {
  const rings = isMoving ? `
    <div class="leaflet-ping-ring" style="position:absolute;inset:0;border-radius:50%;border:2px solid ${color};opacity:0.7;"></div>
    <div class="leaflet-ping-ring" style="position:absolute;inset:-8px;border-radius:50%;border:1.5px solid ${color};opacity:0.35;animation-delay:0.45s;"></div>
  ` : "";
  return L.divIcon({
    className: "bg-transparent border-none",
    html: `<div style="position:relative;display:flex;align-items:center;justify-content:center;width:48px;height:48px;">
      ${rings}
      <div style="width:42px;height:42px;border-radius:50%;background:rgba(2,6,23,0.93);border:2.5px solid ${color};box-shadow:0 0 18px ${color},0 0 36px ${color}44;display:flex;align-items:center;justify-content:center;font-size:22px;line-height:1;">${emoji}</div>
    </div>`,
    iconSize: [48, 48],
    iconAnchor: [24, 24],
  });
}

function createSignalIcon(status: "red" | "yellow" | "green", priorityVehicle: string | null) {
  const dot = status === "green" ? "#22c55e" : "#ef4444";
  const glow = status === "green" ? "0 0 12px #22c55e,0 0 24px #22c55e88" : "none";
  const border = status === "green" ? "#22c55e" : "#334155";
  const tag = priorityVehicle && status === "green"
    ? `<div style="background:#22c55e;color:#fff;font-size:7px;font-weight:800;padding:1px 4px;border-radius:3px;white-space:nowrap;margin-bottom:2px;letter-spacing:0.05em;">⚡ ${priorityVehicle}</div>` : "";
  return L.divIcon({
    className: "bg-transparent border-none",
    html: `<div style="display:flex;flex-direction:column;align-items:center;gap:2px;">${tag}
      <div style="width:26px;height:26px;border-radius:50%;background:rgba(2,6,23,0.96);border:2px solid ${border};box-shadow:${glow};display:flex;align-items:center;justify-content:center;">
        <div style="width:13px;height:13px;border-radius:50%;background:${dot};box-shadow:0 0 6px ${dot}cc;"></div>
      </div>
    </div>`,
    iconSize: [26, priorityVehicle && status === "green" ? 46 : 30],
    iconAnchor: [13, 13],
  });
}

function createHospitalIcon(isTarget: boolean) {
  const ring = isTarget
    ? `<div class="leaflet-ping-ring" style="position:absolute;inset:0;border-radius:12px;border:2px solid #22d3ee;opacity:0.6;"></div>` : "";
  return L.divIcon({
    className: "bg-transparent border-none",
    html: `<div style="position:relative;display:flex;align-items:center;justify-content:center;width:50px;height:50px;">${ring}
      <div style="width:44px;height:44px;border-radius:12px;background:rgba(2,6,23,0.93);border:2px solid ${isTarget ? "#22d3ee" : "#334155"};box-shadow:${isTarget ? "0 0 20px rgba(34,211,238,0.5)" : "none"};display:flex;align-items:center;justify-content:center;font-size:24px;">🏥</div>
    </div>`,
    iconSize: [50, 50],
    iconAnchor: [25, 25],
  });
}

function createIncidentIcon() {
  return L.divIcon({
    className: "bg-transparent border-none",
    html: `<div style="position:relative;display:flex;align-items:center;justify-content:center;width:54px;height:54px;">
      <div class="leaflet-ping-ring" style="position:absolute;inset:0;border-radius:50%;border:2px solid #ef4444;opacity:0.7;"></div>
      <div class="leaflet-ping-ring" style="position:absolute;inset:-8px;border-radius:50%;border:1.5px solid #ef4444;opacity:0.4;animation-delay:0.5s;"></div>
      <div style="width:46px;height:46px;border-radius:50%;background:rgba(2,6,23,0.92);border:2.5px solid #ef4444;box-shadow:0 0 20px rgba(239,68,68,0.8),0 0 40px rgba(239,68,68,0.3);display:flex;align-items:center;justify-content:center;font-size:24px;">🔥</div>
    </div>`,
    iconSize: [54, 54],
    iconAnchor: [27, 27],
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// MAP REF SETTER — grabs Leaflet map instance imperatively
// ─────────────────────────────────────────────────────────────────────────────

function MapRefSetter({ mapRef }: { mapRef: React.MutableRefObject<L.Map | null> }) {
  const map = useMap();
  mapRef.current = map;
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

export type VehicleState = {
  id: string;
  type: "ambulance" | "fire";
  label: string;
  icon: string;
  color: string;
  speed: number;
  route: [number, number][];
  currentPos: [number, number];
  progress: number;
  distanceTraveled: number;
  totalDistance: number;
  isActive: boolean;
  isFinished: boolean;
  destinationName: string;
  startedAt: number;
};

export type SignalState = {
  id: string;
  lat: number;
  lng: number;
  label: string;
  status: "red" | "yellow" | "green";
  priorityVehicle: string | null;
};

// ─────────────────────────────────────────────────────────────────────────────
// MAP VIEW
// ─────────────────────────────────────────────────────────────────────────────

interface MapViewProps {
  followVehicleId?: string | null;
  activeVehicleIds: string[];
  onVehiclesUpdate?: (vehicles: VehicleState[]) => void;
  onSignalsUpdate?: (signals: SignalState[]) => void;
}

export function MapView({ followVehicleId, activeVehicleIds, onVehiclesUpdate, onSignalsUpdate }: MapViewProps) {
  const { data: hospitals } = useHospitals();
  const [mounted, setMounted] = useState(false);
  const [vehicles, setVehicles] = useState<VehicleState[]>([]);
  const [signals, setSignals] = useState<SignalState[]>([]);

  // Stable refs — avoid stale closures without triggering re-renders
  const vehiclesRef = useRef<VehicleState[]>([]);
  const activeIdsRef = useRef<string[]>(activeVehicleIds);
  const followIdRef = useRef<string | null>(followVehicleId ?? null);
  const onVehiclesRef = useRef(onVehiclesUpdate);
  const onSignalsRef = useRef(onSignalsUpdate);
  const mapRef = useRef<L.Map | null>(null); // Leaflet map instance for imperative pan
  const lastFollowPos = useRef<[number, number] | null>(null);
  const animStarted = useRef(false);
  const initializedRef = useRef(false);

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => { activeIdsRef.current = activeVehicleIds; }, [activeVehicleIds]);
  useEffect(() => { followIdRef.current = followVehicleId ?? null; }, [followVehicleId]);
  useEffect(() => { onVehiclesRef.current = onVehiclesUpdate; }, [onVehiclesUpdate]);
  useEffect(() => { onSignalsRef.current = onSignalsUpdate; }, [onSignalsUpdate]);

  // Initialize vehicles once hospitals load
  useEffect(() => {
    if (!hospitals || hospitals.length === 0 || initializedRef.current) return;
    initializedRef.current = true;

    setSignals(SIGNALS_CONFIG.map(s => ({ ...s, status: "red" as const, priorityVehicle: null })));

    const now = Date.now();
    const built: VehicleState[] = VEHICLES_CONFIG.map((cfg, idx) => {
      let destPos: [number, number];
      let destName: string;
      if (cfg.destinationType === "hospital") {
        const hosp = hospitals[Math.min(cfg.destinationIndex, hospitals.length - 1)];
        destPos = [hosp.lat, hosp.lng];
        destName = hosp.name;
      } else {
        destPos = cfg.incidentPos!;
        destName = cfg.incidentLabel ?? "Fire Incident";
      }

      const route: [number, number][] = [
        cfg.startPos,
        [(cfg.startPos[0] + destPos[0]) / 2 + (idx % 2 === 0 ? 0.003 : -0.003),
         (cfg.startPos[1] + destPos[1]) / 2 + (idx % 2 === 0 ? -0.002 : 0.002)],
        destPos,
      ];

      let total = 0;
      for (let i = 0; i < route.length - 1; i++) {
        total += haversineDistance(route[i][0], route[i][1], route[i + 1][0], route[i + 1][1]);
      }

      return {
        id: cfg.id, type: cfg.type, label: cfg.label, icon: cfg.icon,
        color: cfg.color, speed: cfg.speed, route,
        currentPos: cfg.startPos, progress: 0, distanceTraveled: 0,
        totalDistance: total, isActive: true, isFinished: false,
        destinationName: destName, startedAt: now + idx * 3500,
      };
    });

    vehiclesRef.current = built;
    setVehicles(built);
  }, [hospitals]);

  // Animation loop — starts once, uses refs for all mutable values
  useEffect(() => {
    if (animStarted.current || vehiclesRef.current.length === 0) return;
    animStarted.current = true;

    let frameId: number;

    const tick = () => {
      const now = Date.now();
      const activeIds = activeIdsRef.current;

      const updated: VehicleState[] = vehiclesRef.current.map(v => {
        if (!activeIds.includes(v.id)) return { ...v, isActive: false };
        if (v.isFinished) return { ...v, isActive: true };
        const t = Math.min(Math.max(0, (now - v.startedAt) / 1000) / ANIMATION_DURATION, 1);
        return { ...v, currentPos: interpolateRoute(v.route, t), progress: t * 100, distanceTraveled: t * v.totalDistance, isActive: true, isFinished: t >= 1 };
      });

      const newSignals: SignalState[] = SIGNALS_CONFIG.map(sig => {
        let minDist = Infinity;
        let winner: string | null = null;
        for (const v of updated) {
          if (!v.isActive || v.isFinished || !activeIds.includes(v.id)) continue;
          const d = haversineDistance(sig.lat, sig.lng, v.currentPos[0], v.currentPos[1]);
          if (d < minDist) { minDist = d; winner = v.id; }
        }
        return minDist < GREEN_THRESHOLD_MILES
          ? { ...sig, status: "green" as const, priorityVehicle: winner }
          : { ...sig, status: "red" as const, priorityVehicle: null };
      });

      // Imperative camera follow — no state update
      const followId = followIdRef.current;
      if (followId && mapRef.current) {
        const followed = updated.find(v => v.id === followId);
        if (followed?.isActive && !followed.isFinished) {
          const pos = followed.currentPos;
          const prev = lastFollowPos.current;
          if (!prev || Math.abs(prev[0] - pos[0]) > 0.0001 || Math.abs(prev[1] - pos[1]) > 0.0001) {
            lastFollowPos.current = pos;
            mapRef.current.setView(pos, 15, { animate: true, duration: 0.8, noMoveStart: true });
          }
        }
      }

      vehiclesRef.current = updated;

      // Batch state updates — React batches these in concurrent mode
      setVehicles([...updated]);
      setSignals(newSignals);

      onVehiclesRef.current?.(updated);
      onSignalsRef.current?.(newSignals);

      frameId = requestAnimationFrame(tick);
    };

    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [vehicles.length]); // start loop when vehicles first populate

  if (!mounted) return <div className="w-full h-full bg-background" />;

  const activeVehicles = vehicles.filter(v => activeVehicleIds.includes(v.id));
  const fireConfigs = VEHICLES_CONFIG.filter(c => c.type === "fire");

  return (
    <MapContainer center={MAP_CENTER} zoom={13} className="w-full h-full" zoomControl={false}>
      <MapRefSetter mapRef={mapRef} />

      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/dark_matter_retina/{z}/{x}/{y}{r}.png"
        attribution='&copy; OpenStreetMap contributors &copy; CARTO'
      />

      {/* Full route lines (dashed) */}
      {activeVehicles.map(v => (
        <Polyline key={`rf-${v.id}`} positions={v.route}
          color={v.color} weight={2.5} opacity={0.3} dashArray="10 7" />
      ))}

      {/* Traveled path */}
      {activeVehicles.map(v => {
        const pts: [number, number][] = Array.from({ length: 30 }, (_, i) =>
          interpolateRoute(v.route, (i / 29) * (v.progress / 100)));
        return <Polyline key={`rd-${v.id}`} positions={pts} color={v.color} weight={5} opacity={0.9} />;
      })}

      {/* Traffic Signals */}
      {signals.map(sig => (
        <Marker key={sig.id} position={[sig.lat, sig.lng]}
          icon={createSignalIcon(sig.status, sig.priorityVehicle)} zIndexOffset={500}>
          <Popup>
            <div style={{ minWidth: 190, padding: "4px 2px" }}>
              <b style={{ display: "block", marginBottom: 6 }}>🚦 {sig.label}</b>
              <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
                <span style={{ width: 11, height: 11, borderRadius: "50%", display: "inline-block", background: sig.status === "green" ? "#22c55e" : "#ef4444", boxShadow: sig.status === "green" ? "0 0 8px #22c55e" : "none" }} />
                <b style={{ textTransform: "uppercase" }}>{sig.status}</b>
              </div>
              {sig.priorityVehicle && <div style={{ marginTop: 8, fontSize: 11, color: "#22c55e", fontWeight: 800, letterSpacing: "0.06em" }}>⚡ OVERRIDE — {sig.priorityVehicle}</div>}
            </div>
          </Popup>
        </Marker>
      ))}

      {/* Hospitals */}
      {hospitals?.map(hosp => {
        const isTarget = activeVehicles.some(v => v.type === "ambulance" && v.destinationName === hosp.name);
        return (
          <Marker key={`h-${hosp.id}`} position={[hosp.lat, hosp.lng]}
            icon={createHospitalIcon(isTarget)} zIndexOffset={300}>
            <Popup>
              <div style={{ minWidth: 190, padding: "4px 2px" }}>
                <b style={{ display: "block", marginBottom: 6 }}>🏥 {hosp.name}</b>
                <div style={{ fontSize: 13 }}>Available Beds: <b>{hosp.availableBeds}</b></div>
                {isTarget && <div style={{ marginTop: 8, fontSize: 11, color: "#22d3ee", fontWeight: 800 }}>📍 ACTIVE DESTINATION</div>}
              </div>
            </Popup>
          </Marker>
        );
      })}

      {/* Fire incident markers */}
      {fireConfigs.map(cfg => (
        <Marker key={`fi-${cfg.id}`} position={cfg.incidentPos!}
          icon={createIncidentIcon()} zIndexOffset={400}>
          <Popup>
            <div style={{ minWidth: 190, padding: "4px 2px" }}>
              <b style={{ display: "block", marginBottom: 6 }}>🔥 {cfg.incidentLabel}</b>
              <div style={{ fontSize: 11, color: "#ef4444", fontWeight: 800 }}>⚠ ACTIVE INCIDENT</div>
            </div>
          </Popup>
        </Marker>
      ))}

      {/* Fire incident pulse circles */}
      {fireConfigs.map(cfg => (
        <Circle key={`fc-${cfg.id}`} center={cfg.incidentPos!} radius={120}
          pathOptions={{ color: "#ef4444", fillColor: "#ef4444", fillOpacity: 0.07, weight: 1.5, dashArray: "6 5" }} />
      ))}

      {/* Vehicles */}
      {activeVehicles.map(v => (
        <Marker key={`v-${v.id}`} position={v.currentPos}
          icon={createVehicleIcon(v.icon, v.color, v.isActive && !v.isFinished)} zIndexOffset={1000}>
          <Popup>
            <div style={{ minWidth: 210, padding: "4px 2px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <span style={{ fontSize: 22 }}>{v.icon}</span>
                <b style={{ fontSize: 15 }}>{v.label}</b>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, fontSize: 13 }}>
                <div><span style={{ color: "#64748b" }}>Speed</span><br /><b>{v.speed} mph</b></div>
                <div><span style={{ color: "#64748b" }}>Progress</span><br /><b>{Math.round(v.progress)}%</b></div>
                <div><span style={{ color: "#64748b" }}>Traveled</span><br /><b>{v.distanceTraveled.toFixed(2)} mi</b></div>
                <div><span style={{ color: "#64748b" }}>Remaining</span><br /><b>{(v.totalDistance - v.distanceTraveled).toFixed(2)} mi</b></div>
              </div>
              <div style={{ marginTop: 10, paddingTop: 8, borderTop: "1px solid #1e293b", fontSize: 12, color: "#64748b" }}>→ {v.destinationName}</div>
              {v.isFinished && <div style={{ marginTop: 6, fontSize: 13, color: "#22c55e", fontWeight: 800 }}>✓ ARRIVED</div>}
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
