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
    const hourlyRate = (employee.baseSalary || 200000) / 160;
    const otPay125 = data.ot125Hours * hourlyRate * 1.25;
    const nightShiftDiff = data.nightShiftHours * hourlyRate * 0.25;
    const lateNightOTPay = data.lateNightOTHours * hourlyRate * 1.5;
    
    const grossTotal = (employee.baseSalary || 200000) + 
                       otPay125 + 
                       nightShiftDiff + 
                       lateNightOTPay + 
                       (data.nightShiftAllowance || 0) + 
                       (data.housingAllowance || 0) + 
                       (data.familyAllowance || 0) + 
                       (data.commutingAllowance || 0);

    const deductionTotal = (data.healthInsurance || 0) + 
                          (data.nursingCareInsurance || 0) +
                          (data.pension || 0) + 
                          (data.incomeTax || 0) + 
                          (data.employmentInsurance || 0) + 
                          (data.residentTax || 0) +
                          (data.hostelFee || 0) +
                          (data.beddingFee || 0);

    const adjustmentDed = (data.absenceDeduction || 0) + (data.lateEarlyDeduction || 0);
    const finalGross = grossTotal - adjustmentDed;

    return (
      <div ref={ref} className="p-8 md:p-12 max-w-[850px] mx-auto bg-white text-black font-sans border border-gray-300 shadow-sm">
        <div className="border-b-2 border-black pb-4 mb-6 flex justify-between items-end">
          <div className="space-y-1">
            <h1 className="text-3xl font-black tracking-tighter">給与明細書</h1>
            <p className="text-[10px] text-gray-500">PAYROLL STATEMENT</p>
          </div>
          <div className="text-right">
            <p className="font-bold text-lg">{month} 分</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="border border-black p-4 bg-gray-50/50">
            <p className="text-[9px] uppercase text-gray-500 mb-1">社員番号 / 氏名 (Emp ID / Name)</p>
            <p className="font-bold text-lg">{employee.employeeNumber} - {employee.fullName} 様</p>
          </div>
          <div className="border border-black p-4 text-right bg-gray-50/50">
            <p className="text-[9px] uppercase text-gray-500 mb-1">所属 (Department)</p>
            <p className="font-bold">{employee.department || '-'}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Earnings Column */}
          <div className="border border-black flex flex-col">
            <div className="bg-gray-800 text-white p-1 border-b border-black font-bold text-center text-xs">支給 (Earnings)</div>
            <div className="p-3 space-y-2 text-xs flex-1">
              <div className="flex justify-between"><span>基本給 (Basic Salary)</span> <span className="font-mono">{(employee.baseSalary || 200000).toLocaleString()}</span></div>
              <div className="flex justify-between"><span>普通残業 (Standard OT)</span> <span className="font-mono">{Math.round(otPay125).toLocaleString()}</span></div>
              <div className="flex justify-between"><span>深夜残業 (Late Night OT)</span> <span className="font-mono">{Math.round(lateNightOTPay).toLocaleString()}</span></div>
              <div className="flex justify-between"><span>深夜手当 (Night Shift Alw)</span> <span className="font-mono">{(data.nightShiftAllowance || 0).toLocaleString()}</span></div>
              <div className="flex justify-between"><span>住宅手当 (Housing Alw)</span> <span className="font-mono">{(data.housingAllowance || 0).toLocaleString()}</span></div>
              <div className="flex justify-between"><span>家族手当 (Family Alw)</span> <span className="font-mono">{(data.familyAllowance || 0).toLocaleString()}</span></div>
              <div className="flex justify-between"><span>通勤費 (Commuting Alw)</span> <span className="font-mono">{(data.commutingAllowance || 0).toLocaleString()}</span></div>
              {adjustmentDed > 0 && (
                <>
                  <div className="border-t pt-1 my-1"></div>
                  <div className="flex justify-between text-destructive"><span>欠勤控除 (Absence Ded)</span> <span className="font-mono">-{(data.absenceDeduction || 0).toLocaleString()}</span></div>
                  <div className="flex justify-between text-destructive"><span>遅刻早退 (Late/Early Ded)</span> <span className="font-mono">-{(data.lateEarlyDeduction || 0).toLocaleString()}</span></div>
                </>
              )}
            </div>
            <div className="bg-gray-100 p-2 border-t border-black flex justify-between font-bold text-sm">
              <span>総支給額 (Gross Total)</span> <span>{Math.round(finalGross).toLocaleString()}</span>
            </div>
          </div>

          {/* Deductions Column */}
          <div className="border border-black flex flex-col">
            <div className="bg-gray-800 text-white p-1 border-b border-black font-bold text-center text-xs">控除 (Deductions)</div>
            <div className="p-3 space-y-2 text-xs flex-1">
              <div className="flex justify-between"><span>健康保険 (Health Ins)</span> <span className="font-mono">{(data.healthInsurance || 0).toLocaleString()}</span></div>
              <div className="flex justify-between"><span>介護保険 (Nursing Care)</span> <span className="font-mono">{(data.nursingCareInsurance || 0).toLocaleString()}</span></div>
              <div className="flex justify-between"><span>厚生年金 (Pension)</span> <span className="font-mono">{(data.pension || 0).toLocaleString()}</span></div>
              <div className="flex justify-between"><span>雇用保険 (Employment Ins)</span> <span className="font-mono">{(data.employmentInsurance || 0).toLocaleString()}</span></div>
              <div className="flex justify-between"><span>所得税 (Income Tax)</span> <span className="font-mono">{(data.incomeTax || 0).toLocaleString()}</span></div>
              <div className="flex justify-between"><span>住民税 (Resident Tax)</span> <span className="font-mono">{(data.residentTax || 0).toLocaleString()}</span></div>
              <div className="flex justify-between"><span>寮費 (Hostel/Dorm Fee)</span> <span className="font-mono">{(data.hostelFee || 0).toLocaleString()}</span></div>
              <div className="flex justify-between"><span>布団代 (Bedding Fee)</span> <span className="font-mono">{(data.beddingFee || 0).toLocaleString()}</span></div>
            </div>
            <div className="bg-gray-100 p-2 border-t border-black flex justify-between font-bold text-sm">
              <span>控除合計 (Total Ded)</span> <span>{Math.round(deductionTotal).toLocaleString()}</span>
            </div>
          </div>
        </div>

        <div className="mt-8 bg-gray-900 text-white p-6 flex justify-between items-center rounded-sm">
          <div className="space-y-1">
            <span className="text-xl font-bold block leading-none">差引支給額</span>
            <span className="text-[9px] uppercase text-gray-400">Net Pay (Take-home)</span>
          </div>
          <div className="text-right">
            <span className="text-4xl font-black">{Math.round(finalGross - deductionTotal).toLocaleString()}</span>
            <span className="ml-2 text-xl font-bold">JPY</span>
          </div>
        </div>

        <div className="mt-12 text-[9px] text-gray-400 border-t pt-4 flex justify-between">
          <p>GlobalPay Enterprise System - Verified Statement</p>
          <p>Generated: {new Date().toLocaleDateString()}</p>
        </div>
      </div>
    );
  } else {
    // Myanmar Payslip Logic
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
