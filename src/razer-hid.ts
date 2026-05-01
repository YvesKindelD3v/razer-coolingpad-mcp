/**
 * Low-level HID protocol layer for Razer Laptop Cooling Pad (PID 0x0F43).
 *
 * Packet format (90 bytes):
 *   [0]    status        0x00=new
 *   [1]    transaction   0x1F
 *   [2-3]  remaining     0x0000
 *   [4]    protocol      0x00
 *   [5]    data_size     argument byte count
 *   [6]    cmd_class     command class
 *   [7]    cmd_id        command ID
 *   [8-87] args          up to 80 bytes
 *   [88]   crc           XOR of bytes [2..87]
 *   [89]   reserved      0x00
 */

import HID from "node-hid";
import {
  RAZER_VID,
  COOLING_PAD_PID,
  REPORT_LEN,
  FEATURE_REPORT_LEN,
  TRANSACTION_ID,
  NUM_LEDS,
  CMD_CLASS,
  CMD_ID,
  EFFECT,
  FAN,
  STATUS,
  STORAGE,
  LED_ID,
  statusName,
  type RGB,
  type DeviceInfo,
  type StatusCode,
  type EffectName,
} from "./types.js";

// ─── CRC ─────────────────────────────────────────────────────────

function calcCRC(buf: Buffer): number {
  let crc = 0;
  for (let i = 2; i < 88; i++) crc ^= buf[i]!;
  return crc;
}

// ─── Packet Builder ──────────────────────────────────────────────

function buildPacket(
  cmdClass: number,
  cmdId: number,
  args: number[],
): Buffer {
  const buf = Buffer.alloc(REPORT_LEN, 0);
  buf[0] = 0x00; // status: new
  buf[1] = TRANSACTION_ID;
  buf[5] = args.length; // data size
  buf[6] = cmdClass;
  buf[7] = cmdId;
  for (let i = 0; i < args.length && i < 80; i++) {
    buf[8 + i] = args[i]!;
  }
  buf[88] = calcCRC(buf);
  return buf;
}

// ─── Sleep ───────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

// ─── Response Parser ─────────────────────────────────────────────

interface CommandResponse {
  status: StatusCode;
  statusName: string;
  cmdClass: number;
  cmdId: number;
  dataSize: number;
  data: number[];
  raw: Buffer;
}

function parseResponse(buf: Buffer): CommandResponse {
  // buf is 91 bytes: [reportId, ...90 packet bytes]
  const pkt = buf.subarray(1); // skip report ID
  const status = pkt[0] as StatusCode;
  return {
    status,
    statusName: statusName(status),
    cmdClass: pkt[6]!,
    cmdId: pkt[7]!,
    dataSize: pkt[5]!,
    data: Array.from(pkt.subarray(8, 8 + pkt[5]!)),
    raw: pkt,
  };
}

// ─── Device Class ────────────────────────────────────────────────

export class RazerCoolingPad {
  private dev: HID.HID | null = null;
  private commandDelay = 50; // ms between commands

  // ── Connection ──────────────────────────────────────────────

  open(): void {
    const info = HID.devices().find(
      (d) =>
        d.vendorId === RAZER_VID &&
        d.productId === COOLING_PAD_PID &&
        d.interface === 0,
    );
    if (!info?.path) {
      throw new Error(
        `Razer Cooling Pad not found (VID:0x${RAZER_VID.toString(16)} PID:0x${COOLING_PAD_PID.toString(16)})`,
      );
    }
    this.dev = new HID.HID(info.path);
  }

  close(): void {
    this.dev?.close();
    this.dev = null;
  }

  get isOpen(): boolean {
    return this.dev !== null;
  }

  // ── Raw Send/Receive ───────────────────────────────────────

  private async sendCommand(
    cmdClass: number,
    cmdId: number,
    args: number[],
  ): Promise<CommandResponse | null> {
    if (!this.dev) throw new Error("Device not open");

    const pkt = buildPacket(cmdClass, cmdId, args);
    const report = Buffer.alloc(FEATURE_REPORT_LEN, 0);
    report[0] = 0x00; // report ID
    pkt.copy(report, 1);

    this.dev.sendFeatureReport(Array.from(report));
    await sleep(this.commandDelay);

    try {
      const resp = Buffer.from(this.dev.getFeatureReport(0x00, FEATURE_REPORT_LEN));
      return parseResponse(resp);
    } catch {
      return null;
    }
  }

