/******************************************************************
 * PROJECT      : Marketing Fee & Rombongan Tracking System
 * MODULE       : Frontend Core
 * FILE         : app.js
 * VERSION      : v1.0.0
 * AUTHOR       : Jimmy Method Generator
 * CREATED      : 2026-09-05
 * LAST UPDATE  : 2026-09-05
 *
 * DESCRIPTION
 * ----------------------------------------------------------------
 * Kumpulan helper UI yang dipakai di banyak halaman: render sidebar
 * sesuai role, toast notifikasi, format Rupiah/tanggal, dan badge
 * status visit.
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
 * - api.js (apiGetStoredUser)
 * - auth.js (authHandleLogout)
 *
 * Used By
 * - Seluruh halaman ber-sidebar
 *
 ******************************************************************/

/******************************************************************
 * CONSTANTS
 ******************************************************************/

const APP_TOAST_DURATION_MS = 3500;

const APP_NAV_BY_ROLE = {
    SUPER_ADMIN: [
        { href: "dashboard.html", label: "Dashboard" },
        { href: "admin.html", label: "Tracking" },
        { href: "report.html", label: "Reports" },
        { href: "register-admin.html", label: "Register Admin" },
        { href: "register-marketing.html", label: "Register Marketing" }
    ],
    ADMIN: [
        { href: "dashboard.html", label: "Dashboard" },
        { href: "admin.html", label: "Tracking" },
        { href: "report.html", label: "Reports" }
    ],
    MARKETING: [
        { href: "dashboard.html", label: "Dashboard" },
        { href: "marketing.html", label: "Daftar Rombongan" },
        { href: "report.html", label: "Laporan Saya" }
    ]
};

/******************************************************************
 * Function : appRenderSidebar()
 * Tujuan   : Merender sidebar navigasi sesuai role user, dan
 *            menandai menu aktif berdasarkan halaman saat ini.
 ******************************************************************/
function appRenderSidebar(user, activePage) {
    const sidebarSlot = document.getElementById("sidebarSlot");
    if (!sidebarSlot) {
        return;
    }

    const navItems = APP_NAV_BY_ROLE[user.role] || [];
    const navHtml = navItems.map(function (item) {
        const activeClass = item.href === activePage ? " active" : "";
        return '<a class="' + activeClass.trim() + '" href="' + item.href + '">' + item.label + "</a>";
    }).join("");

    sidebarSlot.innerHTML =
        '<div class="sidebar-brand">Marketing Fee</div>' +
        '<div class="sidebar-role">' + appEscapeHtml(user.role.replace("_", " ")) + '</div>' +
        '<nav class="sidebar-nav">' + navHtml + "</nav>" +
        '<div class="sidebar-footer">' +
        '<div class="sidebar-user">' + appEscapeHtml(user.name) + "</div>" +
        '<button class="btn-logout" onclick="authHandleLogout()">Keluar</button>' +
        "</div>";
}

/******************************************************************
 * Function : appShowToast()
 * Tujuan   : Menampilkan notifikasi sementara di pojok kanan atas.
 ******************************************************************/
function appShowToast(message, type) {
    let container = document.getElementById("toastContainer");
    if (!container) {
        container = document.createElement("div");
        container.id = "toastContainer";
        container.className = "toast-container";
        document.body.appendChild(container);
    }

    const toast = document.createElement("div");
    toast.className = "toast " + (type === "error" ? "toast-error" : "toast-success");
    toast.textContent = message;
    container.appendChild(toast);

    setTimeout(function () {
        toast.remove();
    }, APP_TOAST_DURATION_MS);
}

/******************************************************************
 * Function : appFormatRupiah()
 * Tujuan   : Memformat angka menjadi string Rupiah, contoh:
 *            10000000 -> "Rp10.000.000".
 ******************************************************************/
function appFormatRupiah(amount) {
    const numberValue = Number(amount) || 0;
    return "Rp" + numberValue.toLocaleString("id-ID", { maximumFractionDigits: 0 });
}

/******************************************************************
 * Function : appFormatDate()
 * Tujuan   : Memformat tanggal yyyy-MM-dd menjadi dd-MM-yyyy.
 ******************************************************************/
