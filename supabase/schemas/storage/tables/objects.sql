CREATE POLICY "Product images are publicly readable" ON "storage"."objects"
  FOR SELECT
  TO "anon", "authenticated"
  USING ((bucket_id = 'product-images'::text));

CREATE POLICY "Sellers delete own image folder" ON "storage"."objects"
  FOR DELETE
  TO "authenticated"
  USING (((bucket_id = 'product-images'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));

CREATE POLICY "Sellers update own image folder" ON "storage"."objects"
  FOR UPDATE
  TO "authenticated"
  USING (((bucket_id = 'product-images'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)))
  WITH CHECK (((bucket_id = 'product-images'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));

CREATE POLICY "Sellers upload to own image folder" ON "storage"."objects"
  FOR INSERT
  TO "authenticated"
  WITH CHECK (((bucket_id = 'product-images'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));
