import { createClient } from "@supabase/supabase-js";

type ApplicationBody = {
  businessName?: unknown;
  contactName?: unknown;
  email?: unknown;
  phone?: unknown;
  address?: unknown;
  district?: unknown;
  state?: unknown;
  notes?: unknown;
  logoUrl?: unknown;
};

type TextValidation = { ok: true; value: string } | { ok: false; error: string };

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

function readRequiredText(value: unknown, label: string, min: number, max: number): TextValidation {
  if (typeof value !== "string") return { ok: false, error: `${label} is required.` };
  const text = value.trim();
  if (text.length < min || text.length > max) {
    return { ok: false, error: `${label} must be between ${min} and ${max} characters.` };
  }
  return { ok: true, value: text };
}

export async function POST(request: Request) {
  const accessToken = request.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!accessToken) return jsonError("Sign in to your O2N account before submitting an application.", 401);

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return jsonError("Seller applications are not configured. Contact O2N support.", 503);
  }

  const authenticatedClient = createClient(supabaseUrl, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: authData, error: authError } = await authenticatedClient.auth.getUser(accessToken);
  if (authError || !authData.user) return jsonError("Your session is invalid or expired. Sign in again.", 401);

  let body: ApplicationBody;
  try {
    body = await request.json() as ApplicationBody;
  } catch {
    return jsonError("The request must contain valid JSON.", 400);
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return jsonError("The request must contain a valid application.", 400);
  }

  const businessName = readRequiredText(body.businessName, "Business name", 2, 120);
  if (!businessName.ok) return jsonError(businessName.error, 400);
  const contactName = readRequiredText(body.contactName, "Contact person", 2, 120);
  if (!contactName.ok) return jsonError(contactName.error, 400);
  const emailField = readRequiredText(body.email, "Business email", 5, 254);
  if (!emailField.ok) return jsonError(emailField.error, 400);
  const phoneField = readRequiredText(body.phone, "Phone number", 7, 40);
  if (!phoneField.ok) return jsonError(phoneField.error, 400);
  const address = readRequiredText(body.address, "Business address", 3, 300);
  if (!address.ok) return jsonError(address.error, 400);
  const district = readRequiredText(body.district, "District or city", 2, 120);
  if (!district.ok) return jsonError(district.error, 400);
  const state = readRequiredText(body.state, "State", 2, 120);
  if (!state.ok) return jsonError(state.error, 400);
  const notes = readRequiredText(body.notes, "Products or services", 5, 2000);
  if (!notes.ok) return jsonError(notes.error, 400);

  const email = emailField.value.toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return jsonError("Enter a valid business email address.", 400);
  const phone = phoneField.value;
  if (!/^\+?[0-9\s().-]+$/.test(phone) || phone.replace(/\D/g, "").length < 7 || phone.replace(/\D/g, "").length > 15) {
    return jsonError("Enter a valid phone number with 7 to 15 digits.", 400);
  }

  // The logo is optional, but must be a file the applicant uploaded to their own storage folder.
  let logoUrl: string | null = null;
  if (body.logoUrl !== undefined && body.logoUrl !== null && body.logoUrl !== "") {
    const ownFolder = `${supabaseUrl.replace(/\/$/, "")}/storage/v1/object/public/product-images/${authData.user.id}/`;
    if (typeof body.logoUrl !== "string" || body.logoUrl.length > 1000 || !body.logoUrl.startsWith(ownFolder) || body.logoUrl.includes("..")) {
      return jsonError("The shop logo upload is not valid. Please choose the image again.", 400);
    }
    logoUrl = body.logoUrl;
  }

  const serviceClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { error: insertError } = await serviceClient.from("seller_applications").insert({
    owner_id: authData.user.id,
    business_name: businessName.value,
    contact_name: contactName.value,
    email,
    phone,
    address: address.value,
    district: district.value,
    state: state.value,
    notes: notes.value,
    logo_url: logoUrl,
    status: "pending",
  });

  if (insertError?.code === "23505") {
    return jsonError("An application already exists for this account, email address, or phone number.", 409);
  }
  if (insertError) {
    console.error("Unable to submit seller application:", insertError.message);
    return jsonError("Unable to submit your application. Please try again.", 500);
  }

  return Response.json({ success: true }, { status: 201 });
}
