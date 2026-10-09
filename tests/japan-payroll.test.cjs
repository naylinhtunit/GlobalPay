const test = require('node:test');
const assert = require('node:assert/strict');
const { DEFAULT_PAYROLL_POLICY: defaults, splitShift, splitHolidayHours, holidayRateBreakdown, getHolidayAttendance, hasLegacyHolidayHours, suggestHolidayRate, groupHolidayEntries, calculateHolidayPay, normalizeLegacyHolidayFields, validatePolicy, validateHolidayEntries, nextDate } = require('../src/lib/japan-payroll.ts');
const { APP_VERSION, isNewerVersion } = require('../src/lib/app-version.ts');
const fs = require('node:fs');
const path = require('node:path');
const { normalizeNumberInput } = require('../src/lib/number-input.ts');
const { createLocalId } = require('../src/lib/local-id.ts');

const rows = (date, id, rateId) => splitShift(date, defaults.shifts.find(s => s.id === id)).map((s, i) => ({ ...s, id: String(i), rateId }));

test('default policy preserves four company shift allowances', () => {
  assert.equal(validatePolicy(defaults), null);
  for (const shift of defaults.shifts) assert.equal(splitShift('2026-10-10', shift).reduce((n, s) => n + s.hours, 0), 8);
  assert.deepEqual(defaults.shifts.map(s => [s.allowance1Hours, s.allowance2Hours]), [[0, 0], [4, 0], [3, 5], [1, 7]]);
});
test('Monday and all weekdays support holiday work; no implicit Sunday rate', () => {
  for (let day = 10; day <= 16; day++) {
    const entries = rows(`2026-10-${day}`, 'day-08', 'company-135');
    assert.equal(validateHolidayEntries(entries, defaults, '2026-10'), null);
    assert.deepEqual(calculateHolidayPay(entries, defaults, 1000), { work: 10800, night: 0, hours: 8, nightHours: 0 });
  }
});
test('12–21 is not statutory night time', () => {
  assert.equal(rows('2026-10-12', 'day-12', 'company-ot')[0].nightHours, 0);
});
test('19–04 splits Sunday and Monday and removes midnight break', () => {
  const entries = rows('2026-10-11', 'night-19', 'statutory');
  assert.deepEqual(entries.map(s => [s.date, s.hours, s.nightHours]), [['2026-10-11', 5, 2], ['2026-10-12', 3, 3]]);
  entries[1].rateId = 'company-ot';
  assert.deepEqual(calculateHolidayPay(entries, defaults, 1000), { work: 10500, night: 1250, hours: 8, nightHours: 5 });
});
test('21–06 deducts 01–02 break from statutory night hours', () => {
  const entries = rows('2026-10-11', 'night-21', 'statutory');
  assert.deepEqual(entries.map(s => [s.hours, s.nightHours]), [[3, 2], [5, 4]]);
  assert.deepEqual(calculateHolidayPay(entries, defaults, 1000), { work: 10800, night: 1500, hours: 8, nightHours: 6 });
});
test('next-day regular work can be included in base salary; still pays night premium', () => {
  const entries = rows('2026-10-11', 'night-19', 'statutory');
  entries[1].rateId = 'regular-in-base';
  assert.equal(validateHolidayEntries(entries, defaults, '2026-10'), null);
  assert.deepEqual(calculateHolidayPay(entries, defaults, 1000), { work: 6750, night: 1250, hours: 8, nightHours: 5 });
});
test('month/year/leap boundaries and payroll month validation', () => {
  assert.equal(nextDate('2028-02-29'), '2028-03-01');
  assert.equal(nextDate('2026-12-31'), '2027-01-01');
  assert.throws(() => nextDate('2026-02-29'));
  assert.equal(validateHolidayEntries(rows('2026-10-31', 'night-21', 'statutory'), defaults, '2026-10'), null);
  assert.match(validateHolidayEntries(rows('2026-09-30', 'night-21', 'statutory'), defaults, '2026-10'), /payroll month/);
});
test('custom shifts, fractional breaks and company rates', () => {
  const policy = structuredClone(defaults);
  const shift = { ...policy.shifts[0], id: 'custom', start: '18:30', end: '03:30', breakStart: '23:45', breakMinutes: 45, allowance1Hours: 0, allowance2Hours: 8.25 };
  policy.shifts.push(shift);
  policy.holidayRates.push({ id: 'custom', name: 'Company 1.40', multiplier: 1.4, statutory: false });
  assert.equal(validatePolicy(policy), null);
  const entries = splitShift('2026-10-12', shift).map((s, i) => ({ ...s, id: String(i), rateId: 'custom' }));
  assert.deepEqual(entries.map(e => [e.hours, e.nightHours]), [[5.25, 1.75], [3, 3]]);
  assert.deepEqual(calculateHolidayPay(entries, policy, 1000), { work: 11550, night: 1188, hours: 8.25, nightHours: 4.75 });
});
test('reject invalid policy, breaks, statutory rates, zero divisor and underpaid night allowances', () => {
  for (const change of [p => p.hourlyDivisor = 0, p => p.nightPremium = .1, p => p.holidayRates[0].multiplier = 1.25, p => p.shifts[0].breakStart = '18:00', p => p.shifts[0].start = 'bad', p => p.shifts[2].allowance2Hours = 0]) {
    const policy = structuredClone(defaults); change(policy);
    assert.equal(typeof validatePolicy(policy), 'string');
  }
});
test('every overnight segment needs explicit rate; reject negative/excess/duplicate hours', () => {
  const entries = rows('2026-10-12', 'night-21', 'statutory');
  entries[1].rateId = '';
  assert.match(validateHolidayEntries(entries, defaults, '2026-10'), /Choose a rate/);
  entries[1].rateId = 'missing';
  assert.match(validateHolidayEntries(entries, defaults, '2026-10'), /Choose a rate/);
  for (const patch of [{ hours: -1 }, { hours: 25 }, { nightHours: 4 }, { hours: NaN }, { date: '2026-10-99' }]) {
    assert.equal(typeof validateHolidayEntries([{ ...entries[0], ...patch }], defaults, '2026-10'), 'string');
  }
  const repeated = rows('2026-10-12', 'day-08', 'statutory')[0];
  assert.match(validateHolidayEntries(Array(4).fill(repeated), defaults, '2026-10'), /24 hours/);
});
test('policy snapshot is independent of subsequent company changes', () => {
  const stored = JSON.parse(JSON.stringify(defaults));
  const changed = structuredClone(defaults);
  changed.holidayRates[0].multiplier = 1.5;
  const entries = rows('2026-10-12', 'day-08', 'statutory');
  assert.equal(calculateHolidayPay(entries, stored, 1000).work, 10800);
  assert.equal(calculateHolidayPay(entries, changed, 1000).work, 12000);
});

