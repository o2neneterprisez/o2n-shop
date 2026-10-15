import { createClient } from "@supabase/supabase-js";

type InviteOwnerRequest = {
  displayName?: unknown;
  email?: unknown;
};

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

export async function POST(request: Request) {
  const authorization = request.headers.get("authorization");
  const accessToken = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!accessToken) return jsonError("Sign in as an administrator to invite a shop owner.", 401);

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return jsonError("Shop owner invitations are not configured. Set the server-side Supabase service-role key.", 503);
  }

  const authenticatedClient = createClient(supabaseUrl, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
  const { data: authData, error: authError } = await authenticatedClient.auth.getUser(accessToken);
  if (authError || !authData.user) return jsonError("Your session is invalid or expired. Sign in again.", 401);

  const { data: canManageShops, error: permissionError } = await authenticatedClient.rpc("has_admin_permission", {
    permission_name: "shop_moderation",
  });
  if (permissionError) {
    console.error("Unable to verify shop-owner invitation permission:", permissionError.message);
    return jsonError("Unable to verify your shop-moderation permission.", 500);
  }
  if (canManageShops !== true) return jsonError("You do not have permission to invite shop owners.", 403);

  let body: InviteOwnerRequest;
  try {
    body = await request.json() as InviteOwnerRequest;
  } catch {
    return jsonError("The invitation request must contain valid JSON.", 400);
  }

  const displayName = typeof body.displayName === "string" ? body.displayName.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (displayName.length < 2 || displayName.length > 120) {
    return jsonError("Enter a name between 2 and 120 characters.", 400);
  }
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return jsonError("Enter a valid email address.", 400);
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: inviteData, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(email, {
    data: { full_name: displayName },
    redirectTo: new URL("/auth/update-password", request.url).toString(),
  });
  if (inviteError || !inviteData.user) {
    return jsonError(inviteError?.message ?? "Supabase did not return the invited user.", 400);
  }

  const { error: profileError } = await authenticatedClient.rpc("admin_provision_seller_profile", {
    p_seller_id: inviteData.user.id,
    p_display_name: displayName,
    p_phone: null,
  });
  if (profileError) {
    const { error: cleanupError } = await adminClient.auth.admin.deleteUser(inviteData.user.id);
    console.error("Unable to provision invited shop-owner profile:", profileError.message);
    return jsonError(
      cleanupError
        ? `The invitation was sent, but seller setup and account cleanup failed: ${cleanupError.message}`
        : "The invitation was sent, but seller setup failed. The temporary account was removed; please try again.",
      500,
    );
  }

  return Response.json({
    seller: { id: inviteData.user.id, displayName, email },
  }, { status: 201 });
}
