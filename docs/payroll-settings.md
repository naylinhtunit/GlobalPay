# Japan payroll: configurable shifts and holiday work

Available in the shared web/PWA, Android (Capacitor) and desktop (Tauri) frontend from v1.0.19.

## Using the form

- Regular shift blocks count ordinary workdays only. Four initial templates are 08–17, 12–21, 19–04 and 21–06. Start/end times are directly editable in each block; break times and company allowance hours are under the block's advanced details. These edits are saved only in that payroll's custom shift snapshot, not the company defaults. Check unpaid breaks and allowance hours when changing times.
- Add/edit company templates and rates under **Account → Payroll settings**. Settings no longer appear inside the payroll form.
- Add holiday work with a date and shift. Any weekday is supported. Each added shift appears as one card, including overnight shifts. Overnight work is calculated separately on either side of civil midnight; choose a rate independently for both dates in the same card. Detailed hour/date edits and calendar shortcuts are collapsed initially. A month-end continuation is included with the starting month's payroll; do not enter it again in the following payroll.
- Holiday shift start/end times and unpaid breaks can be edited before adding work. The selected dropdown label and paid/night-hour preview follow those edits. The preview is per shift, not a monthly total; company defaults and regular-shift allowances remain unchanged. Choose the actual break start and duration in whole minutes, including for overnight shifts.
- Every dated row requires an explicit rate. Neither Sunday nor the last day of consecutive holidays is assumed to be a statutory holiday. Verify the employer's designated statutory holiday and any substitute-holiday arrangements.
- Company-policy 1.35 and 1.50 options are separate from statutory holiday and monthly overtime-threshold options. Choosing a company-policy multiplier does not designate a date as a statutory holiday. Confirm the applicable rate and rounding with payroll staff; do not infer all holiday rates from one payslip.
- Paid/night hours may be adjusted for actual attendance. Night hours mean 22:00–05:00, excluding unpaid breaks. Entries are not also counted in ordinary workdays or regular/late-night overtime inputs.
- Company-holiday work within legal hours and overtime have separate rate choices. The app cannot infer weekly overtime from monthly shift-day totals. Split a day's hours into separate rows when different rates apply. There is also a 1.50 overtime option for hours above the monthly 60-hour threshold.
- For a continuation date that is ordinary work already included in the monthly base salary, choose the explicitly labelled base-salary-included rate (0 additional ordinary pay); night premium is still paid. Do not also count these night hours in a regular shift block.
- **Save company defaults** synchronizes templates/rates for future forms across devices. Editing a form alone changes only that payroll's snapshot. Existing payroll records and printed/exported amounts do not change when defaults change.
- Legacy Sat/Sun aggregate fields remain under a separate collapsed section, retain their original 1.35/company-afternoon-allowance calculation, and are added to dated rows. Clear the corresponding legacy hours if replacing them with dated rows to avoid double counting.

## Calculation scope

Hourly basis remains base salary divided by the configurable monthly-hours divisor (default 170.5). Verify the wage basis/divisor for the employment contract; other legally includable wage components are not automatically determined. Dated work allowance is the sum of paid hours × selected total multiplier × hourly basis; night allowance is separately night hours × night premium × hourly basis. Each aggregate is rounded once to the nearest yen. Legacy aggregates are separately rounded for backward compatibility.

Regular shift allowance hours preserve the pre-existing company-specific 0.25/0.30 schedule; they are labelled company allowances, not statutory night hours. Statutory night calculations on dated rows use actual clock time. Tax/social-insurance estimates remain the pre-existing implementation, not an official withholding calculator; payroll staff must verify/override them. Manual income-tax edits are preserved during recalculation.

Legal reference: [MHLW labour conditions](https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/koyou_roudou/roudouseisaku/chushoukigyou/joken_kankyou_rule.html) and [MHLW night-work FAQ](https://www.mhlw.go.jp/bunya/roudoukijun/faq_kijyunhou_25.html). Statutory holiday premium is at least 35%; statutory night premium at least 25%. Company holidays are not automatically statutory holidays. These templates are configurable examples, not a determination of any employer's rules.

## Persistence and compatibility

The company configuration is an owner-protected `payrollRecords/settings_Japan_{uid}` document with `recordType: payrollSettings`, `country: JapanPayrollSettings`, `employeeId: __settings__`, and `policy`. The separate country discriminator intentionally reuses the deployed owner-only rules without requiring a rules migration. All existing payroll/dashboard queries filter country=Japan or Myanmar, so configuration is excluded. No client secrets/admin credentials are stored in it.

Actual Japan records snapshot `japanData.workPolicy`, dated `holidayEntries`, `holidayTotalHours`, and `holidayNightHours`. Legacy records load the original default policy when edited, not the company's current defaults. PDF and Excel include dated shift/rate details.

## Verification / release

Run `npm run test:payroll`, `npm run typecheck`, `npm run build:android` and platform builds. Windows Actions requires the six `NEXT_PUBLIC_FIREBASE_*` build secrets used by the frontend. These are Firebase client configuration, not service-account credentials. Builds fail when required configuration is missing.
