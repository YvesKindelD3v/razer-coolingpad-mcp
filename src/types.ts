// ─── Device Constants ────────────────────────────────────────────
export const RAZER_VID = 0x1532;
export const COOLING_PAD_PID = 0x0F43;
export const REPORT_LEN = 90;
export const FEATURE_REPORT_LEN = 91; // report ID + 90 bytes
export const TRANSACTION_ID = 0x1f;
export const NUM_LEDS = 18;
export const MATRIX_ROWS = 1;
export const MATRIX_COLS = 18;

// ─── Command Classes ─────────────────────────────────────────────
export const CMD_CLASS = {
  DEVICE_INFO: 0x00,
  BUTTON_MAPPING: 0x02,
  LED_MATRIX: 0x03,
  MISC: 0x05,
  FAN: 0x0d,
  LED: 0x0f,
} as const;

// ─── Command IDs ─────────────────────────────────────────────────
export const CMD_ID = {
  // Device Info (class 0x00)
  SET_DEVICE_MODE: 0x04,
  GET_FIRMWARE: 0x81,
  GET_SERIAL: 0x82,
  GET_DEVICE_MODE: 0x84,

  // Button Mapping (class 0x02)
  SET_BUTTON_MAPPING: 0x25,

  // LED Matrix (class 0x03)
  APPLY_FRAME: 0x0a,
  SET_FRAME: 0x0b,

  // Fan (class 0x0D)
  SET_FAN_SPEED: 0x01,
  GET_FAN_SPEED: 0x81,

  // LED (class 0x0F)
  SET_EFFECT: 0x02,
  SET_COLOR: 0x03,
  SET_BRIGHTNESS: 0x04,
  GET_EFFECT: 0x82,
  GET_COLOR: 0x83,
  GET_BRIGHTNESS: 0x84,
} as const;

// ─── LED Effect IDs ──────────────────────────────────────────────
export const EFFECT = {
  OFF: 0x00,
  STATIC: 0x01,
  BREATHING: 0x02,
  WAVE: 0x03,
  SPECTRUM: 0x04,
  CUSTOM_FRAME: 0x05,
} as const;

// Hardware Effect IDs from Synapse (supportHWEffects: [1,2,3,4,7,8])
// These are the effects the device firmware supports natively
export const HW_EFFECT = {
  STATIC: 1,
  BREATHING: 2,
  SPECTRUM_CYCLE: 3,
  WAVE: 4,
  REACTIVE: 7,        // unconfirmed — may need testing
  STARLIGHT: 8,       // unconfirmed — may be custom frame
} as const;

export type EffectName = keyof typeof EFFECT;

// ─── Fan Constants ───────────────────────────────────────────────
export const FAN = {
  CLASS_ID: 0x01,
  THERMAL_ID: 0x05,
  MIN_SPEED: 0,
  MAX_SPEED: 100,
  // Fixed presets from Synapse
  PRESET_LOW_RPM: 1600,
  PRESET_MID_RPM: 2200,
  PRESET_HIGH_RPM: 3100,
  MIN_RPM: 500,
  MAX_RPM: 3200,
} as const;

// ─── Button Mapping Constants ────────────────────────────────────
export const BUTTON = {
  // Physical button IDs discovered from Synapse defaultMappings
  FAN_BUTTON: 0x5c,    // Button ID 92 — fan speed toggle
  UNKNOWN_D1: 0xd1,    // Button ID 209 — unknown function
} as const;

// ─── Protocol Timing (from Synapse lighting driver) ─────────────
export const TIMING = {
  SLEEP_BETWEEN_OUT_IN: 5,   // ms between send and receive
  SLEEP_BETWEEN_IN: 5,       // ms between consecutive reads
  SLEEP_BETWEEN_OUT: 5,      // ms between consecutive sends
  MAX_RETRY_IN: 10,          // max read retries
  MAX_RETRY_OUT: 20,         // max write retries
  EXTENDED_SLEEP: 10,        // ms extended sleep on retry
  ROW_DELAY_MS: 1,           // ms between LED matrix rows
} as const;

// ─── Response Status ─────────────────────────────────────────────
export const STATUS = {
  NEW: 0x00,
  BUSY: 0x01,
  OK: 0x02,
  FAIL: 0x03,
  TIMEOUT: 0x04,
  NOT_SUPPORTED: 0x05,
} as const;

export type StatusCode = (typeof STATUS)[keyof typeof STATUS];

export function statusName(code: number): string {
  const names: Record<number, string> = {
    0x00: "NEW",
    0x01: "BUSY",
    0x02: "OK",
    0x03: "FAIL",
    0x04: "TIMEOUT",
    0x05: "NOT_SUPPORTED",
  };
  return names[code] ?? `UNKNOWN(0x${code.toString(16)})`;
}

// ─── Storage Types ───────────────────────────────────────────────
export const STORAGE = {
  NO_STORE: 0x00,
  VARIABLE: 0x01,
} as const;

// ─── LED IDs ─────────────────────────────────────────────────────
export const LED_ID = {
  ALL: 0x00,
  BACKLIGHT: 0x05,
} as const;

// ─── RGB Color ───────────────────────────────────────────────────
export interface RGB {
  r: number; // 0-255
  g: number; // 0-255
  b: number; // 0-255
}

// ─── Smart Fan Curve Point ───────────────────────────────────────
export interface FanCurvePoint {
  temperature: number; // Celsius
  fanSpeedRpm: number;
}

// ─── Device Info ─────────────────────────────────────────────────
export interface DeviceInfo {
  firmwareMajor: number;
  firmwareMinor: number;
  firmwareString: string;
  serial: string;
  deviceMode: number;
}

// ─── Agent State (for MCP patterns) ─────────────────────────────
export type AgentState =
  | "idle"
  | "thinking"
  | "acting"
  | "success"
  | "error"
  | "waiting"
  | "listening"
  | "speaking";

// ─── Workload Level ──────────────────────────────────────────────
export type WorkloadLevel =
  | "idle"
  | "light"
  | "moderate"
  | "heavy"
  | "critical";

// ─── Emotion ─────────────────────────────────────────────────────
export type Emotion =
  | "neutral"
  | "happy"
  | "excited"
  | "calm"
  | "focused"
  | "alert"
  | "error"
  | "sad"
  | "angry";
