
-- helpers
CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql SET search_path = public;

CREATE TYPE public.app_role AS ENUM ('admin','staff');
CREATE TYPE public.order_status AS ENUM ('PendingConfirmation','Confirmed','PaymentPending','PaymentReceived','Processing','Shipped','Delivered','Cancelled');
CREATE TYPE public.payment_status AS ENUM ('Unpaid','PartiallyPaid','Paid','Refunded');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE POLICY "Users read own roles" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admins manage roles" ON public.user_roles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- categories
CREATE TABLE public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  image_url text,
  position int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_categories_active ON public.categories(is_active);
GRANT SELECT ON public.categories TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.categories TO authenticated;
GRANT ALL ON public.categories TO service_role;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read active categories" ON public.categories FOR SELECT TO anon, authenticated USING (is_active OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins manage categories" ON public.categories FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_categories_updated BEFORE UPDATE ON public.categories FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- products
CREATE TABLE public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sku text NOT NULL UNIQUE,
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  price numeric(12,2) NOT NULL CHECK (price >= 0),
  compare_at_price numeric(12,2) CHECK (compare_at_price >= 0),
  category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
  material text,
  details text,
  stock int NOT NULL DEFAULT 0 CHECK (stock >= 0),
  track_stock boolean NOT NULL DEFAULT true,
  is_featured boolean NOT NULL DEFAULT false,
  is_new boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_products_category ON public.products(category_id);
CREATE INDEX idx_products_active ON public.products(is_active);
CREATE INDEX idx_products_price ON public.products(price);
GRANT SELECT ON public.products TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT ALL ON public.products TO service_role;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read active products" ON public.products FOR SELECT TO anon, authenticated USING (is_active OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins manage products" ON public.products FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_products_updated BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.product_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  url text NOT NULL,
  alt text,
  position int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_product_images_product ON public.product_images(product_id);
GRANT SELECT ON public.product_images TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_images TO authenticated;
GRANT ALL ON public.product_images TO service_role;
ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read product images" ON public.product_images FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins manage product images" ON public.product_images FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.product_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  label text NOT NULL,
  sku_suffix text,
  price_delta numeric(12,2) NOT NULL DEFAULT 0,
  stock int NOT NULL DEFAULT 0 CHECK (stock >= 0),
  is_active boolean NOT NULL DEFAULT true,
  position int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (product_id, label)
);
CREATE INDEX idx_variants_product ON public.product_variants(product_id);
GRANT SELECT ON public.product_variants TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_variants TO authenticated;
GRANT ALL ON public.product_variants TO service_role;
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read variants" ON public.product_variants FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins manage variants" ON public.product_variants FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- customers
CREATE TABLE public.customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  full_name text NOT NULL,
  phone text NOT NULL UNIQUE,
  email text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.customers TO authenticated;
GRANT ALL ON public.customers TO service_role;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage customers" ON public.customers FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_customers_updated BEFORE UPDATE ON public.customers FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.addresses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  line1 text NOT NULL,
  city text NOT NULL,
  state text NOT NULL,
  pincode text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_addresses_customer ON public.addresses(customer_id);
GRANT SELECT, INSERT, UPDATE ON public.addresses TO authenticated;
GRANT ALL ON public.addresses TO service_role;
ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage addresses" ON public.addresses FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- orders
CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number text NOT NULL UNIQUE,
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
  address_id uuid REFERENCES public.addresses(id) ON DELETE SET NULL,
  status public.order_status NOT NULL DEFAULT 'PendingConfirmation',
  payment_status public.payment_status NOT NULL DEFAULT 'Unpaid',
  subtotal numeric(12,2) NOT NULL DEFAULT 0,
  total numeric(12,2) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'INR',
  customer_note text,
  internal_notes text,
  ship_full_name text NOT NULL,
  ship_phone text NOT NULL,
  ship_email text,
  ship_line1 text NOT NULL,
  ship_city text NOT NULL,
  ship_state text NOT NULL,
  ship_pincode text NOT NULL,
  idempotency_key text UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_orders_status ON public.orders(status);
CREATE INDEX idx_orders_customer ON public.orders(customer_id);
CREATE INDEX idx_orders_created ON public.orders(created_at DESC);
GRANT SELECT, INSERT, UPDATE ON public.orders TO authenticated;
GRANT ALL ON public.orders TO service_role;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage orders" ON public.orders FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_orders_updated BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  variant_id uuid REFERENCES public.product_variants(id) ON DELETE SET NULL,
  product_name text NOT NULL,
  product_sku text NOT NULL,
  variant_label text,
  unit_price numeric(12,2) NOT NULL CHECK (unit_price >= 0),
  quantity int NOT NULL CHECK (quantity > 0),
  line_total numeric(12,2) NOT NULL CHECK (line_total >= 0),
  image_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_order_items_order ON public.order_items(order_id);
