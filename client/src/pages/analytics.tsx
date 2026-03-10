import { Layout } from "@/components/layout";
import { useAnalytics } from "@/hooks/use-analytics";
import { Card } from "@/components/ui/card";
import { Loader2, Zap, Clock, TrafficCone } from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from "recharts";

export default function AnalyticsPage() {
  const { data, isLoading } = useAnalytics();

  if (isLoading || !data) {
    return (
      <Layout>
        <div className="h-full w-full flex flex-col items-center justify-center text-primary gap-4">
          <Loader2 className="w-10 h-10 animate-spin" />
          <p className="font-mono tracking-[0.2em] animate-pulse">COMPILING TELEMETRY...</p>
        </div>
      </Layout>
    );
  }

  const kpis = [
    { 
      label: "Active Emergencies", 
      value: data.activeEmergencies, 
      icon: Zap, 
      color: "text-destructive", 
      bg: "bg-destructive/10 text-destructive border-destructive/20" 
    },
    { 
      label: "Avg Response Time", 
      value: `${data.averageResponseTime}m`, 
      icon: Clock, 
      color: "text-primary", 
      bg: "bg-primary/10 text-primary border-primary/20" 
    },
    { 
      label: "Intersections Cleared", 
      value: data.intersectionsCleared, 
      icon: TrafficCone, 
      color: "text-emerald-500", 
      bg: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" 
    }
  ];

  return (
    <Layout>
      <div className="p-6 md:p-8 max-w-7xl mx-auto h-full flex flex-col gap-6">
        <div>
          <h1 className="font-display text-4xl font-bold uppercase tracking-wider mb-2 neon-text">Analytics Core</h1>
          <p className="text-muted-foreground font-mono text-sm">HISTORICAL & REAL-TIME FLEET TELEMETRY</p>
        </div>

        {/* KPI Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {kpis.map((kpi, i) => {
            const Icon = kpi.icon;
            return (
              <div key={i} className={`glass-panel rounded-2xl p-6 relative overflow-hidden group`}>
                <div className="absolute top-0 right-0 p-4 opacity-10 transform translate-x-4 -translate-y-4 group-hover:scale-110 transition-transform duration-500">
                  <Icon className={`w-24 h-24 ${kpi.color}`} />
                </div>
                <div className="relative z-10">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center border mb-4 ${kpi.bg}`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-1">{kpi.label}</p>
                  <h3 className="font-display text-4xl font-bold text-foreground">{kpi.value}</h3>
                </div>
              </div>
            );
          })}
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1 min-h-[400px]">
          {/* Response Time Chart */}
          <div className="glass-panel rounded-2xl p-6 flex flex-col">
            <h3 className="font-display text-xl font-bold uppercase tracking-wider mb-6 flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary" />
              Response Times (Last 24h)
            </h3>
            <div className="flex-1 w-full min-h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.responseTimeData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis 
                    dataKey="time" 
                    stroke="hsl(var(--muted-foreground))" 
                    fontSize={12} 
                    tickMargin={10} 
                  />
                  <YAxis 
                    stroke="hsl(var(--muted-foreground))" 
                    fontSize={12} 
                    tickFormatter={(val) => `${val}m`} 
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                    itemStyle={{ color: 'hsl(var(--primary))' }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="value" 
                    name="Minutes"
                    stroke="hsl(var(--primary))" 
                    strokeWidth={3}
                    dot={{ fill: 'hsl(var(--background))', stroke: 'hsl(var(--primary))', strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6, fill: 'hsl(var(--primary))', stroke: 'hsl(var(--background))' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Incidents Chart */}
          <div className="glass-panel rounded-2xl p-6 flex flex-col">
            <h3 className="font-display text-xl font-bold uppercase tracking-wider mb-6 flex items-center gap-2">
              <Zap className="w-5 h-5 text-destructive" />
              Incident Frequency
            </h3>
            <div className="flex-1 w-full min-h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.dailyIncidents} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis 
                    dataKey="date" 
                    stroke="hsl(var(--muted-foreground))" 
                    fontSize={12} 
                    tickMargin={10} 
                  />
                  <YAxis 
                    stroke="hsl(var(--muted-foreground))" 
                    fontSize={12} 
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                    itemStyle={{ color: 'hsl(var(--destructive))' }}
                    cursor={{ fill: 'hsl(var(--muted))', opacity: 0.4 }}
                  />
                  <Bar 
                    dataKey="count" 
                    name="Incidents"
                    fill="hsl(var(--destructive))" 
                    radius={[4, 4, 0, 0]}
                    maxBarSize={50}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
