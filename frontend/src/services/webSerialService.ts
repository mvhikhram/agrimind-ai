import { SerialLogEntry } from '../types';
import { parseEsp32Line, ParsedEsp32Message } from './esp32Protocol';

export type WebSerialStatus = 'DISCONNECTED' | 'REQUESTING' | 'CONNECTING' | 'CONNECTED' | 'ERROR';

type SerialListener = (status: WebSerialStatus, logs: SerialLogEntry[]) => void;
type PacketListener = (parsed: ParsedEsp32Message) => void;

class WebSerialService {
  private port: any = null;
  private reader: any = null;
  private writer: any = null;
  private keepReading: boolean = false;
  private status: WebSerialStatus = 'DISCONNECTED';
  private logs: SerialLogEntry[] = [];
  private listeners: Set<SerialListener> = new Set();
  private packetListeners: Set<PacketListener> = new Set();
  private selectedBaudRate: number = 115200;
  private portInfo: string | null = null;
  private errorMessage: string | null = null;

  constructor() {
    // Listen for device connect/disconnect events if supported
    if (this.isSupported()) {
      (navigator as any).serial?.addEventListener?.('disconnect', (event: any) => {
        if (this.port && event.target === this.port) {
          this.addLog('system', 'USB Serial device disconnected by host hardware.');
          this.disconnect();
        }
      });
    }
  }

  isSupported(): boolean {
    return typeof navigator !== 'undefined' && 'serial' in navigator;
  }

  getStatus(): WebSerialStatus {
    return this.status;
  }

  getLogs(): SerialLogEntry[] {
    return [...this.logs];
  }

  getPortInfo(): string | null {
    return this.portInfo;
  }

  getErrorMessage(): string | null {
    return this.errorMessage;
  }

  getSelectedBaudRate(): number {
    return this.selectedBaudRate;
  }

  setSelectedBaudRate(baud: number): void {
    this.selectedBaudRate = baud;
  }

  subscribe(listener: SerialListener): () => void {
    this.listeners.add(listener);
    listener(this.status, this.getLogs());
    return () => this.listeners.delete(listener);
  }

  onPacket(listener: PacketListener): () => void {
    this.packetListeners.add(listener);
    return () => this.packetListeners.delete(listener);
  }

  private notify(): void {
    const logsCopy = this.getLogs();
    this.listeners.forEach((l) => l(this.status, logsCopy));
  }