GRANT SELECT, INSERT ON public.order_items TO authenticated;
GRANT ALL ON public.order_items TO service_role;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage order items" ON public.order_items FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- store settings
CREATE TABLE public.store_settings (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  store_name text NOT NULL DEFAULT 'Aurelia Fine Jewellery',
  whatsapp_number text NOT NULL DEFAULT '919999999999',
  support_email text,
  tagline text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.store_settings TO anon;
GRANT SELECT, INSERT, UPDATE ON public.store_settings TO authenticated;
GRANT ALL ON public.store_settings TO service_role;
ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read settings" ON public.store_settings FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins manage settings" ON public.store_settings FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
INSERT INTO public.store_settings (id, store_name, whatsapp_number, tagline, support_email)
VALUES (true, 'Aurelia Fine Jewellery', '919999999999', 'Handcrafted heirlooms in 22k gold and diamond', 'care@aurelia.example');

-- order number generator
CREATE TABLE public.order_counters (
  day date PRIMARY KEY,
  last_value int NOT NULL DEFAULT 0
);
GRANT ALL ON public.order_counters TO service_role;
ALTER TABLE public.order_counters ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.next_order_number()
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE d date := (now() AT TIME ZONE 'UTC')::date; v int;
BEGIN
  INSERT INTO public.order_counters(day, last_value) VALUES (d, 1)
  ON CONFLICT (day) DO UPDATE SET last_value = public.order_counters.last_value + 1
  RETURNING last_value INTO v;
  RETURN 'ORD-' || to_char(d,'YYYYMMDD') || '-' || lpad(v::text, 4, '0');
END; $$;
REVOKE ALL ON FUNCTION public.next_order_number() FROM public, anon, authenticated;

-- seed catalog
INSERT INTO public.categories (name, slug, description, position) VALUES
 ('Rings','rings','Solitaires, bands and statement rings',1),
 ('Necklaces','necklaces','Chains, pendants and layered necklaces',2),
 ('Earrings','earrings','Studs, hoops and jhumkas',3),
 ('Bracelets','bracelets','Tennis bracelets, bangles and cuffs',4);

INSERT INTO public.products (sku,name,slug,description,price,compare_at_price,category_id,material,details,stock,is_featured,is_new)
SELECT * FROM (VALUES
 ('AUR-R-001','Solene Solitaire Ring','solene-solitaire-ring','A brilliant-cut solitaire set in an airy six-prong crown, made to catch light from every angle.',68500,74000,(SELECT id FROM public.categories WHERE slug='rings'),'18k Yellow Gold, VS1 Diamond','Centre stone 0.50ct · Hallmarked · Free resizing',6,true,true),
 ('AUR-R-002','Ivy Eternity Band','ivy-eternity-band','A continuous line of pave diamonds, slim enough to stack and stately enough to wear alone.',42900,NULL,(SELECT id FROM public.categories WHERE slug='rings'),'18k Rose Gold, Pave Diamonds','2.1mm band · 0.35ct total · Hallmarked',9,true,false),
 ('AUR-N-001','Meridian Diamond Pendant','meridian-diamond-pendant','A weightless bezel-set drop on a whisper-fine cable chain for everyday luminance.',31500,35000,(SELECT id FROM public.categories WHERE slug='necklaces'),'18k White Gold, Diamond','16-18 inch adjustable chain · 0.25ct',12,true,true),
 ('AUR-N-002','Kalika Temple Necklace','kalika-temple-necklace','Hand-engraved temple motifs in high-polish gold, a modern take on a South Indian heirloom.',184000,NULL,(SELECT id FROM public.categories WHERE slug='necklaces'),'22k Gold','Hand-engraved · 42g · Made to order',2,true,false),
 ('AUR-E-001','Aurora Hoop Earrings','aurora-hoop-earrings','Featherlight hoops with a graduated diamond arc that reads bold from across a room.',54000,NULL,(SELECT id FROM public.categories WHERE slug='earrings'),'18k Yellow Gold, Diamonds','28mm diameter · Secure click closure',7,true,true),
 ('AUR-E-002','Pearl Drop Studs','pearl-drop-studs','South Sea pearls suspended from a diamond-set bar; quiet luxury for daylight hours.',26800,29500,(SELECT id FROM public.categories WHERE slug='earrings'),'18k White Gold, South Sea Pearl','8mm pearl · Butterfly backs',14,false,true),
 ('AUR-B-001','Lumen Tennis Bracelet','lumen-tennis-bracelet','Fifty-two round brilliants in a flexible line setting that moves like liquid light.',128000,139000,(SELECT id FROM public.categories WHERE slug='bracelets'),'18k White Gold, Diamonds','2.0ct total · Double-lock clasp',3,true,false),
 ('AUR-B-002','Ridge Gold Cuff','ridge-gold-cuff','A sculpted open cuff with a hand-finished ridge, weighty and architectural.',96500,NULL,(SELECT id FROM public.categories WHERE slug='bracelets'),'22k Gold','Open cuff · 24g · Adjustable',4,false,false)
) AS t;

INSERT INTO public.product_variants (product_id, label, price_delta, stock, position)
SELECT p.id, v.label, v.delta, v.stock, v.pos FROM public.products p
JOIN (VALUES
 ('solene-solitaire-ring','US 5',0,2,1),('solene-solitaire-ring','US 6',0,2,2),('solene-solitaire-ring','US 7',1500,2,3),
 ('ivy-eternity-band','US 5',0,3,1),('ivy-eternity-band','US 6',0,3,2),('ivy-eternity-band','US 7',1200,3,3),
 ('meridian-diamond-pendant','16 inch',0,6,1),('meridian-diamond-pendant','18 inch',900,6,2)
) AS v(slug,label,delta,stock,pos) ON v.slug = p.slug;
