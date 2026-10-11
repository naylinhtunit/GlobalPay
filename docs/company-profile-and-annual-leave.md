# Company name and calendar-year leave

## Company profile

Account → Company name stores a trimmed 1–120-character company-authored name. It is
shared across the account's devices and payroll countries, not translated. It uses a
dedicated `payrollRecords/profile_UID` settings document (`country: CompanyProfile`,
`employeeId: __settings__`) under the existing deployed owner rules, matching the
existing payroll-settings storage approach. Country payroll/dashboard queries exclude
it. No new security-rule deployment or destructive migration is required.

Japan and Myanmar payslip previews/PDFs/Excel include the company name. New payrolls
snapshot it; later company renames do not rewrite issued slips. Legacy slips without
a snapshot show the current profile name. Blank legacy names do not invent an issuer.

## Annual rollover

Dates are Gregorian calendar years starting January 1 in the device's local timezone.
Calendar already stores full dates, so a new year starts with its own holiday list;
there is no cross-year copying and no deletion of old events. The selected current
year rolls over even if the app stays open across midnight or resumes later. Users
can still navigate to historical years or prepare next year's calendar in advance.

Employee allowances use `annualLeaveByYear: { "2026": 12, "2027": 15 }`. A missing new
year shows zero, **not set**, rather than silently copying last year's entitlement.
An explicit zero is distinguishable from an unset allowance. Employees → Leave year
selects which allocation is viewed/edited; the form freezes that year when opened,
so a form saved across midnight cannot accidentally change a different year.
Completed tenure at the start of the chosen year is guidance only; no statutory
entitlement is guessed from it. Users set each year's amount according to policy.

Used leave is summed by payroll period's year (with legacy `month` fallback), not
payment timestamp; editing excludes that record from the used sum. New Japan payrolls
with assigned allowances snapshot `{ year, total }` so later allowance changes cannot
rewrite their balances. Legacy historical balances remain recorded; opening the app
does not update payroll documents. Missing allowances must be set before new paid
leave can be entered. No carryover is automatically calculated.

Legacy `totalPaidLeave` has no year. Its active migration baseline is **2026**, fixed
in code rather than recalculated every January. Employees created with an old client
after that baseline use their creation year. On the first employee edit, this anchor
is persisted as `annualLeaveLegacyYear`; the legacy number is left untouched, and
only the chosen year's map entry is transactionally updated. Other annual entries
and other employees are preserved. Avoid continuing to edit with old app versions:
they cannot understand annual maps.

This is an annual *allocation workflow*, not an instruction to extinguish statutory
leave. Required carryover must be included when assigning the new year's allowance.
For example, Japanese annual paid leave generally remains exercisable for two years
from grant; January 1 alone does not cancel that right. Confirm the applicable policy
with payroll staff: [MHLW guidance](https://www.check-roudou.mhlw.go.jp/qa/roudousya/yukyu/q6.html).
