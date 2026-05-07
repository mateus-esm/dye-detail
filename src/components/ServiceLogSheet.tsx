import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { CheckCircle2, Clock3, Loader2, Star, Upload } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointment: any;
  onSuccess: () => void;
}

const ServiceLogSheet = ({ open, onOpenChange, appointment, onSuccess }: Props) => {
  const { user } = useAuth();
  const [service, setService] = useState("");
  const [duration, setDuration] = useState("30");
  const [price, setPrice] = useState("");
  const [paymentStatus, setPaymentStatus] = useState<"pago" | "pendente">("pago");
  const [satisfaction, setSatisfaction] = useState<number>(5);
  const [observations, setObservations] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !appointment) return;
    setService(appointment.service || "");
    setDuration(String(appointment.duration_min || 30));
    setPrice(String(appointment.price || 0));
    setPaymentStatus(appointment.payment_status || "pago");
    setSatisfaction(appointment.satisfaction || 5);
    setObservations(appointment.observations || "");
    setPhotoPreview(appointment.photo_url || null);
    setPhotoFile(null);
  }, [open, appointment]);

  const handlePhoto = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async () => {
    if (!user || !appointment) return;
    setLoading(true);

    let photo_url = appointment.photo_url || null;
    if (photoFile) {
      const ext = photoFile.name.split(".").pop();
      const path = `${user.id}/${appointment.id}-${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("service-photos")
        .upload(path, photoFile, { upsert: true });

      if (uploadError) {
        toast.error("Erro ao enviar foto", { description: uploadError.message });
      } else {
        const { data } = supabase.storage.from("service-photos").getPublicUrl(path);
        photo_url = data.publicUrl;
      }
    }

    const { error } = await supabase
      .from("appointments")
      .update({
        status: "atendido",
        service: service.trim() || appointment.service,
        duration_min: parseInt(duration) || 30,
        price: parseFloat(price) || 0,
        payment_status: paymentStatus,
        satisfaction,
        observations: observations || null,
        photo_url,
      })
      .eq("id", appointment.id);

    setLoading(false);
    if (error) {
      toast.error("Erro ao registrar", { description: error.message });
      return;
    }

    toast.success("Atendimento registrado");
    onOpenChange(false);
    onSuccess();
  };

  if (!appointment) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[92vh] overflow-y-auto rounded-t-3xl border-border/60 sm:mx-auto sm:max-w-lg">
        <SheetHeader className="text-left">
          <SheetTitle>Checkout do atendimento</SheetTitle>
          <SheetDescription>
            Confirme servico, valor final e cobranca de {appointment.client_name}.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-5">
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Servico executado</Label>
            <Input value={service} onChange={(event) => setService(event.target.value)} required />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Duracao (min)</Label>
              <Input type="number" min="1" value={duration} onChange={(event) => setDuration(event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Valor final (R$)</Label>
              <Input type="number" step="0.01" value={price} onChange={(event) => setPrice(event.target.value)} />
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
                    "flex items-center justify-center gap-2 rounded-lg border-2 px-3 py-2.5 text-sm font-medium capitalize transition-all",
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
            <p className="text-xs leading-relaxed text-muted-foreground">
              Pagamento pendente nao bloqueia o ciclo operacional: o atendimento entra no historico e a cobranca fica registrada para o financeiro.
            </p>
          </div>

          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Satisfacao</Label>
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((score) => (
                <button
                  key={score}
                  type="button"
                  onClick={() => setSatisfaction(score)}
                  className="transition-transform hover:scale-110"
                >
                  <Star
                    className={cn(
                      "h-8 w-8",
                      score <= satisfaction ? "fill-accent text-accent" : "text-muted"
                    )}
                  />
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Foto do atendimento</Label>
            <label className="relative flex aspect-video cursor-pointer items-center justify-center overflow-hidden rounded-lg border-2 border-dashed border-border bg-secondary/30 transition-colors hover:border-primary/50">
              {photoPreview ? (
                <img src={photoPreview} alt="Preview" className="h-full w-full object-cover" />
              ) : (
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                  <Upload className="h-6 w-6" />
                  <span className="text-sm">Toque para enviar</span>
                </div>
              )}
              <input type="file" accept="image/*" capture="environment" onChange={handlePhoto} className="absolute inset-0 cursor-pointer opacity-0" />
            </label>
          </div>

          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Observacoes</Label>
            <Textarea
              placeholder="Ex: finalizacao, ajustes, preferencias..."
              value={observations}
              onChange={(event) => setObservations(event.target.value)}
              rows={3}
            />
          </div>

          <Button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full bg-gradient-brand text-primary-foreground shadow-brand hover:opacity-90"
            size="lg"
          >
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Concluir atendimento"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default ServiceLogSheet;
