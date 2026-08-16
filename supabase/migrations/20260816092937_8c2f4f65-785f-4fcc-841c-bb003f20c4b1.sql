REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM anon;
REVOKE ALL ON FUNCTION public.next_order_number() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.set_updated_at() FROM anon, authenticated;