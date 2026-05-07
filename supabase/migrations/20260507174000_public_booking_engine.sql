ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS client_phone text;

CREATE OR REPLACE FUNCTION public.get_public_booked_slots(
  booking_user_id uuid,
  booking_date date
)
RETURNS TABLE (appointment_time time)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT a.appointment_time
  FROM public.appointments a
  WHERE a.user_id = booking_user_id
    AND a.appointment_date = booking_date
    AND a.status IN ('agendado', 'confirmado', 'atendido')
  ORDER BY a.appointment_time;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_booked_slots(uuid, date) TO anon, authenticated;

CREATE POLICY "Public can create booking appointments"
ON public.appointments
FOR INSERT
TO anon
WITH CHECK (
  status = 'agendado'
  AND client_id IS NULL
  AND appointment_date >= CURRENT_DATE
  AND appointment_date <= CURRENT_DATE + 90
  AND char_length(client_name) BETWEEN 2 AND 120
  AND client_phone IS NOT NULL
  AND char_length(regexp_replace(client_phone, '\D', '', 'g')) BETWEEN 10 AND 14
  AND price >= 0
);