test('account/frontend version matches Android and desktop packages', () => {
  const read = p => fs.readFileSync(path.join(__dirname, '..', p), 'utf8');
  assert.equal(JSON.parse(read('src-tauri/tauri.conf.json')).version, APP_VERSION);
  assert.ok(read('src-tauri/Cargo.toml').includes(`version = "${APP_VERSION}"`));
  assert.ok(read('android/app/build.gradle').includes(`versionName "${APP_VERSION}"`));
});
test('updater only offers newer versions, never downgrades', () => {
  assert.equal(isNewerVersion('v1.0.20', '1.0.19'), true);
  assert.equal(isNewerVersion('v1.1.0', '1.0.19'), true);
  assert.equal(isNewerVersion('v1.0.18', '1.0.19'), false);
  assert.equal(isNewerVersion('v1.0.19', '1.0.19'), false);
  assert.equal(isNewerVersion('invalid', '1.0.19'), false);
});

test('legacy aggregate hours auto-fill without losing values or reviving cleared split hours', () => {
  const old = { saturdayHolidayHours: 8, sundayHolidayHours: 6, holidayShiftType: 'afternoon' };
  const normalized = normalizeLegacyHolidayFields(old);
  assert.deepEqual(normalized, { saturdayHolidayMorningHours: 0, saturdayHolidayAfternoonHours: 8, sundayHolidayMorningHours: 6, sundayHolidayAfternoonHours: 0, saturdayHolidayHours: 8, sundayHolidayHours: 6 });
  assert.deepEqual(old, { saturdayHolidayHours: 8, sundayHolidayHours: 6, holidayShiftType: 'afternoon' });
  const cleared = normalizeLegacyHolidayFields({ ...old, sundayHolidayMorningHours: 0, sundayHolidayAfternoonHours: 0 });
  assert.equal(cleared.sundayHolidayHours, 0);
  assert.equal(cleared.sundayHolidayMorningHours, 0);
  assert.equal(normalizeLegacyHolidayFields(cleared).sundayHolidayHours, 0);
});

