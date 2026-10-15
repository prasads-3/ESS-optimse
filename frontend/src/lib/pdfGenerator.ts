import { API_BASE_URL } from "@/config";

/**
 * Payroll AI Agent: Generate Professional Salary Slip
 * Supports both direct download and in-browser preview.
 */
// Mirror the login page's logo-loading flow exactly, then convert the result
// into a data URL so jsPDF can embed it.
//
// Login page (src/org-login/page.tsx):
//   fetch(`${API_BASE_URL}/api/org/${slug}`)   // public, no credentials
//     .then(r => r.json())                     // data = { id, name, slug, logo }
//     <img src={data.logo.startsWith('/') ? `${API_BASE_URL}${data.logo}` : data.logo}>
//
// For the PDF we do the identical request + same URL resolution, then one extra
// step: decode the final image to bytes so `doc.addImage` can render it.
async function fetchOrgLogoLikeLoginPage(slug: string | undefined | null): Promise<string | null> {
    console.log('[PDF/logo] step 1 — slug received:', slug);
    if (!slug || typeof slug !== 'string') {
        console.warn('[PDF/logo] ABORT — no slug. Cannot fetch /api/org/:slug.');
        return null;
    }
    try {
        const endpoint = `${API_BASE_URL}/api/org/${slug}`;
        console.log('[PDF/logo] step 2 — GET', endpoint);
        const res = await fetch(endpoint);
        console.log('[PDF/logo] step 3 — status:', res.status);
        if (!res.ok) return null;

        const data = await res.json();
        console.log('[PDF/logo] step 4 — response keys:', Object.keys(data || {}), '| logo type:', typeof data?.logo, '| logo length:', typeof data?.logo === 'string' ? data.logo.length : 0, '| first 40 chars:', typeof data?.logo === 'string' ? data.logo.slice(0, 40) : '<none>');

        const rawLogo: unknown = data?.logo;
        if (typeof rawLogo !== 'string' || !rawLogo) {
            console.warn('[PDF/logo] ABORT — endpoint returned no logo field.');
            return null;
        }

        if (rawLogo.startsWith('data:')) {
            console.log('[PDF/logo] step 5 — data URL, returning directly.');
            return rawLogo;
        }

        const imgUrl = rawLogo.startsWith('/') ? `${API_BASE_URL}${rawLogo}` : rawLogo;
        console.log('[PDF/logo] step 5 — fetching image bytes from:', imgUrl);
        const imgRes = await fetch(imgUrl);
        console.log('[PDF/logo] step 6 — image fetch status:', imgRes.status);
        if (!imgRes.ok) return null;
        const blob = await imgRes.blob();
        const dataUrl = await new Promise<string>((resolve, reject) => {
            const r = new FileReader();
            r.onload = () => resolve(r.result as string);
            r.onerror = () => reject(r.error);
            r.readAsDataURL(blob);
        });
        console.log('[PDF/logo] step 7 — encoded blob to data URL, length:', dataUrl.length);
        return dataUrl;
    } catch (e) {
        console.error('[PDF/logo] THREW:', e);
        return null;
    }
}

async function fetchImageToDataUrl(url: string | undefined | null): Promise<string | null> {
    if (!url || typeof url !== 'string') return null;
    if (url.startsWith('data:')) return url;
    try {
        const imgUrl = url.startsWith('/') ? `${API_BASE_URL}${url}` : url;
        const imgRes = await fetch(imgUrl);
        if (!imgRes.ok) return null;
        const blob = await imgRes.blob();
        return await new Promise<string>((resolve, reject) => {
            const r = new FileReader();
            r.onload = () => resolve(r.result as string);
            r.onerror = () => reject(r.error);
            r.readAsDataURL(blob);
        });
    } catch (e) {
        return null;
    }
}

