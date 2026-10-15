import EmployeeAvatar from "@/components/EmployeeAvatar";
import type { Employee } from "@/components/EmployeeCard";

interface EmployeeMindmapProps {
    employees: Employee[];
    onSelect: (emp: Employee) => void;
    // Email of the employee who should be pinned as Tech Head. When empty,
    // the Tech Head is detected from the title instead.
    techHeadEmail?: string;
    // The logged-in admin. The /api/employees list excludes admins, so without
    // this the Admin root has no email/name and anyone reporting to the admin
    // can't be matched. Passing it lets those reports connect to the Admin node.
    admin?: { id?: string | number; name?: string; email?: string; photo?: string };
}

// A node in the chart: either a real employee, or a fixed placeholder
// position (Admin / Tech Head) when no employee fills that role yet.
interface OrgNode {
    id: string;
    emp?: Employee;        // present when backed by a real employee
    fixedLabel?: string;   // shown when there is no employee for this slot
    badge?: string;        // role tag rendered on the node (Admin / Tech Head)
    // A real person shown on the node but not clickable (e.g. the logged-in
    // admin, who isn't a fetchable /api/employees record).
    person?: { name: string; title?: string; photo?: string | null };
    children: OrgNode[];
}

const isAdmin = (e: Employee) => {
    const role = ((e as any).role || "").toLowerCase();
    const t = `${e.title || ""} ${role}`.toLowerCase();
    return role === "admin" || /\badmin\b/.test(t);
};

const isTechHead = (e: Employee) =>
    /tech\s*-?\s*head/.test((e.title || "").toLowerCase());

// Build the reporting hierarchy with two fixed positions at the top:
//   Admin  →  Tech Head  →  everyone else
// Explicit `reportsTo` (manager email) still wins for anyone who has it;
// employees without a resolvable manager default under the Tech Head.
function buildTree(employees: Employee[], techHeadEmail?: string, admin?: EmployeeMindmapProps["admin"]) {
    // Resolve a manager from a `reportsTo` value that may be an email OR a name
    // (the data is messy), so look both up.
    const byEmail = new Map<string, Employee>();
    const byName = new Map<string, Employee>();
    for (const e of employees) {
        const em = (e.email || "").trim().toLowerCase();
        if (em && !byEmail.has(em)) byEmail.set(em, e);
        const nm = (e.name || "").trim().toLowerCase();
        if (nm && !byName.has(nm)) byName.set(nm, e);
    }

    const nodeByEmpId = new Map<string, OrgNode>();
    const makeEmpNode = (e: Employee): OrgNode => {
        let n = nodeByEmpId.get(e.id);
        if (!n) {
            n = { id: `emp:${e.id}`, emp: e, children: [] };
            nodeByEmpId.set(e.id, n);
        }
        return n;
    };

    const realAdmin = employees.find(isAdmin);
    // Configured Tech Head (by email) wins; otherwise fall back to title match.
    const configuredEmail = (techHeadEmail || "").trim().toLowerCase();
    const techHeadEmp =
        (configuredEmail && byEmail.get(configuredEmail)) ||
        employees.find(isTechHead);

    // Admin root. A real admin in the list wins; otherwise build it from the
    // logged-in admin so reports can still resolve to it. Its email/name are the
    // keys we match `reportsTo` against.
    const adminEmail = (realAdmin?.email || admin?.email || "").trim().toLowerCase();
    const adminName = (realAdmin?.name || admin?.name || "").trim().toLowerCase();

    let adminNode: OrgNode;
    if (realAdmin) {
        adminNode = makeEmpNode(realAdmin);
    } else if (admin && (admin.name || admin.email)) {
        // Non-clickable person node (the admin isn't a fetchable employee record).
        adminNode = {
            id: "fixed:admin",
            person: { name: admin.name || "Admin", title: "Administrator", photo: admin.photo || null },
            children: [],
        };
    } else {
        adminNode = { id: "fixed:admin", fixedLabel: "Admin", children: [] };
    }
    adminNode.badge = "Admin";

    const techHeadNode: OrgNode = techHeadEmp
        ? makeEmpNode(techHeadEmp)
        : { id: "fixed:techhead", fixedLabel: "Tech Head", children: [] };
    techHeadNode.badge = "Tech Head";

    adminNode.children.push(techHeadNode);

    // Employees whose `reportsTo` points to someone not in the organization.
    // These stay disconnected — they are NOT pinned under the Tech Head.
    const orphans: OrgNode[] = [];

    for (const e of employees) {
        if (realAdmin && e.id === realAdmin.id) continue;
        if (techHeadEmp && e.id === techHeadEmp.id) continue;

        const node = makeEmpNode(e);
        const mgr = (e.reportsTo || "").trim().toLowerCase();

        if (!mgr || mgr === "none") {
            // No manager specified → falls under the Tech Head.
            techHeadNode.children.push(node);
        } else if ((adminEmail && mgr === adminEmail) || (adminName && mgr === adminName)) {
            // Reports to the admin → connect under the Admin root. Multiple
            // employees pointing at the admin all branch from this same node.
            adminNode.children.push(node);
        } else {
            const manager = byEmail.get(mgr) || byName.get(mgr);
            if (manager && manager.id !== e.id) {
                // Valid manager → connect under them.
                makeEmpNode(manager).children.push(node);
            } else {
                // reportsTo is set but the manager doesn't exist (or is self) →
                // leave disconnected instead of attaching to the Tech Head.
                orphans.push(node);
            }
        }
    }

    // Stable, readable ordering; keep the Tech Head first under Admin.
    const nameOf = (n: OrgNode) => n.emp?.name || n.person?.name || n.fixedLabel || "";
    const sortChildren = (n: OrgNode, seen: Set<string>) => {
        if (seen.has(n.id)) return;
        seen.add(n.id);
        n.children.sort((a, b) => {
            if (a === techHeadNode) return -1;
            if (b === techHeadNode) return 1;
            return nameOf(a).localeCompare(nameOf(b));
        });
        n.children.forEach((c) => sortChildren(c, seen));
    };
    sortChildren(adminNode, new Set());
    orphans.forEach((o) => sortChildren(o, new Set()));
    orphans.sort((a, b) => nameOf(a).localeCompare(nameOf(b)));

    return { root: adminNode, orphans };
}

