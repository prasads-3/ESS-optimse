import os
import json
import time
import html
import urllib.parse
import urllib.request
from pathlib import Path
from collections import Counter
from datetime import datetime, timezone

# This script is only for the ESS Optimse project.
EXPECTED_PROJECT_KEY = "ess-optimse"
PAGE_SIZE = 500
MAX_ISSUES = 10000


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
    return html.escape(str(value if value is not None else ""))


def get_file_path(component, project_key):
    prefix = project_key + ":"
    if component.startswith(prefix):
        return component[len(prefix):]
    return component


def make_table(headers, rows):
    heading = "".join(
        "<th>" + esc(item) + "</th>" for item in headers
    )
    body = ""

    for row in rows:
        body += "<tr>" + "".join(
            "<td>" + esc(value) + "</td>" for value in row
        ) + "</tr>"

    if not rows:
        body = (
            '<tr><td colspan="' + str(len(headers)) +
            '">No results returned.</td></tr>'
        )

    return (
        "<table border='1' cellpadding='5' cellspacing='0' "
        "style='border-collapse:collapse;font-size:12px'>"
        "<tr>" + heading + "</tr>" + body + "</table>"
    )


def main():
    host = os.environ["SONAR_HOST_URL"].rstrip("/")
    project = os.environ["SONAR_PROJECT_KEY"]
    token = os.environ["SONAR_AUTH_TOKEN"]

    if project != EXPECTED_PROJECT_KEY:
        raise RuntimeError(
            "Project-key verification failed. Expected ESS Optimse "
            "key 'ess-optimse'; refusing to report another project."
        )

    if not host.startswith("https://") and not host.startswith("http://"):
        raise RuntimeError("SONAR_HOST_URL is not a valid HTTP(S) URL.")

    # Find the Compute Engine task created by this Jenkins scanner run.
    task_file = Path(".scannerwork/report-task.txt")
    if not task_file.is_file():
        raise RuntimeError(
            "Scanner report-task.txt is missing. "
            "Run this script from the same Jenkins workspace after scanning."
        )

    task_properties = {}
    for line in task_file.read_text(encoding="utf-8").splitlines():
        if "=" in line:
            key, value = line.split("=", 1)
            task_properties[key.strip()] = value.strip()

    task_id = task_properties.get("ceTaskId")
    if not task_id:
        raise RuntimeError("The scanner report does not contain a task ID.")

    # Wait until SonarQube has processed this scan.
    task = {}
    for _ in range(60):
        response = api_get(
            host, token, "/api/ce/task", {"id": task_id}
        )
        task = response.get("task", {})
        status = task.get("status")

        if status == "SUCCESS":
            break

        if status in ("FAILED", "CANCELED"):
            raise RuntimeError(
                "SonarQube analysis processing ended with status: "
                + str(status)
            )

        time.sleep(5)
    else:
        raise RuntimeError(
            "Timed out waiting for SonarQube to finish this analysis."
        )

    # Refuse to generate a report if the analysis belongs to another project.
    analyzed_key = task.get("componentKey")
    if analyzed_key and analyzed_key != project:
        raise RuntimeError(
            "Analysis task belongs to a different project; report cancelled."
        )

    analysis_id = task.get("analysisId", "Not provided")

    # Fetch every available page of issues for this project.
    issues = []
    first_page = api_get(
        host,
        token,
        "/api/issues/search",
        {"componentKeys": project, "p": 1, "ps": PAGE_SIZE}
    )
    paging = first_page.get("paging", {})
    total = int(paging.get("total", 0))
    issues.extend(first_page.get("issues", []))

    # SonarQube's issue-search endpoint has a 10,000-result ceiling.
    # Never quietly create a report that claims to include every issue.
    if total > MAX_ISSUES:
        raise RuntimeError(
            f"SonarQube reports {total} issues, exceeding this endpoint's "
            f"{MAX_ISSUES}-result limit. A filtered/export strategy is needed."
        )

    total_pages = (total + PAGE_SIZE - 1) // PAGE_SIZE
    for page in range(2, total_pages + 1):
        data = api_get(
            host,
            token,
            "/api/issues/search",
            {"componentKeys": project, "p": page, "ps": PAGE_SIZE}
        )
        issues.extend(data.get("issues", []))

    if len(issues) != total:
        raise RuntimeError(
            f"Incomplete issue retrieval: SonarQube reports {total}, "
            f"but {len(issues)} were retrieved. Report not marked complete."
        )

    # Get dashboard measures when the server makes them available.
    measures = {}
    measures_note = ""
    try:
        data = api_get(
            host,
            token,
            "/api/measures/component",
            {
                "component": project,
                "metricKeys": (
                    "bugs,vulnerabilities,code_smells,coverage,"
                    "duplicated_lines_density,reliability_rating,"
                    "security_rating,sqale_rating,ncloc"
                )
            }
        )
        component = data.get("component", {})
        if component.get("key") and component["key"] != project:
            raise RuntimeError("Metrics response project-key mismatch.")
        measures = {
            item.get("metric"): item.get("value", "—")
            for item in component.get("measures", [])
        }
    except Exception as error:
        measures_note = (
            "Some dashboard metrics could not be retrieved: "
            + str(error)
        )

    # Security Hotspots are retrieved separately from ordinary issues.
    # Try the current 'project' parameter, then the older parameter for
    # compatibility with older SonarQube versions.
    hotspots = []
    hotspot_note = ""
    try:
        params_name = "project"
        page = 1

        while True:
            try:
                data = api_get(
                    host,
                    token,
                    "/api/hotspots/search",
                    {params_name: project, "p": page, "ps": 100}
                )
            except Exception:
                if params_name == "project" and page == 1:
                    params_name = "projectKey"
                    data = api_get(
                        host,
                        token,
                        "/api/hotspots/search",
                        {params_name: project, "p": page, "ps": 100}
                    )
                else:
                    raise

            batch = data.get("hotspots", [])
            hotspots.extend(batch)
            total_hotspots = int(
                data.get("paging", {}).get("total", len(hotspots))
            )

            if len(hotspots) >= total_hotspots or not batch:
                break
            page += 1

    except Exception as error:
        hotspot_note = (
            "Security Hotspot data could not be retrieved. "
            "Check this endpoint's availability and the token's Browse "
            "permission. Details: " + str(error)
        )

    issue_rows = []
    types = Counter()
    severities = Counter()

    for issue in issues:
        issue_type = issue.get("type", "Unknown")
        severity = issue.get("severity", "Unknown")
        types[issue_type] += 1
        severities[severity] += 1

        issue_rows.append([
            issue_type,
            severity,
            get_file_path(issue.get("component", ""), project),
            issue.get("line", ""),
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
            hotspot.get("line", ""),
            hotspot.get("message", ""),
            hotspot.get("ruleKey", ""),
            hotspot.get("status", "")
        ])

    metric_labels = {
        "bugs": "Bugs",
        "vulnerabilities": "Vulnerabilities",
        "code_smells": "Code Smells",
        "coverage": "Coverage (%)",
        "duplicated_lines_density": "Duplications (%)",
        "reliability_rating": "Reliability Rating",
        "security_rating": "Security Rating",
        "sqale_rating": "Maintainability Rating",
        "ncloc": "Lines of Code"
    }

    metric_rows = [
        [label, measures.get(key, "—")]
        for key, label in metric_labels.items()
    ]

    summary_rows = [
        ["Issues returned", len(issues)],
        ["Bugs", types.get("BUG", 0)],
        ["Vulnerabilities", types.get("VULNERABILITY", 0)],
        ["Code Smells", types.get("CODE_SMELL", 0)],
        ["Security Hotspots returned", len(hotspots)]
    ]

    generated_at = datetime.now(timezone.utc).strftime(
        "%Y-%m-%d %H:%M UTC"
    )
    dashboard_url = (
        host + "/dashboard?id=" + urllib.parse.quote(project, safe="")
    )

    report = f"""<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>ESS Optimse SonarQube Report</title></head>
<body style="font-family:Arial,sans-serif">
<h2>SonarQube Report — ESS Optimse</h2>
<p><b>Project key:</b> {esc(project)}<br>
<b>Analysis task:</b> {esc(task_id)}<br>
<b>Analysis ID:</b> {esc(analysis_id)}<br>
<b>Generated:</b> {esc(generated_at)}</p>

<p><a href="{esc(dashboard_url)}">Open ESS Optimse in SonarQube</a></p>

<h3>Summary</h3>
{make_table(["Metric", "Value"], summary_rows)}

<h3>Dashboard Measures</h3>
{make_table(["Measure", "Value"], metric_rows)}
<p>{esc(measures_note)}</p>

<h3>Issues — {len(issues)} returned</h3>
<p>Counts represent the results returned by SonarQube's issue-search API.
Severity counts: {esc(dict(severities))}</p>
{make_table(
    ["Type", "Severity", "File", "Line", "Message", "Rule", "Status"],
    issue_rows
)}

<h3>Security Hotspots — {len(hotspots)} returned</h3>
{make_table(
    ["Type", "Risk", "File", "Line", "Message", "Rule", "Status"],
    hotspot_rows
)}
<p>{esc(hotspot_note)}</p>

<p>Report generated from SonarQube APIs for the verified ESS Optimse project.</p>
</body>
</html>
"""

    Path("sonarqube-issues-report.html").write_text(
        report, encoding="utf-8"
    )
    print(
        "SonarQube report generated. "
        f"Issues={len(issues)}, Hotspots={len(hotspots)}."
    )


if __name__ == "__main__":
    main()