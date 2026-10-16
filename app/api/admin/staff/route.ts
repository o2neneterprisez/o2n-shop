import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";
import {
  STAFF_PERMISSIONS,
  STAFF_ROLES,
  type StaffPermissions,
  type StaffRole,
  type StaffUser,
} from "@/lib/admin/staff";

type StaffBody = {
  id?: unknown;
  displayName?: unknown;
  email?: unknown;
  phone?: unknown;
  role?: unknown;
  jobTitle?: unknown;
  employeeCode?: unknown;
  permissions?: unknown;
  isActive?: unknown;
  loginMethod?: unknown;
  password?: unknown;
};

type ProfileRow = {
  id: string;
  display_name: string | null;
  phone: string | null;
  role: StaffUser["role"];
  created_at: string;
};

type AccessRow = {
  user_id: string;
  permissions: Record<string, unknown> | null;
  is_active: boolean;
  job_title: string | null;
  employee_code: string | null;
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
// Long enough to act as a permanent block until the account is reactivated.
const DEACTIVATED_BAN_DURATION = "876000h";

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

async function getAuthorizedClients(request: Request): Promise<
  { client: SupabaseClient; authenticatedClient: SupabaseClient; callerId: string; error?: never } | { client?: never; authenticatedClient?: never; callerId?: never; error: Response }
> {
  const accessToken = request.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!accessToken) return { error: jsonError("Sign in as the super administrator to manage staff users.", 401) };

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return { error: jsonError("Staff management is not configured. Set the server-side Supabase service-role key.", 503) };
  }

  const authenticatedClient = createClient(supabaseUrl, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
  const { data: authData, error: authError } = await authenticatedClient.auth.getUser(accessToken);
  if (authError || !authData.user) return { error: jsonError("Your session is invalid or expired. Sign in again.", 401) };

  const { data: isSuperAdmin, error: permissionError } = await authenticatedClient.rpc("is_super_admin");
  if (permissionError) {
    console.error("Unable to verify staff-management permission:", permissionError.message);
    return { error: jsonError("Unable to verify your staff-management permission.", 500) };
  }
  if (isSuperAdmin !== true) return { error: jsonError("Only the super administrator can manage staff users.", 403) };

  return {
    client: createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } }),
    authenticatedClient,
    callerId: authData.user.id,
  };
}

async function readBody(request: Request): Promise<StaffBody | Response> {
  try {
    const body = await request.json() as unknown;
    if (!body || typeof body !== "object" || Array.isArray(body)) return jsonError("The request must contain a staff user.", 400);
    return body as StaffBody;
  } catch {
    return jsonError("The request must contain valid JSON.", 400);
  }
}

function optionalText(value: unknown, max: number) {
  const text = typeof value === "string" ? value.trim() : "";
  return text.length > max ? undefined : text || null;
}

type ValidatedFields = {
  displayName: string;
  phone: string | null;
  role: StaffRole;
  jobTitle: string | null;
  employeeCode: string | null;
  permissions: StaffPermissions;
};

function validateFields(body: StaffBody): ValidatedFields | Response {
  const displayName = typeof body.displayName === "string" ? body.displayName.trim() : "";
  if (displayName.length < 2 || displayName.length > 120) return jsonError("Enter a name between 2 and 120 characters.", 400);

  const phoneDigits = typeof body.phone === "string" ? body.phone.replace(/\D/g, "") : "";
  if (phoneDigits && phoneDigits.length !== 10) return jsonError("The mobile number must contain exactly 10 digits.", 400);

  if (!STAFF_ROLES.includes(body.role as StaffRole)) return jsonError("Choose Admin or Field Sales Executive as the role.", 400);

  const jobTitle = optionalText(body.jobTitle, 120);
  if (jobTitle === undefined) return jsonError("The job title must be 120 characters or fewer.", 400);
  const employeeCode = optionalText(body.employeeCode, 40);
  if (employeeCode === undefined) return jsonError("The employee code must be 40 characters or fewer.", 400);

  const requested = body.permissions && typeof body.permissions === "object" ? body.permissions as Record<string, unknown> : {};
  const permissions = Object.fromEntries(
    STAFF_PERMISSIONS.map(({ key }) => [key, requested[key] === true]),
  ) as StaffPermissions;

  return { displayName, phone: phoneDigits || null, role: body.role as StaffRole, jobTitle, employeeCode, permissions };
}

