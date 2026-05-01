/**
 * Predefined patterns for mapping agent states, emotions, and workload
 * to cooling pad fan speed and LED effects.
 *
 * These patterns enable AI agents to use the cooling pad as a
 * physical feedback device — visual (LEDs) and audible (fan).
 */

import {
  type RGB,
  type AgentState,
  type WorkloadLevel,
  type Emotion,
  type EffectName,
  NUM_LEDS,
} from "./types.js";

// ─── Color Presets ───────────────────────────────────────────────

export const COLOR = {
  // Basics
  RED:     { r: 255, g: 0,   b: 0   },
  GREEN:   { r: 0,   g: 255, b: 0   },
  BLUE:    { r: 0,   g: 0,   b: 255 },
  WHITE:   { r: 255, g: 255, b: 255 },
  BLACK:   { r: 0,   g: 0,   b: 0   },
  YELLOW:  { r: 255, g: 255, b: 0   },
  CYAN:    { r: 0,   g: 255, b: 255 },
  MAGENTA: { r: 255, g: 0,   b: 255 },
  ORANGE:  { r: 255, g: 128, b: 0   },
  PURPLE:  { r: 128, g: 0,   b: 255 },

  // Razer brand
  RAZER_GREEN: { r: 0, g: 255, b: 68 },

  // Semantic
  SUCCESS:  { r: 0,   g: 255, b: 68  },
  WARNING:  { r: 255, g: 200, b: 0   },
  ERROR:    { r: 255, g: 30,  b: 0   },
  INFO:     { r: 0,   g: 150, b: 255 },
} as const satisfies Record<string, RGB>;

// ─── Emotion → LED Mapping ───────────────────────────────────────

export interface EmotionPattern {
  effect: EffectName;
  color: RGB;
  brightness: number; // 0-255
  description: string;
}

export const EMOTION_PATTERNS: Record<Emotion, EmotionPattern> = {
  neutral:  { effect: "SPECTRUM",  color: COLOR.WHITE,      brightness: 128, description: "Calm spectrum cycling" },
  happy:    { effect: "STATIC",    color: COLOR.RAZER_GREEN, brightness: 255, description: "Bright green — positive" },
  excited:  { effect: "WAVE",      color: COLOR.YELLOW,      brightness: 255, description: "Fast wave — high energy" },
  calm:     { effect: "BREATHING", color: COLOR.BLUE,        brightness: 180, description: "Slow blue breathing" },
  focused:  { effect: "STATIC",    color: COLOR.CYAN,        brightness: 200, description: "Steady cyan — concentration" },
  alert:    { effect: "BREATHING", color: COLOR.WARNING,     brightness: 255, description: "Pulsing amber — attention needed" },
  error:    { effect: "STATIC",    color: COLOR.ERROR,       brightness: 255, description: "Red — something went wrong" },
  sad:      { effect: "BREATHING", color: COLOR.PURPLE,      brightness: 100, description: "Dim purple breathing" },
  angry:    { effect: "WAVE",      color: COLOR.RED,         brightness: 255, description: "Red wave — frustration" },
};

// ─── Agent State → LED Mapping ───────────────────────────────────

export interface AgentStatePattern {
  effect: EffectName;
  color: RGB;
  brightness: number;
  fanPercent: number; // suggested fan speed
  description: string;
}

export const AGENT_STATE_PATTERNS: Record<AgentState, AgentStatePattern> = {
  idle:      { effect: "BREATHING", color: COLOR.BLUE,        brightness: 80,  fanPercent: 20,  description: "Gentle blue pulse — standing by" },
  thinking:  { effect: "WAVE",      color: COLOR.CYAN,        brightness: 200, fanPercent: 40,  description: "Cyan wave — processing" },
  acting:    { effect: "STATIC",    color: COLOR.RAZER_GREEN, brightness: 255, fanPercent: 60,  description: "Green — executing action" },
  success:   { effect: "STATIC",    color: COLOR.SUCCESS,     brightness: 255, fanPercent: 30,  description: "Bright green — task complete" },
  error:     { effect: "STATIC",    color: COLOR.ERROR,       brightness: 255, fanPercent: 30,  description: "Red — error occurred" },
  waiting:   { effect: "BREATHING", color: COLOR.YELLOW,      brightness: 150, fanPercent: 25,  description: "Amber breathing — waiting for input" },
  listening: { effect: "BREATHING", color: COLOR.INFO,        brightness: 180, fanPercent: 25,  description: "Blue pulse — listening" },
  speaking:  { effect: "WAVE",      color: COLOR.RAZER_GREEN, brightness: 220, fanPercent: 35,  description: "Green wave — generating output" },
};

// ─── Workload → Fan Speed Mapping ────────────────────────────────

export interface WorkloadPattern {
  fanPercent: number;
  ledColor: RGB;
  description: string;
}

