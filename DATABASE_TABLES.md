# Database Table Schema
## Employee Service System (ESS)

This document provides a comprehensive breakdown of every table in the ESS database, including field types and relationships.

---

### 1. Employee
The central entity for all users.
- `id` (Int, PK): Auto-incrementing ID.
- `organizationId` (Int, FK): Linked to `Organization`.
- `employeeId` (String): Company-specific ID code.
- `name` (String): Full name.
- `email` (String): Primary email (Unique within Org).
- `role` (String): 'user', 'admin', 'super-admin'.
- `status` (String): Current employment status.
- `password` (String): Hashed password.
- `locationHistory` (Json): Array of past coordinates.
- `expenseLimit` (Float): Monthly cap on expenses.

### 2. Organization
Tenant configuration.
- `id` (Int, PK): Auto-incrementing ID.
- `name` (String): Unique name.
- `slug` (String): URL-friendly identifier.
- `plan` (String): Subscription tier.
- `userLimit` (Int): Max employees allowed.
- `logo` (String): URL/Path to logo.
- `payslipConfig` (Json): Layout settings for PDFs.

### 3. SalarySlip
Payroll records.
- `id` (Int, PK).
- `employeeId` (Int, FK).
- `month`, `year` (String).
- `basicSalary`, `hra`, `netPay` (Float).
- `attendanceStatus` (String).

### 4. Leave
- `id` (Int, PK).
- `employeeId` (Int, FK).
- `type` (String): 'Sick', 'Casual', etc.
- `startDate`, `endDate` (DateTime).
- `status` (String): 'Pending', 'Approved', 'Rejected'.

### 5. Expense & ExpenseItem
- **Expense**: `id`, `claimDate`, `totalAmount`, `status`, `employeeId`.
- **ExpenseItem**: `id`, `expenseId` (FK), `type`, `description`, `price`.

### 6. MoneyRequest
- `id` (Int, PK).
- `employeeId` (Int, FK).
- `amount` (Float).
- `urgency` (String): 'Normal', 'High', 'Urgent'.
- `status` (String): 'Pending', 'Approved', etc.

### 7. TrackingLog & LoginLog
- **TrackingLog**: `employeeId`, `action`, `timestamp`, `latitude`, `longitude`, `city`.
- **LoginLog**: `userId`, `email`, `ipAddress`, `deviceInfo`, `loginTime`, `logoutTime`, `loginLat`, `loginLong`.

### 8. Referral & ReferralPoints
- **Referral**: `referrerId` (FK), `referredName`, `referredEmail`, `status`, `points`.
- **ReferralPoints**: `employeeId` (FK), `points`, `totalEarned`, `totalUsed`.

### 9. Subscription & Plans
- **SubscriptionPlan**: `name`, `price`, `userLimit`, `features` (Json).
- **CustomPlanRequest**: `organizationId` (FK), `users`, `duration`, `features`, `status`.

### 10. Communication
- **Announcement**: `title`, `content`, `organizationId` (FK), `authorId` (FK).
- **Policy**: `title`, `category`, `content`, `organizationId` (FK).
- **Holiday**: `name`, `date`, `type`, `organizationId` (FK).
- **Notification**: `type`, `title`, `message`, `recipientId`, `isRead`.

### 11. Company
- `id`, `name`, `logoUrl`, `organizationId` (FK).
