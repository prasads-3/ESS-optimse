import os
import json
import time
import csv
import html
import urllib.parse
import urllib.request
from pathlib import Path
from collections import Counter
from datetime import datetime, timezone

# Report is intentionally limited to the ESS Optimse project.
EXPECTED_PROJECT_KEY = "ess-optimse"
PAGE_SIZE = 500
MAX_ISSUES = 10000
LOGO_DATA_URI = "data:image/jpeg;base64,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"

# Inline data images are self-contained, but some Outlook clients may block them.
# The report always includes company-name text as a readable fallback.


def api_get(host, token, path, params=None):
    url = host.rstrip("/") + path
    if params:
        url += "?" + urllib.parse.urlencode(params)
    request = urllib.request.Request(
        url,
        headers={"Authorization": "Bearer " + token}
    )
    with urllib.request.urlopen(request, timeout=40) as response:
        return json.load(response)


def esc(value):
    return html.escape(str(value if value is not None else ""), quote=True)


def get_file_path(component, project_key):
    prefix = project_key + ":"
    if component.startswith(prefix):
        return component[len(prefix):]
    return component


def rating_label(metric_key, raw_value):
    """Show SonarQube's numeric rating and its familiar A-E equivalent."""
    if raw_value in (None, "", "—"):
        return "—"
    try:
        number = int(float(raw_value))
    except (TypeError, ValueError):
        return str(raw_value)
    if metric_key in ("reliability_rating", "security_rating", "sqale_rating"):
        letter = {1: "A", 2: "B", 3: "C", 4: "D", 5: "E"}.get(number)
        return f"{letter} ({raw_value})" if letter else str(raw_value)
    return str(raw_value)


class SafeHtml(str):
    """Marks a small, internally generated HTML fragment as safe for a cell."""


def severity_key(value):
    return {"BLOCKER": 0, "CRITICAL": 1, "MAJOR": 2, "MINOR": 3, "INFO": 4}.get(
        str(value or "").upper(), 5
    )


def severity_color(value):
    return {
        "BLOCKER": ("#7F1D1D", "#FEE2E2"),
        "CRITICAL": ("#B91C1C", "#FEE2E2"),
        "MAJOR": ("#92400E", "#FEF3C7"),
        "MINOR": ("#334155", "#E2E8F0"),
        "INFO": ("#1D4ED8", "#DBEAFE"),
    }.get(str(value or "").upper(), ("#475569", "#F1F5F9"))


def severity_badge(value):
    fg, bg = severity_color(value)
    return SafeHtml(
        f'<span style="display:inline-block;padding:3px 7px;border-radius:4px;'
        f'font-size:11px;font-weight:bold;color:{fg};background-color:{bg};">'
        f'{esc(value or "Unknown")}</span>'
    )


def type_label(value):
    return {
        "BUG": "Bug",
        "VULNERABILITY": "Vulnerability",
        "CODE_SMELL": "Code Smell",
        "SECURITY_HOTSPOT": "Security Hotspot",
    }.get(str(value or ""), str(value or "Unknown"))


def make_table(headers, rows, widths=None, row_html=False):
    """Outlook-friendly table: no external CSS, scripts, flexbox or grid."""
    ths = []
    for index, header in enumerate(headers):
        width = f"width:{widths[index]};" if widths and index < len(widths) else ""
        ths.append(
            '<th align="left" valign="top" style="'
            'background-color:#EAF0F6;color:#20354A;font-family:Arial,sans-serif;'
            'font-size:11px;font-weight:bold;padding:9px 8px;'
            'border-bottom:2px solid #CBD5E1;'
            f'{width}">{esc(header)}</th>'
        )
    body_parts = []
    if not rows:
        body_parts.append(
            f'<tr><td colspan="{len(headers)}" style="padding:12px 8px;'
            'border-bottom:1px solid #E2E8F0;color:#64748B;font-size:12px;">'
            'No results returned.</td></tr>'
        )
    for row_index, row in enumerate(rows):
        bg = "#FFFFFF" if row_index % 2 == 0 else "#F8FAFC"
        cells = []
        for value in row:
            value_html = str(value) if isinstance(value, SafeHtml) else esc(value)
            cells.append(
                '<td valign="top" style="'
                f'background-color:{bg};padding:8px;border-bottom:1px solid #E2E8F0;'
                'font-family:Arial,sans-serif;font-size:12px;line-height:1.45;'
                'color:#243447;word-break:break-word;">'
                f'{value_html}</td>'
            )
        body_parts.append("<tr>" + "".join(cells) + "</tr>")
    return (
        '<table role="presentation" width="100%" border="0" cellpadding="0" '
        'cellspacing="0" style="width:100%;border-collapse:collapse;'
        'font-family:Arial,sans-serif;border:1px solid #D8E1EA;">'
        '<thead><tr>' + "".join(ths) + '</tr></thead><tbody>' +
        "".join(body_parts) + '</tbody></table>'
    )


def metric_card(label, value, accent="#1D4ED8", note=""):
    return (
        '<td width="25%" valign="top" style="padding:5px;">'
        '<table role="presentation" width="100%" border="0" cellpadding="0" '
        'cellspacing="0" style="width:100%;border:1px solid #D8E1EA;'
        'border-top:4px solid ' + accent + ';background-color:#FFFFFF;">'
        '<tr><td style="padding:13px 12px 4px;color:#64748B;font-family:Arial,sans-serif;'
        'font-size:11px;font-weight:bold;text-transform:uppercase;">' + esc(label) + '</td></tr>'
        '<tr><td style="padding:0 12px 3px;color:#14243A;font-family:Arial,sans-serif;'
        'font-size:25px;font-weight:bold;line-height:1.25;">' + esc(value) + '</td></tr>'
        '<tr><td style="padding:0 12px 12px;color:#64748B;font-family:Arial,sans-serif;'
        'font-size:10px;line-height:1.4;">' + esc(note) + '</td></tr>'
        '</table></td>'
    )


