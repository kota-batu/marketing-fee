/******************************************************************
 * PROJECT      : Marketing Fee & Rombongan Tracking System
 * MODULE       : Frontend Page Logic
 * FILE         : dashboard.js
 * VERSION      : v1.0.0
 * AUTHOR       : Jimmy Method Generator
 * CREATED      : 2026-09-05
 * LAST UPDATE  : 2026-09-05
 *
 * DESCRIPTION
 * ----------------------------------------------------------------
 * Logika dashboard.html. Menampilkan ringkasan sesuai role, dan
 * khusus SUPER_ADMIN menyediakan tab manajemen: Users, Teams,
 * Fee Rules, dan Audit Log (semua di satu halaman, sesuai
 * Blueprint menu SUPER_ADMIN pada Aturan 33).
 ******************************************************************/

/******************************************************************
 * VERSION HISTORY
 * ----------------------------------------------------------------
 *
 * v1.0.0
 * - Initial Release.
 *
 ******************************************************************/

/******************************************************************
 * DEPENDENCIES
 * ----------------------------------------------------------------
 *
 * Required
 * - api.js, auth.js, app.js
 *
 * Used By
 * - dashboard.html
 *
 ******************************************************************/

/******************************************************************
 * CONSTANTS
 ******************************************************************/

const DASHBOARD_TABS = ["overview", "users", "teams", "fee", "audit"];

/******************************************************************
 * Function : dashboardInit()
 * Tujuan   : Entry point halaman dashboard.
 ******************************************************************/
async function dashboardInit() {
    const user = authGuardPage(null);
    if (!user) {
        return;
    }

    appRenderSidebar(user, "dashboard.html");
    document.getElementById("dashboardUserRole").textContent = user.role.replace("_", " ");

    await dashboardLoadStats(user);

    if (user.role === "SUPER_ADMIN") {
        document.getElementById("superAdminTabs").classList.remove("hidden");
        dashboardBindTabButtons();
    }
}

/******************************************************************
 * SECTION BLOCK : OVERVIEW STATS
 ******************************************************************/

/******************************************************************
 * Function : dashboardLoadStats()
 * Tujuan   : Mengambil data ringkasan dari backend dan merender
 *            kartu statistik sesuai role.
 ******************************************************************/
async function dashboardLoadStats(user) {
    const statGrid = document.getElementById("statGrid");
    statGrid.innerHTML = '<p class="page-subtitle">Memuat data...</p>';

    try {
        const data = await apiCall("get_dashboard", {});

        if (user.role === "SUPER_ADMIN") {
            statGrid.innerHTML = dashboardBuildStatCards([
                { label: "Total Marketing", value: data.total_marketing },
                { label: "Total Admin", value: data.total_admin },
                { label: "Total Team", value: data.total_team },
                { label: "Rombongan Hari Ini", value: data.rombongan_hari_ini },
                { label: "Pending", value: data.pending },
                { label: "Arrived", value: data.arrived },
                { label: "Not Arrived", value: data.not_arrived },
                { label: "Total Belanja Bulan Ini", value: appFormatRupiah(data.total_belanja_bulan_ini), accent: true },
                { label: "Total Fee Bulan Ini", value: appFormatRupiah(data.total_fee_bulan_ini), accent: true }
            ]);
        } else if (user.role === "ADMIN") {
            statGrid.innerHTML = dashboardBuildStatCards([
                { label: "Rombongan Hari Ini", value: data.rombongan_hari_ini },
                { label: "Sudah Tracking", value: data.sudah_tracking },
                { label: "Belum Tracking", value: data.belum_tracking },
                { label: "Pending Lama", value: data.pending_lama, accent: true }
            ]);
        } else {
            statGrid.innerHTML = dashboardBuildStatCards([
                { label: "Rombongan Bulan Ini", value: data.rombongan_bulan_ini },
                { label: "Arrived", value: data.arrived },
                { label: "Pending", value: data.pending },
                { label: "Not Arrived", value: data.not_arrived }
            ]);
        }
    } catch (error) {
        statGrid.innerHTML = '<div class="alert alert-error">' + appEscapeHtml(error.message) + "</div>";
    }
}

/******************************************************************
 * Function : dashboardBuildStatCards()
 * Tujuan   : Membangun HTML sekumpulan kartu statistik.
 ******************************************************************/
