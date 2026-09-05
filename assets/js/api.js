/******************************************************************
 * PROJECT      : Marketing Fee & Rombongan Tracking System
 * MODULE       : Frontend Core
 * FILE         : api.js
 * VERSION      : v1.0.0
 * AUTHOR       : Jimmy Method Generator
 * CREATED      : 2026-09-05
 * LAST UPDATE  : 2026-09-05
 *
 * DESCRIPTION
 * ----------------------------------------------------------------
 * Satu-satunya titik komunikasi frontend ke backend Apps Script.
 * Semua pemanggilan API di seluruh halaman WAJIB lewat apiCall(),
 * supaya format request/response konsisten dan mudah didebug.
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
 * - config/public-config.js (CONFIG.API_BASE_URL)
 *
 * Used By
 * - auth.js, dashboard.js, marketing.js, admin.js, report.js, register.js
 *
 ******************************************************************/

/******************************************************************
 * CONSTANTS
 ******************************************************************/

const API_SESSION_STORAGE_KEY = "MFS_SESSION_TOKEN";
const API_USER_STORAGE_KEY = "MFS_CURRENT_USER";
const API_ERROR_CODE_UNAUTHORIZED = "UNAUTHORIZED";

/******************************************************************
 * Function : apiGenerateRequestId()
 * Tujuan   : Membuat request_id unik untuk setiap pemanggilan API,
 *            memudahkan penelusuran log di backend.
 ******************************************************************/
function apiGenerateRequestId() {
    return "REQ-" + Date.now() + "-" + Math.floor(Math.random() * 100000);
}

/******************************************************************
 * Function : apiCall()
 * Tujuan   : Mengirim satu action ke backend Apps Script dan
 *            mengembalikan data hasil. Melempar Error jika gagal.
 ******************************************************************/
async function apiCall(action, payload) {
    const requestId = apiGenerateRequestId();

    const requestBody = {
        action: action,
        session: apiGetStoredSession() || "",
        timestamp: new Date().toISOString(),
        request_id: requestId,
        payload: payload || {}
    };

    console.log("[API_CALL]", action, requestId);

    let response;
    try {
        response = await fetch(CONFIG.API_BASE_URL, {
            method: "POST",
            headers: { "Content-Type": "text/plain;charset=utf-8" },
            body: JSON.stringify(requestBody)
        });
    } catch (networkError) {
        console.error("[API_CALL_NETWORK_ERROR]", action, networkError);
        throw new Error("Tidak dapat terhubung ke server. Periksa koneksi internet Anda.");
    }

    let responseBody;
    try {
        responseBody = await response.json();
    } catch (parseError) {
        console.error("[API_CALL_PARSE_ERROR]", action, parseError);
        throw new Error("Respons server tidak valid.");
    }

    if (!responseBody.success) {
        console.error("[API_CALL_ERROR]", action, responseBody.error);

        if (responseBody.error && responseBody.error.code === API_ERROR_CODE_UNAUTHORIZED) {
            apiClearSession();
            window.location.href = "login.html";
        }

        throw new Error((responseBody.error && responseBody.error.message) || "Terjadi kesalahan.");
    }

    return responseBody.data;
}

/******************************************************************
 * SESSION STORAGE HELPERS
 * ----------------------------------------------------------------
 * Session disimpan di sessionStorage (bukan localStorage) sesuai
 * Blueprint Aturan 48 - hilang otomatis saat tab ditutup.
 ******************************************************************/

/******************************************************************
 * Function : apiStoreSession()
 * Tujuan   : Menyimpan session token dan data user ke sessionStorage.
 ******************************************************************/
function apiStoreSession(token, user) {
    sessionStorage.setItem(API_SESSION_STORAGE_KEY, token);
    sessionStorage.setItem(API_USER_STORAGE_KEY, JSON.stringify(user));
}

/******************************************************************
 * Function : apiGetStoredSession()
 * Tujuan   : Mengambil session token yang tersimpan, jika ada.
 ******************************************************************/
function apiGetStoredSession() {
    return sessionStorage.getItem(API_SESSION_STORAGE_KEY);
}

/******************************************************************
 * Function : apiGetStoredUser()
 * Tujuan   : Mengambil data user yang sedang login dari sessionStorage.
 ******************************************************************/
function apiGetStoredUser() {
    const raw = sessionStorage.getItem(API_USER_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
}

/******************************************************************
 * Function : apiClearSession()
 * Tujuan   : Menghapus seluruh data sesi dari sessionStorage.
 ******************************************************************/
function apiClearSession() {
    sessionStorage.removeItem(API_SESSION_STORAGE_KEY);
    sessionStorage.removeItem(API_USER_STORAGE_KEY);
}
