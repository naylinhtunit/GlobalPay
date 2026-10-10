"use client";
import { useLanguage } from "@/context/LanguageContext";

import React from "react";
import { formatDisplayDate, localizeShiftLabel } from "@/lib/i18n";
import { Country } from "@/context/CountryContext";
import { getHolidayAttendance, hasLegacyHolidayHours, splitHolidayHours } from "@/lib/japan-payroll";

interface Props {
  country: Country;
  employee: any;
  month: string;
  data: any;
  record?: any; // Contains the actual basicSalary at payment time
}

export const PayslipDocument = React.forwardRef<HTMLDivElement, Props>(({ country, employee, month, data, record }, ref) => {
  const { t, language } = useLanguage();
  const [yearPart, monthPart] = (month || "").split('-');
  const displayYear = yearPart || new Date().getFullYear().toString();
  const displayMonthNum = monthPart ? parseInt(monthPart, 10) : new Date().getMonth() + 1;
  const lastDayOfMonth = new Date(parseInt(displayYear), displayMonthNum, 0).getDate();

  // Use the salary recorded at payment time to preserve historical integrity
  const payTimeSalary = record?.basicSalary || employee.baseSalary || 0;

  if (country === "Japan") {
    const holidayHours = getHolidayAttendance(data);
    const totalEarnings = (record?.totalGrossPay || 0);
    const totalDeductions = (record?.totalDeductions || 0);
    const netPay = (record?.netPay || 0);

    return (
      <div ref={ref} className="p-8 md:p-12 max-w-[1000px] mx-auto bg-white text-black font-sans border border-gray-400 shadow-sm print:shadow-none print:border-none print:p-4">
        <div className="mb-6 flex justify-between items-start">
          <div className="space-y-1">
            <h1 className="text-2xl font-black tracking-widest border-b-2 border-black inline-block pb-1">{t("Payroll Statement")}</h1>
            <p className="text-sm mt-4 font-bold">{t("GlobalPay Enterprise System")}</p>
          </div>
          <div className="text-right space-y-2">
            <p className="text-xl font-bold border-b border-black pb-1">{t("Payroll for {month}", { month: formatDisplayDate(new Date(Number(displayYear), displayMonthNum - 1, 1), language, { year: "numeric", month: "long" }) })}</p>
            <div className="flex gap-4 text-xs justify-end mt-4">
              <div className="border border-black p-2 w-24 text-center">
                <p className="text-[8px] text-gray-500">{t("Pay Date")}</p>
                <p className="font-bold">{displayYear}-{String(displayMonthNum).padStart(2, '0')}-{String(lastDayOfMonth).padStart(2, '0')}</p>
              </div>
              <div className="border border-black p-2 w-24 h-24 text-center">
                <p className="text-[8px] text-gray-500">{t("Seal")}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
          <div className="border border-black p-2 flex items-center gap-4">
            <span className="text-[10px] font-bold border-r pr-2 h-full flex items-center">{t("Name")}</span>
            <span className="font-bold">({employee.employeeNumber}) {employee.fullName}</span>
          </div>
          <div className="border border-black p-2 flex items-center gap-4">
            <span className="text-[10px] font-bold border-r pr-2 h-full flex items-center">{t("Department")}</span>
            <span>{employee.department || '-'}</span>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-0 border-t border-l border-black text-[10px]">
          {/* Attendance Column */}
          <div className="border-r border-b border-black flex flex-col">
            <div className="bg-gray-100 p-1 font-bold text-center border-b border-black">{t("Attendance")}</div>
            <div className="flex-1 p-1 space-y-0.5">
              {[
                { l: "所定就労日", e: "Work Days", v: data.scheduledDays },
                { l: "欠勤日時間", e: "Absence", v: data.absenceHours },
                { l: "遅刻早退", e: "Late/Early", v: data.lateEarlyHours },
                { l: "普通残業", e: "Regular OT", v: data.regularOTHours },
                { l: "深夜残業", e: "Late Night OT", v: data.lateNightOTHours },
                ...(hasLegacyHolidayHours(data) ? [
                { l: "土曜休日(朝)", e: "Sat Hol Morn", v: data.saturdayHolidayMorningHours ?? data.saturdayHolidayHours ?? 0 },
                { l: "土曜休日(昼)", e: "Sat Hol Aft", v: data.saturdayHolidayAfternoonHours ?? 0 },
                { l: "日曜休日(朝)", e: "Sun Hol Morn", v: data.sundayHolidayMorningHours ?? data.sundayHolidayHours ?? 0 },
                { l: "日曜休日(昼)", e: "Sun Hol Aft", v: data.sundayHolidayAfternoonHours ?? 0 },
                ] : []),
                { l: "休日・深夜以外", e: "Holiday Day Hrs", v: holidayHours.day },
                { l: "休日深夜", e: "Holiday Night Hrs", v: holidayHours.night },
                { l: "休日合計（日中＋深夜）", e: "Holiday Total (Day + Night)", v: holidayHours.total },
                { l: "~22", e: "Night 1", v: data.nightShiftHours },
                { l: "22~", e: "Night 2", v: data.nightShiftHoursExtra },
                { l: "有休日数", e: "Paid Leave", v: data.paidLeaveDays },
                { l: "昼食回数", e: "Lunch", v: data.lunchCount },
                { l: "所定労働", e: "Total Hrs", v: data.scheduledHours },
                { l: "有休残日数", e: "Rem. Leave", v: data.remainingPaidLeave },
              ].map((item, idx) => (
                <div key={idx} className="flex justify-between border-b border-gray-100 pb-0.5">
                  <span className="leading-relaxed">{t(item.e)}</span>
                  <span className="font-mono self-center">{(item.v || 0).toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Earnings Column */}
          <div className="border-r border-b border-black flex flex-col">
            <div className="bg-gray-100 p-1 font-bold text-center border-b border-black">{t("Earnings")}</div>
            <div className="flex-1 p-1 space-y-0.5">
              <div className="flex justify-between border-b border-gray-100">
                <span>{t("Basic Salary")}</span>
                <span className="font-mono self-center">{(payTimeSalary).toLocaleString()}</span>
              </div>
              {[
                { l: "普通残業手当", e: "Reg OT (1.25)", v: data.otAllowance },
                { l: "深夜残業手当", e: "Late Night (1.50)", v: data.lateNightOTAllowance },
                { l: "~22", e: "Night Alw 1 (0.25)", v: data.nightShiftAllowance },
                { l: "22~", e: "Night Alw 2 (0.30)", v: data.nightShiftAllowanceExtra },
                { l: "休日勤務手当", e: data.workPolicy ? "Holiday (selected rates)" : "Holiday (1.35)", v: data.holidayWorkAllowance },
                { l: "休日深夜手当", e: t("Holiday night premium ({rate})", { rate: data.workPolicy?.nightPremium ?? 0.25 }), v: data.holidayNightAllowance },
                { l: "家族手当", e: "Family Alw", v: data.familyAllowance },
                { l: "住宅手当", e: "Housing Alw", v: data.housingAllowance },
                { l: "非課税通勤費", e: "Non-tax Comm.", v: data.nonTaxableCommuting },
                { l: "課税通勤費", e: "Taxable Comm.", v: data.taxableCommuting },
                { l: "欠勤時間控除", e: "Absence Ded", v: data.absenceDeduction, c: "text-red-500" },
                { l: "遅刻早退控除", e: "Late/Early Ded", v: data.lateEarlyDeduction, c: "text-red-500" },
              ].map((item, idx) => (
                <div key={idx} className={`flex justify-between border-b border-gray-100 pb-0.5 ${item.c || ""}`}>
                  <span className="leading-relaxed">{t(item.e)}</span>
                  <span className="font-mono self-center">{(item.v || 0).toLocaleString()}</span>
                </div>
              ))}
              <div className="mt-auto bg-gray-50 p-1 flex justify-between font-bold border-t border-black">
                <span>{t("Total")}</span>
                <span className="font-mono">{Math.round(totalEarnings).toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Deductions Column */}
          <div className="border-r border-b border-black flex flex-col">
            <div className="bg-gray-100 p-1 font-bold text-center border-b border-black">{t("Deductions")}</div>
            <div className="flex-1 p-1 space-y-0.5">
              {[
                { l: "健康保険料", e: "Health Ins", v: data.healthInsurance },
                { l: "介護保険料", e: "Nursing Care", v: data.nursingCareInsurance },
                { l: "厚生年金保険", e: "Welfare Pension", v: data.pension },
                { l: "雇用保険料", e: "Employment Ins", v: data.employmentInsurance },
                { l: "所得税", e: "Income Tax", v: data.incomeTax },
                { l: "住民税", e: "Resident Tax", v: data.residentTax },
                { l: "昼食代", e: "Lunch Fee", v: data.lunchFee },
                { l: "寮費", e: "Hostel Fee", v: data.hostelFee },
                { l: "布団代", e: "Bedding Fee", v: data.beddingFee },
              ].map((item, idx) => (
                <div key={idx} className="flex justify-between border-b border-gray-100 pb-0.5">
                  <span className="leading-relaxed">{t(item.e)}</span>
                  <span className="font-mono self-center">{(item.v || 0).toLocaleString()}</span>
                </div>
              ))}
              <div className="mt-auto bg-gray-50 p-1 flex justify-between font-bold border-t border-black">
                <span>{t("Total")}</span>
                <span className="font-mono">{Math.round(totalDeductions).toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Summary Column */}
          <div className="border-r border-b border-black flex flex-col">
            <div className="bg-gray-100 p-1 font-bold text-center border-b border-black">{t("Net Pay")}</div>
            <div className="flex-1 p-1 space-y-4">
              <div className="bg-gray-50 p-2 border border-black rounded shadow-inner">
                <p className="text-[8px] text-gray-500 font-bold uppercase">{t("Net Pay")}</p>
                <p className="text-xl font-black text-right">{Math.round(netPay).toLocaleString()} <span className="text-[10px]">JPY</span></p>
              </div>
              
              <div className="space-y-1">
                <div className="flex justify-between text-[8px] border-b pb-0.5">
                  <span>{t("Bank Payment")}</span>
                  <span className="font-bold">{Math.round(netPay - (data.cashPayment || 0)).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-[8px]">
                  <span>{t("Cash Payment")}</span>
                  <span className="font-bold">{(data.cashPayment || 0).toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        {data.holidayEntries?.length > 0 && <div className="mt-4 text-[9px] break-inside-avoid">
          <h3 className="font-bold mb-1">{t("Holiday work details")}</h3>
          <table className="w-full border-collapse"><thead><tr>{["Work date", "Shift", "Day hours", "Night hours", "Total hours (day + night)", "Rate"].map(label => <th key={label} className="border border-gray-400 p-1 text-left">{t(label)}</th>)}</tr></thead>
            <tbody>{data.holidayEntries.map((entry: { id: string; date: string; shiftName: string; hours: number; nightHours: number; rateId: string }) => {
              const rate = data.workPolicy?.holidayRates?.find((r: { id: string }) => r.id === entry.rateId);
              const hours = splitHolidayHours(entry.hours, entry.nightHours);
              return <tr key={entry.id}><td className="border border-gray-400 p-1">{entry.date}</td><td className="border border-gray-400 p-1">{localizeShiftLabel(entry.shiftName, language)}</td><td className="border border-gray-400 p-1">{hours.day}</td><td className="border border-gray-400 p-1">{hours.night}</td><td className="border border-gray-400 p-1">{hours.total}</td><td className="border border-gray-400 p-1">{t(rate?.name || "")} ×{rate?.multiplier}</td></tr>;
            })}</tbody></table>
          <p className="mt-1">{t("Hourly divisor:")} {data.workPolicy?.hourlyDivisor} · {t("Night premium: +{rate}", { rate: data.workPolicy?.nightPremium ?? .25 })}. {t("Policy snapshot at payroll creation.")}</p>
        </div>}
      </div>
    );
  } else {
    // Myanmar Payslip logic
    const isUsd = employee.salaryCurrency === "USD" || (payTimeSalary > 0 && payTimeSalary < 10000);
    const rate = data.exchangeRate || 1;
    const baseSalaryMMK = isUsd ? (payTimeSalary * rate) : (payTimeSalary);
    
    const hourlyRate = (baseSalaryMMK / 30 / 8);
    const otPay = (data.otHours || 0) * hourlyRate * 2;
    const allowances = (data.attendanceBonus || 0) + (data.mealAllowance || 0);
    const grossPay = baseSalaryMMK + otPay + allowances;
    const totalDeductions = (data.ssbAmount || 0) + (data.incomeTax || 0);
    const netPay = grossPay - totalDeductions;

    return (
      <div ref={ref} className="p-12 max-w-[800px] mx-auto bg-white text-black font-sans border border-gray-300 shadow-lg">
        <div className="text-center border-b-2 border-black pb-4 mb-8">
          <h1 className="text-3xl font-bold tracking-tighter uppercase">{t("Payslip")}</h1>
          <p className="text-gray-600 font-medium">{t("Month:")} {month}</p>
        </div>

        <div className="grid grid-cols-2 gap-8 mb-8">
          <div className="space-y-1">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">{t("Employee Information")}</p>
            <p className="font-bold">{t("ID:")} {employee.employeeNumber}</p>
            <p className="font-bold">{t("Name:")} {employee.fullName}</p>
          </div>
          <div className="text-right space-y-1">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">{t("Payment Details")}</p>
            <p className="font-bold">{t("Currency: MMK")}</p>
          </div>
        </div>

        <table className="w-full border-collapse border border-black mb-8 text-sm">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-black p-3 text-left">{t("Earnings")}</th>
              <th className="border border-black p-3 text-right">{t("Amount (MMK)")}</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border border-black p-3">{t("Basic Salary")}</td>
              <td className="border border-black p-3 text-right">{Math.round(baseSalaryMMK).toLocaleString()}</td>
            </tr>
            <tr>
              <td className="border border-black p-3">{t("OT & Allowances")}</td>
              <td className="border border-black p-3 text-right">{Math.round(otPay + allowances).toLocaleString()}</td>
            </tr>
            <tr className="font-bold bg-gray-50">
              <td className="border border-black p-3">{t("Gross Total")}</td>
              <td className="border border-black p-3 text-right">{Math.round(grossPay).toLocaleString()}</td>
            </tr>
            <tr className="text-red-600">
              <td className="border border-black p-3">{t("Total Deductions (Tax & SSB)")}</td>
              <td className="border border-black p-3 text-right">-{Math.round(totalDeductions).toLocaleString()}</td>
            </tr>
          </tbody>
        </table>

        <div className="bg-slate-900 text-white p-8 flex justify-between items-center rounded-xl shadow-inner">
          <span className="text-xl font-bold uppercase tracking-tight">{t("Net Pay")}</span>
          <div className="text-right">
            <span className="text-4xl font-black">{Math.round(netPay).toLocaleString()}</span>
            <span className="text-sm font-bold ml-2">MMK</span>
          </div>
        </div>
      </div>
    );
  }
});
PayslipDocument.displayName = "PayslipDocument";
