# **App Name**: GlobalPay

## Core Features:

- International Payroll Calculation: Dynamically apply payroll logic, fields, and deduction rules for selected countries (Japan or Myanmar) based on local regulations and specific inputs.
- Custom Payslip Generation: Generate payslips for each employee, adhering precisely to the specified layouts for both Japan and Myanmar, using input data and calculated deductions.
- Employee Data Management (CRUD): Create, read, update, and delete employee records, storing essential information for payroll processing in Firestore.
- Monthly Payroll Record Management (CRUD): Manage monthly payroll entries, including basic salary, allowances, and deductions, with CRUD functionality, backed by Firestore.
- Export & Print Payslips: Provide options to print payslips directly or download them as PDF files for record-keeping and distribution.
- Country Selector: A 'Globe' icon or 'Language/Country' switcher in the header to select between Myanmar (MMK) and Japan (JPY) payroll contexts, changing input fields and calculation logic.

## Style Guidelines:

- A sophisticated and reliable palette. Primary actions and important information will use a deep, authoritative blue (#2D2D86). The background will be a subtle, almost white blue-gray (#F0F0F4) for clarity and readability in data-heavy forms. Key accents and interactive elements will feature a bright, clear blue (#3C8CEB) to guide user focus.
- The font for all text, including headlines, body, and tabular data, will be 'Inter' (sans-serif) for its modern, neutral, and highly legible characteristics, ensuring clarity across diverse numerical and textual information.
- Use a set of clear, minimalist, and functional icons consistent with professional applications. This includes a distinct 'Globe' icon for country selection, alongside standard icons for CRUD operations (e.g., plus for create, pencil for edit, trash for delete), print, and download actions. Tailwind CSS-compatible icon libraries like Heroicons will be utilized.
- The layout will prioritize clear information hierarchy and responsiveness, designed using Tailwind CSS. Specific payslip layouts for Japan and Myanmar will be precisely recreated as requested. Forms will feature structured input fields, and payroll data will be presented in readable, tabular formats adaptable to different screen sizes.
- Subtle and purposeful animations will be employed to enhance user experience without distraction. This includes smooth transitions for navigation elements, modest hover effects on interactive components, and clear loading indicators for data processing and export operations.