const Node = ({
    node,
    onSelect,
    seen,
}: {
    node: OrgNode;
    onSelect: (emp: Employee) => void;
    seen: Set<string>;
}) => {
    // Guard against cyclic data (A → B → A).
    if (seen.has(node.id)) return null;
    const nextSeen = new Set(seen);
    nextSeen.add(node.id);

    const reportCount = node.children.length;

    return (
        <li>
            {node.emp ? (
                <button
                    type="button"
                    className={`oc-node${node.badge ? " oc-lead" : ""}`}
                    onClick={() => onSelect(node.emp!)}
                >
                    {node.badge && <span className="oc-badge">{node.badge}</span>}
                    <EmployeeAvatar name={node.emp.name} photo={node.emp.photo} size="md" />
                    <span className="oc-name">{node.emp.name}</span>
                    <span className="oc-title">{node.emp.title || "—"}</span>
                    {reportCount > 0 && (
                        <span className="oc-reports">
                            {reportCount} report{reportCount > 1 ? "s" : ""}
                        </span>
                    )}
                </button>
            ) : node.person ? (
                // A real person (e.g. the logged-in admin) but not clickable,
                // since they aren't a fetchable employee record.
                <div className={`oc-node${node.badge ? " oc-lead" : ""}`}>
                    {node.badge && <span className="oc-badge">{node.badge}</span>}
                    <EmployeeAvatar name={node.person.name} photo={node.person.photo || undefined} size="md" />
                    <span className="oc-name">{node.person.name}</span>
                    <span className="oc-title">{node.person.title || "—"}</span>
                    {reportCount > 0 && (
                        <span className="oc-reports">
                            {reportCount} report{reportCount > 1 ? "s" : ""}
                        </span>
                    )}
                </div>
            ) : (
                <div className="oc-node oc-vacant">
                    <span className="oc-badge">{node.badge}</span>
                    <span className="oc-name">{node.fixedLabel}</span>
                    <span className="oc-title">Position vacant</span>
                </div>
            )}
            {node.children.length > 0 && (
                <ul>
                    {node.children.map((child) => (
                        <Node
                            key={child.id}
                            node={child}
                            onSelect={onSelect}
                            seen={nextSeen}
                        />
                    ))}
                </ul>
            )}
        </li>
    );
};

