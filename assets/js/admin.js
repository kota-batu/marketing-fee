/******************************************************************
 * PROJECT      : Marketing Fee & Rombongan Tracking System
 * MODULE       : Frontend Page Logic
 * FILE         : admin.js
 * VERSION      : v1.0.0
 * AUTHOR       : Jimmy Method Generator
 * CREATED      : 2026-09-05
 * LAST UPDATE  : 2026-09-05
 *
 * DESCRIPTION
 * ----------------------------------------------------------------
 * Logika admin.html: menampilkan rombongan hari ini & pending
 * tracking (termasuk pending lama), serta memproses verifikasi
 * DATANG (dengan input total belanja) atau TIDAK DATANG (dengan
 * konfirmasi eksplisit).
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
 * - admin.html
 *
 ******************************************************************/

/******************************************************************
 * Function : adminInit()
 * Tujuan   : Entry point halaman admin.html.
 ******************************************************************/
async function adminInit() {
    const user = authGuardPage(["ADMIN", "SUPER_ADMIN"]);
    if (!user) {
        return;
    }

    appRenderSidebar(user, "admin.html");

    document.getElementById("tabBtnToday").addEventListener("click", function () { adminSwitchView("today"); });
    document.getElementById("tabBtnPending").addEventListener("click", function () { adminSwitchView("pending"); });

    await adminSwitchView("today");
}

/******************************************************************
 * Function : adminSwitchView()
 * Tujuan   : Beralih antara tampilan "Hari Ini" dan "Pending Tracking".
 ******************************************************************/
async function adminSwitchView(view) {
    document.getElementById("tabBtnToday").classList.toggle("active", view === "today");
    document.getElementById("tabBtnPending").classList.toggle("active", view === "pending");

    const tableSlot = document.getElementById("visitsTableSlot");
    tableSlot.innerHTML = "<p>Memuat...</p>";

    try {
        const action = view === "today" ? "get_today_visits" : "get_pending_visits";
        const visits = await apiCall(action, {});
        tableSlot.innerHTML = adminBuildVisitsTable(visits);
    } catch (error) {
        tableSlot.innerHTML = '<div class="alert alert-error">' + appEscapeHtml(error.message) + "</div>";
    }
}

/******************************************************************
 * Function : adminBuildVisitsTable()
 * Tujuan   : Membangun HTML tabel rombongan beserta tombol aksi
 *            verifikasi untuk baris berstatus PENDING.
 ******************************************************************/
function adminBuildVisitsTable(visits) {
    const rows = visits.map(function (v) {
        const actionCell = v.status === "PENDING"
            ? '<button class="btn btn-primary btn-sm" onclick="adminHandleMarkArrived(\'' + v.id + '\')">Datang</button> ' +
              '<button class="btn btn-danger btn-sm" onclick="adminHandleMarkNotArrived(\'' + v.id + '\')">Tidak Datang</button>'
            : "-";

        return "<tr>" +
            "<td>" + appFormatDate(v.visit_date) + "</td>" +
            "<td>" + appEscapeHtml(v.group_name) + "</td>" +
            "<td>" + appEscapeHtml(v.travel_name) + "</td>" +
            "<td>" + v.vehicle_count + "</td>" +
            "<td>" + appRenderStatusBadge(v.status) + "</td>" +
            "<td>" + appFormatRupiah(v.total_spend) + "</td>" +
            "<td>" + actionCell + "</td>" +
            "</tr>";
    }).join("");

    return '<div class="table-wrap"><table class="data-table"><thead><tr>' +
        "<th>Tanggal</th><th>Rombongan</th><th>Travel</th><th>Bus</th><th>Status</th><th>Belanja</th><th>Aksi</th>" +
        "</tr></thead><tbody>" +
        (rows || '<tr><td colspan="7" class="table-empty">Tidak ada data.</td></tr>') +
        "</tbody></table></div>";
}

/******************************************************************
 * Function : adminHandleMarkArrived()
 * Tujuan   : Meminta input total belanja lalu menandai rombongan
 *            sebagai ARRIVED.
 ******************************************************************/
async function adminHandleMarkArrived(visitId) {
    const totalSpendRaw = await appPromptModal("Total belanja aktual (Rp):", "number");
    if (totalSpendRaw === null || totalSpendRaw === "") {
        return;
    }

    try {
        await apiCall("mark_arrived", { visit_id: visitId, total_spend: totalSpendRaw });
        appShowToast("Rombongan ditandai DATANG.", "success");
        await adminSwitchView(document.getElementById("tabBtnToday").classList.contains("active") ? "today" : "pending");
    } catch (error) {
        appShowToast(error.message, "error");
    }
}

/******************************************************************
 * Function : adminHandleMarkNotArrived()
 * Tujuan   : Meminta konfirmasi eksplisit lalu menandai rombongan
 *            sebagai NOT_ARRIVED (belanja & fee otomatis 0).
 ******************************************************************/
async function adminHandleMarkNotArrived(visitId) {
    const confirmed = await appConfirmModal("Apakah rombongan ini benar-benar tidak datang?");
    if (!confirmed) {
        return;
    }

    try {
        await apiCall("mark_not_arrived", { visit_id: visitId, confirmed: true });
        appShowToast("Rombongan ditandai TIDAK DATANG.", "success");
        await adminSwitchView(document.getElementById("tabBtnToday").classList.contains("active") ? "today" : "pending");
    } catch (error) {
        appShowToast(error.message, "error");
    }
}
