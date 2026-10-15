"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { supabase } from "@/lib/supabase/client";
import type { Category } from "../types";
import styles from "../admin.module.css";
import { useAdminContext } from "./AdminContext";
import { DataError, DataSection, EmptyRow, Icon, StatusBadge } from "./AdminUI";

function slugify(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function CategoryManagement() {
  const { user, search } = useAdminContext();
  const canManage = user.role === "super_admin";
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editor, setEditor] = useState<Category | "new" | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const loadCategories = useCallback(async () => {
    if (!supabase) {
      setError("Supabase is not configured.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const { data, error: queryError } = await supabase.from("categories").select("id,name,slug,description,is_active").order("name");
    if (queryError) setError(`Unable to load categories: ${queryError.message}`);
    else setCategories((data ?? []) as Category[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => void loadCategories(), 0);
    return () => window.clearTimeout(timeout);
  }, [loadCategories]);

  const filteredCategories = useMemo(
    () => categories.filter((category) => `${category.name} ${category.slug}`.toLowerCase().includes(search.toLowerCase())),
    [categories, search],
  );

  function editCategory(category: Category | "new") {
    setEditor(category);
    setName(category === "new" ? "" : category.name);
    setDescription(category === "new" ? "" : category.description ?? "");
  }

  async function saveCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) return;
    const slug = slugify(name);
    if (!slug) {
      setError("Enter a category name containing letters or numbers.");
      return;
    }
    setBusyId("category-form");
    setError(null);
    const values = { name: name.trim(), slug, description: description.trim() || null };
    const result = editor && editor !== "new"
      ? await supabase.from("categories").update(values).eq("id", editor.id)
      : await supabase.from("categories").insert({ ...values, is_active: true });
    if (result.error) {
      setError(`Unable to save category: ${result.error.message}`);
    } else {
      setEditor(null);
      setName("");
      setDescription("");
      await loadCategories();
    }
    setBusyId(null);
  }

  async function deleteCategory(category: Category) {
    if (!supabase || !window.confirm(`Delete “${category.name}”?`)) return;
    setBusyId(category.id);
    setError(null);
    const { error: deleteError } = await supabase.from("categories").delete().eq("id", category.id);
    if (deleteError) setError(`Unable to delete category: ${deleteError.message}`);
    else await loadCategories();
    setBusyId(null);
  }

  return (
    <>
      <DataError message={error} />
      <DataSection
        title="Product categories"
        subtitle="Organize products so customers can browse the marketplace."
        count={categories.length}
        onRefresh={() => void loadCategories()}
        action={canManage ? <button className={styles.primaryButton} onClick={() => editCategory("new")} type="button"><Icon name="plus" size={17} /> Add category</button> : undefined}
      >
        {!canManage ? <div className={styles.permissionNote}>Only super administrators can add, edit, or delete categories.</div> : null}
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead><tr><th>Category</th><th>Slug</th><th>Description</th><th>Visibility</th><th>Actions</th></tr></thead>
            <tbody>
              {filteredCategories.map((category) => (
                <tr key={category.id}>
                  <td><strong>{category.name}</strong></td>
                  <td><code className={styles.slug}>{category.slug}</code></td>
                  <td className={styles.descriptionCell}>{category.description || "—"}</td>
                  <td><StatusBadge status={category.is_active ? "active" : "hidden"} /></td>
                  <td><div className={styles.rowActions}>{canManage ? <>
                    <button className={styles.iconButton} aria-label={`Edit ${category.name}`} onClick={() => editCategory(category)} type="button"><Icon name="edit" size={17} /></button>
                    <button className={`${styles.iconButton} ${styles.dangerIcon}`} aria-label={`Delete ${category.name}`} disabled={busyId === category.id} onClick={() => void deleteCategory(category)} type="button"><Icon name="trash" size={17} /></button>
                  </> : <span className={styles.muted}>Read only</span>}</div></td>
                </tr>
              ))}
              {!loading && !filteredCategories.length ? <EmptyRow columns={5} label={error ? "Category data could not be loaded." : "No categories match your search."} /> : null}
              {loading ? <EmptyRow columns={5} label="Loading categories…" /> : null}
            </tbody>
          </table>
        </div>
      </DataSection>

      {editor ? (
        <div className={styles.modalBackdrop} role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setEditor(null); }}>
          <form className={styles.modal} onSubmit={(event) => void saveCategory(event)}>
            <div className={styles.modalHeading}><div><h2>{editor === "new" ? "Add category" : "Edit category"}</h2><p>Organize the marketplace catalogue.</p></div><button aria-label="Close" className={styles.iconButton} onClick={() => setEditor(null)} type="button"><Icon name="close" size={18} /></button></div>
            <label className={styles.formField}>Category name<input autoFocus maxLength={100} onChange={(event) => setName(event.target.value)} required value={name} /></label>
            <label className={styles.formField}>Slug preview<input readOnly value={slugify(name)} /></label>
            <label className={styles.formField}>Description <span>(optional)</span><textarea maxLength={500} onChange={(event) => setDescription(event.target.value)} rows={3} value={description} /></label>
            <div className={styles.modalActions}><button className={styles.secondaryButton} onClick={() => setEditor(null)} type="button">Cancel</button><button className={styles.primaryButton} disabled={busyId === "category-form"} type="submit">{busyId === "category-form" ? "Saving…" : "Save category"}</button></div>
          </form>
        </div>
      ) : null}
    </>
  );
}
