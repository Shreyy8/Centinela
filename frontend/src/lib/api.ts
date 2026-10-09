const AUTH_URL = "http://localhost:8004";
const BENCHMARK_URL = "http://localhost:8006";
const SESSION_URL = "http://localhost:8000";
export const WS_URL = "ws://localhost:8011";

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem("token");
  const headers: Record<string, string> = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return headers;
}

async function handleResponse(resp: Response) {
  if (!resp.ok) {
    if (resp.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user_email");
      if (typeof window !== "undefined") {
        window.location.href = "/login?redirect=" + encodeURIComponent(window.location.pathname);
      }
    }
    const errorData = await resp.json().catch(() => ({ detail: "Request failed" }));
    throw new Error(errorData.detail || `HTTP ${resp.status}`);
  }
  return resp.json();
}

export const api = {
  async post(endpoint: string, data: any, baseUrl: string = AUTH_URL) {
    const response = await fetch(`${baseUrl}${endpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders(),
      },
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  async get(endpoint: string, baseUrl: string = AUTH_URL) {
    const response = await fetch(`${baseUrl}${endpoint}`, {
      method: "GET",
      headers: {
        ...authHeaders(),
      },
    });
    return handleResponse(response);
  },

  async delete(endpoint: string, baseUrl: string = AUTH_URL) {
    const response = await fetch(`${baseUrl}${endpoint}`, {
      method: "DELETE",
      headers: {
        ...authHeaders(),
      },
    });
    return handleResponse(response);
  },

  async put(endpoint: string, data: any, baseUrl: string = AUTH_URL) {
    const response = await fetch(`${baseUrl}${endpoint}`, {
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
