module.exports = `
        <!-- ============================================================= -->
        <!-- SUPER ADMIN VIEW 1: GLOBAL ANALYTICS (Matching Screenshot 10) -->
        <!-- ============================================================= -->
        <div id="view-super-analytics" style="display: none;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem;">
            <div>
              <h1 style="font-family: 'Outfit'; font-size: 1.65rem; font-weight: 900; color: #f2f7f4;">
                Super Admin — Global Analytics
              </h1>
              <p style="font-size: 0.8rem; color: #9eb2a6; margin-top: 3px;">
                Platform-wide telemetry across all four operational stations, edge storage nodes and field capture units
              </p>
            </div>

            <div style="display: flex; align-items: center; gap: 10px;">
              <span class="badge badge-success" style="font-size: 12px; padding: 4px 10px;">
                <i data-lucide="radio" style="width: 12px; height: 12px;"></i>
                Edge Cluster Live
              </span>
            </div>
          </div>

          <!-- 4 Global Record Counters -->
          <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 1rem; margin-bottom: 1.5rem;">
            <div class="metric-card">
              <div class="metric-label">Total Verified Records</div>
              <div class="metric-value" style="color: #f2f7f4;" id="super-stat-total">16,742</div>
              <div class="metric-delta positive">All school databases</div>
            </div>
            <div class="metric-card">
              <div class="metric-label">Accepted Records</div>
              <div class="metric-value" style="color: #8fe617;" id="super-stat-accepted">14,892</div>
              <div class="metric-delta positive">89% verification pass</div>
            </div>
            <div class="metric-card">
              <div class="metric-label">Rejected Records</div>
              <div class="metric-value" style="color: #f87171;" id="super-stat-rejected">1,120</div>
              <div class="metric-delta danger">Returned for correction</div>
            </div>
            <div class="metric-card">
              <div class="metric-label">Corrected Records</div>
              <div class="metric-value" style="color: #60a5fa;" id="super-stat-corrected">730</div>
              <div class="metric-delta neutral">Field resubmissions</div>
            </div>
          </div>

          <!-- Middle Row: Records by Station + Efficiency Gauge + Top Senders -->
          <div style="display: grid; grid-template-columns: 1fr 280px 1fr; gap: 1.25rem; margin-bottom: 1.5rem;" class="super-analytics-grid">
            
            <!-- Records by Station Bar Chart -->
            <div class="glass-card">
              <h3 style="font-family: 'Outfit'; font-size: 1.05rem; font-weight: 800; color: #f2f7f4; margin-bottom: 0.5rem;">
                Records by Station
              </h3>
              <p style="font-size: 11px; color: #9eb2a6; margin-bottom: 1rem;">
                Throughput distribution across active field hubs
              </p>
              
              <div style="display: flex; align-items: flex-end; justify-content: space-around; height: 160px; border-bottom: 1px solid var(--border); padding-top: 10px;">
                <div style="display: flex; flex-direction: column; align-items: center; gap: 6px;">
                  <div style="width: 24px; height: 120px; background: #8fe617; border-radius: 4px 4px 0 0;" title="Station 1 (YMS): 4,800"></div>
                  <span style="font-size: 10px; color: #798b81;">YMS</span>
                </div>
                <div style="display: flex; flex-direction: column; align-items: center; gap: 6px;">
                  <div style="width: 24px; height: 95px; background: #8fe617; border-radius: 4px 4px 0 0;" title="Station 2 (Adika): 3,600"></div>
                  <span style="font-size: 10px; color: #798b81;">Adika</span>
                </div>
                <div style="display: flex; flex-direction: column; align-items: center; gap: 6px;">
                  <div style="width: 24px; height: 80px; background: #8fe617; border-radius: 4px 4px 0 0;" title="Station 3 (SOA): 3,100"></div>
                  <span style="font-size: 10px; color: #798b81;">SOA</span>
                </div>
                <div style="display: flex; flex-direction: column; align-items: center; gap: 6px;">
                  <div style="width: 24px; height: 60px; background: #8fe617; border-radius: 4px 4px 0 0;" title="Station 4 (Ferway): 2,400"></div>
                  <span style="font-size: 10px; color: #798b81;">Ferway</span>
                </div>
                <div style="display: flex; flex-direction: column; align-items: center; gap: 6px;">
                  <div style="width: 24px; height: 75px; background: #8fe617; border-radius: 4px 4px 0 0;" title="Station 5 (High Tech): 2,842"></div>
                  <span style="font-size: 10px; color: #798b81;">Harar</span>
                </div>
              </div>
            </div>

            <!-- Global Efficiency Rate Gauge -->
            <div class="glass-card" style="display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center;">
              <div class="gauge-circle" style="--pct: 87%; margin-bottom: 12px;">
                <div class="gauge-circle-inner">
                  <span style="font-family: 'Outfit'; font-size: 1.6rem; font-weight: 900; color: #8fe617;">87%</span>
                  <span style="font-size: 9px; font-weight: 700; color: #9eb2a6; text-transform: uppercase;">Efficiency</span>
                </div>
              </div>
              <div style="font-weight: 800; font-size: 0.9rem; color: #f2f7f4;">Global Efficiency Rate</div>
              <div style="font-size: 11px; color: #9eb2a6; margin-top: 4px;">
                Composite metric: Accepted vs Resubmitted vs Dispatched
              </div>
            </div>

            <!-- Top Senders Leaderboard -->
            <div class="glass-card">
              <h3 style="font-family: 'Outfit'; font-size: 1.05rem; font-weight: 800; color: #f2f7f4; margin-bottom: 1rem;">
                Top Senders Leaderboard
              </h3>
              <div style="display: flex; flex-direction: column; gap: 10px;">
                <div style="display: flex; justify-content: space-between; align-items: center; font-size: 12px;">
                  <span style="font-weight: 700; color: #f2f7f4;">1. Loza Bereket (YMS)</span>
                  <span class="badge badge-success">96% Quality</span>
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center; font-size: 12px;">
                  <span style="font-weight: 700; color: #f2f7f4;">2. Alemu Tadesse (Adika)</span>
                  <span class="badge badge-success">94% Quality</span>
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center; font-size: 12px;">
                  <span style="font-weight: 700; color: #f2f7f4;">3. Hana Tadesse (SOA)</span>
                  <span class="badge badge-success">88% Quality</span>
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center; font-size: 12px;">
                  <span style="font-weight: 700; color: #f2f7f4;">4. Getnet Kassa (Ferway)</span>
                  <span class="badge badge-warning">42% Needs Review</span>
                </div>
              </div>
            </div>

          </div>
        </div>

        <!-- ============================================================= -->
        <!-- SUPER ADMIN VIEW 2: USER MANAGEMENT & 1-DEVICE LOCK           -->
        <!-- ============================================================= -->
        <div id="view-admin" style="display: none;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem;">
            <div>
              <h1 style="font-family: 'Outfit'; font-size: 1.65rem; font-weight: 900; color: #f2f7f4;">
                Operator Accounts & RBAC Provisioning
              </h1>
              <p style="font-size: 0.8rem; color: #9eb2a6; margin-top: 3px;">
                Manage operators, assign stations, and enforce 1-device hardware lock bindings
              </p>
            </div>

            <button class="btn-lime" onclick="openAddUserModal()">
              <i data-lucide="user-plus" style="width: 14px; height: 14px;"></i>
              <span>+ Add Operator Account</span>
            </button>
          </div>

          <!-- Operators Table -->
          <div class="glass-card">
            <div class="table-responsive">
              <table class="dense-table">
                <thead>
                  <tr>
                    <th>Username / Identity</th>
                    <th>Email Address</th>
                    <th>Assigned Role</th>
                    <th>1-Device Hardware Fingerprint</th>
                    <th>Last Active</th>
                    <th>Records Sent</th>
                    <th style="text-align: right;">Security Actions</th>
                  </tr>
                </thead>
                <tbody id="admin-users-tbody">
                  <!-- Filled dynamically from allUsers -->
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- ============================================================= -->
        <!-- SUPER ADMIN VIEW 3: SUPER SETTINGS (Matching Screenshot 12)   -->
        <!-- ============================================================= -->
        <div id="view-super-settings" style="display: none;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem;">
            <div>
              <h1 style="font-family: 'Outfit'; font-size: 1.65rem; font-weight: 900; color: #f2f7f4;">
                Super Settings — Platform Architecture
              </h1>
              <p style="font-size: 0.8rem; color: #9eb2a6; margin-top: 3px;">
                Real, persisted configuration for Schools & Locations, Validation Rules, Cloudflare R2 Storage, and Database Retentions
              </p>
            </div>

            <button class="btn-lime" onclick="saveAllSuperSettings()">
              <i data-lucide="save" style="width: 14px; height: 14px;"></i>
              <span>Save & Apply Settings</span>
            </button>
          </div>

          <!-- Settings Tab Chips -->
          <div style="display: flex; gap: 8px; margin-bottom: 1.25rem; overflow-x: auto;">
            <button class="grade-chip active" id="settings-tab-schools" onclick="switchSettingsTab('schools')">
              🏫 Schools & Locations (Real CRUD)
            </button>
            <button class="grade-chip" id="settings-tab-grades" onclick="switchSettingsTab('grades')">
              📚 Grades & Sections
            </button>
            <button class="grade-chip" id="settings-tab-validation" onclick="switchSettingsTab('validation')">
              🛡️ Student Fields & Validation
            </button>
            <button class="grade-chip" id="settings-tab-storage" onclick="switchSettingsTab('storage')">
              ☁️ Photo & R2 Storage
            </button>
            <button class="grade-chip" id="settings-tab-export" onclick="switchSettingsTab('export')">
              📁 Export & Pagination
            </button>
            <button class="grade-chip" id="settings-tab-database" onclick="switchSettingsTab('database')">
              💾 Database & Backup
            </button>
          </div>

          <!-- Settings Tab 1: Schools & Locations CRUD -->
          <div id="settings-panel-schools" class="glass-card">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem;">
              <div>
                <h3 style="font-family: 'Outfit'; font-size: 1.15rem; font-weight: 800; color: #f2f7f4;">
                  Locations & Schools Management
                </h3>
                <p style="font-size: 11px; color: #9eb2a6; margin-top: 2px;">
                  Add or disable schools and regional hubs. Updates propagate immediately to Sender forms and Receiver filters.
                </p>
              </div>

              <div style="display: flex; gap: 8px;">
                <button class="btn-ghost" onclick="openAddLocationModal()">
                  <i data-lucide="map-pin" style="width: 13px; height: 13px;"></i>
                  <span>+ Add Location</span>
                </button>
                <button class="btn-lime" onclick="openAddSchoolModal()">
                  <i data-lucide="plus" style="width: 13px; height: 13px;"></i>
                  <span>+ Add School</span>
                </button>
              </div>
            </div>

            <div class="table-responsive">
              <table class="dense-table">
                <thead>
                  <tr>
                    <th>School Name</th>
                    <th>City / Location</th>
                    <th>Total Students</th>
                    <th>Status</th>
                    <th style="text-align: right;">Actions</th>
                  </tr>
                </thead>
                <tbody id="settings-schools-tbody">
                  <!-- Filled dynamically -->
                </tbody>
              </table>
            </div>
          </div>

          <!-- Settings Tab 2: Grades & Sections -->
          <div id="settings-panel-grades" class="glass-card" style="display: none;">
            <h3 style="font-family: 'Outfit'; font-size: 1.15rem; font-weight: 800; color: #f2f7f4; margin-bottom: 0.5rem;">
              Grades & Sections Configuration
            </h3>
            <p style="font-size: 0.8rem; color: #9eb2a6; margin-bottom: 1.25rem;">
              Configure class nomenclature, kindergarten, primary, and secondary grades.
            </p>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
              <div>
                <label class="form-label">Active Grades (Comma separated)</label>
                <textarea id="setting-grades-list" class="input-field" rows="4">Nursery, LKG, UKG, 1A, 1B, 2A, 2B, 3A, 3B, 4A, 4B, 5A, 5B, 6A, 6B, 7A, 7B, 8A, 8B, 9A, 9B, 9C, 10A, 10B, 11A, 11B, 12A, 12B</textarea>
              </div>
              <div>
                <label class="form-label">Active Sections (Comma separated)</label>
                <textarea id="setting-sections-list" class="input-field" rows="4">A, B, C, D</textarea>
              </div>
            </div>
          </div>

          <!-- Settings Tab 3: Validation -->
          <div id="settings-panel-validation" class="glass-card" style="display: none;">
            <h3 style="font-family: 'Outfit'; font-size: 1.15rem; font-weight: 800; color: #f2f7f4; margin-bottom: 0.5rem;">
              Validation Rules & Phone Normalization
            </h3>
            <div style="display: flex; flex-direction: column; gap: 1rem; margin-top: 1rem;">
              <label style="display: flex; align-items: center; gap: 10px; color: #f2f7f4; font-size: 0.85rem; cursor: pointer;">
                <input type="checkbox" id="setting-val-phone-auto" checked style="accent-color: #8fe617;" />
                <span>Automatic Ethiopian Phone Normalization (09 → +2519, 07 → +2517)</span>
              </label>
              <label style="display: flex; align-items: center; gap: 10px; color: #f2f7f4; font-size: 0.85rem; cursor: pointer;">
                <input type="checkbox" id="setting-val-name-caps" checked style="accent-color: #8fe617;" />
                <span>Automatic Title-Case Capitalization for Full Name ("loza bereket" → "Loza Bereket")</span>
              </label>
              <label style="display: flex; align-items: center; gap: 10px; color: #f2f7f4; font-size: 0.85rem; cursor: pointer;">
                <input type="checkbox" id="setting-val-unique-id" checked style="accent-color: #8fe617;" />
                <span>Enforce Database-level Uniqueness Check on Student ID Generation</span>
              </label>
            </div>
          </div>

          <!-- Settings Tab 4: Photo & Storage -->
          <div id="settings-panel-storage" class="glass-card" style="display: none;">
            <h3 style="font-family: 'Outfit'; font-size: 1.15rem; font-weight: 800; color: #f2f7f4; margin-bottom: 0.5rem;">
              Cloudflare R2 Cloud Storage Settings
            </h3>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-top: 1rem;">
              <div>
                <label class="form-label">R2 Bucket Name</label>
                <input type="text" id="setting-r2-bucket" value="siliconlabs" class="input-field" readonly />
              </div>
              <div>
                <label class="form-label">Public CDN Base URL</label>
                <input type="text" id="setting-r2-cdn" value="https://pub-93e8bf84c42949ec88306f456caa0fc9.r2.dev" class="input-field" readonly />
              </div>
              <div>
                <label class="form-label">Photo Storage Path Pattern</label>
                <input type="text" id="setting-r2-path" value="{Grade}/{StudentID}_{FullName}.jpg" class="input-field" />
              </div>
              <div>
                <label class="form-label">JPEG Compression Quality (%)</label>
                <input type="number" id="setting-img-quality" value="85" min="50" max="100" class="input-field" />
              </div>
            </div>
          </div>

          <!-- Settings Tab 5: Export & Pagination -->
          <div id="settings-panel-export" class="glass-card" style="display: none;">
            <h3 style="font-family: 'Outfit'; font-size: 1.15rem; font-weight: 800; color: #f2f7f4; margin-bottom: 0.5rem;">
              Export & Pagination Defaults
            </h3>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-top: 1rem;">
              <div>
                <label class="form-label">Default Page Size</label>
                <select id="setting-default-pagesize" class="input-field">
                  <option value="100">100 records</option>
                  <option value="250">250 records</option>
                  <option value="500" selected>500 records</option>
                </select>
              </div>
              <div>
                <label class="form-label">CSV Text Encoding</label>
                <select id="setting-csv-encoding" class="input-field">
                  <option value="UTF-8" selected>UTF-8 (Universal)</option>
                  <option value="ISO-8859-1">ISO-8859-1</option>
                </select>
              </div>
            </div>
          </div>

          <!-- Settings Tab 6: Database & Backup -->
          <div id="settings-panel-database" class="glass-card" style="display: none;">
            <h3 style="font-family: 'Outfit'; font-size: 1.15rem; font-weight: 800; color: #f2f7f4; margin-bottom: 0.5rem;">
              Database Recovery & Backup Management
            </h3>
            <p style="font-size: 0.8rem; color: #9eb2a6; margin-bottom: 1.25rem;">
              Non-destructive backup tools to preserve all 3,723 student records and accounts.
            </p>
            <div style="display: flex; gap: 10px;">
              <button type="button" class="btn-lime" onclick="exportFullDatabaseJsonBackup()">
                <i data-lucide="download-cloud" style="width: 14px; height: 14px;"></i>
                <span>Download Database JSON Snapshot</span>
              </button>
            </div>
          </div>
        </div>

        <!-- ============================================================= -->
        <!-- SUPER ADMIN VIEW 4: STUDENTCORE INTEGRATION (Screenshot 14)   -->
        <!-- ============================================================= -->
        <div id="view-super-integrations" style="display: none;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem;">
            <div>
              <h1 style="font-family: 'Outfit'; font-size: 1.65rem; font-weight: 900; color: #f2f7f4;">
                StudentCore Integration Requests
              </h1>
              <p style="font-size: 0.8rem; color: #9eb2a6; margin-top: 3px;">
                Authorized bi-directional edge synchronization channel receiving verified student payloads from StudentCore installations
              </p>
            </div>

            <!-- 3-Second Sync Simulation Badge -->
            <div style="display: flex; align-items: center; gap: 8px; padding: 6px 14px; background: rgba(143,230,23,0.12); border: 1px solid rgba(143,230,23,0.3); border-radius: 9999px;">
              <span style="width: 8px; height: 8px; border-radius: 50%; background: #8fe617; display: inline-block; animation: pulse 1.5s infinite;"></span>
              <span style="font-size: 11px; font-weight: 800; color: #8fe617;" id="sync-ticker-text">Sync Interval: ~3.0s Active</span>
            </div>
          </div>

          <!-- Requests Table -->
          <div class="glass-card">
            <div class="table-responsive">
              <table class="dense-table">
                <thead>
                  <tr>
                    <th>Request ID</th>
                    <th>Source Installation</th>
                    <th>Bound Device / IP</th>
                    <th>Student ID</th>
                    <th>Request Type</th>
                    <th>Timestamp</th>
                    <th>Auth Status</th>
                    <th>Sync Status</th>
                    <th>Latency</th>
                    <th style="text-align: right;">Actions</th>
                  </tr>
                </thead>
                <tbody id="studentcore-requests-tbody">
                  <!-- Filled dynamically -->
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- ============================================================= -->
        <!-- SUPER ADMIN VIEW 5: AUDIT LOGS                                -->
        <!-- ============================================================= -->
        <div id="view-audit-logs" style="display: none;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
            <div>
              <h1 style="font-family: 'Outfit'; font-size: 1.65rem; font-weight: 900; color: #f2f7f4;">
                Platform Audit & Compliance Logs
              </h1>
              <p style="font-size: 0.8rem; color: #9eb2a6; margin-top: 3px;">
                Immutable chronological ledger of registrations, edits, photo uploads, exports and hardware lock resets
              </p>
            </div>
          </div>

          <div class="glass-card">
            <div class="table-responsive">
              <table class="dense-table">
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>Actor / Operator</th>
                    <th>Station</th>
                    <th>Action</th>
                    <th>Entity Affected</th>
                    <th>Details</th>
                  </tr>
                </thead>
                <tbody id="audit-logs-tbody">
                  <!-- Filled dynamically -->
                </tbody>
              </table>
            </div>
          </div>
        </div>
`;
