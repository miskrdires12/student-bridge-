module.exports = `<body>

  <!-- ===================================================================== -->
  <!-- 1. AUTHENTIC SILICON LABS SIGNIN SCREEN (Matching Screenshot 1)      -->
  <!-- ===================================================================== -->
  <div id="screen-login" style="min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 1.5rem; background: #070908; background-image: radial-gradient(circle at 50% 30%, #131d16 0%, #070908 100%);">
    
    <!-- Top Right Theme Toggle -->
    <div style="position: absolute; top: 1.5rem; right: 1.5rem;">
      <button class="animated-icon-btn" onclick="toggleTheme()" title="Toggle Theme">
        <i data-lucide="sun" style="width: 18px; height: 18px; color: #8fe617;"></i>
      </button>
    </div>

    <div style="display: flex; max-width: 960px; width: 100%; border-radius: 32px; background: #0e1511; border: 1px solid #1e2c22; overflow: hidden; box-shadow: 0 30px 80px rgba(0,0,0,0.9);">
      
      <!-- Left Hero Column (Matching Screenshot 1) -->
      <div style="flex: 1; padding: 3rem 2.5rem; background: linear-gradient(135deg, #09120c 0%, #101c14 100%); border-right: 1px solid #1e2c22; display: flex; flex-direction: column; justify-content: space-between; position: relative;">
        <div>
          <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 2.5rem;">
            <img src="/logo.png" alt="Silicon Labs Emblem" style="height: 44px; width: 44px; object-fit: contain; filter: drop-shadow(0 4px 12px rgba(143,230,23,0.4));" onerror="this.src='/brand-logo.png'" />
            <div>
              <div style="font-family: 'Outfit'; font-weight: 900; font-size: 1.25rem; letter-spacing: -0.02em; color: #f2f7f4;">
                SILICON <span class="brand-badge">LABS</span>
              </div>
              <div style="font-size: 10px; font-weight: 700; color: #8fe617; letter-spacing: 0.08em; text-transform: uppercase;">
                We build modernity
              </div>
            </div>
          </div>

          <h1 style="font-family: 'Outfit'; font-size: 2.4rem; font-weight: 900; color: #ffffff; line-height: 1.15; margin-bottom: 0.75rem;">
            StudentBridge
          </h1>
          <p style="font-size: 0.9rem; color: #9eb2a6; margin-bottom: 2rem; font-weight: 500;">
            Secure Enterprise Student Data Management, Capture, Transfer and Administration Platform
          </p>

          <!-- Circular Feature Nodes matching Screenshot 1 -->
          <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-top: 1.5rem;">
            <div style="text-align: center;">
              <div style="width: 52px; height: 52px; margin: 0 auto 6px auto; border-radius: 50%; background: rgba(143,230,23,0.1); border: 1px solid rgba(143,230,23,0.3); display: flex; align-items: center; justify-content: center; color: #8fe617;">
                <i data-lucide="camera" style="width: 22px; height: 22px;"></i>
              </div>
              <span style="font-size: 11px; font-weight: 700; color: #9eb2a6;">Capture</span>
            </div>
            <div style="text-align: center;">
              <div style="width: 52px; height: 52px; margin: 0 auto 6px auto; border-radius: 50%; background: rgba(143,230,23,0.1); border: 1px solid rgba(143,230,23,0.3); display: flex; align-items: center; justify-content: center; color: #8fe617;">
                <i data-lucide="send" style="width: 22px; height: 22px;"></i>
              </div>
              <span style="font-size: 11px; font-weight: 700; color: #9eb2a6;">Transfer</span>
            </div>
            <div style="text-align: center;">
              <div style="width: 52px; height: 52px; margin: 0 auto 6px auto; border-radius: 50%; background: rgba(143,230,23,0.1); border: 1px solid rgba(143,230,23,0.3); display: flex; align-items: center; justify-content: center; color: #8fe617;">
                <i data-lucide="shield" style="width: 22px; height: 22px;"></i>
              </div>
              <span style="font-size: 11px; font-weight: 700; color: #9eb2a6;">Manage</span>
            </div>
            <div style="text-align: center;">
              <div style="width: 52px; height: 52px; margin: 0 auto 6px auto; border-radius: 50%; background: rgba(143,230,23,0.1); border: 1px solid rgba(143,230,23,0.3); display: flex; align-items: center; justify-content: center; color: #8fe617;">
                <i data-lucide="cpu" style="width: 22px; height: 22px;"></i>
              </div>
              <span style="font-size: 11px; font-weight: 700; color: #9eb2a6;">Connect</span>
            </div>
          </div>
        </div>

        <div style="font-size: 11px; color: #5f7468; margin-top: 2rem;">
          Silicon Labs Architecture • Cloudflare R2 Storage • Edge Synchronization
        </div>
      </div>

      <!-- Right Login Form Column -->
      <div style="flex: 1; padding: 3rem 2.5rem; display: flex; flex-direction: column; justify-content: center;">
        <div style="margin-bottom: 2rem;">
          <h2 style="font-family: 'Outfit'; font-size: 1.75rem; font-weight: 900; color: #f2f7f4; margin-bottom: 4px;">
            Welcome Back
          </h2>
          <p style="font-size: 0.85rem; color: #9eb2a6;">
            Sign in to your StudentBridge account
          </p>
        </div>

        <!-- 1-Device Lock Banner -->
        <div id="device-lock-error" style="display: none; margin-bottom: 1.25rem; padding: 0.85rem 1rem; border-radius: 14px; background: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.4); color: #f87171; font-size: 0.8rem; line-height: 1.4;">
          <strong>⚠️ 1-Device Hardware Lock:</strong> This operator account is bound to another device. Request Super Admin to reset your hardware key.
        </div>

        <form id="form-login" onsubmit="handleLoginSubmit(event)" style="display: flex; flex-direction: column; gap: 1.25rem;">
          <div>
            <label class="form-label">Email or Username</label>
            <input 
              type="text" 
              id="input-login-email" 
              required 
              placeholder="miskrdires11@gmail.com" 
              value="miskrdires11@gmail.com" 
              class="input-field"
            />
          </div>

          <div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;">
              <label class="form-label" style="margin-bottom: 0;">Password</label>
              <a href="#" onclick="alert('Contact Institutional Super Admin to recover credentials.'); return false;" style="font-size: 11px; color: #8fe617; text-decoration: none;">Forgot password?</a>
            </div>
            <input 
              type="password" 
              id="input-login-password" 
              required 
              placeholder="••••••••••" 
              value="password123" 
              class="input-field"
            />
          </div>

          <div style="display: flex; align-items: center; gap: 8px;">
            <input type="checkbox" id="login-remember" checked style="accent-color: #8fe617;" />
            <label for="login-remember" style="font-size: 0.8rem; color: #9eb2a6; cursor: pointer;">Remember me on this authorized device</label>
          </div>

          <button type="submit" class="btn-lime" style="width: 100%; justify-content: center; padding: 12px; font-size: 0.95rem; border-radius: 14px;">
            <span>Sign In</span>
            <i data-lucide="arrow-right" style="width: 16px; height: 16px;"></i>
          </button>
        </form>

        <!-- Quick Station Sign-in Pills for pair programming & testing -->
        <div style="margin-top: 1.75rem; padding-top: 1.5rem; border-top: 1px solid rgba(255, 255, 255, 0.06);">
          <div style="font-size: 11px; font-weight: 700; color: #6f8277; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px;">
            Quick Station Demo Access:
          </div>
          <div style="display: flex; flex-wrap: wrap; gap: 6px;">
            <button type="button" class="btn-ghost" style="padding: 4px 10px; font-size: 11px;" onclick="quickLoginAs('SENDER')">
              👤 Sender
            </button>
            <button type="button" class="btn-ghost" style="padding: 4px 10px; font-size: 11px;" onclick="quickLoginAs('RECEIVER')">
              👥 Receiver
            </button>
            <button type="button" class="btn-ghost" style="padding: 4px 10px; font-size: 11px;" onclick="quickLoginAs('ADMIN')">
              🛡️ Admin
            </button>
            <button type="button" class="btn-ghost" style="padding: 4px 10px; font-size: 11px;" onclick="quickLoginAs('SUPER_ADMIN')">
              ⚡ Super Admin
            </button>
          </div>
        </div>

        <div style="margin-top: 2rem; display: flex; align-items: center; justify-content: center; gap: 6px; font-size: 11px; color: #5f7468;">
          <span>Powered by</span>
          <strong style="color: #8fe617;">SILICON LABS</strong>
        </div>
      </div>
    </div>
  </div>

  <!-- ===================================================================== -->
  <!-- 2. AUTHENTICATED APP SHELL                                            -->
  <!-- ===================================================================== -->
  <div id="screen-app" style="display: none; min-height: 100vh; flex-direction: column;">
    
    <!-- Top Header -->
    <header class="sl-header">
      <div style="display: flex; align-items: center; gap: 0.85rem;">
        <!-- Mobile hamburger -->
        <button type="button" class="animated-icon-btn" onclick="toggleMobileSidebar()" aria-label="Toggle navigation" style="display: none;" id="btn-mobile-sidebar">
          <i data-lucide="menu" style="width: 18px; height: 18px;"></i>
        </button>

        <a href="#" class="brand-link" onclick="handleBrandClick(); return false;">
          <img src="/logo.png" alt="Silicon Labs Logo" class="brand-logo-img" onerror="this.src='/brand-logo.png'" />
          <div class="brand-title">
            <span>SILICON</span>
            <span class="brand-badge">LABS</span>
            <span style="font-size: 0.95rem; font-weight: 800; color: #8fe617; margin-left: 4px;">StudentBridge</span>
          </div>
        </a>
      </div>

      <!-- Center Tagline -->
      <div class="header-tagline">
        <span>One System</span>
        <span style="color: #8fe617;">•</span>
        <span>Four Stations</span>
        <span style="color: #8fe617;">•</span>
        <span>A Brighter Future</span>
      </div>

      <!-- Station Switcher Pills + User Controls -->
      <div style="display: flex; align-items: center; gap: 0.75rem;">
        <div class="station-switcher-container">
          <button class="station-pill" id="pill-sender" onclick="switchStation('SENDER')">
            <i data-lucide="send" style="width: 13px; height: 13px;"></i>
            <span>Sender</span>
          </button>
          <button class="station-pill" id="pill-receiver" onclick="switchStation('RECEIVER')">
            <i data-lucide="inbox" style="width: 13px; height: 13px;"></i>
            <span>Receiver</span>
          </button>
          <button class="station-pill" id="pill-admin" onclick="switchStation('ADMIN')">
            <i data-lucide="shield" style="width: 13px; height: 13px;"></i>
            <span>Admin</span>
          </button>
          <button class="station-pill" id="pill-super-admin" onclick="switchStation('SUPER_ADMIN')">
            <i data-lucide="zap" style="width: 13px; height: 13px;"></i>
            <span>Super Admin</span>
          </button>
        </div>

        <button class="animated-icon-btn" onclick="toggleTheme()" title="Toggle Theme">
          <i data-lucide="sun" style="width: 16px; height: 16px; color: #8fe617;"></i>
        </button>

        <button class="animated-icon-btn" title="Audit Notifications" onclick="navigateTo('audit-logs')">
          <i data-lucide="bell" style="width: 16px; height: 16px; color: var(--foreground-muted);"></i>
        </button>

        <div id="header-avatar-badge" style="width: 34px; height: 34px; border-radius: 50%; background: #161e19; border: 1px solid #8fe617; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 0.8rem; color: #8fe617;">
          M
        </div>

        <button class="btn-ghost" style="padding: 6px 12px; color: #ef4444; border-color: rgba(239, 68, 68, 0.25);" onclick="handleSignOut()" title="Sign Out">
          <i data-lucide="log-out" style="width: 13px; height: 13px;"></i>
          <span>Sign Out</span>
        </button>
      </div>
    </header>

    <!-- App Body: Persistent Left Sidebar + Main + Slide-over details -->
    <div class="app-layout">
      
      <!-- Persistent Left Sidebar on Desktop -->
      <aside class="app-sidebar" id="app-sidebar">
        <div class="sidebar-station-header">
          <div style="font-family: 'Outfit'; font-weight: 900; font-size: 0.95rem; color: #f2f7f4;">
            SILICON <span class="brand-badge">LABS</span>
          </div>
          <div id="sidebar-station-badge" class="sidebar-station-badge">
            <i data-lucide="send" style="width: 12px; height: 12px;"></i>
            <span id="sidebar-station-title">SENDER WORKSTATION</span>
          </div>
        </div>

        <!-- Dynamic Navigation Menu -->
        <nav class="sidebar-nav" id="sidebar-nav-container">
          <!-- Filled by renderSidebarNav() -->
        </nav>

        <!-- Profile at bottom -->
        <div class="sidebar-profile">
          <div style="width: 36px; height: 36px; border-radius: 50%; background: #1b2820; border: 1px solid #8fe617; display: flex; align-items: center; justify-content: center; font-weight: 800; color: #8fe617;" id="sidebar-user-avatar">
            M
          </div>
          <div style="flex: 1; min-width: 0;">
            <div style="font-size: 0.8rem; font-weight: 700; color: #f2f7f4; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" id="sidebar-user-name">
              Miskr Dires
            </div>
            <div style="font-size: 0.7rem; color: #8fe617; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" id="sidebar-user-role">
              Super Admin
            </div>
          </div>
        </div>
      </aside>

      <!-- Main Content Area -->
      <main class="app-main">
`;
