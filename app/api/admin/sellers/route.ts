import { createClient, type SupabaseClient } from "@supabase/supabase-js";

type SellerBody = {
  displayName?: unknown;
  email?: unknown;
  phone?: unknown;
  id?: unknown;
};

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

async function getAuthorizedAdminClient(request: Request): Promise<
  { client: SupabaseClient; authenticatedClient: SupabaseClient; error?: never } | { client?: never; authenticatedClient?: never; error: Response }
> {
  const accessToken = request.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!accessToken) {
    return { error: jsonError("Sign in as an administrator to manage sellers.", 401) };
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return { error: jsonError("Seller management is not configured. Set the server-side Supabase service-role key.", 503) };
  }

  const authenticatedClient = createClient(supabaseUrl, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
  const { data: authData, error: authError } = await authenticatedClient.auth.getUser(accessToken);
  if (authError || !authData.user) {
    return { error: jsonError("Your session is invalid or expired. Sign in again.", 401) };
  }

  const { data: canManageSellers, error: permissionError } = await authenticatedClient.rpc("has_admin_permission", {
    permission_name: "seller_review",
  });
  if (permissionError) {
    console.error("Unable to verify seller-management permission:", permissionError.message);
    return { error: jsonError("Unable to verify your seller-review permission.", 500) };
  }
  if (canManageSellers !== true) {
    return { error: jsonError("You do not have permission to manage sellers.", 403) };
  }

  return {
    client: createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    }),
    authenticatedClient,
  };
}

async function readBody(request: Request): Promise<SellerBody | Response> {
  try {
    return await request.json() as SellerBody;
  } catch {
    return jsonError("The request must contain valid JSON.", 400);
  }
}

function isResponse(value: SellerBody | Response): value is Response {
  return value instanceof Response;
}

function validatedProfileFields(body: SellerBody) {
  const displayName = typeof body.displayName === "string" ? body.displayName.trim() : "";
  const phone = typeof body.phone === "string" ? body.phone.trim() : "";
  if (displayName.length < 2 || displayName.length > 120) {
    return { error: jsonError("Enter a seller name between 2 and 120 characters.", 400) };
  }
  if (phone.length > 40) {
    return { error: jsonError("The phone number must be 40 characters or fewer.", 400) };
  }
  return { displayName, phone: phone || null };
}

export async function GET(request: Request) {
  const authorization = await getAuthorizedAdminClient(request);
  if (authorization.error) return authorization.error;

  const { data: profiles, error: profileError } = await authorization.client
    .from("profiles")
    .select("id,display_name,phone,created_at")
    .eq("role", "seller")
    .order("created_at", { ascending: false });
  if (profileError) {
    console.error("Unable to load seller profiles:", profileError.message);
    return jsonError("Unable to load sellers.", 500);
  }

  const usersById = new Map<string, { email: string | null }>();
  const perPage = 1000;
  for (let page = 1; ; page += 1) {
    const { data, error: usersError } = await authorization.client.auth.admin.listUsers({ page, perPage });
    if (usersError) {
      console.error("Unable to load seller account emails:", usersError.message);
      return jsonError("Unable to load seller account details.", 500);
    }
    for (const user of data.users) usersById.set(user.id, { email: user.email ?? null });
    if (data.users.length < perPage) break;
  }

  return Response.json({
    sellers: (profiles ?? []).map((profile) => ({
      ...profile,
      email: usersById.get(profile.id)?.email ?? null,
    })),
  });
}

export async function POST(request: Request) {
  const authorization = await getAuthorizedAdminClient(request);
  if (authorization.error) return authorization.error;

  const body = await readBody(request);
  if (isResponse(body)) return body;
  const fields = validatedProfileFields(body);
  if (fields.error) return fields.error;

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return jsonError("Enter a valid seller email address.", 400);
  }

  const { data: inviteData, error: inviteError } = await authorization.client.auth.admin.inviteUserByEmail(email, {
    data: { full_name: fields.displayName },
    redirectTo: new URL("/auth/update-password", request.url).toString(),
  });
  if (inviteError || !inviteData.user) {
    return jsonError(inviteError?.message ?? "Supabase did not return the invited seller.", 400);
  }

  const { error: profileError } = await authorization.authenticatedClient.rpc("admin_provision_seller_profile", {
    p_seller_id: inviteData.user.id,
    p_display_name: fields.displayName,
    p_phone: fields.phone,
  });
  if (profileError) {
    const { error: cleanupError } = await authorization.client.auth.admin.deleteUser(inviteData.user.id);
    console.error("Unable to provision invited seller profile:", profileError.message);
    return jsonError(
      cleanupError
        ? `The invitation was sent, but seller setup and account cleanup failed: ${cleanupError.message}`
        : "The invitation was sent, but seller setup failed. The temporary account was removed; please try again.",
      500,
    );
  }

  return Response.json({
    seller: {
      id: inviteData.user.id,
      display_name: fields.displayName,
      phone: fields.phone,
      email: inviteData.user.email ?? email,
      created_at: inviteData.user.created_at,
    },
  }, { status: 201 });
}

export async function PATCH(request: Request) {
  const authorization = await getAuthorizedAdminClient(request);
  if (authorization.error) return authorization.error;

  const body = await readBody(request);
  if (isResponse(body)) return body;
  const id = typeof body.id === "string" ? body.id : "";
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    return jsonError("A valid seller account is required.", 400);
  }

  const fields = validatedProfileFields(body);
  if (fields.error) return fields.error;
  const { data, error: updateError } = await authorization.client
    .from("profiles")
    .update({ display_name: fields.displayName, phone: fields.phone })
    .eq("id", id)
    .eq("role", "seller")
    .select("id,display_name,phone,created_at")
    .maybeSingle();

  if (updateError) {
    console.error("Unable to update seller profile:", updateError.message);
    return jsonError("Unable to update seller details.", 500);
  }
  if (!data) return jsonError("Seller account not found.", 404);

  const { data: userData, error: userError } = await authorization.client.auth.admin.getUserById(id);
  if (userError) {
    console.error("Unable to load updated seller account email:", userError.message);
    return jsonError("Seller details were saved, but the account email could not be loaded.", 500);
  }
  return Response.json({ seller: { ...data, email: userData.user.email ?? null } });
}
