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
    const otPay = data.ot125Hours * hourlyRate * 1.25;
    const nightPay = data.nightShiftHours * hourlyRate * 0.25;
    const lateNightOTPay = data.lateNightOTHours * hourlyRate * 1.5;
    const grossPay = (employee.baseSalary || 200000) + otPay + nightPay + lateNightOTPay;
    const deductions = data.healthInsurance + data.pension + data.incomeTax + data.hostelFee;

    return (
      <div ref={ref} className="p-12 max-w-[800px] mx-auto bg-white text-black font-sans border border-gray-300">
        <div className="border-b-2 border-black pb-4 mb-6 flex justify-between items-end">
          <h1 className="text-3xl font-bold">給与明細書</h1>
          <div className="text-right">
            <p className="font-bold">{month} 分</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-8 mb-8">
          <div className="border border-black p-4">
            <p className="text-xs text-gray-500 mb-1">社員番号 / 氏名</p>
            <p className="font-bold text-lg">{employee.employeeNumber} - {employee.fullName} 様</p>
          </div>
          <div className="border border-black p-4 text-right">
            <p className="text-xs text-gray-500 mb-1">支払日</p>
            <p className="font-bold">2024/XX/XX</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="border border-black">
            <div className="bg-gray-100 p-2 border-b border-black font-bold">勤怠 (Attendance)</div>
            <div className="p-4 space-y-2 text-sm">
              <div className="flex justify-between"><span>普通残業</span> <span>{data.ot125Hours} H</span></div>
              <div className="flex justify-between"><span>深夜手当</span> <span>{data.nightShiftHours} H</span></div>
              <div className="flex justify-between"><span>深夜残業</span> <span>{data.lateNightOTHours} H</span></div>
            </div>
          </div>
          <div className="border border-black">
            <div className="bg-gray-100 p-2 border-b border-black font-bold">支給 (Payments)</div>
            <div className="p-4 space-y-2 text-sm">
              <div className="flex justify-between"><span>基本給</span> <span>{(employee.baseSalary || 200000).toLocaleString()}</span></div>
              <div className="flex justify-between"><span>普通残業手当</span> <span>{Math.round(otPay).toLocaleString()}</span></div>
              <div className="flex justify-between"><span>深夜手当金</span> <span>{Math.round(nightPay).toLocaleString()}</span></div>
              <div className="flex justify-between"><span>深夜残業手当</span> <span>{Math.round(lateNightOTPay).toLocaleString()}</span></div>
              <div className="flex justify-between border-t border-gray-300 pt-2 font-bold">
                <span>総支給額</span> <span>{Math.round(grossPay).toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 border border-black">
          <div className="bg-gray-100 p-2 border-b border-black font-bold">控除 (Deductions)</div>
          <div className="p-4 grid grid-cols-2 gap-x-12 gap-y-2 text-sm">
            <div className="flex justify-between"><span>健康保険</span> <span>{data.healthInsurance.toLocaleString()}</span></div>
            <div className="flex justify-between"><span>厚生年金</span> <span>{data.pension.toLocaleString()}</span></div>
            <div className="flex justify-between"><span>所得税</span> <span>{data.incomeTax.toLocaleString()}</span></div>
            <div className="flex justify-between"><span>寮費</span> <span>{data.hostelFee.toLocaleString()}</span></div>
            <div className="flex justify-between border-t border-black pt-2 font-bold col-span-2">
              <span>控除合計額</span> <span>{deductions.toLocaleString()}</span>
            </div>
          </div>
        </div>

        <div className="mt-8 bg-gray-200 p-6 flex justify-between items-center border border-black">
          <span className="text-xl font-bold">差引支給額 (Net Pay)</span>
          <span className="text-3xl font-black">{Math.round(grossPay - deductions).toLocaleString()} JPY</span>
        </div>
      </div>
    );
  } else {
    // Myanmar Payslip
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
            <p>Date: 2024/XX/XX</p>
            <p>Currency: MMK</p>
          </div>
        </div>

        <table className="w-full border-collapse border border-black mb-8">
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

        <table className="w-full border-collapse border border-black mb-8">
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