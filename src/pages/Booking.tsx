import { useEffect, useMemo, useState } from "react";
import { addDays, format } from "date-fns";
import { Calendar, CheckCircle2, Clock, Loader2, Phone, Scissors, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SoloVenturesBadge } from "@/components/BrandLogo";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { TablesInsert } from "@/integrations/supabase/types";

const BOOKING_USER_ID = import.meta.env.VITE_PUBLIC_BOOKING_USER_ID as string | undefined;

const services = [
  { name: "Corte + Finalizacao", duration: 60, price: 120 },
  { name: "Escova", duration: 45, price: 90 },
  { name: "Tratamento capilar", duration: 90, price: 180 },
  { name: "Coloracao", duration: 120, price: 260 },
];

const buildSlots = () => {
  const slots: string[] = [];
  for (let hour = 9; hour <= 18; hour += 1) {
    slots.push(`${String(hour).padStart(2, "0")}:00`);
    slots.push(`${String(hour).padStart(2, "0")}:30`);
  }
  return slots;
};

const dateOptions = Array.from({ length: 14 }, (_, index) => {
  const date = addDays(new Date(), index);
  return {
    value: format(date, "yyyy-MM-dd"),
    label: index === 0 ? "Hoje" : index === 1 ? "Amanha" : format(date, "dd/MM"),
  };
});