  // ── Device Info ─────────────────────────────────────────────

  async getDeviceInfo(): Promise<DeviceInfo> {
    const fw = await this.sendCommand(CMD_CLASS.DEVICE_INFO, CMD_ID.GET_FIRMWARE, []);
    const serial = await this.sendCommand(CMD_CLASS.DEVICE_INFO, CMD_ID.GET_SERIAL, new Array(22).fill(0));
    const mode = await this.sendCommand(CMD_CLASS.DEVICE_INFO, CMD_ID.GET_DEVICE_MODE, [0, 0]);

    const fwMajor = fw?.data[0] ?? 0;
    const fwMinor = fw?.data[1] ?? 0;

    const serialBytes = serial?.data ?? [];
    const serialStr = String.fromCharCode(
      ...serialBytes.filter((b) => b > 0 && b < 128),
    );

    return {
      firmwareMajor: fwMajor,
      firmwareMinor: fwMinor,
      firmwareString: `v${fwMajor}.${fwMinor.toString().padStart(2, "0")}`,
      serial: serialStr,
      deviceMode: mode?.data[0] ?? -1,
    };
  }

  // ── Fan Control ─────────────────────────────────────────────

  /**
   * Set fan speed as percentage (0-100).
   * Maps to HID: class=0x0D, cmd=0x01, args=[0x01, 0x05, speed]
   */
  async setFanSpeed(percent: number): Promise<boolean> {
    const speed = Math.max(FAN.MIN_SPEED, Math.min(FAN.MAX_SPEED, Math.round(percent)));
    const resp = await this.sendCommand(CMD_CLASS.FAN, CMD_ID.SET_FAN_SPEED, [
      FAN.CLASS_ID,
      FAN.THERMAL_ID,
      speed,
    ]);
    return resp?.status === STATUS.OK;
  }

  /**
   * Read current fan speed percentage.
   * Maps to HID: class=0x0D, cmd=0x81, args=[0x01, 0x05, 0x00]
   */
  async getFanSpeed(): Promise<number | null> {
    const resp = await this.sendCommand(CMD_CLASS.FAN, CMD_ID.GET_FAN_SPEED, [
      FAN.CLASS_ID,
      FAN.THERMAL_ID,
      0x00,
    ]);
    if (resp?.status === STATUS.OK && resp.data.length >= 3) {
      return resp.data[2]!;
    }
    return null;
  }

  /**
   * Convert fan percentage to approximate RPM.
   */
  static percentToRpm(percent: number): number {
    return Math.round(FAN.MIN_RPM + (percent / 100) * (FAN.MAX_RPM - FAN.MIN_RPM));
  }

  /**
   * Convert RPM to approximate fan percentage.
   */
  static rpmToPercent(rpm: number): number {
    return Math.round(((rpm - FAN.MIN_RPM) / (FAN.MAX_RPM - FAN.MIN_RPM)) * 100);
  }

  // ── LED Effects ─────────────────────────────────────────────

  /**
   * Set LED effect.
   * Maps to HID: class=0x0F, cmd=0x02
   */
  async setEffect(effect: EffectName, options?: {
    color?: RGB;
    speed?: number;    // 0x00-0xFF
    direction?: 1 | 2; // 1=left, 2=right
  }): Promise<boolean> {
    const effectId = EFFECT[effect];
    let args: number[];

    switch (effect) {
      case "STATIC":
        args = [
          STORAGE.VARIABLE, LED_ID.ALL, effectId,
          0x00, 0x00, 0x01,
          options?.color?.r ?? 255,
          options?.color?.g ?? 0,
          options?.color?.b ?? 0,
        ];
        break;
      case "BREATHING":
        args = [
          STORAGE.VARIABLE, LED_ID.ALL, effectId,
          0x00, 0x00, 0x01,
          options?.color?.r ?? 0,
          options?.color?.g ?? 255,
          options?.color?.b ?? 0,
        ];
        break;
      case "WAVE":
        args = [
          STORAGE.VARIABLE, LED_ID.ALL, effectId,
          options?.speed ?? 0x01,
          options?.direction ?? 1,
          0x00,
        ];
        break;
      case "SPECTRUM":
        args = [STORAGE.VARIABLE, LED_ID.ALL, effectId, 0x00, 0x00, 0x00];
        break;
      case "CUSTOM_FRAME":
        args = [STORAGE.VARIABLE, LED_ID.ALL, effectId, 0x00, 0x00, 0x00];
        break;
      case "OFF":
      default:
        args = [STORAGE.VARIABLE, LED_ID.ALL, effectId, 0x00, 0x00, 0x00];
        break;
    }

    const resp = await this.sendCommand(CMD_CLASS.LED, CMD_ID.SET_EFFECT, args);
    return resp?.status === STATUS.OK;
  }

