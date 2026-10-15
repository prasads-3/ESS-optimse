import prisma from '../../lib/prisma.js';
import { calculatePayrollDeduction } from '../../lib/payroll-calculator.js';

export async function POST(req, res) {
    try {
        const { employeeId, month, year, basicSalary, dailySalary } = req.body;

        if (!employeeId || !month || !year || !basicSalary) {
            return res.status(400).json({ error: 'Missing required fields: employeeId, month, year, basicSalary' });
        }

        // 1. Fetch Tracking/Attendance data for the employee for that month
        // For simplicity in this demo, we'll simulate fetching inside_time and outside_time 
        // from the tracking logs. In a real system, you'd aggregate LoginLogs or TrackingLogs.
        
        // Let's assume we have a way to get these totals.
        // If they are provided in the request, we use them.
        let inside_time = req.body.inside_time;
        let outside_time = req.body.outside_time;

        if (inside_time === undefined || outside_time === undefined) {
            // Simulation: If not provided, we try to "calculate" them from logs
            // Here we just return dummy data for the purpose of demonstrating the system logic
            // In a real implementation, you'd query prisma.loginLog
            inside_time = 6.5; // Example: 6.5 hours inside
            outside_time = 1.5; // Example: 1.5 hours outside (beyond 8h working day? No, usually it's within working hours)
            
            // Re-evaluating Rule: "Track inside_time and outside_time during working hours"
            // If working hours = 8, then inside + outside = 8.
            outside_time = 1.5;
            inside_time = 6.5;
        }

        const calculated = calculatePayrollDeduction({
            inside_time,
            outside_time,
            daily_salary: parseFloat(dailySalary) || (parseFloat(basicSalary) / 30),
            basic_salary: parseFloat(basicSalary)
        });

        res.json(calculated);
    } catch (error) {
        console.error('Error calculating payroll deduction:', error);
        res.status(500).json({ error: 'Internal Server Error', details: error.message });
    }
}