def section_heading(title, subtitle=""):
    subtitle_html = (
        '<div style="font-family:Arial,sans-serif;color:#64748B;font-size:12px;'
        'line-height:1.5;margin-top:4px;">' + esc(subtitle) + '</div>'
    ) if subtitle else ""
    return (
        '<h2 style="font-family:Arial,sans-serif;font-size:17px;line-height:1.3;'
        'color:#14243A;margin:26px 0 5px;padding:0;">' + esc(title) + '</h2>' +
        subtitle_html + '<div style="height:3px;width:42px;background-color:#168653;'
        'margin:10px 0 12px;font-size:1px;line-height:1px;">&nbsp;</div>'
    )


def main():
    host = os.environ["SONAR_HOST_URL"].rstrip("/")
    project = os.environ["SONAR_PROJECT_KEY"]
    token = os.environ["SONAR_AUTH_TOKEN"]

    if project != EXPECTED_PROJECT_KEY:
        raise RuntimeError(
            "Project-key verification failed. Expected ESS Optimse key 'ess-optimse'; "
            "refusing to report another project."
        )
    if not host.startswith(("https://", "http://")):
        raise RuntimeError("SONAR_HOST_URL is not a valid HTTP(S) URL.")

    task_file = Path(".scannerwork/report-task.txt")
    if not task_file.is_file():
        raise RuntimeError(
            "Scanner report-task.txt is missing. Run this script from the same "
            "Jenkins workspace after scanning."
        )
    task_properties = {}
    for line in task_file.read_text(encoding="utf-8").splitlines():
        if "=" in line:
            key, value = line.split("=", 1)
            task_properties[key.strip()] = value.strip()
    task_id = task_properties.get("ceTaskId")
    if not task_id:
        raise RuntimeError("The scanner report does not contain a task ID.")

    # Wait for SonarQube's background analysis to finish.
    task = {}
    for _ in range(60):
        task = api_get(host, token, "/api/ce/task", {"id": task_id}).get("task", {})
        status = task.get("status")
        if status == "SUCCESS":
            break
        if status in ("FAILED", "CANCELED"):
            raise RuntimeError("SonarQube analysis processing ended with status: " + str(status))
        time.sleep(5)
    else:
        raise RuntimeError("Timed out waiting for SonarQube to finish this analysis.")

    analyzed_key = task.get("componentKey")
    if analyzed_key and analyzed_key != project:
        raise RuntimeError("Analysis task belongs to a different project; report cancelled.")
    analysis_id = task.get("analysisId", "Not provided")

    # Fetch all issues returned by the issue-search API.
    first_page = api_get(
        host, token, "/api/issues/search",
        {"componentKeys": project, "p": 1, "ps": PAGE_SIZE}
    )
    total = int(first_page.get("paging", {}).get("total", 0))
    if total > MAX_ISSUES:
        raise RuntimeError(
            f"SonarQube reports {total} issues, exceeding the issue-search endpoint's "
            f"{MAX_ISSUES}-result limit. Use a filtered/export strategy."
        )
    issues = list(first_page.get("issues", []))
    total_pages = (total + PAGE_SIZE - 1) // PAGE_SIZE
    for page in range(2, total_pages + 1):
        data = api_get(
            host, token, "/api/issues/search",
            {"componentKeys": project, "p": page, "ps": PAGE_SIZE}
        )
        issues.extend(data.get("issues", []))
    if len(issues) != total:
        raise RuntimeError(
            f"Incomplete issue retrieval: SonarQube reports {total}, but {len(issues)} "
            "were retrieved. Report not marked complete."
        )

    # Current dashboard metrics; never hardcode report numbers.
    measures = {}
    measures_note = ""
    try:
        data = api_get(
            host, token, "/api/measures/component",
            {"component": project, "metricKeys": (
                "bugs,vulnerabilities,code_smells,coverage,duplicated_lines_density,"
                "reliability_rating,security_rating,sqale_rating,ncloc"
            )}
        )
        component = data.get("component", {})
        if component.get("key") and component["key"] != project:
            raise RuntimeError("Metrics response project-key mismatch.")
        measures = {
            item.get("metric"): item.get("value", "—")
            for item in component.get("measures", [])
        }
    except Exception as error:
        measures_note = "Some dashboard metrics could not be retrieved: " + str(error)

    # Quality Gate is shown only when the API returns an actual status.
    quality_gate = "Unavailable"
    quality_gate_note = ""
    try:
        gate_data = api_get(
            host, token, "/api/qualitygates/project_status",
            {"analysisId": analysis_id}
        )
        gate = gate_data.get("projectStatus", {})
        quality_gate = gate.get("status", "Unavailable")
        gate_conditions = gate.get("conditions", [])
        failed_conditions = [
            c for c in gate_conditions
            if str(c.get("status", "")).upper() in ("ERROR", "FAILED")
        ]
        if failed_conditions:
            quality_gate_note = "; ".join(
                f"{c.get('metricKey', 'condition')}: {c.get('actualValue', '—')} "
                f"(threshold {c.get('errorThreshold', '—')})"
                for c in failed_conditions[:8]
            )
    except Exception as error:
        quality_gate_note = "Quality Gate status could not be retrieved: " + str(error)

    # Security Hotspots use a separate endpoint from issue search.
    hotspots = []
    hotspot_note = ""
    try:
        params_name = "project"
        page = 1
        while True:
            try:
                data = api_get(
                    host, token, "/api/hotspots/search",
                    {params_name: project, "p": page, "ps": 100}
                )
            except Exception:
                if params_name == "project" and page == 1:
                    params_name = "projectKey"
                    data = api_get(
                        host, token, "/api/hotspots/search",
                        {params_name: project, "p": page, "ps": 100}
                    )
                else:
                    raise
            batch = data.get("hotspots", [])
            hotspots.extend(batch)
            total_hotspots = int(data.get("paging", {}).get("total", len(hotspots)))
            if len(hotspots) >= total_hotspots or not batch:
                break
            page += 1
    except Exception as error:
        hotspot_note = (
            "Security Hotspot data could not be retrieved. This is not the same as "
            "having zero hotspots. Check endpoint compatibility and token permissions. "
            "Details: " + str(error)
        )

    types = Counter()
    severities = Counter()
    for issue in issues:
        types[issue.get("type", "Unknown")] += 1
        severities[issue.get("severity", "Unknown")] += 1
    for hotspot in hotspots:
        severities["HOTSPOT_RISK_" + str(hotspot.get("vulnerabilityProbability", "UNKNOWN")).upper()] += 1

    # Higher severity issues are listed first, and severity is visually highlighted.
    issues.sort(key=lambda i: (severity_key(i.get("severity")), str(i.get("component", "")), int(i.get("line") or 0)))
    generated_at = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    # Keep reader-facing links usable even when Jenkins uses a Docker-internal API URL.
    dashboard_host = os.environ.get("SONAR_DASHBOARD_URL", "https://sonar.miraki.in").rstrip("/")
    if not dashboard_host.startswith(("https://", "http://")):
        raise RuntimeError("SONAR_DASHBOARD_URL must be an HTTP(S) URL.")
    dashboard_url = dashboard_host + "/dashboard?id=" + urllib.parse.quote(project, safe="")
    issues_url = dashboard_host + "/project/issues?id=" + urllib.parse.quote(project, safe="")

    gate_status_upper = str(quality_gate).upper()
    if gate_status_upper in ("OK", "PASSED", "PASS"):
        gate_label, gate_fg, gate_bg = "PASSED", "#166534", "#DCFCE7"
    elif gate_status_upper in ("ERROR", "FAILED", "FAIL"):
        gate_label, gate_fg, gate_bg = "FAILED", "#991B1B", "#FEE2E2"
    else:
        gate_label, gate_fg, gate_bg = "UNAVAILABLE", "#475569", "#E2E8F0"

    severity_rows = []
    for sev in ("BLOCKER", "CRITICAL", "MAJOR", "MINOR", "INFO", "UNKNOWN"):
        count = severities.get(sev, 0)
        if sev == "UNKNOWN":
            count = sum(v for key, v in severities.items() if key not in {"BLOCKER", "CRITICAL", "MAJOR", "MINOR", "INFO"} and not key.startswith("HOTSPOT_RISK_"))
        fg, bg = severity_color(sev)
        severity_rows.append([
            SafeHtml(f'<span style="font-weight:bold;color:{fg};">{esc(sev.title())}</span>'),
            SafeHtml(f'<span style="font-weight:bold;color:#14243A;">{count}</span>'),
            SafeHtml(f'<span style="color:#64748B;">{(count / len(issues) * 100):.1f}%</span>' if issues else '0.0%')
        ])
    # Include only real ordinary issue severities in the summary table.
    severity_rows = [r for r in severity_rows if str(r[0]).find("Unknown") == -1 or severities.get("Unknown", 0)]

    metric_labels = [
        ("bugs", "Bugs"),
        ("vulnerabilities", "Vulnerabilities"),
        ("code_smells", "Code Smells"),
        ("coverage", "Coverage (%)"),
        ("duplicated_lines_density", "Duplications (%)"),
        ("reliability_rating", "Reliability Rating"),
        ("security_rating", "Security Rating"),
        ("sqale_rating", "Maintainability Rating"),
        ("ncloc", "Lines of Code"),
    ]
    metric_rows = []
    for key, label in metric_labels:
        value = measures.get(key, "—")
        if key in ("reliability_rating", "security_rating", "sqale_rating"):
            value = rating_label(key, value)
        elif key == "coverage" and value not in (None, "", "—"):
            value = f"{value}%"
        elif key == "duplicated_lines_density" and value not in (None, "", "—"):
            value = f"{value}%"
        metric_rows.append([label, value])

    summary_rows = [
        ["Issues returned by issue-search API", len(issues)],
        ["Bugs", types.get("BUG", 0)],
        ["Vulnerabilities", types.get("VULNERABILITY", 0)],
        ["Code Smells", types.get("CODE_SMELL", 0)],
        ["Security Hotspots retrieved", len(hotspots)],
    ]

    priority_issues = [i for i in issues if severity_key(i.get("severity")) <= 2][:25]
    priority_rows = []
    for issue in priority_issues:
        severity = issue.get("severity", "Unknown")
        priority_rows.append([
            severity_badge(severity),
            type_label(issue.get("type")),
            get_file_path(issue.get("component", ""), project),
            issue.get("line", "—"),
            issue.get("message", ""),
            issue.get("rule", ""),
            issue.get("status", "")
        ])

    issue_rows = []
    for issue in issues:
        severity = issue.get("severity", "Unknown")
        issue_rows.append([
            type_label(issue.get("type")),
            severity_badge(severity),
            get_file_path(issue.get("component", ""), project),
            issue.get("line", "—"),
            issue.get("message", ""),
            issue.get("rule", ""),
            issue.get("status", "")
        ])

    hotspot_rows = []
    for hotspot in hotspots:
        hotspot_rows.append([
            "Security Hotspot",
            hotspot.get("vulnerabilityProbability", "—"),
            get_file_path(hotspot.get("component", ""), project),
            hotspot.get("line", "—"),
            hotspot.get("message", ""),
            hotspot.get("ruleKey", ""),
            hotspot.get("status", "")
        ])

    # Report metadata is read from Jenkins at runtime; no build identifiers or
    # quality metrics are hardcoded into the visual report.
    build_number = os.environ.get("BUILD_NUMBER", "Not provided")
    branch_name = os.environ.get("BRANCH_NAME") or os.environ.get("GIT_BRANCH", "Not provided")
    commit_id = os.environ.get("GIT_COMMIT", "Not provided")
    if commit_id and commit_id != "Not provided":
        commit_id = commit_id[:12]
    build_url = os.environ.get("BUILD_URL", "").strip()

    issue_severities = Counter(str(i.get("severity") or "UNKNOWN").upper() for i in issues)
    blocker_critical = issue_severities.get("BLOCKER", 0) + issue_severities.get("CRITICAL", 0)
    hotspot_display = "Unavailable" if hotspot_note else str(len(hotspots))

    def format_measure(key, suffix=""):
        value = measures.get(key, "—")
        if value in (None, "", "—"):
            return "—"
        if key in ("reliability_rating", "security_rating", "sqale_rating"):
            value = rating_label(key, value)
        return f"{value}{suffix}"

    def distribution_table(title, entries, denominator, empty_message):
        rows = []
        for label, count, bar_color in entries:
            try:
                numeric_count = int(count)
            except (TypeError, ValueError):
                numeric_count = 0
            percentage = (numeric_count / denominator * 100.0) if denominator else 0.0
            bar_width = max(0, min(100, int(round(percentage))))
            rows.append(
                '<tr>'
                '<td valign="middle" style="width:24%;padding:8px 8px 8px 0;'
                'font-family:Arial,sans-serif;font-size:12px;color:#334155;white-space:nowrap;">'
                f'{esc(label)}</td>'
                '<td valign="middle" style="width:52%;padding:8px 10px;">'
                '<table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" '
                'style="width:100%;background-color:#E8EEF5;border-collapse:collapse;">'
                '<tr><td height="10" style="height:10px;font-size:1px;line-height:1px;'
                f'width:{bar_width}%;background-color:{bar_color};">&nbsp;</td>'
                f'<td height="10" style="height:10px;font-size:1px;line-height:1px;">&nbsp;</td>'
                '</tr></table></td>'
                '<td align="right" valign="middle" style="width:12%;padding:8px 4px;'
                'font-family:Arial,sans-serif;font-size:12px;font-weight:bold;color:#14243A;">'
                f'{numeric_count}</td>'
                '<td align="right" valign="middle" style="width:12%;padding:8px 0 8px 4px;'
                'font-family:Arial,sans-serif;font-size:11px;color:#64748B;">'
                f'{percentage:.1f}%</td></tr>'
            )
        if not rows:
            rows.append(
                '<tr><td colspan="4" style="padding:12px 4px;font-family:Arial,sans-serif;'
                f'font-size:12px;color:#64748B;">{esc(empty_message)}</td></tr>'
            )
        return (
            '<table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" '
            'style="width:100%;border-collapse:collapse;">'
            '<tr><td colspan="4" style="padding:4px 0 8px;font-family:Arial,sans-serif;'
            f'font-size:12px;color:#64748B;">{esc(title)}</td></tr>'
            + "".join(rows) + '</table>'
        )

    severity_order = [
        ("BLOCKER", "Blocker", "#7F1D1D"),
        ("CRITICAL", "Critical", "#DC2626"),
        ("MAJOR", "Major", "#D97706"),
        ("MINOR", "Minor", "#64748B"),
        ("INFO", "Info", "#2563EB"),
        ("UNKNOWN", "Unknown", "#94A3B8"),
    ]
    severity_entries = [
        (label, issue_severities.get(key, 0), color)
        for key, label, color in severity_order
        if issue_severities.get(key, 0) > 0 or key != "UNKNOWN"
    ]
    type_order = [
        ("BUG", "Bugs", "#D97706"),
        ("VULNERABILITY", "Vulnerabilities", "#DC2626"),
        ("CODE_SMELL", "Code smells", "#2563EB"),
    ]
    known_type_total = sum(types.get(key, 0) for key, _, _ in type_order)
    type_entries = [
        (label, types.get(key, 0), color)
        for key, label, color in type_order
    ]
    other_type_count = max(0, len(issues) - known_type_total)
    if other_type_count:
        type_entries.append(("Other / unknown", other_type_count, "#64748B"))

    gate_summary = {
        "PASSED": "The latest SonarQube analysis passed the configured Quality Gate.",
        "FAILED": "The latest SonarQube analysis did not pass the configured Quality Gate. Review the failed conditions and prioritise the findings below.",
        "UNAVAILABLE": "The Quality Gate result could not be confirmed for this analysis. Review the diagnostic details before treating the result as passed or failed.",
    }.get(gate_label, "The latest SonarQube Quality Gate result is shown above.")
    if blocker_critical:
        executive_summary = (
            f"The analysis returned {len(issues):,} issues, including {blocker_critical:,} "
            "Blocker or Critical findings. Address these high-priority findings first, then review "
            "the remaining issue register. " + gate_summary
        )
    else:
        executive_summary = (
            f"The analysis returned {len(issues):,} issues and no Blocker or Critical findings "
            "in the retrieved issue set. Review the issue register for remaining reliability, "
            "security and maintainability work. " + gate_summary
        )

    highlight_items = [
        ("Quality Gate", gate_label, gate_fg),
        ("Issues retrieved", f"{len(issues):,}", "#14243A"),
        ("Blocker + Critical", f"{blocker_critical:,}", "#B91C1C" if blocker_critical else "#166534"),
        ("Security hotspots", hotspot_display, "#B45309" if hotspot_note else "#14243A"),
    ]
    highlights_html = ''.join(
        '<tr><td valign="top" style="padding:6px 0;border-bottom:1px solid #E8EEF5;'
        'font-family:Arial,sans-serif;font-size:12px;color:#64748B;">'
        f'{esc(label)}</td><td align="right" valign="top" style="padding:6px 0;border-bottom:1px solid #E8EEF5;'
        f'font-family:Arial,sans-serif;font-size:12px;font-weight:bold;color:{color};">{esc(value)}</td></tr>'
        for label, value, color in highlight_items
    )

    cards = [
        metric_card('Total Issues', f'{len(issues):,}', '#2563EB', 'All issues retrieved by the API'),
        metric_card('Blocker + Critical', f'{blocker_critical:,}', '#B91C1C' if blocker_critical else '#168653', 'Highest severity findings'),
        metric_card('Bugs', f'{types.get("BUG", 0):,}', '#D97706', 'Reliability findings'),
        metric_card('Vulnerabilities', f'{types.get("VULNERABILITY", 0):,}', '#DC2626', 'Security findings'),
        metric_card('Code Smells', f'{types.get("CODE_SMELL", 0):,}', '#2563EB', 'Maintainability findings'),
        metric_card('Security Hotspots', hotspot_display, '#7C3AED', 'Separate hotspot API' if not hotspot_note else 'Retrieval failed; not assumed to be zero'),
        metric_card('Coverage', format_measure('coverage', '%'), '#0D9488', 'Test coverage reported to SonarQube'),
        metric_card('Duplications', format_measure('duplicated_lines_density', '%'), '#64748B', 'Duplicated lines density'),
        metric_card('Reliability', format_measure('reliability_rating'), '#D97706', 'SonarQube rating'),
        metric_card('Security Rating', format_measure('security_rating'), '#DC2626', 'SonarQube rating'),
        metric_card('Maintainability', format_measure('sqale_rating'), '#2563EB', 'SonarQube rating'),
        metric_card('Lines of Code', format_measure('ncloc'), '#64748B', 'Analysed non-comment lines'),
    ]
    cards_html = ''.join(
        '<tr>' + ''.join(cards[index:index + 4]) + '</tr>'
        for index in range(0, len(cards), 4)
    )

    logo_html = (
        '<img src="' + LOGO_DATA_URI + '" alt="Miraki Labs" width="190" '
        'style="display:block;width:190px;max-width:100%;height:auto;border:0;outline:none;'
        'text-decoration:none;">'
    )
    build_link_html = (
        f'<a href="{esc(build_url)}" style="color:#BFDBFE;text-decoration:underline;">Open Jenkins build</a>'
        if build_url.startswith(("https://", "http://")) else "Jenkins build link unavailable"
    )
    report = f"""<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Miraki Labs | ESS Optimse Code Quality Report</title></head>
<body style="margin:0;padding:0;background-color:#EEF2F7;">
<table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="width:100%;background-color:#EEF2F7;">
<tr><td align="center" style="padding:18px 8px;">
<table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="width:100%;max-width:1160px;background-color:#FFFFFF;border:1px solid #D9E2EC;border-collapse:separate;">
<tr><td style="padding:18px 24px;background-color:#FFFFFF;border-bottom:1px solid #E4EAF1;">
<table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0"><tr>
<td valign="middle" style="padding:0 14px 0 0;">{logo_html}<div style="font-family:Arial,sans-serif;font-size:9px;letter-spacing:1.2px;color:#64748B;margin-top:5px;">BUILD&nbsp;&bull;&nbsp;SECURE&nbsp;&bull;&nbsp;DELIVER</div></td>
<td valign="middle" align="right" style="font-family:Arial,sans-serif;color:#64748B;font-size:10px;line-height:1.7;">ENGINEERING INTELLIGENCE<br><b style="color:#14243A;font-size:12px;letter-spacing:.5px;">AUTOMATED QUALITY REPORT</b><br><span style="color:#94A3B8;">ESS OPTIMSE &nbsp;|&nbsp; SONARQUBE</span></td>
</tr></table></td></tr>
<tr><td style="padding:28px 26px 25px;background-color:#14243A;">
<table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0"><tr>
<td valign="middle" style="padding-right:18px;">
<div style="font-family:Arial,sans-serif;font-size:10px;letter-spacing:1.7px;color:#93C5FD;font-weight:bold;">CODE QUALITY &amp; SECURITY</div>
<h1 style="font-family:Arial,sans-serif;font-size:28px;line-height:1.22;color:#FFFFFF;margin:8px 0 7px;">ESS Optimse</h1>
<p style="font-family:Arial,sans-serif;color:#D5E1EF;font-size:13px;line-height:1.6;margin:0;">A live analysis of reliability, security, maintainability and issue-level findings.</p>
</td><td width="220" valign="middle" align="right" style="width:220px;">
<table role="presentation" border="0" cellpadding="0" cellspacing="0" align="right" style="border-collapse:separate;"><tr><td style="padding:13px 17px;background-color:{gate_bg};border:1px solid {gate_fg};">
<div style="font-family:Arial,sans-serif;font-size:9px;letter-spacing:1px;font-weight:bold;color:{gate_fg};">QUALITY GATE</div>
<div style="font-family:Arial,sans-serif;font-size:21px;line-height:1.3;font-weight:bold;color:{gate_fg};margin-top:3px;">{esc(gate_label)}</div>
</td></tr></table></td></tr></table>
<table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="margin-top:22px;border-top:1px solid #33465D;"><tr>
<td valign="top" style="padding:12px 15px 0 0;font-family:Arial,sans-serif;font-size:10px;color:#94A3B8;">BUILD<br><b style="font-size:12px;color:#FFFFFF;">#{esc(build_number)}</b></td>
<td valign="top" style="padding:12px 15px 0 0;font-family:Arial,sans-serif;font-size:10px;color:#94A3B8;">BRANCH<br><b style="font-size:12px;color:#FFFFFF;">{esc(branch_name)}</b></td>
<td valign="top" style="padding:12px 15px 0 0;font-family:Arial,sans-serif;font-size:10px;color:#94A3B8;">COMMIT<br><b style="font-size:12px;color:#FFFFFF;">{esc(commit_id)}</b></td>
<td valign="top" style="padding:12px 0 0;font-family:Arial,sans-serif;font-size:10px;color:#94A3B8;">GENERATED<br><b style="font-size:12px;color:#FFFFFF;">{esc(generated_at)}</b></td>
</tr></table>
</td></tr>
<tr><td style="padding:22px 22px 7px;background-color:#F7F9FC;">
<table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0"><tr>
<td width="60%" valign="top" style="width:60%;padding:0 7px 10px 0;">
<table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="width:100%;background-color:#FFFFFF;border:1px solid #D9E2EC;"><tr><td style="padding:17px 18px;">
<div style="font-family:Arial,sans-serif;font-size:10px;letter-spacing:1px;color:#2563EB;font-weight:bold;">EXECUTIVE SUMMARY</div>
<h2 style="font-family:Arial,sans-serif;font-size:17px;color:#14243A;margin:7px 0 9px;">Analysis at a glance</h2>
<p style="font-family:Arial,sans-serif;font-size:12px;line-height:1.75;color:#475569;margin:0;">{esc(executive_summary)}</p>
<p style="font-family:Arial,sans-serif;font-size:11px;line-height:1.5;color:#64748B;margin:11px 0 0;">{build_link_html}</p>
</td></tr></table></td>
<td width="40%" valign="top" style="width:40%;padding:0 0 10px 7px;">
<table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="width:100%;background-color:#FFFFFF;border:1px solid #D9E2EC;"><tr><td style="padding:17px 18px;">
<div style="font-family:Arial,sans-serif;font-size:10px;letter-spacing:1px;color:#0D9488;font-weight:bold;">KEY HIGHLIGHTS</div>
<table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="margin-top:8px;">{highlights_html}</table>
</td></tr></table></td></tr></table>
<table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="width:100%;">{cards_html}</table>
</td></tr>
<tr><td style="padding:17px 26px 5px;background-color:#FFFFFF;">
{section_heading('Quality distribution', 'Severity percentages are calculated from the issues retrieved in this analysis. Security hotspots are reported separately.')}
<table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0"><tr>
<td width="50%" valign="top" style="width:50%;padding:0 12px 8px 0;">
<table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="border:1px solid #D9E2EC;background-color:#FFFFFF;"><tr><td style="padding:14px;">
<div style="font-family:Arial,sans-serif;font-size:14px;font-weight:bold;color:#14243A;margin-bottom:8px;">Severity distribution</div>
{distribution_table('Share of all retrieved issues', severity_entries, len(issues), 'No issue records were returned.')}
</td></tr></table></td>
<td width="50%" valign="top" style="width:50%;padding:0 0 8px 12px;">
<table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="border:1px solid #D9E2EC;background-color:#FFFFFF;"><tr><td style="padding:14px;">
<div style="font-family:Arial,sans-serif;font-size:14px;font-weight:bold;color:#14243A;margin-bottom:8px;">Issue types</div>
{distribution_table('Share of all retrieved issues', type_entries, len(issues), 'No issue records were returned.')}
</td></tr></table></td></tr></table>
{section_heading('Project metrics', 'Live measures returned by SonarQube. A dash means the measure was not available in the response.')}
{make_table(['Measure', 'Value'], metric_rows, widths=['62%', '38%'])}
<p style="font-family:Arial,sans-serif;font-size:11px;color:#B45309;line-height:1.6;margin:10px 0;">{esc(measures_note)}</p>
{section_heading('Priority findings', 'The highest severity findings appear first. This section shows up to 25 Blocker, Critical and Major issues for quick triage.')}
{make_table(['Severity', 'Type', 'File', 'Line', 'Finding', 'Rule', 'Status'], priority_rows, widths=['9%', '10%', '19%', '5%', '34%', '13%', '10%'], row_html=True)}
<p style="font-family:Arial,sans-serif;font-size:11px;color:#64748B;line-height:1.6;margin:10px 0 18px;">Showing {len(priority_issues)} priority findings here. The complete issue register below includes every issue record returned by the API ({len(issues):,} total).</p>
{section_heading('Complete issue register', f'{len(issues):,} issues retrieved — every returned issue is listed, sorted from highest to lower severity.')}
{make_table(['Type', 'Severity', 'File', 'Line', 'Message', 'Rule', 'Status'], issue_rows, widths=['10%', '9%', '20%', '5%', '32%', '14%', '10%'], row_html=True)}
{section_heading('Security hotspots', f'{len(hotspots):,} hotspots retrieved from the separate security-hotspot API.' if not hotspot_note else 'Hotspot retrieval could not be confirmed; this must not be interpreted as zero hotspots.')}
{make_table(['Type', 'Risk', 'File', 'Line', 'Message', 'Rule', 'Status'], hotspot_rows, widths=['12%', '10%', '20%', '5%', '30%', '13%', '10%'])}
<p style="font-family:Arial,sans-serif;font-size:12px;color:#B45309;line-height:1.6;margin:12px 0;">{esc(hotspot_note)}</p>
<p style="font-family:Arial,sans-serif;font-size:12px;color:#B45309;line-height:1.6;margin:12px 0;">{esc(quality_gate_note)}</p>
</td></tr>
<tr><td style="padding:20px 26px;background-color:#14243A;">
<table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0"><tr>
<td valign="top" style="font-family:Arial,sans-serif;font-size:11px;line-height:1.7;color:#D8E4F0;">MIRAKI LABS<br><b style="color:#FFFFFF;">Better Code. Safer Tomorrow.</b><br>Automated engineering quality report for ESS Optimse.</td>
<td valign="top" align="right" style="font-family:Arial,sans-serif;font-size:10px;line-height:1.7;color:#A8B8CA;">Project key: {esc(project)}<br>Analysis ID: {esc(analysis_id)}<br>Report generated by Jenkins + SonarQube</td>
</tr></table>
<p style="font-family:Arial,sans-serif;font-size:10px;line-height:1.6;color:#94A3B8;margin:12px 0 0;">Counts reflect data successfully retrieved from SonarQube. Security Hotspots use a separate endpoint; retrieval failure is displayed as unavailable and must not be interpreted as zero. Review critical findings and confirm fixes in the source repository.</p>
</td></tr></table></td></tr></table></body></html>"""

    # CSV: one row per retrieved issue, with fields suitable for Excel filtering.
    csv_path = Path("sonarqube-issues-report.csv")
    with csv_path.open("w", newline="", encoding="utf-8-sig") as handle:
        writer = csv.DictWriter(handle, fieldnames=[
            "key", "type", "severity", "status", "resolution", "message",
            "file_path", "line", "rule", "effort", "creation_date", "update_date",
            "assignee", "issue_url"
        ])
        writer.writeheader()
        for issue in issues:
            issue_key = issue.get("key", "")
            writer.writerow({
                "key": issue_key,
                "type": type_label(issue.get("type")),
                "severity": issue.get("severity", "Unknown"),
                "status": issue.get("status", ""),
                "resolution": issue.get("resolution", ""),
                "message": issue.get("message", ""),
                "file_path": get_file_path(issue.get("component", ""), project),
                "line": issue.get("line", ""),
                "rule": issue.get("rule", ""),
                "effort": issue.get("effort", ""),
                "creation_date": issue.get("creationDate", ""),
                "update_date": issue.get("updateDate", ""),
                "assignee": issue.get("assignee", ""),
                "issue_url": dashboard_host + "/project/issues?id=" + urllib.parse.quote(project, safe="") + "&open=" + urllib.parse.quote(issue_key, safe="") if issue_key else issues_url,
            })

    # CSV for hotspots is separate because hotspots are not ordinary issues.
    hotspot_csv_path = Path("sonarqube-security-hotspots.csv")
    with hotspot_csv_path.open("w", newline="", encoding="utf-8-sig") as handle:
        writer = csv.DictWriter(handle, fieldnames=[
            "key", "status", "risk", "message", "file_path", "line", "rule"
        ])
        writer.writeheader()
        for hotspot in hotspots:
            writer.writerow({
                "key": hotspot.get("key", ""),
                "status": hotspot.get("status", ""),
                "risk": hotspot.get("vulnerabilityProbability", ""),
                "message": hotspot.get("message", ""),
                "file_path": get_file_path(hotspot.get("component", ""), project),
                "line": hotspot.get("line", ""),
                "rule": hotspot.get("ruleKey", ""),
            })

    # PDF: generate a multipage management report with the full issue appendix.
    # Jenkins should install reportlab before running this script.
    try:
        from reportlab.lib import colors
        from reportlab.lib.pagesizes import landscape, A4
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.lib.enums import TA_LEFT
        from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak
        from reportlab.lib.units import mm

        pdf_path = Path("sonarqube-issues-report.pdf")
        doc = SimpleDocTemplate(
            str(pdf_path), pagesize=landscape(A4), rightMargin=12*mm,
            leftMargin=12*mm, topMargin=14*mm, bottomMargin=14*mm,
            title="Miraki Labs - ESS Optimse Code Quality Report",
            author="Miraki Labs Jenkins"
        )
        styles = getSampleStyleSheet()
        styles.add(ParagraphStyle(name="ReportTitle", parent=styles["Title"], textColor=colors.HexColor("#14243A"), alignment=TA_LEFT, fontSize=20, leading=24, spaceAfter=5))
        styles.add(ParagraphStyle(name="SmallCell", parent=styles["BodyText"], fontName="Helvetica", fontSize=7, leading=8.5, wordWrap="CJK"))
        styles.add(ParagraphStyle(name="SmallCellBold", parent=styles["SmallCell"], fontName="Helvetica-Bold", textColor=colors.HexColor("#14243A")))
        styles.add(ParagraphStyle(name="SectionTitle", parent=styles["Heading2"], textColor=colors.HexColor("#1D4ED8"), spaceBefore=10, spaceAfter=5))
        story = [Paragraph("MIRAKI LABS", styles["Heading1"]), Paragraph("ESS Optimse — Code Quality &amp; Security Report", styles["ReportTitle"]),
                 Paragraph(f"Generated: {esc(generated_at)} | Build: {esc(os.environ.get('BUILD_NUMBER', 'Not provided'))} | Branch: {esc(os.environ.get('GIT_BRANCH', 'Not provided'))}", styles["BodyText"]),
                 Spacer(1, 5*mm), Paragraph(f"Quality Gate: <b>{esc(gate_label)}</b>", styles["Heading2"]),
                 Paragraph(f"Issues retrieved: <b>{len(issues)}</b> &nbsp; Bugs: <b>{types.get('BUG', 0)}</b> &nbsp; Vulnerabilities: <b>{types.get('VULNERABILITY', 0)}</b> &nbsp; Code Smells: <b>{types.get('CODE_SMELL', 0)}</b> &nbsp; Hotspots retrieved: <b>{len(hotspots)}</b>", styles["BodyText"]),
                 Spacer(1, 4*mm), Paragraph("Dashboard measures", styles["SectionTitle"])]
        metric_pdf_data = [[Paragraph("Measure", styles["SmallCellBold"]), Paragraph("Value", styles["SmallCellBold"])]]
        for label, value in metric_rows:
            metric_pdf_data.append([Paragraph(esc(label), styles["SmallCell"]), Paragraph(esc(value), styles["SmallCell"])])
        mt = Table(metric_pdf_data, colWidths=[75*mm, 55*mm], repeatRows=1)
        mt.setStyle(TableStyle([("BACKGROUND", (0,0),(-1,0),colors.HexColor("#EAF0F6")),("GRID",(0,0),(-1,-1),0.35,colors.HexColor("#D8E1EA")),("VALIGN",(0,0),(-1,-1),"TOP"),("ROWBACKGROUNDS",(0,1),(-1,-1),[colors.white,colors.HexColor("#F8FAFC")]),("LEFTPADDING",(0,0),(-1,-1),5),("RIGHTPADDING",(0,0),(-1,-1),5),("TOPPADDING",(0,0),(-1,-1),4),("BOTTOMPADDING",(0,0),(-1,-1),4)]))
        story += [mt, Spacer(1, 4*mm), Paragraph("Priority findings", styles["SectionTitle"])]
        def pdf_table(headers, rows, widths):
            data = [[Paragraph(esc(h), styles["SmallCellBold"]) for h in headers]]
            for row in rows:
                data.append([Paragraph(esc(v if not isinstance(v, SafeHtml) else str(v).replace('<','&lt;').replace('>','&gt;')), styles["SmallCell"]) for v in row])
            t = Table(data, colWidths=widths, repeatRows=1, hAlign="LEFT")
            t.setStyle(TableStyle([("BACKGROUND",(0,0),(-1,0),colors.HexColor("#EAF0F6")),("GRID",(0,0),(-1,-1),0.3,colors.HexColor("#D8E1EA")),("VALIGN",(0,0),(-1,-1),"TOP"),("ROWBACKGROUNDS",(0,1),(-1,-1),[colors.white,colors.HexColor("#F8FAFC")]),("LEFTPADDING",(0,0),(-1,-1),4),("RIGHTPADDING",(0,0),(-1,-1),4),("TOPPADDING",(0,0),(-1,-1),4),("BOTTOMPADDING",(0,0),(-1,-1),4)]))
            return t
        story.append(pdf_table(["Severity", "Type", "File", "Line", "Finding", "Rule", "Status"], [[i.get("severity","Unknown"), type_label(i.get("type")), get_file_path(i.get("component",""),project), i.get("line","—"), i.get("message",""), i.get("rule",""), i.get("status","")] for i in priority_issues], [22*mm,25*mm,42*mm,12*mm,88*mm,28*mm,20*mm]))
        story += [PageBreak(), Paragraph(f"Complete Issue Register — {len(issues)} issues", styles["SectionTitle"]),
                  Paragraph("Every issue retrieved from the SonarQube issue-search API is listed below. CSV contains the same issue records for filtering in Excel.", styles["BodyText"]), Spacer(1, 3*mm)]
        full_rows = [[type_label(i.get("type")), i.get("severity","Unknown"), get_file_path(i.get("component",""),project), i.get("line","—"), i.get("message",""), i.get("rule",""), i.get("status","")] for i in issues]
        story.append(pdf_table(["Type", "Severity", "File", "Line", "Message", "Rule", "Status"], full_rows, [22*mm,20*mm,42*mm,12*mm,91*mm,28*mm,22*mm]))
        story += [PageBreak(), Paragraph(f"Security Hotspots — {len(hotspots)} retrieved", styles["SectionTitle"])]
        if hotspot_note:
            story.append(Paragraph(esc(hotspot_note), styles["BodyText"]))
        hotspot_pdf_rows = [["Hotspot", h.get("vulnerabilityProbability","—"), get_file_path(h.get("component",""),project), h.get("line","—"), h.get("message",""), h.get("ruleKey",""), h.get("status","")] for h in hotspots]
        story.append(pdf_table(["Type", "Risk", "File", "Line", "Message", "Rule", "Status"], hotspot_pdf_rows, [20*mm,18*mm,42*mm,12*mm,93*mm,30*mm,22*mm]))
        if quality_gate_note:
            story += [Spacer(1, 4*mm), Paragraph("Quality Gate diagnostic: " + esc(quality_gate_note), styles["BodyText"])]
        if measures_note:
            story += [Spacer(1, 3*mm), Paragraph("Metrics diagnostic: " + esc(measures_note), styles["BodyText"])]
        def footer(canvas, document):
            canvas.saveState()
            canvas.setFillColor(colors.HexColor("#64748B"))
            canvas.setFont("Helvetica", 7)
            canvas.drawString(12*mm, 7*mm, "Miraki Labs | ESS Optimse | Generated by Jenkins + SonarQube")
            canvas.drawRightString(landscape(A4)[0]-12*mm, 7*mm, f"Page {document.page}")
            canvas.restoreState()
        doc.build(story, onFirstPage=footer, onLaterPages=footer)
    except ImportError as error:
        raise RuntimeError("PDF generation requires ReportLab. Install it in the Jenkins report stage with: python -m pip install reportlab") from error

    Path("sonarqube-issues-report.html").write_text(report, encoding="utf-8")
    print(
        "Professional SonarQube reports generated: HTML, PDF, issue CSV, and hotspot CSV. "
        f"Project={project}, Issues={len(issues)}, Hotspots={len(hotspots)}, "
        f"QualityGate={quality_gate}."
    )


if __name__ == "__main__":
    main()
