
"use client";

import React from "react";
import { Country } from "@/context/CountryContext";

interface Props {
  country: Country;
  employee: any;
  month: string;
  data: any;
}

export const PayslipDocument = React.forwardRef<HTMLDivElement, Props>(({ country, employee, month, data }, ref) => {
  if (country === "Japan") {
    const baseSalary = employee.baseSalary || 200000;
    const totalEarnings = baseSalary + 
                          (data.otAllowance || 0) + 
                          (data.lateNightOTAllowance || 0) + 
                          (data.nightShiftAllowance || 0) + 
                          (data.nightShiftAllowanceExtra || 0) + 
                          (data.holidayWorkAllowance || 0) + 
                          (data.holidayNightAllowance || 0) + 
                          (data.familyAllowance || 0) + 
                          (data.housingAllowance || 0) + 
                          (data.nonTaxableCommuting || 0) + 
                          (data.taxableCommuting || 0) + 
                          (data.prevMonthAdj || 0) + 
                          (data.leaveAllowance || 0) -
                          (data.absenceDeduction || 0) -
                          (data.lateEarlyDeduction || 0);

    const totalDeductions = (data.healthInsurance || 0) + 
                            (data.nursingCareInsurance || 0) +
                            (data.pension || 0) + 
                            (data.socInsAdj || 0) + 
                            (data.employmentInsurance || 0) + 
                            (data.incomeTax || 0) + 
                            (data.residentTax || 0) +
                            (data.lunchFee || 0) +
                            (data.hostelFee || 0) +
                            (data.beddingFee || 0);
    
    const othersSum = (data.yearEndAdj || 0) + (data.otherAdj1 || 0) + (data.otherAdj2 || 0) + (data.paidLeaveBuyback || 0);
    const netPay = totalEarnings - totalDeductions + othersSum;

    return (
      <div ref={ref} className="p-8 md:p-12 max-w-[1000px] mx-auto bg-white text-black font-sans border border-gray-400 shadow-sm print:shadow-none print:border-none print:p-4">
        <div className="mb-6 flex justify-between items-start">
          <div className="space-y-1">
            <h1 className="text-2xl font-black tracking-widest border-b-2 border-black inline-block pb-1">給与明細書</h1>
            <p className="text-[9px] text-gray-500 uppercase">Payroll Statement</p>
            <p className="text-sm mt-4 font-bold">GlobalPay Enterprise System</p>
          </div>
          <div className="text-right space-y-2">
            <p className="text-xl font-bold border-b border-black pb-1">{new Date(month).getFullYear()}年 {new Date(month).getMonth() + 1}月分 給与</p>
            <div className="flex gap-4 text-xs justify-end mt-4">
              <div className="border border-black p-2 w-24 text-center">
                <p className="text-[8px] text-gray-500">支給日 (Pay Date)</p>
                <p className="font-bold">{month}-30</p>
              </div>
              <div className="border border-black p-2 w-24 h-24 text-center">
                <p className="text-[8px] text-gray-500">受領印 (Seal)</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
          <div className="border border-black p-2 flex items-center gap-4">
            <span className="text-[10px] font-bold border-r pr-2 h-full flex items-center">氏名 (Name)</span>
            <span className="font-bold">({employee.employeeNumber}) {employee.fullName} 様</span>
          </div>
          <div className="border border-black p-2 flex items-center gap-4">
            <span className="text-[10px] font-bold border-r pr-2 h-full flex items-center">所属 (Dept)</span>
            <span>{employee.department || '-'}</span>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-0 border-t border-l border-black text-[10px]">
          {/* Attendance Column */}
          <div className="border-r border-b border-black flex flex-col">
            <div className="bg-gray-100 p-1 font-bold text-center border-b border-black">勤怠 (Attendance)</div>
            <div className="flex-1 p-1 space-y-0.5">
              {[
                { l: "所定就労日", e: "Work Days", v: data.scheduledDays },
                { l: "欠勤日時間", e: "Absence", v: data.absenceHours },
                { l: "遅刻早退", e: "Late/Early", v: data.lateEarlyHours },
                { l: "普通残業", e: "Regular OT", v: data.regularOTHours },
                { l: "深夜残業", e: "Late Night OT", v: data.lateNightOTHours },
                { l: "休日勤務", e: "Holiday Work", v: data.holidayWorkHours },
                { l: "休日深夜", e: "Holiday Night", v: data.holidayNightHours },
                { l: "~22", e: "Night 1", v: data.nightShiftHours },
                { l: "22~", e: "Night 2", v: data.nightShiftHoursExtra },
                { l: "有休日数", e: "Paid Leave", v: data.paidLeaveDays },
                { l: "昼食回数", e: "Lunch", v: data.lunchCount },
                { l: "所定労働", e: "Total Hrs", v: data.scheduledHours },
                { l: "有休残日数", e: "Rem. Leave", v: data.remainingPaidLeave },
              ].map((item, idx) => (
                <div key={idx} className="flex justify-between border-b border-gray-100 pb-0.5">
                  <span className="flex flex-col"><span>{item.l}</span><span className="text-[7px] text-gray-400">{item.e}</span></span>
                  <span className="font-mono self-center">{(item.v || 0).toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Earnings Column */}
          <div className="border-r border-b border-black flex flex-col">
            <div className="bg-gray-100 p-1 font-bold text-center border-b border-black">支給 (Earnings)</div>
            <div className="flex-1 p-1 space-y-0.5">
              <div className="flex justify-between border-b border-gray-100">
                <span className="flex flex-col"><span>基本給</span><span className="text-[7px] text-gray-400">Basic Salary</span></span>
                <span className="font-mono self-center">{(employee.baseSalary || 0).toLocaleString()}</span>
              </div>
              {[
                { l: "普通残業手当", e: "Reg OT (1.25)", v: data.otAllowance },
                { l: "深夜残業手当", e: "Late Night (1.50)", v: data.lateNightOTAllowance },
                { l: "~22", e: "Night Alw 1 (0.25)", v: data.nightShiftAllowance },
                { l: "22~", e: "Night Alw 2 (0.25)", v: data.nightShiftAllowanceExtra },
                { l: "休日勤務手当", e: "Holiday (1.35)", v: data.holidayWorkAllowance },
                { l: "休日深夜手당", e: "Hol. Night (0.25)", v: data.holidayNightAllowance },
                { l: "家族手当", e: "Family Alw", v: data.familyAllowance },
                { l: "住宅手当", e: "Housing Alw", v: data.housingAllowance },
                { l: "非課税通勤費", e: "Non-tax Comm.", v: data.nonTaxableCommuting },
                { l: "課税通勤費", e: "Taxable Comm.", v: data.taxableCommuting },
                { l: "欠勤時間控除", e: "Absence Ded", v: data.absenceDeduction, c: "text-red-500" },
                { l: "遅刻早退控除", e: "Late/Early Ded", v: data.lateEarlyDeduction, c: "text-red-500" },
              ].map((item, idx) => (
                <div key={idx} className={`flex justify-between border-b border-gray-100 pb-0.5 ${item.c || ""}`}>
                  <span className="flex flex-col"><span>{item.l}</span><span className="text-[7px] text-gray-400">{item.e}</span></span>
                  <span className="font-mono self-center">{(item.v || 0).toLocaleString()}</span>
                </div>
              ))}
              <div className="mt-auto bg-gray-50 p-1 flex justify-between font-bold border-t border-black">
                <span>合計 (Total)</span>
                <span className="font-mono">{Math.round(totalEarnings).toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Deductions Column */}
          <div className="border-r border-b border-black flex flex-col">
            <div className="bg-gray-100 p-1 font-bold text-center border-b border-black">控除 (Deductions)</div>
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
                  <span className="flex flex-col"><span>{item.l}</span><span className="text-[7px] text-gray-400">{item.e}</span></span>
                  <span className="font-mono self-center">{(item.v || 0).toLocaleString()}</span>
                </div>
              ))}
              <div className="mt-auto bg-gray-50 p-1 flex justify-between font-bold border-t border-black">
                <span>合計 (Total)</span>
                <span className="font-mono">{Math.round(totalDeductions).toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Summary Column */}
          <div className="border-r border-b border-black flex flex-col">
            <div className="bg-gray-100 p-1 font-bold text-center border-b border-black">差引支給額 (Net Pay)</div>
            <div className="flex-1 p-1 space-y-4">
              <div className="bg-gray-50 p-2 border border-black rounded shadow-inner">
                <p className="text-[8px] text-gray-500 font-bold uppercase">Net Payment</p>
                <p className="text-xl font-black text-right">{Math.round(netPay).toLocaleString()} <span className="text-[10px]">JPY</span></p>
              </div>
              
              <div className="space-y-1">
                <div className="flex justify-between text-[8px] border-b pb-0.5">
                  <span>振込支給額 (Bank)</span>
                  <span className="font-bold">{Math.round(netPay - (data.cashPayment || 0)).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-[8px]">
                  <span>現金支給額 (Cash)</span>
                  <span className="font-bold">{(data.cashPayment || 0).toLocaleString()}</span>
                </div>
              </div>

              <div className="mt-auto text-[7px] text-gray-400 leading-tight italic">
                * This document is generated by GlobalPay Enterprise System.
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  } else {
    // Myanmar Payslip remains as is
    const baseSalary = employee.baseSalary || 400000;
    const hourlyRate = (baseSalary / 30 / 8);
    const otPay = data.otHours * hourlyRate * 2;
    const grossPay = baseSalary + otPay + data.attendanceBonus + data.mealAllowance;
    const totalDeductions = data.ssbAmount + data.incomeTax;

    return (
      <div ref={ref} className="p-12 max-w-[800px] mx-auto bg-white text-black font-sans border border-gray-300 shadow-lg">
        <div className="text-center border-b-2 border-black pb-4 mb-8">
          <h1 className="text-3xl font-bold tracking-tighter">PAYSLIP</h1>
          <p className="text-gray-600 font-medium">Month: {month}</p>
        </div>

        <div className="grid grid-cols-2 gap-8 mb-8">
          <div className="space-y-1">
            <p className="text-sm font-bold text-gray-500 uppercase tracking-wider">Employee Information</p>
            <p className="font-bold">ID: {employee.employeeNumber}</p>
            <p className="font-bold">Name: {employee.fullName}</p>
          </div>
          <div className="text-right space-y-1">
            <p className="text-sm font-bold text-gray-500 uppercase tracking-wider">Payment Details</p>
            <p className="font-bold">Currency: MMK</p>
          </div>
        </div>

        <table className="w-full border-collapse border border-black mb-8 text-sm">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-black p-3 text-left">Earnings</th>
              <th className="border border-black p-3 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr><td className="border border-black p-3">Basic Salary</td><td className="border border-black p-3 text-right">{baseSalary.toLocaleString()}</td></tr>
            <tr><td className="border border-black p-3">OT & Allowances</td><td className="border border-black p-3 text-right">{Math.round(otPay + data.attendanceBonus + data.mealAllowance).toLocaleString()}</td></tr>
            <tr className="font-bold bg-gray-50"><td className="border border-black p-3">Gross Total</td><td className="border border-black p-3 text-right">{Math.round(grossPay).toLocaleString()}</td></tr>
          </tbody>
        </table>

        <div className="bg-slate-900 text-white p-6 flex justify-between items-center rounded-lg">
          <span className="text-xl font-bold">Net Salary</span>
          <span className="text-3xl font-black">{Math.round(grossPay - totalDeductions).toLocaleString()} MMK</span>
        </div>
      </div>
    );
  }
});
PayslipDocument.displayName = "PayslipDocument";
