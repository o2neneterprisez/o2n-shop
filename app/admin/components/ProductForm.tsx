"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { supabase } from "@/lib/supabase/client";
import styles from "../admin.module.css";
import { Icon } from "./AdminUI";

type ShopOption = { id: string; name: string; status: string };
type CategoryOption = { id: string; name: string };
type VariantOption = { id: string; name: string; value: string };
type VariantDraft = {
  id: string;
  sku: string;
  price: string;
  compareAtPrice: string;
  stockQuantity: string;
  options: VariantOption[];
};
type ImageDraft = {
  id: string;
  file: File | null;
  preview: string;
  imageUrl?: string;
  altText?: string | null;
  mediaType?: string;
  storagePath?: string | null;
};
type ExistingProduct = {
  id: string;
  title: string;
  slug: string;
  shop_id: string;
  category_id: string | null;
  description: string | null;
  sku: string | null;
  price: number | string;
  compare_at_price: number | string | null;
  stock_quantity: number;
  brand: string | null;
  condition: string;
  warranty: string | null;
  return_policy: string | null;
  weight_value: number | string | null;
  weight_unit: string | null;
  dimensions: Record<string, unknown> | null;
};

const MAX_IMAGES = 10;
const MAX_IMAGE_SIZE = 8 * 1024 * 1024;