function dashboardBuildStatCards(items) {
    return items.map(function (item) {
        const valueClass = item.accent ? "stat-value accent" : "stat-value";
        return '<div class="stat-card"><div class="stat-label">' + appEscapeHtml(item.label) +
            '</div><div class="' + valueClass + '">' + item.value + "</div></div>";
    }).join("");
}

/******************************************************************
 * SECTION BLOCK : TAB SWITCHING (SUPER_ADMIN)
 ******************************************************************/

/******************************************************************
 * Function : dashboardBindTabButtons()
 * Tujuan   : Memasang event klik pada tombol tab dan memuat tab
 *            pertama (Users) secara default.
 ******************************************************************/
function dashboardBindTabButtons() {
    DASHBOARD_TABS.forEach(function (tabName) {
        const button = document.getElementById("tabBtn_" + tabName);
        if (button) {
            button.addEventListener("click", function () {
                dashboardSwitchTab(tabName);
            });
        }
    });
}

/******************************************************************
 * Function : dashboardSwitchTab()
 * Tujuan   : Menampilkan panel tab yang dipilih dan memuat datanya.
 ******************************************************************/
function dashboardSwitchTab(tabName) {
    DASHBOARD_TABS.forEach(function (name) {
        const panel = document.getElementById("tabPanel_" + name);
        const button = document.getElementById("tabBtn_" + name);
        if (panel) panel.classList.toggle("hidden", name !== tabName);
        if (button) button.classList.toggle("active", name === tabName);
    });

    if (tabName === "users") dashboardLoadUsersTab();
    if (tabName === "teams") dashboardLoadTeamsTab();
    if (tabName === "fee") dashboardLoadFeeTab();
    if (tabName === "audit") dashboardLoadAuditTab();
}

/******************************************************************
 * SECTION BLOCK : USERS TAB
 ******************************************************************/

/******************************************************************
 * Function : dashboardLoadUsersTab()
 * Tujuan   : Menampilkan daftar seluruh user beserta aksi
 *            aktivasi/nonaktivasi, reset password, dan pindah team.
 ******************************************************************/
async function dashboardLoadUsersTab() {
    const container = document.getElementById("usersTableSlot");
    container.innerHTML = "<p>Memuat...</p>";

    try {
        const [users, teams] = await Promise.all([
            apiCall("get_users", {}),
            apiCall("get_teams", {})
        ]);

        const teamOptions = teams.map(function (t) {
            return '<option value="' + t.id + '">' + appEscapeHtml(t.team_name) + "</option>";
        }).join("");

        const rows = users.map(function (u) {
            const statusBadge = u.status === "ACTIVE" ? '<span class="badge badge-active">ACTIVE</span>' : '<span class="badge badge-inactive">INACTIVE</span>';
            const teamCell = u.role === "MARKETING"
                ? '<select class="form-select" style="width:auto;display:inline-block;" onchange="dashboardAssignMarketingTeam(\'' + u.id + '\', this.value)">' +
                  '<option value="">Tanpa Team</option>' + teamOptions + '</select>'
                : "-";

            return "<tr>" +
                "<td>" + appEscapeHtml(u.name) + "<br><span class='page-subtitle'>" + appEscapeHtml(u.username) + "</span></td>" +
                "<td>" + appEscapeHtml(u.role) + "</td>" +
                "<td>" + teamCell + "</td>" +
                "<td>" + statusBadge + "</td>" +
                "<td>" +
                (u.status === "ACTIVE"
                    ? '<button class="btn btn-outline btn-sm" onclick="dashboardSetUserStatus(\'' + u.id + '\', false)">Nonaktifkan</button>'
                    : '<button class="btn btn-outline btn-sm" onclick="dashboardSetUserStatus(\'' + u.id + '\', true)">Aktifkan</button>') +
                ' <button class="btn btn-outline btn-sm" onclick="dashboardResetPassword(\'' + u.id + '\')">Reset Password</button>' +
                "</td></tr>";
        }).join("");

        container.innerHTML =
            '<div class="table-wrap"><table class="data-table"><thead><tr>' +
            "<th>Nama</th><th>Role</th><th>Team</th><th>Status</th><th>Aksi</th>" +
            "</tr></thead><tbody>" + (rows || '<tr><td colspan="5" class="table-empty">Belum ada user.</td></tr>') + "</tbody></table></div>";

        for (const select of container.querySelectorAll("select")) {
            const row = users.find(function (u) { return select.getAttribute("onchange").indexOf(u.id) !== -1; });
            if (row) select.value = row.team_id || "";
        }
    } catch (error) {
        container.innerHTML = '<div class="alert alert-error">' + appEscapeHtml(error.message) + "</div>";
    }
}