test('numeric form fields remove leading zeros without damaging decimal/negative edits', () => {
  for (const [raw, expected] of [['02', '2'], ['0002', '2'], ['00', '0'], ['00.5', '0.5'], ['0.5', '0.5'], ['0.', '0.'], ['-02', '-2'], ['-0.5', '-0.5'], ['', ''], ['2', '2']]) {
    assert.equal(normalizeNumberInput(raw), expected);
  }
});

test('overnight date rows are one visible shift card without changing pay', () => {
  const entries = rows('2026-10-12', 'night-21', 'statutory').map(e => ({ ...e, groupId: 'shift-1' }));
  assert.equal(groupHolidayEntries(entries).length, 1);
  assert.equal(groupHolidayEntries(entries)[0].length, 2);
  assert.equal(calculateHolidayPay(entries, defaults, 1000).work, 10800);
  assert.equal(groupHolidayEntries([...entries, ...rows('2026-10-14', 'day-08', 'company-ot')]).length, 2);
  const oldEntries = rows('2026-10-12', 'night-19', 'statutory');
  assert.equal(groupHolidayEntries(oldEntries).length, 1);
  assert.doesNotThrow(() => groupHolidayEntries(oldEntries.map((e, i) => i === 0 ? { ...e, date: '' } : e)));
});

test('editable regular shift times and breaks are independent payroll snapshots', () => {
  const shift = { ...defaults.shifts[0], id: 'edited-regular', start: '09:00', end: '18:30', breakStart: '13:00', breakMinutes: 45 };
  assert.equal(validatePolicy({ ...defaults, shifts: [shift] }), null);
  assert.deepEqual(splitShift('2026-10-12', shift).map(row => [row.hours, row.nightHours]), [[8.75, 0]]);
  assert.equal(defaults.shifts[0].start, '08:00');
  assert.equal(defaults.shifts[0].breakMinutes, 60);
  assert.equal(validatePolicy({ ...defaults, shifts: [{ ...defaults.shifts[3], id: 'edited-night', start: '20:00', end: '05:00' }] }), null);
});

test('company holiday 1.50 is distinct from statutory holiday and monthly overtime threshold', () => {
  const rate = defaults.holidayRates.find(r => r.id === 'company-150');
  assert.equal(rate.multiplier, 1.5);
  assert.equal(rate.statutory, false);
  const entries = rows('2026-10-10', 'day-08', 'company-150');
  assert.equal(validateHolidayEntries(entries, defaults, '2026-10'), null);
  assert.deepEqual(calculateHolidayPay(entries, defaults, 1000), { work: 12000, night: 0, hours: 8, nightHours: 0 });
});

