import { useEffect, useState } from "react";
import { format } from "date-fns";
import { CheckCircle2, Clock3, ImagePlus, Loader2, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ClientVisitSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client: any;
  visit?: any;
  onSuccess: () => void;
}

const nowTime = () => format(new Date(), "HH:mm");

const ClientVisitSheet = ({ open, onOpenChange, client, visit, onSuccess }: ClientVisitSheetProps) => {
  const { user } = useAuth();
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [time, setTime] = useState(nowTime());
  const [service, setService] = useState("");
  const [duration, setDuration] = useState("60");
  const [price, setPrice] = useState("");
  const [paymentStatus, setPaymentStatus] = useState<"pago" | "pendente">("pago");
  const [satisfaction, setSatisfaction] = useState(5);
  const [observations, setObservations] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;

    if (visit) {
      setDate(visit.appointment_date || format(new Date(), "yyyy-MM-dd"));
      setTime(visit.appointment_time?.slice(0, 5) || nowTime());
      setService(visit.service || "");
      setDuration(String(visit.duration_min || 60));
      setPrice(String(visit.price || ""));
      setPaymentStatus(visit.payment_status || "pago");
      setSatisfaction(visit.satisfaction || 5);
      setObservations(visit.observations || "");
      setPhotoPreview(visit.photo_url || null);
    } else {
      setDate(format(new Date(), "yyyy-MM-dd"));
      setTime(nowTime());
      setService("");
      setDuration("60");
      setPrice("");
      setPaymentStatus("pago");
      setSatisfaction(5);
      setObservations("");
      setPhotoPreview(null);
    }
    setPhotoFile(null);
  }, [open, visit]);

  const handlePhoto = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const uploadPhoto = async (appointmentId: string, currentUrl: string | null) => {
    if (!photoFile || !user) return currentUrl;

    const ext = photoFile.name.split(".").pop();
    const path = `${user.id}/${appointmentId}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage
      .from("service-photos")
      .upload(path, photoFile, { upsert: true });

    if (error) {
      toast.error("Erro ao enviar foto", { description: error.message });
      return currentUrl;
    }

    const { data } = supabase.storage.from("service-photos").getPublicUrl(path);
    return data.publicUrl;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!user || !client) return;

    setLoading(true);
    const baseData = {
      user_id: user.id,
      client_id: client.id,
      client_name: client.name,
      client_phone: client.phone || null,
      appointment_date: date,
      appointment_time: time,
      service: service.trim(),
      duration_min: parseInt(duration) || 60,
      price: parseFloat(price) || 0,
      status: "atendido",
      payment_status: paymentStatus,
      satisfaction,
      observations: observations || null,
    };

    if (visit) {
      const photo_url = await uploadPhoto(visit.id, visit.photo_url || null);
      const { error } = await supabase
        .from("appointments")
        .update({ ...baseData, photo_url })
        .eq("id", visit.id);

      setLoading(false);
      if (error) {
        toast.error("Erro ao atualizar visita", { description: error.message });
        return;
      }
      toast.success("Visita atualizada");
      onOpenChange(false);
      onSuccess();
      return;
    }

    const { data, error } = await supabase
      .from("appointments")
      .insert({ ...baseData, photo_url: null })
      .select("id")
      .single();

    if (error || !data) {
      setLoading(false);
      toast.error("Erro ao registrar visita", { description: error?.message });
      return;
    }

    const photo_url = await uploadPhoto(data.id, null);
    if (photo_url) {
      const { error: photoError } = await supabase
        .from("appointments")
        .update({ photo_url })
        .eq("id", data.id);

      if (photoError) {
        toast.error("Visita salva, mas a foto falhou", { description: photoError.message });
      }
    }

    setLoading(false);
    toast.success("Visita registrada");
    onOpenChange(false);
    onSuccess();
  };

  if (!client) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[92vh] overflow-y-auto rounded-t-3xl border-border/60 sm:mx-auto sm:max-w-lg">
        <SheetHeader className="text-left">
          <SheetTitle>{visit ? "Editar visita" : "Registrar visita"}</SheetTitle>
          <SheetDescription>
            Historico operacional de {client.name}: servico, foto, cobranca e observacoes.
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Data</Label>
              <Input type="date" value={date} onChange={(event) => setDate(event.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Horario</Label>
              <Input type="time" value={time} onChange={(event) => setTime(event.target.value)} required />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Servico</Label>
            <Input
              value={service}
              onChange={(event) => setService(event.target.value)}
              placeholder="Ex: Corte, escova, coloracao..."
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Duracao (min)</Label>
              <Input type="number" min="1" value={duration} onChange={(event) => setDuration(event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Valor final (R$)</Label>
              <Input type="number" step="0.01" min="0" value={price} onChange={(event) => setPrice(event.target.value)} />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Pagamento</Label>
            <div className="grid grid-cols-2 gap-2">
              {(["pago", "pendente"] as const).map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => setPaymentStatus(status)}
                  className={cn(
                    "flex items-center justify-center gap-2 rounded-lg border-2 px-3 py-2.5 text-sm font-medium transition-all",
                    paymentStatus === status
                      ? status === "pago"
                        ? "border-success bg-success/15 text-success"
                        : "border-warning bg-warning/15 text-warning"
                      : "border-border bg-secondary/40 text-muted-foreground"
                  )}
                >
                  {status === "pago" ? <CheckCircle2 className="h-4 w-4" /> : <Clock3 className="h-4 w-4" />}
                  {status === "pago" ? "Pago" : "Pendente"}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Satisfacao</Label>
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((score) => (
                <button key={score} type="button" onClick={() => setSatisfaction(score)}>
                  <Star className={cn("h-8 w-8", score <= satisfaction ? "fill-accent text-accent" : "text-muted")} />
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Foto do resultado</Label>
            <label className="relative flex aspect-video cursor-pointer items-center justify-center overflow-hidden rounded-lg border-2 border-dashed border-border bg-secondary/30 transition-colors hover:border-primary/50">
              {photoPreview ? (
                <img src={photoPreview} alt="Resultado do atendimento" className="h-full w-full object-cover" />
              ) : (
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                  <ImagePlus className="h-6 w-6" />
                  <span className="text-sm">Adicionar foto</span>
                </div>
              )}
              <input type="file" accept="image/*" capture="environment" onChange={handlePhoto} className="absolute inset-0 cursor-pointer opacity-0" />
            </label>
          </div>

          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Observacoes</Label>
            <Textarea
              value={observations}
              onChange={(event) => setObservations(event.target.value)}
              placeholder="Preferencias, formula usada, manutencao indicada..."
              rows={3}
            />
          </div>

          <Button type="submit" disabled={loading} className="w-full bg-gradient-brand text-primary-foreground shadow-brand hover:opacity-90" size="lg">
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : visit ? "Salvar visita" : "Registrar visita"}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
};

export default ClientVisitSheet;
