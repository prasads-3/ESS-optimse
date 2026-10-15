import prisma from '../../lib/prisma.js';
import crypto from 'crypto';
import { sendEmail } from '../../lib/email.js';
import { hashPassword, verifyPassword } from '../../lib/password.js';

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-key-change-this';

// Generate random password
const generateRandomPassword = (length = 8) => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let password = '';
    for (let i = 0; i < length; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
};

// Generate reset token
const generateResetToken = () => {
    return crypto.randomBytes(32).toString('hex');
};

// POST /api/auth/generate-password - Admin generates temporary password for employee
export const GENERATE_PASSWORD = async (req, res) => {
    try {
        const { employeeId } = req.body;

        if (!employeeId) {
            return res.status(400).json({ error: 'Employee ID is required' });
        }

        const employee = await prisma.employee.findUnique({
            where: { id: parseInt(employeeId) }
        });

        if (!employee) {
            return res.status(404).json({ error: 'Employee not found' });
        }

        // Generate temporary password
        const temporaryPassword = generateRandomPassword(8);

        // Update employee with temporary password (stored hashed; the
        // plaintext only goes to the employee's email below)
        await prisma.employee.update({
            where: { id: parseInt(employeeId) },
            data: {
                password: await hashPassword(temporaryPassword),
                isTemporaryPassword: true
            }
        });

        // Send email with temporary password
        try {
            await sendEmail({
                to: employee.email,
                subject: 'Your Temporary Password - ESS Portal',
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <h2 style="color: #333;">Temporary Password for ESS Portal</h2>
                        <p>Hello ${employee.name},</p>
                        <p>A temporary password has been generated for your account.</p>
                        <div style="background: #f4f4f4; padding: 20px; margin: 20px 0; border-radius: 8px; text-align: center;">
                            <p style="font-size: 24px; font-weight: bold; color: #2563eb; letter-spacing: 2px;">${temporaryPassword}</p>
                        </div>
                        <p><strong>Important:</strong></p>
                        <ul>
                            <li>This is a temporary password</li>
                            <li>You will be required to change this password after your first login</li>
                            <li>Please keep this password secure</li>
                        </ul>
                        <p>If you did not request this, please contact your administrator.</p>
                        <br/>
                        <p style="color: #666; font-size: 14px;">Best regards,<br/>ESS Portal Team</p>
                    </div>
                `
            });
        } catch (emailError) {
            console.error('Email sending failed:', emailError);
            // Continue anyway - password is generated even if email fails
        }

        res.json({
            message: 'Temporary password generated successfully',
            temporaryPassword,
            note: 'Password has been sent to employee email'
        });
    } catch (error) {
        console.error('Error generating password:', error);
        res.status(500).json({ error: 'Failed to generate temporary password' });
    }
};

// POST /api/auth/forgot-password - User requests password reset
export const FORGOT_PASSWORD = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ error: 'Email is required' });
        }

        const employee = await prisma.employee.findUnique({
            where: { email: email.toLowerCase() }
        });

        if (!employee) {
            // Don't reveal if email exists or not for security
            return res.json({ message: 'If an account exists, a reset link has been sent to your email' });
        }

        // Generate reset token and temporary password
        const resetToken = generateResetToken();
        const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour
        const temporaryPassword = generateRandomPassword(12);

        // Save token and temporary password to database (password stored hashed)
        await prisma.employee.update({
            where: { id: employee.id },
            data: {
                resetToken,
                resetTokenExpiry,
                password: await hashPassword(temporaryPassword),
                isTemporaryPassword: true
            }
        });

        // Send reset email
        const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${resetToken}`;
        
        try {
            await sendEmail({
                to: employee.email,
                subject: 'Password Reset Request - ESS Portal',
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <h2 style="color: #333;">Password Reset Request</h2>
                        <p>Hello ${employee.name},</p>
                        <p>You have requested to reset your password. Click the button below to reset it:</p>
                        <div style="text-align: center; margin: 30px 0;">
                            <a href="${resetUrl}" style="background: #2563eb; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Reset Password</a>
                        </div>
                        <p><strong>Note:</strong> For security reasons, your previous password has been invalidated immediately. You must use the link above to set a new password before you can log in again.</p>
                        <p>Or copy and paste this link into your browser:</p>
                        <p style="background: #f4f4f4; padding: 10px; word-break: break-all; font-size: 12px;">${resetUrl}</p>
                        <p><strong>This link will expire in 1 hour.</strong></p>
                        <p>If you did not request this, please ignore this email and contact your administrator immediately as your current password has been changed.</p>
                        <br/>
                        <p style="color: #666; font-size: 14px;">Best regards,<br/>ESS Portal Team</p>
                    </div>
                `
            });
        } catch (emailError) {
            console.error('Email sending failed:', emailError);
            return res.status(500).json({ error: 'Failed to send reset email' });
        }

        res.json({ message: 'If an account exists, a reset link has been sent to your email' });
    } catch (error) {
        console.error('Error processing forgot password:', error);
        res.status(500).json({ error: 'Failed to process request' });
    }
};

// POST /api/auth/reset-password - User resets password with token
export const RESET_PASSWORD = async (req, res) => {
    try {
        const { token, newPassword } = req.body;

        if (!token || !newPassword) {
            return res.status(400).json({ error: 'Token and new password are required' });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters' });
        }

        // Find employee with valid token
        const employee = await prisma.employee.findFirst({
            where: {
                resetToken: token,
                resetTokenExpiry: {
                    gt: new Date() // Token must not be expired
                }
            }
        });

        if (!employee) {
            return res.status(400).json({ error: 'Invalid or expired reset token' });
        }

        // Update password (stored hashed) and clear token
        await prisma.employee.update({
            where: { id: employee.id },
            data: {
                password: await hashPassword(newPassword),
                isTemporaryPassword: false,
                resetToken: null,
                resetTokenExpiry: null
            }
        });

        res.json({ message: 'Password reset successfully' });
    } catch (error) {
        console.error('Error resetting password:', error);
        res.status(500).json({ error: 'Failed to reset password' });
    }
};

// POST /api/auth/change-password - Authenticated user changes password
export const CHANGE_PASSWORD = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        // Use userId from body if present, otherwise fallback to token ID
        const userId = (req.body.userId !== undefined && req.body.userId !== null) ? req.body.userId : req.user?.id;

        console.log('[DEBUG] Change Password Attempt:', { 
            userId, 
            hasCurrent: !!currentPassword, 
            hasNew: !!newPassword,
            tokenUserId: req.user?.id
        });

        if ((userId === undefined || userId === null) || !currentPassword || !newPassword) {
            console.log('[DEBUG] Validation failed: missing required fields');
            return res.status(400).json({ error: 'All fields are required' });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters' });
        }

        const employee = await prisma.employee.findUnique({
            where: { id: parseInt(userId) }
        });

        if (!employee) {
            return res.status(404).json({ error: 'Employee not found' });
        }

        // Verify current password (supports both bcrypt and legacy plaintext rows)
        if (!(await verifyPassword(currentPassword, employee.password))) {
            return res.status(401).json({ error: 'Current password is incorrect' });
        }

        // Update password (stored hashed)
        await prisma.employee.update({
            where: { id: parseInt(userId) },
            data: {
                password: await hashPassword(newPassword),
                isTemporaryPassword: false
            }
        });

        res.json({ message: 'Password changed successfully' });
    } catch (error) {
        console.error('Error changing password:', error);
        res.status(500).json({ error: 'Failed to change password' });
    }
};

// POST /api/auth/forgot-change-password - User changes password with email and current password verification
export const FORGOT_CHANGE_PASSWORD = async (req, res) => {
    try {
        const { email, currentPassword, newPassword } = req.body;

        if (!email || !currentPassword || !newPassword) {
            return res.status(400).json({ error: 'All fields are required' });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters' });
        }

        const employee = await prisma.employee.findUnique({
            where: { email: email.toLowerCase() }
        });

        if (!employee) {
            return res.status(404).json({ error: 'Employee not found' });
        }

        // Verify current password (supports both bcrypt and legacy plaintext rows)
        if (!(await verifyPassword(currentPassword, employee.password))) {
            return res.status(401).json({ error: 'Current password is incorrect' });
        }

        // Update password (stored hashed)
        await prisma.employee.update({
            where: { id: employee.id },
            data: {
                password: await hashPassword(newPassword),
                isTemporaryPassword: false
            }
        });

        res.json({ message: 'Password changed successfully' });
    } catch (error) {
        console.error('Error changing password:', error);
        res.status(500).json({ error: 'Failed to change password' });
    }
};
