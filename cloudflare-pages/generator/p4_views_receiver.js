module.exports = `
        <!-- ============================================================= -->
        <!-- RECEIVER VIEW 1: DASHBOARD (Matching Screenshot 2)            -->
        <!-- ============================================================= -->
        <div id="view-dashboard" style="display: none;">
          <!-- Header and Date Range -->
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem;">
            <div>
              <h1 style="font-family: 'Outfit'; font-size: 1.65rem; font-weight: 900; color: #f2f7f4;">
                Receiver Station — Dashboard
              </h1>
              <p style="font-size: 0.8rem; color: #9eb2a6; margin-top: 3px;">
                Comprehensive overview of student records, verification throughput and edge telemetry
              </p>
            </div>

            <div style="display: flex; align-items: center; gap: 10px;">
              <div style="display: flex; align-items: center; gap: 6px; padding: 6px 12px; background: #111713; border: 1px solid var(--border); border-radius: 12px; font-size: 0.8rem; color: #9eb2a6;">
                <i data-lucide="calendar" style="width: 14px; height: 14px; color: #8fe617;"></i>
                <span>Date Range: Oct 1, 2026 - Oct 13, 2026</span>
              </div>
              <button class="btn-ghost" onclick="loadDataset()" title="Refresh telemetry">
                <i data-lucide="refresh-cw" style="width: 14px; height: 14px;"></i>
              </button>
            </div>
          </div>

          <!-- Top Metric Cards Grid (Total Students, Today, This Week, This Month, Pending, Missing) -->
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); gap: 1rem; margin-bottom: 1.5rem;">
            <div class="metric-card">
              <div class="metric-label">Total Students</div>
              <div class="metric-value" id="receiver-total-students">3,723</div>
              <div class="metric-delta positive">
                <i data-lucide="arrow-up-right" style="width: 12px; height: 12px;"></i>
                <span>+12% vs last month</span>
              </div>
            </div>

            <div class="metric-card">
              <div class="metric-label">Today's Records</div>
              <div class="metric-value" id="receiver-today-records" style="color: #8fe617;">248</div>
              <div class="metric-delta positive">
                <i data-lucide="trending-up" style="width: 12px; height: 12px;"></i>
                <span>15 active stations</span>
              </div>
            </div>

            <div class="metric-card">
              <div class="metric-label">This Week</div>
              <div class="metric-value" id="receiver-week-records">1,872</div>
              <div class="metric-delta positive">
                <i data-lucide="arrow-up-right" style="width: 12px; height: 12px;"></i>
                <span>+22% throughput</span>
              </div>
            </div>

            <div class="metric-card">
              <div class="metric-label">This Month</div>
              <div class="metric-value" id="receiver-month-records">6,543</div>
              <div class="metric-delta positive">
                <i data-lucide="trending-up" style="width: 12px; height: 12px;"></i>
                <span>+16% quarterly</span>
              </div>
            </div>

            <div class="metric-card">
              <div class="metric-label">Pending Review</div>
              <div class="metric-value" id="receiver-pending-records" style="color: #fbbf24;">142</div>
              <div class="metric-delta neutral">
                <i data-lucide="clock" style="width: 12px; height: 12px;"></i>
                <span>Requires review</span>
              </div>
            </div>

            <div class="metric-card">
              <div class="metric-label">Missing Photos</div>
              <div class="metric-value" id="receiver-missing-photos" style="color: #f87171;">37</div>
              <div class="metric-delta danger">
                <i data-lucide="alert-circle" style="width: 12px; height: 12px;"></i>
                <span>Dispatched to senders</span>
              </div>
            </div>
          </div>

          <!-- Middle Row Charts: Daily Capture Volume & Record Status Donut -->
          <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 1.25rem; margin-bottom: 1.5rem;" class="dashboard-charts-grid">
            
            <!-- Daily Capture Volume Dual Bar Chart -->
            <div class="glass-card">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem;">
                <div>
                  <h3 style="font-family: 'Outfit'; font-size: 1.05rem; font-weight: 800; color: #f2f7f4;">
                    Daily Capture Volume
                  </h3>
                  <div style="font-size: 11px; color: #9eb2a6; margin-top: 2px;">
                    Comparison between Submitted and Accepted records
                  </div>
                </div>
                <div style="display: flex; gap: 12px; font-size: 11px;">
                  <span style="display: flex; align-items: center; gap: 4px; color: #8fe617;">
                    <span style="width: 8px; height: 8px; background: #8fe617; border-radius: 2px;"></span> Accepted
                  </span>
                  <span style="display: flex; align-items: center; gap: 4px; color: #9eb2a6;">
                    <span style="width: 8px; height: 8px; background: #3f5548; border-radius: 2px;"></span> Submitted
                  </span>
                </div>
              </div>

              <!-- Bar Visualization -->
              <div style="display: flex; align-items: flex-end; justify-content: space-between; height: 180px; padding-top: 10px; border-bottom: 1px solid var(--border);">
                <!-- Oct 7 -->
                <div style="display: flex; flex-direction: column; align-items: center; gap: 6px; flex: 1;">
                  <div style="display: flex; align-items: flex-end; gap: 4px; height: 140px;">
                    <div style="width: 14px; height: 95px; background: #3f5548; border-radius: 4px 4px 0 0;" title="Submitted: 210"></div>
                    <div style="width: 14px; height: 85px; background: #8fe617; border-radius: 4px 4px 0 0;" title="Accepted: 195"></div>
                  </div>
                  <span style="font-size: 10px; color: #798b81;">Oct 7</span>
                </div>
                <!-- Oct 8 -->
                <div style="display: flex; flex-direction: column; align-items: center; gap: 6px; flex: 1;">
                  <div style="display: flex; align-items: flex-end; gap: 4px; height: 140px;">
                    <div style="width: 14px; height: 120px; background: #3f5548; border-radius: 4px 4px 0 0;" title="Submitted: 270"></div>
                    <div style="width: 14px; height: 112px; background: #8fe617; border-radius: 4px 4px 0 0;" title="Accepted: 250"></div>
                  </div>
                  <span style="font-size: 10px; color: #798b81;">Oct 8</span>
                </div>
                <!-- Oct 9 -->
                <div style="display: flex; flex-direction: column; align-items: center; gap: 6px; flex: 1;">
                  <div style="display: flex; align-items: flex-end; gap: 4px; height: 140px;">
                    <div style="width: 14px; height: 80px; background: #3f5548; border-radius: 4px 4px 0 0;" title="Submitted: 180"></div>
                    <div style="width: 14px; height: 72px; background: #8fe617; border-radius: 4px 4px 0 0;" title="Accepted: 165"></div>
                  </div>
                  <span style="font-size: 10px; color: #798b81;">Oct 9</span>
                </div>
                <!-- Oct 10 -->
                <div style="display: flex; flex-direction: column; align-items: center; gap: 6px; flex: 1;">
                  <div style="display: flex; align-items: flex-end; gap: 4px; height: 140px;">
                    <div style="width: 14px; height: 135px; background: #3f5548; border-radius: 4px 4px 0 0;" title="Submitted: 310"></div>
                    <div style="width: 14px; height: 128px; background: #8fe617; border-radius: 4px 4px 0 0;" title="Accepted: 295"></div>
                  </div>
                  <span style="font-size: 10px; color: #798b81;">Oct 10</span>
                </div>
                <!-- Oct 11 -->
                <div style="display: flex; flex-direction: column; align-items: center; gap: 6px; flex: 1;">
                  <div style="display: flex; align-items: flex-end; gap: 4px; height: 140px;">
                    <div style="width: 14px; height: 110px; background: #3f5548; border-radius: 4px 4px 0 0;" title="Submitted: 245"></div>
                    <div style="width: 14px; height: 98px; background: #8fe617; border-radius: 4px 4px 0 0;" title="Accepted: 220"></div>
                  </div>
                  <span style="font-size: 10px; color: #798b81;">Oct 11</span>
                </div>
                <!-- Oct 12 -->
                <div style="display: flex; flex-direction: column; align-items: center; gap: 6px; flex: 1;">
                  <div style="display: flex; align-items: flex-end; gap: 4px; height: 140px;">
                    <div style="width: 14px; height: 140px; background: #3f5548; border-radius: 4px 4px 0 0;" title="Submitted: 320"></div>
                    <div style="width: 14px; height: 132px; background: #8fe617; border-radius: 4px 4px 0 0;" title="Accepted: 304"></div>
                  </div>
                  <span style="font-size: 10px; color: #798b81;">Oct 12</span>
                </div>
                <!-- Oct 13 (Today) -->
                <div style="display: flex; flex-direction: column; align-items: center; gap: 6px; flex: 1;">
                  <div style="display: flex; align-items: flex-end; gap: 4px; height: 140px;">
                    <div style="width: 14px; height: 105px; background: #3f5548; border-radius: 4px 4px 0 0;" title="Submitted: 248"></div>
                    <div style="width: 14px; height: 96px; background: #8fe617; border-radius: 4px 4px 0 0;" title="Accepted: 226"></div>
                  </div>
                  <span style="font-size: 10px; color: #8fe617; font-weight: 700;">Today</span>
                </div>
              </div>
            </div>

            <!-- Record Status Donut Chart -->
            <div class="glass-card" style="display: flex; flex-direction: column; align-items: center; justify-content: space-between;">
              <h3 style="font-family: 'Outfit'; font-size: 1.05rem; font-weight: 800; color: #f2f7f4; align-self: flex-start;">
                Record Status
              </h3>
              
              <div style="position: relative; width: 140px; height: 140px; margin: 10px 0;">
                <div style="width: 100%; height: 100%; border-radius: 50%; background: conic-gradient(#8fe617 0% 89.5%, #f87171 89.5% 93.7%, #60a5fa 93.7% 96.8%, #fbbf24 96.8% 100%);"></div>
                <div style="position: absolute; inset: 22px; background: #111713; border-radius: 50%; display: flex; flex-direction: column; align-items: center; justify-content: center;">
                  <strong style="font-family: 'Outfit'; font-size: 1.25rem; font-weight: 900; color: #f2f7f4;" id="donut-total-count">3,723</strong>
                  <span style="font-size: 9px; color: #9eb2a6; text-transform: uppercase;">Total</span>
                </div>
              </div>

              <div style="width: 100%; display: flex; flex-direction: column; gap: 6px; font-size: 11px;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                  <span style="display: flex; align-items: center; gap: 5px; color: #8fe617;"><span style="width: 7px; height: 7px; border-radius: 50%; background: #8fe617;"></span> Accepted</span>
                  <strong>89.5%</strong>
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center;">
                  <span style="display: flex; align-items: center; gap: 5px; color: #f87171;"><span style="width: 7px; height: 7px; border-radius: 50%; background: #f87171;"></span> Rejected</span>
                  <strong>4.2%</strong>
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center;">
                  <span style="display: flex; align-items: center; gap: 5px; color: #60a5fa;"><span style="width: 7px; height: 7px; border-radius: 50%; background: #60a5fa;"></span> Corrected</span>
                  <strong>3.1%</strong>
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center;">
                  <span style="display: flex; align-items: center; gap: 5px; color: #fbbf24;"><span style="width: 7px; height: 7px; border-radius: 50%; background: #fbbf24;"></span> Pending</span>
                  <strong>3.2%</strong>
                </div>
              </div>
            </div>

          </div>

          <!-- Bottom: Top Schools by Records Horizontal Comparison -->
          <div class="glass-card">
            <h3 style="font-family: 'Outfit'; font-size: 1.05rem; font-weight: 800; color: #f2f7f4; margin-bottom: 1rem;">
              Top Schools by Record Volume
            </h3>
            <div style="display: flex; flex-direction: column; gap: 10px;">
              <div>
                <div style="display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 3px;">
                  <span style="color: #f2f7f4; font-weight: 700;">YMS (Addis Ababa)</span>
                  <span style="color: #8fe617; font-weight: 800;">1,245 students</span>
                </div>
                <div style="height: 8px; border-radius: 9999px; background: #1c2720; overflow: hidden;">
                  <div style="width: 100%; height: 100%; background: #8fe617; border-radius: 9999px;"></div>
                </div>
              </div>

              <div>
                <div style="display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 3px;">
                  <span style="color: #f2f7f4; font-weight: 700;">Adika Youth (Addis Ababa)</span>
                  <span style="color: #8fe617; font-weight: 800;">982 students</span>
                </div>
                <div style="height: 8px; border-radius: 9999px; background: #1c2720; overflow: hidden;">
                  <div style="width: 78.8%; height: 100%; background: #8fe617; border-radius: 9999px;"></div>
                </div>
              </div>

              <div>
                <div style="display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 3px;">
                  <span style="color: #f2f7f4; font-weight: 700;">School of America (Addis Ababa)</span>
                  <span style="color: #8fe617; font-weight: 800;">756 students</span>
                </div>
                <div style="height: 8px; border-radius: 9999px; background: #1c2720; overflow: hidden;">
                  <div style="width: 60.7%; height: 100%; background: #8fe617; border-radius: 9999px;"></div>
                </div>
              </div>

              <div>
                <div style="display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 3px;">
                  <span style="color: #f2f7f4; font-weight: 700;">Ferway (Addis Ababa)</span>
                  <span style="color: #8fe617; font-weight: 800;">542 students</span>
                </div>
                <div style="height: 8px; border-radius: 9999px; background: #1c2720; overflow: hidden;">
                  <div style="width: 43.5%; height: 100%; background: #8fe617; border-radius: 9999px;"></div>
                </div>
              </div>

              <div>
                <div style="display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 3px;">
                  <span style="color: #f2f7f4; font-weight: 700;">High Tech (Harar)</span>
                  <span style="color: #8fe617; font-weight: 800;">380 students</span>
                </div>
                <div style="height: 8px; border-radius: 9999px; background: #1c2720; overflow: hidden;">
                  <div style="width: 30.5%; height: 100%; background: #8fe617; border-radius: 9999px;"></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- ============================================================= -->
        <!-- RECEIVER VIEW 2: STUDENT DIRECTORY (Matching Screenshot 5)    -->
        <!-- ============================================================= -->
        <div id="view-students" style="display: none;">
          
          <!-- Top Grade Filter Chips (Horizontal Scrollable) -->
          <div class="grade-chips-bar" id="grade-chips-container">
            <!-- Chips rendered dynamically: All Grades, Nursery, LKG, UKG, 1A..12B -->
          </div>

          <!-- Filter & Search Toolbar -->
          <div class="glass-card" style="margin-bottom: 1rem; padding: 1rem;">
            <div style="display: grid; grid-template-columns: 2fr repeat(4, 1fr) auto auto; gap: 8px; align-items: center;" class="filter-toolbar-grid">
              
              <!-- Search Input -->
              <div style="position: relative;">
                <input 
                  type="text" 
                  id="search-students" 
                  placeholder="Search by ID, name, or phone..." 
                  class="input-field" 
                  style="padding-left: 32px;"
                  oninput="handleSearchChange()"
                />
                <i data-lucide="search" style="position: absolute; left: 10px; top: 50%; transform: translateY(-50%); width: 14px; height: 14px; color: #798b81;"></i>
              </div>

              <!-- School Filter -->
              <select id="filter-school" class="input-field" onchange="handleFilterChange()">
                <option value="ALL">All Schools</option>
              </select>

              <!-- Grade Filter -->
              <select id="filter-grade" class="input-field" onchange="handleFilterChange()">
                <option value="ALL">All Grades</option>
              </select>

              <!-- Location Filter -->
              <select id="filter-location" class="input-field" onchange="handleFilterChange()">
                <option value="ALL">All Locations</option>
                <option value="Addis Ababa">Addis Ababa</option>
                <option value="Adama">Adama</option>
                <option value="Harar">Harar</option>
              </select>

              <!-- Photo Status -->
              <select id="filter-photo" class="input-field" onchange="handleFilterChange()">
                <option value="ALL">Photo: All</option>
                <option value="OK">Photo: Available</option>
                <option value="MISSING">Photo: Missing</option>
              </select>

              <!-- Filter Action -->
              <button class="btn-ghost" onclick="applyFilters()" title="Apply Filters">
                <i data-lucide="filter" style="width: 14px; height: 14px;"></i>
                <span>Filter</span>
              </button>

              <!-- Export Button -->
              <button class="btn-lime" onclick="openBulkExportModal()" title="Export / Bulk Download">
                <i data-lucide="download" style="width: 14px; height: 14px;"></i>
                <span>Export</span>
              </button>
            </div>
          </div>

          <!-- Selection & Bulk Action Bar -->
          <div id="selection-bar" style="display: none; margin-bottom: 0.75rem; padding: 0.65rem 1rem; background: rgba(143,230,23,0.12); border: 1px solid rgba(143,230,23,0.3); border-radius: 12px; align-items: center; justify-content: space-between;">
            <div style="font-size: 0.82rem; font-weight: 700; color: #8fe617;">
              <span id="selection-count-text">0 students selected</span>
            </div>
            <div style="display: flex; gap: 8px;">
              <button class="btn-lime" style="padding: 4px 12px; font-size: 11px;" onclick="openBulkExportModal('SELECTED')">
                <i data-lucide="archive" style="width: 12px; height: 12px;"></i>
                <span>Download Selected Photos</span>
              </button>
              <button class="btn-ghost" style="padding: 4px 10px; font-size: 11px; color: #f87171; border-color: rgba(239,68,68,0.3);" onclick="bulkDeleteSelected()">
                <i data-lucide="trash-2" style="width: 12px; height: 12px;"></i>
                <span>Delete Selected</span>
              </button>
              <button class="btn-ghost" style="padding: 4px 10px; font-size: 11px;" onclick="clearSelection()">
                <span>Deselect All</span>
              </button>
            </div>
          </div>

          <!-- Top Pagination Bar -->
          <div class="pagination-bar" id="pagination-top">
            <div style="font-size: 0.8rem; color: #9eb2a6;" id="page-info-top">
              Showing 1-500 of 3,723 records
            </div>

            <div style="display: flex; align-items: center; gap: 10px;">
              <div style="display: flex; align-items: center; gap: 6px; font-size: 0.8rem; color: #9eb2a6;">
                <span>Rows:</span>
                <select id="select-pagesize" onchange="setPageSize(this.value)" class="input-field" style="padding: 3px 8px; width: auto; font-weight: 700;">
                  <option value="100">100</option>
                  <option value="250">250</option>
                  <option value="500" selected>500</option>
                </select>
              </div>

              <div style="display: flex; gap: 4px;" id="page-btns-top">
                <!-- Page buttons -->
              </div>
            </div>
          </div>

          <!-- Dense Student Directory Table -->
          <div class="table-responsive">
            <table class="dense-table">
              <thead>
                <tr>
                  <th style="width: 36px; text-align: center;">
                    <input type="checkbox" id="cb-select-all" onchange="toggleSelectAll(this.checked)" />
                  </th>
                  <th style="width: 48px;">Photo</th>
                  <th>Student ID</th>
                  <th>Full Name</th>
                  <th>Sex</th>
                  <th>Grade</th>
                  <th>Phone</th>
                  <th>School</th>
                  <th>Location</th>
                  <th>Sender</th>
                  <th>Date</th>
                  <th>Photo Status</th>
                  <th>Status</th>
                  <th>Bulked</th>
                  <th style="text-align: right;">Actions</th>
                </tr>
              </thead>
              <tbody id="student-table-body">
                <!-- Rows filled by renderTable() -->
              </tbody>
            </table>
          </div>

          <!-- Bottom Pagination Bar -->
          <div class="pagination-bar" id="pagination-bottom">
            <div style="font-size: 0.8rem; color: #9eb2a6;" id="page-info-bottom">
              Showing 1-500 of 3,723 records
            </div>
            <div style="display: flex; gap: 4px;" id="page-btns-bottom">
              <!-- Page buttons -->
            </div>
          </div>
        </div>

        <!-- ============================================================= -->
        <!-- RECEIVER VIEW 3: MISTAKE ANALYZER (Matching Screenshot 8)     -->
        <!-- ============================================================= -->
        <div id="view-mistake-analyzer" style="display: none;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem;">
            <div>
              <h1 style="font-family: 'Outfit'; font-size: 1.65rem; font-weight: 900; color: #f2f7f4;">
                Data Quality & Mistake Analyzer
              </h1>
              <p style="font-size: 0.8rem; color: #9eb2a6; margin-top: 3px;">
                Automated detection of missing photographs, duplicate identifiers, malformed phones, and schema inconsistencies
              </p>
            </div>

            <button class="btn-lime" onclick="runMistakeScan()">
              <i data-lucide="scan" style="width: 14px; height: 14px;"></i>
              <span>Re-scan All Records</span>
            </button>
          </div>

          <!-- Summary Issue Counters -->
          <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 1rem; margin-bottom: 1.5rem;">
            <div class="metric-card">
              <div class="metric-label">Total Quality Issues</div>
              <div class="metric-value" id="mistakes-total-count" style="color: #f87171;">42</div>
              <div class="metric-delta danger">Detected across callset</div>
            </div>
            <div class="metric-card">
              <div class="metric-label">Missing Photos</div>
              <div class="metric-value" id="mistakes-missing-photos" style="color: #fbbf24;">37</div>
              <div class="metric-delta neutral">Photo record missing</div>
            </div>
            <div class="metric-card">
              <div class="metric-label">Malformed Phone Numbers</div>
              <div class="metric-value" id="mistakes-phone-count" style="color: #60a5fa;">5</div>
              <div class="metric-delta neutral">Digit length < 9</div>
            </div>
            <div class="metric-card">
              <div class="metric-label">Resolved / Ignored</div>
              <div class="metric-value" id="mistakes-resolved-count" style="color: #8fe617;">18</div>
              <div class="metric-delta positive">Marked as verified</div>
            </div>
          </div>

          <!-- Mistake Filter Controls -->
          <div class="glass-card" style="margin-bottom: 1rem; padding: 1rem;">
            <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px;">
              <select id="mistake-filter-school" class="input-field" onchange="filterMistakesTable()">
                <option value="ALL">All Schools</option>
              </select>
              <select id="mistake-filter-location" class="input-field" onchange="filterMistakesTable()">
                <option value="ALL">All Locations</option>
                <option value="Addis Ababa">Addis Ababa</option>
                <option value="Adama">Adama</option>
                <option value="Harar">Harar</option>
              </select>
              <select id="mistake-filter-type" class="input-field" onchange="filterMistakesTable()">
                <option value="ALL">All Issue Types</option>
                <option value="Missing Photo">Missing Photo</option>
                <option value="Invalid Phone">Invalid Phone</option>
                <option value="Duplicate ID">Duplicate ID</option>
                <option value="Disallowed Characters">Disallowed Characters</option>
              </select>
              <select id="mistake-filter-severity" class="input-field" onchange="filterMistakesTable()">
                <option value="ALL">All Severities</option>
                <option value="High">High Severity</option>
                <option value="Medium">Medium Severity</option>
                <option value="Low">Low Severity</option>
              </select>
            </div>
          </div>

          <!-- Mistakes Table -->
          <div class="glass-card">
            <div class="table-responsive">
              <table class="dense-table">
                <thead>
                  <tr>
                    <th>Student ID</th>
                    <th>Full Name</th>
                    <th>School</th>
                    <th>Issue Category</th>
                    <th>Severity</th>
                    <th>Detected At</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody id="mistakes-table-body">
                  <!-- Filled dynamically -->
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- ============================================================= -->
        <!-- RECEIVER VIEW 4: DATABASE CONTROL ROOM (Matching Screenshot 12)-->
        <!-- ============================================================= -->
        <div id="view-db-control" style="display: none;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem;">
            <div>
              <h1 style="font-family: 'Outfit'; font-size: 1.65rem; font-weight: 900; color: #f2f7f4;">
                Database Control Room
              </h1>
              <p style="font-size: 0.8rem; color: #9eb2a6; margin-top: 3px;">
                Live database connectivity, Cloudflare R2 storage telemetry, edge query latency, and disaster recovery readiness
              </p>
            </div>

            <button class="btn-lime" onclick="exportFullDatabaseJsonBackup()">
              <i data-lucide="download-cloud" style="width: 14px; height: 14px;"></i>
              <span>Export Full JSON Database Backup</span>
            </button>
          </div>

          <!-- Health & Telemetry Grid -->
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1rem; margin-bottom: 1.5rem;">
            <div class="metric-card">
              <div class="metric-label">Database Connectivity</div>
              <div class="metric-value" style="color: #8fe617; font-size: 1.4rem;">Healthy • 100%</div>
              <div class="metric-delta positive">
                <i data-lucide="check-circle" style="width: 12px; height: 12px;"></i>
                <span>Cloudflare Edge Datastore</span>
              </div>
            </div>

            <div class="metric-card">
              <div class="metric-label">R2 Cloud Storage</div>
              <div class="metric-value" style="color: #8fe617; font-size: 1.4rem;">1.2 GB / 10 GB</div>
              <div class="metric-delta positive">
                <i data-lucide="hard-drive" style="width: 12px; height: 12px;"></i>
                <span>Bucket: siliconlabs</span>
              </div>
            </div>

            <div class="metric-card">
              <div class="metric-label">Query Latency</div>
              <div class="metric-value" style="font-size: 1.4rem;">24 ms</div>
              <div class="metric-delta positive">
                <i data-lucide="zap" style="width: 12px; height: 12px;"></i>
                <span>Indexed memory lookup</span>
              </div>
            </div>

            <div class="metric-card">
              <div class="metric-label">API Response Time</div>
              <div class="metric-value" style="font-size: 1.4rem;">85 ms</div>
              <div class="metric-delta positive">
                <i data-lucide="activity" style="width: 12px; height: 12px;"></i>
                <span>Cloudflare Worker edge</span>
              </div>
            </div>

            <div class="metric-card">
              <div class="metric-label">Error Rate</div>
              <div class="metric-value" style="font-size: 1.4rem;">0.00%</div>
              <div class="metric-delta positive">
                <i data-lucide="shield-check" style="width: 12px; height: 12px;"></i>
                <span>Zero 5xx errors recorded</span>
              </div>
            </div>

            <div class="metric-card">
              <div class="metric-label">Disaster Recovery</div>
              <div class="metric-value" style="color: #8fe617; font-size: 1.4rem;">Ready</div>
              <div class="metric-delta positive">
                <i data-lucide="shield" style="width: 12px; height: 12px;"></i>
                <span>Last verified backup active</span>
              </div>
            </div>
          </div>

          <!-- Real-Time Event Logs -->
          <div class="glass-card">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
              <h3 style="font-family: 'Outfit'; font-size: 1.05rem; font-weight: 800; color: #f2f7f4;">
                Real-Time Database Operations & Audit Feed
              </h3>
              <button class="btn-ghost" style="padding: 4px 10px; font-size: 11px;" onclick="addDbControlLogEntry('Diagnostic health check passed successfully')">
                <i data-lucide="play" style="width: 12px; height: 12px;"></i>
                <span>Run Ping Test</span>
              </button>
            </div>

            <div class="table-responsive">
              <table class="dense-table">
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>Operation</th>
                    <th>Target / Scope</th>
                    <th>Operator</th>
                    <th>Latency</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody id="db-control-logs-tbody">
                  <!-- Event entries rendered dynamically -->
                </tbody>
              </table>
            </div>
          </div>
        </div>
`;
