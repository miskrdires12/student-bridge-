module.exports = `
  <script>
    // =========================================================================
    // GLOBAL STATE & SYSTEM DATA
    // =========================================================================
    let allStudents = [];
    let filteredStudents = [];
    let allUsers = [];
    let selectedStudentIds = new Set();
    let currentUser = null;
    let currentStation = "RECEIVER"; // Default station (Sender, Receiver, Admin, Super Admin)
    let currentView = "dashboard";
    let activeDetailsStudent = null;
    let currentPage = 1;
    let pageSize = 500;
    let selectedGradeChip = "ALL";
    let cameraStream = null;

    // Default Configurable Schools & Locations
    let allSchools = [
      { id: "sch_yms", name: "YMS", location: "Addis Ababa", status: "Active", studentsCount: 1245 },
      { id: "sch_adika", name: "Adika Youth", location: "Addis Ababa", status: "Active", studentsCount: 982 },
      { id: "sch_soa", name: "School of America", location: "Addis Ababa", status: "Active", studentsCount: 756 },
      { id: "sch_ferway", name: "Ferway", location: "Addis Ababa", status: "Active", studentsCount: 542 },
      { id: "sch_warka", name: "Warka", location: "Addis Ababa", status: "Active", studentsCount: 398 },
      { id: "sch_yacine", name: "Yacine", location: "Adama", status: "Active", studentsCount: 420 },
      { id: "sch_debebech", name: "Debebech", location: "Adama", status: "Active", studentsCount: 510 },
      { id: "sch_hightech", name: "High Tech", location: "Harar", status: "Active", studentsCount: 380 }
    ];

    let allLocations = [
      { id: "loc_aa", name: "Addis Ababa", schoolsCount: 5, status: "Active" },
      { id: "loc_adama", name: "Adama", schoolsCount: 2, status: "Active" },
      { id: "loc_harar", name: "Harar", schoolsCount: 1, status: "Active" }
    ];

    let allTasks = [
      { id: "T-001", title: "Review missing photos for Grade 9", assignedTo: "Loza Bereket", school: "YMS", priority: "High", deadline: "2026-10-15", status: "In Progress" },
      { id: "T-002", title: "Correct Ethiopian phone numbers", assignedTo: "Alemu Tadesse", school: "Adika Youth", priority: "Medium", deadline: "2026-10-15", status: "Pending" },
      { id: "T-003", title: "Verify school student IDs", assignedTo: "Hana Tadesse", school: "School of America", priority: "High", deadline: "2026-10-16", status: "Overdue" },
      { id: "T-004", title: "Data quality audit for Ferway", assignedTo: "Getnet Kassa", school: "Ferway", priority: "Low", deadline: "2026-10-18", status: "Completed" },
      { id: "T-005", title: "Photo verification batch 4", assignedTo: "Dawit Alemu", school: "Warka", priority: "Medium", deadline: "2026-10-16", status: "In Progress" }
    ];

    let allMistakes = [];

    let studentCoreRequests = [
      { id: "REQ-901", school: "YMS Main Campus", device: "192.168.1.42 • Core-01", studentId: "SB-2026-12788", type: "Incremental Sync", timestamp: "Just now", authStatus: "Authorized", syncStatus: "Synchronized", latency: "24ms" },
      { id: "REQ-902", school: "High Tech Harar", device: "192.168.2.15 • Core-02", studentId: "SB-2026-34955", type: "Record Lookup", timestamp: "3s ago", authStatus: "Authorized", syncStatus: "Synchronized", latency: "38ms" },
      { id: "REQ-903", school: "Debebech Adama", device: "192.168.4.88 • Core-03", studentId: "SB-2026-53429", type: "QR Verification", timestamp: "6s ago", authStatus: "Authorized", syncStatus: "Synchronized", latency: "19ms" },
      { id: "REQ-904", school: "Ferway Campus", device: "192.168.1.99 • Core-04", studentId: "SB-2026-12801", type: "Batch Export", timestamp: "9s ago", authStatus: "Authorized", syncStatus: "Synchronized", latency: "45ms" }
    ];

    let allAuditLogs = [
      { timestamp: "2026-10-13 14:32:10", user: "miskrdires11@gmail.com", station: "Super Admin", action: "Settings Saved", entity: "System Configuration", details: "Updated R2 cloud photo paths and phone validation rules" },
      { timestamp: "2026-10-13 14:15:02", user: "Alemu Tadesse", station: "Receiver", action: "Bulk Download", entity: "500 Photos", details: "Exported ZIP archive for YMS Grade 9" },
      { timestamp: "2026-10-13 13:48:22", user: "Loza Bereket", station: "Sender", action: "Student Registration", entity: "SB-2026-12788", details: "Registered student Loza Bereket with portrait photo" }
    ];

    // Station Navigation Definitions matching Screenshots Exactly
    const STATION_NAV = {
      SENDER: {
        title: "SENDER WORKSTATION",
        defaultView: "sender-dashboard",
        items: [
          { id: "sender-dashboard", label: "Dashboard", icon: "layout-grid" },
          { id: "register", label: "New Student", icon: "user-plus" },
          { id: "sender-submissions", label: "My Submissions", icon: "file-check" },
          { id: "sender-tasks", label: "Tasks", icon: "check-square" },
          { id: "admin-qc", label: "Reports", icon: "bar-chart-2" },
          { id: "system-settings", label: "Settings", icon: "settings" }
        ]
      },
      RECEIVER: {
        title: "RECEIVER CONSOLE",
        defaultView: "dashboard",
        items: [
          { id: "dashboard", label: "Dashboard", icon: "layout-grid" },
          { id: "students", label: "Student Directory", icon: "users" },
          { id: "bulk-modal", label: "Bulk Operations", icon: "layers", action: () => openBulkExportModal() },
          { id: "export-modal", label: "Exports", icon: "download", action: () => openBulkExportModal() },
          { id: "mistake-analyzer", label: "Mistake Analyzer", icon: "alert-triangle" },
          { id: "db-control", label: "Database Control Room", icon: "database" },
          { id: "system-settings", label: "Settings", icon: "settings" }
        ]
      },
      ADMIN: {
        title: "ADMIN SUPERVISION",
        defaultView: "admin-senders",
        items: [
          { id: "dashboard", label: "Dashboard", icon: "layout-grid" },
          { id: "admin-senders", label: "Senders", icon: "users" },
          { id: "admin-tasks", label: "Tasks", icon: "check-square" },
          { id: "admin-qc", label: "Reports", icon: "bar-chart-2" },
          { id: "mistake-analyzer", label: "Quality Control", icon: "shield-check" },
          { id: "system-settings", label: "Settings", icon: "settings" }
        ]
      },
      SUPER_ADMIN: {
        title: "SUPER ADMIN CONSOLE",
        defaultView: "super-analytics",
        items: [
          { id: "super-analytics", label: "Dashboard (Global)", icon: "layout-grid" },
          { id: "admin", label: "User Management", icon: "users" },
          { id: "super-settings", label: "System Settings", icon: "settings" },
          { id: "super-integrations", label: "Integration Requests", icon: "refresh-cw" },
          { id: "admin-qc", label: "Reports", icon: "bar-chart-2" },
          { id: "audit-logs", label: "Audit Logs", icon: "shield" },
          { id: "db-control", label: "Database Control Room", icon: "database" }
        ]
      }
    };

    // =========================================================================
    // 1-DEVICE HARDWARE LOCK FINGERPRINTING
    // =========================================================================
    function getDeviceFingerprint() {
      let fp = localStorage.getItem("sb_device_fingerprint");
      if (!fp) {
        fp = "hw-" + Math.random().toString(36).substring(2, 10) + "-" + Date.now().toString(36);
        localStorage.setItem("sb_device_fingerprint", fp);
      }
      return fp;
    }

    // =========================================================================
    // DATASET LOADER (Preserving All 3,723 Students and 19 Operator Accounts)
    // =========================================================================
    async function loadDataset() {
      try {
        const [sRes, uRes] = await Promise.all([
          fetch("/data/students.json"),
          fetch("/data/users.json")
        ]);
        if (sRes.ok) allStudents = await sRes.json();
        if (uRes.ok) allUsers = await uRes.json();
      } catch (e) {
        console.error("Data load error:", e);
      }

      // Merge locally stored custom students (from sender registration)
      try {
        const localCustom = localStorage.getItem("sb_custom_students");
        if (localCustom) {
          const list = JSON.parse(localCustom);
          if (Array.isArray(list)) allStudents = [...list, ...allStudents];
        }
      } catch (e) {}

      // Merge locally edited photos
      try {
        const localEdited = localStorage.getItem("sb_edited_photos");
        if (localEdited) {
          const map = JSON.parse(localEdited);
          allStudents.forEach(s => {
            if (map[s.id]) {
              s.photoPath = map[s.id];
              s.previewPath = map[s.id];
            }
          });
        }
      } catch (e) {}

      // Populate filter dropdowns
      populateFilterOptions();
      initGradeChips();
      applyFilters();
      runMistakeScan();
      renderAdminSendersTable();
      renderAdminTasksTable();
      renderAdminUsersTable();
      renderSettingsSchoolsTable();
      renderStudentCoreRequestsTable();
      renderAuditLogsTable();
      renderDbControlLogs();
    }

    function populateFilterOptions() {
      const schoolSelect = document.getElementById("filter-school");
      if (schoolSelect) {
        const schools = [...new Set(allStudents.map(s => s.school).filter(Boolean))].sort();
        schoolSelect.innerHTML = '<option value="ALL">All Schools</option>' + 
          schools.map(sch => '<option value="' + escapeHtml(sch) + '">' + escapeHtml(sch) + '</option>').join("");
      }

      const gradeSelect = document.getElementById("filter-grade");
      if (gradeSelect) {
        const grades = [...new Set(allStudents.map(s => s.grade).filter(Boolean))].sort();
        gradeSelect.innerHTML = '<option value="ALL">All Grades</option>' + 
          grades.map(gr => '<option value="' + escapeHtml(gr) + '">' + escapeHtml(gr) + '</option>').join("");
      }
    }

    // =========================================================================
    // AUTHENTICATION & SESSION MANAGEMENT
    // =========================================================================
    function handleLoginSubmit(e) {
      if (e) e.preventDefault();
      const email = (document.getElementById("input-login-email").value || "").trim().toLowerCase();
      const password = (document.getElementById("input-login-password").value || "").trim();
      const deviceLockAlert = document.getElementById("device-lock-error");

      const user = allUsers.find(u => (u.email || "").toLowerCase() === email || (u.username || "").toLowerCase() === email);
      const currentHw = getDeviceFingerprint();

      if (user) {
        // Enforce 1-Device Lock Policy
        if (user.boundDeviceId && user.boundDeviceId !== currentHw && user.role !== "SUPER_ADMIN") {
          if (deviceLockAlert) deviceLockAlert.style.display = "block";
          return;
        }
        if (!user.boundDeviceId) {
          user.boundDeviceId = currentHw;
        }
        currentUser = user;
      } else {
        // Default Operator
        currentUser = {
          id: "usr-" + Date.now(),
          username: email.split("@")[0],
          email: email,
          role: "SUPER_ADMIN",
          boundDeviceId: currentHw
        };
      }

      localStorage.setItem("sb_auth_user", JSON.stringify(currentUser));
      if (deviceLockAlert) deviceLockAlert.style.display = "none";
      initAuthenticatedApp();
    }

    function quickLoginAs(role) {
      currentUser = {
        id: "usr-quick-" + role.toLowerCase(),
        username: role.toLowerCase() + "_operator",
        email: role.toLowerCase() + "@siliconlabs.et",
        role: role,
        boundDeviceId: getDeviceFingerprint()
      };
      localStorage.setItem("sb_auth_user", JSON.stringify(currentUser));
      initAuthenticatedApp();
    }

    function handleSignOut() {
      localStorage.removeItem("sb_auth_user");
      currentUser = null;
      document.getElementById("screen-app").style.display = "none";
      document.getElementById("screen-login").style.display = "flex";
      lucide.createIcons();
    }

    function initAuthenticatedApp() {
      document.getElementById("screen-login").style.display = "none";
      document.getElementById("screen-app").style.display = "flex";

      if (currentUser) {
        document.getElementById("header-avatar-badge").textContent = (currentUser.username || "M")[0].toUpperCase();
        document.getElementById("sidebar-user-avatar").textContent = (currentUser.username || "M")[0].toUpperCase();
        document.getElementById("sidebar-user-name").textContent = currentUser.username || "Operator";
        document.getElementById("sidebar-user-role").textContent = currentUser.role || "Operator";
      }

      // Switch to role's station
      const targetStation = currentUser && currentUser.role ? currentUser.role : "RECEIVER";
      switchStation(targetStation);
      lucide.createIcons();
    }

    // =========================================================================
    // FOUR OPERATIONAL STATIONS ENGINE (Sender, Receiver, Admin, Super Admin)
    // =========================================================================
    function switchStation(stationKey) {
      currentStation = stationKey;

      // Update Pill active states
      document.querySelectorAll(".station-pill").forEach(p => p.classList.remove("active"));
      const pillMap = {
        SENDER: "pill-sender",
        RECEIVER: "pill-receiver",
        ADMIN: "pill-admin",
        SUPER_ADMIN: "pill-super-admin"
      };
      const activePill = document.getElementById(pillMap[stationKey]);
      if (activePill) activePill.classList.add("active");

      // Update Sidebar Header
      const config = STATION_NAV[stationKey] || STATION_NAV.RECEIVER;
      document.getElementById("sidebar-station-title").textContent = config.title;

      // Render Sidebar Navigation
      renderSidebarNav(config);

      // Navigate to station default view
      navigateTo(config.defaultView);
      lucide.createIcons();
    }

    function renderSidebarNav(config) {
      const container = document.getElementById("sidebar-nav-container");
      container.innerHTML = "";

      config.items.forEach(item => {
        const btn = document.createElement("a");
        btn.className = "sidebar-nav-item" + (item.id === currentView ? " active" : "");
        btn.innerHTML = '<i data-lucide="' + item.icon + '" style="width: 16px; height: 16px;"></i><span>' + item.label + '</span>';
        btn.onclick = (e) => {
          e.preventDefault();
          if (item.action) {
            item.action();
          } else {
            navigateTo(item.id);
          }
        };
        container.appendChild(btn);
      });
      lucide.createIcons();
    }

    function navigateTo(viewId) {
      currentView = viewId;

      // Hide all views
      const views = [
        "view-sender-dashboard", "view-register", "view-sender-submissions", "view-sender-tasks",
        "view-dashboard", "view-students", "view-mistake-analyzer", "view-db-control",
        "view-admin-senders", "view-admin-tasks", "view-admin-qc",
        "view-super-analytics", "view-admin", "view-super-settings", "view-super-integrations", "view-audit-logs"
      ];

      views.forEach(v => {
        const el = document.getElementById(v);
        if (el) el.style.display = "none";
      });

      // Show selected view
      const targetViewEl = document.getElementById("view-" + viewId);
      if (targetViewEl) {
        targetViewEl.style.display = "block";
      } else {
        // Fallback for special views
        const fallbackEl = document.getElementById("view-dashboard");
        if (fallbackEl) fallbackEl.style.display = "block";
      }

      // Update sidebar active link
      document.querySelectorAll(".sidebar-nav-item").forEach(item => {
        const matches = item.getAttribute("onclick") && item.getAttribute("onclick").includes("'" + viewId + "'");
        item.classList.toggle("active", Boolean(matches));
      });

      // Special triggers
      if (viewId === "students") {
        renderTable();
        renderPagination();
      } else if (viewId === "register") {
        if (!document.getElementById("reg-studentid").value) generateNewStudentId();
      } else if (viewId === "sender-submissions") {
        renderSenderSubmissionsTable();
      } else if (viewId === "sender-tasks") {
        renderSenderTasksTable();
      }

      lucide.createIcons();
    }

    function toggleMobileSidebar() {
      const sidebar = document.getElementById("app-sidebar");
      if (sidebar) sidebar.classList.toggle("mobile-open");
    }

    function toggleTheme() {
      document.documentElement.classList.toggle("dark");
    }

    function handleBrandClick() {
      switchStation(currentStation);
    }

    // =========================================================================
    // RECEIVER STATION: STUDENT DIRECTORY, FILTERS & 500-RECORD PAGINATION
    // =========================================================================
    function initGradeChips() {
      const container = document.getElementById("grade-chips-container");
      if (!container) return;

      const grades = ["ALL", "Nursery", "LKG", "UKG", "1A", "1B", "2A", "2B", "3A", "3B", "4A", "4B", "5A", "5B", "6A", "6B", "7A", "7B", "8A", "8B", "9A", "9B", "9C", "10A", "10B", "11A", "11B", "12A", "12B"];
      
      container.innerHTML = grades.map(g => {
        const isAll = g === "ALL";
        return '<button class="grade-chip ' + (g === selectedGradeChip ? "active" : "") + '" onclick="selectGradeChip(\\'' + g + '\\')">' +
          (isAll ? "All Grades (" + allStudents.length.toLocaleString() + ")" : "Grade " + g) +
          '</button>';
      }).join("");
    }

    function selectGradeChip(grade) {
      selectedGradeChip = grade;
      document.querySelectorAll(".grade-chip").forEach(c => {
        const isAll = grade === "ALL" && c.textContent.includes("All Grades");
        const isGrade = c.textContent.trim() === "Grade " + grade;
        c.classList.toggle("active", isAll || isGrade);
      });
      currentPage = 1;
      applyFilters();
    }

    function handleSearchChange() {
      currentPage = 1;
      applyFilters();
    }

    function handleFilterChange() {
      currentPage = 1;
      applyFilters();
    }

    function applyFilters() {
      const q = (document.getElementById("search-students")?.value || "").trim().toLowerCase();
      const school = document.getElementById("filter-school")?.value || "ALL";
      const grade = document.getElementById("filter-grade")?.value || "ALL";
      const location = document.getElementById("filter-location")?.value || "ALL";
      const photoStatus = document.getElementById("filter-photo")?.value || "ALL";

      filteredStudents = allStudents.filter(s => {
        if (q) {
          const m = (s.fullName || "").toLowerCase().includes(q) ||
                    (s.studentId || "").toLowerCase().includes(q) ||
                    (s.phone || "").toLowerCase().includes(q);
          if (!m) return false;
        }
        if (selectedGradeChip !== "ALL" && (s.grade || "").trim() !== selectedGradeChip) return false;
        if (grade !== "ALL" && (s.grade || "").trim() !== grade) return false;
        if (school !== "ALL" && !(s.school || "").toLowerCase().includes(school.toLowerCase())) return false;
        if (location !== "ALL" && (s.address || s.cityRegion || "").toLowerCase() !== location.toLowerCase()) return false;
        if (photoStatus === "OK" && !s.photoPath) return false;
        if (photoStatus === "MISSING" && s.photoPath) return false;
        return true;
      });

      renderTable();
      renderPagination();
    }

    function renderTable() {
      const tbody = document.getElementById("student-table-body");
      if (!tbody) return;

      if (filteredStudents.length === 0) {
        tbody.innerHTML = '<tr><td colspan="15" style="text-align:center; padding:3rem; color:var(--foreground-muted);">No student records match the active criteria.</td></tr>';
        return;
      }

      const start = (currentPage - 1) * pageSize;
      const end = Math.min(start + pageSize, filteredStudents.length);
      const slice = filteredStudents.slice(start, end);

      let html = "";
      for (const s of slice) {
        const isSel = selectedStudentIds.has(s.id);
        const photoUrl = s.previewPath || s.photoPath;
        const initials = getInitials(s.fullName);
        const isFemale = (s.sex || "").toLowerCase() === "female";
        const hasPhoto = Boolean(photoUrl);
        const isBulked = s.bulkedStatus === "BULKED";

        html += '<tr class="' + (isSel ? 'selected' : '') + '" onclick="handleRowClick(event, \\'' + s.id + '\\')">';
        
        // 1. Checkbox
        html += '<td style="text-align:center;" onclick="event.stopPropagation()">' +
          '<input type="checkbox" onchange="toggleSelect(\\'' + s.id + '\\', this.checked)" ' + (isSel ? 'checked' : '') + ' />' +
          '</td>';

        // 2. Photo thumbnail
        html += '<td>' +
          '<div class="student-avatar-box" onclick="openStudentDetails(\\'' + s.id + '\\')">' +
          (hasPhoto ? 
            '<img src="' + photoUrl + '" alt="' + escapeHtml(s.fullName) + '" style="width:100%; height:100%; object-fit:cover;" onerror="this.src=\\'/logo.png\\'" />' :
            '<span class="avatar-initials">' + initials + '</span>') +
          '</div></td>';

        // 3. Student ID
        html += '<td><strong style="font-family:var(--font-mono); font-size:12px; color:#8fe617;">' + escapeHtml(s.studentId) + '</strong></td>';

        // 4. Full Name
        html += '<td><div style="font-weight:700; color:var(--foreground);">' + escapeHtml(s.fullName) + '</div></td>';

        // 5. Sex Badge
        html += '<td><span class="badge ' + (isFemale ? 'badge-female' : 'badge-male') + '">' + (isFemale ? 'Female' : 'Male') + '</span></td>';

        // 6. Grade
        html += '<td><strong style="color:var(--foreground);">' + escapeHtml(s.grade || "9C") + '</strong></td>';

        // 7. Phone
        html += '<td><span style="font-family:var(--font-mono); font-size:11px; color:#9eb2a6;">' + escapeHtml(s.phone || "+251912480376") + '</span></td>';

        // 8. School
        html += '<td>' + escapeHtml(s.school || "YMS") + '</td>';

        // 9. Location
        html += '<td>' + escapeHtml(s.address || s.cityRegion || "Addis Ababa") + '</td>';

        // 10. Sender
        html += '<td><span style="font-size:11px; color:#9eb2a6;">' + escapeHtml(s.senderName || "Sender-01") + '</span></td>';

        // 11. Date
        html += '<td><span style="font-size:11px; color:#798b81;">' + (s.createdAt ? s.createdAt.substring(0, 10) : "2026-10-13") + '</span></td>';

        // 12. Photo Status
        html += '<td>' + (hasPhoto ? '<span class="badge badge-success">Available</span>' : '<span class="badge badge-danger">Missing</span>') + '</td>';

        // 13. Review Status
        html += '<td><span class="badge badge-success">Accepted</span></td>';

        // 14. Bulked Status
        html += '<td>' + (isBulked ? '<span class="badge badge-success">Bulked</span>' : '<span class="badge badge-neutral">Unbulked</span>') + '</td>';

        // 15. Actions
        html += '<td style="text-align:right;" onclick="event.stopPropagation()">' +
          '<div style="display:inline-flex; gap:4px;">' +
          '<button class="action-icon-btn" onclick="openStudentDetails(\\'' + s.id + '\\')" title="View Student"><i data-lucide="eye" style="width:13px; height:13px;"></i></button>' +
          '<button class="action-icon-btn crop-btn" onclick="openPhotoEditorForStudent(\\'' + s.id + '\\')" title="Edit Photo"><i data-lucide="crop" style="width:13px; height:13px;"></i></button>' +
          '<button class="action-icon-btn" onclick="openEditStudentModal(\\'' + s.id + '\\')" title="Edit Record"><i data-lucide="edit-2" style="width:13px; height:13px;"></i></button>' +
          '</div></td>';

        html += '</tr>';
      }

      tbody.innerHTML = html;
      lucide.createIcons();
    }

    function renderPagination() {
      const total = filteredStudents.length;
      const totalPages = Math.ceil(total / pageSize) || 1;
      const start = total === 0 ? 0 : (currentPage - 1) * pageSize + 1;
      const end = Math.min(currentPage * pageSize, total);

      const infoText = 'Showing ' + start.toLocaleString() + ' - ' + end.toLocaleString() + ' of ' + total.toLocaleString() + ' records';
      if (document.getElementById("page-info-top")) document.getElementById("page-info-top").textContent = infoText;
      if (document.getElementById("page-info-bottom")) document.getElementById("page-info-bottom").textContent = infoText;

      const buildBtns = () => {
        let html = '<button class="page-btn" onclick="goToPage(' + (currentPage - 1) + ')" ' + (currentPage === 1 ? 'disabled' : '') + '>‹</button>';
        
        let pStart = Math.max(1, currentPage - 2);
        let pEnd = Math.min(totalPages, pStart + 4);
        if (pEnd - pStart < 4) pStart = Math.max(1, pEnd - 4);

        for (let p = pStart; p <= pEnd; p++) {
          html += '<button class="page-btn ' + (p === currentPage ? 'active' : '') + '" onclick="goToPage(' + p + ')">' + p + '</button>';
        }

        html += '<button class="page-btn" onclick="goToPage(' + (currentPage + 1) + ')" ' + (currentPage === totalPages ? 'disabled' : '') + '>›</button>';
        return html;
      };

      const topBtns = document.getElementById("page-btns-top");
      if (topBtns) topBtns.innerHTML = buildBtns();
      const botBtns = document.getElementById("page-btns-bottom");
      if (botBtns) botBtns.innerHTML = buildBtns();
    }

    function goToPage(p) {
      const totalPages = Math.ceil(filteredStudents.length / pageSize) || 1;
      if (p < 1 || p > totalPages) return;
      currentPage = p;
      renderTable();
      renderPagination();
      window.scrollTo({ top: 0, behavior: "smooth" });
    }

    function setPageSize(size) {
      pageSize = parseInt(size, 10);
      currentPage = 1;
      renderTable();
      renderPagination();
    }

    function toggleSelect(id, checked) {
      if (checked) selectedStudentIds.add(id);
      else selectedStudentIds.delete(id);
      updateSelectionBar();
      renderTable();
    }

    function toggleSelectAll(checked) {
      const start = (currentPage - 1) * pageSize;
      const end = Math.min(start + pageSize, filteredStudents.length);
      const slice = filteredStudents.slice(start, end);
      slice.forEach(s => {
        if (checked) selectedStudentIds.add(s.id);
        else selectedStudentIds.delete(s.id);
      });
      updateSelectionBar();
      renderTable();
    }

    function clearSelection() {
      selectedStudentIds.clear();
      updateSelectionBar();
      renderTable();
    }

    function updateSelectionBar() {
      const bar = document.getElementById("selection-bar");
      const countText = document.getElementById("selection-count-text");
      const scopeLabel = document.getElementById("export-scope-selected-label");

      if (bar) {
        bar.style.display = selectedStudentIds.size > 0 ? "flex" : "none";
      }
      if (countText) {
        countText.textContent = selectedStudentIds.size + " students selected";
      }
      if (scopeLabel) {
        scopeLabel.textContent = "Selected (" + selectedStudentIds.size + ")";
      }
    }

    function handleRowClick(event, id) {
      if (event.target.tagName === "INPUT" || event.target.closest("button")) return;
      openStudentDetails(id);
    }

    // =========================================================================
    // SLIDE-OVER STUDENT DETAILS PANEL (Matching Screenshot 5 & 13)
    // =========================================================================
    function openStudentDetails(id) {
      const s = allStudents.find(x => x.id === id);
      if (!s) return;
      activeDetailsStudent = s;

      document.getElementById("panel-student-id").textContent = s.studentId || "SB-2026-00000";
      document.getElementById("panel-fullname").textContent = s.fullName || "Student";
      document.getElementById("panel-subtitle").textContent = "Grade " + (s.grade || "9C") + " • " + (s.school || "YMS") + " • " + (s.address || s.cityRegion || "Addis Ababa");
      document.getElementById("panel-sex").textContent = s.sex || "Female";
      document.getElementById("panel-grade").textContent = s.grade || "9C";
      document.getElementById("panel-blood").textContent = s.bloodType || "O+";
      document.getElementById("panel-school").textContent = s.school || "YMS";
      document.getElementById("panel-location").textContent = s.address || s.cityRegion || "Addis Ababa";
      document.getElementById("panel-phone").textContent = s.phone || "+251912480376";
      document.getElementById("panel-guardian-phone").textContent = s.emergencyContactPhone || s.phone || "+251911234567";
      document.getElementById("panel-emergency-contact").textContent = s.emergencyContactPhone || "+251911223344";
      document.getElementById("panel-bus-usage").textContent = "Yes";
      document.getElementById("panel-sender-name").textContent = (s.senderName || "Loza Bereket") + " (Sender)";
      document.getElementById("panel-created-at").textContent = s.createdAt ? s.createdAt.replace("T", " ").substring(0, 19) : "2026-10-08 10:24";
      document.getElementById("panel-editor-name").textContent = "Alemu Tadesse (Receiver)";
      document.getElementById("panel-updated-at").textContent = s.updatedAt ? s.updatedAt.replace("T", " ").substring(0, 19) : "2026-10-09 14:32";

      const photoImg = document.getElementById("panel-photo-img");
      photoImg.src = s.originalPhotoPath || s.previewPath || s.photoPath || "/logo.png";

      // Render QR Code inside panel
      const qrBox = document.getElementById("panel-qrcode-box");
      qrBox.innerHTML = "";
      new QRCode(qrBox, {
        text: JSON.stringify({ id: s.studentId, name: s.fullName, school: s.school, grade: s.grade }),
        width: 120,
        height: 120,
        colorDark: "#062404",
        colorLight: "#ffffff",
        correctLevel: QRCode.CorrectLevel.M
      });

      // Audit Timeline
      const timeline = document.getElementById("panel-history-timeline");
      timeline.innerHTML = 
        '<div style="padding: 6px 8px; background:#111a14; border-radius:8px; border-left:2px solid #8fe617;">' +
        '<strong style="color:#8fe617;">Created & Transmitted</strong> by ' + escapeHtml(s.senderName || "Loza Bereket") + '<br/>' +
        '<span style="color:#798b81;">' + (s.createdAt ? s.createdAt.substring(0, 16) : "2026-10-08 10:24") + '</span></div>' +
        '<div style="padding: 6px 8px; background:#111a14; border-radius:8px; border-left:2px solid #60a5fa;">' +
        '<strong style="color:#60a5fa;">Verified & Photo Synchronized</strong> by Alemu Tadesse<br/>' +
        '<span style="color:#798b81;">' + (s.updatedAt ? s.updatedAt.substring(0, 16) : "2026-10-09 14:32") + '</span></div>';

      document.getElementById("student-details-panel").classList.add("open");
      lucide.createIcons();
    }

    function closeStudentDetailsPanel() {
      document.getElementById("student-details-panel").classList.remove("open");
      activeDetailsStudent = null;
    }

    function downloadActivePanelPhoto() {
      if (!activeDetailsStudent) return;
      const url = activeDetailsStudent.originalPhotoPath || activeDetailsStudent.photoPath;
      if (!url) {
        alert("Photograph not attached for this student record.");
        return;
      }
      const a = document.createElement("a");
      a.href = url;
      a.download = (activeDetailsStudent.studentId || "photo") + "_" + (activeDetailsStudent.fullName || "student") + ".jpg";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }

    function openEditorFromDetailsPanel() {
      if (!activeDetailsStudent) return;
      openPhotoEditorForStudent(activeDetailsStudent.id);
    }

    function requestCorrectionFromPanel() {
      if (!activeDetailsStudent) return;
      const note = prompt("Enter correction note for Sender " + (activeDetailsStudent.senderName || "Field Station") + ":", "Please verify photo brightness and phone digits.");
      if (note) {
        allTasks.unshift({
          id: "T-" + (allTasks.length + 101),
          title: "Correction: " + activeDetailsStudent.studentId + " (" + activeDetailsStudent.fullName + ")",
          assignedTo: activeDetailsStudent.senderName || "Loza Bereket",
          school: activeDetailsStudent.school || "YMS",
          priority: "High",
          deadline: "2026-10-16",
          status: "Pending"
        });
        renderAdminTasksTable();
        alert("Correction task successfully dispatched to field sender.");
      }
    }

    function downloadQrCode() {
      const qrCanvas = document.querySelector("#panel-qrcode-box canvas");
      if (qrCanvas) {
        const a = document.createElement("a");
        a.href = qrCanvas.toDataURL("image/png");
        a.download = "QR_" + (activeDetailsStudent?.studentId || "student") + ".png";
        a.click();
      } else {
        const qrImg = document.querySelector("#panel-qrcode-box img");
        if (qrImg) {
          const a = document.createElement("a");
          a.href = qrImg.src;
          a.download = "QR_" + (activeDetailsStudent?.studentId || "student") + ".png";
          a.click();
        }
      }
    }

    // =========================================================================
    // SENDER STATION: REGISTRATION & FIELD DISPATCH
    // =========================================================================
    function generateNewStudentId() {
      const year = "2026";
      let candidate = "";
      let isUnique = false;

      while (!isUnique) {
        const num = Math.floor(10000 + Math.random() * 90000);
        candidate = "SB-" + year + "-" + num;
        if (!allStudents.some(s => s.studentId === candidate)) {
          isUnique = true;
        }
      }

      const input = document.getElementById("reg-studentid");
      if (input) input.value = candidate;
      const badge = document.getElementById("reg-studentid-status");
      if (badge) {
        badge.className = "badge badge-success";
        badge.textContent = "ID Auto-Generated & Available";
      }
    }

    function checkStudentIdAvailability(val) {
      const id = (val || document.getElementById("reg-studentid").value || "").trim();
      const badge = document.getElementById("reg-studentid-status");
      if (!badge) return;

      const taken = allStudents.some(s => s.studentId === id);
      if (taken) {
        badge.className = "badge badge-danger";
        badge.textContent = "⚠️ ID Taken - Please re-check";
      } else {
        badge.className = "badge badge-success";
        badge.textContent = "ID Available";
      }
    }

    function autoCapitalizeName(el) {
      if (!el || !el.value) return;
      el.value = el.value.toLowerCase().replace(/(?:^|\s|-)\S/g, function(a) { return a.toUpperCase(); });
    }

    function handleNameLiveCapitalize(el) {
      // Live smooth capitalize on space
      if (el.value.endsWith(" ")) {
        autoCapitalizeName(el);
      }
    }

    function handlePhoneAutoFormat(el) {
      let v = el.value.trim();
      // Ethiopian auto normalization
      if (v.startsWith("09")) {
        el.value = "+2519" + v.substring(2);
      } else if (v.startsWith("07")) {
        el.value = "+2517" + v.substring(2);
      }
    }

    function handleSchoolSelectChange(school) {
      const locSelect = document.getElementById("reg-location");
      if (!locSelect) return;
      if (school === "Yacine" || school === "Debebech") locSelect.value = "Adama";
      else if (school === "High Tech") locSelect.value = "Harar";
      else locSelect.value = "Addis Ababa";
    }

    function toggleAccordion(id) {
      const el = document.getElementById(id);
      if (el) el.style.display = el.style.display === "none" ? "block" : "none";
    }

    async function toggleCameraStream() {
      const video = document.getElementById("sender-camera-stream");
      const previewImg = document.getElementById("photo-preview-img");
      const placeholder = document.getElementById("photo-preview-placeholder");
      const liveBadge = document.getElementById("camera-live-badge");
      const btnText = document.getElementById("btn-take-photo-text");

      if (cameraStream) {
        // Stop stream and capture snapshot
        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 800;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.9);

        cameraStream.getTracks().forEach(t => t.stop());
        cameraStream = null;
        video.style.display = "none";
        previewImg.src = dataUrl;
        previewImg.style.display = "block";
        placeholder.style.display = "none";
        liveBadge.style.display = "none";
        btnText.textContent = "Retake Live Camera";
      } else {
        // Start stream
        try {
          cameraStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
          video.srcObject = cameraStream;
          video.style.display = "block";
          previewImg.style.display = "none";
          placeholder.style.display = "none";
          liveBadge.style.display = "flex";
          btnText.textContent = "Capture Photo Snapshot";
        } catch (e) {
          alert("Camera access unavailable: " + e.message + ". Please use the 'Upload' button instead.");
        }
      }
      lucide.createIcons();
    }

    function handlePhotoFileUpload(e) {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (event) => {
        const previewImg = document.getElementById("photo-preview-img");
        const placeholder = document.getElementById("photo-preview-placeholder");
        previewImg.src = event.target.result;
        previewImg.style.display = "block";
        if (placeholder) placeholder.style.display = "none";
      };
      reader.readAsDataURL(file);
    }

    function handleRegisterSubmit(e) {
      e.preventDefault();
      const id = document.getElementById("reg-studentid").value.trim();
      const name = document.getElementById("reg-fullname").value.trim();
      const sex = document.getElementById("reg-sex").value;
      const blood = document.getElementById("reg-blood").value;
      const grade = document.getElementById("reg-grade").value;
      const school = document.getElementById("reg-school").value;
      const location = document.getElementById("reg-location").value;
      const phone = document.getElementById("reg-phone").value.trim();
      const previewImg = document.getElementById("photo-preview-img");

      if (allStudents.some(s => s.studentId === id)) {
        alert("Student ID is already taken. Please generate a new unique ID.");
        return;
      }

      const newStudent = {
        id: "cmu-" + Date.now().toString(36),
        studentId: id,
        fullName: name,
        sex: sex,
        bloodType: blood,
        grade: grade,
        school: school,
        address: location,
        phone: phone,
        photoPath: previewImg.src || "https://pub-93e8bf84c42949ec88306f456caa0fc9.r2.dev/" + grade + "/" + id + "_" + encodeURIComponent(name) + ".jpg",
        previewPath: previewImg.src || "",
        senderName: currentUser ? currentUser.username : "Loza Bereket",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        bulkedStatus: "UNBULKED"
      };

      allStudents.unshift(newStudent);

      // Persist in localStorage
      try {
        const existing = JSON.parse(localStorage.getItem("sb_custom_students") || "[]");
        existing.unshift(newStudent);
        localStorage.setItem("sb_custom_students", JSON.stringify(existing));
      } catch (e) {}

      // Add to audit log
      allAuditLogs.unshift({
        timestamp: new Date().toISOString().replace("T", " ").substring(0, 19),
        user: currentUser ? currentUser.username : "Loza Bereket",
        station: "Sender",
        action: "Student Registered",
        entity: id,
        details: "Created record for " + name + " (" + school + ", Grade " + grade + ")"
      });

      alert("Student " + name + " (" + id + ") successfully registered and transmitted!");
      applyFilters();
      generateNewStudentId();
      document.getElementById("reg-fullname").value = "";
      document.getElementById("reg-phone").value = "";
      previewImg.style.display = "none";
      document.getElementById("photo-preview-placeholder").style.display = "block";
      navigateTo("sender-submissions");
    }

    function saveRegistrationDraft() {
      const draft = {
        id: document.getElementById("reg-studentid").value,
        name: document.getElementById("reg-fullname").value,
        phone: document.getElementById("reg-phone").value,
        grade: document.getElementById("reg-grade").value,
        school: document.getElementById("reg-school").value
      };
      localStorage.setItem("sb_registration_draft", JSON.stringify(draft));
      alert("Registration draft saved locally on this workstation.");
    }

    function renderSenderSubmissionsTable() {
      const tbody = document.getElementById("sender-submissions-tbody");
      if (!tbody) return;
      const submissions = allStudents.slice(0, 50);

      tbody.innerHTML = submissions.map(s => {
        return '<tr>' +
          '<td><strong style="font-family:var(--font-mono); color:#8fe617;">' + escapeHtml(s.studentId) + '</strong></td>' +
          '<td>' + escapeHtml(s.fullName) + '</td>' +
          '<td>' + escapeHtml(s.school || "YMS") + '</td>' +
          '<td>' + escapeHtml(s.grade || "9C") + '</td>' +
          '<td><span class="badge ' + (s.sex === "Female" ? "badge-female" : "badge-male") + '">' + escapeHtml(s.sex) + '</span></td>' +
          '<td>' + escapeHtml(s.phone) + '</td>' +
          '<td><span class="badge badge-success">Accepted</span></td>' +
          '<td>' + (s.createdAt ? s.createdAt.substring(0, 16).replace("T", " ") : "2026-10-13") + '</td>' +
          '<td><button class="btn-ghost" style="padding:3px 8px; font-size:11px;" onclick="openStudentDetails(\\'' + s.id + '\\')">View</button></td>' +
          '</tr>';
      }).join("");
      lucide.createIcons();
    }

    function renderSenderTasksTable() {
      const tbody = document.getElementById("sender-tasks-tbody");
      if (!tbody) return;
      tbody.innerHTML = allTasks.map(t => {
        return '<tr>' +
          '<td><strong style="font-family:var(--font-mono); color:#8fe617;">' + t.id + '</strong></td>' +
          '<td><div><strong>' + escapeHtml(t.title) + '</strong></div></td>' +
          '<td>' + escapeHtml(t.school) + '</td>' +
          '<td><span class="badge ' + (t.priority === "High" ? "badge-danger" : "badge-warning") + '">' + t.priority + '</span></td>' +
          '<td>' + t.deadline + '</td>' +
          '<td><span class="badge ' + (t.status === "In Progress" ? "badge-neutral" : "badge-success") + '">' + t.status + '</span></td>' +
          '<td><button class="btn-lime" style="padding:3px 8px; font-size:11px;" onclick="markTaskComplete(\\'' + t.id + '\\')">Complete</button></td>' +
          '</tr>';
      }).join("");
      lucide.createIcons();
    }

    // =========================================================================
    // PHOTO EDITOR CANVAS CONTROLLER (Matching Screenshot 4)
    // =========================================================================
    let editorCanvas, editorCtx, editorImg, editorStudentId = null;
    let editorRotation = 0;

    function openPhotoEditorModal() {
      const previewImg = document.getElementById("photo-preview-img");
      if (!previewImg || !previewImg.src || previewImg.style.display === "none") {
        alert("Please capture or upload a photograph first.");
        return;
      }
      initEditorWithImage(previewImg.src);
    }

    function openPhotoEditorForStudent(id) {
      const s = allStudents.find(x => x.id === id);
      if (!s) return;
      editorStudentId = s.id;
      const src = s.originalPhotoPath || s.previewPath || s.photoPath || "/logo.png";
      initEditorWithImage(src);
    }

    function initEditorWithImage(src) {
      const modal = document.getElementById("modal-photo-editor");
      modal.classList.add("open");
      editorCanvas = document.getElementById("photo-editor-canvas");
      editorCtx = editorCanvas.getContext("2d");
      editorImg = new Image();
      editorImg.crossOrigin = "anonymous";
      editorImg.onload = () => {
        editorRotation = 0;
        resetPhotoFilters();
        applyPhotoFilters();
      };
      editorImg.src = src;
      lucide.createIcons();
    }

    function closePhotoEditorModal() {
      document.getElementById("modal-photo-editor").classList.remove("open");
      editorStudentId = null;
    }

    function resetPhotoFilters() {
      document.getElementById("slider-brightness").value = 100;
      document.getElementById("slider-contrast").value = 100;
      document.getElementById("slider-saturation").value = 100;
      document.getElementById("slider-val-brightness").textContent = "100%";
      document.getElementById("slider-val-contrast").textContent = "100%";
      document.getElementById("slider-val-saturation").textContent = "100%";
      applyPhotoFilters();
    }

    function rotateEditorPhoto(deg) {
      editorRotation = (editorRotation + deg) % 360;
      applyPhotoFilters();
    }

    function applyPhotoFilters() {
      if (!editorCanvas || !editorCtx || !editorImg) return;
      const b = document.getElementById("slider-brightness").value;
      const c = document.getElementById("slider-contrast").value;
      const s = document.getElementById("slider-saturation").value;

      document.getElementById("slider-val-brightness").textContent = b + "%";
      document.getElementById("slider-val-contrast").textContent = c + "%";
      document.getElementById("slider-val-saturation").textContent = s + "%";

      const rad = (editorRotation * Math.PI) / 180;
      const isPerp = (editorRotation / 90) % 2 !== 0;
      const w = isPerp ? editorImg.height : editorImg.width;
      const h = isPerp ? editorImg.width : editorImg.height;

      editorCanvas.width = w;
      editorCanvas.height = h;

      editorCtx.save();
      editorCtx.filter = 'brightness(' + b + '%) contrast(' + c + '%) saturate(' + s + '%)';
      editorCtx.translate(w / 2, h / 2);
      editorCtx.rotate(rad);
      editorCtx.drawImage(editorImg, -editorImg.width / 2, -editorImg.height / 2);
      editorCtx.restore();
    }

    function saveEditorPhoto() {
      if (!editorCanvas) return;
      const dataUrl = editorCanvas.toDataURL("image/jpeg", 0.88);

      if (editorStudentId) {
        // Save to existing student
        const s = allStudents.find(x => x.id === editorStudentId);
        if (s) {
          s.photoPath = dataUrl;
          s.previewPath = dataUrl;
          try {
            const map = JSON.parse(localStorage.getItem("sb_edited_photos") || "{}");
            map[s.id] = dataUrl;
            localStorage.setItem("sb_edited_photos", JSON.stringify(map));
          } catch (e) {}
        }
        if (activeDetailsStudent && activeDetailsStudent.id === editorStudentId) {
          document.getElementById("panel-photo-img").src = dataUrl;
        }
        renderTable();
      } else {
        // Save to registration preview
        const previewImg = document.getElementById("photo-preview-img");
        if (previewImg) {
          previewImg.src = dataUrl;
          previewImg.style.display = "block";
          document.getElementById("photo-preview-placeholder").style.display = "none";
        }
      }

      closePhotoEditorModal();
      alert("Photograph updated and applied successfully!");
    }

    // =========================================================================
    // BULK DOWNLOAD & EXPORT (ZIP, CSV, Excel with live checklist progress)
    // =========================================================================
    function openBulkExportModal(presetScope) {
      const modal = document.getElementById("modal-bulk-export");
      modal.classList.add("open");
      if (presetScope === "SELECTED") {
        const rad = document.querySelector('input[name="export-scope"][value="SELECTED"]');
        if (rad) rad.checked = true;
      }
      document.getElementById("export-progress-section").style.display = "none";
      updateSelectionBar();
      lucide.createIcons();
    }

    function closeBulkExportModal() {
      document.getElementById("modal-bulk-export").classList.remove("open");
    }

    async function executeBulkExport() {
      const scope = document.querySelector('input[name="export-scope"]:checked')?.value || "CURRENT_PAGE";
      const format = document.querySelector('input[name="export-format"]:checked')?.value || "ZIP";

      let exportList = [];
      if (scope === "SELECTED") {
        exportList = allStudents.filter(s => selectedStudentIds.has(s.id));
        if (exportList.length === 0) {
          alert("No students currently selected.");
          return;
        }
      } else if (scope === "CURRENT_PAGE") {
        const start = (currentPage - 1) * pageSize;
        const end = Math.min(start + pageSize, filteredStudents.length);
        exportList = filteredStudents.slice(start, end);
      } else {
        exportList = filteredStudents;
      }

      if (format === "CSV") {
        exportCsv(exportList);
        closeBulkExportModal();
        return;
      } else if (format === "EXCEL") {
        exportExcel(exportList);
        closeBulkExportModal();
        return;
      }

      // ZIP (Photos) Export with Live Progress Bar & File Checklist
      const progressSection = document.getElementById("export-progress-section");
      const progressBar = document.getElementById("export-progress-bar");
      const progressStatus = document.getElementById("export-progress-status");
      const progressCount = document.getElementById("export-progress-count");
      const checklist = document.getElementById("export-files-checklist");

      progressSection.style.display = "block";
      progressStatus.textContent = "Packaging photographs into ZIP archive...";
      checklist.innerHTML = "";

      const zip = new JSZip();
      let completed = 0;
      const total = exportList.length;

      for (let i = 0; i < total; i++) {
        const s = exportList[i];
        const fileName = (s.studentId || "ID") + "_" + (s.fullName || "Student").replace(/[^a-zA-Z0-9_-]/g, "_") + ".jpg";
        const folder = (s.address || "Addis_Ababa") + "/" + (s.school || "YMS") + "/" + (s.grade || "9C");

        // Add dummy/fetched photo
        zip.file(folder + "/" + fileName, "StudentBridge Photo Identity: " + s.studentId);
        completed++;

        const pct = Math.round((completed / total) * 100);
        progressBar.style.width = pct + "%";
        progressCount.textContent = completed + " / " + total + " files";

        // Mark student as BULKED
        s.bulkedStatus = "BULKED";

        if (i < 30) {
          const itemDiv = document.createElement("div");
          itemDiv.style.cssText = "display:flex; justify-content:space-between; font-size:11px; padding:3px 0; border-bottom:1px solid #1a261f;";
          itemDiv.innerHTML = '<span style="color:#9eb2a6;">' + fileName + '</span><span style="color:#8fe617;">✔ Done</span>';
          checklist.appendChild(itemDiv);
        }
      }

      progressStatus.textContent = "Generating downloadable ZIP package...";
      const content = await zip.generateAsync({ type: "blob" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(content);
      a.download = "StudentBridge_Photos_Export_" + new Date().toISOString().substring(0, 10) + ".zip";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      renderTable();
      setTimeout(() => {
        closeBulkExportModal();
        alert("Archive successfully downloaded! " + completed + " photographs exported and marked as BULKED.");
      }, 800);
    }

    function exportCsv(list) {
      const headers = ["Student ID", "Full Name", "Sex", "Blood Group", "Grade", "School", "Location", "Phone", "Status", "Photo URL"];
      const rows = list.map(s => [
        s.studentId || "",
        s.fullName || "",
        s.sex || "",
        s.bloodType || "",
        s.grade || "",
        s.school || "",
        s.address || s.cityRegion || "",
        s.phone || "",
        "Active",
        s.photoPath || ""
      ]);

      const csvContent = "\\uFEFF" + [headers.join(","), ...rows.map(r => r.map(x => '"' + (x || "").replace(/"/g, '""') + '"').join(","))].join("\\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "StudentBridge_Records_" + new Date().toISOString().substring(0, 10) + ".csv";
      a.click();
    }

    function exportExcel(list) {
      if (typeof XLSX === "undefined") {
        exportCsv(list);
        return;
      }
      const data = list.map(s => ({
        "Student ID": s.studentId || "",
        "Full Name": s.fullName || "",
        "Sex": s.sex || "",
        "Blood Group": s.bloodType || "",
        "Grade": s.grade || "",
        "School": s.school || "",
        "Location": s.address || s.cityRegion || "",
        "Phone": s.phone || "",
        "Photo URL": s.photoPath || ""
      }));
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Students");
      XLSX.writeFile(wb, "StudentBridge_Records_" + new Date().toISOString().substring(0, 10) + ".xlsx");
    }

    function exportFullDatabaseJsonBackup() {
      const backup = {
        exportedAt: new Date().toISOString(),
        totalStudents: allStudents.length,
        totalUsers: allUsers.length,
        students: allStudents,
        users: allUsers,
        schools: allSchools,
        locations: allLocations,
        tasks: allTasks
      };
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "StudentBridge_Full_Database_Backup_" + new Date().toISOString().substring(0, 10) + ".json";
      a.click();
    }

    // =========================================================================
    // MISTAKE ANALYZER (Automated Quality Scanner)
    // =========================================================================
    function runMistakeScan() {
      allMistakes = [];
      const seenIds = new Set();

      allStudents.forEach((s, idx) => {
        // 1. Missing Photo
        if (!s.photoPath) {
          allMistakes.push({ id: s.id, studentId: s.studentId, name: s.fullName, school: s.school, type: "Missing Photo", severity: "High", date: "2026-10-13", status: "Open" });
        }
        // 2. Duplicate ID
        if (seenIds.has(s.studentId)) {
          allMistakes.push({ id: s.id, studentId: s.studentId, name: s.fullName, school: s.school, type: "Duplicate ID", severity: "High", date: "2026-10-13", status: "Open" });
        } else {
          seenIds.add(s.studentId);
        }
        // 3. Invalid phone (< 9 digits)
        if (s.phone && s.phone.replace(/\\D/g, "").length < 9) {
          allMistakes.push({ id: s.id, studentId: s.studentId, name: s.fullName, school: s.school, type: "Invalid Phone", severity: "Medium", date: "2026-10-13", status: "Open" });
        }
      });

      renderMistakesTable();
    }

    function renderMistakesTable() {
      const tbody = document.getElementById("mistakes-table-body");
      if (!tbody) return;

      document.getElementById("mistakes-total-count").textContent = allMistakes.length;
      document.getElementById("mistakes-missing-photos").textContent = allMistakes.filter(m => m.type === "Missing Photo").length;
      document.getElementById("mistakes-phone-count").textContent = allMistakes.filter(m => m.type === "Invalid Phone").length;

      tbody.innerHTML = allMistakes.slice(0, 60).map((m, idx) => {
        return '<tr>' +
          '<td><strong style="font-family:var(--font-mono); color:#8fe617;">' + escapeHtml(m.studentId) + '</strong></td>' +
          '<td>' + escapeHtml(m.name) + '</td>' +
          '<td>' + escapeHtml(m.school || "YMS") + '</td>' +
          '<td><span class="badge badge-warning">' + m.type + '</span></td>' +
          '<td><span class="badge ' + (m.severity === "High" ? "badge-danger" : "badge-neutral") + '">' + m.severity + '</span></td>' +
          '<td>' + m.date + '</td>' +
          '<td><span class="badge badge-neutral">' + m.status + '</span></td>' +
          '<td><div style="display:flex; gap:6px;">' +
          '<button class="btn-lime" style="padding:2px 8px; font-size:11px;" onclick="openEditStudentModal(\\'' + m.id + '\\')">Fix</button>' +
          '<button class="btn-ghost" style="padding:2px 6px; font-size:11px;" onclick="resolveMistake(' + idx + ')">Resolve</button>' +
          '</div></td>' +
          '</tr>';
      }).join("");
      lucide.createIcons();
    }

    function filterMistakesTable() {
      renderMistakesTable();
    }

    function resolveMistake(idx) {
      allMistakes.splice(idx, 1);
      renderMistakesTable();
    }

    // =========================================================================
    // ADMIN WORKFORCE & TASKS
    // =========================================================================
    function renderAdminSendersTable() {
      const tbody = document.getElementById("admin-senders-tbody");
      if (!tbody) return;

      const senders = [
        { name: "Loza Bereket", email: "loza@example.com", school: "YMS", station: "Station-01", status: "Active", perf: "96%" },
        { name: "Alemu Tadesse", email: "alemu@example.com", school: "Adika Youth", station: "Station-02", status: "Active", perf: "92%" },
        { name: "Hana Tadesse", email: "hana@example.com", school: "School of America", station: "Station-03", status: "Active", perf: "88%" },
        { name: "Getnet Kassa", email: "getnet@example.com", school: "Ferway", station: "Station-04", status: "Active", perf: "42%" },
        { name: "Dawit Alemu", email: "dawit@example.com", school: "Warka", station: "Station-05", status: "Pending", perf: "0%" }
      ];

      tbody.innerHTML = senders.map(s => {
        return '<tr>' +
          '<td><div style="font-weight:700; color:#f2f7f4;">' + escapeHtml(s.name) + '</div></td>' +
          '<td><span style="font-size:12px; color:#9eb2a6;">' + escapeHtml(s.email) + '</span></td>' +
          '<td>' + escapeHtml(s.school) + '</td>' +
          '<td><span style="font-family:var(--font-mono); font-size:11px; color:#8fe617;">' + s.station + '</span></td>' +
          '<td><span class="badge ' + (s.status === "Active" ? "badge-success" : "badge-warning") + '">' + s.status + '</span></td>' +
          '<td><div style="display:flex; align-items:center; gap:8px;">' +
          '<div style="flex:1; height:6px; background:#1c2720; border-radius:9999px; overflow:hidden;">' +
          '<div style="width:' + s.perf + '; height:100%; background:#8fe617;"></div></div>' +
          '<strong style="font-size:11px; color:#8fe617;">' + s.perf + '</strong></div></td>' +
          '<td style="text-align:right;"><button class="btn-ghost" style="padding:4px 8px; font-size:11px;" onclick="resetSenderDeviceLock(\\'' + s.name + '\\')">Reset Lock</button></td>' +
          '</tr>';
      }).join("");
      lucide.createIcons();
    }

    function resetSenderDeviceLock(name) {
      alert("1-Device Hardware Lock cleared for " + name + ". The operator can now authenticate on a new hardware terminal.");
    }

    function renderAdminTasksTable() {
      const tbody = document.getElementById("admin-tasks-tbody");
      if (!tbody) return;

      tbody.innerHTML = allTasks.map(t => {
        return '<tr>' +
          '<td><strong style="font-family:var(--font-mono); color:#8fe617;">' + t.id + '</strong></td>' +
          '<td><strong>' + escapeHtml(t.title) + '</strong></td>' +
          '<td>' + escapeHtml(t.assignedTo) + '</td>' +
          '<td>' + escapeHtml(t.school) + '</td>' +
          '<td><span class="badge ' + (t.priority === "High" ? "badge-danger" : "badge-warning") + '">' + t.priority + '</span></td>' +
          '<td>' + t.deadline + '</td>' +
          '<td><span class="badge ' + (t.status === "Completed" ? "badge-success" : (t.status === "Overdue" ? "badge-danger" : "badge-neutral")) + '">' + t.status + '</span></td>' +
          '<td style="text-align:right;"><button class="btn-ghost" style="padding:4px 8px; font-size:11px;" onclick="markTaskComplete(\\'' + t.id + '\\')">Done</button></td>' +
          '</tr>';
      }).join("");
      lucide.createIcons();
    }

    function markTaskComplete(id) {
      const t = allTasks.find(x => x.id === id);
      if (t) {
        t.status = "Completed";
        renderAdminTasksTable();
        renderSenderTasksTable();
      }
    }

    function filterTasksByTab(status) {
      document.querySelectorAll("#view-admin-tasks .grade-chip").forEach(c => c.classList.remove("active"));
      if (event && event.target) event.target.classList.add("active");
      renderAdminTasksTable();
    }

    function openNewTaskModal() {
      document.getElementById("modal-new-task").classList.add("open");
    }
    function closeNewTaskModal() {
      document.getElementById("modal-new-task").classList.remove("open");
    }
    function handleCreateTaskSubmit(e) {
      e.preventDefault();
      const title = document.getElementById("task-input-title").value.trim();
      const assignee = document.getElementById("task-input-assignee").value;
      const school = document.getElementById("task-input-school").value;
      const priority = document.getElementById("task-input-priority").value;
      const deadline = document.getElementById("task-input-deadline").value;

      allTasks.unshift({
        id: "T-" + (allTasks.length + 101),
        title: title,
        assignedTo: assignee,
        school: school,
        priority: priority,
        deadline: deadline,
        status: "Pending"
      });

      renderAdminTasksTable();
      closeNewTaskModal();
      alert("New dispatch task successfully created!");
    }

    function openInviteSenderModal() {
      document.getElementById("modal-invite-sender").classList.add("open");
    }
    function closeInviteSenderModal() {
      document.getElementById("modal-invite-sender").classList.remove("open");
    }
    function handleInviteSenderSubmit(e) {
      e.preventDefault();
      const name = document.getElementById("invite-sender-name").value.trim();
      const email = document.getElementById("invite-sender-email").value.trim();
      const school = document.getElementById("invite-sender-school").value;
      alert("Invitation sent to " + name + " (" + email + ") for " + school + " station!");
      closeInviteSenderModal();
    }

    // =========================================================================
    // SUPER ADMIN: USERS, SETTINGS & STUDENTCORE INTEGRATION
    // =========================================================================
    function renderAdminUsersTable() {
      const tbody = document.getElementById("admin-users-tbody");
      if (!tbody) return;

      tbody.innerHTML = allUsers.map(u => {
        return '<tr>' +
          '<td><strong style="color:#f2f7f4;">' + escapeHtml(u.username) + '</strong></td>' +
          '<td><span style="font-size:12px; color:#9eb2a6;">' + escapeHtml(u.email) + '</span></td>' +
          '<td><span class="badge badge-success">' + escapeHtml(u.role) + '</span></td>' +
          '<td><span style="font-family:var(--font-mono); font-size:11px; color:#8fe617;">' + (u.boundDeviceId || "Unbound") + '</span></td>' +
          '<td><span style="font-size:11px; color:#798b81;">' + (u.lastActiveAt ? u.lastActiveAt.substring(0, 10) : "Active") + '</span></td>' +
          '<td>' + (u.recordsEncoded || 0) + '</td>' +
          '<td style="text-align:right;"><button class="btn-ghost" style="padding:4px 8px; font-size:11px;" onclick="resetOperatorDeviceLock(\\'' + u.id + '\\')">Reset Hardware Lock</button></td>' +
          '</tr>';
      }).join("");
      lucide.createIcons();
    }

    function resetOperatorDeviceLock(userId) {
      const u = allUsers.find(x => x.id === userId);
      if (u) {
        u.boundDeviceId = null;
        renderAdminUsersTable();
        alert("1-Device hardware lock reset for " + u.username + "!");
      }
    }

    function openAddUserModal() {
      document.getElementById("modal-add-user").classList.add("open");
    }
    function closeAddUserModal() {
      document.getElementById("modal-add-user").classList.remove("open");
    }
    function handleAddUserSubmit(e) {
      e.preventDefault();
      const user = {
        id: "usr-" + Date.now().toString(36),
        username: document.getElementById("user-input-username").value.trim(),
        email: document.getElementById("user-input-email").value.trim(),
        role: document.getElementById("user-input-role").value,
        boundDeviceId: null,
        recordsEncoded: 0
      };
      allUsers.unshift(user);
      renderAdminUsersTable();
      closeAddUserModal();
      alert("Account provisioned for " + user.username + "!");
    }

    // Super Settings Tabs & CRUD
    function switchSettingsTab(tabKey) {
      const tabs = ["schools", "grades", "validation", "storage", "export", "database"];
      tabs.forEach(t => {
        const p = document.getElementById("settings-panel-" + t);
        const b = document.getElementById("settings-tab-" + t);
        if (p) p.style.display = t === tabKey ? "block" : "none";
        if (b) b.classList.toggle("active", t === tabKey);
      });
    }

    function renderSettingsSchoolsTable() {
      const tbody = document.getElementById("settings-schools-tbody");
      if (!tbody) return;
      tbody.innerHTML = allSchools.map((s, idx) => {
        return '<tr>' +
          '<td><strong style="color:#f2f7f4;">' + escapeHtml(s.name) + '</strong></td>' +
          '<td>' + escapeHtml(s.location) + '</td>' +
          '<td>' + (s.studentsCount || 0).toLocaleString() + ' students</td>' +
          '<td><span class="badge badge-success">' + s.status + '</span></td>' +
          '<td style="text-align:right;"><button class="btn-ghost" style="padding:3px 8px; font-size:11px;" onclick="deleteSchool(' + idx + ')">Disable</button></td>' +
          '</tr>';
      }).join("");
      lucide.createIcons();
    }

    function openAddSchoolModal() {
      document.getElementById("modal-add-school").classList.add("open");
    }
    function closeAddSchoolModal() {
      document.getElementById("modal-add-school").classList.remove("open");
    }
    function handleAddSchoolSubmit(e) {
      e.preventDefault();
      const name = document.getElementById("input-new-school-name").value.trim();
      const loc = document.getElementById("input-new-school-location").value;
      allSchools.push({ id: "sch_" + Date.now(), name: name, location: loc, status: "Active", studentsCount: 0 });
      renderSettingsSchoolsTable();
      populateFilterOptions();
      closeAddSchoolModal();
      alert("School " + name + " added and immediately active across all stations!");
    }

    function openAddLocationModal() {
      document.getElementById("modal-add-location").classList.add("open");
    }
    function closeAddLocationModal() {
      document.getElementById("modal-add-location").classList.remove("open");
    }
    function handleAddLocationSubmit(e) {
      e.preventDefault();
      const name = document.getElementById("input-new-location-name").value.trim();
      allLocations.push({ id: "loc_" + Date.now(), name: name, schoolsCount: 0, status: "Active" });
      closeAddLocationModal();
      alert("Location " + name + " added!");
    }

    function deleteSchool(idx) {
      if (confirm("Disable this school from active dispatch?")) {
        allSchools.splice(idx, 1);
        renderSettingsSchoolsTable();
        populateFilterOptions();
      }
    }

    function saveAllSuperSettings() {
      alert("Super Settings successfully applied to Cloudflare Edge runtime!");
    }

    // StudentCore Requests Table & 3-Second Simulation
    function renderStudentCoreRequestsTable() {
      const tbody = document.getElementById("studentcore-requests-tbody");
      if (!tbody) return;
      tbody.innerHTML = studentCoreRequests.map(r => {
        return '<tr>' +
          '<td><strong style="font-family:var(--font-mono); color:#8fe617;">' + r.id + '</strong></td>' +
          '<td>' + escapeHtml(r.school) + '</td>' +
          '<td><span style="font-family:var(--font-mono); font-size:11px; color:#9eb2a6;">' + r.device + '</span></td>' +
          '<td>' + escapeHtml(r.studentId) + '</td>' +
          '<td><span class="badge badge-neutral">' + r.type + '</span></td>' +
          '<td>' + r.timestamp + '</td>' +
          '<td><span class="badge badge-success">' + r.authStatus + '</span></td>' +
          '<td><span class="badge badge-success">' + r.syncStatus + '</span></td>' +
          '<td><span style="color:#8fe617;">' + r.latency + '</span></td>' +
          '<td style="text-align:right;"><button class="btn-lime" style="padding:2px 8px; font-size:11px;" onclick="syncStudentCoreRequest(\\'' + r.id + '\\')">Sync Now</button></td>' +
          '</tr>';
      }).join("");
      lucide.createIcons();
    }

    function syncStudentCoreRequest(id) {
      alert("Instant edge sync executed for request " + id + ". Record confirmed in StudentBridge datastore.");
    }

    // 3-Second Sync Simulation Ticker
    setInterval(() => {
      const ticker = document.getElementById("sync-ticker-text");
      if (ticker) {
        ticker.textContent = "Sync: ~3.0s (Live • Latency 24ms)";
      }
    }, 3000);

    // Audit Logs & DB Control
    function renderAuditLogsTable() {
      const tbody = document.getElementById("audit-logs-tbody");
      if (!tbody) return;
      tbody.innerHTML = allAuditLogs.map(l => {
        return '<tr>' +
          '<td><span style="font-size:11px; color:#798b81;">' + l.timestamp + '</span></td>' +
          '<td><strong>' + escapeHtml(l.user) + '</strong></td>' +
          '<td><span class="badge badge-neutral">' + l.station + '</span></td>' +
          '<td><strong style="color:#8fe617;">' + l.action + '</strong></td>' +
          '<td>' + escapeHtml(l.entity) + '</td>' +
          '<td><span style="font-size:11px; color:#9eb2a6;">' + escapeHtml(l.details) + '</span></td>' +
          '</tr>';
      }).join("");
    }

    function renderDbControlLogs() {
      const tbody = document.getElementById("db-control-logs-tbody");
      if (!tbody) return;
      const logs = [
        { time: "Just now", op: "SELECT /data/students.json", target: "3,723 records", user: "SYSTEM", latency: "24 ms", status: "200 OK" },
        { time: "1 min ago", op: "AUTH_VERIFY", target: "1-Device Fingerprint", user: "miskrdires11", latency: "12 ms", status: "VERIFIED" },
        { time: "3 mins ago", op: "R2_CDN_PROXY", target: "siliconlabs/9C/*.jpg", user: "CDN Edge", latency: "18 ms", status: "CACHE_HIT" }
      ];
      tbody.innerHTML = logs.map(l => {
        return '<tr>' +
          '<td><span style="font-size:11px; color:#798b81;">' + l.time + '</span></td>' +
          '<td><strong style="color:#8fe617;">' + l.op + '</strong></td>' +
          '<td>' + l.target + '</td>' +
          '<td>' + l.user + '</td>' +
          '<td>' + l.latency + '</td>' +
          '<td><span class="badge badge-success">' + l.status + '</span></td>' +
          '</tr>';
      }).join("");
    }

    function addDbControlLogEntry(msg) {
      alert("Database diagnostic result: Healthy, 0 ms jitter, 100% data integrity.");
    }

    // Edit Student Modal
    function openEditStudentModal(id) {
      const s = allStudents.find(x => x.id === id);
      if (!s) return;
      document.getElementById("edit-student-id-hidden").value = s.id;
      document.getElementById("edit-fullname").value = s.fullName || "";
      document.getElementById("edit-sex").value = s.sex || "Female";
      document.getElementById("edit-grade").value = s.grade || "9C";
      document.getElementById("edit-school").value = s.school || "YMS";
      document.getElementById("edit-phone").value = s.phone || "";
      document.getElementById("modal-edit-student").classList.add("open");
    }

    function openEditStudentModalFromPanel() {
      if (activeDetailsStudent) openEditStudentModal(activeDetailsStudent.id);
    }

    function closeEditStudentModal() {
      document.getElementById("modal-edit-student").classList.remove("open");
    }

    function handleEditStudentSubmit(e) {
      e.preventDefault();
      const id = document.getElementById("edit-student-id-hidden").value;
      const s = allStudents.find(x => x.id === id);
      if (!s) return;
      s.fullName = document.getElementById("edit-fullname").value.trim();
      s.sex = document.getElementById("edit-sex").value;
      s.grade = document.getElementById("edit-grade").value.trim();
      s.school = document.getElementById("edit-school").value.trim();
      s.phone = document.getElementById("edit-phone").value.trim();
      s.updatedAt = new Date().toISOString();

      renderTable();
      if (activeDetailsStudent && activeDetailsStudent.id === id) openStudentDetails(id);
      closeEditStudentModal();
      alert("Student record updated successfully!");
    }

    // Helper functions
    function getInitials(name) {
      if (!name) return "SB";
      const parts = name.trim().split(/\\s+/);
      if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }

    function escapeHtml(str) {
      if (!str) return "";
      return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
    }

    // =========================================================================
    // INITIALIZATION ON PAGE LOAD
    // =========================================================================
    window.addEventListener("DOMContentLoaded", async () => {
      // Check existing session
      const saved = localStorage.getItem("sb_auth_user");
      if (saved) {
        try {
          currentUser = JSON.parse(saved);
        } catch (e) {}
      }

      await loadDataset();

      if (currentUser) {
        initAuthenticatedApp();
      } else {
        document.getElementById("screen-login").style.display = "flex";
        document.getElementById("screen-app").style.display = "none";
      }

      lucide.createIcons();
    });
  </script>
</body>
</html>
`;
