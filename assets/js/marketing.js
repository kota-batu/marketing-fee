/******************************************************************
 * PROJECT      : Marketing Fee & Rombongan Tracking System
 * MODULE       : Frontend Page Logic
 * FILE         : marketing.js
 * VERSION      : v1.0.0
 * AUTHOR       : Jimmy Method Generator
 * CREATED      : 2026-09-05
 * LAST UPDATE  : 2026-09-05
 *
 * DESCRIPTION
 * ----------------------------------------------------------------
 * Logika marketing.html: form pendaftaran rombongan baru dan
 * daftar rombongan yang sudah didaftarkan oleh marketing yang
 * sedang login (MARKETING_ID diambil dari sesi, bukan dari form).
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
 * - marketing.html
 *
 ******************************************************************/

/******************************************************************
 * Function : marketingInit()
 * Tujuan   : Entry point halaman marketing.html.
 ******************************************************************/
async function marketingInit() {
    const user = authGuardPage(["MARKETING"]);
    if (!user) {
        return;
    }

    appRenderSidebar(user, "marketing.html");
    document.getElementById("visitDate").valueAsDate = new Date();

    document.getElementById("createVisitForm").addEventListener("submit", marketingHandleCreateVisit);

    await marketingLoadMyVisits();
}

/******************************************************************
 * Function : marketingHandleCreateVisit()
 * Tujuan   : Mengirim data rombongan baru ke backend.
 ******************************************************************/
async function marketingHandleCreateVisit(event) {
    event.preventDefault();

    const submitButton = document.getElementById("createVisitSubmitButton");
    submitButton.disabled = true;
    submitButton.textContent = "Menyimpan...";

    const payload = {
        visit_date: document.getElementById("visitDate").value,
        group_name: document.getElementById("groupName").value.trim(),
        travel_name: document.getElementById("travelName").value.trim(),
        vehicle_count: document.getElementById("vehicleCount").value
    };

    try {
        await apiCall("create_visit", payload);
        appShowToast("Rombongan berhasil didaftarkan.", "success");
        document.getElementById("createVisitForm").reset();
        document.getElementById("visitDate").valueAsDate = new Date();
        await marketingLoadMyVisits();
    } catch (error) {
        appShowToast(error.message, "error");
    } finally {
        submitButton.disabled = false;
        submitButton.textContent = "Daftarkan Rombongan";
    }
}

/******************************************************************
 * Function : marketingLoadMyVisits()
 * Tujuan   : Mengambil dan menampilkan daftar rombongan milik
 *            marketing yang sedang login, dengan filter bulan/tahun.
 ******************************************************************/
async function marketingLoadMyVisits() {
    const tableSlot = document.getElementById("myVisitsTableSlot");
    tableSlot.innerHTML = "<p>Memuat...</p>";

    const monthYear = appGetCurrentMonthYear();

    try {
        const visits = await apiCall("get_my_visits", { month: monthYear.month, year: monthYear.year });

        const rows = visits.map(function (v) {
            return "<tr>" +
                "<td>" + appFormatDate(v.visit_date) + "</td>" +
                "<td>" + appEscapeHtml(v.group_name) + "</td>" +
                "<td>" + appEscapeHtml(v.travel_name) + "</td>" +
                "<td>" + v.vehicle_count + "</td>" +
                "<td>" + appRenderStatusBadge(v.status) + "</td>" +
                "<td>" + appFormatRupiah(v.total_spend) + "</td>" +
                "<td>" + appFormatRupiah(v.fee_amount) + "</td>" +
                "</tr>";
        }).join("");

        tableSlot.innerHTML =
            '<div class="table-wrap"><table class="data-table"><thead><tr>' +
            "<th>Tanggal</th><th>Rombongan</th><th>Travel</th><th>Bus</th><th>Status</th><th>Belanja</th><th>Fee</th>" +
            "</tr></thead><tbody>" +
            (rows || '<tr><td colspan="7" class="table-empty">Belum ada rombongan bulan ini.</td></tr>') +
            "</tbody></table></div>";
    } catch (error) {
        tableSlot.innerHTML = '<div class="alert alert-error">' + appEscapeHtml(error.message) + "</div>";
    }
}
