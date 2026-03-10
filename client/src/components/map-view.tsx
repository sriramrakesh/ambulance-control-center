import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import { useAmbulances } from "@/hooks/use-ambulances";
import { useTrafficLights } from "@/hooks/use-traffic-lights";
import { useHospitals } from "@/hooks/use-hospitals";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";

// Generate HTML for map icons so we don't need heavy react-dom/server rendering
const createAmbulanceIcon = (status: string) => {
  const isEmergency = status === 'en-route' || status === 'responding';
  const colorClass = isEmergency ? 'text-destructive border-destructive shadow-[0_0_15px_rgba(220,38,38,0.5)] bg-destructive/20' : 'text-primary border-primary shadow-[0_0_15px_rgba(6,182,212,0.3)] bg-primary/20';
  const pulseClass = isEmergency ? 'animate-pulse' : '';
  
  return L.divIcon({
    className: 'bg-transparent border-none',
    html: `
      <div class="relative flex items-center justify-center w-10 h-10 rounded-full border-2 ${colorClass} backdrop-blur-sm ${pulseClass}">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <rect width="16" height="16" x="4" y="4" rx="2"/><path d="M12 8v8"/><path d="M8 12h8"/>
        </svg>
      </div>
    `,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
  });
};

const createTrafficLightIcon = (status: string, override: boolean) => {
  let lightColor = 'bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.8)]';
  if (status === 'green') lightColor = 'bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.8)]';
  if (status === 'yellow') lightColor = 'bg-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.8)]';
  
  const overrideBorder = override ? 'border-primary ring-2 ring-primary shadow-[0_0_20px_rgba(6,182,212,0.5)]' : 'border-slate-600';
  
  return L.divIcon({
    className: 'bg-transparent border-none',
    html: `
      <div class="relative flex flex-col items-center justify-center p-1.5 w-8 h-8 rounded-full bg-slate-900 border-2 ${overrideBorder} transition-all duration-300">
        <div class="w-4 h-4 rounded-full ${lightColor} ${override ? 'animate-pulse' : ''}"></div>
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

export function MapView() {
  const { data: ambulances, isLoading: loadingAmbulances } = useAmbulances();
  const { data: trafficLights, isLoading: loadingLights } = useTrafficLights();
  const { data: hospitals, isLoading: loadingHospitals } = useHospitals();
  const [mounted, setMounted] = useState(false);

  // New York City center default
  const defaultCenter: [number, number] = [40.7128, -74.0060];

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return <div className="flex-1 bg-background" />;

  const isLoading = loadingAmbulances || loadingLights || loadingHospitals;

  return (
    <div className="relative w-full h-full">
      {isLoading && (
        <div className="absolute inset-0 z-[1000] bg-background/50 backdrop-blur-sm flex items-center justify-center">
          <Loader2 className="w-10 h-10 text-primary animate-spin" />
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
        center={defaultCenter} 
        zoom={13} 
        className="w-full h-full z-0 bg-background"
        zoomControl={false}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        />

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

        {ambulances?.map(ambulance => (
          <Marker 
            key={`a-${ambulance.id}`} 
            position={[ambulance.lat, ambulance.lng]}
            icon={createAmbulanceIcon(ambulance.status)}
            zIndexOffset={1000} // Keep ambulances on top
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
        ))}
      </MapContainer>
    </div>
  );
}