const Booking = () => {
  const [selectedService, setSelectedService] = useState(services[0].name);
  const [selectedDate, setSelectedDate] = useState(dateOptions[0].value);
  const [selectedTime, setSelectedTime] = useState("");
  const [bookedSlots, setBookedSlots] = useState<string[]>([]);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  const service = useMemo(
    () => services.find((item) => item.name === selectedService) ?? services[0],
    [selectedService]
  );

  const slots = useMemo(
    () => buildSlots().filter((slot) => !bookedSlots.includes(slot)),
    [bookedSlots]
  );

  useEffect(() => {
    const loadBookedSlots = async () => {
      if (!BOOKING_USER_ID || !selectedDate) return;
      setLoadingSlots(true);
      const { data, error } = await supabase.rpc("get_public_booked_slots", {
        booking_user_id: BOOKING_USER_ID,
        booking_date: selectedDate,
      });
      setLoadingSlots(false);

      if (error) {
        toast.error("Nao foi possivel validar horarios", { description: error.message });
        return;
      }

      setBookedSlots((data ?? []).map((row) => row.appointment_time.slice(0, 5)));
      if (selectedTime && data?.some((row) => row.appointment_time.slice(0, 5) === selectedTime)) {
        setSelectedTime("");
      }
    };

    loadBookedSlots();
  }, [selectedDate, selectedTime]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const cleanPhone = phone.replace(/\D/g, "");

    if (!BOOKING_USER_ID) {
      toast.error("Agenda publica nao configurada", {
        description: "Defina VITE_PUBLIC_BOOKING_USER_ID no ambiente de deploy.",
      });
      return;
    }

    if (cleanPhone.length < 10) {
      toast.error("Informe um WhatsApp valido.");
      return;
    }

    if (!selectedTime) {
      toast.error("Selecione um horario disponivel.");
      return;
    }

    setSubmitting(true);
    const payload: TablesInsert<"appointments"> = {
      user_id: BOOKING_USER_ID,
      client_id: null,
      client_name: name.trim(),
      client_phone: cleanPhone,
      appointment_date: selectedDate,
      appointment_time: selectedTime,
      service: service.name,
      price: service.price,
      duration_min: service.duration,
      status: "agendado",
      payment_status: "pendente",
    };

    const { error } = await supabase.from("appointments").insert(payload);
    setSubmitting(false);

    if (error) {
      toast.error("Nao foi possivel confirmar", { description: error.message });
      return;
    }

    setConfirmed(true);
  };

  if (confirmed) {
    return (
      <main className="min-h-screen bg-black px-4 py-8 text-white">
        <section className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-md flex-col justify-between">
          <div className="pt-10">
            <SoloVenturesBadge className="mb-12 items-start opacity-100 [&_span]:text-white/45" />
            <div className="mb-8 flex h-14 w-14 items-center justify-center rounded-full bg-white text-black">
              <CheckCircle2 className="h-7 w-7" />
            </div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.32em] text-orange-400">
              Agendamento confirmado
            </p>
            <h1 className="text-4xl font-semibold leading-tight tracking-normal">
              {name.split(" ")[0]}, seu horario esta reservado.
            </h1>
          </div>

          <div className="space-y-3 border-t border-white/15 pt-6">
            <div className="flex items-center justify-between text-sm">
              <span className="text-white/55">Servico</span>
              <span>{service.name}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-white/55">Data</span>
              <span>{format(new Date(`${selectedDate}T12:00:00`), "dd/MM")} as {selectedTime}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-white/55">Valor previsto</span>
              <span>R$ {service.price.toFixed(2)}</span>
            </div>
            <Button
              onClick={() => window.location.assign("/agendar")}
              className="mt-5 w-full bg-white text-black hover:bg-white/90"
              size="lg"
            >
              Novo agendamento
            </Button>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black px-4 py-6 text-white">
      <section className="mx-auto max-w-md">
        <header className="mb-8 flex items-center justify-between">
          <SoloVenturesBadge className="items-start opacity-100 [&_span]:text-white/45" />
          <span className="rounded-full border border-white/15 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.24em] text-white/55">
            Duda Hair
          </span>
        </header>

        <div className="mb-8">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.32em] text-orange-400">
            Agenda publica
          </p>
          <h1 className="text-4xl font-semibold leading-tight tracking-normal">
            Reserve seu horario em menos de um minuto.
          </h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-xs uppercase tracking-[0.22em] text-white/55">
              <Scissors className="h-3.5 w-3.5" /> Servico
            </Label>
            <Select value={selectedService} onValueChange={setSelectedService}>
              <SelectTrigger className="h-12 border-white/15 bg-white text-black">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {services.map((item) => (
                  <SelectItem key={item.name} value={item.name}>
                    {item.name} - R$ {item.price}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-xs uppercase tracking-[0.22em] text-white/55">
              <Calendar className="h-3.5 w-3.5" /> Data
            </Label>
            <div className="grid grid-cols-4 gap-2">
              {dateOptions.slice(0, 8).map((date) => (
                <button
                  key={date.value}
                  type="button"
                  onClick={() => setSelectedDate(date.value)}
                  className={cn(
                    "h-11 border text-xs font-semibold transition-colors",
                    selectedDate === date.value
                      ? "border-orange-400 bg-orange-400 text-black"
                      : "border-white/15 bg-white/5 text-white hover:bg-white/10"
                  )}
                >
                  {date.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-xs uppercase tracking-[0.22em] text-white/55">
              <Clock className="h-3.5 w-3.5" /> Horario
            </Label>
            {loadingSlots ? (
              <div className="flex h-24 items-center justify-center border border-white/15 bg-white/5">
                <Loader2 className="h-5 w-5 animate-spin text-white/60" />
              </div>
            ) : (
              <div className="grid grid-cols-4 gap-2">
                {slots.map((slot) => (
                  <button
                    key={slot}
                    type="button"
                    onClick={() => setSelectedTime(slot)}
                    className={cn(
                      "h-11 border text-sm font-semibold tabular-nums transition-colors",
                      selectedTime === slot
                        ? "border-white bg-white text-black"
                        : "border-white/15 bg-white/5 text-white hover:bg-white/10"
                    )}
                  >
                    {slot}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 gap-3">
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-xs uppercase tracking-[0.22em] text-white/55">
                <User className="h-3.5 w-3.5" /> Nome
              </Label>
              <Input
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="h-12 border-white/15 bg-white text-black"
                placeholder="Seu nome"
                required
              />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-xs uppercase tracking-[0.22em] text-white/55">
                <Phone className="h-3.5 w-3.5" /> WhatsApp
              </Label>
              <Input
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                className="h-12 border-white/15 bg-white text-black"
                inputMode="tel"
                placeholder="(85) 99999-9999"
                required
              />
            </div>
          </div>

          <div className="border-t border-white/15 pt-4">
            <div className="mb-4 flex items-center justify-between text-sm">
              <span className="text-white/55">{service.duration} min</span>
              <span className="font-semibold">R$ {service.price.toFixed(2)}</span>
            </div>
            <Button
              type="submit"
              className="h-12 w-full bg-white font-semibold text-black hover:bg-white/90"
              disabled={submitting}
            >
              {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : "Confirmar agendamento"}
            </Button>
          </div>
        </form>
      </section>
    </main>
  );
};

export default Booking;
