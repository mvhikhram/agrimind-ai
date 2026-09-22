# AGRIMIND AI 🌾🤖⚡
**AUTONOMOUS AGRITECH**

> **Intelligent Full-Stack IoT + AI Precision Agriculture Platform**  
> Built for hackathons & real-world agritech deployment. Combines edge hardware telemetry, sequential drip irrigation, rule-based crop planning, profit/loss modeling, plant leaf disease vision diagnostics, volumetric water analytics, contextual Farm Copilot, and a farmer community forum.

---

## 🏗️ System Architecture

```
Physical Sensors                     Hardware Microcontroller                      Cloud & Edge Dashboard
────────────────                    ─────────────────────────                      ──────────────────────
• 2x Soil Moisture Probes ──┐
• 1x YF-S201 Flow Sensor ───┼─► STM32F410RB ──► ESP32 Wi-Fi ──► Supabase / REST ──► AGRIMIND AI Web App
• 1x HC-SR04 Tank Level  ───┤   Nucleo MCU       Transceiver     PostgreSQL RLS        React + TypeScript
• 1x DHT22 Temp / Hum    ───┤                                                          Tailwind CSS
• 1x LDR Solar Light     ───┘                                                          9 Dedicated Pages
• 1x DS3231 RTC & I2C LCD

Actuators:
• 3x 12V DC Pumps ◄───────── 4-Channel Relay ◄── STM32 Actuator Controller ◄── Remote Pump Command
```

### ⚡ Critical Hardware Prototype Constraint: Single Flow Sensor
The physical testbed possesses **one YF-S201 flow sensor**.  
Therefore, the application enforces **sequential zone irrigation**:
- Only one DC pump can be actively monitored at a time to associate water volumetric flow (1.7 L/min).
- Prevents conflicting flow measurements across multiple simultaneous pumps.

---

## 📱 The 9 Application Modules

1. **Dashboard**: Main command center featuring live telemetry cards (Moisture, Tank, Water Used, Flow, Temp, Humidity, Light, Pump), zone health badges, smart farm insights, "WHAT SHOULD I DO TODAY?" daily checklist, and interactive hackathon demo buttons (**SIMULATE DRY SOIL** & **START IRRIGATION**).
2. **My Farm**: Multi-farm management system, 3-zone plot visualizer, geographic location card, and interactive **Add New Farm** modal wizard.
3. **Crop Planner**: 6-step guided agronomic workflow (Farm → Location → Season → Soil & pH → Water → Ranked Crop Recommendations), comparative crop matrix, and dynamic **Profit/Loss Calculator** with real-time "WHAT IF?" sensitivity toggles (+/- 20% yield, +/- 10% selling price).
4. **Smart Irrigation**: Auto & Manual mode toggle, start/stop pump safety confirmation modal, single flow sensor sequential rule, physical IoT device status (STM32 & ESP32), and historical volumetric water log.
5. **Disease Detection**: AI plant disease vision scanner supporting foliage uploads and 1-click hackathon test samples (Early Blight, Powdery Mildew, Healthy Leaf), confidence score, severity rating, symptoms, organic remediation protocols, and disclaimers.
6. **Analytics**: Empirical water savings vs. baseline formula `(Baseline - Smart) / Baseline * 100`, pump runtime, irrigation effectiveness (improvement per liter), and **Flow Anomaly Detection** (blockage, leakage, dry-run alerts).
7. **Farm Copilot**: Context-aware conversational AI assistant grounded in live telemetry (Soil moisture, tank level, temperature, today's water usage) with pre-populated prompt chips.
8. **Community**: Kisan farmer peer-to-peer discussion forum with categories (Crop, Irrigation, Disease, Equipment, Technology, General), like counters, and comment threads.
9. **Settings**: Hardware parameters (STM32/ESP32, YF-S201 pulse calibration rate 450 pulses/L), Supabase database status & credentials, moisture deficit trigger sliders, and Dark/Light mode switcher.

---

## 🗄️ Supabase Database Architecture

The full SQL migration script is available in [`supabase/schema.sql`](supabase/schema.sql).

### Core Tables:
- `profiles`: User accounts and farmer preferences
- `farms`: Physical agricultural plots, soil type, and climate
- `zones`: Segmented plot sections (Zone 1, 2, 3) and target moisture
- `sensor_readings`: Historical telemetry (moisture, temperature, humidity, light, flow, tank)
- `irrigation_events`: Volumetric water logs, durations, and start/end moisture deltas
- `crops`: Reference agronomic library with expected yields and investment benchmarks
- `crop_cycles`: Active field plantings and stage tracking
- `expenses`: Farm accounting categories for ROI calculation
- `disease_records`: AI vision pathology scans with severity and treatment plans
- `community_posts` & `community_comments`: Social peer-to-peer discussions

> **Zero-Crash Dual Engine**: The app connects seamlessly to live Supabase credentials (`VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`) or automatically activates the built-in local reactive mock engine with zero setup blockers.

---

## 🚀 Quick Start Guide

### 1. Launch Frontend Application

```bash
cd frontend
npm install
npm run dev
```

Navigate to: `http://localhost:5173`

### 2. (Optional) Run Python FastAPI Backend Engine

```bash
cd backend
python -m pip install -r requirements.txt
python -m uvicorn app.main:app --reload --port 8000
```

---

## 🎯 12-Step Hackathon Demonstration Script

1. **Open Dashboard**: View live sensor telemetry (Soil: 42%, Tank: 64%, Temp: 31°C, Humidity: 67%, Water Used: 1,280 L).
2. **Click "SIMULATE DRY SOIL"**: Observe Zone 2 soil moisture drop to **25.0%** and status transition to **IRRIGATION REQUIRED**.
3. **Click "START IRRIGATION"**: Observe DC Pump #2 engage, flow rate register **1.7 L/min**, and water consumption rise.
4. **Watch Closed-Loop Replenishment**: Soil moisture climbs to **42.0%**; pump automatically disengages and logs the event.
5. **Open "My Farm"**: Inspect multi-farm setup and view the Gadwal location card.
6. **Open "Crop Planner"**: Walk through the 6-step guided wizard (Season, Soil, pH, Water availability).
7. **View Crop Options**: Review Tomato vs. Groundnut vs. Wheat estimated yields, investment, and profits.
8. **Test "Profit / Loss Calculator"**: Toggle the "WHAT IF?" buttons (+20% yield, -10% price) and watch profit recalculate dynamically.
9. **Open "Disease Detection"**: Select the **Early Blight** preset sample; click **Run Disease Diagnosis** to inspect 91% confidence, severity, and copper octanoate spray remediation.
10. **Open "Analytics"**: Review the Estimated Water Saving (+20% vs flood baseline) and hydraulic flow anomaly rules.
11. **Open "Farm Copilot"**: Ask *"What should I do today?"* or *"Why is Zone 2 dry?"* and receive real-time answers based on current telemetry.
12. **Open "Community"**: Filter by *Irrigation* category and post a comment on a farmer discussion.
