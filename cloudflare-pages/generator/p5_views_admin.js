module.exports = `
        <!-- ============================================================= -->
        <!-- ADMIN VIEW 1: SENDER MANAGEMENT (Matching Screenshot 9)       -->
        <!-- ============================================================= -->
        <div id="view-admin-senders" style="display: none;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem;">
            <div>
              <h1 style="font-family: 'Outfit'; font-size: 1.65rem; font-weight: 900; color: #f2f7f4;">
                Sender Workforce Management
              </h1>
              <p style="font-size: 0.8rem; color: #9eb2a6; margin-top: 3px;">
                Supervise field dispatchers, assign school stations, track data quality indices, and manage 1-device bindings
              </p>
            </div>

            <button class="btn-lime" onclick="openInviteSenderModal()">
              <i data-lucide="user-plus" style="width: 14px; height: 14px;"></i>
              <span>+ Invite Sender</span>
            </button>
          </div>

          <!-- Senders Summary Metrics -->
          <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 1rem; margin-bottom: 1.5rem;">
            <div class="metric-card">
              <div class="metric-label">Total Senders</div>
              <div class="metric-value" id="senders-count-total">12</div>
              <div class="metric-delta positive">Assigned across 8 schools</div>
            </div>
            <div class="metric-card">
              <div class="metric-label">Active Field Dispatchers</div>
              <div class="metric-value" id="senders-count-active" style="color: #8fe617;">10</div>
              <div class="metric-delta positive">Currently online</div>
            </div>
            <div class="metric-card">
              <div class="metric-label">Pending Invitations</div>
              <div class="metric-value" id="senders-count-pending" style="color: #fbbf24;">2</div>
              <div class="metric-delta neutral">Awaiting first login</div>
            </div>
            <div class="metric-card">
              <div class="metric-label">Suspended Senders</div>
              <div class="metric-value" id="senders-count-suspended" style="color: #f87171;">0</div>
              <div class="metric-delta neutral">All accounts healthy</div>
            </div>
          </div>

          <!-- Senders Table -->
          <div class="glass-card">
            <div class="table-responsive">
              <table class="dense-table">
                <thead>
                  <tr>
                    <th>Sender Name</th>
                    <th>Email Address</th>
                    <th>Assigned School</th>
                    <th>Station / Hardware Binding</th>
                    <th>Status</th>
                    <th>Quality & Throughput</th>
                    <th style="text-align: right;">Actions</th>
                  </tr>
                </thead>
                <tbody id="admin-senders-tbody">
                  <!-- Filled dynamically -->
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- ============================================================= -->
        <!-- ADMIN VIEW 2: TASK MANAGEMENT (Matching Screenshot 10)        -->
        <!-- ============================================================= -->
        <div id="view-admin-tasks" style="display: none;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem;">
            <div>
              <h1 style="font-family: 'Outfit'; font-size: 1.65rem; font-weight: 900; color: #f2f7f4;">
                Task & Deadline Management
              </h1>
              <p style="font-size: 0.8rem; color: #9eb2a6; margin-top: 3px;">
                Dispatch field assignments, photo re-shoot tasks, and phone correction requests to authorized Senders
              </p>
            </div>

            <button class="btn-lime" onclick="openNewTaskModal()">
              <i data-lucide="plus-circle" style="width: 14px; height: 14px;"></i>
              <span>+ New Task</span>
            </button>
          </div>

          <!-- Task Tabs: All, Assigned to Me, Overdue, Completed -->
          <div style="display: flex; gap: 8px; margin-bottom: 1.25rem;">
            <button class="grade-chip active" id="task-tab-all" onclick="filterTasksByTab('ALL')">
              All Tasks (<span id="task-count-all">5</span>)
            </button>
            <button class="grade-chip" id="task-tab-pending" onclick="filterTasksByTab('PENDING')">
              Pending (<span id="task-count-pending">2</span>)
            </button>
            <button class="grade-chip" id="task-tab-inprogress" onclick="filterTasksByTab('IN_PROGRESS')">
              In Progress (<span id="task-count-inprogress">2</span>)
            </button>
            <button class="grade-chip" id="task-tab-overdue" onclick="filterTasksByTab('OVERDUE')">
              Overdue (<span id="task-count-overdue">1</span>)
            </button>
            <button class="grade-chip" id="task-tab-completed" onclick="filterTasksByTab('COMPLETED')">
              Completed
            </button>
          </div>

          <!-- Tasks Table -->
          <div class="glass-card">
            <div class="table-responsive">
              <table class="dense-table">
                <thead>
                  <tr>
                    <th>Task ID</th>
                    <th>Title & Description</th>
                    <th>Assigned Sender</th>
                    <th>School / Location</th>
                    <th>Priority</th>
                    <th>Deadline</th>
                    <th>Status</th>
                    <th style="text-align: right;">Actions</th>
                  </tr>
                </thead>
                <tbody id="admin-tasks-tbody">
                  <!-- Filled dynamically -->
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- ============================================================= -->
        <!-- ADMIN VIEW 3: QUALITY CONTROL & REPORTS                       -->
        <!-- ============================================================= -->
        <div id="view-admin-qc" style="display: none;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
            <div>
              <h1 style="font-family: 'Outfit'; font-size: 1.65rem; font-weight: 900; color: #f2f7f4;">
                Quality Control & Reports
              </h1>
              <p style="font-size: 0.8rem; color: #9eb2a6; margin-top: 3px;">
                Field error ratios, photo rejection root cause analysis, and operator audit statistics
              </p>
            </div>
          </div>

          <div class="glass-card" style="margin-bottom: 1.5rem;">
            <h3 style="font-family: 'Outfit'; font-size: 1.1rem; font-weight: 800; color: #f2f7f4; margin-bottom: 1rem;">
              Quality Control Summary
            </h3>
            <p style="font-size: 0.85rem; color: #9eb2a6; line-height: 1.6;">
              Acceptance formula enforced: <code>Acceptance Rate = (Accepted Records / Total Submissions) × 100%</code>.<br/>
              Average data accuracy across active field stations: <strong>96.4%</strong>. Zero Division protection enabled on empty sender sessions.
            </p>
          </div>
        </div>
`;
