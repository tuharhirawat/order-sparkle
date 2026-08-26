-- Inventory movement ledger
CREATE TABLE public.inventory_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  variant_id uuid REFERENCES public.product_variants(id) ON DELETE SET NULL,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  change integer NOT NULL,
  reason text NOT NULL DEFAULT 'order_confirmed',
  note text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.inventory_movements TO authenticated;
GRANT ALL ON public.inventory_movements TO service_role;

ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage inventory movements" ON public.inventory_movements
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_inventory_movements_product ON public.inventory_movements(product_id);
CREATE INDEX idx_inventory_movements_order ON public.inventory_movements(order_id);

-- Track whether stock was already deducted for an order
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS inventory_committed boolean NOT NULL DEFAULT false;

-- Availability snapshot for an order's items
CREATE OR REPLACE FUNCTION public.order_item_availability(_order_id uuid)
RETURNS TABLE (
  order_item_id uuid,
  product_id uuid,
  variant_id uuid,
  product_name text,
  variant_label text,
  requested integer,
  available integer,
  tracked boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT oi.id,
         oi.product_id,
         oi.variant_id,
         oi.product_name,
         oi.variant_label,
         oi.quantity,
         CASE
           WHEN p.id IS NULL THEN 0
           WHEN p.track_stock IS NOT TRUE THEN oi.quantity
           WHEN oi.variant_id IS NOT NULL THEN COALESCE(v.stock, 0)
           ELSE p.stock
         END,
         COALESCE(p.track_stock, false)
  FROM public.order_items oi
  LEFT JOIN public.products p ON p.id = oi.product_id
  LEFT JOIN public.product_variants v ON v.id = oi.variant_id
  WHERE oi.order_id = _order_id
  ORDER BY oi.created_at;
$$;

REVOKE EXECUTE ON FUNCTION public.order_item_availability(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.order_item_availability(uuid) TO authenticated;

-- Atomic confirmation: lock rows, validate, deduct, log, update order
CREATE OR REPLACE FUNCTION public.confirm_order_with_inventory(
  _order_id uuid,
  _status order_status DEFAULT 'Confirmed'::order_status
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  o public.orders%ROWTYPE;
  item RECORD;
  avail integer;
  shortages jsonb := '[]'::jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Not authorised';
  END IF;

  SELECT * INTO o FROM public.orders WHERE id = _order_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found';
  END IF;

  IF o.inventory_committed THEN
    UPDATE public.orders SET status = _status WHERE id = _order_id;
    RETURN jsonb_build_object('ok', true, 'already_committed', true);
  END IF;

  -- Lock affected stock rows in a stable order to avoid deadlocks
  PERFORM 1 FROM public.products p
    WHERE p.id IN (SELECT product_id FROM public.order_items WHERE order_id = _order_id AND product_id IS NOT NULL)
    ORDER BY p.id FOR UPDATE;
  PERFORM 1 FROM public.product_variants v
    WHERE v.id IN (SELECT variant_id FROM public.order_items WHERE order_id = _order_id AND variant_id IS NOT NULL)
    ORDER BY v.id FOR UPDATE;

  FOR item IN
    SELECT oi.id, oi.product_id, oi.variant_id, oi.product_name, oi.variant_label, oi.quantity,
           p.track_stock, p.stock AS product_stock, v.stock AS variant_stock
    FROM public.order_items oi
    LEFT JOIN public.products p ON p.id = oi.product_id
    LEFT JOIN public.product_variants v ON v.id = oi.variant_id
    WHERE oi.order_id = _order_id
  LOOP
    IF item.track_stock IS NOT TRUE THEN
      CONTINUE;
    END IF;
    avail := COALESCE(CASE WHEN item.variant_id IS NOT NULL THEN item.variant_stock ELSE item.product_stock END, 0);
    IF avail < item.quantity THEN
      shortages := shortages || jsonb_build_object(
        'order_item_id', item.id,
        'product_name', item.product_name,
        'variant_label', item.variant_label,
        'requested', item.quantity,
        'available', avail
      );
    END IF;
  END LOOP;

  IF jsonb_array_length(shortages) > 0 THEN
    RETURN jsonb_build_object('ok', false, 'shortages', shortages);
  END IF;

  FOR item IN
    SELECT oi.id, oi.product_id, oi.variant_id, oi.quantity, p.track_stock
    FROM public.order_items oi
    LEFT JOIN public.products p ON p.id = oi.product_id
    WHERE oi.order_id = _order_id
  LOOP
    IF item.track_stock IS NOT TRUE THEN
      CONTINUE;
    END IF;
    IF item.variant_id IS NOT NULL THEN
      UPDATE public.product_variants SET stock = stock - item.quantity WHERE id = item.variant_id;
    ELSE
      UPDATE public.products SET stock = stock - item.quantity WHERE id = item.product_id;
    END IF;
    INSERT INTO public.inventory_movements(product_id, variant_id, order_id, change, reason, created_by)
    VALUES (item.product_id, item.variant_id, _order_id, -item.quantity, 'order_confirmed', auth.uid());
  END LOOP;

  UPDATE public.orders
     SET status = _status, inventory_committed = true
   WHERE id = _order_id;

  RETURN jsonb_build_object('ok', true);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.confirm_order_with_inventory(uuid, order_status) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.confirm_order_with_inventory(uuid, order_status) TO authenticated;

-- Returning stock when an order is cancelled after being committed
CREATE OR REPLACE FUNCTION public.release_order_inventory(_order_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  o public.orders%ROWTYPE;
  item RECORD;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Not authorised';
  END IF;

  SELECT * INTO o FROM public.orders WHERE id = _order_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found';
  END IF;
  IF NOT o.inventory_committed THEN
    RETURN jsonb_build_object('ok', true, 'released', false);
  END IF;

  FOR item IN
    SELECT oi.product_id, oi.variant_id, oi.quantity, p.track_stock
    FROM public.order_items oi
    LEFT JOIN public.products p ON p.id = oi.product_id
    WHERE oi.order_id = _order_id
  LOOP
    IF item.track_stock IS NOT TRUE THEN
      CONTINUE;
    END IF;
    IF item.variant_id IS NOT NULL THEN
      UPDATE public.product_variants SET stock = stock + item.quantity WHERE id = item.variant_id;
    ELSE
      UPDATE public.products SET stock = stock + item.quantity WHERE id = item.product_id;
    END IF;
    INSERT INTO public.inventory_movements(product_id, variant_id, order_id, change, reason, created_by)
    VALUES (item.product_id, item.variant_id, _order_id, item.quantity, 'order_cancelled', auth.uid());
  END LOOP;

  UPDATE public.orders SET inventory_committed = false WHERE id = _order_id;
  RETURN jsonb_build_object('ok', true, 'released', true);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.release_order_inventory(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.release_order_inventory(uuid) TO authenticated;