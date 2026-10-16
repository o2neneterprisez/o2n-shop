"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { supabase } from "@/lib/supabase/client";
import {
  DEFAULT_STAFF_PERMISSIONS,
  STAFF_PERMISSIONS,
  STAFF_ROLE_LABELS,
  type StaffPermissions,
  type StaffRole,
  type StaffUser,
} from "@/lib/admin/staff";
import styles from "../admin.module.css";
import { useAdminContext } from "./AdminContext";
import { DataError, DataSection, EmptyRow, formatDate, Icon, StatusBadge } from "./AdminUI";

type StaffFormValues = {
  displayName: string;
  email: string;
  phone: string;
  role: StaffRole;
  jobTitle: string;
  employeeCode: string;
  permissions: StaffPermissions;
  loginMethod: "invite" | "password";
  password: string;
};

const EMPTY_FORM: StaffFormValues = {
  displayName: "",
  email: "",
  phone: "",
  role: "fse",
  jobTitle: "",
  employeeCode: "",
  permissions: DEFAULT_STAFF_PERMISSIONS.fse,
  loginMethod: "invite",
  password: "",
};

async function staffRequest(method: "GET" | "POST" | "PATCH", body?: unknown) {
  if (!supabase) throw new Error("Supabase is not configured.");
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) throw new Error(`Unable to verify your session: ${sessionError.message}`);
  const accessToken = sessionData.session?.access_token;
  if (!accessToken) throw new Error("Your session has expired. Sign in again.");

  const response = await fetch("/api/admin/staff", {
    method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const result = await response.json() as { staff?: StaffUser | StaffUser[] | null; error?: string };
  if (!response.ok) throw new Error(result.error ?? "The staff request failed.");
  return result.staff;
}

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export function StaffManagement() {
  const { user, search } = useAdminContext();
  const canManage = user.role === "super_admin";
  const [staff, setStaff] = useState<StaffUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  // undefined: form closed, null: creating, StaffUser: editing.
  const [editing, setEditing] = useState<StaffUser | null | undefined>(undefined);
  const [form, setForm] = useState<StaffFormValues>(EMPTY_FORM);
  const [statusTarget, setStatusTarget] = useState<StaffUser | null>(null);

  const loadStaff = useCallback(async () => {
    if (!canManage) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setStaff((await staffRequest("GET") as StaffUser[] | undefined) ?? []);
    } catch (loadError) {
      setError(errorMessage(loadError, "Unable to load staff users."));
    } finally {
      setLoading(false);
    }
  }, [canManage]);

  useEffect(() => {
    const timeout = window.setTimeout(() => void loadStaff(), 0);
    return () => window.clearTimeout(timeout);
  }, [loadStaff]);

  const filteredStaff = useMemo(
    () => staff.filter((member) =>
      `${member.display_name ?? ""} ${member.email ?? ""} ${member.phone ?? ""} ${STAFF_ROLE_LABELS[member.role]} ${member.job_title ?? ""} ${member.employee_code ?? ""}`
        .toLowerCase()
        .includes(search.toLowerCase()),
    ),
    [search, staff],
  );

  function openCreateForm() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    setSuccessMessage(null);
  }

  function openEditForm(member: StaffUser) {
    if (member.role === "super_admin") return;
    setEditing(member);
    setForm({
      displayName: member.display_name ?? "",
      email: member.email ?? "",
      phone: member.phone ?? "",
      role: member.role,
      jobTitle: member.job_title ?? "",
      employeeCode: member.employee_code ?? "",
      permissions: member.permissions,
      loginMethod: "invite",
      password: "",
    });
    setFormError(null);
    setSuccessMessage(null);
  }

  function closeForm() {
    if (!saving) setEditing(undefined);
  }

  function changeRole(role: StaffRole) {
    // New users start from the role's usual permissions; existing users keep what they have.
    setForm((current) => ({
      ...current,
      role,
      permissions: editing ? current.permissions : DEFAULT_STAFF_PERMISSIONS[role],
    }));
  }

  function replaceMember(updated: StaffUser) {
    setStaff((current) => current.some((member) => member.id === updated.id)
      ? current.map((member) => member.id === updated.id ? updated : member)
      : [updated, ...current]);
  }

  async function saveStaff(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setFormError(null);
    try {
      const shared = {
        displayName: form.displayName,
        phone: form.phone,
        role: form.role,
        jobTitle: form.jobTitle,
        employeeCode: form.employeeCode,
        permissions: form.permissions,
      };
      const saved = editing
        ? await staffRequest("PATCH", { ...shared, id: editing.id, isActive: editing.is_active })
        : await staffRequest("POST", { ...shared, email: form.email, loginMethod: form.loginMethod, password: form.password });
      if (!saved || Array.isArray(saved)) throw new Error("The staff user was saved, but no details were returned.");
      replaceMember(saved);
      setEditing(undefined);
      setSuccessMessage(editing
        ? `${saved.display_name ?? "Staff user"} was updated.`
        : form.loginMethod === "invite"
          ? `Invitation sent to ${saved.email ?? form.email}. They can sign in after setting a password.`
          : `Login created for ${saved.email ?? form.email}. Share the temporary password with them securely.`);
    } catch (saveError) {
      setFormError(errorMessage(saveError, "Unable to save the staff user."));
    } finally {
      setSaving(false);
    }
  }

  async function changeStatus(member: StaffUser) {
    setSaving(true);
    setError(null);
    try {
      const saved = await staffRequest("PATCH", {
        id: member.id,
        displayName: member.display_name ?? "",
        phone: member.phone ?? "",
        role: member.role,
        jobTitle: member.job_title ?? "",
        employeeCode: member.employee_code ?? "",
        permissions: member.permissions,
        isActive: !member.is_active,
      });
      if (!saved || Array.isArray(saved)) throw new Error("The status was changed, but no details were returned.");
      replaceMember(saved);
      setSuccessMessage(`${saved.display_name ?? "Staff user"} was ${saved.is_active ? "reactivated" : "deactivated"}.`);
    } catch (statusError) {
      setError(errorMessage(statusError, "Unable to change the staff user's status."));
    } finally {
      setSaving(false);
      setStatusTarget(null);
    }
  }

  return (
    <>
      <DataError message={error} />
      {successMessage ? <div className={styles.alertSuccess} role="status">{successMessage}</div> : null}
      <DataSection
        title="Staff users"
        subtitle="Admins and Field Sales Executives who can sign in to O2N. Sellers and customers are managed separately."
        count={staff.length}
        onRefresh={() => void loadStaff()}
        action={canManage ? <button className={styles.primaryButton} onClick={openCreateForm} type="button"><Icon name="plus" size={16} /> Create user</button> : undefined}
      >
        {!canManage ? <div className={styles.permissionNote}>Only the super administrator can view and manage staff users.</div> : null}
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead><tr><th>User</th><th>Role</th><th>Job title</th><th>Permissions</th><th>Status</th><th>Last sign-in</th><th>Actions</th></tr></thead>
            <tbody>
              {filteredStaff.map((member) => {
                const granted = STAFF_PERMISSIONS.filter(({ key }) => member.permissions[key]);
                const isSelf = member.id === user.id;
                return (
                  <tr key={member.id}>
                    <td>
                      <div className={styles.personCell}>
                        <span className={styles.customerAvatar}>{(member.display_name || member.email || "U").slice(0, 1).toUpperCase()}</span>
                        <div>
                          <strong>{member.display_name || "Unnamed user"}</strong>
                          <small className={styles.subCell}>{member.email || "No email"}</small>
                          {member.phone ? <small className={styles.subCell}>{member.phone}</small> : null}
                        </div>
                      </div>
                    </td>
                    <td><span className={`${styles.staffRole} ${styles[`staffRole_${member.role}`]}`}>{STAFF_ROLE_LABELS[member.role]}</span></td>
                    <td>{member.job_title || "—"}{member.employee_code ? <small className={styles.subCell}>Code {member.employee_code}</small> : null}</td>
                    <td>
                      {member.role === "super_admin"
                        ? <span className={styles.muted}>Full access</span>
                        : granted.length
                          ? <div className={styles.permissionChips}>{granted.map(({ key, label }) => <span key={key}>{label}</span>)}</div>
                          : <span className={styles.muted}>None</span>}
                    </td>
                    <td><StatusBadge status={member.is_active ? "active" : "deactivated"} /></td>
                    <td>{member.last_sign_in_at ? formatDate(member.last_sign_in_at) : "Never"}</td>
                    <td>
                      {member.role === "super_admin" || isSelf ? <span className={styles.muted}>{isSelf ? "You" : "Protected"}</span> : (
                        <div className={styles.rowActions}>
                          <button aria-label={`Edit ${member.display_name || "staff user"}`} className={styles.iconButton} disabled={saving} onClick={() => openEditForm(member)} title="Edit user" type="button"><Icon name="edit" size={16} /></button>
                          <button className={member.is_active ? styles.dangerTextButton : styles.secondaryButton} disabled={saving} onClick={() => setStatusTarget(member)} type="button">
                            {member.is_active ? "Deactivate" : "Reactivate"}
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
              {!loading && canManage && !filteredStaff.length ? <EmptyRow columns={7} label={error ? "Staff data could not be loaded." : "No staff users match your search."} /> : null}
              {loading ? <EmptyRow columns={7} label="Loading staff users…" /> : null}
            </tbody>
          </table>
        </div>
      </DataSection>

      {editing !== undefined ? (
        <div className={styles.modalBackdrop} onMouseDown={(event) => { if (event.target === event.currentTarget) closeForm(); }} role="presentation">
          <form aria-labelledby="staff-form-title" aria-modal="true" className={`${styles.modal} ${styles.staffModal}`} onSubmit={(event) => void saveStaff(event)} role="dialog">
            <div className={styles.modalHeading}>
              <div>
                <h2 id="staff-form-title">{editing ? "Edit staff user" : "Create staff user"}</h2>
                <p>{editing ? "Update their details, role and permissions." : "Create a login for an Admin or Field Sales Executive."}</p>
              </div>
              <button aria-label="Close" className={styles.iconButton} disabled={saving} onClick={closeForm} type="button"><Icon name="close" size={18} /></button>
            </div>
            {formError ? <p className={styles.formError} role="alert">{formError}</p> : null}

            <div className={styles.productFormGrid}>
              <label className={styles.formField}>Full name
                <input autoFocus maxLength={120} minLength={2} onChange={(event) => setForm({ ...form, displayName: event.target.value })} required value={form.displayName} />
              </label>
              <label className={styles.formField}>Role
                <select onChange={(event) => changeRole(event.target.value as StaffRole)} value={form.role}>
                  <option value="admin">{STAFF_ROLE_LABELS.admin}</option>
                  <option value="fse">{STAFF_ROLE_LABELS.fse}</option>
                </select>
              </label>
              <label className={styles.formField}>Email {editing ? <span>(sign-in email, cannot be changed)</span> : null}
                <input autoComplete="off" disabled={Boolean(editing)} maxLength={254} onChange={(event) => setForm({ ...form, email: event.target.value })} required={!editing} type="email" value={form.email} />
              </label>
              <label className={styles.formField}>Mobile number <span>(optional, 10 digits)</span>
                <input autoComplete="off" inputMode="numeric" maxLength={14} onChange={(event) => setForm({ ...form, phone: event.target.value })} type="tel" value={form.phone} />
              </label>
              <label className={styles.formField}>Job title <span>(optional)</span>
                <input maxLength={120} onChange={(event) => setForm({ ...form, jobTitle: event.target.value })} placeholder={form.role === "fse" ? "Field Sales Executive" : "Administrator"} value={form.jobTitle} />
              </label>
              <label className={styles.formField}>Employee code <span>(optional)</span>
                <input maxLength={40} onChange={(event) => setForm({ ...form, employeeCode: event.target.value })} value={form.employeeCode} />
              </label>
            </div>

            <fieldset className={styles.permissionFieldset}>
              <legend>Permissions</legend>
              {STAFF_PERMISSIONS.map(({ key, label, description }) => (
                <label className={styles.permissionOption} key={key}>
                  <input
                    checked={Boolean(form.permissions[key])}
                    onChange={(event) => setForm({ ...form, permissions: { ...form.permissions, [key]: event.target.checked } })}
                    type="checkbox"
                  />
                  <span><strong>{label}</strong><small>{description}</small></span>
                </label>
              ))}
            </fieldset>

            {!editing ? (
              <fieldset className={styles.permissionFieldset}>
                <legend>Login</legend>
                <label className={styles.permissionOption}>
                  <input checked={form.loginMethod === "invite"} name="login-method" onChange={() => setForm({ ...form, loginMethod: "invite", password: "" })} type="radio" />
                  <span><strong>Send an invitation email</strong><small>They choose their own password from the link in the email.</small></span>
                </label>
                <label className={styles.permissionOption}>
                  <input checked={form.loginMethod === "password"} name="login-method" onChange={() => setForm({ ...form, loginMethod: "password" })} type="radio" />
                  <span><strong>Set a temporary password</strong><small>They can sign in straight away. Share the password with them securely.</small></span>
                </label>
                {form.loginMethod === "password" ? (
                  <label className={styles.formField}>Temporary password <span>(at least 8 characters)</span>
                    <input autoComplete="new-password" maxLength={72} minLength={8} onChange={(event) => setForm({ ...form, password: event.target.value })} required type="password" value={form.password} />
                  </label>
                ) : null}
              </fieldset>
            ) : null}

            <div className={styles.modalActions}>
              <button className={styles.secondaryButton} disabled={saving} onClick={closeForm} type="button">Cancel</button>
              <button className={styles.primaryButton} disabled={saving} type="submit">
                {saving ? "Saving…" : editing ? "Save changes" : form.loginMethod === "invite" ? "Create and send invite" : "Create user"}
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {statusTarget ? (
        <div className={styles.modalBackdrop} onMouseDown={(event) => { if (event.target === event.currentTarget && !saving) setStatusTarget(null); }} role="presentation">
          <section aria-labelledby="staff-status-title" aria-modal="true" className={styles.modal} role="alertdialog">
            <div className={styles.modalHeading}>
              <div>
                <h2 id="staff-status-title">{statusTarget.is_active ? "Deactivate" : "Reactivate"} {statusTarget.display_name || "this user"}?</h2>
                <p>
                  {statusTarget.is_active
                    ? "They will be signed out within the hour, cannot sign in again, and lose all admin permissions. Their account and history are kept."
                    : "They will be able to sign in again with their existing password and permissions."}
                </p>
              </div>
            </div>
            <div className={styles.modalActions}>
              <button className={styles.secondaryButton} disabled={saving} onClick={() => setStatusTarget(null)} type="button">Cancel</button>
              <button className={statusTarget.is_active ? styles.dangerButton : styles.primaryButton} disabled={saving} onClick={() => void changeStatus(statusTarget)} type="button">
                {saving ? "Saving…" : statusTarget.is_active ? "Deactivate user" : "Reactivate user"}
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
