module.exports = `
        <!-- ============================================================= -->
        <!-- SENDER VIEW 1: SENDER DASHBOARD (Matching Screenshot 2 & 3)   -->
        <!-- ============================================================= -->
        <div id="view-sender-dashboard" style="display: none;">
          <!-- Top Welcome Header -->
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem;">
            <div>
              <h1 style="font-family: 'Outfit'; font-size: 1.65rem; font-weight: 900; color: #f2f7f4;" id="sender-greeting-name">
                Welcome, Loza Bereket
              </h1>
              <div style="font-size: 0.8rem; color: #9eb2a6; display: flex; align-items: center; gap: 6px; margin-top: 3px;">
                <i data-lucide="calendar" style="width: 14px; height: 14px; color: #8fe617;"></i>
                <span id="sender-dashboard-date">Oct 13, 2026 • Sender Workstation 01</span>
              </div>
            </div>

            <button class="btn-lime" onclick="navigateTo('register')">
              <i data-lucide="user-plus" style="width: 15px; height: 15px;"></i>
              <span>Capture New Student</span>
            </button>
          </div>

          <!-- 3 Time Cards: Today, This Week, This Month -->
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 1rem; margin-bottom: 1.5rem;">
            <div class="metric-card">
              <div class="metric-label">Today's Dispatch</div>
              <div style="display: flex; justify-content: space-between; align-items: baseline; margin-top: 4px;">
                <div>
                  <span style="font-size: 11px; color: #9eb2a6;">Captured: </span>
                  <strong style="font-size: 1.4rem; color: #f2f7f4;" id="sender-today-captured">28</strong>
                </div>
                <div>
                  <span style="font-size: 11px; color: #9eb2a6;">Submitted: </span>
                  <strong style="font-size: 1.4rem; color: #8fe617;" id="sender-today-submitted">24</strong>
                </div>
              </div>
              <div class="metric-delta positive" style="margin-top: 4px;">
                <i data-lucide="arrow-up-right" style="width: 12px; height: 12px;"></i>
                <span>Active session in progress</span>
              </div>
            </div>

            <div class="metric-card">
              <div class="metric-label">This Week</div>
              <div style="display: flex; justify-content: space-between; align-items: baseline; margin-top: 4px;">
                <div>
                  <span style="font-size: 11px; color: #9eb2a6;">Captured: </span>
                  <strong style="font-size: 1.4rem; color: #f2f7f4;" id="sender-week-captured">142</strong>
                </div>
                <div>
                  <span style="font-size: 11px; color: #9eb2a6;">Submitted: </span>
                  <strong style="font-size: 1.4rem; color: #8fe617;" id="sender-week-submitted">128</strong>
                </div>
              </div>
              <div class="metric-delta positive" style="margin-top: 4px;">
                <i data-lucide="trending-up" style="width: 12px; height: 12px;"></i>
                <span>+18% from last week</span>
              </div>
            </div>

            <div class="metric-card">
              <div class="metric-label">This Month</div>
              <div style="display: flex; justify-content: space-between; align-items: baseline; margin-top: 4px;">
                <div>
                  <span style="font-size: 11px; color: #9eb2a6;">Captured: </span>
                  <strong style="font-size: 1.4rem; color: #f2f7f4;" id="sender-month-captured">532</strong>
                </div>
                <div>
                  <span style="font-size: 11px; color: #9eb2a6;">Submitted: </span>
                  <strong style="font-size: 1.4rem; color: #8fe617;" id="sender-month-submitted">498</strong>
                </div>
              </div>
              <div class="metric-delta positive" style="margin-top: 4px;">
                <i data-lucide="check-circle" style="width: 12px; height: 12px;"></i>
                <span>94% target completion</span>
              </div>
            </div>
          </div>

          <!-- Middle Row: Performance Ring & Operational Telemetry -->
          <div style="display: grid; grid-template-columns: 280px 1fr; gap: 1rem; margin-bottom: 1.5rem;" class="sender-telemetry-grid">
            <div class="glass-card" style="display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: 1.5rem;">
              <div class="gauge-circle" style="--pct: 92%; margin-bottom: 12px;">
                <div class="gauge-circle-inner">
                  <span style="font-family: 'Outfit'; font-size: 1.5rem; font-weight: 900; color: #8fe617;">92%</span>
                  <span style="font-size: 9px; font-weight: 700; color: #9eb2a6; text-transform: uppercase;">Acceptance</span>
                </div>
              </div>
              <div style="font-weight: 700; font-size: 0.85rem; color: #f2f7f4;">Quality Performance</div>
              <p style="font-size: 0.75rem; color: #9eb2a6; margin-top: 4px;">
                High fidelity data quality index calculated from approved records.
              </p>
            </div>

            <div class="glass-card" style="display: flex; flex-direction: column; justify-content: space-between;">
              <div style="font-family: 'Outfit'; font-weight: 800; font-size: 1rem; color: #f2f7f4; margin-bottom: 1rem;">
                Operational Telemetry
              </div>
              <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem;">
                <div style="padding: 1rem; background: #090e0b; border-radius: 14px; border: 1px solid var(--border);">
                  <div style="font-size: 11px; font-weight: 700; color: #9eb2a6;">Avg Processing Time</div>
                  <div style="font-family: 'Outfit'; font-size: 1.4rem; font-weight: 800; color: #8fe617; margin-top: 4px;">2.4 min</div>
                  <div style="font-size: 10px; color: #6c7872; margin-top: 2px;">Per student record</div>
                </div>
                <div style="padding: 1rem; background: #090e0b; border-radius: 14px; border: 1px solid var(--border);">
                  <div style="font-size: 11px; font-weight: 700; color: #9eb2a6;">Active Session Time</div>
                  <div style="font-family: 'Outfit'; font-size: 1.4rem; font-weight: 800; color: #f2f7f4; margin-top: 4px;">4h 32m</div>
                  <div style="font-size: 10px; color: #6c7872; margin-top: 2px;">Current dispatch session</div>
                </div>
                <div style="padding: 1rem; background: #090e0b; border-radius: 14px; border: 1px solid var(--border);">
                  <div style="font-size: 11px; font-weight: 700; color: #9eb2a6;">Photo Upload Failures</div>
                  <div style="font-family: 'Outfit'; font-size: 1.4rem; font-weight: 800; color: #f87171; margin-top: 4px;">0</div>
                  <div style="font-size: 10px; color: #6c7872; margin-top: 2px;">R2 Cloud synchronization 100%</div>
                </div>
              </div>
              <div style="margin-top: 1rem; padding: 0.75rem; background: rgba(143,230,23,0.06); border-radius: 10px; border: 1px solid rgba(143,230,23,0.15); font-size: 0.75rem; color: #8fe617; display: flex; align-items: center; gap: 8px;">
                <i data-lucide="check-check" style="width: 14px; height: 14px;"></i>
                <span>Edge storage connected to Cloudflare R2 bucket <code>siliconlabs</code></span>
              </div>
            </div>
          </div>

          <!-- Bottom: Recent Submissions Table -->
          <div class="glass-card">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
              <h3 style="font-family: 'Outfit'; font-size: 1rem; font-weight: 800; color: #f2f7f4;">
                Recent Submissions
              </h3>
              <a href="#" onclick="navigateTo('sender-submissions'); return false;" style="font-size: 0.75rem; color: #8fe617; font-weight: 700; text-decoration: none;">View All Submissions →</a>
            </div>

            <div class="table-responsive">
              <table class="dense-table">
                <thead>
                  <tr>
                    <th>Student ID</th>
                    <th>Full Name</th>
                    <th>School</th>
                    <th>Grade</th>
                    <th>Status</th>
                    <th>Time</th>
                  </tr>
                </thead>
                <tbody id="sender-recent-tbody">
                  <!-- Filled dynamically -->
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- ============================================================= -->
        <!-- SENDER VIEW 2: STUDENT REGISTRATION (Matching Screenshot 3)   -->
        <!-- ============================================================= -->
        <div id="view-register" style="display: none; padding-bottom: 2rem;">
          
          <!-- Stepper at top -->
          <div class="form-stepper" style="max-width: 600px; margin: 0 auto 2rem auto;">
            <div class="stepper-step active" id="step-1">
              <div class="step-number">1</div>
              <div class="step-text">Student Info</div>
            </div>
            <div class="stepper-step active" id="step-2">
              <div class="step-number">2</div>
              <div class="step-text">Photo</div>
            </div>
            <div class="stepper-step" id="step-3">
              <div class="step-number">3</div>
              <div class="step-text">Review</div>
            </div>
            <div class="stepper-step" id="step-4">
              <div class="step-number">4</div>
              <div class="step-text">Submit</div>
            </div>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 340px; gap: 1.5rem; max-width: 1200px; margin: 0 auto;" class="register-grid">
            
            <!-- Left Column: Form Fields -->
            <div class="glass-card">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem;">
                <div>
                  <h2 style="font-family: 'Outfit'; font-size: 1.25rem; font-weight: 900; color: #f2f7f4;">
                    Register New Student
                  </h2>
                  <p style="font-size: 0.78rem; color: #9eb2a6; margin-top: 2px;">
                    Accurate identification data capture with instant uniqueness verification
                  </p>
                </div>
                <button type="button" class="btn-ghost" style="padding: 5px 12px; font-size: 11px;" onclick="generateNewStudentId()">
                  <i data-lucide="refresh-cw" style="width: 12px; height: 12px;"></i>
                  <span>New ID</span>
                </button>
              </div>

              <form id="form-register-student" onsubmit="handleRegisterSubmit(event)">
                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem; margin-bottom: 1rem;">
                  
                  <!-- Student ID with Check button -->
                  <div style="grid-column: span 2;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                      <label class="form-label" style="margin-bottom: 0;">Student ID *</label>
                      <span id="reg-studentid-status" class="badge badge-success" style="font-size: 10px;">ID Auto-Generated</span>
                    </div>
                    <div style="display: flex; gap: 8px;">
                      <input 
                        type="text" 
                        id="reg-studentid" 
                        required 
                        class="input-field" 
                        style="font-family: 'JetBrains Mono'; font-weight: 800; letter-spacing: 0.05em; color: #8fe617;"
                        oninput="checkStudentIdAvailability(this.value)"
                      />
                      <button type="button" class="btn-lime" onclick="checkStudentIdAvailability()" style="padding: 0 16px;">
                        Check
                      </button>
                    </div>
                  </div>

                  <!-- Full Name (with auto title-capitalization) -->
                  <div style="grid-column: span 2;">
                    <label class="form-label">Full Name *</label>
                    <input 
                      type="text" 
                      id="reg-fullname" 
                      required 
                      placeholder="e.g. loza bereket (auto title-capitalized)" 
                      class="input-field" 
                      onblur="autoCapitalizeName(this)"
                      oninput="handleNameLiveCapitalize(this)"
                    />
                    <div style="font-size: 10px; color: #6c7872; margin-top: 3px;">
                      Names automatically convert: "loza bereket" → "Loza Bereket"
                    </div>
                  </div>

                  <!-- Sex -->
                  <div>
                    <label class="form-label">Sex *</label>
                    <select id="reg-sex" required class="input-field">
                      <option value="Female">Female</option>
                      <option value="Male">Male</option>
                    </select>
                  </div>

                  <!-- Blood Group (All 10 types) -->
                  <div>
                    <label class="form-label">Blood Group</label>
                    <select id="reg-blood" class="input-field">
                      <option value="Unknown">-- Select Blood Group --</option>
                      <option value="A+">A+</option>
                      <option value="A-">A-</option>
                      <option value="B+">B+</option>
                      <option value="B-">B-</option>
                      <option value="AB+">AB+</option>
                      <option value="AB-">AB-</option>
                      <option value="O+">O+</option>
                      <option value="O-">O-</option>
                      <option value="Unknown">Unknown</option>
                    </select>
                  </div>

                  <!-- Grade / Class -->
                  <div>
                    <label class="form-label">Grade / Class *</label>
                    <select id="reg-grade" required class="input-field">
                      <option value="9C">Grade 9C</option>
                      <option value="1A">Grade 1A</option>
                      <option value="1B">Grade 1B</option>
                      <option value="2A">Grade 2A</option>
                      <option value="2B">Grade 2B</option>
                      <option value="3A">Grade 3A</option>
                      <option value="3B">Grade 3B</option>
                      <option value="4A">Grade 4A</option>
                      <option value="4B">Grade 4B</option>
                      <option value="5A">Grade 5A</option>
                      <option value="5B">Grade 5B</option>
                      <option value="6A">Grade 6A</option>
                      <option value="6B">Grade 6B</option>
                      <option value="7A">Grade 7A</option>
                      <option value="7B">Grade 7B</option>
                      <option value="8A">Grade 8A</option>
                      <option value="8B">Grade 8B</option>
                      <option value="9A">Grade 9A</option>
                      <option value="9B">Grade 9B</option>
                      <option value="10A">Grade 10A</option>
                      <option value="10B">Grade 10B</option>
                      <option value="11A">Grade 11A</option>
                      <option value="11B">Grade 11B</option>
                      <option value="12A">Grade 12A</option>
                      <option value="12B">Grade 12B</option>
                      <option value="LKG">LKG</option>
                      <option value="UKG">UKG</option>
                      <option value="Nursery">Nursery</option>
                    </select>
                  </div>

                  <!-- Section -->
                  <div>
                    <label class="form-label">Section</label>
                    <select id="reg-section" class="input-field">
                      <option value="A">Section A</option>
                      <option value="B">Section B</option>
                      <option value="C" selected>Section C</option>
                      <option value="D">Section D</option>
                    </select>
                  </div>

                  <!-- School Selector (Configurable, with High Tech in Harar) -->
                  <div>
                    <label class="form-label">School *</label>
                    <select id="reg-school" required class="input-field" onchange="handleSchoolSelectChange(this.value)">
                      <option value="YMS">YMS</option>
                      <option value="Adika Youth">Adika Youth</option>
                      <option value="School of America">School of America</option>
                      <option value="Ferway">Ferway</option>
                      <option value="Warka">Warka</option>
                      <option value="Yacine">Yacine</option>
                      <option value="Debebech">Debebech</option>
                      <option value="High Tech">High Tech</option>
                    </select>
                  </div>

                  <!-- Location / City -->
                  <div>
                    <label class="form-label">Location *</label>
                    <select id="reg-location" required class="input-field">
                      <option value="Addis Ababa">Addis Ababa</option>
                      <option value="Adama">Adama</option>
                      <option value="Harar">Harar</option>
                    </select>
                  </div>

                  <!-- Phone Number (with Ethiopian 09/07 auto-normalization) -->
                  <div style="grid-column: span 2;">
                    <label class="form-label">Phone Number *</label>
                    <input 
                      type="text" 
                      id="reg-phone" 
                      required 
                      placeholder="e.g. 0912480376 (auto converts to +251912480376)" 
                      class="input-field" 
                      oninput="handlePhoneAutoFormat(this)"
                    />
                    <div style="font-size: 10px; color: #6c7872; margin-top: 3px;">
                      Local Ethiopian 09... converts to +2519... and 07... converts to +2517...
                    </div>
                  </div>

                </div>

                <!-- Extra Details Accordion -->
                <div style="margin-bottom: 1.5rem; border: 1px solid var(--border); border-radius: 14px; overflow: hidden; background: #0b110d;">
                  <button 
                    type="button" 
                    onclick="toggleAccordion('extra-details-content')"
                    style="width: 100%; padding: 10px 14px; background: transparent; border: none; display: flex; justify-content: space-between; align-items: center; color: #9eb2a6; font-size: 0.8rem; font-weight: 700; cursor: pointer;"
                  >
                    <span>+ Extra Details (Emergency & Bus Usage)</span>
                    <i data-lucide="chevron-down" style="width: 14px; height: 14px;"></i>
                  </button>
                  <div id="extra-details-content" style="display: none; padding: 12px 14px; border-top: 1px solid var(--border);">
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                      <div>
                        <label class="form-label">Emergency Contact Phone</label>
                        <input type="text" id="reg-emergency-phone" placeholder="+251911223344" class="input-field" oninput="handlePhoneAutoFormat(this)" />
                      </div>
                      <div>
                        <label class="form-label">School Bus Usage</label>
                        <select id="reg-bus-usage" class="input-field">
                          <option value="No">No</option>
                          <option value="Yes">Yes</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Form Action Buttons -->
                <div style="display: flex; justify-content: space-between; align-items: center; gap: 1rem;">
                  <button type="button" class="btn-ghost" onclick="saveRegistrationDraft()">
                    <i data-lucide="save" style="width: 14px; height: 14px;"></i>
                    <span>Save Draft</span>
                  </button>

                  <button type="submit" class="btn-lime">
                    <span>Submit Student Record</span>
                    <i data-lucide="arrow-right" style="width: 15px; height: 15px;"></i>
                  </button>
                </div>
              </form>
            </div>

            <!-- Right Column: Live Camera & Photo Capture -->
            <div class="glass-card" style="display: flex; flex-direction: column; justify-content: space-between;">
              <div>
                <h3 style="font-family: 'Outfit'; font-size: 1rem; font-weight: 800; color: #f2f7f4; margin-bottom: 0.5rem;">
                  Student Photograph
                </h3>
                <p style="font-size: 0.75rem; color: #9eb2a6; margin-bottom: 1rem;">
                  Direct portrait webcam capture or high-res image upload
                </p>

                <!-- Webcam / Photo Container -->
                <div class="webcam-box" id="reg-webcam-container">
                  <video id="sender-camera-stream" autoplay playsinline muted style="display: none;"></video>
                  <img id="photo-preview-img" style="display: none;" alt="Captured preview" />
                  
                  <div id="photo-preview-placeholder" style="text-align: center; padding: 1.5rem;">
                    <i data-lucide="camera" style="width: 44px; height: 44px; color: #6c7872; margin-bottom: 8px;"></i>
                    <div style="font-size: 12px; font-weight: 700; color: #9eb2a6;">No Photo Attached</div>
                    <div style="font-size: 10px; color: #55665c; margin-top: 2px;">Capture live or select image file</div>
                  </div>

                  <!-- Live Stream Active indicator badge -->
                  <div id="camera-live-badge" style="display: none; position: absolute; top: 10px; right: 10px; background: rgba(239, 68, 68, 0.85); color: #fff; font-size: 10px; font-weight: 800; padding: 2px 8px; border-radius: 9999px; align-items: center; gap: 4px;">
                    <span style="width: 6px; height: 6px; border-radius: 50%; background: #fff; display: inline-block;"></span>
                    LIVE
                  </div>
                </div>

                <!-- Camera Controls -->
                <div style="display: flex; flex-direction: column; gap: 8px; margin-top: 1rem;">
                  <button type="button" class="btn-lime" id="btn-take-photo" onclick="toggleCameraStream()" style="justify-content: center;">
                    <i data-lucide="video" style="width: 15px; height: 15px;"></i>
                    <span id="btn-take-photo-text">Start Live Camera</span>
                  </button>

                  <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                    <button type="button" class="btn-ghost" onclick="document.getElementById('reg-photo-file').click()" style="justify-content: center;">
                      <i data-lucide="upload" style="width: 14px; height: 14px;"></i>
                      <span>Upload</span>
                    </button>
                    <input type="file" id="reg-photo-file" accept="image/*" style="display: none;" onchange="handlePhotoFileUpload(event)" />

                    <button type="button" class="btn-ghost" id="btn-crop-photo" onclick="openPhotoEditorModal()" style="justify-content: center;">
                      <i data-lucide="crop" style="width: 14px; height: 14px;"></i>
                      <span>Crop & Edit</span>
                    </button>
                  </div>
                </div>
              </div>

              <!-- Storage Cloud Status -->
              <div style="margin-top: 1rem; padding: 10px; background: #090e0b; border-radius: 12px; border: 1px solid var(--border); font-size: 11px; color: #9eb2a6; display: flex; align-items: center; gap: 8px;">
                <i data-lucide="cloud-check" style="width: 16px; height: 16px; color: #8fe617;"></i>
                <div>
                  <div style="font-weight: 700; color: #f2f7f4;">R2 Cloud Storage</div>
                  <div style="font-size: 10px; color: #6c7872;">Ready to dispatch to <code>siliconlabs</code> bucket</div>
                </div>
              </div>
            </div>

          </div>
        </div>

        <!-- ============================================================= -->
        <!-- SENDER VIEW 3: MY SUBMISSIONS                                 -->
        <!-- ============================================================= -->
        <div id="view-sender-submissions" style="display: none;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
            <div>
              <h2 style="font-family: 'Outfit'; font-size: 1.4rem; font-weight: 900; color: #f2f7f4;">
                My Submissions
              </h2>
              <p style="font-size: 0.8rem; color: #9eb2a6;">
                Historical record of all student entries transmitted by this workstation
              </p>
            </div>
            <button class="btn-lime" onclick="navigateTo('register')">
              <i data-lucide="plus" style="width: 14px; height: 14px;"></i>
              <span>New Entry</span>
            </button>
          </div>

          <div class="glass-card">
            <div class="table-responsive">
              <table class="dense-table">
                <thead>
                  <tr>
                    <th>Student ID</th>
                    <th>Full Name</th>
                    <th>School</th>
                    <th>Grade</th>
                    <th>Sex</th>
                    <th>Phone</th>
                    <th>Status</th>
                    <th>Submitted At</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody id="sender-submissions-tbody">
                  <!-- Filled dynamically -->
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- ============================================================= -->
        <!-- SENDER VIEW 4: SENDER TASKS                                   -->
        <!-- ============================================================= -->
        <div id="view-sender-tasks" style="display: none;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
            <div>
              <h2 style="font-family: 'Outfit'; font-size: 1.4rem; font-weight: 900; color: #f2f7f4;">
                Assigned Dispatch Tasks
              </h2>
              <p style="font-size: 0.8rem; color: #9eb2a6;">
                Review field assignments, photo verification requests, and admin deadlines
              </p>
            </div>
          </div>

          <div class="glass-card">
            <div class="table-responsive">
              <table class="dense-table">
                <thead>
                  <tr>
                    <th>Task ID</th>
                    <th>Title & Description</th>
                    <th>School Target</th>
                    <th>Priority</th>
                    <th>Deadline</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody id="sender-tasks-tbody">
                  <!-- Filled dynamically -->
                </tbody>
              </table>
            </div>
          </div>
        </div>
`;
