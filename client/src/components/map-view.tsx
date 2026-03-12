import { useEffect, useState, useRef, type MutableRefObject } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline, Circle, ZoomControl } from "react-leaflet";
import L from "leaflet";
import { useHospitals } from "@/hooks/use-hospitals";
import { VEHICLES_CONFIG, SIGNALS_CONFIG } from "@/lib/simulation-config";

const GREEN_THRESHOLD_KM = 0.1;
const SIGNAL_RESET_DELAY_MS = 2500;
const VEHICLE_MIN_SEPARATION_KM = 0.045;
const MAP_CENTER: [number, number] = [20.5937, 78.9629];
const INITIAL_ZOOM = 5;

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
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



function offsetRoute(route: [number, number][], laneOffset = 0): [number, number][] {
  if (Math.abs(laneOffset) < 0.00001 || route.length < 2) return route;
  return route.map((point, index) => {
    const prev = route[Math.max(0, index - 1)];
    const next = route[Math.min(route.length - 1, index + 1)];
    const dLat = next[0] - prev[0];
    const dLng = next[1] - prev[1];
    const magnitude = Math.hypot(dLat, dLng) || 1;
    const perpLat = -dLng / magnitude;
    const perpLng = dLat / magnitude;
    return [point[0] + perpLat * laneOffset, point[1] + perpLng * laneOffset] as [number, number];
  });
}

function spreadVehicles(vehicles: VehicleState[]): VehicleState[] {
  const adjusted = vehicles.map((vehicle) => ({ ...vehicle }));

  for (let i = 0; i < adjusted.length; i++) {
    for (let j = i + 1; j < adjusted.length; j++) {
      const first = adjusted[i];
      const second = adjusted[j];
      if (!first.isActive || !second.isActive) continue;

      const distance = haversineDistance(first.currentPos[0], first.currentPos[1], second.currentPos[0], second.currentPos[1]);
      if (distance >= VEHICLE_MIN_SEPARATION_KM) continue;

      const shift = 0.00012;
      adjusted[j] = {
        ...second,
        currentPos: [second.currentPos[0] + shift * (j % 2 === 0 ? 1 : -1), second.currentPos[1] - shift * (j % 2 === 0 ? -1 : 1)],
      };
    }
  }

  return adjusted;
}

