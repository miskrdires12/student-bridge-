module.exports = `
      </main> <!-- End of .app-main -->

      <!-- ============================================================= -->
      <!-- SLIDE-OVER STUDENT DETAILS PANEL (Matching Screenshot 5 & 13) -->
      <!-- ============================================================= -->
      <aside class="slideover-panel" id="student-details-panel">
        
        <!-- Header with Close Button -->
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 1.25rem; border-bottom: 1px solid var(--border); background: #0a0f0c; position: sticky; top: 0; z-index: 10;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="font-family: 'JetBrains Mono'; font-weight: 800; font-size: 0.95rem; color: #8fe617;" id="panel-student-id">
              SB-2026-12788
            </span>
            <span class="badge badge-success" id="panel-status-badge">Active</span>
          </div>

          <button type="button" onclick="closeStudentDetailsPanel()" class="animated-icon-btn" style="width: 32px; height: 32px;">
            <i data-lucide="x" style="width: 16px; height: 16px;"></i>
          </button>
        </div>

        <!-- Panel Body -->
        <div style="padding: 1.25rem; display: flex; flex-direction: column; gap: 1.25rem;">
          
          <!-- Large High-Res Student Photo -->
          <div style="width: 100%; aspect-ratio: 4/5; border-radius: 18px; overflow: hidden; background: #070908; border: 2px solid #1e2c22; position: relative;">
            <img id="panel-photo-img" src="" alt="Student portrait" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.src='/logo.png'" />
          </div>

          <!-- Student Name & Quick Actions -->
          <div>
            <h2 style="font-family: 'Outfit'; font-size: 1.4rem; font-weight: 900; color: #f2f7f4;" id="panel-fullname">
              Loza Bereket
            </h2>
            <div style="font-size: 0.8rem; color: #9eb2a6; margin-top: 2px;" id="panel-subtitle">
              Grade 9C • YMS • Addis Ababa
            </div>
          </div>

          <!-- Action Buttons Bar -->
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
            <button class="btn-lime" style="justify-content: center; font-size: 11px; padding: 7px 10px;" onclick="downloadActivePanelPhoto()">
              <i data-lucide="download" style="width: 13px; height: 13px;"></i>
              <span>Download Photo</span>
            </button>
            <button class="btn-ghost" style="justify-content: center; font-size: 11px; padding: 7px 10px;" onclick="openEditorFromDetailsPanel()">
              <i data-lucide="crop" style="width: 13px; height: 13px;"></i>
              <span>Edit Photo</span>
            </button>
            <button class="btn-ghost" style="justify-content: center; font-size: 11px; padding: 7px 10px;" onclick="openEditStudentModalFromPanel()">
              <i data-lucide="edit-3" style="width: 13px; height: 13px;"></i>
              <span>Edit Student</span>
            </button>
            <button class="btn-ghost" style="justify-content: center; font-size: 11px; padding: 7px 10px;" onclick="requestCorrectionFromPanel()">
              <i data-lucide="flag" style="width: 13px; height: 13px;"></i>
              <span>Correction Note</span>
            </button>
          </div>

          <!-- Two-Column Student Information Grid -->
          <div style="background: #090e0b; border: 1px solid var(--border); border-radius: 14px; padding: 1rem; display: flex; flex-direction: column; gap: 8px; font-size: 12px;">
            <div style="display: flex; justify-content: space-between;">
              <span style="color: #798b81;">Sex:</span>
              <strong style="color: #f2f7f4;" id="panel-sex">Female</strong>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span style="color: #798b81;">Grade / Class:</span>
              <strong style="color: #f2f7f4;" id="panel-grade">9C</strong>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span style="color: #798b81;">Blood Group:</span>
              <strong style="color: #f87171;" id="panel-blood">O+</strong>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span style="color: #798b81;">School:</span>
              <strong style="color: #f2f7f4;" id="panel-school">YMS</strong>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span style="color: #798b81;">Location:</span>
              <strong style="color: #f2f7f4;" id="panel-location">Addis Ababa</strong>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span style="color: #798b81;">Phone Number:</span>
              <strong style="color: #8fe617;" id="panel-phone">+251912480376</strong>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span style="color: #798b81;">Parent / Guardian Phone:</span>
              <strong style="color: #f2f7f4;" id="panel-guardian-phone">+251911234567</strong>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span style="color: #798b81;">Emergency Contact:</span>
              <strong style="color: #f2f7f4;" id="panel-emergency-contact">+251911223344</strong>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span style="color: #798b81;">School Bus User:</span>
              <strong style="color: #f2f7f4;" id="panel-bus-usage">Yes</strong>
            </div>
          </div>

          <!-- Submission & Audit Metadata -->
          <div style="background: #090e0b; border: 1px solid var(--border); border-radius: 14px; padding: 1rem; display: flex; flex-direction: column; gap: 8px; font-size: 11px;">
            <div style="font-weight: 700; color: #8fe617; text-transform: uppercase; font-size: 10px; letter-spacing: 0.05em;">
              Submission & Integrity Metadata
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span style="color: #798b81;">Submitted By:</span>
              <strong style="color: #f2f7f4;" id="panel-sender-name">Loza Bereket (Sender)</strong>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span style="color: #798b81;">Submission Time:</span>
              <strong style="color: #f2f7f4;" id="panel-created-at">2026-10-08 10:24</strong>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span style="color: #798b81;">Last Edited By:</span>
              <strong style="color: #f2f7f4;" id="panel-editor-name">Alemu Tadesse (Receiver)</strong>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span style="color: #798b81;">Last Edit Time:</span>
              <strong style="color: #f2f7f4;" id="panel-updated-at">2026-10-09 14:32</strong>
            </div>
          </div>

          <!-- QR Code Generator & Preview -->
          <div style="background: #090e0b; border: 1px solid var(--border); border-radius: 14px; padding: 1rem; display: flex; flex-direction: column; align-items: center; gap: 10px;">
            <div style="font-size: 11px; font-weight: 700; color: #9eb2a6; align-self: flex-start;">
              Encrypted QR Identity Code
            </div>
            <div id="panel-qrcode-box" style="padding: 10px; background: #fff; border-radius: 12px; width: 140px; height: 140px; display: flex; align-items: center; justify-content: center;">
              <!-- QR rendered here by QRCode.js -->
            </div>
            <button class="btn-ghost" style="width: 100%; justify-content: center; font-size: 11px;" onclick="downloadQrCode()">
              <i data-lucide="qr-code" style="width: 13px; height: 13px;"></i>
              <span>Download QR Code Image</span>
            </button>
          </div>

          <!-- Record History Timeline -->
          <div style="background: #090e0b; border: 1px solid var(--border); border-radius: 14px; padding: 1rem;">
            <div style="font-size: 11px; font-weight: 700; color: #8fe617; text-transform: uppercase; margin-bottom: 8px;">
              Record Audit History
            </div>
            <div id="panel-history-timeline" style="display: flex; flex-direction: column; gap: 8px; font-size: 11px;">
              <!-- Timeline items -->
            </div>
          </div>

        </div>
      </aside>

    </div> <!-- End of .app-layout -->
  </div> <!-- End of #screen-app -->

  <!-- ============================================================= -->
  <!-- MODAL 1: BULK DOWNLOAD & EXPORT (Matching Screenshot 6)       -->
  <!-- ============================================================= -->
  <div id="modal-bulk-export" class="modal-overlay">
    <div class="modal-box" style="max-width: 680px;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem;">
        <div>
          <h2 style="font-family: 'Outfit'; font-size: 1.35rem; font-weight: 900; color: #f2f7f4;">
            Bulk Download & Export Students
          </h2>
          <p style="font-size: 0.8rem; color: #9eb2a6; margin-top: 2px;">
            Export photographs into structured ZIP archives or download metadata in CSV/Excel
          </p>
        </div>
        <button type="button" class="animated-icon-btn" onclick="closeBulkExportModal()">
          <i data-lucide="x" style="width: 16px; height: 16px;"></i>
        </button>
      </div>

      <!-- Scope Selection -->
      <div style="margin-bottom: 1.25rem;">
        <label class="form-label">Export Scope</label>
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px;">
          <label style="display: flex; align-items: center; gap: 8px; padding: 8px 12px; background: #0a100c; border: 1px solid var(--border); border-radius: 10px; cursor: pointer; font-size: 0.8rem; color: #f2f7f4;">
            <input type="radio" name="export-scope" value="CURRENT_PAGE" checked style="accent-color: #8fe617;" />
            <span>Current Page (500)</span>
          </label>
          <label style="display: flex; align-items: center; gap: 8px; padding: 8px 12px; background: #0a100c; border: 1px solid var(--border); border-radius: 10px; cursor: pointer; font-size: 0.8rem; color: #f2f7f4;">
            <input type="radio" name="export-scope" value="SELECTED" style="accent-color: #8fe617;" />
            <span id="export-scope-selected-label">Selected (0)</span>
          </label>
          <label style="display: flex; align-items: center; gap: 8px; padding: 8px 12px; background: #0a100c; border: 1px solid var(--border); border-radius: 10px; cursor: pointer; font-size: 0.8rem; color: #f2f7f4;">
            <input type="radio" name="export-scope" value="ALL" style="accent-color: #8fe617;" />
            <span>All Filtered</span>
          </label>
        </div>
      </div>

      <!-- Format Selection -->
      <div style="margin-bottom: 1.25rem;">
        <label class="form-label">Output Format</label>
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px;">
          <label style="display: flex; align-items: center; gap: 8px; padding: 8px 12px; background: #0a100c; border: 1px solid var(--border); border-radius: 10px; cursor: pointer; font-size: 0.8rem; color: #f2f7f4;">
            <input type="radio" name="export-format" value="ZIP" checked style="accent-color: #8fe617;" />
            <span>ZIP (Photos)</span>
          </label>
          <label style="display: flex; align-items: center; gap: 8px; padding: 8px 12px; background: #0a100c; border: 1px solid var(--border); border-radius: 10px; cursor: pointer; font-size: 0.8rem; color: #f2f7f4;">
            <input type="radio" name="export-format" value="CSV" style="accent-color: #8fe617;" />
            <span>CSV (Metadata)</span>
          </label>
          <label style="display: flex; align-items: center; gap: 8px; padding: 8px 12px; background: #0a100c; border: 1px solid var(--border); border-radius: 10px; cursor: pointer; font-size: 0.8rem; color: #f2f7f4;">
            <input type="radio" name="export-format" value="EXCEL" style="accent-color: #8fe617;" />
            <span>Excel (.xlsx)</span>
          </label>
        </div>
      </div>

      <!-- Archive Structure Pattern -->
      <div style="margin-bottom: 1.25rem; padding: 10px 14px; background: #090e0b; border: 1px solid var(--border); border-radius: 12px; font-size: 11px; color: #9eb2a6;">
        <span style="font-weight: 700; color: #8fe617;">Folder Hierarchy:</span>
        <code>{Location}/{School}/{Grade}/{StudentID}_{FullName}.jpg</code>
      </div>

      <!-- Progress Section (Shown while exporting) -->
      <div id="export-progress-section" style="display: none; margin-bottom: 1.25rem;">
        <div style="display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 6px;">
          <span style="color: #8fe617; font-weight: 700;" id="export-progress-status">Creating archive...</span>
          <span style="color: #9eb2a6;" id="export-progress-count">0 / 0 files</span>
        </div>
        <div style="height: 10px; border-radius: 9999px; background: #1c2720; overflow: hidden; margin-bottom: 10px;">
          <div id="export-progress-bar" style="width: 0%; height: 100%; background: #8fe617; transition: width 0.2s;"></div>
        </div>

        <!-- Files checklist preview -->
        <div style="max-height: 140px; overflow-y: auto; background: #090e0b; border: 1px solid var(--border); border-radius: 10px; padding: 8px;" id="export-files-checklist">
          <!-- Item list -->
        </div>
      </div>

      <!-- Actions -->
      <div style="display: flex; justify-content: flex-end; gap: 10px;">
        <button type="button" class="btn-ghost" onclick="closeBulkExportModal()">Cancel</button>
        <button type="button" class="btn-lime" id="btn-start-bulk-export" onclick="executeBulkExport()">
          <i data-lucide="download" style="width: 14px; height: 14px;"></i>
          <span>Start Download</span>
        </button>
      </div>
    </div>
  </div>

  <!-- ============================================================= -->
  <!-- MODAL 2: PHOTO EDITOR (Matching Screenshot 4)                 -->
  <!-- ============================================================= -->
  <div id="modal-photo-editor" class="modal-overlay">
    <div class="modal-box" style="max-width: 600px;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
        <h2 style="font-family: 'Outfit'; font-size: 1.25rem; font-weight: 900; color: #f2f7f4;">
          Student Portrait Editor
        </h2>
        <button type="button" class="animated-icon-btn" onclick="closePhotoEditorModal()">
          <i data-lucide="x" style="width: 16px; height: 16px;"></i>
        </button>
      </div>

      <!-- Canvas Box with Crop Target -->
      <div style="width: 100%; aspect-ratio: 4/5; background: #070908; border: 2px dashed #8fe617; border-radius: 18px; overflow: hidden; display: flex; align-items: center; justify-content: center; position: relative;">
        <canvas id="photo-editor-canvas" style="max-width: 100%; max-height: 100%; object-fit: contain;"></canvas>
      </div>

      <!-- Adjustment Sliders: Brightness, Contrast, Saturation -->
      <div style="display: flex; flex-direction: column; gap: 10px; margin: 1.25rem 0;">
        <div>
          <div style="display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 3px;">
            <span style="color: #9eb2a6; font-weight: 700;">Brightness</span>
            <span id="slider-val-brightness" style="color: #8fe617;">100%</span>
          </div>
          <input type="range" id="slider-brightness" min="50" max="150" value="100" style="width: 100%; accent-color: #8fe617;" oninput="applyPhotoFilters()" />
        </div>

        <div>
          <div style="display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 3px;">
            <span style="color: #9eb2a6; font-weight: 700;">Contrast</span>
            <span id="slider-val-contrast" style="color: #8fe617;">100%</span>
          </div>
          <input type="range" id="slider-contrast" min="50" max="150" value="100" style="width: 100%; accent-color: #8fe617;" oninput="applyPhotoFilters()" />
        </div>

        <div>
          <div style="display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 3px;">
            <span style="color: #9eb2a6; font-weight: 700;">Saturation</span>
            <span id="slider-val-saturation" style="color: #8fe617;">100%</span>
          </div>
          <input type="range" id="slider-saturation" min="0" max="200" value="100" style="width: 100%; accent-color: #8fe617;" oninput="applyPhotoFilters()" />
        </div>
      </div>

      <!-- Rotate & Crop Actions -->
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem;">
        <div style="display: flex; gap: 8px;">
          <button type="button" class="btn-ghost" onclick="rotateEditorPhoto(90)" title="Rotate 90 degrees">
            <i data-lucide="rotate-cw" style="width: 14px; height: 14px;"></i>
            <span>Rotate 90°</span>
          </button>
          <button type="button" class="btn-ghost" onclick="resetPhotoFilters()" title="Reset Filters">
            <i data-lucide="refresh-cw" style="width: 14px; height: 14px;"></i>
            <span>Reset</span>
          </button>
        </div>
      </div>

      <!-- Save or Cancel -->
      <div style="display: flex; justify-content: flex-end; gap: 10px;">
        <button type="button" class="btn-ghost" onclick="closePhotoEditorModal()">Cancel</button>
        <button type="button" class="btn-lime" onclick="saveEditorPhoto()">
          <i data-lucide="check" style="width: 14px; height: 14px;"></i>
          <span>Save & Apply Photo</span>
        </button>
      </div>
    </div>
  </div>

  <!-- ============================================================= -->
  <!-- MODAL 3: NEW TASK MODAL (For Admin & Super Admin)             -->
  <!-- ============================================================= -->
  <div id="modal-new-task" class="modal-overlay">
    <div class="modal-box" style="max-width: 520px;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem;">
        <h2 style="font-family: 'Outfit'; font-size: 1.25rem; font-weight: 900; color: #f2f7f4;">
          Create New Dispatch Task
        </h2>
        <button type="button" class="animated-icon-btn" onclick="closeNewTaskModal()">
          <i data-lucide="x" style="width: 16px; height: 16px;"></i>
        </button>
      </div>

      <form onsubmit="handleCreateTaskSubmit(event)" style="display: flex; flex-direction: column; gap: 1rem;">
        <div>
          <label class="form-label">Task Title *</label>
          <input type="text" id="task-input-title" required placeholder="e.g. Reshoot missing photos for Grade 9" class="input-field" />
        </div>
        <div>
          <label class="form-label">Assign To *</label>
          <select id="task-input-assignee" required class="input-field">
            <option value="Loza Bereket">Loza Bereket</option>
            <option value="Alemu Tadesse">Alemu Tadesse</option>
            <option value="Hana Tadesse">Hana Tadesse</option>
            <option value="Getnet Kassa">Getnet Kassa</option>
            <option value="Dawit Alemu">Dawit Alemu</option>
          </select>
        </div>
        <div>
          <label class="form-label">Target School *</label>
          <select id="task-input-school" required class="input-field">
            <option value="YMS">YMS</option>
            <option value="Adika Youth">Adika Youth</option>
            <option value="School of America">School of America</option>
            <option value="Ferway">Ferway</option>
            <option value="High Tech">High Tech</option>
          </select>
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
          <div>
            <label class="form-label">Priority</label>
            <select id="task-input-priority" class="input-field">
              <option value="High">High Priority</option>
              <option value="Medium" selected>Medium Priority</option>
              <option value="Low">Low Priority</option>
            </select>
          </div>
          <div>
            <label class="form-label">Deadline</label>
            <input type="date" id="task-input-deadline" required value="2026-10-18" class="input-field" />
          </div>
        </div>

        <div style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 1rem;">
          <button type="button" class="btn-ghost" onclick="closeNewTaskModal()">Cancel</button>
          <button type="submit" class="btn-lime">Create Task</button>
        </div>
      </form>
    </div>
  </div>

  <!-- ============================================================= -->
  <!-- MODAL 4: INVITE SENDER MODAL                                  -->
  <!-- ============================================================= -->
  <div id="modal-invite-sender" class="modal-overlay">
    <div class="modal-box" style="max-width: 500px;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem;">
        <h2 style="font-family: 'Outfit'; font-size: 1.25rem; font-weight: 900; color: #f2f7f4;">
          Invite Field Sender
        </h2>
        <button type="button" class="animated-icon-btn" onclick="closeInviteSenderModal()">
          <i data-lucide="x" style="width: 16px; height: 16px;"></i>
        </button>
      </div>

      <form onsubmit="handleInviteSenderSubmit(event)" style="display: flex; flex-direction: column; gap: 1rem;">
        <div>
          <label class="form-label">Sender Full Name *</label>
          <input type="text" id="invite-sender-name" required placeholder="e.g. Betelhem Girma" class="input-field" />
        </div>
        <div>
          <label class="form-label">Operator Email *</label>
          <input type="email" id="invite-sender-email" required placeholder="operator@example.com" class="input-field" />
        </div>
        <div>
          <label class="form-label">Assigned School *</label>
          <select id="invite-sender-school" required class="input-field">
            <option value="YMS">YMS</option>
            <option value="Adika Youth">Adika Youth</option>
            <option value="School of America">School of America</option>
            <option value="Ferway">Ferway</option>
            <option value="Warka">Warka</option>
            <option value="High Tech">High Tech</option>
          </select>
        </div>

        <div style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 1rem;">
          <button type="button" class="btn-ghost" onclick="closeInviteSenderModal()">Cancel</button>
          <button type="submit" class="btn-lime">Send Invitation</button>
        </div>
      </form>
    </div>
  </div>

  <!-- ============================================================= -->
  <!-- MODAL 5: ADD SCHOOL MODAL                                     -->
  <!-- ============================================================= -->
  <div id="modal-add-school" class="modal-overlay">
    <div class="modal-box" style="max-width: 480px;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem;">
        <h2 style="font-family: 'Outfit'; font-size: 1.25rem; font-weight: 900; color: #f2f7f4;">
          Add New School
        </h2>
        <button type="button" class="animated-icon-btn" onclick="closeAddSchoolModal()">
          <i data-lucide="x" style="width: 16px; height: 16px;"></i>
        </button>
      </div>

      <form onsubmit="handleAddSchoolSubmit(event)" style="display: flex; flex-direction: column; gap: 1rem;">
        <div>
          <label class="form-label">School Name *</label>
          <input type="text" id="input-new-school-name" required placeholder="e.g. High Tech Academy" class="input-field" />
        </div>
        <div>
          <label class="form-label">Location / City *</label>
          <select id="input-new-school-location" required class="input-field">
            <option value="Addis Ababa">Addis Ababa</option>
            <option value="Adama">Adama</option>
            <option value="Harar">Harar</option>
          </select>
        </div>

        <div style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 1rem;">
          <button type="button" class="btn-ghost" onclick="closeAddSchoolModal()">Cancel</button>
          <button type="submit" class="btn-lime">Add School</button>
        </div>
      </form>
    </div>
  </div>

  <!-- ============================================================= -->
  <!-- MODAL 6: ADD LOCATION MODAL                                   -->
  <!-- ============================================================= -->
  <div id="modal-add-location" class="modal-overlay">
    <div class="modal-box" style="max-width: 440px;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem;">
        <h2 style="font-family: 'Outfit'; font-size: 1.25rem; font-weight: 900; color: #f2f7f4;">
          Add Location / Regional Hub
        </h2>
        <button type="button" class="animated-icon-btn" onclick="closeAddLocationModal()">
          <i data-lucide="x" style="width: 16px; height: 16px;"></i>
        </button>
      </div>

      <form onsubmit="handleAddLocationSubmit(event)" style="display: flex; flex-direction: column; gap: 1rem;">
        <div>
          <label class="form-label">City / Region Name *</label>
          <input type="text" id="input-new-location-name" required placeholder="e.g. Dire Dawa" class="input-field" />
        </div>

        <div style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 1rem;">
          <button type="button" class="btn-ghost" onclick="closeAddLocationModal()">Cancel</button>
          <button type="submit" class="btn-lime">Add Location</button>
        </div>
      </form>
    </div>
  </div>

  <!-- ============================================================= -->
  <!-- MODAL 7: ADD USER / OPERATOR ACCOUNT                          -->
  <!-- ============================================================= -->
  <div id="modal-add-user" class="modal-overlay">
    <div class="modal-box" style="max-width: 500px;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem;">
        <h2 style="font-family: 'Outfit'; font-size: 1.25rem; font-weight: 900; color: #f2f7f4;">
          Provision Operator Account
        </h2>
        <button type="button" class="animated-icon-btn" onclick="closeAddUserModal()">
          <i data-lucide="x" style="width: 16px; height: 16px;"></i>
        </button>
      </div>

      <form onsubmit="handleAddUserSubmit(event)" style="display: flex; flex-direction: column; gap: 1rem;">
        <div>
          <label class="form-label">Username *</label>
          <input type="text" id="user-input-username" required placeholder="e.g. operator1" class="input-field" />
        </div>
        <div>
          <label class="form-label">Email Address *</label>
          <input type="email" id="user-input-email" required placeholder="operator1@gmail.com" class="input-field" />
        </div>
        <div>
          <label class="form-label">Password *</label>
          <input type="password" id="user-input-password" required value="password123" class="input-field" />
        </div>
        <div>
          <label class="form-label">Assigned Station Role *</label>
          <select id="user-input-role" required class="input-field">
            <option value="SENDER">Sender Station</option>
            <option value="RECEIVER">Receiver Station</option>
            <option value="ADMIN">Admin Station</option>
            <option value="SUPER_ADMIN">Super Admin Station</option>
          </select>
        </div>

        <div style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 1rem;">
          <button type="button" class="btn-ghost" onclick="closeAddUserModal()">Cancel</button>
          <button type="submit" class="btn-lime">Provision Account</button>
        </div>
      </form>
    </div>
  </div>

  <!-- ============================================================= -->
  <!-- MODAL 8: EDIT STUDENT MODAL                                   -->
  <!-- ============================================================= -->
  <div id="modal-edit-student" class="modal-overlay">
    <div class="modal-box" style="max-width: 550px;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem;">
        <h2 style="font-family: 'Outfit'; font-size: 1.25rem; font-weight: 900; color: #f2f7f4;">
          Edit Student Record
        </h2>
        <button type="button" class="animated-icon-btn" onclick="closeEditStudentModal()">
          <i data-lucide="x" style="width: 16px; height: 16px;"></i>
        </button>
      </div>

      <form onsubmit="handleEditStudentSubmit(event)" style="display: flex; flex-direction: column; gap: 1rem;">
        <input type="hidden" id="edit-student-id-hidden" />
        
        <div>
          <label class="form-label">Full Name *</label>
          <input type="text" id="edit-fullname" required class="input-field" onblur="autoCapitalizeName(this)" />
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
          <div>
            <label class="form-label">Sex</label>
            <select id="edit-sex" class="input-field">
              <option value="Female">Female</option>
              <option value="Male">Male</option>
            </select>
          </div>
          <div>
            <label class="form-label">Grade</label>
            <input type="text" id="edit-grade" class="input-field" />
          </div>
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
          <div>
            <label class="form-label">School</label>
            <input type="text" id="edit-school" class="input-field" />
          </div>
          <div>
            <label class="form-label">Phone</label>
            <input type="text" id="edit-phone" class="input-field" oninput="handlePhoneAutoFormat(this)" />
          </div>
        </div>

        <div style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 1rem;">
          <button type="button" class="btn-ghost" onclick="closeEditStudentModal()">Cancel</button>
          <button type="submit" class="btn-lime">Save Changes</button>
        </div>
      </form>
    </div>
  </div>
`;
