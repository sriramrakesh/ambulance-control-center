import { useState } from "react";
import { Layout } from "@/components/layout";
import { useAlerts, useCreateAlert } from "@/hooks/use-alerts";
import { format } from "date-fns";
import { 
  ShieldCheck, 
  AlertTriangle, 
  AlertCircle, 
  Info,
  Plus,
  Loader2
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

export default function AlertsPage() {
  const { data: alerts, isLoading } = useAlerts();
  const createAlert = useCreateAlert();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    severity: "warning"
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createAlert.mutate(formData, {
      onSuccess: () => {
        setOpen(false);
        setFormData({ title: "", description: "", severity: "warning" });
        toast({
          title: "Alert Dispatch Broadcasted",
          description: "Emergency grid updated successfully.",
        });
      },
      onError: (err) => {
        toast({
          title: "Broadcast Failed",
          description: err.message,
          variant: "destructive",
        });
      }
    });
  };

  const getSeverityIcon = (severity: string) => {
    switch(severity) {
      case 'critical': return <AlertTriangle className="w-5 h-5 text-destructive" />;
      case 'warning': return <AlertCircle className="w-5 h-5 text-amber-500" />;
      default: return <Info className="w-5 h-5 text-primary" />;
    }
  };

  const getSeverityStyle = (severity: string) => {
    switch(severity) {
      case 'critical': return 'border-destructive/50 bg-destructive/10 text-destructive';
      case 'warning': return 'border-amber-500/50 bg-amber-500/10 text-amber-500';
      default: return 'border-primary/50 bg-primary/10 text-primary';
    }
  };

  return (
    <Layout>
      <div className="p-6 md:p-8 max-w-6xl mx-auto h-full flex flex-col">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-4">
          <div>
            <h1 className="font-display text-4xl font-bold uppercase tracking-wider mb-2 neon-text">System Alerts</h1>
            <p className="text-muted-foreground font-mono text-sm">MONITORING EMERGENCY GRID PROTOCOLS</p>
          </div>
          
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90 neon-border rounded-xl">
                <Plus className="w-4 h-4" />
                Trigger Manual Alert
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md border-white/10 bg-card/95 backdrop-blur-xl">
              <DialogHeader>
                <DialogTitle className="font-display text-2xl uppercase tracking-wider text-foreground">Initiate Alert Broadcast</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Incident Title</Label>
                  <Input 
                    id="title" 
                    required 
                    placeholder="e.g. Multi-vehicle collision"
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                    className="bg-background border-white/10"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Details / Coordinates</Label>
                  <Input 
                    id="description" 
                    required 
                    placeholder="Intersection 4A blocked..."
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    className="bg-background border-white/10"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Severity Level</Label>
                  <Select 
                    value={formData.severity} 
                    onValueChange={(val) => setFormData({...formData, severity: val})}
                  >
                    <SelectTrigger className="bg-background border-white/10">
                      <SelectValue placeholder="Select severity" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="info">Info</SelectItem>
                      <SelectItem value="warning">Warning</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button 
                  type="submit" 
                  className="w-full mt-6 neon-border"
                  disabled={createAlert.isPending}
                >
                  {createAlert.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Broadcast to Grid
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="flex-1 overflow-auto rounded-2xl glass-panel p-2">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-64 text-primary gap-4">
              <Loader2 className="w-8 h-8 animate-spin" />
              <p className="font-mono text-sm tracking-widest animate-pulse">DECRYPTING LOGS...</p>
            </div>
          ) : !alerts || alerts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground gap-4">
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                <ShieldCheck className="w-8 h-8 text-emerald-500" />
              </div>
              <p className="font-display text-xl uppercase tracking-widest text-emerald-500/80">All Systems Nominal</p>
            </div>
          ) : (
            <div className="space-y-3 p-2">
              {alerts.map((alert) => (
                <div 
                  key={alert.id} 
                  className={`relative overflow-hidden flex flex-col sm:flex-row gap-4 p-5 rounded-xl border transition-all hover:bg-white/5 ${getSeverityStyle(alert.severity)}`}
                >
                  {alert.severity === 'critical' && (
                    <div className="absolute top-0 left-0 w-1 h-full bg-destructive animate-pulse"></div>
                  )}
                  
                  <div className="flex items-center gap-4 flex-1">
                    <div className="mt-1 sm:mt-0 p-2 rounded-lg bg-background/50 backdrop-blur-sm">
                      {getSeverityIcon(alert.severity)}
                    </div>
                    <div>
                      <h3 className="font-bold text-lg text-foreground tracking-wide">{alert.title}</h3>
                      <p className="text-muted-foreground mt-1">{alert.description}</p>
                    </div>
                  </div>
                  
                  <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between gap-2 border-t sm:border-t-0 border-white/10 pt-3 sm:pt-0 mt-2 sm:mt-0">
                    <Badge variant="outline" className={`uppercase ${getSeverityStyle(alert.severity)} border-opacity-50`}>
                      {alert.severity}
                    </Badge>
                    <span className="text-xs font-mono text-muted-foreground">
                      {alert.createdAt ? format(new Date(alert.createdAt), "HH:mm:ss · MMM dd") : "UNKNOWN"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
