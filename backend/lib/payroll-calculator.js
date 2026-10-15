/**
 * Attendance and Payroll Calculation Utility
 * 
 * Rules:
 * - Office radius = 150 meters
 * - Buffer time = 30 minutes (0.5 hours)
 * - Working hours = 8 hours
 */

export function calculatePayrollDeduction({
    inside_time,
    outside_time,
    daily_salary,
    basic_salary
}) {
    const BUFFER_TIME = 0.5; // 30 minutes in hours
    const WORKING_HOURS = 8;
    
    let deduction = 0;
    let attendance_status = "present";
    let deduction_reason = "";
    let outside_percentage = 0;

    // Step 2: Apply Buffer
    if (outside_time <= BUFFER_TIME) {
        deduction = 0;
        attendance_status = "present";
    } else {
        const effective_outside_time = outside_time - BUFFER_TIME;
        
        // Step 3: Calculate Percentage
        outside_percentage = (effective_outside_time / WORKING_HOURS) * 100;

        // Step 4: Apply Deduction Slabs
        if (outside_percentage > 10 && outside_percentage <= 50) {
            deduction = 2000;
            attendance_status = "partial";
            deduction_reason = "Outside office area more than 10% of working hours";
        } else if (outside_percentage > 50 && outside_percentage < 90) {
            deduction = 4000;
            attendance_status = "partial";
            deduction_reason = "Outside office area more than 50% of working hours";
        } else if (outside_percentage >= 90) {
            deduction = daily_salary;
            attendance_status = "absent";
            deduction_reason = "Absent (outside office area for most of the day)";
        } else {
            // Implicitly <= 10% after buffer
            deduction = 0;
            attendance_status = "present";
            deduction_reason = "";
        }
    }

    // Step 6: Apply Deduction Automatically
    const final_salary = basic_salary - deduction;

    // Step 7: Output Payslip Format
    return {
        basic_salary,
        deduction,
        final_salary,
        attendance_status,
        outside_percentage: parseFloat(outside_percentage.toFixed(2)),
        deduction_reason,
        inside_time,
        outside_time
    };
}
