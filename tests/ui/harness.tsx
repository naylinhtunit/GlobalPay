import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { ThemeProvider } from "next-themes";
import { LanguageProvider } from "../../src/context/LanguageContext";
import { CountryProvider } from "../../src/context/CountryContext";
import AccountPage from "../../src/app/account/page";
import EmployeesPage from "../../src/app/employees/page";
import CalendarPage from "../../src/app/calendar/page";
import { PayslipDocument } from "../../src/components/payroll/PayslipDocument";
import { AppUpdater } from "../../src/components/updater/AppUpdater";
import { LanguageSelector } from "../../src/components/LanguageSelector";
import { fixture } from "./mock-native-updater";

const RealDate = Date;
let now = new RealDate(2026, 9, 11, 12).getTime();
// Isolated fixture clock only. Production code and the user's device clock are untouched.
class FixtureDate extends RealDate {
  constructor(...args: any[]) { if (args.length) super(...args as [any]); else super(now); }
  static now() { return now; }
}
(globalThis as any).Date = FixtureDate;
function Harness() {
  const [view, setView] = useState("account");
  const [, redraw] = useState(0);
  const [mount, setMount] = useState(0);
  return <ThemeProvider attribute="class"><LanguageProvider><CountryProvider>
    <aside className="relative z-[60] border-b bg-background p-3 flex flex-wrap gap-2 text-xs">
      <label>Test screen <select aria-label="Test screen" value={view} onChange={event => setView(event.target.value)}>{["account", "employees", "calendar", "payslip"].map(value => <option key={value}>{value}</option>)}</select></label>
      <label>Test platform <select aria-label="Test platform" value={fixture.platform} onChange={event => { fixture.platform = event.target.value as any; redraw(value => value + 1); setMount(value => value + 1); }}><option>android</option><option>macos</option><option>windows</option></select></label>
      <label>Test error <select aria-label="Test error" value={fixture.error} onChange={event => { fixture.error = event.target.value; redraw(value => value + 1); }}>{["", "check", "download", "permission", "install"].map(value => <option key={value} value={value}>{value || "none"}</option>)}</select></label>
      <button onClick={() => { fixture.latest = !fixture.latest; redraw(value => value + 1); }}>Toggle latest</button>
      <button onClick={() => { now = new RealDate(2027, 0, 1, 0, 0, 1).getTime(); document.dispatchEvent(new Event("visibilitychange")); redraw(value => value + 1); }}>Advance to 2027</button>
      <output aria-label="Native calls">{`checks ${fixture.checks} downloads ${fixture.downloads} installs ${fixture.installs}`}</output>
      <LanguageSelector compact />
    </aside>
    {view === "account" ? <AccountPage /> : view === "employees" ? <EmployeesPage /> : view === "calendar" ? <CalendarPage /> : <>
      <PayslipDocument companyName="My Company / မြန်မာ会社" country="Japan" employee={{ fullName: "Test Employee", baseSalary: 241200, employeeNumber: "3095" }} month="2026-10" data={{}} record={{ totalGrossPay: 241200, netPay: 200000 }} />
      <PayslipDocument companyName="My Company / မြန်မာ会社" country="Myanmar" employee={{ fullName: "Test Employee", baseSalary: 300000, employeeNumber: "3095" }} month="2026-10" data={{}} record={{}} />
    </>}
    <AppUpdater key={mount} />
  </CountryProvider></LanguageProvider></ThemeProvider>;
}
createRoot(document.getElementById("root")!).render(<Harness />);
