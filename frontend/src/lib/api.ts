const BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

class ApiClient {
  private baseUrl: string;
  private isRefreshing = false;
  private refreshSubscribers: ((token: string) => void)[] = [];

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private getAuthState() {
    if (typeof window === "undefined") return null;
    try {
      const stored = localStorage.getItem("omip-auth");
      if (stored) return JSON.parse(stored)?.state;
    } catch {}
    return null;
  }

  private onTokenFetched(token: string) {
    this.refreshSubscribers.map((cb) => cb(token));
    this.refreshSubscribers = [];
  }

  private async refreshToken(): Promise<string | null> {
    const auth = this.getAuthState();
    if (!auth?.refreshToken) return null;

    try {
      const res = await fetch(`${this.baseUrl}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: auth.refreshToken }),
      });

      if (!res.ok) throw new Error("Refresh failed");

      const { data } = await res.json();
      const newToken = data.accessToken;

      // Update local storage manually for the singleton
      const updated = { ...auth, token: newToken };
      localStorage.setItem("omip-auth", JSON.stringify({ state: updated, version: 0 }));

      return newToken;
    } catch {
      localStorage.removeItem("omip-auth");
      window.location.href = "/auth/login";
      return null;
    }
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
    options?: RequestInit
  ): Promise<T> {
    const auth = this.getAuthState();
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...((options?.headers as Record<string, string>) ?? {}),
    };

    if (auth?.token) {
      headers["Authorization"] = `Bearer ${auth.token}`;
    }

    const response = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      ...options,
    });

    if (response.status === 401 && auth?.refreshToken && !path.includes("/auth/refresh")) {
      if (!this.isRefreshing) {
        this.isRefreshing = true;
        const newToken = await this.refreshToken();
        this.isRefreshing = false;
        if (newToken) {
          this.onTokenFetched(newToken);
        }
      }

      return new Promise((resolve) => {
        this.refreshSubscribers.push((token: string) => {
          headers["Authorization"] = `Bearer ${token}`;
          resolve(this.request<T>(method, path, body, options));
        });
      });
    }

    if (!response.ok) {
      let message = `Error ${response.status}`;
      try {
        const err = await response.json();
        message = err.message || err.detail || message;
      } catch {}
      throw new ApiError(response.status, message);
    }

    if (response.status === 204) return undefined as T;
    return response.json();
  }

  async get<T>(path: string, opts?: RequestInit) { return this.request<T>("GET", path, undefined, opts); }
  async post<T>(path: string, body?: unknown, opts?: RequestInit) { return this.request<T>("POST", path, body, opts); }
  async put<T>(path: string, body?: unknown, opts?: RequestInit) { return this.request<T>("PUT", path, body, opts); }
  async patch<T>(path: string, body?: unknown, opts?: RequestInit) { return this.request<T>("PATCH", path, body, opts); }
  async delete<T>(path: string, opts?: RequestInit) { return this.request<T>("DELETE", path, undefined, opts); }
}

export const api = new ApiClient(BASE_URL);
