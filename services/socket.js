import { io } from "socket.io-client";
import { getApiBaseUrl, getAuthToken } from "./api";

let socketInstance = null;
let currentTankId = null;

export function getSocket() {
  return socketInstance;
}

export function connectSocket(onConnect, onDisconnect) {
  if (socketInstance && socketInstance.connected) {
    return socketInstance;
  }

  if (socketInstance) {
    socketInstance.disconnect();
  }

  const baseUrl = getApiBaseUrl();
  const token = getAuthToken();

  socketInstance = io(baseUrl, {
    auth: { token },
    transports: ["websocket", "polling"],
    reconnection: true,
    reconnectionAttempts: 20,
    reconnectionDelay: 1000,
  });

  socketInstance.on("connect", () => {
    console.log("🔌 Connected to Socket.IO live stream at", baseUrl, "Socket ID:", socketInstance.id);
    if (currentTankId) {
      socketInstance.emit("tank:join", currentTankId);
    }
    // Also join default tank 1
    socketInstance.emit("tank:join", 1);
    if (onConnect) onConnect(socketInstance);
  });

  socketInstance.on("disconnect", (reason) => {
    console.log("🔌 Disconnected from Socket.IO:", reason);
    if (onDisconnect) onDisconnect(reason);
  });

  return socketInstance;
}

export function subscribeToTank(tankId, callbacks = {}) {
  currentTankId = tankId;
  const socket = connectSocket();

  if (socket && socket.connected) {
    if (tankId) socket.emit("tank:join", tankId);
    socket.emit("tank:join", 1);
  }

  if (callbacks.onTelemetry) {
    socket.off("tank:telemetry");
    socket.on("tank:telemetry", (data) => {
      console.log("📡 Live Telemetry Received in App:", data);
      callbacks.onTelemetry(data);
    });
  }

  if (callbacks.onAlert) {
    socket.off("tank:alert");
    socket.on("tank:alert", (alert) => {
      console.log("🚨 Live Alert Received in App:", alert);
      callbacks.onAlert(alert);
    });
  }

  if (callbacks.onPumpEvent) {
    socket.off("tank:pump_event");
    socket.on("tank:pump_event", (event) => {
      console.log("⚡ Live Pump Event Received in App:", event);
      callbacks.onPumpEvent(event);
    });
  }

  if (callbacks.onDeviceStatus) {
    socket.off("tank:device_status");
    socket.on("tank:device_status", callbacks.onDeviceStatus);
  }
}

export function unsubscribeFromTank(tankId) {
  if (socketInstance && socketInstance.connected && tankId) {
    socketInstance.emit("tank:leave", tankId);
  }
}