test('custom holiday clock times calculate actual paid/night hours without changing regular templates', () => {
  const shift = { ...defaults.shifts[3], start: '22:30', end: '06:30', breakStart: '02:00', breakMinutes: 60 };
  const entries = splitShift('2026-10-12', shift).map((row, i) => ({ ...row, id: String(i), groupId: 'custom-night', rateId: 'company-150' }));
  assert.deepEqual(entries.map(row => [row.hours, row.nightHours]), [[1.5, 1.5], [5.5, 4]]);
  assert.equal(validateHolidayEntries(entries, defaults, '2026-10'), null);
  assert.deepEqual(calculateHolidayPay(entries, defaults, 1000), { work: 10500, night: 1375, hours: 7, nightHours: 5.5 });
  assert.equal(groupHolidayEntries(entries).length, 1);
  assert.equal(defaults.shifts[3].start, '21:00');
});

test('local IDs support WebViews and HTTP previews without crypto.randomUUID', () => {
  assert.equal(createLocalId({ randomUUID: () => 'native-uuid' }), 'native-uuid');
  assert.equal(createLocalId({ getRandomValues: bytes => bytes.fill(0) }), '00000000-0000-4000-8000-000000000000');
  const ids = Array.from({ length: 1000 }, () => createLocalId(null));
  assert.equal(new Set(ids).size, ids.length);
  assert.ok(ids.every(id => id.startsWith('local-')));
});

test('two added holiday shifts automatically aggregate monthly attendance and night subset', () => {
  const morning = [...rows('2026-10-10', 'day-08', 'company-150'), ...rows('2026-10-12', 'day-08', 'company-150')];
  assert.deepEqual(calculateHolidayPay(morning, defaults, 1000), { work: 24000, night: 0, hours: 16, nightHours: 0 });
  const night = [...rows('2026-10-10', 'night-21', 'company-150'), ...rows('2026-10-12', 'night-21', 'company-150')];
  assert.deepEqual(calculateHolidayPay(night, defaults, 1000), { work: 24000, night: 3000, hours: 16, nightHours: 12 });
});

test('holiday attendance displays disjoint day/night hours without changing pay or saved totals', () => {
  const entries = [...rows('2026-10-10', 'day-08', 'company-150'), ...rows('2026-10-12', 'night-21', 'company-150')];
  const snapshot = JSON.stringify(entries);
  const pay = calculateHolidayPay(entries, defaults, 1000);
  assert.deepEqual(pay, { work: 24000, night: 1500, hours: 16, nightHours: 6 });
  assert.deepEqual(splitHolidayHours(pay.hours, pay.nightHours), { day: 10, night: 6, total: 16 });
  assert.deepEqual(splitHolidayHours(8, 6), { day: 2, night: 6, total: 8 });
  assert.deepEqual(splitHolidayHours(8, 0), { day: 8, night: 0, total: 8 });
  assert.deepEqual(splitHolidayHours(16, 10), { day: 6, night: 10, total: 16 });
  assert.deepEqual(splitHolidayHours(8.25, 4.75), { day: 3.5, night: 4.75, total: 8.25 });
  assert.equal(JSON.stringify(entries), snapshot);
  assert.deepEqual(calculateHolidayPay(entries, defaults, 1000), pay);
  const saved = { holidayTotalHours: 16, holidayNightHours: 6, holidayWorkAllowance: 24000, holidayNightAllowance: 1500 };
  const original = { ...saved };
  assert.deepEqual(getHolidayAttendance(saved), { day: 10, night: 6, total: 16 });
  assert.deepEqual(saved, original);
});

test('holiday display preserves legacy fallback and explicit cleared aggregate totals', () => {
  assert.deepEqual(getHolidayAttendance({ saturdayHolidayHours: 8, sundayHolidayHours: 6, holidayShiftType: 'morning' }), { day: 14, night: 0, total: 14 });
  assert.deepEqual(getHolidayAttendance({ saturdayHolidayHours: 8, holidayShiftType: 'afternoon' }), { day: 4, night: 4, total: 8 });
  assert.deepEqual(getHolidayAttendance({ saturdayHolidayHours: 8, holidayTotalHours: 0, holidayNightHours: 0 }), { day: 0, night: 0, total: 0 });
  assert.deepEqual(getHolidayAttendance({}), { day: 0, night: 0, total: 0 });
});

