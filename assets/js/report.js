/******************************************************************
 * PROJECT      : Marketing Fee & Rombongan Tracking System
 * MODULE       : Frontend Page Logic
 * FILE         : report.js
 * VERSION      : v1.0.0
 * AUTHOR       : Jimmy Method Generator
 * CREATED      : 2026-09-05
 * LAST UPDATE  : 2026-09-05
 *
 * DESCRIPTION
 * ----------------------------------------------------------------
 * Logika report.html: filter bulan/tahun/team/marketing/status,
 * 4 jenis laporan (ALL/TEAM/INDIVIDUAL/TANPA_TEAM), render tabel
 * ringkasan, dan unduh laporan sebagai PDF.
 * MARKETING otomatis hanya melihat laporan miliknya sendiri
 * (dipaksa juga oleh backend sebagai defense in depth).
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
 * - report.html
 *
 ******************************************************************/

/******************************************************************
 * CONSTANTS
 ******************************************************************/

let reportCurrentUser = null;

/******************************************************************
 * Function : reportInit()
 * Tujuan   : Entry point halaman report.html.
 ******************************************************************/
async function reportInit() {
    const user = authGuardPage(null);
    if (!user) {
        return;
    }
    reportCurrentUser = user;

    appRenderSidebar(user, "report.html");

    const monthYear = appGetCurrentMonthYear();
    document.getElementById("filterMonth").value = monthYear.month;
    document.getElementById("filterYear").value = monthYear.year;

    if (user.role === "MARKETING") {
        document.getElementById("filterTypeGroup").classList.add("hidden");
        document.getElementById("filterTeamGroup").classList.add("hidden");
        document.getElementById("filterMarketingGroup").classList.add("hidden");
    } else {
        await reportPopulateFilterOptions();
        document.getElementById("filterType").addEventListener("change", reportHandleTypeChange);
        reportHandleTypeChange();
    }

    document.getElementById("reportFilterForm").addEventListener("submit", function (event) {
        event.preventDefault();
        reportLoadData();
    });
    document.getElementById("downloadPdfButton").addEventListener("click", reportHandleDownloadPdf);

    await reportLoadData();
}

/******************************************************************
 * Function : reportPopulateFilterOptions()
 * Tujuan   : Mengisi dropdown Team dan Marketing untuk ADMIN/SUPER_ADMIN.
 ******************************************************************/
async function reportPopulateFilterOptions() {
    try {
        const [teams, users] = await Promise.all([
            apiCall("get_teams", {}),
            apiCall("get_users", { role: "MARKETING" })
        ]);

        const teamSelect = document.getElementById("filterTeam");
        teamSelect.innerHTML = '<option value="">Pilih Team</option>' + teams.map(function (t) {
            return '<option value="' + t.id + '">' + appEscapeHtml(t.team_name) + "</option>";
        }).join("");

        const marketingSelect = document.getElementById("filterMarketing");
        marketingSelect.innerHTML = '<option value="">Pilih Marketing</option>' + users.map(function (u) {
            return '<option value="' + u.id + '">' + appEscapeHtml(u.name) + "</option>";
        }).join("");
    } catch (error) {
        appShowToast(error.message, "error");
    }
}

/******************************************************************
 * Function : reportHandleTypeChange()
 * Tujuan   : Menampilkan/menyembunyikan filter Team atau Marketing
 *            sesuai jenis laporan yang dipilih.
 ******************************************************************/
function reportHandleTypeChange() {
    const type = document.getElementById("filterType").value;
    document.getElementById("filterTeamGroup").classList.toggle("hidden", type !== "TEAM");
    document.getElementById("filterMarketingGroup").classList.toggle("hidden", type !== "INDIVIDUAL");
}

/******************************************************************
 * Function : reportBuildFilterPayload()
 * Tujuan   : Mengumpulkan seluruh nilai filter dari form menjadi
 *            satu payload siap kirim ke backend.
 ******************************************************************/
function reportBuildFilterPayload() {
    const payload = {
        month: document.getElementById("filterMonth").value,
        year: document.getElementById("filterYear").value,
        status: document.getElementById("filterStatus").value
    };

    if (reportCurrentUser.role !== "MARKETING") {
        payload.type = document.getElementById("filterType").value;
        payload.team_id = document.getElementById("filterTeam").value;
        payload.marketing_id = document.getElementById("filterMarketing").value;
    }

    return payload;
}

/******************************************************************
 * Function : reportLoadData()
 * Tujuan   : Mengambil data laporan dari backend dan merendernya
 *            sesuai jenis laporan (ALL/TEAM/INDIVIDUAL/TANPA_TEAM).
 ******************************************************************/
async function reportLoadData() {
    const resultSlot = document.getElementById("reportResultSlot");
    resultSlot.innerHTML = "<p>Memuat laporan...</p>";

    try {
        const payload = reportBuildFilterPayload();
        const data = await apiCall("get_report", payload);

        if (data.type === "TEAM") {
            resultSlot.innerHTML = reportRenderGroupedReport(data.per_marketing, "Marketing", data.total, "Team: " + appEscapeHtml(data.team_name || ""));
        } else if (data.type === "TANPA_TEAM") {
            resultSlot.innerHTML = reportRenderGroupedReport(data.per_marketing, "Marketing", data.total, "Marketing Tanpa Team");
        } else if (data.type === "INDIVIDUAL") {
            resultSlot.innerHTML = reportRenderIndividualReport(data);
        } else {
            resultSlot.innerHTML = reportRenderAllReport(data);
        }
    } catch (error) {
        resultSlot.innerHTML = '<div class="alert alert-error">' + appEscapeHtml(error.message) + "</div>";
    }
}

