INSERT INTO public.product_images (product_id, url, alt, position)
SELECT p.id, '/images/' || p.slug || '.jpg', p.name || ' — ' || coalesce(p.material,'fine jewellery'), 0
FROM public.products p;