import { useState, useEffect } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, DollarSign, ChevronLeft, ChevronRight, Check, X, UserCheck, Clock } from "lucide-react";
import AppointmentForm from "@/components/AppointmentForm";
import { toast } from "@/hooks/use-toast";

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  agendado: { label: "Agendado", variant: "outline" },
  confirmado: { label: "Confirmado", variant: "secondary" },
  atendido: { label: "Atendido", variant: "default" },
  faltou: { label: "Faltou", variant: "destructive" },
  cancelado: { label: "Cancelado", variant: "destructive" },
};

const Index = () => {
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [appointments, setAppointments] = useState<any[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<any>(null);
  const [dailyTotal, setDailyTotal] = useState(0);

  const fetchAppointments = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("appointments")
      .select("*")
      .eq("appointment_date", selectedDate)
      .order("appointment_time");
    if (data) {
      setAppointments(data);
      setDailyTotal(
        data.filter((a) => a.status === "atendido").reduce((sum, a) => sum + Number(a.price), 0)
      );
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, [selectedDate, user]);

  const changeDate = (delta: number) => {
    const d = new Date(selectedDate + "T12:00:00");
    d.setDate(d.getDate() + delta);
    setSelectedDate(format(d, "yyyy-MM-dd"));
  };

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("appointments").update({ status }).eq("id", id);
    if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
    else fetchAppointments();
  };

  const handleEdit = (appt: any) => {
    setEditingAppointment(appt);
    setFormOpen(true);
  };

  const formattedDate = format(new Date(selectedDate + "T12:00:00"), "EEEE, dd 'de' MMMM", { locale: ptBR });

  return (
    <div className="pb-20">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b bg-card px-4 py-3">
        <div className="mx-auto flex max-w-lg items-center justify-between">
          <h1 className="text-lg font-bold">📅 Agenda</h1>
          <div className="flex items-center gap-2 rounded-lg bg-primary/10 px-3 py-1.5">
            <DollarSign className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold text-primary">
              R$ {dailyTotal.toFixed(2)}
            </span>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-lg px-4 pt-4">
        {/* Date Navigation */}
        <div className="mb-4 flex items-center justify-between rounded-xl bg-card p-3 shadow-sm">
          <Button variant="ghost" size="icon" onClick={() => changeDate(-1)}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div className="text-center">
            <p className="text-sm font-medium capitalize">{formattedDate}</p>
          </div>
          <Button variant="ghost" size="icon" onClick={() => changeDate(1)}>
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>

        {/* Appointments */}
        <div className="space-y-3">
          {appointments.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                <Clock className="mx-auto mb-2 h-8 w-8 opacity-50" />
                <p>Nenhum agendamento para este dia</p>
              </CardContent>
            </Card>
          ) : (
            appointments.map((appt) => (
              <Card key={appt.id} className="overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-semibold">{appt.appointment_time?.slice(0, 5)}</span>
                        <Badge variant={statusConfig[appt.status]?.variant || "outline"}>
                          {statusConfig[appt.status]?.label || appt.status}
                        </Badge>
                      </div>
                      <p className="mt-1 font-medium">{appt.client_name}</p>
                      <p className="text-sm text-muted-foreground">{appt.service}</p>
                      <p className="mt-1 text-sm font-semibold text-primary">R$ {Number(appt.price).toFixed(2)}</p>
                    </div>
                    <div className="flex flex-col gap-1">
                      {appt.status !== "atendido" && appt.status !== "cancelado" && (
                        <>
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-accent" onClick={() => updateStatus(appt.id, "atendido")} title="Atendido">
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => updateStatus(appt.id, "faltou")} title="Faltou">
                            <X className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handleEdit(appt)} title="Editar">
                        <UserCheck className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* FAB */}
        <Button
          onClick={() => { setEditingAppointment(null); setFormOpen(true); }}
          className="fixed bottom-20 right-4 h-14 w-14 rounded-full shadow-lg"
          size="icon"
        >
          <Plus className="h-6 w-6" />
        </Button>
      </div>

      <AppointmentForm
        open={formOpen}
        onOpenChange={setFormOpen}
        onSuccess={fetchAppointments}
        appointment={editingAppointment}
        selectedDate={selectedDate}
      />
    </div>
  );
};

export default Index;
