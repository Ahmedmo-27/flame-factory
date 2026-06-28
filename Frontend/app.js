const API = "http://localhost:5000/api";
let token = localStorage.getItem("token") || null;
let currentUser = JSON.parse(localStorage.getItem("currentUser") || "null");

// ─── Bootstrap ────────────────────────────────────────────────────────────────
window.onload = () => {
    if (token && currentUser) {
        showDashboard();
        loadMembers();
        loadPackagesDropdown();
    }
};

// ─── Auth tab switch ──────────────────────────────────────────────────────────
function switchAuthTab(tab) {
    const isLogin = tab === "login";
    document.getElementById("loginForm").style.display = isLogin ? "flex" : "none";
    document.getElementById("registerForm").style.display = isLogin ? "none" : "flex";
    document.getElementById("tabLoginBtn").classList.toggle("active", isLogin);
    document.getElementById("tabRegisterBtn").classList.toggle("active", !isLogin);
    document.getElementById("loginError").textContent = "";
    document.getElementById("registerMsg").textContent = "";
}

// ─── Register ─────────────────────────────────────────────────────────────────
async function register() {
    const name     = document.getElementById("regName").value.trim();
    const email    = document.getElementById("regEmail").value.trim();
    const password = document.getElementById("regPassword").value.trim();
    const role     = document.getElementById("regRole").value;
    const msgEl    = document.getElementById("registerMsg");
    msgEl.style.color = "#e74c3c";
    msgEl.textContent = "";

    if (!name || !email || !password) {
        msgEl.textContent = "All fields are required.";
        return;
    }

    try {
        const res = await fetch(`${API}/users/register`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, email, password, role })
        });

        const data = await res.json();

        if (!res.ok) {
            msgEl.textContent = data.message || "Registration failed.";
            return;
        }

        msgEl.style.color = "#2ecc71";
        msgEl.textContent = `✓ Account created! You can now log in.`;

        // Auto-fill login
        document.getElementById("loginEmail").value = email;
        document.getElementById("loginPassword").value = password;
        setTimeout(() => switchAuthTab("login"), 1200);

    } catch (err) {
        msgEl.textContent = "Cannot connect to server.";
    }
}

