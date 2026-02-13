import { useState, useEffect } from "react";
import { differenceInDays, format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, AlertTriangle, Clock } from "lucide-react";

interface ClientReturn {
  id: string;
  name: string;
  phone: string | null;
  return_days: number;
  last_appointment: string | null;
  days_since: number;
  overdue: boolean;
}

const Returns = () => {
  const { user } = useAuth();
  const [returns, setReturns] = useState<ClientReturn[]>([]);

  useEffect(() => {
    if (user) fetchReturns();
  }, [user]);

  const fetchReturns = async () => {
    const { data: clients } = await supabase.from("clients").select("*");
    if (!clients) return;

    const results: ClientReturn[] = [];

    for (const c of clients) {
      const { data: appts } = await supabase
        .from("appointments")
        .select("appointment_date")
        .eq("client_id", c.id)
        .eq("status", "atendido")
        .order("appointment_date", { ascending: false })
        .limit(1);

      const lastDate = appts?.[0]?.appointment_date || null;
      const daysSince = lastDate ? differenceInDays(new Date(), new Date(lastDate + "T12:00:00")) : 999;
      const overdue = daysSince >= (c.return_days || 30);

      if (lastDate && overdue) {
        results.push({
          id: c.id,
          name: c.name,
          phone: c.phone,
          return_days: c.return_days || 30,
          last_appointment: lastDate,
          days_since: daysSince,
          overdue,
        });
      }
    }

    results.sort((a, b) => b.days_since - a.days_since);
    setReturns(results);
  };

  const openWhatsApp = (phone: string, name: string) => {
    const cleanPhone = phone.replace(/\D/g, "");
    const fullPhone = cleanPhone.startsWith("55") ? cleanPhone : `55${cleanPhone}`;
    const message = encodeURIComponent(`Olá ${name}! Tudo bem? Faz um tempo que não te vejo por aqui. Que tal agendar um horário? 💈`);
    window.open(`https://wa.me/${fullPhone}?text=${message}`, "_blank");
  };

  return (
    <div className="pb-20">
      <header className="sticky top-0 z-40 border-b bg-card px-4 py-3">
        <div className="mx-auto max-w-lg">
          <h1 className="text-lg font-bold">🔁 Retornos</h1>
          <p className="text-sm text-muted-foreground">Clientes que passaram do prazo de retorno</p>
        </div>
      </header>

      <div className="mx-auto max-w-lg space-y-3 px-4 pt-4">
        {returns.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              <Clock className="mx-auto mb-2 h-8 w-8 opacity-50" />
              <p>Nenhum cliente pendente de retorno</p>
            </CardContent>
          </Card>
        ) : (
          returns.map((r) => (
            <Card key={r.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold">{r.name}</p>
                    <div className="mt-1 flex items-center gap-2">
                      <Badge variant="destructive" className="flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        {r.days_since} dias
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        (retorno: {r.return_days}d)
                      </span>
                    </div>
                    {r.last_appointment && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        Último: {format(new Date(r.last_appointment + "T12:00:00"), "dd/MM/yyyy")}
                      </p>
                    )}
                  </div>
                  {r.phone && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1 text-accent border-accent hover:bg-accent hover:text-accent-foreground"
                      onClick={() => openWhatsApp(r.phone!, r.name)}
                    >
                      <MessageCircle className="h-4 w-4" />
                      WhatsApp
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default Returns;
