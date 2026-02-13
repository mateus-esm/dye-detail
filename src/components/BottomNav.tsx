import { CalendarDays, Users, DollarSign, RotateCcw } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

const tabs = [
  { path: "/", icon: CalendarDays, label: "Agenda" },
  { path: "/clientes", icon: Users, label: "Clientes" },
  { path: "/retornos", icon: RotateCcw, label: "Retornos" },
  { path: "/financeiro", icon: DollarSign, label: "Financeiro" },
];

const BottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-card">
      <div className="mx-auto flex max-w-lg">
        {tabs.map((tab) => {
          const active = location.pathname === tab.path;
          return (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              className={cn(
                "flex flex-1 flex-col items-center gap-1 py-3 text-xs transition-colors",
                active ? "text-primary font-semibold" : "text-muted-foreground"
              )}
            >
              <tab.icon className={cn("h-5 w-5", active && "text-primary")} />
              {tab.label}
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
