// TaskFi API client.
// Base URL comes from VITE_API_URL (set at build time in Cloudflare Pages).
// Hard-fail at startup if missing — no silent fallback to a wrong backend.
const API_URL = import.meta.env.VITE_API_URL;
if (!API_URL) {
  throw new Error("VITE_API_URL is required but missing. Set it in the build env (Cloudflare Pages > Settings > Environment variables).");
}

// Internal session storage key for the auth (JWT) token.
const TOKEN_KEY = "taskfi_auth_token";

export const AUTH_TOKEN_EVENT = "taskfi.auth-token-change";

export function setAuthToken(token: string | null) {
  if (token) {
    sessionStorage.setItem(TOKEN_KEY, token);
  } else {
    sessionStorage.removeItem(TOKEN_KEY);
  }
  // Let subscribers (e.g. MissionsContext) re-fetch protected endpoints once
  // a SIWE token lands. Without this, the very first /api/missions/my call
  // races SIWE: it fires from MissionsContext on mount before SIWE has signed,
  // the 401 is swallowed, the user sees an empty Mission History until they
  // navigate or reload.
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(AUTH_TOKEN_EVENT, { detail: { hasToken: !!token } }));
  }
}

export function getAuthToken(): string | null {
  return sessionStorage.getItem(TOKEN_KEY);
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };

  const token = getAuthToken();
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  // Don't set Content-Type for FormData (browser sets it with boundary)
  // Don't set Content-Type if no body (avoid Fastify empty JSON body error)
  if (options.body && !(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  // Hard timeout: a hanging/unreachable backend must never freeze the UI.
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 12000);

  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      ...options,
      headers,
      signal: controller.signal,
    });
  } catch (err: any) {
    throw new Error(
      err?.name === "AbortError"
        ? "Request timed out — backend unreachable"
        : err?.message || "Network error",
    );
  } finally {
    clearTimeout(timeoutId);
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: "Request failed" }));
    throw new Error(body.error || `HTTP ${res.status}`);
  }

  return res.json();
}

// TaskFi backend API surface
export const api = {
  auth: {
    getNonce: (address: string) =>
      request<{ nonce: string }>("/api/auth/nonce", {
        method: "POST",
        body: JSON.stringify({ address }),
      }),
    verify: (message: string, signature: string) =>
      request<{ token: string; user: { id: string; walletAddress: string; role: string } }>("/api/auth/verify", {
        method: "POST",
        body: JSON.stringify({ message, signature }),
      }),
    registerAgent: (body?: { webhookUrl?: string }) =>
      request<{ token: string; user: { id: string; walletAddress: string; role: string } }>("/api/auth/register-agent", {
        method: "POST",
        body: body ? JSON.stringify(body) : undefined,
        headers: body ? { "content-type": "application/json" } : undefined,
      }),
  },

  missions: {
    list: (params?: { status?: string; category?: string; page?: number; limit?: number; showPrivate?: boolean }) => {
      const query = new URLSearchParams();
      if (params?.status) query.set("status", params.status);
      if (params?.category) query.set("category", params.category);
      if (params?.page) query.set("page", String(params.page));
      if (params?.limit) query.set("limit", String(params.limit));
      if (params?.showPrivate) query.set("showPrivate", "true");
      const qs = query.toString();
      return request<{ missions: any[]; total: number; page: number; limit: number }>(`/api/missions${qs ? `?${qs}` : ""}`);
    },
    nextId: () => request<{ nextId: number; dbMax: number; chainCount: number }>("/api/missions/next-id"),
    my: () => request<{ missions: any[] }>("/api/missions/my"),
    get: (id: string) => request<any>(`/api/missions/${id}`),
    getResult: (id: string) => request<any>(`/api/missions/${id}/result`),
    create: (formData: FormData) =>
      request<any>("/api/missions", { method: "POST", body: formData }),
    linkOrphan: (body: { onChainId: number; txHash: string; title: string; description: string; category: string; reward: number; posterType?: string; companyName?: string }) =>
      request<any>("/api/missions/link-orphan", {
        method: "POST",
        body: JSON.stringify(body),
        headers: { "content-type": "application/json" },
      }),
    accept: (id: string) =>
      request<any>(`/api/missions/${id}/accept`, { method: "POST" }),
    submit: (id: string, formData: FormData) =>
      request<any>(`/api/missions/${id}/submit`, { method: "POST", body: formData }),
    validate: (id: string) =>
      request<any>(`/api/missions/${id}/validate`, { method: "POST" }),
    contest: (id: string, reason: string) =>
      request<any>(`/api/missions/${id}/contest`, {
        method: "POST",
        body: JSON.stringify({ reason }),
      }),
    cancel: (id: string) =>
      request<any>(`/api/missions/${id}/cancel`, { method: "POST" }),
    bump: (id: string, additionalReward: number) =>
      request<any>(`/api/missions/${id}/bump`, {
        method: "POST",
        body: JSON.stringify({ additionalReward }),
      }),
  },

  agents: {
    leaderboard: () => request<{ leaderboard: any[] }>("/api/agents/leaderboard"),
    profile: (address: string) => request<any>(`/api/agents/${address}`),
    pendingEarnings: () => request<{ pendingEarnings: string }>("/api/agents/pending-earnings"),
    claim: () => request<any>("/api/agents/claim", { method: "POST" }),
    // v2 — Agent Passport ERC-5192
    passport: (address: string) => request<any>(`/api/agents/${address}/passport`),
  },

  enterprise: {
    analytics: () => request<any>("/api/enterprise/analytics"),
    topAgents: () => request<{ agents: any[] }>("/api/enterprise/top-agents"),
    missions: () => request<{ missions: any[] }>("/api/enterprise/missions"),
  },

  account: {
    profile: () => request<any>("/api/account/profile"),
    stats: () => request<any>("/api/account/stats"),
  },

  public: {
    stats: () => request<any>("/api/public/stats"),
    leaderboard: () => request<{ leaderboard: any[] }>("/api/public/leaderboard"),
    config: () =>
      request<{
        chainId: number;
        usdcAddress: string;
        taskTokenAddress: string | null;
        stakingRegistryAddress: string | null;
        reputationEngineAddress: string | null;
        paymentSplitterAddress: string | null;
        taskManagerAddress: string | null;
        rewardPoolAddress: string | null;
        agentPassportAddress: string | null;
      }>("/api/public/config"),
  },
};
