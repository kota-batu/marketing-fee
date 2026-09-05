/******************************************************************
 * PROJECT      : Marketing Fee & Rombongan Tracking System
 * MODULE       : Frontend Page Logic
 * FILE         : register.js
 * VERSION      : v1.0.0
 * AUTHOR       : Jimmy Method Generator
 * CREATED      : 2026-09-05
 * LAST UPDATE  : 2026-09-05
 *
 * DESCRIPTION
 * ----------------------------------------------------------------
 * Logika bersama untuk register-admin.html dan register-marketing.html.
 * Halaman ini hanya boleh diakses SUPER_ADMIN - backend tetap
 * menolak akses walau URL diketahui pihak lain (Blueprint Aturan 5).
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
 * - register-admin.html (registerInit("ADMIN"))
 * - register-marketing.html (registerInit("MARKETING"))
 *
 ******************************************************************/

let registerTargetRole = null;

/******************************************************************
 * Function : registerInit()
 * Tujuan   : Entry point halaman register-admin.html / register-marketing.html.
 ******************************************************************/
async function registerInit(targetRole) {
    const user = authGuardPage(["SUPER_ADMIN"]);
    if (!user) {
        return;
    }

    registerTargetRole = targetRole;
    appRenderSidebar(user, targetRole === "ADMIN" ? "register-admin.html" : "register-marketing.html");

    if (targetRole === "MARKETING") {
        document.getElementById("teamFieldGroup").classList.remove("hidden");
        await registerPopulateTeamOptions();
    }

    document.getElementById("registerForm").addEventListener("submit", registerHandleSubmit);

    await registerLoadExistingUsers();
}

/******************************************************************
 * Function : registerPopulateTeamOptions()
 * Tujuan   : Mengisi dropdown pilihan team untuk registrasi marketing.
 ******************************************************************/
async function registerPopulateTeamOptions() {
    try {
        const teams = await apiCall("get_teams", { status: "ACTIVE" });
        const select = document.getElementById("registerTeamId");
        select.innerHTML = '<option value="">Tanpa Team</option>' + teams.map(function (t) {
            return '<option value="' + t.id + '">' + appEscapeHtml(t.team_name) + "</option>";
        }).join("");
    } catch (error) {
        appShowToast(error.message, "error");
    }
}

/******************************************************************
 * Function : registerHandleSubmit()
 * Tujuan   : Mengirim data user baru (ADMIN atau MARKETING) ke backend.
 ******************************************************************/
async function registerHandleSubmit(event) {
    event.preventDefault();

    const submitButton = document.getElementById("registerSubmitButton");
    submitButton.disabled = true;
    submitButton.textContent = "Menyimpan...";

    const payload = {
        username: document.getElementById("registerUsername").value.trim(),
        password: document.getElementById("registerPassword").value,
        name: document.getElementById("registerName").value.trim()
    };

    if (registerTargetRole === "MARKETING") {
        payload.team_id = document.getElementById("registerTeamId").value;
    }

    try {
        const action = registerTargetRole === "ADMIN" ? "create_admin" : "create_marketing";
        await apiCall(action, payload);
        appShowToast("User berhasil dibuat.", "success");
        document.getElementById("registerForm").reset();
        await registerLoadExistingUsers();
    } catch (error) {
        appShowToast(error.message, "error");
    } finally {
        submitButton.disabled = false;
        submitButton.textContent = "Buat Akun";
    }
}

/******************************************************************
 * Function : registerLoadExistingUsers()
 * Tujuan   : Menampilkan daftar user dengan role yang sesuai
 *            halaman ini (ADMIN atau MARKETING), lengkap dengan
 *            aksi aktivasi/nonaktivasi dan reset password.
 ******************************************************************/
async function registerLoadExistingUsers() {
    const container = document.getElementById("existingUsersSlot");
    container.innerHTML = "<p>Memuat...</p>";

    try {
        const users = await apiCall("get_users", { role: registerTargetRole });

        const rows = users.map(function (u) {
            const statusBadge = u.status === "ACTIVE" ? '<span class="badge badge-active">ACTIVE</span>' : '<span class="badge badge-inactive">INACTIVE</span>';
            return "<tr><td>" + appEscapeHtml(u.name) + "</td><td>" + appEscapeHtml(u.username) + "</td><td>" +
                statusBadge + "</td><td>" +
                (u.status === "ACTIVE"
                    ? '<button class="btn btn-outline btn-sm" onclick="registerSetUserStatus(\'' + u.id + '\', false)">Nonaktifkan</button>'
                    : '<button class="btn btn-outline btn-sm" onclick="registerSetUserStatus(\'' + u.id + '\', true)">Aktifkan</button>') +
                ' <button class="btn btn-outline btn-sm" onclick="registerResetPassword(\'' + u.id + '\')">Reset Password</button>' +
                "</td></tr>";
        }).join("");

        container.innerHTML =
            '<div class="table-wrap"><table class="data-table"><thead><tr><th>Nama</th><th>Username</th><th>Status</th><th>Aksi</th></tr></thead><tbody>' +
            (rows || '<tr><td colspan="4" class="table-empty">Belum ada data.</td></tr>') + "</tbody></table></div>";
    } catch (error) {
        container.innerHTML = '<div class="alert alert-error">' + appEscapeHtml(error.message) + "</div>";
    }
}

/******************************************************************
 * Function : registerSetUserStatus()
 * Tujuan   : Mengaktifkan/menonaktifkan user dari daftar.
 ******************************************************************/
async function registerSetUserStatus(userId, activate) {
    const confirmed = await appConfirmModal(activate ? "Aktifkan user ini?" : "Nonaktifkan user ini? Sesi login user akan dicabut.");
    if (!confirmed) return;

    try {
        await apiCall(activate ? "activate_user" : "deactivate_user", { user_id: userId });
        appShowToast("Status user berhasil diubah.", "success");
        await registerLoadExistingUsers();
    } catch (error) {
        appShowToast(error.message, "error");
    }
}

/******************************************************************
 * Function : registerResetPassword()
 * Tujuan   : Mereset password user dari daftar.
 ******************************************************************/
async function registerResetPassword(userId) {
    const newPassword = await appPromptModal("Password baru untuk user ini:", "text");
    if (!newPassword) return;

    try {
        await apiCall("reset_password", { user_id: userId, new_password: newPassword });
        appShowToast("Password berhasil direset.", "success");
    } catch (error) {
        appShowToast(error.message, "error");
    }
}
