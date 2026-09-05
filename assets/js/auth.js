/******************************************************************
 * PROJECT      : Marketing Fee & Rombongan Tracking System
 * MODULE       : Frontend Core
 * FILE         : auth.js
 * VERSION      : v1.0.0
 * AUTHOR       : Jimmy Method Generator
 * CREATED      : 2026-09-05
 * LAST UPDATE  : 2026-09-05
 *
 * DESCRIPTION
 * ----------------------------------------------------------------
 * Menangani proses login, logout, dan penjagaan akses halaman
 * (authGuardPage) berdasarkan role yang tersimpan di sesi.
 * PENTING: guard ini hanya untuk UX (menyembunyikan halaman).
 * Otorisasi SEBENARNYA tetap dilakukan backend (frontend hiding
 * bukan security - lihat Blueprint Aturan 5).
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
 * - api.js
 * - app.js (appShowToast)
 *
 * Used By
 * - login.html
 * - Seluruh halaman ber-guard (dashboard, marketing, admin, report,
 *   register-admin, register-marketing)
 *
 ******************************************************************/

/******************************************************************
 * Function : authHandleLoginSubmit()
 * Tujuan   : Memproses submit form login, menyimpan sesi jika
 *            berhasil, lalu mengarahkan ke dashboard.
 ******************************************************************/
async function authHandleLoginSubmit(event) {
    event.preventDefault();

    const username = document.getElementById("loginUsername").value.trim();
    const password = document.getElementById("loginPassword").value;
    const submitButton = document.getElementById("loginSubmitButton");
    const errorBox = document.getElementById("loginErrorBox");

    errorBox.classList.add("hidden");
    submitButton.disabled = true;
    submitButton.textContent = "Memproses...";

    try {
        const result = await apiCall("login", { username: username, password: password });
        apiStoreSession(result.session, result.user);
        window.location.href = "dashboard.html";
    } catch (error) {
        errorBox.textContent = error.message;
        errorBox.classList.remove("hidden");
    } finally {
        submitButton.disabled = false;
        submitButton.textContent = "Masuk";
    }
}

/******************************************************************
 * Function : authHandleLogout()
 * Tujuan   : Mencabut sesi di backend lalu mengembalikan user ke
 *            halaman login.
 ******************************************************************/
async function authHandleLogout() {
    try {
        await apiCall("logout", {});
    } catch (error) {
        console.error("[LOGOUT]", error);
    }
    apiClearSession();
    window.location.href = "login.html";
}

/******************************************************************
 * Function : authGuardPage()
 * Tujuan   : Memastikan hanya user dengan sesi valid dan role yang
 *            diizinkan yang dapat melihat isi halaman. Dipanggil di
 *            awal setiap halaman terproteksi.
 ******************************************************************/
function authGuardPage(allowedRoles) {
    const session = apiGetStoredSession();
    const user = apiGetStoredUser();

    if (!session || !user) {
        window.location.href = "login.html";
        return null;
    }

    if (allowedRoles && allowedRoles.indexOf(user.role) === -1) {
        window.location.href = "dashboard.html";
        return null;
    }

    return user;
}
