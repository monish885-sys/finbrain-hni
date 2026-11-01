import type { ActionCard, Family, FirewallData, Holding } from "@capstone/types";

const API_BASE = process.env.NEXT_PUBLIC_CAPSTONE_API_URL ?? "http://localhost:4000";

export function isLiveApiEnabled(): boolean {
  return process.env.NEXT_PUBLIC_USE_LIVE_API === "true";
}

function tokenFromBrowser(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem("capstone_api_token");
}

export function tokenPresent(): boolean {
  return Boolean(tokenFromBrowser());
}

export function setLiveApiToken(token: string | null) {
  if (typeof window === "undefined") return;
  if (token) window.localStorage.setItem("capstone_api_token", token);
  else window.localStorage.removeItem("capstone_api_token");
}

export function getAuthMode(): "live" | "demo" | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem("capstone_auth_mode") as "live" | "demo" | null;
}

export function setAuthMode(mode: "live" | "demo" | null) {
  if (typeof window === "undefined") return;
  if (mode) window.localStorage.setItem("capstone_auth_mode", mode);
  else window.localStorage.removeItem("capstone_auth_mode");
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  headers.set("Content-Type", "application/json");
  const token = tokenFromBrowser();
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const res = await fetch(`${API_BASE}${path}`, { ...init, headers });
  if (!res.ok) {
    let detail = `${res.status}`;
    try {
      const body = (await res.json()) as { message?: string | string[] };
      if (body.message) detail = Array.isArray(body.message) ? body.message.join(", ") : body.message;
    } catch {
      /* ignore */
    }
    throw new Error(detail);
  }
  return (await res.json()) as T;
}

export type AuthUser = {
  id: string;
  email: string;
  name: string | null;
  primary_family_id: string | null;
  onboarding_status: string;
  families: Array<{
    family_id: string;
    name: string;
    role: string;
    onboarding_status: string;
    total_net_worth_inr: number;
  }>;
};

export type OnboardingStatus = {
  onboarding_status: string;
  family_id: string | null;
  family_name?: string;
  person: {
    id: string;
    name: string;
    pan_masked: string;
    pan_last4: string | null;
    mobile_masked?: string | null;
  } | null;
  persons?: Array<{
    id: string;
    name: string;
    role: string | null;
    pan_masked: string;
    mobile_masked: string | null;
  }>;
  asset_count: number;
  linked_account_count: number;
  consent_count: number;
  total_net_worth_inr: number;
};

/** Sets Next auth cookie so middleware allows portal routes. */
export async function establishWebSession(opts: {
  mode: "live" | "demo";
  onboardingStatus?: string;
}) {
  await fetch("/api/auth/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(opts),
  });
  setAuthMode(opts.mode);
}

export async function liveRegister(email: string, password: string, name: string) {
  const data = await apiFetch<{ access_token: string; user: { id: string; email: string; name: string } }>(
    "/auth/register",
    { method: "POST", body: JSON.stringify({ email, password, name }) },
  );
  setLiveApiToken(data.access_token);
  return data;
}

export async function liveLogin(email: string, password: string) {
  const data = await apiFetch<{ access_token: string; user: { id: string; email: string; name: string } }>(
    "/auth/login",
    { method: "POST", body: JSON.stringify({ email, password }) },
  );
  setLiveApiToken(data.access_token);
  return data;
}

export async function fetchMe(): Promise<AuthUser> {
  return apiFetch("/auth/me");
}

export async function fetchOnboardingStatus(): Promise<OnboardingStatus> {
  return apiFetch("/onboarding/status");
}

export async function postOnboardingProfile(body: {
  name: string;
  pan: string;
  mobile: string;
  familyName?: string;
}) {
  return apiFetch<OnboardingStatus>("/onboarding/profile", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function addOnboardingPerson(body: {
  name: string;
  role?: string;
  pan?: string;
  mobile?: string;
}) {
  return apiFetch<OnboardingStatus>("/onboarding/persons", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function postOnboardingComplete() {
  return apiFetch<OnboardingStatus>("/onboarding/complete", { method: "POST", body: "{}" });
}

export async function postAaConsent(familyId: string) {
  return apiFetch<{
    consent_id: string;
    holdings_ingested: number;
    message?: string;
    fip_types: string[];
  }>("/ingest/aa/consent", {
    method: "POST",
    body: JSON.stringify({ familyId }),
  });
}

export async function postCasIngest(familyId: string, payload: string, broker?: string) {
  return apiFetch<{ lots_imported: number }>("/ingest/cas", {
    method: "POST",
    body: JSON.stringify({ familyId, payload, broker }),
  });
}

export async function postManualAccounts(
  familyId: string,
  accounts: Array<{
    name: string;
    custodian: string;
    assetType: string;
    currentValueInr: number;
    costBasisInr?: number;
    quantity?: number;
    symbol?: string;
  }>,
) {
  return apiFetch<{ assets_created: number }>("/ingest/manual-accounts", {
    method: "POST",
    body: JSON.stringify({ familyId, accounts }),
  });
}

export type ConnectorDiscover = {
  pan_masked: string;
  message: string;
  connectors: Array<{
    provider: string;
    label: string;
    kind: string;
    description: string;
    configured: boolean;
    missing_env: string[];
    connection: {
      id: string;
      provider: string;
      status: string;
      last_sync_at: string | null;
      last_error: string | null;
      has_token: boolean;
    } | null;
  }>;
};

export async function fetchConnectorDiscover(familyId: string) {
  return apiFetch<ConnectorDiscover>(`/connectors/discover?familyId=${encodeURIComponent(familyId)}`);
}

export async function startConnector(provider: string, familyId: string, returnTo?: string) {
  return apiFetch<{
    provider: string;
    redirect_url: string;
    state: string;
    connection_id: string;
    message?: string;
  }>(`/connectors/${provider}/start`, {
    method: "POST",
    body: JSON.stringify({ familyId, returnTo }),
  });
}

export async function confirmAaJourney(familyId: string, state: string) {
  return apiFetch<{ ok: boolean; holdings_synced: number; message?: string }>("/connectors/aa/confirm", {
    method: "POST",
    body: JSON.stringify({ familyId, state }),
  });
}

export async function completeAaReturn(body: {
  success?: string;
  id?: string;
  familyId?: string;
  errorcode?: string;
  errormsg?: string;
}) {
  return apiFetch<{ ok: boolean; holdings_synced: number; message?: string }>("/connectors/aa/complete", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function syncConnectors(familyId: string, provider?: string) {
  return apiFetch<{ family_id: string; results: unknown[] }>("/connectors/sync", {
    method: "POST",
    body: JSON.stringify({ familyId, provider }),
  });
}

export async function fetchNetWorth(familyId?: string): Promise<{ family: Family; holdings: Holding[] }> {
  if (familyId) return apiFetch(`/family/${encodeURIComponent(familyId)}/networth`);
  return apiFetch("/family/networth");
}

export async function fetchFirewall(familyId: string): Promise<FirewallData> {
  return apiFetch(`/tax/firewall/status?familyId=${encodeURIComponent(familyId)}`);
}

export async function fetchActionCards(familyId: string): Promise<ActionCard[]> {
  return apiFetch(`/tax/action-cards?familyId=${encodeURIComponent(familyId)}`);
}

export async function patchActionCard(id: string, status: "pending" | "done" | "dismissed") {
  return apiFetch<ActionCard>(`/tax/action-cards/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}
