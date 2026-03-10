import { useEffect, useState, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline } from "react-leaflet";
import L from "leaflet";
import { useAmbulances } from "@/hooks/use-ambulances";
import { useTrafficLights } from "@/hooks/use-traffic-lights";
import { useHospitals } from "@/hooks/use-hospitals";
import { Badge } from "@/components/ui/badge";
import { Loader2, Navigation, MapPin } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";

// Helper to calculate distance between two coordinates (in miles)
function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3959; // Earth's radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// Generate HTML for map icons so we don't need heavy react-dom/server rendering
const createAmbulanceIcon = (status: string, direction: number = 0) => {
  const isEmergency = status === 'en-route' || status === 'responding';
  const colorClass = isEmergency ? 'text-destructive border-destructive shadow-[0_0_15px_rgba(220,38,38,0.5)] bg-destructive/20' : 'text-primary border-primary shadow-[0_0_15px_rgba(6,182,212,0.3)] bg-primary/20';
  const pulseClass = isEmergency ? 'animate-pulse' : '';
  
  return L.divIcon({
    className: 'bg-transparent border-none',
    html: `
      <div class="relative flex items-center justify-center w-10 h-10 rounded-full border-2 ${colorClass} backdrop-blur-sm ${pulseClass}" style="transform: rotate(${direction}deg)">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 2L12 22M12 2L8 6M12 2L16 6"/>
        </svg>
      </div>
    `,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
  });
};

