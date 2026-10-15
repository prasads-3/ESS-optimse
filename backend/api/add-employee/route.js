import prisma from '../../lib/prisma.js';

export async function POST(req, res) {
    try {
        const { ...employeeData } = req.body;

        // Convert joiningDate string to Date object if provided and not empty
        if (employeeData.joiningDate && employeeData.joiningDate !== "") {
            employeeData.joiningDate = new Date(employeeData.joiningDate);
        } else {
            delete employeeData.joiningDate;
        }

        const employee = await prisma.employee.create({
            data: employeeData,
        });
        res.status(201).json(employee);
    } catch (error) {
        console.error('Error creating employee:', error);
        if (error.code === 'P2002') {
            return res.status(400).json({ error: 'An employee with this email already exists.' });
        }
        res.status(500).json({ error: 'Internal Server Error. Please check your database connection.' });
    }
}