/******************************************************************
 * Function : dashboardSetUserStatus()
 * Tujuan   : Mengaktifkan/menonaktifkan user, dengan konfirmasi.
 ******************************************************************/
async function dashboardSetUserStatus(userId, activate) {
    const confirmed = await appConfirmModal(activate ? "Aktifkan user ini?" : "Nonaktifkan user ini? Sesi login user akan dicabut.");
    if (!confirmed) return;

    try {
        await apiCall(activate ? "activate_user" : "deactivate_user", { user_id: userId });
        appShowToast("Status user berhasil diubah.", "success");
        dashboardLoadUsersTab();
    } catch (error) {
        appShowToast(error.message, "error");
    }
}

/******************************************************************
 * Function : dashboardResetPassword()
 * Tujuan   : Mereset password seorang user setelah konfirmasi input.
 ******************************************************************/
async function dashboardResetPassword(userId) {
    const newPassword = await appPromptModal("Password baru untuk user ini:", "text");
    if (!newPassword) return;

    try {
        await apiCall("reset_password", { user_id: userId, new_password: newPassword });
        appShowToast("Password berhasil direset.", "success");
    } catch (error) {
        appShowToast(error.message, "error");
    }
}

/******************************************************************
 * Function : dashboardAssignMarketingTeam()
 * Tujuan   : Memindahkan marketing ke team lain / tanpa team.
 ******************************************************************/
async function dashboardAssignMarketingTeam(marketingId, teamId) {
    try {
        if (teamId) {
            await apiCall("assign_marketing_team", { marketing_id: marketingId, team_id: teamId });
        } else {
            await apiCall("remove_marketing_team", { marketing_id: marketingId });
        }
        appShowToast("Team marketing berhasil diperbarui.", "success");
    } catch (error) {
        appShowToast(error.message, "error");
    }
}

/******************************************************************
 * SECTION BLOCK : TEAMS TAB
 ******************************************************************/

/******************************************************************
 * Function : dashboardLoadTeamsTab()
 * Tujuan   : Menampilkan daftar team dan form pembuatan team baru.
 ******************************************************************/
async function dashboardLoadTeamsTab() {
    const container = document.getElementById("teamsTableSlot");
    container.innerHTML = "<p>Memuat...</p>";

    try {
        const teams = await apiCall("get_teams", {});

        const rows = teams.map(function (t) {
            const statusBadge = t.status === "ACTIVE" ? '<span class="badge badge-active">ACTIVE</span>' : '<span class="badge badge-inactive">INACTIVE</span>';
            return "<tr><td>" + appEscapeHtml(t.team_name) + "</td><td>" + statusBadge + "</td><td>" +
                (t.status === "ACTIVE"
                    ? '<button class="btn btn-outline btn-sm" onclick="dashboardSetTeamStatus(\'' + t.id + '\', false)">Nonaktifkan</button>'
                    : '<button class="btn btn-outline btn-sm" onclick="dashboardSetTeamStatus(\'' + t.id + '\', true)">Aktifkan</button>') +
                "</td></tr>";
        }).join("");

        container.innerHTML =
            '<div class="table-wrap"><table class="data-table"><thead><tr><th>Nama Team</th><th>Status</th><th>Aksi</th></tr></thead><tbody>' +
            (rows || '<tr><td colspan="3" class="table-empty">Belum ada team.</td></tr>') + "</tbody></table></div>";
    } catch (error) {
        container.innerHTML = '<div class="alert alert-error">' + appEscapeHtml(error.message) + "</div>";
    }
}

/******************************************************************
 * Function : dashboardHandleCreateTeam()
 * Tujuan   : Membuat team baru dari form.
 ******************************************************************/
async function dashboardHandleCreateTeam(event) {
    event.preventDefault();
    const input = document.getElementById("newTeamName");
    const teamName = input.value.trim();
    if (!teamName) return;

    try {
        await apiCall("create_team", { team_name: teamName });
        input.value = "";
        appShowToast("Team berhasil dibuat.", "success");
        dashboardLoadTeamsTab();
    } catch (error) {
        appShowToast(error.message, "error");
    }
}