function appFormatDate(dateString) {
    if (!dateString) {
        return "-";
    }
    const parts = String(dateString).split("-");
    if (parts.length !== 3) {
        return dateString;
    }
    return parts[2] + "-" + parts[1] + "-" + parts[0];
}

/******************************************************************
 * Function : appRenderStatusBadge()
 * Tujuan   : Mengubah status visit menjadi elemen badge berwarna.
 ******************************************************************/
function appRenderStatusBadge(status) {
    const labelMap = {
        PENDING: "❓ Belum Tracking",
        ARRIVED: "✅ Datang",
        NOT_ARRIVED: "❌ Tidak Datang"
    };
    const classMap = {
        PENDING: "badge-pending",
        ARRIVED: "badge-arrived",
        NOT_ARRIVED: "badge-not-arrived"
    };
    const label = labelMap[status] || status;
    const cssClass = classMap[status] || "badge-pending";
    return '<span class="badge ' + cssClass + '">' + label + "</span>";
}

/******************************************************************
 * Function : appEscapeHtml()
 * Tujuan   : Mencegah XSS sederhana saat menampilkan data user ke DOM.
 ******************************************************************/
function appEscapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text === undefined || text === null ? "" : String(text);
    return div.innerHTML;
}

/******************************************************************
 * Function : appGetCurrentMonthYear()
 * Tujuan   : Mengambil bulan & tahun berjalan, dipakai sebagai
 *            default filter di dashboard/report.
 ******************************************************************/
function appGetCurrentMonthYear() {
    const now = new Date();
    return { month: now.getMonth() + 1, year: now.getFullYear() };
}

/******************************************************************
 * GENERIC MODAL HELPERS
 * ----------------------------------------------------------------
 * Modal ringan berbasis Promise, dipakai di dashboard.js dan
 * admin.js untuk konfirmasi aksi kritikal maupun input singkat.
 ******************************************************************/

/******************************************************************
 * Function : appConfirmModal()
 * Tujuan   : Menampilkan modal konfirmasi Ya/Batal, mengembalikan
 *            Promise<boolean>.
 ******************************************************************/
function appConfirmModal(message) {
    return new Promise(function (resolve) {
        const overlay = document.createElement("div");
        overlay.className = "modal-overlay";
        overlay.innerHTML =
            '<div class="modal-box">' +
            '<p>' + appEscapeHtml(message) + "</p>" +
            '<div class="modal-actions">' +
            '<button class="btn btn-outline" id="appModalCancelBtn">Batal</button>' +
            '<button class="btn btn-danger" id="appModalConfirmBtn">Ya, Lanjutkan</button>' +
            "</div></div>";
        document.body.appendChild(overlay);

        overlay.querySelector("#appModalCancelBtn").onclick = function () {
            overlay.remove();
            resolve(false);
        };
        overlay.querySelector("#appModalConfirmBtn").onclick = function () {
            overlay.remove();
            resolve(true);
        };
    });
}

/******************************************************************
 * Function : appPromptModal()
 * Tujuan   : Menampilkan modal input teks singkat (mis. total
 *            belanja, password baru), mengembalikan Promise<string|null>.
 ******************************************************************/
function appPromptModal(labelText, inputType) {
    return new Promise(function (resolve) {
        const overlay = document.createElement("div");
        overlay.className = "modal-overlay";
        overlay.innerHTML =
            '<div class="modal-box">' +
            '<div class="form-group">' +
            '<label class="form-label">' + appEscapeHtml(labelText) + "</label>" +
            '<input class="form-input" id="appModalPromptInput" type="' + (inputType || "text") + '" />' +
            "</div>" +
            '<div class="modal-actions">' +
            '<button class="btn btn-outline" id="appModalCancelBtn">Batal</button>' +
            '<button class="btn btn-primary" id="appModalOkBtn">Konfirmasi</button>' +
            "</div></div>";
        document.body.appendChild(overlay);

        const inputEl = overlay.querySelector("#appModalPromptInput");
        inputEl.focus();

        overlay.querySelector("#appModalCancelBtn").onclick = function () {
            overlay.remove();
            resolve(null);
        };
        overlay.querySelector("#appModalOkBtn").onclick = function () {
            const value = inputEl.value;
            overlay.remove();
            resolve(value);
        };
    });
}