function toStaffUser(profile: ProfileRow, access: AccessRow | undefined, user: User | null): StaffUser {
  const storedPermissions = access?.permissions ?? {};
  return {
    id: profile.id,
    display_name: profile.display_name,
    email: user?.email ?? null,
    phone: profile.phone,
    role: profile.role,
    job_title: access?.job_title ?? null,
    employee_code: access?.employee_code ?? null,
    permissions: Object.fromEntries(
      STAFF_PERMISSIONS.map(({ key }) => [key, profile.role === "super_admin" || storedPermissions[key] === true]),
    ) as StaffPermissions,
    // Super admins have no admin_access row and are always active.
    is_active: profile.role === "super_admin" ? true : access?.is_active ?? true,
    created_at: profile.created_at,
    last_sign_in_at: user?.last_sign_in_at ?? null,
  };
}

async function loadStaffUser(client: SupabaseClient, id: string): Promise<StaffUser | null> {
  const [{ data: profile }, { data: access }, { data: userData }] = await Promise.all([
    client.from("profiles").select("id,display_name,phone,role,created_at").eq("id", id).maybeSingle(),
    client.from("admin_access").select("user_id,permissions,is_active,job_title,employee_code").eq("user_id", id).maybeSingle(),
    client.auth.admin.getUserById(id),
  ]);
  return profile ? toStaffUser(profile as ProfileRow, (access ?? undefined) as AccessRow | undefined, userData.user) : null;
}

function databaseErrorMessage(error: { code?: string; message: string }, fallback: string) {
  if (error.code === "23505") return "That mobile number is already used by another account.";
  console.error(fallback, error.message);
  if (
    error.code === "PGRST202"
    || error.message.includes("admin_provision_staff_profile")
    || error.message.includes("Only an administrator can change account roles")
  ) {
    return `${fallback} Apply the staff-profile provisioning migration (20261017130000) to the database, then retry.`;
  }
  // 23514: a check constraint rejected the row, e.g. the role list in the database is out of date.
  if (error.code === "23514" && error.message.includes("profiles_role_check")) {
    return `${fallback} The database does not allow this role yet; apply the staff-roles migration.`;
  }
  return fallback;
}

export async function GET(request: Request) {
  const authorization = await getAuthorizedClients(request);
  if (authorization.error) return authorization.error;
  const { client } = authorization;

  const [{ data: profiles, error: profileError }, { data: accessRows, error: accessError }] = await Promise.all([
    client
      .from("profiles")
      .select("id,display_name,phone,role,created_at")
      .in("role", ["super_admin", ...STAFF_ROLES])
      .order("created_at", { ascending: false }),
    client.from("admin_access").select("user_id,permissions,is_active,job_title,employee_code"),
  ]);
  if (profileError || accessError) {
    console.error("Unable to load staff users:", (profileError ?? accessError)?.message);
    return jsonError("Unable to load staff users.", 500);
  }

  const accessById = new Map(((accessRows ?? []) as AccessRow[]).map((row) => [row.user_id, row]));
  const staffProfiles = (profiles ?? []) as ProfileRow[];
  const users = await Promise.all(staffProfiles.map((profile) => client.auth.admin.getUserById(profile.id)));

  return Response.json({
    staff: staffProfiles.map((profile, index) => toStaffUser(profile, accessById.get(profile.id), users[index].data.user)),
  });
}

