let API_BASE_URL = "https://water-p.onrender.com";
let authToken = null;

// Try to load token from localStorage if in web environment
if (typeof window !== 'undefined' && window.localStorage) {
  authToken = window.localStorage.getItem('smartwater_token') || null;
  const savedUrl = window.localStorage.getItem('smartwater_backend_url');
  if (savedUrl) {
    API_BASE_URL = savedUrl;
  }
}

export function setApiBaseUrl(url) {
  API_BASE_URL = url.replace(/\/$/, "");
  if (typeof window !== 'undefined' && window.localStorage) {
    window.localStorage.setItem('smartwater_backend_url', API_BASE_URL);
  }
}

export function getApiBaseUrl() {
  return API_BASE_URL;
}

export function setAuthToken(token) {
  authToken = token;
  if (typeof window !== 'undefined' && window.localStorage) {
    if (token) {
      window.localStorage.setItem('smartwater_token', token);
    } else {
      window.localStorage.removeItem('smartwater_token');
    }
  }
}

export function getAuthToken() {
  return authToken;
}

export async function ensureAuthenticated() {
  if (authToken) return authToken;
  
  // Auto-login with default demo credentials
  for (const pwd of ['password123', 'Password123!']) {
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'prince@gmail.com', password: pwd }),
      });
      const data = await res.json();
      if (data?.data?.token) {
        setAuthToken(data.data.token);
        return data.data.token;
      }
    } catch (e) {
      // try next candidate
    }
  }
  return null;
}

export async function apiRequest(path, options = {}) {
  const url = `${API_BASE_URL}${path.startsWith('/') ? path : '/' + path}`;
  
  if (!authToken && !path.includes('/auth/') && !path.includes('/health')) {
    await ensureAuthenticated();
  }

  const headers = {
    "Content-Type": "application/json",
    ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
    ...(options.headers || {}),
  };

  const response = await fetch(url, {
    ...options,
    headers,
  });

  const text = await response.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch (e) {
    data = text;
  }

  if (!response.ok) {
    const errorMsg = data?.message || `API error ${response.status}`;
    throw new Error(errorMsg);
  }

  return data;
}

export const api = {
  get: (path) => apiRequest(path, { method: "GET" }),
  post: (path, body) => apiRequest(path, { method: "POST", body: JSON.stringify(body) }),
  put: (path, body) => apiRequest(path, { method: "PUT", body: JSON.stringify(body) }),
  delete: (path) => apiRequest(path, { method: "DELETE" }),
};

/**
 * Send pump or mode command to the backend, which publishes to HiveMQ
 * topic: smartwater/{deviceId}/command
 * Supported commands: "ON", "OFF", "AUTO", "MANUAL"
 */
export async function sendPumpCommand(command, deviceId = "ESP32_001") {
  const normalized = String(command || "").toUpperCase();
  try {
    const result = await api.post("/api/device/command", {
      command: normalized,
      deviceId,
    });
    console.log("Pump command dispatched:", result);
    return result;
  } catch (error) {
    console.error("Pump command error:", error.message);
    throw error;
  }
}

// Connect these functions to UI buttons:
export const pumpOn = (deviceId = "ESP32_001") => sendPumpCommand("ON", deviceId);
export const pumpOff = (deviceId = "ESP32_001") => sendPumpCommand("OFF", deviceId);
export const autoMode = (deviceId = "ESP32_001") => sendPumpCommand("AUTO", deviceId);