function slugify(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function makeVariant(): VariantDraft {
  return {
    id: crypto.randomUUID(),
    sku: "",
    price: "",
    compareAtPrice: "",
    stockQuantity: "0",
    options: [{ id: crypto.randomUUID(), name: "", value: "" }],
  };
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "An unexpected error occurred.";
}

export function ProductForm({ onClose, onCreated, productId }: { onClose: () => void; onCreated: (warning?: string) => void; productId?: string }) {
  const [shops, setShops] = useState<ShopOption[]>([]);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [optionsLoading, setOptionsLoading] = useState(true);
  const [productLoading, setProductLoading] = useState(Boolean(productId));
  const [optionsError, setOptionsError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const previewUrls = useRef(new Set<string>());
  const [images, setImages] = useState<ImageDraft[]>([]);
  const [removedStoragePaths, setRemovedStoragePaths] = useState<string[]>([]);
  const [variants, setVariants] = useState<VariantDraft[]>([]);
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [shopId, setShopId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [description, setDescription] = useState("");
  const [sku, setSku] = useState("");
  const [price, setPrice] = useState("");
  const [compareAtPrice, setCompareAtPrice] = useState("");
  const [stockQuantity, setStockQuantity] = useState("0");
  const [brand, setBrand] = useState("");
  const [condition, setCondition] = useState("new");
  const [warranty, setWarranty] = useState("");
  const [returnPolicy, setReturnPolicy] = useState("");
  const [weightValue, setWeightValue] = useState("");
  const [weightUnit, setWeightUnit] = useState("kg");
  const [length, setLength] = useState("");
  const [width, setWidth] = useState("");
  const [height, setHeight] = useState("");
  const editing = Boolean(productId);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void (async () => {
        if (!supabase) {
          setOptionsError("Supabase is not configured.");
          setOptionsLoading(false);
          setProductLoading(false);
          return;
        }
        try {
          const [shopsResult, categoriesResult, productResult, variantsResult, imagesResult, authResult] = await Promise.all([
            supabase.from("shops").select("id,name,status").order("name"),
            supabase.from("categories").select("id,name").eq("is_active", true).order("name"),
            productId
              ? supabase.from("products").select("id,title,slug,shop_id,category_id,description,sku,price,compare_at_price,stock_quantity,brand,condition,warranty,return_policy,weight_value,weight_unit,dimensions").eq("id", productId).maybeSingle()
              : Promise.resolve({ data: null, error: null }),
            productId
              ? supabase.from("product_variants").select("id,sku,options,price,compare_at_price,stock_quantity").eq("product_id", productId).order("created_at")
              : Promise.resolve({ data: [], error: null }),
            productId
              ? supabase.from("product_images").select("id,image_url,alt_text,sort_order,media_type").eq("product_id", productId).order("sort_order")
              : Promise.resolve({ data: [], error: null }),
            supabase.auth.getUser(),
          ]);
          const errors = [
            shopsResult.error ? `shops: ${shopsResult.error.message}` : null,
            categoriesResult.error ? `categories: ${categoriesResult.error.message}` : null,
          ].filter(Boolean);
          setOptionsError(errors.length ? `Unable to load form options — ${errors.join("; ")}` : null);
          setShops((shopsResult.data ?? []) as ShopOption[]);
          setCategories((categoriesResult.data ?? []) as CategoryOption[]);
          if (authResult.error) {
            setFormError(`Unable to verify your session: ${authResult.error.message}`);
          } else {
            setCurrentUserId(authResult.data.user?.id ?? null);
          }
          if (productId) {
            const productErrors = [
              productResult.error ? `product: ${productResult.error.message}` : null,
              variantsResult.error ? `variants: ${variantsResult.error.message}` : null,
              imagesResult.error ? `images: ${imagesResult.error.message}` : null,
            ].filter(Boolean);
            if (productErrors.length) {
              setFormError(`Unable to load product data — ${productErrors.join("; ")}`);
            } else if (!productResult.data) {
              setFormError("This product could not be found or is not available to your account.");
            } else {
              const product = productResult.data as ExistingProduct;
              setTitle(product.title);
              setSlug(product.slug);
              setSlugEdited(true);
              setShopId(product.shop_id);
              setCategoryId(product.category_id ?? "");
              setDescription(product.description ?? "");
              setSku(product.sku ?? "");
              setPrice(String(product.price));
              setCompareAtPrice(product.compare_at_price === null ? "" : String(product.compare_at_price));
              setStockQuantity(String(product.stock_quantity));
              setBrand(product.brand ?? "");
              setCondition(product.condition || "new");
              setWarranty(product.warranty ?? "");
              setReturnPolicy(product.return_policy ?? "");
              setWeightValue(product.weight_value === null ? "" : String(product.weight_value));
              setWeightUnit(product.weight_unit ?? "kg");
              setLength(product.dimensions?.length === undefined ? "" : String(product.dimensions.length));
              setWidth(product.dimensions?.width === undefined ? "" : String(product.dimensions.width));
              setHeight(product.dimensions?.height === undefined ? "" : String(product.dimensions.height));
              setVariants(((variantsResult.data ?? []) as Array<{
                id: string;
                sku: string | null;
                options: Record<string, string>;
                price: number | string;
                compare_at_price: number | string | null;
                stock_quantity: number;
              }>).map((variant) => ({
                id: variant.id,
                sku: variant.sku ?? "",
                price: String(variant.price),
                compareAtPrice: variant.compare_at_price === null ? "" : String(variant.compare_at_price),
                stockQuantity: String(variant.stock_quantity),
                options: Object.entries(variant.options ?? {}).map(([name, value]) => ({
                  id: crypto.randomUUID(),
                  name,
                  value,
                })),
              })));
              setImages(((imagesResult.data ?? []) as Array<{
                id: string;
                image_url: string;
                alt_text: string | null;
                sort_order: number;
                media_type: string;
              }>).map((image) => {
                let storagePath: string | null = null;
                try {
                  const imageUrl = new URL(image.image_url);
                  const marker = "/storage/v1/object/public/product-images/";
                  const markerIndex = imageUrl.pathname.indexOf(marker);
                  if (markerIndex >= 0) storagePath = decodeURIComponent(imageUrl.pathname.slice(markerIndex + marker.length));
                } catch {
                  storagePath = null;
                }
                return {
                  id: image.id,
                  file: null,
                  preview: image.image_url,
                  imageUrl: image.image_url,
                  altText: image.alt_text,
                  mediaType: image.media_type,
                  storagePath,
                };
              }));
            }
          }
        } catch (error) {
          setFormError(`Unable to load product form data: ${errorMessage(error)}`);
        } finally {
          setOptionsLoading(false);
          setProductLoading(false);
        }
      })();
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [productId]);

  useEffect(() => () => {
    previewUrls.current.forEach((url) => URL.revokeObjectURL(url));
    previewUrls.current.clear();
  }, []);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !saving) onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, saving]);

  function handleImageSelection(event: ChangeEvent<HTMLInputElement>) {
    const selectedFiles = Array.from(event.target.files ?? []);
    event.target.value = "";
    setFormError(null);
    if (images.length + selectedFiles.length > MAX_IMAGES) {
      setFormError(`You can add up to ${MAX_IMAGES} images.`);
      return;
    }
    const invalidFile = selectedFiles.find((file) => !file.type.startsWith("image/") || file.size > MAX_IMAGE_SIZE);
    if (invalidFile) {
      setFormError(invalidFile.size > MAX_IMAGE_SIZE
        ? `${invalidFile.name} is larger than the 8 MB image limit.`
        : `${invalidFile.name} is not a supported image.`);
      return;
    }
    const additions = selectedFiles.map((file) => {
      const preview = URL.createObjectURL(file);
      previewUrls.current.add(preview);
      return { id: crypto.randomUUID(), file, preview };
    });
    setImages((current) => [...current, ...additions]);
  }

  function removeImage(id: string) {
    const image = images.find((item) => item.id === id);
    if (image) {
      URL.revokeObjectURL(image.preview);
      previewUrls.current.delete(image.preview);
      if (image.storagePath && currentUserId && image.storagePath.startsWith(`${currentUserId}/`)) {
        setRemovedStoragePaths((paths) => [...paths, image.storagePath!]);
      }
    }
    setImages((current) => current.filter((item) => item.id !== id));
  }

  function updateVariant(variantId: string, patch: Partial<VariantDraft>) {
    setVariants((current) => current.map((variant) => variant.id === variantId ? { ...variant, ...patch } : variant));
  }

  function updateVariantOption(variantId: string, optionId: string, patch: Partial<VariantOption>) {
    setVariants((current) => current.map((variant) => variant.id === variantId
      ? { ...variant, options: variant.options.map((option) => option.id === optionId ? { ...option, ...patch } : option) }
      : variant));
  }

  async function removeUploadedFiles(paths: string[]) {
    if (!supabase || !paths.length) return null;
    try {
      const { error } = await supabase.storage.from("product-images").remove(paths);
      return error?.message ?? null;
    } catch (error) {
      return errorMessage(error);
    }
  }

  async function saveProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) {
      setFormError("Supabase is not configured.");
      return;
    }
    if (!shopId) {
      setFormError("Choose a shop for this product.");
      return;
    }
    const parsedPrice = Number(price);
    const parsedCompareAtPrice = compareAtPrice ? Number(compareAtPrice) : null;
    const parsedStockQuantity = Number(stockQuantity);
    if (!Number.isFinite(parsedPrice) || parsedPrice < 0) {
      setFormError("Enter a valid product price.");
      return;
    }
    if (!Number.isInteger(parsedStockQuantity) || parsedStockQuantity < 0) {
      setFormError("Product stock must be a non-negative whole number.");
      return;
    }
    if (parsedCompareAtPrice !== null && (!Number.isFinite(parsedCompareAtPrice) || parsedCompareAtPrice < parsedPrice)) {
      setFormError("Compare-at price must be greater than or equal to the product price.");
      return;
    }

    const parsedVariants: { sku: string | null; price: number; compare_at_price: number | null; stock_quantity: number; options: Record<string, string> }[] = [];
    for (const [index, variant] of variants.entries()) {
      const options: Record<string, string> = {};
      for (const option of variant.options) {
        const name = option.name.trim();
        const value = option.value.trim();
        if (!name && !value) continue;
        if (!name || !value) {
          setFormError(`Complete both the option name and value for variant ${index + 1}, or remove the empty option.`);
          return;
        }
        const matchingKey = Object.keys(options).find((key) => key.toLowerCase() === name.toLowerCase());
        if (matchingKey) {
          setFormError(`Variant ${index + 1} has the option “${name}” more than once.`);
          return;
        }
        options[name] = value;
      }
      if (!Object.keys(options).length) {
        setFormError(`Add at least one option name and value to variant ${index + 1}.`);
        return;
      }
      const variantPrice = Number(variant.price);
      const variantCompareAtPrice = variant.compareAtPrice ? Number(variant.compareAtPrice) : null;
      const variantStock = Number(variant.stockQuantity);
      if (!Number.isFinite(variantPrice) || variantPrice < 0 || !Number.isInteger(variantStock) || variantStock < 0) {
        setFormError(`Enter a valid price and whole-number stock quantity for variant ${index + 1}.`);
        return;
      }
      if (variantCompareAtPrice !== null && (!Number.isFinite(variantCompareAtPrice) || variantCompareAtPrice < variantPrice)) {
        setFormError(`Compare-at price must be greater than or equal to the price for variant ${index + 1}.`);
        return;
      }
      parsedVariants.push({
        sku: variant.sku.trim() || null,
        price: variantPrice,
        compare_at_price: variantCompareAtPrice,
        stock_quantity: variantStock,
        options,
      });
    }

    setSaving(true);
    setFormError(null);
    const uploadedPaths: string[] = [];
    const savedProductId = productId ?? crypto.randomUUID();
    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError) throw new Error(`Unable to verify your session: ${authError.message}`);
      if (!authData.user) throw new Error("Your session has expired. Sign in again to create a product.");

      const imageRecords: { image_url: string; alt_text: string | null; sort_order: number; media_type: string }[] = [];
      for (const [index, image] of images.entries()) {
        if (image.file) {
          const safeName = image.file.name.toLowerCase().replace(/[^a-z0-9.-]+/g, "-").replace(/^-|-$/g, "") || "image";
          const path = `${authData.user.id}/${savedProductId}/${crypto.randomUUID()}-${safeName}`;
          uploadedPaths.push(path);
          const { error: uploadError } = await supabase.storage.from("product-images").upload(path, image.file, {
            cacheControl: "3600",
            contentType: image.file.type,
            upsert: false,
          });
          if (uploadError) throw new Error(`Unable to upload ${image.file.name}: ${uploadError.message}`);
          const { data: publicUrl } = supabase.storage.from("product-images").getPublicUrl(path);
          imageRecords.push({ image_url: publicUrl.publicUrl, alt_text: title.trim(), sort_order: index, media_type: "image" });
        } else if (image.imageUrl) {
          imageRecords.push({
            image_url: image.imageUrl,
            alt_text: image.altText ?? title.trim(),
            sort_order: index,
            media_type: image.mediaType ?? "image",
          });
        }
      }

      const weight = weightValue.trim() ? Number(weightValue) : null;
      if (weight !== null && (!Number.isFinite(weight) || weight < 0)) throw new Error("Enter a valid non-negative product weight.");
      const dimensions = Object.fromEntries(
        [["length", length], ["width", width], ["height", height]]
          .filter(([, value]) => value.trim())
          .map(([key, value]) => [key, Number(value)]),
      );
      if (Object.values(dimensions).some((value) => !Number.isFinite(value) || value < 0)) {
        throw new Error("Product dimensions must be valid non-negative numbers.");
      }
      const { error: saveError } = editing
        ? await supabase.rpc("admin_update_product", {
          p_product_id: savedProductId,
          p_product: {
            shop_id: shopId,
            category_id: categoryId || null,
            title: title.trim(),
            slug: slugify(slug),
            description: description.trim() || null,
            sku: sku.trim() || null,
            price: parsedPrice,
            compare_at_price: parsedCompareAtPrice,
            stock_quantity: parsedStockQuantity,
            brand: brand.trim() || null,
            condition,
            warranty: warranty.trim() || null,
            return_policy: returnPolicy.trim() || null,
            weight_value: weight,
            weight_unit: weight === null ? null : weightUnit,
            dimensions,
          },
          p_variants: parsedVariants,
          p_images: imageRecords,
        })
        : await supabase.rpc("admin_create_product", {
        p_product: {
          id: savedProductId,
          shop_id: shopId,
          category_id: categoryId || null,
          title: title.trim(),
          slug: slugify(slug),
          description: description.trim() || null,
          sku: sku.trim() || null,
          price: parsedPrice,
          compare_at_price: parsedCompareAtPrice,
          stock_quantity: parsedStockQuantity,
          brand: brand.trim() || null,
          condition,
          warranty: warranty.trim() || null,
          return_policy: returnPolicy.trim() || null,
          weight_value: weight,
          weight_unit: weight === null ? null : weightUnit,
          dimensions,
        },
        p_variants: parsedVariants,
        p_images: imageRecords,
      });
      if (saveError) throw new Error(`Unable to ${editing ? "update" : "create"} product: ${saveError.message}`);

      if (editing && removedStoragePaths.length) {
        const cleanupError = await removeUploadedFiles(removedStoragePaths);
        onCreated(cleanupError ? `Product was saved, but removed image files could not be cleaned up: ${cleanupError}` : undefined);
      } else {
        onCreated();
      }
    } catch (error) {
      const message = errorMessage(error);
      const cleanupError = await removeUploadedFiles(uploadedPaths);
      setFormError(cleanupError
        ? `${message} Image cleanup also failed: ${cleanupError}. Uploaded files may remain in product-images.`
        : message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className={editing ? styles.productEditorPage : styles.modalBackdrop}
      role={editing ? undefined : "presentation"}
      onMouseDown={(event) => { if (!editing && event.target === event.currentTarget && !saving) onClose(); }}
    >
      <form
        aria-labelledby="product-form-title"
        aria-modal={editing ? undefined : true}
        className={`${editing ? styles.productEditorCard : styles.modal} ${styles.productModal}`}
        onSubmit={(event) => void saveProduct(event)}
        role={editing ? undefined : "dialog"}
      >
        <div className={styles.modalHeading}>
          <div>
            <h2 id="product-form-title">{editing ? "Edit product" : "Add a product"}</h2>
            <p>{editing ? "Update the listing, variants, and product images." : "Enter listing details, add variants, and upload product images."}</p>
          </div>
          <button aria-label={editing ? "Back to products" : "Close"} className={styles.iconButton} disabled={saving} onClick={onClose} type="button"><Icon name={editing ? "arrow" : "close"} size={18} /></button>
        </div>

        {productLoading ? <div className={styles.productLoading}>Loading product details…</div> : null}
        {optionsError ? <p className={styles.formError} role="alert">{optionsError}</p> : null}
        {formError ? <p className={styles.formError} role="alert">{formError}</p> : null}

        <section className={styles.productFormSection}>
          <div className={styles.productSectionHeading}><h3>Product information</h3><p>Basic details customers will see on the listing.</p></div>
          <div className={styles.productFormGrid}>
            <label className={`${styles.formField} ${styles.productFieldWide}`}>Product name
              <input autoFocus={!editing} disabled={productLoading} maxLength={180} minLength={2} onChange={(event) => {
                const value = event.target.value;
                setTitle(value);
                if (!slugEdited) setSlug(slugify(value));
              }} placeholder="e.g. Handwoven cotton kurta" required value={title} />
            </label>
            <label className={styles.formField}>Shop
              <select disabled={optionsLoading || productLoading} onChange={(event) => setShopId(event.target.value)} required value={shopId}>
                <option value="">{optionsLoading ? "Loading shops…" : "Select a shop"}</option>
                {editing && shopId && !shops.some((shop) => shop.id === shopId) ? <option value={shopId}>Current shop (restricted)</option> : null}
                {shops.map((shop) => <option key={shop.id} value={shop.id}>{shop.name} · {shop.status}</option>)}
              </select>
            </label>
            <label className={styles.formField}>Category <span>(optional)</span>
              <select disabled={productLoading} onChange={(event) => setCategoryId(event.target.value)} value={categoryId}>
                <option value="">No category</option>
                {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
              </select>
            </label>
            <label className={styles.formField}>URL slug
              <input maxLength={180} onChange={(event) => { setSlugEdited(true); setSlug(slugify(event.target.value)); }} required value={slug} />
            </label>
            <label className={styles.formField}>Brand <span>(optional)</span>
              <input maxLength={100} onChange={(event) => setBrand(event.target.value)} placeholder="Brand name" value={brand} />
            </label>
            <label className={`${styles.formField} ${styles.productFieldWide}`}>Description <span>(optional)</span>
              <textarea maxLength={10000} onChange={(event) => setDescription(event.target.value)} placeholder="Describe materials, features, and other useful details." rows={4} value={description} />
            </label>
            <label className={styles.formField}>Condition
              <select onChange={(event) => setCondition(event.target.value)} value={condition}>
                <option value="new">New</option><option value="used">Used</option><option value="refurbished">Refurbished</option>
              </select>
            </label>
          </div>
        </section>

        <section className={styles.productFormSection}>
          <div className={styles.productSectionHeading}><h3>Pricing & inventory</h3><p>Set the listing price and available stock.</p></div>
          <div className={styles.productFormGrid}>
            <label className={styles.formField}>Price (INR)
              <input min="0" onChange={(event) => setPrice(event.target.value)} required step="0.01" type="number" value={price} />
            </label>
            <label className={styles.formField}>Compare-at price <span>(optional)</span>
              <input min="0" onChange={(event) => setCompareAtPrice(event.target.value)} step="0.01" type="number" value={compareAtPrice} />
            </label>
            <label className={styles.formField}>Product SKU <span>(optional)</span>
              <input maxLength={120} onChange={(event) => setSku(event.target.value)} value={sku} />
            </label>
            <label className={styles.formField}>Product stock
              <input min="0" onChange={(event) => setStockQuantity(event.target.value)} required step="1" type="number" value={stockQuantity} />
            </label>
            <label className={styles.formField}>Weight <span>(optional)</span>
              <div className={styles.productInputPair}>
                <input min="0" onChange={(event) => setWeightValue(event.target.value)} step="0.01" type="number" value={weightValue} />
                <select aria-label="Weight unit" onChange={(event) => setWeightUnit(event.target.value)} value={weightUnit}><option value="kg">kg</option><option value="g">g</option><option value="lb">lb</option></select>
              </div>
            </label>
            <fieldset className={`${styles.productDimensions} ${styles.productFieldWide}`}>
              <legend>Dimensions <span>(optional, cm)</span></legend>
              <label className={styles.formField}>Length<input min="0" onChange={(event) => setLength(event.target.value)} step="0.1" type="number" value={length} /></label>
              <label className={styles.formField}>Width<input min="0" onChange={(event) => setWidth(event.target.value)} step="0.1" type="number" value={width} /></label>
              <label className={styles.formField}>Height<input min="0" onChange={(event) => setHeight(event.target.value)} step="0.1" type="number" value={height} /></label>
            </fieldset>
          </div>
        </section>

        <section className={styles.productFormSection}>
          <div className={styles.productSectionHeading}><h3>Variants <span>(optional)</span></h3><p>Add options such as size or color. Each variant has its own SKU, price, and stock.</p></div>
          {variants.map((variant, index) => (
            <div className={styles.variantCard} key={variant.id}>
              <div className={styles.variantCardHeading}><strong>Variant {index + 1}</strong><button aria-label={`Remove variant ${index + 1}`} className={`${styles.iconButton} ${styles.dangerIcon}`} disabled={saving} onClick={() => setVariants((current) => current.filter((item) => item.id !== variant.id))} type="button"><Icon name="trash" size={16} /></button></div>
              <div className={styles.productFormGrid}>
                <label className={styles.formField}>Variant SKU <span>(optional)</span><input maxLength={120} onChange={(event) => updateVariant(variant.id, { sku: event.target.value })} value={variant.sku} /></label>
                <label className={styles.formField}>Price<input min="0" onChange={(event) => updateVariant(variant.id, { price: event.target.value })} required step="0.01" type="number" value={variant.price} /></label>
                <label className={styles.formField}>Compare-at price <span>(optional)</span><input min="0" onChange={(event) => updateVariant(variant.id, { compareAtPrice: event.target.value })} step="0.01" type="number" value={variant.compareAtPrice} /></label>
                <label className={styles.formField}>Stock<input min="0" onChange={(event) => updateVariant(variant.id, { stockQuantity: event.target.value })} required step="1" type="number" value={variant.stockQuantity} /></label>
                <div className={`${styles.productOptionList} ${styles.productFieldWide}`}>
                  {variant.options.map((option, optionIndex) => (
                    <div className={styles.productOptionRow} key={option.id}>
                      <label className={styles.formField}>Option name {optionIndex + 1}<input onChange={(event) => updateVariantOption(variant.id, option.id, { name: event.target.value })} placeholder="e.g. Size" value={option.name} /></label>
                      <label className={styles.formField}>Option value<input onChange={(event) => updateVariantOption(variant.id, option.id, { value: event.target.value })} placeholder="e.g. Medium" value={option.value} /></label>
                      <button aria-label={`Remove option ${optionIndex + 1} from variant ${index + 1}`} className={styles.iconButton} disabled={variant.options.length === 1} onClick={() => updateVariant(variant.id, { options: variant.options.filter((item) => item.id !== option.id) })} type="button"><Icon name="close" size={15} /></button>
                    </div>
                  ))}
                  <button className={styles.textButton} onClick={() => updateVariant(variant.id, { options: [...variant.options, { id: crypto.randomUUID(), name: "", value: "" }] })} type="button"><Icon name="plus" size={14} /> Add another option</button>
                </div>
              </div>
            </div>
          ))}
          <button className={styles.secondaryButton} disabled={saving} onClick={() => setVariants((current) => [...current, makeVariant()])} type="button"><Icon name="plus" size={15} /> Add variant</button>
        </section>

        <section className={styles.productFormSection}>
          <div className={styles.productSectionHeading}><h3>Product images <span>(optional)</span></h3><p>Choose up to {MAX_IMAGES} images. Each image can be up to 8 MB.</p></div>
          <label className={styles.productUploadButton}>
            <Icon name="plus" size={17} /> Choose images
            <input accept="image/*" disabled={saving || images.length >= MAX_IMAGES} multiple onChange={handleImageSelection} type="file" />
          </label>
          {images.length ? (
            <div className={styles.productImageGrid}>
              {images.map((image, index) => (
                <div className={styles.productImagePreview} key={image.id}>
                  {image.mediaType === "video"
                    ? <div className={styles.productVideoPreview}>Video</div>
                    : <Image alt={`Product preview ${index + 1}`} height={104} src={image.preview} unoptimized width={120} />}
                  <span>{index === 0 ? "Cover image" : `Image ${index + 1}`}</span>
                  <button
                    aria-label={`Remove image ${index + 1}`}
                    className={styles.iconButton}
                    disabled={saving || productLoading || Boolean(image.storagePath && (!currentUserId || !image.storagePath.startsWith(`${currentUserId}/`)))}
                    onClick={() => removeImage(image.id)}
                    title={image.storagePath && currentUserId && !image.storagePath.startsWith(`${currentUserId}/`) ? "Only files in your own upload folder can be removed from storage." : undefined}
                    type="button"
                  ><Icon name="close" size={15} /></button>
                </div>
              ))}
            </div>
          ) : <p className={styles.productImageHint}>No images selected yet.</p>}
        </section>

        <section className={styles.productFormSection}>
          <div className={styles.productSectionHeading}><h3>Policies <span>(optional)</span></h3><p>Share warranty and return information with customers.</p></div>
          <div className={styles.productFormGrid}>
            <label className={styles.formField}>Warranty<textarea maxLength={2000} onChange={(event) => setWarranty(event.target.value)} rows={2} value={warranty} /></label>
            <label className={styles.formField}>Return policy<textarea maxLength={2000} onChange={(event) => setReturnPolicy(event.target.value)} rows={2} value={returnPolicy} /></label>
          </div>
        </section>

        <div className={styles.modalActions}>
          <p className={styles.productPendingNote}>{editing ? "Product status is managed from the product catalog." : "New products are saved with pending status for review."}</p>
          <button className={styles.secondaryButton} disabled={saving} onClick={onClose} type="button">Cancel</button>
          <button className={styles.primaryButton} disabled={saving || optionsLoading || productLoading || !shops.length || Boolean(formError && productId)} type="submit">{saving ? "Saving product…" : editing ? "Save changes" : "Create product"}</button>
        </div>
      </form>
    </div>
  );
}
