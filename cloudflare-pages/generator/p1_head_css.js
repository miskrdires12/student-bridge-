module.exports = `<!DOCTYPE html>
<html lang="en" class="dark">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>StudentBridge — Silicon Labs Enterprise Data Platform</title>
  <meta name="description" content="Silicon Labs StudentBridge — Enterprise Student Data Management, Capture, Transfer and Administration Platform" />
  
  <!-- Typography: Inter, Outfit, JetBrains Mono -->
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=Outfit:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600;700;800&display=swap" rel="stylesheet" />

  <!-- Client-side Libraries: JSZip, SheetJS, QRCode -->
  <script src="https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"></script>

  <!-- Lucide Icons -->
  <script src="https://unpkg.com/lucide@latest"></script>

  <style>
    :root {
      --background: #f4f7f5;
      --surface: #ffffff;
      --surface-secondary: #eef5f1;
      --surface-tertiary: #e2ede6;
      --accent: #85e510;
      --accent-glow: rgba(133, 229, 16, 0.4);
      --accent-hover: #74cc0c;
      --foreground: #080808;
      --foreground-muted: #3f4743;
      --foreground-subtle: #6c7872;
      --border: #d2e0d7;
      --font-body: 'Inter', -apple-system, sans-serif;
      --font-heading: 'Outfit', sans-serif;
      --font-mono: 'JetBrains Mono', monospace;
      --card-radius: 20px;
      --header-height: 64px;
      --sidebar-width: 240px;
    }

    html.dark {
      --background: #070908;
      --surface: #101612;
      --surface-secondary: #141d17;
      --surface-tertiary: #1b261f;
      --accent: #8fe617;
      --accent-glow: rgba(143, 230, 23, 0.4);
      --accent-hover: #7dce0f;
      --foreground: #f2f7f4;
      --foreground-muted: #9eb2a6;
      --foreground-subtle: #63776b;
      --border: #1e2c22;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      font-family: var(--font-body);
      -webkit-tap-highlight-color: transparent;
    }

    body {
      background-color: var(--background);
      color: var(--foreground);
      min-height: 100vh;
      overflow-x: hidden;
      display: flex;
      flex-direction: column;
    }

    /* Scrollbars */
    ::-webkit-scrollbar { width: 6px; height: 6px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: rgba(143, 230, 23, 0.2); border-radius: 9999px; }
    ::-webkit-scrollbar-thumb:hover { background: rgba(143, 230, 23, 0.4); }

    /* Top Header */
    .sl-header {
      position: sticky;
      top: 0;
      z-index: 50;
      height: var(--header-height);
      background-color: rgba(13, 20, 16, 0.95);
      backdrop-filter: blur(12px);
      border-bottom: 1px solid var(--border);
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 1.25rem;
      gap: 1rem;
    }

    .brand-link {
      display: flex;
      align-items: center;
      gap: 0.65rem;
      text-decoration: none;
      color: inherit;
      cursor: pointer;
    }
    .brand-logo-img {
      height: 38px;
      width: 38px;
      object-fit: contain;
      filter: drop-shadow(0 2px 8px var(--accent-glow));
    }
    .brand-title {
      font-family: var(--font-heading);
      font-weight: 900;
      font-size: 1.15rem;
      letter-spacing: -0.02em;
      display: flex;
      align-items: center;
      gap: 5px;
    }
    .brand-badge {
      background: #8fe617;
      color: #062404;
      font-size: 10px;
      font-weight: 900;
      padding: 2px 6px;
      border-radius: 6px;
      letter-spacing: 0.05em;
    }

    .header-tagline {
      font-size: 0.75rem;
      font-weight: 600;
      letter-spacing: 0.04em;
      color: #9eb2a6;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    @media (max-width: 900px) {
      .header-tagline { display: none; }
    }

    /* Station Switcher Pills Container */
    .station-switcher-container {
      display: flex;
      align-items: center;
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 9999px;
      padding: 3px;
      gap: 2px;
    }
    .station-pill {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 5px 13px;
      border-radius: 9999px;
      font-size: 0.76rem;
      font-weight: 700;
      color: #9eb2a6;
      background: transparent;
      border: none;
      cursor: pointer;
      transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
      white-space: nowrap;
    }
    .station-pill:hover {
      color: #ffffff;
      background: rgba(255, 255, 255, 0.06);
    }
    .station-pill.active {
      background: #8fe617;
      color: #062404;
      font-weight: 800;
      box-shadow: 0 0 16px var(--accent-glow);
    }
    .station-pill.active i {
      color: #062404 !important;
    }

    /* Header Icons */
    .animated-icon-btn {
      width: 36px;
      height: 36px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid var(--border);
      border-radius: 10px;
      color: var(--foreground-muted);
      cursor: pointer;
      transition: all 0.2s;
    }
    .animated-icon-btn:hover {
      background: var(--surface-secondary);
      border-color: #8fe617;
      color: #8fe617;
      transform: translateY(-1px);
    }

    /* App Layout: Persistent Left Sidebar + Main */
    .app-layout {
      display: flex;
      min-height: calc(100vh - var(--header-height));
      width: 100%;
      position: relative;
    }

    .app-sidebar {
      width: var(--sidebar-width);
      flex-shrink: 0;
      background: #0d1410;
      border-right: 1px solid var(--border);
      display: flex;
      flex-direction: column;
      position: sticky;
      top: var(--header-height);
      height: calc(100vh - var(--header-height));
      overflow-y: auto;
      z-index: 25;
      transition: transform 0.3s ease;
    }
    @media (max-width: 1024px) {
      .app-sidebar {
        position: fixed;
        left: 0;
        top: var(--header-height);
        transform: translateX(-100%);
        box-shadow: 10px 0 30px rgba(0,0,0,0.8);
      }
      .app-sidebar.mobile-open {
        transform: translateX(0);
      }
    }

    .sidebar-station-header {
      padding: 1.25rem 1rem 0.75rem 1rem;
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    }
    .sidebar-station-badge {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 3px 8px;
      border-radius: 6px;
      background: rgba(143, 230, 23, 0.12);
      color: #8fe617;
      font-size: 10px;
      font-weight: 800;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      margin-top: 4px;
    }

    .sidebar-nav {
      padding: 0.85rem 0.65rem;
      display: flex;
      flex-direction: column;
      gap: 4px;
      flex: 1;
    }
    .sidebar-nav-item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 9px 12px;
      border-radius: 12px;
      font-size: 0.82rem;
      font-weight: 600;
      color: #9eb2a6;
      cursor: pointer;
      transition: all 0.15s;
      text-decoration: none;
      border: 1px solid transparent;
    }
    .sidebar-nav-item:hover {
      background: rgba(255, 255, 255, 0.04);
      color: #ffffff;
    }
    .sidebar-nav-item.active {
      background: #8fe617;
      color: #062404;
      font-weight: 800;
      box-shadow: 0 0 14px var(--accent-glow);
    }
    .sidebar-nav-item.active i {
      color: #062404 !important;
    }

    .sidebar-profile {
      padding: 1rem;
      border-top: 1px solid rgba(255, 255, 255, 0.05);
      display: flex;
      align-items: center;
      gap: 10px;
      background: #090e0b;
    }

    /* Main Content Area */
    .app-main {
      flex: 1;
      padding: 1.25rem 1.5rem 3rem 1.5rem;
      overflow-y: auto;
      min-width: 0;
      position: relative;
    }

    /* Slide-Over Student Details Panel (Right Side) */
    .slideover-panel {
      position: fixed;
      top: var(--header-height);
      right: 0;
      bottom: 0;
      width: 410px;
      max-width: 92vw;
      background: #101712;
      border-left: 2px solid #8fe617;
      box-shadow: -15px 0 45px rgba(0, 0, 0, 0.85);
      z-index: 60;
      transform: translateX(100%);
      transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
      overflow-y: auto;
      display: flex;
      flex-direction: column;
    }
    .slideover-panel.open {
      transform: translateX(0);
    }

    /* Cards and Containers */
    .glass-card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--card-radius);
      padding: 1.25rem;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.04);
      transition: border-color 0.2s, box-shadow 0.2s;
    }
    .dark .glass-card {
      background: #111713;
      border: 1px solid #1e2c22;
      box-shadow: 0 12px 35px rgba(0, 0, 0, 0.6);
    }
    .glass-card:hover {
      border-color: rgba(143, 230, 23, 0.3);
    }

    .metric-card {
      background: #111713;
      border: 1px solid #1e2c22;
      border-radius: 18px;
      padding: 1.15rem;
      display: flex;
      flex-direction: column;
      gap: 6px;
      position: relative;
      overflow: hidden;
    }
    .metric-card::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 2px;
      background: linear-gradient(90deg, transparent, #8fe617, transparent);
      opacity: 0.6;
    }
    .metric-label {
      font-size: 0.72rem;
      font-weight: 700;
      color: #9eb2a6;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .metric-value {
      font-family: var(--font-heading);
      font-size: 1.75rem;
      font-weight: 900;
      color: #f2f7f4;
      line-height: 1.1;
    }
    .metric-delta {
      font-size: 0.72rem;
      font-weight: 700;
      display: flex;
      align-items: center;
      gap: 3px;
    }
    .metric-delta.positive { color: #8fe617; }
    .metric-delta.neutral { color: #9eb2a6; }
    .metric-delta.danger { color: #ef4444; }

    /* Tables */
    .table-responsive {
      width: 100%;
      overflow-x: auto;
      border-radius: 16px;
      border: 1px solid var(--border);
      background: #111713;
    }
    table.dense-table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
      font-size: 0.83rem;
    }
    table.dense-table th {
      background: #0b110d;
      padding: 0.75rem 0.9rem;
      font-size: 0.72rem;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #798b81;
      border-bottom: 1px solid var(--border);
      white-space: nowrap;
    }
    table.dense-table td {
      padding: 0.75rem 0.9rem;
      border-bottom: 1px solid rgba(255, 255, 255, 0.03);
      vertical-align: middle;
      color: var(--foreground);
    }
    table.dense-table tr:hover td {
      background: rgba(143, 230, 23, 0.03);
      cursor: pointer;
    }
    table.dense-table tr.selected td {
      background: rgba(143, 230, 23, 0.07);
    }

    /* Badges */
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 2px 8px;
      border-radius: 9999px;
      font-size: 11px;
      font-weight: 700;
      line-height: 1.3;
    }
    .badge-success {
      background: rgba(143, 230, 23, 0.15);
      color: #8fe617;
      border: 1px solid rgba(143, 230, 23, 0.3);
    }
    .badge-warning {
      background: rgba(245, 158, 11, 0.15);
      color: #fbbf24;
      border: 1px solid rgba(245, 158, 11, 0.35);
    }
    .badge-danger {
      background: rgba(239, 68, 68, 0.15);
      color: #f87171;
      border: 1px solid rgba(239, 68, 68, 0.35);
    }
    .badge-neutral {
      background: rgba(255, 255, 255, 0.08);
      color: #9eb2a6;
      border: 1px solid rgba(255, 255, 255, 0.12);
    }
    .badge-female {
      background: rgba(147, 51, 234, 0.18);
      color: #d8b4fe;
      border: 1px solid rgba(147, 51, 234, 0.35);
    }
    .badge-male {
      background: rgba(5, 150, 105, 0.18);
      color: #6ee7b7;
      border: 1px solid rgba(5, 150, 105, 0.35);
    }

    /* Grade Chips */
    .grade-chips-bar {
      display: flex;
      align-items: center;
      gap: 6px;
      overflow-x: auto;
      padding: 6px 0 10px 0;
      scrollbar-width: thin;
    }
    .grade-chip {
      padding: 4px 12px;
      border-radius: 9999px;
      background: #141d17;
      border: 1px solid var(--border);
      color: #9eb2a6;
      font-size: 0.78rem;
      font-weight: 700;
      white-space: nowrap;
      cursor: pointer;
      transition: all 0.15s;
    }
    .grade-chip:hover {
      border-color: #8fe617;
      color: #8fe617;
    }
    .grade-chip.active {
      background: #8fe617;
      color: #062404;
      border-color: #8fe617;
      font-weight: 800;
      box-shadow: 0 0 10px var(--accent-glow);
    }

    /* Buttons */
    .btn-lime {
      background: #8fe617;
      color: #062404;
      font-weight: 800;
      font-size: 0.82rem;
      border: none;
      border-radius: 12px;
      padding: 8px 16px;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      cursor: pointer;
      transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
      box-shadow: 0 4px 15px var(--accent-glow);
    }
    .btn-lime:hover {
      background: #7dce0f;
      transform: translateY(-1px);
      box-shadow: 0 6px 20px var(--accent-glow);
    }
    .btn-ghost {
      background: transparent;
      color: #9eb2a6;
      font-weight: 600;
      font-size: 0.82rem;
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 8px 14px;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      cursor: pointer;
      transition: all 0.15s;
    }
    .btn-ghost:hover {
      background: rgba(255, 255, 255, 0.05);
      color: #f2f7f4;
      border-color: rgba(255, 255, 255, 0.2);
    }

    /* Form Controls */
    .input-field {
      width: 100%;
      background: #0d1410;
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 9px 12px;
      color: #f2f7f4;
      font-size: 0.85rem;
      transition: border-color 0.15s, box-shadow 0.15s;
      outline: none;
    }
    .input-field:focus {
      border-color: #8fe617;
      box-shadow: 0 0 0 3px rgba(143, 230, 23, 0.15);
    }
    .form-label {
      display: block;
      font-size: 0.76rem;
      font-weight: 700;
      color: #9eb2a6;
      margin-bottom: 5px;
      letter-spacing: 0.02em;
    }

    /* Modals */
    .modal-overlay {
      display: none;
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.85);
      backdrop-filter: blur(8px);
      z-index: 100;
      align-items: center;
      justify-content: center;
      padding: 1.5rem;
    }
    .modal-overlay.open { display: flex; }
    .modal-box {
      background: #111713;
      border: 1px solid #223126;
      border-top: 2px solid #8fe617;
      border-radius: 26px;
      max-width: 650px;
      width: 100%;
      padding: 2rem;
      box-shadow: 0 25px 60px rgba(0,0,0,0.9);
      position: relative;
      max-height: 90vh;
      overflow-y: auto;
    }

    /* Live Webcam Video Box */
    .webcam-box {
      width: 100%;
      aspect-ratio: 4/5;
      background: #070908;
      border: 2px dashed #1e2c22;
      border-radius: 20px;
      overflow: hidden;
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .webcam-box video, .webcam-box img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    /* Efficiency Gauge Ring */
    .gauge-circle {
      width: 110px;
      height: 110px;
      border-radius: 50%;
      background: conic-gradient(#8fe617 0% var(--pct, 92%), #1b261f var(--pct, 92%) 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
    }
    .gauge-circle-inner {
      width: 86px;
      height: 86px;
      border-radius: 50%;
      background: #111713;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
    }

    /* Stepper */
    .form-stepper {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 1.5rem;
      position: relative;
    }
    .form-stepper::before {
      content: '';
      position: absolute;
      top: 50%;
      left: 20px;
      right: 20px;
      height: 2px;
      background: #1e2c22;
      z-index: 1;
    }
    .stepper-step {
      position: relative;
      z-index: 2;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
    }
    .step-number {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: #141d17;
      border: 2px solid #1e2c22;
      color: #9eb2a6;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      font-weight: 800;
      transition: all 0.2s;
    }
    .stepper-step.active .step-number {
      background: #8fe617;
      border-color: #8fe617;
      color: #062404;
      box-shadow: 0 0 12px var(--accent-glow);
    }
    .step-text {
      font-size: 11px;
      font-weight: 700;
      color: #9eb2a6;
    }
    .stepper-step.active .step-text {
      color: #8fe617;
    }
  </style>
</head>
`;
