import { useEffect, useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronDown, ChevronRight, Edit3, Instagram, Phone, Plus, Search, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import ClientForm from "@/components/ClientForm";
import ClientVisitSheet from "@/components/ClientVisitSheet";
import { BrandLogo, SoloVenturesBadge } from "@/components/BrandLogo";
import { cn } from "@/lib/utils";

const Clients = () => {
  const { user } = useAuth();
  const [clients, setClients] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<any>(null);
  const [visitClient, setVisitClient] = useState<any>(null);
  const [editingVisit, setEditingVisit] = useState<any>(null);
  const [visitSheetOpen, setVisitSheetOpen] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [history, setHistory] = useState<Record<string, any[]>>({});
  const [stats, setStats] = useState<Record<string, { total: number; last: string | null }>>({});

  const fetchClients = async () => {
    if (!user) return;
    let query = supabase.from("clients").select("*").order("name");
    if (search) query = query.ilike("name", `%${search}%`);

    const { data } = await query;
    if (!data) return;
    setClients(data);

    const { data: appointments } = await supabase
      .from("appointments")
      .select("client_id, appointment_date, status")
      .eq("status", "atendido");

    const nextStats: Record<string, { total: number; last: string | null }> = {};
    appointments?.forEach((appointment) => {
      if (!appointment.client_id) return;
      if (!nextStats[appointment.client_id]) nextStats[appointment.client_id] = { total: 0, last: null };
      nextStats[appointment.client_id].total += 1;
      if (!nextStats[appointment.client_id].last || appointment.appointment_date > nextStats[appointment.client_id].last) {
        nextStats[appointment.client_id].last = appointment.appointment_date;
      }
    });
    setStats(nextStats);
  };

  useEffect(() => {
    fetchClients();
  }, [user, search]);

  const refreshClientHistory = async (clientId: string) => {
    const { data } = await supabase
      .from("appointments")
      .select("*")
      .eq("client_id", clientId)
      .order("appointment_date", { ascending: false })
      .limit(20);

    setHistory((current) => ({ ...current, [clientId]: data || [] }));
    fetchClients();
  };

  const toggleExpand = async (id: string) => {
    if (expanded === id) {
      setExpanded(null);
      return;
    }

    setExpanded(id);
    if (!history[id]) await refreshClientHistory(id);
  };

  const openVisitSheet = (client: any, visit?: any) => {
    setVisitClient(client);
    setEditingVisit(visit || null);
    setVisitSheetOpen(true);
  };

  return (
    <div className="pb-24">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/85 px-4 py-3 backdrop-blur-xl">
        <div className="mx-auto max-w-3xl space-y-3">
          <div className="flex items-center justify-between gap-3">
            <BrandLogo size="sm" />
            <div className="flex items-center gap-3">
              <SoloVenturesBadge className="hidden origin-right scale-90 sm:flex" />
              <Badge variant="outline" className="text-xs">{clients.length} clientes</Badge>
            </div>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar cliente..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="bg-card pl-9"
            />
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-3xl space-y-2 px-4 pt-4">
        {clients.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-10 text-center text-muted-foreground">
              <p className="text-sm">Nenhum cliente cadastrado</p>
            </CardContent>
          </Card>
        ) : (
          clients.map((client) => {
            const clientStats = stats[client.id] || { total: 0, last: null };
            const isOpen = expanded === client.id;
            const visits = history[client.id] || [];

            return (
              <Card key={client.id} className="overflow-hidden border-border/60 transition-colors hover:border-primary/30">
                <button
                  onClick={() => toggleExpand(client.id)}
                  className="flex w-full items-center gap-3 p-4 text-left"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-brand text-sm font-bold text-primary-foreground">
                    {client.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{client.name}</p>
                    <div className="mt-0.5 flex items-center gap-3 text-xs text-muted-foreground">
                      {client.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{client.phone}</span>}
                      {client.instagram && <span className="flex items-center gap-1"><Instagram className="h-3 w-3" />{client.instagram}</span>}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-1 text-sm font-bold text-gradient-brand">
                      <Star className="h-3.5 w-3.5 fill-accent text-accent" />
                      {clientStats.total}
                    </div>
                    <p className="text-[10px] text-muted-foreground">visitas</p>
                  </div>
                  {isOpen ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                </button>

                {isOpen && (
                  <div className="border-t border-border/60 bg-secondary/20 p-4">
                    {client.notes && (
                      <div className="mb-3 rounded-md border border-warning/30 bg-warning/10 p-2 text-xs">
                        <span className="font-semibold text-warning">Obs. </span>{client.notes}
                      </div>
                    )}

                    <div className="mb-3 flex items-center justify-between gap-2">
                      <p className="text-xs uppercase tracking-wider text-muted-foreground">Historico</p>
                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openVisitSheet(client)}
                          className="h-7 gap-1 text-xs"
                        >
                          <Plus className="h-3 w-3" /> Visita
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => { setEditingClient(client); setFormOpen(true); }}
                          className="h-7 gap-1 text-xs"
                        >
                          <Edit3 className="h-3 w-3" /> Cliente
                        </Button>
                      </div>
                    </div>

                    {visits.length === 0 ? (
                      <p className="text-xs text-muted-foreground">Sem historico ainda</p>
                    ) : (
                      <ol className="relative space-y-3 border-l border-border/60 pl-4">
                        {visits.map((visit) => (
                          <li key={visit.id} className="relative">
                            <span className={cn(
                              "absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full",
                              visit.status === "atendido" ? "bg-success" : visit.status === "faltou" ? "bg-destructive" : "bg-muted-foreground"
                            )} />
                            <div className="flex items-start justify-between gap-3 text-xs">
                              <div className="min-w-0 flex-1">
                                <p className="truncate font-medium">{visit.service}</p>
                                <p className="text-muted-foreground">
                                  {format(new Date(`${visit.appointment_date}T12:00:00`), "dd MMM yyyy", { locale: ptBR })}
                                  {visit.appointment_time ? ` - ${visit.appointment_time.slice(0, 5)}` : ""}
                                </p>
                                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                                  <Badge variant="outline" className="h-5 px-1.5 text-[10px]">
                                    {visit.payment_status === "pendente" ? "Pendente" : "Pago"}
                                  </Badge>
                                  {visit.photo_url && (
                                    <Badge variant="outline" className="h-5 px-1.5 text-[10px]">Foto</Badge>
                                  )}
                                  {visit.observations && (
                                    <span className="max-w-[180px] truncate text-[10px] text-muted-foreground">
                                      {visit.observations}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="shrink-0 text-right">
                                <p className="font-semibold text-primary">R$ {Number(visit.price).toFixed(2)}</p>
                                {visit.satisfaction && (
                                  <div className="flex justify-end">
                                    {Array.from({ length: visit.satisfaction }).map((_, index) => (
                                      <Star key={index} className="h-2.5 w-2.5 fill-accent text-accent" />
                                    ))}
                                  </div>
                                )}
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => openVisitSheet(client, visit)}
                                  className="mt-1 h-6 px-2 text-[10px]"
                                >
                                  Editar
                                </Button>
                              </div>
                            </div>
                          </li>
                        ))}
                      </ol>
                    )}
                  </div>
                )}
              </Card>
            );
          })
        )}

        <Button
          onClick={() => { setEditingClient(null); setFormOpen(true); }}
          className="fixed bottom-20 right-4 h-14 w-14 rounded-full bg-gradient-brand text-primary-foreground shadow-brand hover:opacity-90"
          size="icon"
        >
          <Plus className="h-6 w-6" />
        </Button>
      </div>

      <ClientForm
        open={formOpen}
        onOpenChange={setFormOpen}
        onSuccess={fetchClients}
        client={editingClient}
      />

      <ClientVisitSheet
        open={visitSheetOpen}
        onOpenChange={setVisitSheetOpen}
        client={visitClient}
        visit={editingVisit}
        onSuccess={() => {
          if (visitClient?.id) refreshClientHistory(visitClient.id);
        }}
      />
    </div>
  );
};

export default Clients;
