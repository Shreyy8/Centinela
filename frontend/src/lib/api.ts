export const GATEWAY_URL = (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_GATEWAY_URL) || "http://localhost:8010";
export const WS_URL = (typeof import.meta !== "undefined" && import.meta.env?.VITE_WS_URL) || GATEWAY_URL.replace(/^http/, "ws");
export const IS_DEMO_MODE = typeof import.meta !== "undefined" && import.meta.env?.VITE_DEMO_MODE === "true";

export function resolveUrl(endpoint: string, baseUrl?: string): string {
  if (endpoint.startsWith("http://") || endpoint.startsWith("https://")) {
    return endpoint;
  }
  if (
    baseUrl &&
    baseUrl !== "http://localhost:8004" &&
    baseUrl !== "http://localhost:8006" &&
    baseUrl !== "http://localhost:8000" &&
    baseUrl !== "http://localhost:8011" &&
    baseUrl !== GATEWAY_URL
  ) {
    const base = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
    const path = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
    return `${base}${path}`;
  }

  const path = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  if (path.startsWith("/api/")) {
    return `${GATEWAY_URL}${path}`;
  }
  return `${GATEWAY_URL}/api${path}`;
}

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem("token");
  const headers: Record<string, string> = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return headers;
}

async function handleResponse(resp: Response) {
  if (!resp.ok) {
    if (resp.status === 401) {
      if (!IS_DEMO_MODE) {
        localStorage.removeItem("token");
        localStorage.removeItem("user_email");
        if (typeof window !== "undefined") {
          window.location.href = "/login?redirect=" + encodeURIComponent(window.location.pathname);
        }
      }
    }
    const errorData = await resp.json().catch(() => ({ detail: "Request failed" }));
    throw new Error(errorData.detail || `HTTP ${resp.status}`);
  }
  return resp.json();
}

export const api = {
  async post(endpoint: string, data: any, baseUrl?: string) {
    const url = resolveUrl(endpoint, baseUrl);
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders(),
      },
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  async get(endpoint: string, baseUrl?: string) {
    const url = resolveUrl(endpoint, baseUrl);
    const response = await fetch(url, {
      method: "GET",
      headers: {
        ...authHeaders(),
      },
    });
    return handleResponse(response);
  },

  async delete(endpoint: string, baseUrl?: string) {
    const url = resolveUrl(endpoint, baseUrl);
    const response = await fetch(url, {
      method: "DELETE",
      headers: {
        ...authHeaders(),
      },
    });
    return handleResponse(response);
  },

  async put(endpoint: string, data: any, baseUrl?: string) {
    const url = resolveUrl(endpoint, baseUrl);
    const response = await fetch(url, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders(),
      },
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  connectAuditWebSocket(
    sessionId: string,
    onMessage: (data: any) => void,
    onStatus: (status: "connecting" | "connected" | "disconnected" | "error", error?: string) => void,
  ): WebSocket {
    const token = localStorage.getItem("token");
    const ws = new WebSocket(`${WS_URL}/ws/${sessionId}?token=${token}`);

    ws.onopen = () => onStatus("connected");
    ws.onclose = () => onStatus("disconnected");
    ws.onerror = () => onStatus("error");

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "pong") return;
        onMessage(data);
      } catch {
        // ignore malformed messages
      }
    };

    const interval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "ping" }));
      }
    }, 30000);

    ws.addEventListener("close", () => clearInterval(interval));

    return ws;
  },
};