const createTrafficLightIcon = (status: string, override: boolean) => {
  let lightColor = 'bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.8)]';
  let glowClass = '';
  if (status === 'green') {
    lightColor = 'bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.8)]';
    glowClass = 'animate-pulse shadow-lg shadow-emerald-500/50';
  }
  if (status === 'yellow') lightColor = 'bg-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.8)]';
  
  const overrideBorder = override ? 'border-primary ring-2 ring-primary shadow-[0_0_20px_rgba(6,182,212,0.5)]' : 'border-slate-600';
  
  return L.divIcon({
    className: 'bg-transparent border-none',
    html: `
      <div class="relative flex flex-col items-center justify-center p-1.5 w-8 h-8 rounded-full bg-slate-900 border-2 ${overrideBorder} transition-all duration-300">
        <div class="w-4 h-4 rounded-full ${lightColor} ${glowClass}"></div>
        ${override ? '<div class="absolute -top-1 -right-1 w-3 h-3 bg-primary rounded-full animate-ping"></div>' : ''}
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
};

const createHospitalIcon = () => {
  return L.divIcon({
    className: 'bg-transparent border-none',
    html: `
      <div class="relative flex items-center justify-center w-12 h-12 bg-slate-800 rounded-xl border-2 border-slate-500 shadow-xl overflow-hidden">
        <div class="absolute inset-0 bg-blue-500/10"></div>
        <b class="text-blue-400 text-xl font-display font-bold">H</b>
      </div>
    `,
    iconSize: [48, 48],
    iconAnchor: [24, 24],
  });
};

// Map controller component for camera following
function MapController({ center, zoom }: { center?: [number, number]; zoom?: number }) {
  const map = useMap();
  
  useEffect(() => {
    if (center) {
      map.setView(center, zoom ?? 15, { animate: true, duration: 0.5 });
    }
  }, [center, zoom, map]);
  
  return null;
}

export function MapView() {
  const { data: ambulances, isLoading: loadingAmbulances } = useAmbulances();
  const { data: trafficLights, isLoading: loadingLights } = useTrafficLights();
  const { data: hospitals, isLoading: loadingHospitals } = useHospitals();
  const [mounted, setMounted] = useState(false);
  const [animatedAmbulance, setAnimatedAmbulance] = useState<any>(null);
  const [route, setRoute] = useState<[number, number][]>([]);
  const [metrics, setMetrics] = useState<{ speed: number; distance: number; eta: string; progress: number }>({
    speed: 0,
    distance: 0,
    eta: '--:--',
    progress: 0,
  });
  const [mapCenter, setMapCenter] = useState<[number, number]>([40.7128, -74.0060]);
  const animationRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const queryClient = useQueryClient();

  // New York City center default
  const defaultCenter: [number, number] = [40.7128, -74.0060];

  // Mutation to update traffic light status
  const updateTrafficLight = useMutation({
    mutationFn: async (data: { id: number; status: string; overrideActive: boolean }) => {
      const res = await fetch(api.trafficLights.update.path.replace(':id', data.id.toString()), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: data.status, overrideActive: data.overrideActive }),
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to update traffic light');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.trafficLights.list.path] });
    },
  });

  // Initialize animation when ambulances and hospitals load
  useEffect(() => {
    if (!ambulances || ambulances.length === 0 || !hospitals || hospitals.length === 0) return;
    
    const activeAmbulance = ambulances.find(a => a.status === 'en-route');
    if (!activeAmbulance) return;

    // Choose destination hospital (first one for demo)
    const destination = hospitals[0];
    
    // Generate route with intermediate traffic lights
    const routePoints: [number, number][] = [[activeAmbulance.lat, activeAmbulance.lng]];
    
    // Add traffic light points along the route
    const relevantLights = trafficLights?.filter(light => {
      const distToStart = haversineDistance(activeAmbulance.lat, activeAmbulance.lng, light.lat, light.lng);
      const distToEnd = haversineDistance(light.lat, light.lng, destination.lat, destination.lng);
      return distToStart < 2 && distToEnd < 2; // Lights within 2 miles of route
    }) || [];

    relevantLights.forEach(light => {
      routePoints.push([light.lat, light.lng]);
    });
    
    routePoints.push([destination.lat, destination.lng]);
    
    setRoute(routePoints);
    setAnimatedAmbulance({
      id: activeAmbulance.id,
      vehicleId: activeAmbulance.vehicleId,
      startPos: [activeAmbulance.lat, activeAmbulance.lng] as [number, number],
      endPos: [destination.lat, destination.lng] as [number, number],
      destination: destination,
      lights: relevantLights,
      speed: 45,
      baseSpeed: 45,
    });
    
    startTimeRef.current = Date.now();
  }, [ambulances, hospitals, trafficLights]);

  // Animation loop
  useEffect(() => {
    if (!animatedAmbulance || route.length < 2) return;

    const animate = () => {
      const elapsed = (Date.now() - startTimeRef.current) / 1000; // seconds
      const duration = 30; // 30 second animation
      let progress = Math.min(elapsed / duration, 1);
      
      // Get current position along route
      let currentPos = animatedAmbulance.startPos;
      let traveledDistance = 0;
      let segmentIndex = 0;

      // Calculate position along multi-segment route
      const totalDistance = haversineDistance(
        animatedAmbulance.startPos[0],
        animatedAmbulance.startPos[1],
        animatedAmbulance.endPos[0],
        animatedAmbulance.endPos[1]
      );

      // Interpolate along route segments
      let distanceToTravel = progress * totalDistance;
      for (let i = 0; i < route.length - 1; i++) {
        const segmentDist = haversineDistance(route[i][0], route[i][1], route[i + 1][0], route[i + 1][1]);
        if (distanceToTravel <= segmentDist) {
          const segmentProgress = distanceToTravel / segmentDist;
          currentPos = [
            route[i][0] + (route[i + 1][0] - route[i][0]) * segmentProgress,
            route[i][1] + (route[i + 1][1] - route[i][1]) * segmentProgress,
          ] as [number, number];
          break;
        }
        distanceToTravel -= segmentDist;
      }

      const remainingDistance = totalDistance * (1 - progress);
      const eta = new Date(Date.now() + (remainingDistance / animatedAmbulance.baseSpeed) * 3600000);
      const etaStr = eta.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

      setMetrics({
        speed: animatedAmbulance.baseSpeed,
        distance: totalDistance * progress,
        eta: etaStr,
        progress: progress * 100,
      });

      setAnimatedAmbulance(prev => ({
        ...prev,
        currentPos,
      }));

      setMapCenter(currentPos);

      // Check proximity to traffic lights and update status
      animatedAmbulance.lights.forEach(light => {
        const dist = haversineDistance(currentPos[0], currentPos[1], light.lat, light.lng);
        const shouldGreen = dist < 0.15; // 0.15 miles (about 800 feet)
        
        if (shouldGreen && light.status !== 'green') {
          updateTrafficLight.mutate({
            id: light.id,
            status: 'green',
            overrideActive: true,
          });
        } else if (!shouldGreen && light.status === 'green' && light.overrideActive) {
          updateTrafficLight.mutate({
            id: light.id,
            status: 'red',
            overrideActive: false,
          });
        }
      });

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      }
    };

    animationRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [animatedAmbulance, route]);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return <div className="flex-1 bg-background" />;

  const isLoading = loadingAmbulances || loadingLights || loadingHospitals;
  
  // Get the primary animated ambulance or first ambulance
  const displayAmbulance = animatedAmbulance || ambulances?.[0];

  return (
    <div className="relative w-full h-full">
      {isLoading && (
        <div className="absolute inset-0 z-[1000] bg-background/50 backdrop-blur-sm flex items-center justify-center">
          <Loader2 className="w-10 h-10 text-primary animate-spin" />
        </div>
      )}

      {/* Metrics Panel */}
      {displayAmbulance && (
        <div className="absolute top-6 right-6 z-[400] pointer-events-auto glass-panel p-4 rounded-xl max-w-sm">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Vehicle ID</span>
              <Badge variant="outline" className="font-mono">{displayAmbulance.vehicleId}</Badge>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-900/50 rounded-lg p-2">
                <p className="text-xs text-muted-foreground mb-1">Speed</p>
                <p className="text-lg font-bold font-mono">{Math.round(metrics.speed)} <span className="text-xs font-sans">mph</span></p>
              </div>
              <div className="bg-slate-900/50 rounded-lg p-2">
                <p className="text-xs text-muted-foreground mb-1">Distance</p>
                <p className="text-lg font-bold font-mono">{metrics.distance.toFixed(2)} <span className="text-xs font-sans">mi</span></p>
              </div>
            </div>
            <div className="bg-slate-900/50 rounded-lg p-2">
              <p className="text-xs text-muted-foreground mb-1">ETA</p>
              <p className="text-lg font-bold font-mono">{metrics.eta}</p>
            </div>
            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">Progress</span>
                <span className="text-xs font-mono font-semibold">{Math.round(metrics.progress)}%</span>
              </div>
              <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-primary to-destructive transition-all duration-300"
                  style={{ width: `${metrics.progress}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Map Header Overlay */}
      <div className="absolute top-6 left-6 right-6 z-[400] pointer-events-none flex justify-between items-start">
        <div className="glass-panel p-4 rounded-xl pointer-events-auto">
          <h2 className="font-display font-bold text-xl neon-text mb-1 uppercase tracking-widest">Live Sector Scan</h2>
          <div className="flex gap-4 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-destructive animate-pulse"></div> Active Responders</span>
            <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-primary"></div> Signals Overridden</span>
          </div>
        </div>
      </div>

      <MapContainer 
        center={mapCenter} 
        zoom={15} 
        className="w-full h-full z-0 bg-background"
        zoomControl={false}
      >
        <MapController center={mapCenter} zoom={15} />
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        />

        {/* Route Polyline */}
        {route.length > 1 && (
          <Polyline
            positions={route}
            color="rgb(6, 182, 212)"
            weight={3}
            opacity={0.7}
            dashArray="5, 5"
          />
        )}

        {hospitals?.map(hospital => (
          <Marker 
            key={`h-${hospital.id}`} 
            position={[hospital.lat, hospital.lng]}
            icon={createHospitalIcon()}
          >
            <Popup className="custom-popup">
              <div className="p-1">
                <h3 className="font-bold text-lg mb-1">{hospital.name}</h3>
                <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/10">
                  <span className="text-sm text-muted-foreground">Available Beds:</span>
                  <Badge variant={hospital.availableBeds > 5 ? "default" : "destructive"}>
                    {hospital.availableBeds}
                  </Badge>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}

        {trafficLights?.map(light => (
          <Marker 
            key={`tl-${light.id}`} 
            position={[light.lat, light.lng]}
            icon={createTrafficLightIcon(light.status, light.overrideActive)}
          >
            <Popup>
              <div className="p-1">
                <h3 className="font-bold mb-1">Intersection {light.intersection}</h3>
                <div className="space-y-2 mt-2">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Current State:</span>
                    <Badge className="uppercase" variant="outline">
                      <span className={`w-2 h-2 rounded-full mr-2 inline-block 
                        ${light.status === 'green' ? 'bg-emerald-500' : light.status === 'yellow' ? 'bg-amber-400' : 'bg-red-500'}`
                      }></span>
                      {light.status}
                    </Badge>
                  </div>
                  {light.overrideActive && (
                    <div className="bg-primary/20 text-primary px-3 py-1.5 rounded-md text-xs font-semibold uppercase tracking-wider text-center mt-2 animate-pulse">
                      Emergency Override Active
                    </div>
                  )}
                </div>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Animated Active Ambulance */}
        {animatedAmbulance && animatedAmbulance.currentPos && (
          <Marker 
            key={`a-animated-${animatedAmbulance.id}`} 
            position={animatedAmbulance.currentPos}
            icon={createAmbulanceIcon('en-route')}
            zIndexOffset={2000}
          >
            <Popup>
              <div className="p-2 min-w-[240px]">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="destructive" className="uppercase">
                    En Route
                  </Badge>
                  <span className="font-mono text-xs text-muted-foreground">ID: {animatedAmbulance.vehicleId}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 mt-3 text-sm border-t border-white/10 pt-3">
                  <div>
                    <span className="block text-xs text-muted-foreground mb-0.5">Speed</span>
                    <span className="font-bold font-mono text-lg">{Math.round(animatedAmbulance.baseSpeed)} <span className="text-xs font-sans text-muted-foreground font-normal">mph</span></span>
                  </div>
                  <div>
                    <span className="block text-xs text-muted-foreground mb-0.5">Progress</span>
                    <span className="font-bold font-mono text-lg">{Math.round(metrics.progress)}%</span>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-white/10">
                  <p className="text-xs text-muted-foreground mb-1">Destination: {animatedAmbulance.destination?.name}</p>
                  <p className="text-xs font-mono text-primary">ETA: {metrics.eta}</p>
                </div>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Other ambulances */}
        {ambulances?.map(ambulance => {
          // Skip the animated one
          if (animatedAmbulance && ambulance.id === animatedAmbulance.id) return null;
          
          return (
            <Marker 
              key={`a-${ambulance.id}`} 
              position={[ambulance.lat, ambulance.lng]}
              icon={createAmbulanceIcon(ambulance.status)}
              zIndexOffset={1000}
            >
              <Popup>
                <div className="p-1 min-w-[200px]">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant={ambulance.status === 'en-route' ? 'destructive' : 'default'} className="uppercase">
                      {ambulance.status.replace('-', ' ')}
                    </Badge>
                    <span className="font-mono text-xs text-muted-foreground">ID: {ambulance.vehicleId}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-3 text-sm border-t border-white/10 pt-3">
                    <div>
                      <span className="block text-xs text-muted-foreground mb-0.5">Speed</span>
                      <span className="font-bold font-mono text-lg">{ambulance.speed} <span className="text-xs font-sans text-muted-foreground font-normal">mph</span></span>
                    </div>
                    <div>
                      <span className="block text-xs text-muted-foreground mb-0.5">Vector</span>
                      <span className="font-bold font-mono">NNE</span>
                    </div>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}