export async function POST(request: Request) {
  const authorization = await getAuthorizedClients(request);
  if (authorization.error) return authorization.error;
  const { client, authenticatedClient, callerId } = authorization;

  const body = await readBody(request);
  if (body instanceof Response) return body;
  const fields = validateFields(body);
  if (fields instanceof Response) return fields;

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return jsonError("Enter a valid email address.", 400);

  const usePassword = body.loginMethod === "password";
  const password = typeof body.password === "string" ? body.password : "";
  if (usePassword && (password.length < 8 || password.length > 72)) {
    return jsonError("The temporary password must be between 8 and 72 characters.", 400);
  }

  const { data: created, error: createError } = usePassword
    ? await client.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fields.displayName },
    })
    : await client.auth.admin.inviteUserByEmail(email, {
      data: { full_name: fields.displayName },
      redirectTo: new URL("/auth/update-password", request.url).toString(),
    });
  if (createError || !created.user) {
    const alreadyExists = createError?.message.toLowerCase().includes("already");
    return jsonError(
      alreadyExists ? "An account with this email address already exists." : createError?.message ?? "Supabase did not return the new user.",
      alreadyExists ? 409 : 400,
    );
  }
  const userId = created.user.id;

  const removeCreatedUser = async (message: string, status: number) => {
    const { error: cleanupError } = await client.auth.admin.deleteUser(userId);
    return jsonError(cleanupError ? `${message} The login could not be removed: ${cleanupError.message}` : message, status);
  };

  const { error: profileError } = await authenticatedClient.rpc("admin_provision_staff_profile", {
    p_staff_id: userId,
    p_display_name: fields.displayName,
    p_phone: fields.phone,
    p_role: fields.role,
    p_must_change_password: usePassword,
  });
  if (profileError) {
    return removeCreatedUser(databaseErrorMessage(profileError, "Unable to save the staff profile."), profileError.code === "23505" ? 409 : 500);
  }

  const { error: accessError } = await client.from("admin_access").insert({
    user_id: userId,
    permissions: fields.permissions,
    is_active: true,
    created_by: callerId,
    job_title: fields.jobTitle ?? (fields.role === "fse" ? "Field Sales Executive" : "Administrator"),
    employee_code: fields.employeeCode,
  });
  if (accessError) return removeCreatedUser(databaseErrorMessage(accessError, "Unable to save staff permissions."), 500);

  const staffUser = await loadStaffUser(client, userId);
  return Response.json({ staff: staffUser }, { status: 201 });
}

export async function PATCH(request: Request) {
  const authorization = await getAuthorizedClients(request);
  if (authorization.error) return authorization.error;
  const { client, authenticatedClient, callerId } = authorization;

  const body = await readBody(request);
  if (body instanceof Response) return body;
  const id = typeof body.id === "string" ? body.id : "";
  if (!UUID_PATTERN.test(id)) return jsonError("A valid staff user is required.", 400);
  if (id === callerId) return jsonError("You cannot change your own staff account here.", 400);

  const { data: target, error: targetError } = await client.from("profiles").select("role").eq("id", id).maybeSingle();
  if (targetError) return jsonError(databaseErrorMessage(targetError, "Unable to load the staff user."), 500);
  if (!target || !STAFF_ROLES.includes(target.role as StaffRole)) return jsonError("Staff user not found.", 404);

  const fields = validateFields(body);
  if (fields instanceof Response) return fields;
  if (typeof body.isActive !== "boolean") return jsonError("Choose whether the staff user is active.", 400);
  const isActive = body.isActive;

  const { data: existingAccess } = await client.from("admin_access").select("permissions,is_active").eq("user_id", id).maybeSingle();
  const previouslyActive = existingAccess?.is_active ?? true;

  const { error: profileError } = await authenticatedClient.rpc("admin_provision_staff_profile", {
    p_staff_id: id,
    p_display_name: fields.displayName,
    p_phone: fields.phone,
    p_role: fields.role,
  });
  if (profileError) return jsonError(databaseErrorMessage(profileError, "Unable to update the staff profile."), profileError.code === "23505" ? 409 : 500);

  const { error: accessError } = await client.from("admin_access").upsert({
    user_id: id,
    // Keep any other permission keys already stored for this user.
    permissions: { ...(existingAccess?.permissions ?? {}), ...fields.permissions },
    is_active: isActive,
    job_title: fields.jobTitle ?? (fields.role === "fse" ? "Field Sales Executive" : "Administrator"),
    employee_code: fields.employeeCode,
  });
  if (accessError) return jsonError(databaseErrorMessage(accessError, "Unable to update staff permissions."), 500);

  if (isActive !== previouslyActive) {
    const { error: banError } = await client.auth.admin.updateUserById(id, {
      ban_duration: isActive ? "none" : DEACTIVATED_BAN_DURATION,
    });
    if (banError) {
      console.error("Unable to change staff sign-in access:", banError.message);
      return jsonError(
        `Details were saved, but sign-in could not be ${isActive ? "restored" : "blocked"}: ${banError.message}`,
        500,
      );
    }
  }

  const staffUser = await loadStaffUser(client, id);
  return Response.json({ staff: staffUser });
}
