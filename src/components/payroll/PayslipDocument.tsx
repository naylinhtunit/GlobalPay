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
    const totalEarnings = (employee.baseSalary || 200000) + 
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
      <div ref={ref} className="p-8 md:p-12 max-w-[1000px] mx-auto bg-white text-black font-sans border border-gray-400 shadow-sm print:shadow-none print:border-none">
        <div className="mb-6 flex justify-between items-start">
          <div className="space-y-1">
            <h1 className="text-2xl font-black tracking-widest border-b-2 border-black inline-block pb-1">給与明細書</h1>
            <p className="text-[9px] text-gray-500 uppercase">Payroll Statement</p>
            <p className="text-sm mt-4 font-bold">(有) 百舌鳥鉄工所</p>
          </div>
          <div className="text-right space-y-2">
            <p className="text-xl font-bold border-b border-black pb-1">令和 {new Date(month).getFullYear() - 2018}年 {new Date(month).getMonth() + 1}月分 給与</p>
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
            <div className="bg-gray-200 p-1 font-bold text-center border-b border-black">勤怠 (Attendance)</div>
            <div className="flex-1 p-1 space-y-0.5">
              {[
                { l: "所定就労日", e: "Work Days", v: data.scheduledDays },
                { l: "欠勤日時間", e: "Absence", v: data.absenceHours },
                { l: "遅刻早退", e: "Late/Early", v: data.lateEarlyHours },
                { l: "普通残業", e: "Regular OT", v: data.regularOTHours },
                { l: "深夜残業", e: "Late Night OT", v: data.lateNightOTHours },
                { l: "休日勤務", e: "Holiday Work", v: data.holidayWorkHours },
                { l: "休日深夜", e: "Holiday Night", v: data.holidayNightHours },
                { l: "~22 (Night)", e: "Night 1", v: data.nightShiftHours },
                { l: "22~ (Night)", e: "Night 2", v: data.nightShiftHoursExtra },
                { l: "有休日数", e: "Paid Leave", v: data.paidLeaveDays },
                { l: "昼食回数", e: "Lunch", v: data.lunchCount },
                { l: "所定労働", e: "Total Hrs", v: data.scheduledHours },
              ].map((item, idx) => (
                <div key={idx} className="flex justify-between border-b border-gray-100 pb-0.5">
                  <span className="flex flex-col"><span>{item.l}</span><span className="text-[7px] text-gray-400">{item.e}</span></span>
                  <span className="font-mono self-center">{(item.v || 0).toLocaleString()}</span>
                </div>
              ))}
              <div className="flex justify-between font-bold pt-1">
                <span>有休残 (Rem. Leave)</span>
                <span className="font-mono">{(data.remainingPaidLeave || 0).toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Earnings Column */}
          <div className="border-r border-b border-black flex flex-col">
            <div className="bg-gray-200 p-1 font-bold text-center border-b border-black">支給 (Earnings)</div>
            <div className="flex-1 p-1 space-y-0.5">
              <div className="flex justify-between border-b border-gray-100">
                <span className="flex flex-col"><span>基本給</span><span className="text-[7px] text-gray-400">Basic Salary</span></span>
                <span className="font-mono self-center">{(employee.baseSalary || 0).toLocaleString()}</span>
              </div>
              {[
                { l: "普通残業手当", e: "Reg OT Alw", v: data.otAllowance },
                { l: "深夜残業手当", e: "Late Night OT", v: data.lateNightOTAllowance },
                { l: "~22 深夜手当", e: "Night Alw 1", v: data.nightShiftAllowance },
                { l: "22~ 深夜手当", e: "Night Alw 2", v: data.nightShiftAllowanceExtra },
                { l: "休日勤務手当", e: "Holiday Alw", v: data.holidayWorkAllowance },
                { l: "休日深夜手当", e: "Hol. Night Alw", v: data.holidayNightAllowance },
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
            <div className="bg-gray-200 p-1 font-bold text-center border-b border-black">控除 (Deductions)</div>
            <div className="flex-1 p-1 space-y-0.5">
              {[
                { l: "健康保険料", e: "Health Ins", v: data.healthInsurance },
                { l: "介護保険料", e: "Nursing Care", v: data.nursingCareInsurance },
                { l: "厚生年金保険", e: "Welfare Pension", v: data.pension },
                { l: "社保料調整", e: "Soc Ins Adj", v: data.socInsAdj },
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

          {/* Others Column */}
          <div className="border-r border-b border-black flex flex-col">
            <div className="bg-gray-200 p-1 font-bold text-center border-b border-black">その他 (Others)</div>
            <div className="flex-1 p-1 space-y-1">
              {[
                { l: "年末調整徴収", e: "Year-end Adj", v: data.yearEndAdj },
                { l: "その他調整", e: "Adjustment 1", v: data.otherAdj1 },
                { l: "その他調整2", e: "Adjustment 2", v: data.otherAdj2 },
                { l: "有給買取", e: "Leave Buyback", v: data.paidLeaveBuyback },
              ].map((item, idx) => (
                <div key={idx} className="flex justify-between border-b border-gray-100 pb-1">
                  <span className="flex flex-col"><span>{item.l}</span><span className="text-[7px] text-gray-400">{item.e}</span></span>
                  <span className="font-mono self-center">{(item.v || 0).toLocaleString()}</span>
                </div>
              ))}
              
              <div className="mt-4 space-y-2 border-t border-black pt-2">
                <div className="flex justify-between font-bold bg-gray-100 p-1">
                  <span className="flex flex-col"><span>差引支給額</span><span className="text-[7px]">Net Pay</span></span>
                  <span className="text-sm self-center">{Math.round(netPay).toLocaleString()}</span>
                </div>
                <div className="flex justify-between font-bold border-b border-black pb-1">
                  <span className="flex flex-col"><span>振込支給額</span><span className="text-[7px]">Bank Transfer</span></span>
                  <span className="self-center">{Math.round(netPay - (data.cashPayment || 0)).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="flex flex-col"><span>現金支給額</span><span className="text-[7px]">Cash Payment</span></span>
                  <span className="self-center font-mono">{(data.cashPayment || 0).toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-2 gap-8 text-xs">
          <div className="space-y-1 border-l-4 border-black pl-2">
            <p className="font-bold">GlobalPay Enterprise Verified Statement</p>
            <p className="text-gray-500">本明細書の内容に疑義がある場合は、速やかに管理部へお申し出ください。</p>
          </div>
          <div className="text-right flex flex-col justify-end">
            <p className="font-mono text-[8px] text-gray-400">System ID: {employee.id.substring(0,8)} | Generated: {new Date().toLocaleDateString()}</p>
          </div>
        </div>
      </div>
    );
  } else {
    // Myanmar Payslip (Keep original as user requested Japan only changes)
    const hourlyRate = ((employee.baseSalary || 400000) / 30 / 8);
    const otPay = data.otHours * hourlyRate * 2;
    const grossPay = (employee.baseSalary || 400000) + otPay + data.attendanceBonus + data.mealAllowance;
    const totalDeductions = data.ssbAmount + data.incomeTax;

    return (
      <div ref={ref} className="p-12 max-w-[800px] mx-auto bg-white text-black font-sans border border-gray-300">
        <div className="text-center border-b-2 border-black pb-4 mb-8">
          <h1 className="text-3xl font-bold">PAYSLIP</h1>
          <p className="text-gray-600">Month: {month}</p>
        </div>

        <div className="grid grid-cols-2 gap-8 mb-8">
          <div className="space-y-1">
            <p className="text-sm font-bold">Employee Information</p>
            <p>ID: {employee.employeeNumber}</p>
            <p>Name: {employee.fullName}</p>
            <p>Department: {employee.department}</p>
          </div>
          <div className="text-right space-y-1">
            <p className="text-sm font-bold">Payment Details</p>
            <p>Date: {new Date().toLocaleDateString()}</p>
            <p>Currency: MMK</p>
          </div>
        </div>

        <table className="w-full border-collapse border border-black mb-8 text-sm">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-black p-2 text-left">Earnings</th>
              <th className="border border-black p-2 text-right">Amount (MMK)</th>
            </tr>
          </thead>
          <tbody>
            <tr><td className="border border-black p-2">Basic Salary</td><td className="border border-black p-2 text-right">{(employee.baseSalary || 400000).toLocaleString()}</td></tr>
            <tr><td className="border border-black p-2">OT Hours ({data.otHours} hrs)</td><td className="border border-black p-2 text-right">{Math.round(otPay).toLocaleString()}</td></tr>
            <tr><td className="border border-black p-2">Attendance Bonus</td><td className="border border-black p-2 text-right">{data.attendanceBonus.toLocaleString()}</td></tr>
            <tr><td className="border border-black p-2">Meal Allowance</td><td className="border border-black p-2 text-right">{data.mealAllowance.toLocaleString()}</td></tr>
            <tr className="font-bold"><td className="border border-black p-2">Gross Total</td><td className="border border-black p-2 text-right">{Math.round(grossPay).toLocaleString()}</td></tr>
          </tbody>
        </table>

        <table className="w-full border-collapse border border-black mb-8 text-sm">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-black p-2 text-left">Deductions</th>
              <th className="border border-black p-2 text-right">Amount (MMK)</th>
            </tr>
          </thead>
          <tbody>
            <tr><td className="border border-black p-2">Social Security (SSB)</td><td className="border border-black p-2 text-right">{data.ssbAmount.toLocaleString()}</td></tr>
            <tr><td className="border border-black p-2">Income Tax</td><td className="border border-black p-2 text-right">{data.incomeTax.toLocaleString()}</td></tr>
            <tr className="font-bold"><td className="border border-black p-2">Total Deduction</td><td className="border border-black p-2 text-right">{totalDeductions.toLocaleString()}</td></tr>
          </tbody>
        </table>

        <div className="bg-gray-800 text-white p-6 flex justify-between items-center rounded-sm">
          <span className="text-xl font-bold">Net Salary</span>
          <span className="text-3xl font-black">{Math.round(grossPay - totalDeductions).toLocaleString()} MMK</span>
        </div>
      </div>
    );
  }
});
PayslipDocument.displayName = "PayslipDocument";