export const WORKLOAD_PATTERNS: Record<WorkloadLevel, WorkloadPattern> = {
  idle:     { fanPercent: 15, ledColor: COLOR.BLUE,        description: "Minimal cooling, calm blue" },
  light:    { fanPercent: 30, ledColor: COLOR.CYAN,        description: "Light cooling, cyan" },
  moderate: { fanPercent: 50, ledColor: COLOR.RAZER_GREEN, description: "Moderate cooling, green" },
  heavy:    { fanPercent: 75, ledColor: COLOR.ORANGE,      description: "Active cooling, orange" },
  critical: { fanPercent: 100,ledColor: COLOR.RED,         description: "Maximum cooling, red alert" },
};

// ─── Smart Fan Curves (from Synapse reverse-engineering) ─────────

export interface FanCurvePoint {
  temperature: number;
  fanSpeedPercent: number;
}

function rpmToPercent(rpm: number): number {
  return Math.round(((rpm - 500) / (3200 - 500)) * 100);
}

export const SMART_FAN_CURVES = {
  cpu: {
    quiet: [
      { temperature: 40, fanSpeedPercent: rpmToPercent(500) },
      { temperature: 50, fanSpeedPercent: rpmToPercent(500) },
      { temperature: 85, fanSpeedPercent: rpmToPercent(1000) },
      { temperature: 90, fanSpeedPercent: rpmToPercent(1600) },
      { temperature: 100, fanSpeedPercent: rpmToPercent(1600) },
    ],
    balanced: [
      { temperature: 40, fanSpeedPercent: rpmToPercent(1617) },
      { temperature: 60, fanSpeedPercent: rpmToPercent(1617) },
      { temperature: 70, fanSpeedPercent: rpmToPercent(2200) },
      { temperature: 90, fanSpeedPercent: rpmToPercent(2200) },
      { temperature: 100, fanSpeedPercent: rpmToPercent(2200) },
    ],
    performance: [
      { temperature: 40, fanSpeedPercent: rpmToPercent(1000) },
      { temperature: 55, fanSpeedPercent: rpmToPercent(2000) },
      { temperature: 80, fanSpeedPercent: rpmToPercent(2700) },
      { temperature: 100, fanSpeedPercent: rpmToPercent(2700) },
    ],
  },
  gpu: {
    quiet: [
      { temperature: 30, fanSpeedPercent: rpmToPercent(500) },
      { temperature: 40, fanSpeedPercent: rpmToPercent(500) },
      { temperature: 75, fanSpeedPercent: rpmToPercent(1000) },
      { temperature: 80, fanSpeedPercent: rpmToPercent(1600) },
      { temperature: 90, fanSpeedPercent: rpmToPercent(1600) },
    ],
    balanced: [
      { temperature: 30, fanSpeedPercent: rpmToPercent(1000) },
      { temperature: 60, fanSpeedPercent: rpmToPercent(1148) },
      { temperature: 80, fanSpeedPercent: rpmToPercent(2200) },
      { temperature: 90, fanSpeedPercent: rpmToPercent(2200) },
    ],
    performance: [
      { temperature: 30, fanSpeedPercent: rpmToPercent(1000) },
      { temperature: 45, fanSpeedPercent: rpmToPercent(1000) },
      { temperature: 70, fanSpeedPercent: rpmToPercent(2700) },
      { temperature: 90, fanSpeedPercent: rpmToPercent(2700) },
    ],
  },
} as const;

/**
 * Combined CPU+GPU fan curves from Synapse.
 * Uses the higher of CPU or GPU curve values.
 */
export const SMART_FAN_CURVES_COMBINED = {
  quiet: [
    { temperature: 30, fanSpeedPercent: rpmToPercent(500) },
    { temperature: 40, fanSpeedPercent: rpmToPercent(500) },
    { temperature: 75, fanSpeedPercent: rpmToPercent(1000) },
    { temperature: 85, fanSpeedPercent: rpmToPercent(1000) },
    { temperature: 90, fanSpeedPercent: rpmToPercent(1600) },
    { temperature: 100, fanSpeedPercent: rpmToPercent(1600) },
  ],
  balanced: [
    { temperature: 30, fanSpeedPercent: rpmToPercent(1000) },
    { temperature: 40, fanSpeedPercent: rpmToPercent(1617) },
    { temperature: 60, fanSpeedPercent: rpmToPercent(1617) },
    { temperature: 70, fanSpeedPercent: rpmToPercent(2200) },
    { temperature: 90, fanSpeedPercent: rpmToPercent(2200) },
    { temperature: 100, fanSpeedPercent: rpmToPercent(2200) },
  ],
  performance: [
    { temperature: 30, fanSpeedPercent: rpmToPercent(1000) },
    { temperature: 40, fanSpeedPercent: rpmToPercent(1000) },
    { temperature: 55, fanSpeedPercent: rpmToPercent(2000) },
    { temperature: 70, fanSpeedPercent: rpmToPercent(2700) },
    { temperature: 90, fanSpeedPercent: rpmToPercent(2700) },
    { temperature: 100, fanSpeedPercent: rpmToPercent(2700) },
  ],
} as const;

/**
 * Interpolate fan speed from a curve based on temperature.
 */
