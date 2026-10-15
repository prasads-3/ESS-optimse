// Shared department -> teams mapping used by Add/Edit employee forms.
export const DEPARTMENT_TEAMS: Record<string, string[]> = {
    Development: ["Backend", "Frontend", "Full Stack", "Mobile", "DevOps"],
    Testing: ["Manual QA", "Automation QA", "Performance Testing"],
    Sales: ["Domestic Sales", "International Sales", "Enterprise Sales"],
    Automation: ["Automation"],
    HR: [],
};

// Sentinel values used by the dropdowns to trigger "type a custom value".
export const ADD_DEPARTMENT_VALUE = "__add_new_department__";
export const ADD_TEAM_VALUE = "__add_new_team__";

export const DEPARTMENTS = Object.keys(DEPARTMENT_TEAMS);

export const getTeamsForDepartment = (department: string): string[] =>
    DEPARTMENT_TEAMS[department] || [];
