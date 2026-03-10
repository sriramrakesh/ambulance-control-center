import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { 
  Map, 
  AlertTriangle, 
  Activity, 
  ActivitySquare,
  ShieldAlert,
  Menu
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
  const [location] = useLocation();

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-card/50 backdrop-blur-xl border-r border-white/5">
      <div className="p-6 flex items-center gap-3 border-b border-white/5">
        <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center border border-primary/30 shadow-[0_0_15px_rgba(6,182,212,0.3)]">
          <ActivitySquare className="text-primary w-6 h-6 animate-pulse" />
        </div>
        <div>
          <h1 className="font-display font-bold text-xl tracking-wider text-foreground neon-text uppercase leading-none">
            S.A.D.S.
          </h1>
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest">
            Command Center
          </p>
        </div>
      </div>

      <nav className="flex-1 px-4 py-6 space-y-2">
        {navItems.map((item) => {
          const isActive = location === item.path;
          const Icon = item.icon;
          
          return (
            <Link key={item.path} href={item.path} className="block">
              <div className={`
                flex items-center gap-4 px-4 py-3 rounded-lg transition-all duration-300
                ${isActive 
                  ? 'bg-primary/10 text-primary border border-primary/20 shadow-[inset_0_0_20px_rgba(6,182,212,0.1)]' 
                  : 'text-muted-foreground hover:bg-white/5 hover:text-foreground border border-transparent'
                }
              `}>
                <Icon className={`w-5 h-5 ${isActive ? 'drop-shadow-[0_0_8px_rgba(6,182,212,0.8)]' : ''}`} />
                <span className="font-medium tracking-wide">{item.name}</span>
              </div>
            </Link>
          );
        })}
      </nav>

      <div className="p-6 border-t border-white/5">
        <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4 flex items-start gap-3">
          <ShieldAlert className="text-destructive w-5 h-5 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-semibold text-destructive uppercase tracking-wider">System Status</h4>
            <p className="text-xs text-muted-foreground mt-1">All monitoring nodes active. Auto-override engaged.</p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-background text-foreground overflow-hidden">
      {/* Desktop Sidebar */}
      <aside className="hidden md:block w-72 h-screen fixed z-20">
        <SidebarContent />
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 md:pl-72 h-screen flex flex-col relative z-10">
        {/* Mobile Header */}
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
              <SidebarContent />
            </SheetContent>
          </Sheet>
        </header>

        <div className="flex-1 overflow-auto relative">
          {children}
        </div>
      </main>
    </div>
  );
}