export default function EmployeeMindmap({ employees, onSelect, techHeadEmail, admin }: EmployeeMindmapProps) {
    const { root, orphans } = buildTree(employees, techHeadEmail, admin);

    if (employees.length === 0) {
        return (
            <div className="text-center py-16 text-muted-foreground text-sm">
                No employees to display.
            </div>
        );
    }

    return (
        <div className="bg-card border border-border/60 rounded-xl p-6 overflow-x-auto">
            <style>{`
                .orgchart, .orgchart ul { position: relative; margin: 0; padding: 0; }
                .orgchart { display: inline-block; min-width: 100%; }
                .orgchart ul { display: flex; justify-content: center; padding-top: 24px; }
                .orgchart li {
                    list-style: none; text-align: center; position: relative;
                    padding: 24px 10px 0;
                }
                /* horizontal connectors between siblings */
                .orgchart li::before, .orgchart li::after {
                    content: ''; position: absolute; top: 0; right: 50%;
                    border-top: 1px solid hsl(var(--border)); width: 50%; height: 24px;
                }
                .orgchart li::after {
                    right: auto; left: 50%;
                    border-left: 1px solid hsl(var(--border));
                }
                .orgchart li:only-child::before, .orgchart li:only-child::after { display: none; }
                .orgchart li:only-child { padding-top: 24px; }
                .orgchart li:first-child::before, .orgchart li:last-child::after { border: 0 none; }
                .orgchart li:last-child::before {
                    border-right: 1px solid hsl(var(--border)); border-radius: 0 6px 0 0;
                }
                .orgchart li:first-child::after { border-radius: 6px 0 0 0; }
                /* vertical connector dropping from a parent to its children row */
                .orgchart ul ul::before {
                    content: ''; position: absolute; top: 0; left: 50%;
                    border-left: 1px solid hsl(var(--border)); width: 0; height: 24px;
                }
                .orgchart .oc-node {
                    display: inline-flex; flex-direction: column; align-items: center; gap: 6px;
                    border: 1px solid hsl(var(--border)); border-radius: 12px;
                    background: hsl(var(--background)); padding: 12px 16px; min-width: 132px;
                    cursor: pointer; transition: box-shadow .15s, border-color .15s, transform .15s;
                }
                .orgchart .oc-node:hover {
                    border-color: hsl(var(--primary)); box-shadow: 0 4px 14px rgba(15,23,42,0.08);
                    transform: translateY(-1px);
                }
                .orgchart .oc-name { font-size: 13px; font-weight: 600; color: hsl(var(--foreground)); }
                .orgchart .oc-title { font-size: 11px; color: hsl(var(--muted-foreground)); }
                .orgchart .oc-reports {
                    font-size: 10px; font-weight: 700; margin-top: 2px;
                    padding: 1px 8px; border-radius: 999px;
                    background: hsl(var(--primary) / 0.12); color: hsl(var(--primary));
                }
                /* fixed leadership positions (Admin / Tech Head) */
                .orgchart .oc-lead {
                    border-color: hsl(var(--primary) / 0.5);
                    box-shadow: 0 2px 10px hsl(var(--primary) / 0.12);
                }
                .orgchart .oc-badge {
                    font-size: 9px; font-weight: 800; letter-spacing: .04em;
                    text-transform: uppercase; padding: 2px 8px; border-radius: 999px;
                    background: hsl(var(--primary)); color: hsl(var(--primary-foreground));
                }
                .orgchart .oc-vacant {
                    cursor: default; border-style: dashed;
                    background: hsl(var(--secondary) / 0.4);
                }
                .orgchart .oc-vacant:hover { transform: none; box-shadow: none; }
                .orgchart .oc-vacant .oc-name { color: hsl(var(--muted-foreground)); }
                /* disconnected employees (invalid manager) — no connector lines */
                .oc-orphans { margin-top: 24px; border-top: 1px dashed hsl(var(--border)); padding-top: 16px; }
                .oc-orphans-title {
                    font-size: 11px; font-weight: 700; text-transform: uppercase;
                    letter-spacing: .04em; color: hsl(var(--muted-foreground)); margin-bottom: 8px;
                }
                .oc-orphans .orgchart ul { padding-top: 0; flex-wrap: wrap; gap: 12px; }
                .oc-orphans .orgchart li::before,
                .oc-orphans .orgchart li::after { display: none; }
            `}</style>

            <div className="orgchart">
                <ul>
                    <Node node={root} onSelect={onSelect} seen={new Set()} />
                </ul>
            </div>

            {orphans.length > 0 && (
                <div className="oc-orphans">
                    <p className="oc-orphans-title">
                        Not connected — reports to an unknown manager
                    </p>
                    <div className="orgchart">
                        <ul>
                            {orphans.map((node) => (
                                <Node
                                    key={node.id}
                                    node={node}
                                    onSelect={onSelect}
                                    seen={new Set()}
                                />
                            ))}
                        </ul>
                    </div>
                </div>
            )}
        </div>
    );
}