test('applied holiday rates follow actual day/night clock hours and editable defaults', () => {
  for (const [id, expected] of [
    ['day-08', [{ kind: 'day', hours: 8, multiplier: 1.5 }]],
    ['day-12', [{ kind: 'day', hours: 8, multiplier: 1.5 }]],
    ['night-19', [{ kind: 'day', hours: 3, multiplier: 1.5 }, { kind: 'night', hours: 5, multiplier: 1.75 }]],
    ['night-21', [{ kind: 'day', hours: 2, multiplier: 1.5 }, { kind: 'night', hours: 6, multiplier: 1.75 }]],
  ]) {
    const pay = calculateHolidayPay(rows('2026-10-12', id, 'company-150'), defaults, 1000);
    const parts = holidayRateBreakdown(pay.hours, pay.nightHours, 1.5, .25);
    assert.deepEqual(parts, expected);
    assert.equal(parts.reduce((sum, part) => sum + part.hours * part.multiplier * 1000, 0), pay.work + pay.night);
  }
  assert.deepEqual(holidayRateBreakdown(8, 6, 1.35, .25), [
    { kind: 'day', hours: 2, multiplier: 1.35 }, { kind: 'night', hours: 6, multiplier: 1.6 },
  ]);
  assert.deepEqual(holidayRateBreakdown(6, 6, 1.5, .3), [{ kind: 'night', hours: 6, multiplier: 1.8 }]);
  assert.deepEqual(holidayRateBreakdown(0, 0, 1.5, .25), []);
});

test('legacy holiday controls are only shown when preserved legacy hours exist', () => {
  assert.equal(hasLegacyHolidayHours({}), false);
  assert.equal(hasLegacyHolidayHours({ saturdayHolidayHours: 8 }), true);
  assert.equal(hasLegacyHolidayHours({ sundayHolidayAfternoonHours: 8 }), true);
  assert.equal(hasLegacyHolidayHours({ saturdayHolidayHours: 8, saturdayHolidayMorningHours: 0, saturdayHolidayAfternoonHours: 0 }), false);
});

test('holiday rates prefill editable company or shift defaults without changing existing entries', () => {
  const policy = structuredClone(defaults);
  assert.equal(suggestHolidayRate(policy, policy.shifts[0], []), 'company-150');
  assert.equal(suggestHolidayRate(policy, policy.shifts[3], []), 'company-150');
  policy.defaultHolidayRateId = 'company-135';
  policy.shifts[3].holidayRateId = 'company-ot';
  assert.equal(suggestHolidayRate(policy, policy.shifts[0], []), 'company-135');
  assert.equal(suggestHolidayRate(policy, policy.shifts[3], []), 'company-ot');
  const entries = rows('2026-10-12', 'night-21', 'statutory');
  const original = JSON.stringify(entries);
  assert.equal(suggestHolidayRate(policy, policy.shifts[3], entries), 'company-ot');
  assert.equal(JSON.stringify(entries), original);
  assert.equal(calculateHolidayPay(entries, policy, 1000).work, 10800);
  const oldPolicy = structuredClone(defaults);
  delete oldPolicy.defaultHolidayRateId;
  assert.equal(suggestHolidayRate(oldPolicy, oldPolicy.shifts[3], entries), 'statutory');
  entries[1].rateId = 'company-ot';
  assert.equal(suggestHolidayRate(oldPolicy, oldPolicy.shifts[3], entries), '');
  assert.equal(suggestHolidayRate(oldPolicy, oldPolicy.shifts[0], entries), 'company-150');
  policy.defaultHolidayRateId = 'removed-rate';
  assert.match(validatePolicy(policy), /available default holiday rate/);
});
