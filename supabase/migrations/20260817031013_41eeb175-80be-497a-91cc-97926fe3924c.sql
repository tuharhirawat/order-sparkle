CREATE TABLE public.order_status_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  status public.order_status NOT NULL,
  payment_status public.payment_status,
  note text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_order_status_events_order ON public.order_status_events(order_id, created_at);

GRANT SELECT, INSERT ON public.order_status_events TO authenticated;
GRANT ALL ON public.order_status_events TO service_role;

ALTER TABLE public.order_status_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage order status events" ON public.order_status_events
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE OR REPLACE FUNCTION public.log_order_status_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.order_status_events(order_id, status, payment_status, created_by)
    VALUES (NEW.id, NEW.status, NEW.payment_status, auth.uid());
  ELSIF NEW.status IS DISTINCT FROM OLD.status OR NEW.payment_status IS DISTINCT FROM OLD.payment_status THEN
    INSERT INTO public.order_status_events(order_id, status, payment_status, created_by)
    VALUES (NEW.id, NEW.status, NEW.payment_status, auth.uid());
  END IF;
  RETURN NEW;
END; $$;

REVOKE EXECUTE ON FUNCTION public.log_order_status_event() FROM PUBLIC, anon;

CREATE TRIGGER trg_orders_status_events
AFTER INSERT OR UPDATE OF status, payment_status ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.log_order_status_event();

INSERT INTO public.order_status_events(order_id, status, payment_status, created_at)
SELECT o.id, o.status, o.payment_status, o.created_at FROM public.orders o
WHERE NOT EXISTS (SELECT 1 FROM public.order_status_events e WHERE e.order_id = o.id);

CREATE POLICY "Admins read product image files" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'product-images' AND public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins upload product image files" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'product-images' AND public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins update product image files" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'product-images' AND public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins delete product image files" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'product-images' AND public.has_role(auth.uid(), 'admin'::app_role));