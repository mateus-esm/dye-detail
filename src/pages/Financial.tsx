import { useState, useEffect } from "react";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, TrendingUp, Calendar, Wallet } from "lucide-react";

const Financial = () => {
  const { user } = useAuth();
  const [dailyTotal, setDailyTotal] = useState(0);
  const [weeklyTotal, setWeeklyTotal] = useState(0);
  const [monthlyTotal, setMonthlyTotal] = useState(0);
  const [dailyCount, setDailyCount] = useState(0);
  const [weeklyCount, setWeeklyCount] = useState(0);
  const [monthlyCount, setMonthlyCount] = useState(0);

  useEffect(() => {
    if (user) fetchFinancials();
  }, [user]);

  const fetchFinancials = async () => {
    const today = new Date();
    const todayStr = format(today, "yyyy-MM-dd");
    const weekStart = format(startOfWeek(today, { weekStartsOn: 1 }), "yyyy-MM-dd");
    const weekEnd = format(endOfWeek(today, { weekStartsOn: 1 }), "yyyy-MM-dd");
    const monthStart = format(startOfMonth(today), "yyyy-MM-dd");
    const monthEnd = format(endOfMonth(today), "yyyy-MM-dd");

    // Daily
    const { data: daily } = await supabase
      .from("appointments")
      .select("price")
      .eq("appointment_date", todayStr)
      .eq("status", "atendido");

    if (daily) {
      setDailyTotal(daily.reduce((s, a) => s + Number(a.price), 0));
      setDailyCount(daily.length);
    }

    // Weekly
    const { data: weekly } = await supabase
      .from("appointments")
      .select("price")
      .gte("appointment_date", weekStart)
      .lte("appointment_date", weekEnd)
      .eq("status", "atendido");

    if (weekly) {
      setWeeklyTotal(weekly.reduce((s, a) => s + Number(a.price), 0));
      setWeeklyCount(weekly.length);
    }

    // Monthly
    const { data: monthly } = await supabase
      .from("appointments")
      .select("price")
      .gte("appointment_date", monthStart)
      .lte("appointment_date", monthEnd)
      .eq("status", "atendido");

    if (monthly) {
      setMonthlyTotal(monthly.reduce((s, a) => s + Number(a.price), 0));
      setMonthlyCount(monthly.length);
    }
  };

  const cards = [
    {
      title: "Hoje",
      icon: DollarSign,
      total: dailyTotal,
      count: dailyCount,
      subtitle: format(new Date(), "dd 'de' MMMM", { locale: ptBR }),
    },
    {
      title: "Esta Semana",
      icon: TrendingUp,
      total: weeklyTotal,
      count: weeklyCount,
      subtitle: `${format(startOfWeek(new Date(), { weekStartsOn: 1 }), "dd/MM")} - ${format(endOfWeek(new Date(), { weekStartsOn: 1 }), "dd/MM")}`,
    },
    {
      title: "Este Mês",
      icon: Calendar,
      total: monthlyTotal,
      count: monthlyCount,
      subtitle: format(new Date(), "MMMM yyyy", { locale: ptBR }),
    },
  ];

  return (
    <div className="pb-20">
      <header className="sticky top-0 z-40 border-b bg-card px-4 py-3">
        <div className="mx-auto max-w-lg">
          <h1 className="text-lg font-bold">💰 Financeiro</h1>
          <p className="text-sm text-muted-foreground">Resumo do seu faturamento</p>
        </div>
      </header>

      <div className="mx-auto max-w-lg space-y-4 px-4 pt-4">
        {cards.map((c) => (
          <Card key={c.title}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-medium">{c.title}</CardTitle>
                <c.icon className="h-5 w-5 text-primary" />
              </div>
              <p className="text-xs text-muted-foreground capitalize">{c.subtitle}</p>
            </CardHeader>
            <CardContent>
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-3xl font-bold text-primary">
                    R$ {c.total.toFixed(2)}
                  </p>
                </div>
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Wallet className="h-4 w-4" />
                  {c.count} atendimento{c.count !== 1 ? "s" : ""}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default Financial;
