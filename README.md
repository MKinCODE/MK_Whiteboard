# MK Whiteboard

A 100% local-first, private native Windows desktop application inspired by Microsoft Whiteboard. Built with high-performance digital inking, virtual ruler, sticky notes, geometric shapes, and direct Windows filesystem persistence.

![MK Whiteboard Logo](public/assets/mk-logo.svg)

---

## Key Features

- **100% Local & Private**: No cloud syncing, no user accounts, no telemetry, and zero data collection. All whiteboard files stay on your Windows computer.
- **Native Windows Storage Allocation**: On initial launch, a setup wizard allows users to designate their local storage folder (defaults to `%USERPROFILE%\Documents\MK Whiteboard`). All boards persist directly to disk as `.mkwhiteboard` files.
- **High-Performance Inking**:
  - Smooth pressure-sensitive inking using Catmull-Rom curves and `perfect-freehand`.
  - Standard Pens (Black, Red, Blue) with customizable thickness and Fluent color swatches.
  - **Galaxy Pen**: Multi-color cosmic stroke effect.
  - **Highlighter**: Realistic translucent yellow ink layer.
  - **Object Eraser**: Instant stroke-level erasing on contact.
- **Interactive Virtual Ruler**:
  - Rotate, drag, and draw straight lines aligned with ruler edges.
  - Real-time angle readout with 45° snapping.
- **Canvas Objects & Tools**:
  - Sticky Notes with 6 Fluent pastel colors.
  - 3x3 Brainstorm matrix grid.
  - Geometric shapes (Rectangle, Circle, Triangle, Star, Diamond, Arrow, Speech Bubble).
  - Status stamps and symbol badges (clean vector SVGs, zero emojis).
  - Image insertion (PNG, JPG, SVG, WebP).
  - Infinite pan and zoom with interactive Minimap.
- **Export Capabilities**:
  - High-res PNG image export.
  - Scalable Vector Graphics (SVG) export.
  - Native `.mkwhiteboard` backup and restore.

---

## Desktop Application Architecture

MK Whiteboard is built as a **native Windows desktop application** using **Electron** (the same native architecture powering Microsoft VS Code, Discord, Slack, and Figma):

```
MK Whiteboard/
├── electron/
│   ├── main.cjs         # Windows OS main process: window creation, hardware acceleration, native fs IPC
│   └── preload.cjs      # Secure desktopAPI context bridge for native filesystem dialogs
├── src/
│   ├── engine/          # High-speed Canvas inking, coordinate transforms, and virtual ruler
│   │   ├── InkingEngine.js
│   │   ├── CanvasTransform.js
│   │   ├── Ruler.js
│   │   └── WhiteboardApp.js
│   ├── models/          # Local WhiteboardStore & disk synchronization (.mkwhiteboard)
│   ├── ui/              # Desktop UI: Dashboard, SetupWizard, Toolbar, Header, CreatePanel
│   ├── main.js          # App bootstrap
│   └── style.css        # Clean, flat Windows Fluent aesthetic (no gradients, light mode)
├── public/
│   └── assets/          # Flat SVG logo and native application icon
└── index.html           # Local offline desktop window view loaded by Electron
```

> **Note on `index.html`**: In Electron desktop software, `index.html` is **not** a website. It is the local internal desktop viewport file loaded offline from your disk via Electron's secure `file:///` protocol. The application does not connect to any web server or host.

---

## Getting Started

### Prerequisites

- Windows 10 or Windows 11
- Node.js (v18 or higher) and npm

### Installation & Development

1. Clone the repository:
   ```bash
   git clone https://github.com/<your-username>/mk-whiteboard.git
   cd mk-whiteboard
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Launch the desktop application in development mode:
   ```bash
   npm start
   ```

4. Or double-click:
   ```
   Launch-MK-Whiteboard.bat
   ```

---

## Building the Windows Installer (`.exe`)

To generate the standalone setup executable for Windows distribution:

```bash
npm run dist:installer
```

This compiles:
- `release/MK Whiteboard Setup 1.0.0.exe` (NSIS Windows setup installer with desktop and Start Menu shortcut creation)
- `release/win-unpacked/` (Unpacked standalone Windows executable directory)

---

## Keyboard Shortcuts

| Shortcut | Action |
| :--- | :--- |
| `V` | Select / Pan tool |
| `P` | Standard Pen |
| `H` | Highlighter |
| `E` | Stroke Eraser |
| `R` | Toggle Virtual Ruler |
| `L` | Lasso Select |
| `N` | Open Create / Sticky Notes panel |
| `Ctrl + Z` | Undo |
| `Ctrl + Y` | Redo |
| `Space + Drag` | Pan canvas |
| `Mouse Wheel` | Zoom in / Zoom out |

---

## Privacy Policy

MK Whiteboard is 100% offline. It contains no telemetry, analytics, trackers, or cloud storage backends. All your whiteboard drawings and notes remain strictly on your local PC.