export const generatePayslipPDF = async (data: any, action: 'download' | 'preview' = 'download') => {
    // Lazy-load heavy PDF libs only when actually generating a payslip — keeps
    // them out of the entry chunk so dashboards aren't paying their cost.
    const [{ jsPDF }, autoTableMod] = await Promise.all([
        import("jspdf"),
        import("jspdf-autotable"),
    ]);
    const autoTable = autoTableMod.default;
    // Resolve the logo. Fast path: use already provided logo URL. Slow path: fetch from slug.
    let resolvedLogoDataUrl = await fetchImageToDataUrl(data.organizationLogo);

    if (!resolvedLogoDataUrl && data.organizationSlug) {
        resolvedLogoDataUrl = await fetchOrgLogoLikeLoginPage(data.organizationSlug);
    }
    try {
        console.log(`[PDF Generator] Generating ${action} for ${data.month} ${data.year}`, {
            org: data.organizationName,
            slug: data.organizationSlug,
            addr: data.organizationAddress,
            rawLogoType: typeof data.organizationLogo === 'string'
                ? (data.organizationLogo.startsWith('data:') ? 'data-url'
                    : data.organizationLogo.startsWith('/') ? 'relative-path'
                        : /^https?:\/\//i.test(data.organizationLogo) ? 'absolute-url'
                            : 'other')
                : typeof data.organizationLogo,
            rawLogoLen: typeof data.organizationLogo === 'string' ? data.organizationLogo.length : 0,
            resolvedLogo: !!resolvedLogoDataUrl
        });

        // ── 1. Sanitization & Calculations ──
        const safeNum = (val: any) => {
            const n = Number(val);
            return isNaN(n) ? 0 : n;
        };

        // Build dynamic row lists: prefer explicit arrays from caller
        // (data.earnings / data.deductions), otherwise derive from the
        // standard fields persisted on the slip and drop any zero rows so the
        // PDF reflects only what was actually entered.
        type Row = { label: string; amount: number };
        const fromArray = (arr: any[]): Row[] =>
            (arr || [])
                .map((it: any) => ({
                    label: String(it?.label ?? "").trim(),
                    amount: safeNum(it?.value ?? it?.amount),
                }))
                .filter(r => r.label && r.amount > 0);

        const fromLegacy = (pairs: [string, any][]): Row[] =>
            pairs
                .map(([label, v]) => ({ label, amount: safeNum(v) }))
                .filter(r => r.amount > 0);

        const earningsRows: Row[] = Array.isArray(data.earnings) && data.earnings.length
            ? fromArray(data.earnings)
            : fromLegacy([
                ["Basic Salary", data.basicSalary],
                ["HRA", data.hra],
                ["Transport Allowance", data.transportAllowance],
                ["Medical Allowance", data.medicalAllowance],
                ["Other Allowance", data.otherAllowance],
                ["Bonus", data.bonus],
            ]);

        const deductionsRows: Row[] = Array.isArray(data.deductions) && data.deductions.length
            ? fromArray(data.deductions)
            : fromLegacy([
                ["Provident Fund (PF)", data.pf],
                ["ESI Contribution", data.esi],
                ["Professional Tax", data.professionalTax],
                ["Income Tax (TDS)", data.incomeTax],
                ["Other Deductions", data.otherDeduction],
            ]);

        const grossEarnings = earningsRows.reduce((s, r) => s + r.amount, 0);
        const totalDeductions = deductionsRows.reduce((s, r) => s + r.amount, 0);
        const netPay = grossEarnings - totalDeductions;

        // ── 2. Initialize PDF Document ──
        const doc = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4',
            compress: true
        });

        const pageWidth = doc.internal.pageSize.getWidth();
        doc.setFont("helvetica");

        // ── Color palette & Dynamic Template ──
        let C_ACCENT: [number, number, number] = [4, 120, 87];        // default emerald-700
        let C_HEAD_FILL: [number, number, number] = [240, 253, 244];  // default emerald-50
        const C_BORDER: [number, number, number] = [226, 232, 240];     // slate-200
        const C_TEXT: [number, number, number] = [15, 23, 42];          // slate-900
        const C_MUTED: [number, number, number] = [100, 116, 139];      // slate-500

        // Use payslipConfig if provided in the data object, else check localStorage as fallback
        let dynamicTemplate = data.payslipConfig;
        if (!dynamicTemplate) {
            try {
                const saved = localStorage.getItem(`payslip_template_${data.organizationId}`);
                if (saved) dynamicTemplate = JSON.parse(saved);
            } catch (e) { }
        }

        const hexToRgb = (hex: string): [number, number, number] => {
            const r = parseInt(hex.slice(1, 3), 16);
            const g = parseInt(hex.slice(3, 5), 16);
            const b = parseInt(hex.slice(5, 7), 16);
            return [r, g, b];
        };

        if (dynamicTemplate?.primaryColor) {
            C_ACCENT = hexToRgb(dynamicTemplate.primaryColor);
            // Lighten for head fill
            C_HEAD_FILL = [
                Math.min(255, C_ACCENT[0] + 240),
                Math.min(255, C_ACCENT[1] + 240),
                Math.min(255, C_ACCENT[2] + 240)
            ];
        }

        const MARGIN = 14;

        const fmt = (n: number) =>
            `Rs. ${(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

        // ── 3. Header — Logo (logo replaces company name when present) ──
        const orgName = dynamicTemplate?.companyName || data.organizationName || "Company Name";
        const orgAddress = dynamicTemplate?.companyAddress || data.organizationAddress || "";
        const orgPhone = dynamicTemplate?.companyPhone || data.organizationPhone || "";
        const orgEmail = dynamicTemplate?.companyEmail || data.organizationEmail || "";
        const logoDataUrl: string | null = dynamicTemplate?.logoUrl || resolvedLogoDataUrl;

        // Letterhead — logo on top, address text directly below the logo
        // (left-aligned to the same MARGIN). SALARY SLIP / Pay Period on the
        // far right, vertically centered against the whole left block.
        const headerStartY = 12;     // tighter top padding
        const LOGO_GAP_BELOW = 1;    // tight gap between logo bottom and first address line
        const LINE_H = 4;            // address line height (mm)

        let drawW = 0;
        let drawH = 0;
        let logoBottomY = headerStartY;
        let logoRendered = false;

        // ── 1. Render logo at top-left ──
        if (logoDataUrl && logoDataUrl.startsWith("data:image")) {
            try {
                const props = doc.getImageProperties(logoDataUrl);
                const maxH = 35;
                const maxW = 90;
                const ratio = Math.min(maxW / props.width, maxH / props.height);
                drawW = props.width * ratio;
                drawH = props.height * ratio;
                doc.addImage(logoDataUrl, "PNG", MARGIN - 3, headerStartY, drawW, drawH);
                logoBottomY = headerStartY + drawH;
                logoRendered = true;
            } catch (e) {
                console.warn("[PDF] Logo failed to render:", e);
            }
        }

        if (!logoRendered) {
            doc.setFontSize(16);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(...C_TEXT);
            doc.text(orgName, MARGIN, headerStartY + 6);
            logoBottomY = headerStartY + 8;
        }

        // ── 2. Render address directly below the logo ──
        // Strip commas from the address and let the renderer word-wrap based on
        // column width. Typical addresses naturally fall onto 2 lines, which is
        // the cleaner look the design calls for (instead of one line per comma).
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8.5);
        doc.setTextColor(...C_MUTED);

        const cleanedAddress = orgAddress
            .replace(/[,;|]+/g, " ")  // commas / semicolons / pipes → spaces
            .replace(/\s+/g, " ")       // collapse runs of whitespace
            .trim();
        // Narrow the column width to force the address into approximately 3 lines
        const addressColW = 60;
        const addressLines: string[] = cleanedAddress
            ? doc.splitTextToSize(cleanedAddress, addressColW)
            : [];

        // ── 2. Render address below the logo ──
        // Start address slightly closer to the logo (gap = 1mm)
        let textY = logoBottomY + 1;
        const addressStartX = MARGIN;

        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(...C_MUTED);

        if (addressLines.length) {
            addressLines.forEach((line: string) => {
                doc.text(line, addressStartX, textY);
                textY += LINE_H;
            });
        }
        const contactBits: string[] = [];
        if (orgPhone) contactBits.push(`Tel: ${orgPhone}`);
        if (orgEmail) contactBits.push(orgEmail);
        if (contactBits.length) {
            doc.text(contactBits.join("  |  "), addressStartX, textY);
            textY += LINE_H;
        }
        const leftBlockBottomY = textY - 3; // remove the baseline offset to get the visual bottom

        // ── 3. Right-side title — vertically centered against the left block ──
        const blockTopY = headerStartY;
        const blockMidY = blockTopY + (leftBlockBottomY - blockTopY) / 2;
        const TITLE_GAP = 7;

        doc.setFont("helvetica", "bold");
        doc.setFontSize(18);
        doc.setTextColor(...C_TEXT);
        doc.text("SALARY SLIP", pageWidth - MARGIN, blockMidY - TITLE_GAP / 2 + 2, { align: "right" });

        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.setTextColor(...C_ACCENT);
        const period = `${data.month || ""} ${data.year || ""}`.trim();
        doc.text(`Pay Period: ${period}`, pageWidth - MARGIN, blockMidY + TITLE_GAP / 2 + 2, { align: "right" });

        // ── 4. Divider just below the whole header ──
        const dividerY = leftBlockBottomY + 5;
        doc.setDrawColor(...C_BORDER);
        doc.setLineWidth(0.4);
        doc.line(MARGIN, dividerY, pageWidth - MARGIN, dividerY);

        let cursorY = dividerY;

        // ── 5. Employee details (two-column key/value) ──
        cursorY = dividerY + 8;
        const col1X = MARGIN;
        const col2X = pageWidth / 2 + 4;
        const labelOffset = 32;

        const drawDetailRow = (label: string, value: any, x: number, y: number) => {
            doc.setFont("helvetica", "bold");
            doc.setFontSize(9.5);
            doc.setTextColor(...C_ACCENT);
            doc.text(label, x, y);
            doc.setFont("helvetica", "normal");
            doc.setTextColor(...C_TEXT);
            const valStr = value === null || value === undefined || value === "" ? "—" : String(value);
            doc.text(`:  ${valStr}`, x + labelOffset, y);
        };

        const payDateStr = data.createdAt
            ? new Date(data.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
            : "—";
        const employeeIdDisplay = data.employeeStrId || data.employeeId || "—";

        drawDetailRow("Employee Name", data.employeeName, col1X, cursorY);
        drawDetailRow("Employee ID", employeeIdDisplay, col1X, cursorY + 7);
        drawDetailRow("Designation", data.designation, col1X, cursorY + 14);

        drawDetailRow("Department", data.department, col2X, cursorY);
        drawDetailRow("Pay Period", period, col2X, cursorY + 7);
        drawDetailRow("Pay Date", payDateStr, col2X, cursorY + 14);

        cursorY += 24;

        // ── 6. Earnings & Deductions side-by-side table (dynamic) ──
        // Pad the shorter side with empty cells so the side-by-side layout
        // still aligns when one column has more rows than the other (e.g.
        // 4 earnings vs 0 deductions).
        const hasDeductions = deductionsRows.length > 0;
        const rowCount = Math.max(earningsRows.length, deductionsRows.length, 1);
        const tableBody: any[][] = [];
        for (let i = 0; i < rowCount; i++) {
            const e = earningsRows[i];
            const d = deductionsRows[i];
            const deductionLabel = hasDeductions
                ? (d ? d.label : "")
                : (i === 0
                    ? { content: "There is no deduction", colSpan: 2, styles: { halign: "center", fontStyle: "italic", textColor: C_MUTED as any } }
                    : null);
            const row: any[] = [
                e ? e.label : "",
                e ? fmt(e.amount) : "",
            ];
            if (hasDeductions) {
                row.push(d ? d.label : "", d ? fmt(d.amount) : "");
            } else if (i === 0) {
                row.push(deductionLabel);
            } else {
                row.push("", "");
            }
            tableBody.push(row);
        }

        autoTable(doc, {
            startY: cursorY,
            margin: { left: MARGIN, right: MARGIN },
            head: [[
                "Earnings",
                { content: "Amount", styles: { halign: "right" } },
                "Deductions",
                { content: "Amount", styles: { halign: "right" } }
            ]],
            body: tableBody,
            theme: "grid",
            headStyles: {
                fillColor: C_HEAD_FILL as any,
                textColor: C_TEXT as any,
                fontStyle: "bold",
                fontSize: 10,
                cellPadding: 3,
                lineColor: C_BORDER as any,
                lineWidth: 0.2,
            },
            styles: {
                fontSize: 9.5,
                cellPadding: 3,
                textColor: C_TEXT as any,
                lineColor: C_BORDER as any,
                lineWidth: 0.2,
                valign: "middle",
            },
            columnStyles: {
                1: { halign: "right" },
                3: { halign: "right" },
            },
        });

        cursorY = (doc as any).lastAutoTable.finalY + 8;

        // ── 7. Totals (right-aligned) ──
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.setTextColor(...C_TEXT);
        doc.text("Gross Earnings", pageWidth - MARGIN - 80, cursorY);
        doc.text(fmt(grossEarnings), pageWidth - MARGIN, cursorY, { align: "right" });

        doc.text("Total Deductions", pageWidth - MARGIN - 80, cursorY + 7);
        doc.text(fmt(totalDeductions), pageWidth - MARGIN, cursorY + 7, { align: "right" });

        cursorY += 14;

        // Net Salary divider
        doc.setDrawColor(...C_BORDER);
        doc.setLineWidth(0.4);
        doc.line(pageWidth - MARGIN - 90, cursorY, pageWidth - MARGIN, cursorY);

        cursorY += 7;
        doc.setFontSize(12);
        doc.setTextColor(...C_TEXT);
        // Position label 80mm from the right margin to provide more room for large amounts
        doc.text("Net Salary Payable", pageWidth - MARGIN - 80, cursorY);
        doc.text(fmt(netPay), pageWidth - MARGIN, cursorY, { align: "right" });

        // Block removed as requested

        // ── 8. Footer note ──
        doc.setFont("helvetica", "italic");
        doc.setFontSize(8);
        doc.setTextColor(...C_MUTED);
        doc.text(
            dynamicTemplate?.footerNote || "This is a system-generated payslip and does not require a signature.",
            pageWidth / 2,
            287,
            { align: "center" }
        );

        // ── 7. Output & Cleanup ──
        // Sanitized filename to ensure Windows compatibility
        const safeMonth = (data.month || 'Month').replace(/[^a-z0-9]/gi, '');
        const safeYear = (data.year || 'Year').replace(/[^a-z0-9]/gi, '');
        const safeEmpName = (data.employeeName || 'Employee').replace(/[^a-z0-9]/gi, '_');
        const filename = `Payslip_${safeMonth}_${safeYear}_${safeEmpName}.pdf`;

        if (action === 'preview') {
            // Force application/pdf MIME so the browser renders inline instead
            // of downloading the blob URL as a UUID-named file with no extension.
            const rawBlob = doc.output('blob');
            const pdfBlob = new Blob([rawBlob], { type: 'application/pdf' });
            const url = URL.createObjectURL(pdfBlob);

            const previewWindow = window.open(url, '_blank');
            if (!previewWindow) {
                // Popup blocked — fall back to same-tab navigation.
                window.location.href = url;
            }
            // Revoke after the new tab has had time to load the blob.
            setTimeout(() => URL.revokeObjectURL(url), 30000);
        } else {
            // jsPDF.save() uses FileSaver-style logic internally and applies
            // the filename correctly across Chrome / Edge / Firefox / Safari,
            // so the file always lands with the .pdf extension.
            doc.save(filename);
        }

    } catch (error: any) {
        console.error('[PDF Generator] Fatal Error:', error);
        alert(`Failed to generate PDF: ${error?.message || 'Unknown Error'}`);
    }
};