  private addLog(direction: 'rx' | 'tx' | 'system' | 'error', text: string, isJson?: boolean): void {
    const entry: SerialLogEntry = {
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }) + '.' + String(Date.now() % 1000).padStart(3, '0'),
      direction,
      text,
      isJson
    };

    this.logs.push(entry);
    if (this.logs.length > 500) {
      this.logs.shift();
    }
    this.notify();
  }

  clearLogs(): void {
    this.logs = [];
    this.notify();
  }

  copyLogs(): string {
    return this.logs
      .map((l) => `[${l.timestamp}] [${l.direction.toUpperCase()}] ${l.text}`)
      .join('\n');
  }

  /**
   * Requests a serial port and initiates reading loop.
   * MUST be triggered by direct user click interaction.
   */
  async connect(baudRate: number = this.selectedBaudRate): Promise<{ success: boolean; message: string }> {
    if (!this.isSupported()) {
      const err = 'Web Serial API is not supported in this browser. Please use Google Chrome, Microsoft Edge, or Opera over HTTPS / localhost.';
      this.errorMessage = err;
      this.addLog('error', err);
      return { success: false, message: err };
    }

    if (this.status === 'CONNECTED') {
      return { success: true, message: 'Already connected.' };
    }

    try {
      this.status = 'REQUESTING';
      this.errorMessage = null;
      this.notify();
      this.addLog('system', 'Opening browser USB Port selection dialog...');

      // Prompt user to select port
      this.port = await (navigator as any).serial.requestPort();
      this.selectedBaudRate = baudRate;

      this.status = 'CONNECTING';
      this.notify();
      this.addLog('system', `Opening serial port at ${baudRate} baud (8-N-1)...`);

      await this.port.open({ baudRate });

      const info = this.port.getInfo?.();
      const usbVendor = info?.usbVendorId ? ` (Vendor 0x${info.usbVendorId.toString(16).padStart(4, '0')})` : '';
      this.portInfo = `USB Serial Port${usbVendor} @ ${baudRate} baud`;

      this.status = 'CONNECTED';
      this.keepReading = true;
      this.addLog('system', `Connected to ${this.portInfo}. Listening for newline-delimited messages.`);

      // Launch background reader loop
      this.startReadingLoop();

      return { success: true, message: `Connected to ESP32 Serial at ${baudRate} baud.` };
    } catch (err: any) {
      this.status = 'ERROR';
      let message = err.message || 'Failed to connect to serial port.';

      if (err.name === 'NotFoundError') {
        message = 'No serial port selected / selection cancelled.';
        this.status = 'DISCONNECTED';
      } else if (err.name === 'SecurityError') {
        message = 'Serial access blocked by browser security policy. Ensure HTTPS or localhost is used.';
      } else if (err.name === 'InvalidStateError' || message.includes('already open')) {
        message = 'Port is already open or in use by another application (e.g. Arduino Serial Monitor).';
      }

      this.errorMessage = message;
      this.addLog('error', `Connection error: ${message}`);
      this.cleanup();
      return { success: false, message };
    }
  }

  /**
   * Continuous stream reader reading chunked UTF-8 data and accumulating lines.
   */
  private async startReadingLoop(): Promise<void> {
    if (!this.port || !this.port.readable) return;

    let lineBuffer = '';
    const textDecoder = new TextDecoder();

    try {
      while (this.port.readable && this.keepReading) {
        this.reader = this.port.readable.getReader();

        try {
          while (this.keepReading) {
            const { value, done } = await this.reader.read();
            if (done) break;
            if (value) {
              const chunk = textDecoder.decode(value, { stream: true });
              lineBuffer += chunk;

              const lines = lineBuffer.split(/\r?\n/);
              // The last item is the remainder (either incomplete line or empty string)
              lineBuffer = lines.pop() || '';

              for (const line of lines) {
                if (line.trim().length > 0) {
                  this.processIncomingLine(line);
                }
              }
            }
          }
        } catch (readErr: any) {
          if (this.keepReading) {
            this.addLog('error', `Serial stream read error: ${readErr.message || readErr}`);
          }
        } finally {
          if (this.reader) {
            try {
              this.reader.releaseLock();
            } catch (e) {
              // ignore
            }
            this.reader = null;
          }
        }
      }
    } catch (err: any) {
      if (this.keepReading) {
        this.addLog('error', `Serial fatal stream error: ${err.message || err}`);
      }
    } finally {
      if (this.keepReading) {
        this.disconnect();
      }
    }
  }

  /**
   * Parse complete line and notify packet listeners.
   */
  private processIncomingLine(line: string): void {
    const parsed = parseEsp32Line(line);
    this.addLog('rx', line, parsed.isJson);

    // Forward to any registered IoT packet listeners
    this.packetListeners.forEach((listener) => {
      try {
        listener(parsed);
      } catch (err) {
        console.error('Error handling ESP32 packet in listener:', err);
      }
    });
  }

  /**
   * Send a raw string or command to the ESP32.
   */
  async send(data: string): Promise<{ success: boolean; message: string }> {
    if (this.status !== 'CONNECTED' || !this.port || !this.port.writable) {
      const msg = 'Cannot send: Serial port is not connected.';
      this.addLog('error', msg);
      return { success: false, message: msg };
    }

    try {
      const textEncoder = new TextEncoder();
      const payload = data.endsWith('\n') ? data : data + '\n';
      const encoded = textEncoder.encode(payload);

      this.writer = this.port.writable.getWriter();
      await this.writer.write(encoded);
      this.writer.releaseLock();
      this.writer = null;

      this.addLog('tx', data.trim());
      return { success: true, message: 'Message sent.' };
    } catch (err: any) {
      const msg = `Send failed: ${err.message || err}`;
      this.addLog('error', msg);
      if (this.writer) {
        try {
          this.writer.releaseLock();
        } catch (e) {
          // ignore
        }
        this.writer = null;
      }
      return { success: false, message: msg };
    }
  }

  /**
   * Disconnects the serial port cleanly.
   */
  async disconnect(): Promise<void> {
    this.keepReading = false;

    if (this.reader) {
      try {
        await this.reader.cancel();
      } catch (e) {
        // ignore
      }
    }

    if (this.writer) {
      try {
        await this.writer.abort();
      } catch (e) {
        // ignore
      }
    }

    await this.cleanup();
    this.status = 'DISCONNECTED';
    this.portInfo = null;
    this.addLog('system', 'Serial port disconnected.');
    this.notify();
  }

  private async cleanup(): Promise<void> {
    if (this.port) {
      try {
        await this.port.close();
      } catch (e) {
        // ignore
      }
      this.port = null;
    }
    this.reader = null;
    this.writer = null;
  }
}

export const webSerialService = new WebSerialService();
