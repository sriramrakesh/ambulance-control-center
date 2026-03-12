import { ReactNode, useState } from "react";
import { Link, useLocation } from "wouter";
import {
  Map,
  AlertTriangle,
  Activity,
  ActivitySquare,
  ShieldAlert,
  Menu,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

interface LayoutProps {
  children: ReactNode;
}

const navItems = [
  { name: "Live Map", path: "/", icon: Map },
  { name: "Alerts Log", path: "/alerts", icon: AlertTriangle },
  { name: "Analytics", path: "/analytics", icon: Activity },
];

export function Layout({ children }: LayoutProps) {
  const [location, navigate] = useLocation();
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const sectionPreview: Record<string, string[]> = {
    "/": ["Vehicle map", "Hospital markers", "Road routing"],
    "/alerts": ["Ambulance dispatched", "Fire engine responding", "Traffic signal cleared"],
    "/analytics": ["Active vehicles", "Avg response time", "Signals cleared", "Handled emergencies"],
  };

  const SidebarContent = ({ mobile = false }: { mobile?: boolean }) => (
    <div className="flex flex-col h-full bg-card/50 backdrop-blur-xl border-r border-white/5">
      <div className="p-5 flex items-center gap-3 border-b border-white/5">
        <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center border border-primary/30 shadow-[0_0_15px_rgba(6,182,212,0.3)]">
          <ActivitySquare className="text-primary w-6 h-6 animate-pulse" />
        </div>
        {(!sidebarCollapsed || mobile) && (
          <div>
            <h1 className="font-display font-bold text-xl tracking-wider text-foreground neon-text uppercase leading-none">S.A.D.S.</h1>
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Command Center</p>
          </div>
        )}

        {!mobile && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarCollapsed((prev) => !prev)}
            className="ml-auto text-muted-foreground hover:text-foreground"
          >
            {sidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4 -rotate-90" />}
          </Button>
        )}
      </div>

      <nav className="flex-1 px-3 py-4 space-y-2">
        {navItems.map((item) => {
          const isActive = location === item.path;
          const Icon = item.icon;
          const isCollapsed = collapsedSections[item.path] ?? false;
          const showLabel = !sidebarCollapsed || mobile;

          return (
            <div key={item.path} className="rounded-lg border border-white/5 bg-black/10 overflow-hidden">
              <button
                onClick={() => {
                  if (!showLabel) {
                    navigate(item.path);
                    return;
                  }
                  setCollapsedSections((prev) => ({ ...prev, [item.path]: !isCollapsed }));
                }}
                className={`w-full flex items-center ${showLabel ? "justify-between" : "justify-center"} px-3 py-2.5 transition-colors ${isActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-white/5"}`}
              >
                <span className="flex items-center gap-3">
                  <Icon className="w-4 h-4" />
                  {showLabel && <span className="font-medium tracking-wide text-sm">{item.name}</span>}
                </span>
                {showLabel && (isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />)}
              </button>

              {showLabel && !isCollapsed && (
                <div className="px-3 pb-3">
                  <Link href={item.path} className="block text-xs text-muted-foreground hover:text-primary transition-colors pl-7">
                    Open section
                  </Link>
                  <ul className="mt-2 pl-7 space-y-1">
                    {sectionPreview[item.path]?.map((label) => (
                      <li key={label} className="text-[10px] text-muted-foreground/90 tracking-wide">• {label}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {(!sidebarCollapsed || mobile) && (
        <div className="p-4 border-t border-white/5">
        <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-3 flex items-start gap-3">
          <ShieldAlert className="text-destructive w-5 h-5 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-semibold text-destructive uppercase tracking-wider">System Status</h4>
            <p className="text-xs text-muted-foreground mt-1">All monitoring nodes active. Auto-override engaged.</p>
          </div>
        </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen flex bg-background text-foreground overflow-hidden">
      <aside className={`hidden md:block ${sidebarCollapsed ? "w-20" : "w-72"} h-screen fixed z-20 transition-all duration-300`}>
        <SidebarContent />
      </aside>

      <main className={`flex-1 ${sidebarCollapsed ? "md:pl-20" : "md:pl-72"} h-screen flex flex-col relative z-10 transition-all duration-300`}>
        <header className="md:hidden h-16 glass-panel border-b border-white/10 flex items-center justify-between px-4 z-30 relative">
          <div className="flex items-center gap-2">
            <ActivitySquare className="text-primary w-6 h-6" />
            <h1 className="font-display font-bold text-lg tracking-wider">S.A.D.S.</h1>
          </div>
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="text-foreground">
                <Menu className="w-6 h-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-72 bg-card border-r-white/10">
              <SidebarContent mobile />
            </SheetContent>
          </Sheet>
        </header>

        <div className="flex-1 overflow-auto relative">{children}</div>
      </main>
    </div>
  );
}
