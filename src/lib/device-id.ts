// ============================================================================
// STUDENT BRIDGE — CLIENT DEVICE FINGERPRINTING & HARDWARE IDENTIFICATION
// Generates a durable device UUID and human-readable device model/OS signature.
// Enforces single-device authentication locking per account.
// ============================================================================

export interface DeviceFingerprint {
  deviceId: string;
  deviceInfo: string;
}

const DEVICE_ID_KEY = "sb_device_hw_id";

export function getClientDeviceFingerprint(): DeviceFingerprint {
  if (typeof window === "undefined") {
    return {
      deviceId: "server-session",
      deviceInfo: "Server Environment",
    };
  }

  // 1. Retrieve or generate durable device ID
  let deviceId = "";
  try {
    deviceId = localStorage.getItem(DEVICE_ID_KEY) || "";
  } catch {}

  if (!deviceId || deviceId.length < 16) {
    // Generate cryptographic UUID
    if (typeof crypto !== "undefined" && crypto.randomUUID) {
      deviceId = crypto.randomUUID();
    } else {
      deviceId = `dev_${Date.now()}_${Math.random().toString(36).substring(2, 12)}`;
    }
    try {
      localStorage.setItem(DEVICE_ID_KEY, deviceId);
      // Also store in cookie for server-side middleware awareness
      document.cookie = `sb_device_id=${deviceId}; path=/; max-age=31536000; SameSite=Lax`;
    } catch {}
  }

  // 2. Derive friendly device info
  const ua = navigator.userAgent;
  let os = "Unknown OS";
  let browser = "Browser";

  // Detect OS
  if (/windows nt 10/i.test(ua)) os = "Windows 10/11";
  else if (/windows nt/i.test(ua)) os = "Windows PC";
  else if (/android/i.test(ua)) {
    const modelMatch = ua.match(/;\s*([^;]+)\s+Build/i);
    const model = modelMatch ? modelMatch[1].trim() : "Android Device";
    os = `Android (${model})`;
  } else if (/iphone/i.test(ua)) os = "Apple iPhone";
  else if (/ipad/i.test(ua)) os = "Apple iPad";
  else if (/macintosh|mac os x/i.test(ua)) os = "Apple Mac";
  else if (/linux/i.test(ua)) os = "Linux PC";

  // Detect Browser
  if (/edg\//i.test(ua)) browser = "Edge";
  else if (/chrome|crios/i.test(ua)) browser = "Chrome";
  else if (/firefox|fxios/i.test(ua)) browser = "Firefox";
  else if (/safari/i.test(ua)) browser = "Safari";

  // Screen metrics for clarity (e.g. "1920x1080")
  const screenSpec = typeof screen !== "undefined" ? ` [${screen.width}x${screen.height}]` : "";

  const deviceInfo = `${os} • ${browser}${screenSpec}`;

  return { deviceId, deviceInfo };
}
