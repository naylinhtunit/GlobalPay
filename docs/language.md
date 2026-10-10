# Display language

From v1.0.21, Account → Language offers Myanmar, English and Japanese. Login, the public landing page and Calendar also offer the same shared selector.

- Language is a device/browser preference (`globalpay_language` in localStorage), defaulting to Myanmar. It persists across app restarts and synchronizes between tabs on the same origin.
- It is independent of payroll country, currency, company settings and payroll calculations. Switching language updates labels without resetting open form values.
- Translations are bundled for offline/native use. No external translation service receives payroll data.
- Main screens, payroll forms, built-in shift/rate labels and payslip/PDF/Excel labels use the selected language. Names and other custom user-authored text are preserved, not automatically translated or rewritten in storage.
- Myanmar date names have an explicit fallback for WebViews that lack Myanmar Intl date support. Native operating-system date/time picker controls may use the device language.
- Existing payroll records, policy snapshots and authentication persistence are unchanged. There is no database migration.

Verification: `npm run test:payroll`, `npm run typecheck`, platform builds, and isolated UI fixtures for all three languages, country independence, persistence and actual-hours rates.