/******************************************************************
 * Function : reportRenderAllReport()
 * Tujuan   : Merender laporan ALL (breakdown per team + tanpa team
 *            + grand total).
 ******************************************************************/
function reportRenderAllReport(data) {
    const teamRows = (data.teams || []).map(function (t) {
        return "<tr><td>" + appEscapeHtml(t.team_name) + "</td><td>" + t.marketing_count + "</td><td>" +
            t.rombongan + "</td><td>" + t.bus + "</td><td>" + appFormatRupiah(t.belanja) + "</td><td>" + appFormatRupiah(t.fee) + "</td></tr>";
    }).join("");

    const tanpaTeamRow = "<tr><td>TANPA TEAM</td><td>" + data.tanpa_team.marketing_count + "</td><td>" +
        data.tanpa_team.rombongan + "</td><td>" + data.tanpa_team.bus + "</td><td>" +
        appFormatRupiah(data.tanpa_team.belanja) + "</td><td>" + appFormatRupiah(data.tanpa_team.fee) + "</td></tr>";

    return '<div class="table-wrap"><table class="data-table"><thead><tr>' +
        "<th>Kelompok</th><th>Jml Marketing</th><th>Rombongan</th><th>Bus</th><th>Belanja</th><th>Fee</th>" +
        "</tr></thead><tbody>" + teamRows + tanpaTeamRow + "</tbody><tfoot><tr>" +
        "<td colspan='2'>TOTAL</td><td>" + data.total.rombongan + "</td><td>" + data.total.bus + "</td><td>" +
        appFormatRupiah(data.total.belanja) + "</td><td>" + appFormatRupiah(data.total.fee) + "</td></tr></tfoot></table></div>";
}

/******************************************************************
 * Function : reportRenderGroupedReport()
 * Tujuan   : Merender laporan berbentuk breakdown per marketing
 *            (dipakai untuk tipe TEAM dan TANPA_TEAM).
 ******************************************************************/
function reportRenderGroupedReport(rows, groupLabel, total, title) {
    const bodyRows = (rows || []).map(function (r) {
        return "<tr><td>" + appEscapeHtml(r.marketing_name) + "</td><td>" + r.rombongan + "</td><td>" +
            r.bus + "</td><td>" + appFormatRupiah(r.belanja) + "</td><td>" + appFormatRupiah(r.fee) + "</td></tr>";
    }).join("");

    return "<h3 class='card-title'>" + title + "</h3>" +
        '<div class="table-wrap"><table class="data-table"><thead><tr>' +
        "<th>" + groupLabel + "</th><th>Rombongan</th><th>Bus</th><th>Belanja</th><th>Fee</th>" +
        "</tr></thead><tbody>" +
        (bodyRows || '<tr><td colspan="5" class="table-empty">Tidak ada data.</td></tr>') +
        "</tbody><tfoot><tr><td>TOTAL</td><td>" + total.rombongan + "</td><td>" + total.bus + "</td><td>" +
        appFormatRupiah(total.belanja) + "</td><td>" + appFormatRupiah(total.fee) + "</td></tr></tfoot></table></div>";
}

/******************************************************************
 * Function : reportRenderIndividualReport()
 * Tujuan   : Merender laporan detail per visit untuk satu marketing.
 ******************************************************************/
function reportRenderIndividualReport(data) {
    const rows = (data.visits || []).map(function (v) {
        return "<tr><td>" + appFormatDate(v.visit_date) + "</td><td>" + appEscapeHtml(v.group_name) + "</td><td>" +
            appEscapeHtml(v.travel_name) + "</td><td>" + v.vehicle_count + "</td><td>" + appRenderStatusBadge(v.status) +
            "</td><td>" + appFormatRupiah(v.total_spend) + "</td><td>" + appFormatRupiah(v.fee_amount) + "</td><td>" +
            appEscapeHtml(v.team_name) + "</td></tr>";
    }).join("");

    return "<h3 class='card-title'>Marketing: " + appEscapeHtml(data.marketing_name || "") + "</h3>" +
        '<div class="table-wrap"><table class="data-table"><thead><tr>' +
        "<th>Tanggal</th><th>Rombongan</th><th>Travel</th><th>Bus</th><th>Status</th><th>Belanja</th><th>Fee</th><th>Team</th>" +
        "</tr></thead><tbody>" +
        (rows || '<tr><td colspan="8" class="table-empty">Tidak ada data.</td></tr>') +
        "</tbody><tfoot><tr><td colspan='3'>TOTAL</td><td>" + data.total.bus + "</td><td></td><td>" +
        appFormatRupiah(data.total.belanja) + "</td><td>" + appFormatRupiah(data.total.fee) + "</td><td></td></tr></tfoot></table></div>";
}

/******************************************************************
 * Function : reportHandleDownloadPdf()
 * Tujuan   : Meminta backend membuat PDF laporan lalu memicu unduhan
 *            file di browser dari data base64 yang dikembalikan.
 ******************************************************************/
async function reportHandleDownloadPdf() {
    const button = document.getElementById("downloadPdfButton");
    button.disabled = true;
    button.textContent = "Membuat PDF...";

    try {
        const payload = reportBuildFilterPayload();
        const result = await apiCall("generate_report_pdf", payload);

        const byteCharacters = atob(result.base64);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: "application/pdf" });

        const downloadUrl = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = downloadUrl;
        link.download = result.filename || "laporan.pdf";
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(downloadUrl);

        appShowToast("PDF berhasil diunduh.", "success");
    } catch (error) {
        appShowToast(error.message, "error");
    } finally {
        button.disabled = false;
        button.textContent = "Unduh PDF";
    }
}