// ─── Login ────────────────────────────────────────────────────────────────────
async function login() {
    const email    = document.getElementById("loginEmail").value.trim();
    const password = document.getElementById("loginPassword").value.trim();
    const errEl    = document.getElementById("loginError");
    errEl.textContent = "";

    if (!email || !password) {
        errEl.textContent = "Enter your email and password.";
        return;
    }

    try {
        const res = await fetch(`${API}/users/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password })
        });

        const data = await res.json();

        if (!res.ok) {
            errEl.textContent = data.message || "Login failed.";
            return;
        }

        token = data.token;
        currentUser = data.user;
        localStorage.setItem("token", token);
        localStorage.setItem("currentUser", JSON.stringify(currentUser));

        showDashboard();
        loadMembers();
        loadPackagesDropdown();

    } catch (err) {
        errEl.textContent = "Cannot connect to server. Is the backend running?";
    }
}

// ─── Logout ───────────────────────────────────────────────────────────────────
function logout() {
    token = null;
    currentUser = null;
    localStorage.removeItem("token");
    localStorage.removeItem("currentUser");
    document.getElementById("dashboard").classList.remove("active");
    document.getElementById("loginPage").classList.add("active");
    document.getElementById("loginForm").style.display = "flex";
    document.getElementById("registerForm").style.display = "none";
}

function showDashboard() {
    document.getElementById("loginPage").classList.remove("active");
    document.getElementById("dashboard").classList.add("active");
    if (currentUser) {
        document.getElementById("navUser").textContent =
            `${currentUser.name} (${currentUser.role})`;
    }
}

// ─── Tab navigation ───────────────────────────────────────────────────────────
function showTab(tabId, btn) {
    document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
    document.querySelectorAll(".nav-btn").forEach(b => b.classList.remove("active"));
    document.getElementById(tabId).classList.add("active");
    btn.classList.add("active");
    if (tabId === "membersTab") loadMembers();
    if (tabId === "addPackageTab") loadPackagesList();
    if (tabId === "addMemberTab") loadPackagesDropdown();
    if (tabId === "assignTab") loadSalesDropdown();
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function authHeaders() {
    return {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
    };
}

function setMsg(id, text, isError = false) {
    const el = document.getElementById(id);
    el.textContent = text;
    el.className = "msg " + (isError ? "error-msg" : "success");
}

function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        // brief visual feedback handled by CSS :hover
    });
}

// ─── Member Profile ───────────────────────────────────────────────────────────
async function loadProfile(memberId) {
    // Switch to profile tab
    document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
    document.querySelectorAll(".nav-btn").forEach(b => b.classList.remove("active"));
    document.getElementById("profileTab").classList.add("active");

    const content = document.getElementById("profileContent");
    content.innerHTML = "<p style='color:#444;padding:20px'>Loading profile...</p>";

    try {
        const res = await fetch(`${API}/members/${memberId}`, { headers: authHeaders() });
        const data = await res.json();

        if (!res.ok) {
            content.innerHTML = `<p class='empty'>Error: ${data.message}</p>`;
            return;
        }

        const m = data.member;
        const s = data.stats;

        document.getElementById("profileTitle").textContent = m.name;

        // Current package from last subscription
        const lastSub = m.subscriptions?.[m.subscriptions.length - 1];
        const currentPkg = lastSub?.package;
        const endDate   = lastSub ? new Date(lastSub.endDate).toLocaleDateString() : "—";
        const startDate = lastSub ? new Date(lastSub.startDate).toLocaleDateString() : "—";

        content.innerHTML = `
            <!-- Info cards -->
            <div class="profile-grid">
                <div class="info-card">
                    <h3>Personal Info</h3>
                    <div class="info-row"><span>Phone</span><strong>${m.phones}</strong></div>
                    <div class="info-row"><span>Gender</span><strong>${m.gender || "—"}</strong></div>
                    <div class="info-row"><span>Birthdate</span><strong>${m.birthdate ? new Date(m.birthdate).toLocaleDateString() : "—"}</strong></div>
                    <div class="info-row"><span>National ID</span><strong>${m.nationalId || "—"}</strong></div>
                    <div class="info-row"><span>Source</span><strong>${m.source || "—"}</strong></div>
                    <div class="info-row"><span>Added by</span><strong>${m.createdBy?.name || "—"}</strong></div>
                </div>

                <div class="info-card">
                    <h3>Membership</h3>
                    <div class="info-row"><span>Package</span><strong>${currentPkg?.name || "—"}</strong></div>
                    <div class="info-row"><span>Duration</span><strong>${currentPkg?.duration || "—"}</strong></div>
                    <div class="info-row"><span>Start</span><strong>${startDate}</strong></div>
                    <div class="info-row"><span>Expires</span><strong>${endDate}</strong></div>
                    <div class="info-row"><span>Status</span><span class="badge badge-${m.status}">${m.status}</span></div>
                    <div class="info-row"><span>Assigned Sales</span><strong>${m.assignedSales?.name || "—"}</strong></div>
                </div>

                <div class="info-card">
                    <h3>Activity Stats</h3>
                    <div class="info-row"><span>Total Check-ins</span><strong>${s.totalCheckIns}</strong></div>
                    <div class="info-row"><span>Renewals</span><strong>${s.totalSubscriptions - 1}</strong></div>
                    <div class="info-row"><span>Freeze Days Used</span><strong>${s.freezeDaysUsed}</strong></div>
                    <div class="info-row"><span>Freeze Days Left</span><strong>${s.freezeDaysRemaining}</strong></div>
                    <div class="info-row"><span>Invitations Used</span><strong>${s.invitationsUsed}</strong></div>
                    <div class="info-row"><span>Invitations Left</span><strong>${s.invitationsRemaining}</strong></div>
                </div>
            </div>

            <!-- Check-in history -->
            <div class="profile-section">
                <h3>Check-in History <span class="section-count">${data.checkIns.length}</span></h3>
                ${data.checkIns.length ? `
                <table>
                    <thead><tr><th>Date</th><th>Time</th><th>Checked in by</th></tr></thead>
                    <tbody>
                        ${data.checkIns.map(c => `
                            <tr>
                                <td>${new Date(c.createdAt).toLocaleDateString()}</td>
                                <td>${new Date(c.createdAt).toLocaleTimeString()}</td>
                                <td>${c.createdBy?.name || "—"}</td>
                            </tr>
                        `).join("")}
                    </tbody>
                </table>` : "<p class='empty' style='padding:16px'>No check-ins yet.</p>"}
            </div>

            <!-- Subscription history -->
            <div class="profile-section">
                <h3>Subscription History <span class="section-count">${m.subscriptions.length}</span></h3>
                ${m.subscriptions.length ? `
                <table>
                    <thead><tr><th>Sub ID</th><th>Package</th><th>Start</th><th>End</th><th>Price Paid</th><th>Discount</th><th>Renewal</th></tr></thead>
                    <tbody>
                        ${m.subscriptions.map(sub => `
                            <tr>
                                <td><strong style="color:#ff4d00">${sub.subscriptionId || "—"}</strong></td>
                                <td>${sub.package?.name || "—"}</td>
                                <td>${new Date(sub.startDate).toLocaleDateString()}</td>
                                <td>${new Date(sub.endDate).toLocaleDateString()}</td>
                                <td>${sub.pricePaid} EGP</td>
                                <td>${sub.discountPercent}%</td>
                                <td>${sub.isRenewal ? "✓" : "—"}</td>
                            </tr>
                        `).join("")}
                    </tbody>
                </table>` : "<p class='empty' style='padding:16px'>No subscriptions.</p>"}
            </div>

            <!-- Freeze history -->
            <div class="profile-section">
                <h3>Freeze History <span class="section-count">${m.freeze.length}</span></h3>
                ${m.freeze.length ? `
                <table>
                    <thead><tr><th>Start</th><th>End</th><th>Days</th><th>By</th></tr></thead>
                    <tbody>
                        ${m.freeze.map(f => {
                            const days = Math.ceil((new Date(f.endDate) - new Date(f.startDate)) / 86400000);
                            return `<tr>
                                <td>${new Date(f.startDate).toLocaleDateString()}</td>
                                <td>${new Date(f.endDate).toLocaleDateString()}</td>
                                <td>${days}d</td>
                                <td>${f.createdBy?.name || "—"}</td>
                            </tr>`;
                        }).join("")}
                    </tbody>
                </table>` : "<p class='empty' style='padding:16px'>No freezes.</p>"}
            </div>

            <!-- Notes -->
            <div class="profile-section">
                <h3>Notes <span class="section-count">${m.notes.length}</span></h3>
                ${m.notes.length
                    ? m.notes.map(n => `
                        <div class="note-item">
                            <p>${n.text}</p>
                            <span>${n.createdBy?.name || "—"} · ${new Date(n.createdAt).toLocaleDateString()}</span>
                        </div>`).join("")
                    : "<p class='empty' style='padding:16px'>No notes.</p>"
                }
            </div>

            <!-- Profile Views -->
            <div class="profile-section">
                <h3>Others — Profile Views <span class="section-count">${data.profileViews.length}</span></h3>
                ${data.profileViews.length ? `
                <table>
                    <thead><tr><th>Viewed By</th><th>Role</th><th>Date</th><th>Time</th></tr></thead>
                    <tbody>
                        ${data.profileViews.map(v => `
                            <tr>
                                <td>${v.viewedBy?.name || "—"}</td>
                                <td><span style="color:#888;font-size:12px">${v.viewedBy?.role || "—"}</span></td>
                                <td>${new Date(v.createdAt).toLocaleDateString()}</td>
                                <td>${new Date(v.createdAt).toLocaleTimeString()}</td>
                            </tr>
                        `).join("")}
                    </tbody>
                </table>` : "<p class='empty' style='padding:16px'>No views recorded yet.</p>"}
            </div>
        `;

    } catch (err) {
        content.innerHTML = "<p class='empty'>Cannot connect to server.</p>";
    }
}


async function loadMembers() {
    const container = document.getElementById("membersTable");
    container.innerHTML = "<p style='color:#444;padding:20px'>Loading...</p>";

    try {
        const res = await fetch(`${API}/members`, { headers: authHeaders() });
        const data = await res.json();

        if (!res.ok) {
            container.innerHTML = `<p class='empty'>Error: ${data.message}</p>`;
            return;
        }

        if (!data.members || !data.members.length) {
            container.innerHTML = "<p class='empty'>No members yet. Add your first member.</p>";
            return;
        }

        const rows = data.members.map(m => {
            const lastSub = m.subscriptions?.[m.subscriptions.length - 1];
            const pkg = lastSub?.package;
            return `
            <tr>
                <td><strong style="color:#ff4d00">${m.systemId ?? "—"}</strong></td>
                <td><strong style="color:#3498db">${m.membershipId ?? "—"}</strong></td>
                <td>
                    <span class="member-link" onclick="loadProfile('${m.systemId}')">${m.name}</span>
                </td>
                <td>${m.phones}</td>
                <td>${pkg?.name || "—"}</td>
                <td>${pkg?.duration || "—"}</td>
                <td><span class="badge badge-${m.status}">${m.status}</span></td>
                <td>${m.freezeDaysUsed ?? 0}</td>
                <td>${m.assignedSales?.name || "—"}</td>
                <td>${new Date(m.createdAt).toLocaleDateString()}</td>
            </tr>`;
        }).join("");

        container.innerHTML = `
            <table>
                <thead>
                    <tr>
                        <th>System ID</th>
                        <th>Membership ID</th>
                        <th>Name</th>
                        <th>Phone</th>
                        <th>Package</th>
                        <th>Duration</th>
                        <th>Status</th>
                        <th>Freeze Used</th>
                        <th>Sales</th>
                        <th>Joined</th>
                    </tr>
                </thead>
                <tbody>${rows}</tbody>
            </table>
        `;
    } catch (err) {
        container.innerHTML = "<p class='empty'>Cannot connect to server.</p>";
    }
}

// ─── Load Sales dropdown ──────────────────────────────────────────────────────
async function loadSalesDropdown() {
    const sel = document.getElementById("assignSalesId");
    if (!sel) return;
    sel.innerHTML = '<option value="">Loading...</option>';

    try {
        const res = await fetch(`${API}/users/sales`, { headers: authHeaders() });
        const data = await res.json();

        if (!res.ok || !data.salesUsers.length) {
            sel.innerHTML = '<option value="">No sales users found</option>';
            return;
        }

        sel.innerHTML = '<option value="">Select Salesman *</option>';
        data.salesUsers.forEach(u => {
            sel.innerHTML += `<option value="${u._id}">${u.name} (${u.role})</option>`;
        });
    } catch (_) {
        sel.innerHTML = '<option value="">Cannot load sales users</option>';
    }
}


async function loadPackagesDropdown() {
    const sel = document.getElementById("mPackageId");
    if (!sel) return;

    try {
        const res = await fetch(`${API}/packages`, { headers: authHeaders() });
        if (!res.ok) return;
        const data = await res.json();

        sel.innerHTML = '<option value="">Select Package *</option>';
        (data.packages || []).forEach(p => {
            sel.innerHTML += `<option value="${p._id}">${p.name} — ${p.duration} — ${p.price} EGP</option>`;
        });
    } catch (_) {
        // packages endpoint may not exist yet, keep manual input
    }
}

// ─── 3. Add Package ───────────────────────────────────────────────────────────
async function addPackage() {
    const body = {
        name:                   document.getElementById("pkgName").value.trim(),
        duration:               document.getElementById("pkgDuration").value,
        price:                  Number(document.getElementById("pkgPrice").value),
        freezeLimitDays:        Number(document.getElementById("pkgFreeze").value) || 0,
        invitationLimit:        Number(document.getElementById("pkgInvite").value) || 0,
        renewalDiscountPercent: Number(document.getElementById("pkgDiscount").value) || 0,
        description:            document.getElementById("pkgDesc").value.trim() || undefined,
        activityType:           "gym"
    };

    if (!body.name || !body.duration || !body.price) {
        setMsg("addPackageMsg", "Name, duration and price are required.", true);
        return;
    }

    try {
        const res = await fetch(`${API}/packages`, {
            method: "POST",
            headers: authHeaders(),
            body: JSON.stringify(body)
        });

        const data = await res.json();

        if (!res.ok) {
            setMsg("addPackageMsg", data.message || "Failed.", true);
            return;
        }

        setMsg("addPackageMsg", `✓ Package "${data.package.name}" created.`);
        ["pkgName","pkgPrice","pkgDesc"].forEach(id => document.getElementById(id).value = "");
        document.getElementById("pkgDuration").value = "";
        document.getElementById("pkgFreeze").value = "0";
        document.getElementById("pkgInvite").value = "0";
        document.getElementById("pkgDiscount").value = "0";
        loadPackagesList();
        loadPackagesDropdown();

    } catch (err) {
        setMsg("addPackageMsg", "Cannot connect to server.", true);
    }
}

// ─── 4. Load Packages list ────────────────────────────────────────────────────
async function loadPackagesList() {
    const container = document.getElementById("packagesList");
    if (!container) return;
    container.innerHTML = "";

    try {
        const res = await fetch(`${API}/packages`, { headers: authHeaders() });
        if (!res.ok) return;
        const data = await res.json();

        if (!data.packages || !data.packages.length) {
            container.innerHTML = "<p class='empty' style='padding:20px'>No packages yet.</p>";
            return;
        }

        container.innerHTML = data.packages.map(p => `
            <div class="pkg-item">
                <div>
                    <strong>${p.name}</strong>
                    <span style="margin-left:8px">${p.duration}</span>
                </div>
                <div style="display:flex;gap:16px;align-items:center">
                    <span>${p.price} EGP</span>
                    <span>❄ ${p.freezeLimitDays}d</span>
                    <span>🎟 ${p.invitationLimit} invites</span>
                    <span>🔄 ${p.renewalDiscountPercent}% off renewal</span>
                    <span class="id-chip" onclick="copyToClipboard('${p._id}')" title="Copy ID">${p._id}</span>
                </div>
            </div>
        `).join("");

    } catch (_) {}
}

// ─── 5. Add Member ────────────────────────────────────────────────────────────
async function addMember() {
    const body = {
        name:        document.getElementById("mName").value.trim(),
        phones:      document.getElementById("mPhone").value.trim(),
        nationalId:  document.getElementById("mNationalId").value.trim() || undefined,
        gender:      document.getElementById("mGender").value || undefined,
        birthdate:   document.getElementById("mBirthdate").value || undefined,
        source:      document.getElementById("mSource").value || undefined,
        packageId:   document.getElementById("mPackageId").value.trim(),
        assignedSales: document.getElementById("mSalesId").value.trim() || undefined
    };

    if (!body.name || !body.phones || !body.packageId) {
        setMsg("addMemberMsg", "Name, phone and package are required.", true);
        return;
    }

    try {
        const res = await fetch(`${API}/members`, {
            method: "POST",
            headers: authHeaders(),
            body: JSON.stringify(body)
        });

        const data = await res.json();

        if (!res.ok) {
            setMsg("addMemberMsg", data.message || "Failed to add member.", true);
            return;
        }

        setMsg("addMemberMsg", `✓ Member "${data.member.name}" created successfully.`);
        ["mName","mPhone","mNationalId","mBirthdate","mSalesId"].forEach(id => {
            document.getElementById(id).value = "";
        });
        document.getElementById("mGender").value = "";
        document.getElementById("mSource").value = "";
        document.getElementById("mPackageId").value = "";

    } catch (err) {
        setMsg("addMemberMsg", "Cannot connect to server.", true);
    }
}

// ─── 6. Check In ─────────────────────────────────────────────────────────────
async function checkIn() {
    const memberId = document.getElementById("checkInMemberId").value.trim();
    if (!memberId) { setMsg("checkInMsg", "Member ID is required.", true); return; }

    try {
        const res = await fetch(`${API}/members/${memberId}/checkin`, {
            method: "POST",
            headers: authHeaders()
        });

        const data = await res.json();

        if (!res.ok) { setMsg("checkInMsg", data.message || "Check-in failed.", true); return; }

        setMsg("checkInMsg", `✓ ${data.message}${data.status === "active" ? " — now active" : ""} at ${new Date(data.checkIn.createdAt).toLocaleTimeString()}`);
        document.getElementById("checkInMemberId").value = "";

    } catch (err) {
        setMsg("checkInMsg", "Cannot connect to server.", true);
    }
}

// ─── 7. Assign Salesman ───────────────────────────────────────────────────────
async function assignSales() {
    const memberId = document.getElementById("assignMemberId").value.trim();
    const salesId  = document.getElementById("assignSalesId").value;

    if (!memberId || !salesId) { setMsg("assignMsg", "Member ID and salesman are required.", true); return; }

    try {
        const res = await fetch(`${API}/members/${memberId}/assign-sales`, {
            method: "PATCH",
            headers: authHeaders(),
            body: JSON.stringify({ salesId })
        });

        const data = await res.json();

        if (!res.ok) { setMsg("assignMsg", data.message || "Failed.", true); return; }

        setMsg("assignMsg", `✓ Assigned to "${data.member.assignedSales?.name}".`);
        document.getElementById("assignMemberId").value = "";
        document.getElementById("assignSalesId").value = "";

    } catch (err) {
        setMsg("assignMsg", "Cannot connect to server.", true);
    }
}

// ─── 8. Freeze Member ─────────────────────────────────────────────────────────
async function freezeMember() {
    const memberId  = document.getElementById("freezeMemberId").value.trim();
    const startDate = document.getElementById("freezeStart").value;
    const endDate   = document.getElementById("freezeEnd").value;

    if (!memberId || !startDate || !endDate) {
        setMsg("freezeMsg", "All fields are required.", true);
        return;
    }

    try {
        const res = await fetch(`${API}/members/${memberId}/freeze`, {
            method: "PATCH",
            headers: authHeaders(),
            body: JSON.stringify({ startDate, endDate })
        });

        const data = await res.json();

        if (!res.ok) { setMsg("freezeMsg", data.message || "Freeze failed.", true); return; }

        setMsg("freezeMsg",
            `✓ Frozen. Used ${data.freezeDaysUsed} / ${data.freezeLimitDays} freeze days.`
        );
        document.getElementById("freezeMemberId").value = "";
        document.getElementById("freezeStart").value = "";
        document.getElementById("freezeEnd").value = "";

    } catch (err) {
        setMsg("freezeMsg", "Cannot connect to server.", true);
    }
}
