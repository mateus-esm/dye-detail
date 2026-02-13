import { useState, useEffect } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Search, Phone, Instagram, Calendar } from "lucide-react";
import ClientForm from "@/components/ClientForm";

const Clients = () => {
  const { user } = useAuth();
  const [clients, setClients] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<any>(null);

  const fetchClients = async () => {
    if (!user) return;
    let query = supabase.from("clients").select("*").order("name");
    if (search) query = query.ilike("name", `%${search}%`);
    const { data } = await query;
    if (data) setClients(data);
  };

  useEffect(() => {
    fetchClients();
  }, [user, search]);

  const getLastAppointment = async (clientId: string) => {
    const { data } = await supabase
      .from("appointments")
      .select("appointment_date")
      .eq("client_id", clientId)
      .eq("status", "atendido")
      .order("appointment_date", { ascending: false })
      .limit(1);
    return data?.[0]?.appointment_date || null;
  };

  const [lastDates, setLastDates] = useState<Record<string, string | null>>({});

  useEffect(() => {
    const loadDates = async () => {
      const dates: Record<string, string | null> = {};
      for (const c of clients) {
        dates[c.id] = await getLastAppointment(c.id);
      }
      setLastDates(dates);
    };
    if (clients.length) loadDates();
  }, [clients]);

  return (
    <div className="pb-20">
      <header className="sticky top-0 z-40 border-b bg-card px-4 py-3">
        <div className="mx-auto max-w-lg">
          <h1 className="mb-3 text-lg font-bold">👥 Clientes</h1>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar cliente..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-lg space-y-3 px-4 pt-4">
        {clients.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              <p>Nenhum cliente cadastrado</p>
            </CardContent>
          </Card>
        ) : (
          clients.map((c) => (
            <Card key={c.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => { setEditingClient(c); setFormOpen(true); }}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold">{c.name}</p>
                    {c.phone && (
                      <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                        <Phone className="h-3 w-3" /> {c.phone}
                      </p>
                    )}
                    {c.instagram && (
                      <p className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Instagram className="h-3 w-3" /> {c.instagram}
                      </p>
                    )}
                    {c.notes && (
                      <p className="mt-1 text-xs text-muted-foreground italic">"{c.notes}"</p>
                    )}
                  </div>
                  <div className="text-right text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {lastDates[c.id]
                        ? format(new Date(lastDates[c.id]! + "T12:00:00"), "dd/MM/yy")
                        : "Sem registro"}
                    </div>
                    <p className="mt-1">Retorno: {c.return_days}d</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}

        <Button
          onClick={() => { setEditingClient(null); setFormOpen(true); }}
          className="fixed bottom-20 right-4 h-14 w-14 rounded-full shadow-lg"
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
    </div>
  );
};

export default Clients;