async function fetchRoadRoute(start: [number, number], end: [number, number], fallbackOffset = 0): Promise<[number, number][]> {
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${start[1]},${start[0]};${end[1]},${end[0]}?overview=full&geometries=geojson`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("OSRM route fetch failed");
    const data = await res.json();
    const coords: [number, number][] = data.routes?.[0]?.geometry?.coordinates?.map((point: [number, number]) => [point[1], point[0]]);
    if (coords?.length > 1) return coords;
  } catch (error) {
    console.warn("Routing fallback in use", error);
  }

  return [
    start,
    [(start[0] + end[0]) / 2 + fallbackOffset, (start[1] + end[1]) / 2 - fallbackOffset],
    end,
  ];
}

function createVehicleIcon(emoji: string, color: string, isMoving: boolean) {
  const rings = isMoving ? `
    <div class="leaflet-ping-ring" style="position:absolute;inset:0;border-radius:50%;border:2px solid ${color};opacity:0.7;"></div>
    <div class="leaflet-ping-ring" style="position:absolute;inset:-8px;border-radius:50%;border:1.5px solid ${color};opacity:0.35;animation-delay:0.45s;"></div>
  ` : "";
  return L.divIcon({
    className: "bg-transparent border-none",
    html: `<div style="position:relative;display:flex;align-items:center;justify-content:center;width:44px;height:44px;">
      ${rings}
      <div style="width:38px;height:38px;border-radius:50%;background:rgba(2,6,23,0.93);border:2px solid ${color};box-shadow:0 0 16px ${color},0 0 28px ${color}44;display:flex;align-items:center;justify-content:center;font-size:20px;line-height:1;">${emoji}</div>
    </div>`,
    iconSize: [44, 44],
    iconAnchor: [22, 22],
  });
}

function createSignalIcon(status: "red" | "yellow" | "green", priorityVehicle: string | null) {
  const dot = status === "green" ? "#22c55e" : "#ef4444";
  const border = status === "green" ? "#22c55e" : "#334155";
  const tag = priorityVehicle && status === "green"
    ? `<div style="background:#22c55e;color:#fff;font-size:7px;font-weight:800;padding:1px 4px;border-radius:3px;white-space:nowrap;margin-bottom:2px;letter-spacing:0.05em;">⚡ ${priorityVehicle}</div>` : "";

  return L.divIcon({
    className: "bg-transparent border-none",
    html: `<div style="display:flex;flex-direction:column;align-items:center;gap:2px;">${tag}
      <div style="width:26px;height:36px;border-radius:8px;background:rgba(2,6,23,0.96);border:1.5px solid ${border};display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;padding:3px 0;">
        <div style="width:8px;height:8px;border-radius:50%;background:${status === "red" ? dot : "#334155"};box-shadow:${status === "red" ? "0 0 8px #ef4444" : "none"};" class="traffic-light-dot"></div>
        <div style="width:8px;height:8px;border-radius:50%;background:${status === "yellow" ? "#eab308" : "#334155"};"></div>
        <div style="width:8px;height:8px;border-radius:50%;background:${status === "green" ? dot : "#334155"};box-shadow:${status === "green" ? "0 0 8px #22c55e" : "none"};" class="traffic-light-dot"></div>
      </div>
    </div>`,
    iconSize: [28, priorityVehicle && status === "green" ? 54 : 42],
    iconAnchor: [14, 21],
  });
}

function createHospitalIcon(isTarget: boolean) {
  const ring = isTarget
    ? `<div class="leaflet-ping-ring" style="position:absolute;inset:0;border-radius:12px;border:2px solid #22d3ee;opacity:0.6;"></div>` : "";
  return L.divIcon({
    className: "bg-transparent border-none",
    html: `<div style="position:relative;display:flex;align-items:center;justify-content:center;width:44px;height:44px;">${ring}
      <div style="width:36px;height:36px;border-radius:10px;background:rgba(2,6,23,0.93);border:2px solid ${isTarget ? "#22d3ee" : "#334155"};box-shadow:${isTarget ? "0 0 20px rgba(34,211,238,0.5)" : "none"};display:flex;align-items:center;justify-content:center;font-size:20px;">🏥</div>
    </div>`,
    iconSize: [44, 44],
    iconAnchor: [22, 22],
  });
}

function createIncidentIcon() {
  return L.divIcon({
    className: "bg-transparent border-none",
    html: `<div class="fire-pulse" style="width:42px;height:42px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:rgba(239,68,68,0.12);border:1.5px solid rgba(239,68,68,0.5);font-size:22px;">🔥</div>`,
    iconSize: [42, 42],
    iconAnchor: [21, 21],
  });
}

function MapRefSetter({ mapRef }: { mapRef: MutableRefObject<L.Map | null> }) {
  const map = useMap();
  mapRef.current = map;
  return null;
}

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
  animationDurationSec: number;
};

export type SignalState = {
  id: string;
  lat: number;
  lng: number;
  label: string;
  status: "red" | "yellow" | "green";
  priorityVehicle: string | null;
  greenUntil: number;
};

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

  const vehiclesRef = useRef<VehicleState[]>([]);
  const activeIdsRef = useRef<string[]>(activeVehicleIds);
  const followIdRef = useRef<string | null>(followVehicleId ?? null);
  const onVehiclesRef = useRef(onVehiclesUpdate);
  const onSignalsRef = useRef(onSignalsUpdate);
  const signalsRef = useRef<SignalState[]>([]);
  const mapRef = useRef<L.Map | null>(null);
  const lastFollowPos = useRef<[number, number] | null>(null);
  const animStarted = useRef(false);
  const initializedRef = useRef(false);

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => { activeIdsRef.current = activeVehicleIds; }, [activeVehicleIds]);
  useEffect(() => { followIdRef.current = followVehicleId ?? null; }, [followVehicleId]);
  useEffect(() => { onVehiclesRef.current = onVehiclesUpdate; }, [onVehiclesUpdate]);
  useEffect(() => { onSignalsRef.current = onSignalsUpdate; }, [onSignalsUpdate]);
  useEffect(() => { signalsRef.current = signals; }, [signals]);

  useEffect(() => {
    if (!hospitals || hospitals.length === 0 || initializedRef.current) return;
    initializedRef.current = true;

    setSignals(SIGNALS_CONFIG.map(s => ({ ...s, status: "red" as const, priorityVehicle: null, greenUntil: 0 })));

    const buildVehicles = async () => {
      const now = Date.now();
      const built = await Promise.all(VEHICLES_CONFIG.map(async (cfg, idx) => {
        let destPos: [number, number];
        let destName: string;

        if (cfg.destinationType === "hospital") {
          const nearestHospital = hospitals.reduce((closest, hospital) => {
            const nextDistance = haversineDistance(cfg.startPos[0], cfg.startPos[1], hospital.lat, hospital.lng);
            if (!closest || nextDistance < closest.distance) {
              return { hospital, distance: nextDistance };
            }
            return closest;
          }, null as { hospital: typeof hospitals[number]; distance: number } | null);

          const hospital = nearestHospital?.hospital ?? hospitals[0];
          destPos = [hospital.lat, hospital.lng];
          destName = hospital.name;
        } else {
          destPos = cfg.incidentPos!;
          destName = cfg.incidentLabel ?? "Fire Incident";
        }

        const baseRoute = await fetchRoadRoute(cfg.startPos, destPos, idx % 2 === 0 ? 0.003 : -0.003);
        const route = offsetRoute(baseRoute, (idx - 1) * 0.00018);

        let total = 0;
        for (let i = 0; i < route.length - 1; i++) {
          total += haversineDistance(route[i][0], route[i][1], route[i + 1][0], route[i + 1][1]);
        }

        return {
          id: cfg.id,
          type: cfg.type,
          label: cfg.label,
          icon: cfg.icon,
          color: cfg.color,
          speed: cfg.speed,
          route,
          currentPos: cfg.startPos,
          progress: 0,
          distanceTraveled: 0,
          totalDistance: total,
          isActive: true,
          isFinished: false,
          destinationName: destName,
          startedAt: now + idx * 2500,
          animationDurationSec: Math.max(22, Math.min(140, (total / (cfg.speed * 1.609)) * 3600)),
        };
      }));

      vehiclesRef.current = built;
      setVehicles(built);
    };

    buildVehicles();
  }, [hospitals]);

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
        const t = Math.min(Math.max(0, (now - v.startedAt) / 1000) / v.animationDurationSec, 1);
        return {
          ...v,
          currentPos: interpolateRoute(v.route, t),
          progress: t * 100,
          distanceTraveled: t * v.totalDistance,
          isActive: true,
          isFinished: t >= 1,
        };
      });

      const spacedVehicles = spreadVehicles(updated);

      const previousById = new Map(signalsRef.current.map((signal) => [signal.id, signal]));
      const newSignals: SignalState[] = SIGNALS_CONFIG.map((sig) => {
        let minDist = Infinity;
        let winner: string | null = null;

        for (const vehicle of spacedVehicles) {
          if (!vehicle.isActive || vehicle.isFinished || !activeIds.includes(vehicle.id) || vehicle.type !== "ambulance") continue;
          const distance = haversineDistance(sig.lat, sig.lng, vehicle.currentPos[0], vehicle.currentPos[1]);
          if (distance < minDist) {
            minDist = distance;
            winner = vehicle.id;
          }
        }

        const previousSignal = previousById.get(sig.id);
        if (minDist <= GREEN_THRESHOLD_KM && winner) {
          return { ...sig, status: "green" as const, priorityVehicle: winner, greenUntil: now + SIGNAL_RESET_DELAY_MS };
        }

        if ((previousSignal?.greenUntil ?? 0) > now) {
          return { ...sig, status: "green" as const, priorityVehicle: previousSignal?.priorityVehicle ?? null, greenUntil: previousSignal?.greenUntil ?? 0 };
        }

        return { ...sig, status: "red" as const, priorityVehicle: null, greenUntil: 0 };
      });

      const followId = followIdRef.current;
      if (followId && mapRef.current) {
        const followed = spacedVehicles.find(v => v.id === followId);
        if (followed?.isActive && !followed.isFinished) {
          const pos = followed.currentPos;
          const prev = lastFollowPos.current;
          if (!prev || Math.abs(prev[0] - pos[0]) > 0.0001 || Math.abs(prev[1] - pos[1]) > 0.0001) {
            lastFollowPos.current = pos;
            mapRef.current.setView(pos, Math.max(mapRef.current.getZoom(), 14), { animate: true, duration: 0.8, noMoveStart: true });
          }
        }
      }

      vehiclesRef.current = spacedVehicles;
      setVehicles([...spacedVehicles]);
      setSignals(newSignals);
      onVehiclesRef.current?.(spacedVehicles);
      onSignalsRef.current?.(newSignals);

      frameId = requestAnimationFrame(tick);
    };

    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [vehicles.length]);

  if (!mounted) return <div className="w-full h-full bg-background" />;

  const activeVehicles = vehicles.filter(v => activeVehicleIds.includes(v.id));
  const fireConfigs = VEHICLES_CONFIG.filter(c => c.type === "fire");

  return (
    <MapContainer center={MAP_CENTER} zoom={INITIAL_ZOOM} className="w-full h-full" zoomControl={false} preferCanvas>
      <MapRefSetter mapRef={mapRef} />
      <ZoomControl position="topright" />

      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; OpenStreetMap contributors'
      />

      {activeVehicles.map(v => (
        <Polyline key={`rf-${v.id}`} positions={v.route}
          color={v.color} weight={2.5} opacity={0.25} dashArray="8 6" />
      ))}

      {activeVehicles.map(v => {
        const pts: [number, number][] = Array.from({ length: 40 }, (_, i) =>
          interpolateRoute(v.route, (i / 39) * (v.progress / 100)));
        return <Polyline key={`rd-${v.id}`} positions={pts} color={v.color} weight={4.5} opacity={0.95} />;
      })}

      {signals.map(sig => (
        <Marker key={sig.id} position={[sig.lat, sig.lng]}
          icon={createSignalIcon(sig.status, sig.priorityVehicle)} zIndexOffset={500}>
          <Popup>
            <div style={{ minWidth: 190, padding: "4px 2px" }}>
              <b style={{ display: "block", marginBottom: 6 }}>🚦 {sig.label}</b>
              <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
                <span style={{ width: 11, height: 11, borderRadius: "50%", display: "inline-block", background: sig.status === "green" ? "#22c55e" : "#ef4444", boxShadow: sig.status === "green" ? "0 0 8px #22c55e" : "0 0 8px #ef4444" }} />
                <b style={{ textTransform: "uppercase" }}>{sig.status}</b>
              </div>
              {sig.priorityVehicle && <div style={{ marginTop: 8, fontSize: 11, color: "#22c55e", fontWeight: 800, letterSpacing: "0.06em" }}>⚡ OVERRIDE — {sig.priorityVehicle}</div>}
            </div>
          </Popup>
        </Marker>
      ))}

      {hospitals?.map(hosp => {
        const isTarget = activeVehicles.some(v => v.type === "ambulance" && v.destinationName === hosp.name);
        return (
          <Marker key={`h-${hosp.id}`} position={[hosp.lat, hosp.lng]}
            icon={createHospitalIcon(isTarget)} zIndexOffset={300}>
            <Popup>
              <div style={{ minWidth: 190, padding: "4px 2px" }}>
                <b style={{ display: "block", marginBottom: 6 }}>🏥 {hosp.name}</b>
                <div style={{ fontSize: 13 }}>Available Beds: <b>{hosp.availableBeds}</b></div>
                {isTarget && <div style={{ marginTop: 8, fontSize: 11, color: "#22d3ee", fontWeight: 800 }}>📍 NEAREST DESTINATION</div>}
              </div>
            </Popup>
          </Marker>
        );
      })}

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

      {fireConfigs.map(cfg => (
        <Circle key={`fc-${cfg.id}`} center={cfg.incidentPos!} radius={140}
          pathOptions={{ color: "#ef4444", fillColor: "#ef4444", fillOpacity: 0.1, weight: 1.5, dashArray: "5 4" }} />
      ))}

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
                <div><span style={{ color: "#64748b" }}>Traveled</span><br /><b>{v.distanceTraveled.toFixed(2)} km</b></div>
                <div><span style={{ color: "#64748b" }}>Remaining</span><br /><b>{(v.totalDistance - v.distanceTraveled).toFixed(2)} km</b></div>
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