/******************************************************************
 * Function : dashboardSetTeamStatus()
 * Tujuan   : Mengaktifkan/menonaktifkan team.
 ******************************************************************/
async function dashboardSetTeamStatus(teamId, activate) {
    try {
        await apiCall(activate ? "activate_team" : "deactivate_team", { team_id: teamId });
        appShowToast("Status team berhasil diubah.", "success");
        dashboardLoadTeamsTab();
    } catch (error) {
        appShowToast(error.message, "error");
    }
}

/******************************************************************
 * SECTION BLOCK : FEE RULES TAB
 ******************************************************************/

/******************************************************************
 * Function : dashboardLoadFeeTab()
 * Tujuan   : Menampilkan riwayat aturan fee dan form perubahan.
 ******************************************************************/
async function dashboardLoadFeeTab() {
    const container = document.getElementById("feeTableSlot");
    container.innerHTML = "<p>Memuat...</p>";

    try {
        const rules = await apiCall("get_fee_rules", {});

        const rows = rules.map(function (r) {
            const statusBadge = r.status === "ACTIVE" ? '<span class="badge badge-active">ACTIVE</span>' : '<span class="badge badge-inactive">INACTIVE</span>';
            return "<tr><td>" + r.value + "%</td><td>" + appFormatDate(r.effective_from) + "</td><td>" +
                (r.effective_to ? appFormatDate(r.effective_to) : "-") + "</td><td>" + statusBadge + "</td></tr>";
        }).join("");

        container.innerHTML =
            '<div class="table-wrap"><table class="data-table"><thead><tr><th>Persentase</th><th>Berlaku Dari</th><th>Berlaku Sampai</th><th>Status</th></tr></thead><tbody>' +
            (rows || '<tr><td colspan="4" class="table-empty">Belum ada aturan fee.</td></tr>') + "</tbody></table></div>";
    } catch (error) {
        container.innerHTML = '<div class="alert alert-error">' + appEscapeHtml(error.message) + "</div>";
    }
}

/******************************************************************
 * Function : dashboardHandleUpdateFee()
 * Tujuan   : Mengubah persentase fee marketing yang berlaku mulai
 *            hari ini (riwayat lama tetap tersimpan di backend).
 ******************************************************************/
async function dashboardHandleUpdateFee(event) {
    event.preventDefault();
    const input = document.getElementById("newFeeValue");
    const newValue = input.value;
    if (!newValue) return;

    const confirmed = await appConfirmModal("Ubah fee marketing menjadi " + newValue + "% mulai hari ini?");
    if (!confirmed) return;

    try {
        await apiCall("update_fee_rule", { new_value: newValue });
        input.value = "";
        appShowToast("Aturan fee berhasil diperbarui.", "success");
        dashboardLoadFeeTab();
    } catch (error) {
        appShowToast(error.message, "error");
    }
}

/******************************************************************
 * SECTION BLOCK : AUDIT LOG TAB
 ******************************************************************/

/******************************************************************
 * Function : dashboardLoadAuditTab()
 * Tujuan   : Menampilkan daftar audit log terbaru.
 ******************************************************************/
async function dashboardLoadAuditTab() {
    const container = document.getElementById("auditTableSlot");
    container.innerHTML = "<p>Memuat...</p>";

    try {
        const logs = await apiCall("get_audit_logs", {});

        const rows = logs.map(function (log) {
            return "<tr><td>" + appEscapeHtml(log.time) + "</td><td>" + appEscapeHtml(log.role) + "</td><td>" +
                appEscapeHtml(log.action) + "</td><td>" + appEscapeHtml(log.target_type) + "</td><td>" +
                appEscapeHtml(log.target_id) + "</td></tr>";
        }).join("");

        container.innerHTML =
            '<div class="table-wrap"><table class="data-table"><thead><tr><th>Waktu</th><th>Role</th><th>Action</th><th>Target</th><th>Target ID</th></tr></thead><tbody>' +
            (rows || '<tr><td colspan="5" class="table-empty">Belum ada aktivitas.</td></tr>') + "</tbody></table></div>";
    } catch (error) {
        container.innerHTML = '<div class="alert alert-error">' + appEscapeHtml(error.message) + "</div>";
    }
}