export function interpolateFanCurve(
  curve: readonly FanCurvePoint[],
  temperature: number,
): number {
  if (curve.length === 0) return 50;
  if (temperature <= curve[0]!.temperature) return curve[0]!.fanSpeedPercent;
  if (temperature >= curve[curve.length - 1]!.temperature)
    return curve[curve.length - 1]!.fanSpeedPercent;

  for (let i = 0; i < curve.length - 1; i++) {
    const a = curve[i]!;
    const b = curve[i + 1]!;
    if (temperature >= a.temperature && temperature <= b.temperature) {
      const t =
        (temperature - a.temperature) / (b.temperature - a.temperature);
      return Math.round(
        a.fanSpeedPercent + t * (b.fanSpeedPercent - a.fanSpeedPercent),
      );
    }
  }
  return 50;
}

// ─── Progress Bar (per-LED) ──────────────────────────────────────

/**
 * Generate a progress bar using 18 LEDs.
 * Filled LEDs use `filledColor`, empty LEDs use `emptyColor`.
 */
export function progressBar(
  percent: number,
  filledColor: RGB = COLOR.RAZER_GREEN,
  emptyColor: RGB = { r: 10, g: 10, b: 10 },
): RGB[] {
  const filled = Math.round((percent / 100) * NUM_LEDS);
  return Array.from({ length: NUM_LEDS }, (_, i) =>
    i < filled ? filledColor : emptyColor,
  );
}

// ─── VU Meter / Level Indicator ──────────────────────────────────

/**
 * Generate a VU-meter style level indicator.
 * Green → Yellow → Red as level increases.
 */
export function levelMeter(percent: number): RGB[] {
  const filled = Math.round((percent / 100) * NUM_LEDS);
  return Array.from({ length: NUM_LEDS }, (_, i) => {
    if (i >= filled) return { r: 5, g: 5, b: 5 };
    const t = i / (NUM_LEDS - 1);
    if (t < 0.5) {
      // Green to Yellow
      return { r: Math.round(t * 2 * 255), g: 255, b: 0 };
    }
    // Yellow to Red
    return { r: 255, g: Math.round((1 - (t - 0.5) * 2) * 255), b: 0 };
  });
}

// ─── Rainbow Pattern ─────────────────────────────────────────────

export function rainbow(offset = 0): RGB[] {
  return Array.from({ length: NUM_LEDS }, (_, i) => {
    const hue = ((i / NUM_LEDS) * 360 + offset) % 360;
    return hsvToRgb(hue, 1, 1);
  });
}

function hsvToRgb(h: number, s: number, v: number): RGB {
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;
  let r: number, g: number, b: number;
  if (h < 60)       { r = c; g = x; b = 0; }
  else if (h < 120) { r = x; g = c; b = 0; }
  else if (h < 180) { r = 0; g = c; b = x; }
  else if (h < 240) { r = 0; g = x; b = c; }
  else if (h < 300) { r = x; g = 0; b = c; }
  else              { r = c; g = 0; b = x; }
  return {
    r: Math.round((r + m) * 255),
    g: Math.round((g + m) * 255),
    b: Math.round((b + m) * 255),
  };
}

// ─── Pulse (single LED chaser) ───────────────────────────────────

export function chaser(position: number, color: RGB, tailLength = 4): RGB[] {
  return Array.from({ length: NUM_LEDS }, (_, i) => {
    const dist = Math.abs(i - (position % NUM_LEDS));
    const wrap = Math.abs(i - (position % NUM_LEDS) + NUM_LEDS) % NUM_LEDS;
    const d = Math.min(dist, wrap);
    if (d === 0) return color;
    if (d <= tailLength) {
      const fade = 1 - d / (tailLength + 1);
      return {
        r: Math.round(color.r * fade),
        g: Math.round(color.g * fade),
        b: Math.round(color.b * fade),
      };
    }
    return { r: 0, g: 0, b: 0 };
  });
}

// ─── Split (left/right halves different colors) ──────────────────

export function split(left: RGB, right: RGB): RGB[] {
  const half = Math.floor(NUM_LEDS / 2);
  return Array.from({ length: NUM_LEDS }, (_, i) => (i < half ? left : right));
}

// ─── Temperature Heatmap ─────────────────────────────────────────

/**
 * Visualize a temperature value on the LED strip.
 * Cold (blue) → Warm (green) → Hot (red)
 */
export function temperatureHeatmap(
  tempCelsius: number,
  minTemp = 30,
  maxTemp = 95,
): RGB[] {
  const t = Math.max(0, Math.min(1, (tempCelsius - minTemp) / (maxTemp - minTemp)));
  let color: RGB;
  if (t < 0.5) {
    const p = t * 2;
    color = { r: 0, g: Math.round(p * 255), b: Math.round((1 - p) * 255) };
  } else {
    const p = (t - 0.5) * 2;
    color = { r: Math.round(p * 255), g: Math.round((1 - p) * 255), b: 0 };
  }
  return Array(NUM_LEDS).fill(color);
}