  /**
   * Set static LED color (simple).
   * Maps to HID: class=0x0F, cmd=0x03, args=[0x01, 0x05, R, G, B]
   */
  async setColor(color: RGB): Promise<boolean> {
    const resp = await this.sendCommand(CMD_CLASS.LED, CMD_ID.SET_COLOR, [
      STORAGE.VARIABLE,
      LED_ID.BACKLIGHT,
      color.r,
      color.g,
      color.b,
    ]);
    return resp?.status === STATUS.OK;
  }

  /**
   * Set LED brightness (0-255).
   * Maps to HID: class=0x0F, cmd=0x04, args=[0x01, 0x05, brightness]
   */
  async setBrightness(brightness: number): Promise<boolean> {
    const val = Math.max(0, Math.min(255, Math.round(brightness)));
    const resp = await this.sendCommand(CMD_CLASS.LED, CMD_ID.SET_BRIGHTNESS, [
      STORAGE.VARIABLE,
      LED_ID.BACKLIGHT,
      val,
    ]);
    return resp?.status === STATUS.OK;
  }

  async getBrightness(): Promise<number | null> {
    const resp = await this.sendCommand(CMD_CLASS.LED, CMD_ID.GET_BRIGHTNESS, [
      STORAGE.VARIABLE,
      LED_ID.BACKLIGHT,
      0x00,
    ]);
    if (resp?.status === STATUS.OK && resp.data.length >= 3) {
      return resp.data[2]!;
    }
    return null;
  }

  // ── Custom Frame (Per-LED) ──────────────────────────────────

  /**
   * Set individual LED colors using custom frame.
   * Expects exactly 18 RGB values.
   *
   * Maps to HID:
   *   1. class=0x0F, cmd=0x02: set effect to CUSTOM_FRAME (0x05)
   *   2. class=0x03, cmd=0x0B: send 18-LED RGB data
   *   3. class=0x03, cmd=0x0A: apply frame
   */
  async setCustomFrame(leds: RGB[]): Promise<boolean> {
    if (leds.length !== NUM_LEDS) {
      throw new Error(`Expected ${NUM_LEDS} LEDs, got ${leds.length}`);
    }

    // 1. Switch to custom frame mode
    await this.setEffect("CUSTOM_FRAME");
    await sleep(30);

    // 2. Build frame data: [row_start, row_end, col_start, col_end, R0, G0, B0, ...]
    const args: number[] = [0x00, 0x00, 0x00, NUM_LEDS - 1];
    for (const led of leds) {
      args.push(led.r, led.g, led.b);
    }

    const resp = await this.sendCommand(CMD_CLASS.LED_MATRIX, CMD_ID.SET_FRAME, args);
    if (resp?.status !== STATUS.OK) return false;

    await sleep(10);

    // 3. Apply frame
    const apply = await this.sendCommand(CMD_CLASS.LED_MATRIX, CMD_ID.APPLY_FRAME, [LED_ID.BACKLIGHT]);
    return apply?.status === STATUS.OK;
  }

  /**
   * Fill all 18 LEDs with a single color.
   */
  async fillLeds(color: RGB): Promise<boolean> {
    return this.setCustomFrame(Array(NUM_LEDS).fill(color));
  }

  /**
   * Set a gradient across all 18 LEDs (from colorA to colorB).
   */
  async setGradient(from: RGB, to: RGB): Promise<boolean> {
    const leds: RGB[] = [];
    for (let i = 0; i < NUM_LEDS; i++) {
      const t = i / (NUM_LEDS - 1);
      leds.push({
        r: Math.round(from.r + (to.r - from.r) * t),
        g: Math.round(from.g + (to.g - from.g) * t),
        b: Math.round(from.b + (to.b - from.b) * t),
      });
    }
    return this.setCustomFrame(leds);
  }
}
