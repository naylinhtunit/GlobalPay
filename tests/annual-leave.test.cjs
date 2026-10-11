const test = require('node:test');
const assert = require('node:assert/strict');
const { leaveForYear, legacyLeaveYear, usedLeaveForYear, payrollLeaveTotal, completedServiceYears, nextYearCheckDelay, validLeaveDays } = require('../src/lib/annual-leave.ts');
const { normalizeCompanyName, payslipCompanyName } = require('../src/lib/company-profile.ts');

test('legacy active allowance is preserved once, never revived next January', () => {
  const employee = { totalPaidLeave: 12 };
  const before = JSON.stringify(employee);
  assert.deepEqual(leaveForYear(employee, 2026), { year: 2026, total: 12, assigned: true });
  assert.deepEqual(leaveForYear(employee, 2027), { year: 2027, total: 0, assigned: false });
  assert.equal(leaveForYear(employee, 2028).assigned, false);
  assert.equal(JSON.stringify(employee), before);
  assert.equal(legacyLeaveYear({ createdAt: { seconds: new Date(2027, 1, 1).getTime() / 1000 } }), 2027);
});
test('annual allowances are independent, including an explicitly assigned zero', () => {
  const employee = { totalPaidLeave: 12, annualLeaveLegacyYear: 2026, annualLeaveByYear: { 2026: 14, 2027: 16, 2028: 0 } };
  assert.equal(leaveForYear(employee, 2026).total, 14);
  assert.equal(leaveForYear(employee, 2027).total, 16);
  assert.deepEqual(leaveForYear(employee, 2028), { year: 2028, total: 0, assigned: true });
  assert.equal(leaveForYear(employee, 2029).assigned, false);
  for (const value of [-1, NaN, Infinity, 367]) assert.equal(validLeaveDays(value), false);
  assert.equal(validLeaveDays(0.5), true);
});
test('used leave resets by payroll year, not payout year, with legacy month fallback', () => {
  const records = [
    { id: 'a', employeeId: 'e', payPeriodStartDate: '2026-12-01', paidLeaveDays: 3, payoutDate: '2027-01-01' },
    { id: 'b', employeeId: 'e', month: '2027-01', japanData: { paidLeaveDays: 2 } },
    { id: 'c', employeeId: 'other', month: '2027-01', paidLeaveDays: 20 },
    { id: 'd', employeeId: 'e', month: '2027-02', paidLeaveDays: 0, japanData: { paidLeaveDays: 7 } },
  ];
  assert.equal(usedLeaveForYear(records, 'e', 2026), 3);
  assert.equal(usedLeaveForYear(records, 'e', 2027), 2);
  assert.equal(usedLeaveForYear(records, 'e', 2027, 'b'), 0);
});
test('historical payroll entitlement and legacy remaining balances survive new allocations', () => {
  const employee = { totalPaidLeave: 10, annualLeaveByYear: { 2027: 20 } };
  const record = { month: '2026-08', paidLeaveDays: 2, japanData: { remainingPaidLeave: 6 }, leaveEntitlement: { year: 2026, total: 12 } };
  assert.equal(payrollLeaveTotal(employee, 2026, record, 4), 12);
  assert.equal(payrollLeaveTotal(employee, 2027, record, 0), 20);
  const legacy = { month: '2025-08', paidLeaveDays: 2, japanData: { remainingPaidLeave: 6 } };
  assert.equal(payrollLeaveTotal(employee, 2025, legacy, 4) - 4 - 2, 6);
  assert.equal(payrollLeaveTotal(employee, 2028, null, 0), 0);
});
test('New Year timer wakes at the boundary and service years are only guidance', () => {
  assert.equal(nextYearCheckDelay(new Date(2026, 11, 31, 23, 59, 59)), 1050);
  assert.equal(nextYearCheckDelay(new Date(2026, 0, 1)), 86400000);
  assert.equal(completedServiceYears('2020-01-01', 2027), 7);
  assert.equal(completedServiceYears('2020-02-01', 2027), 6);
});
test('company names remain user-authored and snapshots are not rewritten by profile changes', () => {
  assert.equal(normalizeCompanyName('  日本工業 / မြန်မာ  '), '日本工業 / မြန်မာ');
  const record = { companyName: 'Original Co' };
  assert.equal(payslipCompanyName(record, 'Renamed Co'), 'Original Co');
  assert.equal(payslipCompanyName({}, 'Renamed Co'), 'Renamed Co');
  assert.equal(payslipCompanyName(null, ''), '');
  assert.deepEqual(record, { companyName: 'Original Co' });
});
