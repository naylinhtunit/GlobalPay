const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const vm = require('node:vm');
const { MESSAGES, isLanguage, hasTranslation, translateText, localizeShiftLabel, formatDisplayDate, LANGUAGE_LOCALES } = require('../src/lib/i18n.ts');
const { DEFAULT_PAYROLL_POLICY, calculateHolidayPay, splitShift } = require('../src/lib/japan-payroll.ts');

test('three display languages are independent of payroll country and currency', () => {
  assert.deepEqual(LANGUAGE_LOCALES, { my: 'my-MM', en: 'en-US', ja: 'ja-JP' });
  for (const value of ['my', 'en', 'ja']) assert.equal(isLanguage(value), true);
  for (const value of ['Japan', 'Myanmar', 'JP', 'MM', 'JPY', 'MMK', null, '']) assert.equal(isLanguage(value), false);
  assert.equal(translateText('Account', 'my'), 'အကောင့်');
  assert.equal(translateText('Account', 'en'), 'Account');
  assert.equal(translateText('Account', 'ja'), 'アカウント');
  assert.equal(translateText('Country', 'en'), 'Country');
});

test('inline native startup redirects parse and only redirect native landing routes', () => {
  const ast = ts.createSourceFile('layout.tsx', fs.readFileSync('src/app/layout.tsx', 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const scripts = [];
  function visit(node) {
    if (ts.isNoSubstitutionTemplateLiteral(node) && node.text.includes("location.replace('/login')")) scripts.push(node.text);
    ts.forEachChild(node, visit);
  }
  visit(ast);
  assert.equal(scripts.length, 2);
  for (const source of scripts) {
    const script = new vm.Script(source);
    for (const [native, pathname, expected] of [[false, '/', false], [true, '/', true], [true, '/index.html', true], [true, '/payroll/', false], [false, '/login/', false]]) {
      let redirected = false;
      const context = { window: { Capacitor: { isNativePlatform: () => native } }, navigator: { userAgent: '' }, location: { pathname, replace: url => { assert.equal(url, '/login'); redirected = true; } } };
      script.runInNewContext(context);
      assert.equal(redirected, expected, source);
    }
  }
});

test('message parameters are preserved in all languages', () => {
  const parameters = text => [...text.matchAll(/\{(\w+)\}/g)].map(match => match[1]).sort();
  for (const [en, my, ja] of MESSAGES) {
    assert.deepEqual(parameters(my), parameters(en), en + ': Myanmar');
    assert.deepEqual(parameters(ja), parameters(en), en + ': Japanese');
  }
  assert.equal(translateText('{hours} hours ×{rate}', 'en', { hours: 6, rate: '1.75' }), '6 hours ×1.75');
  assert.equal(translateText('{hours} hours ×{rate}', 'ja', { hours: 6, rate: '1.75' }), '6時間 ×1.75');
  assert.equal(translateText('{hours} hours ×{rate}', 'my', { hours: 6, rate: '1.75' }), '6 နာရီ ×1.75');
});

test('Myanmar dates do not fall back to English month or weekday names', () => {
  const date = new Date(2026, 9, 12);
  assert.match(formatDisplayDate(date, 'my', { month: 'long' }), /အောက်တိုဘာ/);
  assert.doesNotMatch(formatDisplayDate(date, 'my', { dateStyle: 'full' }), /October|Monday/);
  assert.match(formatDisplayDate(date, 'en', { month: 'long' }), /October/);
  assert.match(formatDisplayDate(date, 'ja', { month: 'long' }), /10月/);
});

test('translation does not rewrite custom names, snapshots, IDs or payroll calculations', () => {
  const original = JSON.stringify(DEFAULT_PAYROLL_POLICY);
  const entries = splitShift('2026-10-12', DEFAULT_PAYROLL_POLICY.shifts[3]).map((row, i) => ({ ...row, id: String(i), rateId: 'company-150' }));
  const before = JSON.stringify(entries);
  const pay = calculateHolidayPay(entries, DEFAULT_PAYROLL_POLICY, 1000);
  for (const language of ['my', 'en', 'ja']) {
    assert.equal(translateText('My Company / 株式会社テスト', language), 'My Company / 株式会社テスト');
    assert.equal(translateText('company-150', language), 'company-150');
    assert.equal(localizeShiftLabel('Special factory shift 21:00–06:00', language), 'Special factory shift 21:00–06:00');
    entries.forEach(row => localizeShiftLabel(row.shiftName, language));
    assert.deepEqual(calculateHolidayPay(entries, DEFAULT_PAYROLL_POLICY, 1000), pay);
  }
  assert.equal(localizeShiftLabel('Night / ညဆိုင်း 21:00–06:00', 'en'), 'Night 21:00–06:00');
  assert.equal(localizeShiftLabel('Night / ညဆိုင်း 21:00–06:00', 'ja'), '夜勤 21:00–06:00');
  assert.equal(JSON.stringify(entries), before);
  assert.equal(JSON.stringify(DEFAULT_PAYROLL_POLICY), original);
});

test('every literal UI translation key has all three catalog translations', () => {
  const dirs = ['src/app', 'src/components/payroll', 'src/components/layout', 'src/components/updater', 'src/components/pwa'];
  const files = [];
  function collect(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const file = path.join(dir, entry.name);
      if (entry.isDirectory()) collect(file); else if (file.endsWith('.tsx')) files.push(file);
    }
  }
  dirs.forEach(collect);
  files.push('src/components/CompanyProfileSettings.tsx');
  for (const file of files) {
    const source = fs.readFileSync(file, 'utf8');
    const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    function visit(node) {
      if (ts.isCallExpression(node) && node.expression.getText(ast) === 't' && node.arguments[0] && ts.isStringLiteral(node.arguments[0])) {
        assert.equal(hasTranslation(node.arguments[0].text), true, file + ': ' + node.arguments[0].text);
      }
      ts.forEachChild(node, visit);
    }
    visit(ast);
  }
  for (const preset of DEFAULT_PAYROLL_POLICY.shifts) assert.equal(hasTranslation(preset.name), true, preset.name);
  for (const rate of DEFAULT_PAYROLL_POLICY.holidayRates) assert.equal(hasTranslation(rate.name), true, rate.name);
});
