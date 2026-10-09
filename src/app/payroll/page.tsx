
"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { 
  useFirestore, 
  useCollection, 
  useMemoFirebase,
  useUser,
} from "@/firebase";
import { 
  collection, 
  query, 
  where, 
  doc,
  serverTimestamp,
  writeBatch,
} from "firebase/firestore";
import { useCountry } from "@/context/CountryContext";
import { Button } from "@/components/ui/button";
import { Eye, Calculator, Pencil, Trash2, Filter, Calendar, FileSpreadsheet, Loader2, History, FileDown } from "lucide-react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger, 
  DialogFooter 
} from "@/components/ui/dialog";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { JapanPayrollForm, type JapanData } from "@/components/payroll/JapanPayrollForm";
import { MyanmarPayrollForm, type MyanmarData } from "@/components/payroll/MyanmarPayrollForm";
import { PayslipDocument } from "@/components/payroll/PayslipDocument";
import { DEFAULT_PAYROLL_POLICY, validateHolidayEntries, validatePolicy } from "@/lib/japan-payroll";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { FirestorePermissionError } from "@/firebase/errors";
import { errorEmitter } from "@/firebase/error-emitter";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export default function PayrollPage() {
  const { country, currency } = useCountry();
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const [monthOptions, setMonthOptions] = useState<{value: string, label: string}[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);
  const [selectedEmpId, setSelectedEmpId] = useState("");
  const [selectedMonth, setSelectedMonth] = useState("");
  const [filterMonth, setFilterMonth] = useState<string>("all");
  
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewData, setPreviewData] = useState<any>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isPdfDownloading, setIsPdfDownloading] = useState(false);

  useEffect(() => {
    const options = [];
    const now = new Date();
    for (let i = -1; i < 24; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const value = `${year}-${month}`;
      const label = d.toLocaleString('default', { month: 'long', year: 'numeric' });
      options.push({ value, label });
    }
    setMonthOptions(options);
    if (!selectedMonth && options.length > 0) {
      setSelectedMonth(options[0].value);
    }
  }, []);

  const [japanData, setJapanData] = useState<JapanData>({
    scheduledDays: 0,
    absenceHours: 0,
    lateEarlyHours: 0,
    regularOTHours: 0,
    lateNightOTHours: 0,
    saturdayHolidayHours: 0,
    sundayHolidayHours: 0,
    saturdayHolidayMorningHours: 0,
    saturdayHolidayAfternoonHours: 0,
    sundayHolidayMorningHours: 0,
    sundayHolidayAfternoonHours: 0,
    holidayShiftType: "morning",
    nightShiftHours: 0,
    nightShiftHoursExtra: 0,
    paidLeaveDays: 0,
    lunchCount: 0,
    scheduledHours: 0,
    remainingPaidLeave: 0,
    otAllowance: 0,
    lateNightOTAllowance: 0,
    nightShiftAllowance: 0,
    nightShiftAllowanceExtra: 0,
    holidayWorkAllowance: 0,
    holidayNightAllowance: 0,
    familyAllowance: 0,
    housingAllowance: 0,
    nonTaxableCommuting: 0,
    taxableCommuting: 0,
    absenceDeduction: 0,
    lateEarlyDeduction: 0,
    prevMonthAdj: 0,
    leaveAllowance: 0,
    healthInsurance: 0,
    nursingCareInsurance: 0,
    pension: 0,
    socInsAdj: 0,
    employmentInsurance: 0,
    incomeTax: 0,
    residentTax: 0,
    lunchFee: 0,
    hostelFee: 0,
    beddingFee: 0,
    yearEndAdj: 0,
    otherAdj1: 0,
    otherAdj2: 0,
    paidLeaveBuyback: 0,
    cashPayment: 0,
    kindPayment: 0,
  });

  const [myanmarData, setMyanmarData] = useState<MyanmarData>({
    otHours: 0,
    attendanceBonus: 0,
    mealAllowance: 0,
    ssbAmount: 0,
    incomeTax: 0,
    exchangeRate: 0
  });

  const printRef = useRef<HTMLDivElement>(null);

  const payrollQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(
      collection(firestore, "payrollRecords"), 
      where("country", "==", country),
      where("companyId", "==", user.uid)
    );
  }, [firestore, country, user]);

  const employeesQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(
      collection(firestore, "employees"), 
      where("country", "==", country),
      where("companyId", "==", user.uid)
    );
  }, [firestore, country, user]);

  const { data: payrollRecords, isLoading: payrollLoading } = useCollection(payrollQuery);
  const { data: employees } = useCollection(employeesQuery);

  const selectedEmployee = useMemo(() => {
    return (employees || []).find((e: any) => e.id === selectedEmpId);
  }, [employees, selectedEmpId]);

  const historicalSalary = useMemo(() => {
    if (!selectedEmployee || !selectedMonth) return 0;
    if (!selectedEmployee.salaryHistory || selectedEmployee.salaryHistory.length === 0) {
      return selectedEmployee.baseSalary || 0;
    }
    const history = [...selectedEmployee.salaryHistory].sort((a: any, b: any) => b.effectiveMonth.localeCompare(a.effectiveMonth));
    const effectiveRecord = history.find(h => h.effectiveMonth <= selectedMonth);
    return effectiveRecord ? effectiveRecord.amount : (history[history.length - 1]?.amount || 0);
  }, [selectedEmployee, selectedMonth]);

  const currentYearLeaveUsed = useMemo(() => {
    if (!selectedEmpId || !payrollRecords || !selectedMonth) return 0;
    const year = selectedMonth.substring(0, 4);
    return (payrollRecords || [])
      .filter(p => p.employeeId === selectedEmpId && p.id !== editingRecordId && p.payPeriodStartDate?.startsWith(year))
      .reduce((acc, curr) => acc + (curr.paidLeaveDays || 0), 0);
  }, [selectedEmpId, payrollRecords, selectedMonth, editingRecordId]);

  const sortedRecords = useMemo(() => {
    if (!payrollRecords) return [];
    let filtered = [...payrollRecords];
    if (filterMonth !== "all") {
      filtered = filtered.filter(rec => {
        const recMonth = rec.payPeriodStartDate?.substring(0, 7) || rec.month;
        return recMonth === filterMonth;
      });
    }
    return filtered.sort((a: any, b: any) => 
      (b.payPeriodStartDate || b.month || "").localeCompare(a.payPeriodStartDate || a.month || "")
    );
  }, [payrollRecords, filterMonth]);

  const resetForm = () => {
    setEditingRecordId(null);
    setSelectedEmpId("");
    if (monthOptions.length > 0) setSelectedMonth(monthOptions[0].value);
    setJapanData({
      scheduledDays: 0,
      absenceHours: 0,
      lateEarlyHours: 0,
      regularOTHours: 0,
      lateNightOTHours: 0,
      saturdayHolidayHours: 0,
      sundayHolidayHours: 0,
      saturdayHolidayMorningHours: 0,
      saturdayHolidayAfternoonHours: 0,
      sundayHolidayMorningHours: 0,
      sundayHolidayAfternoonHours: 0,
      holidayShiftType: "morning",
      nightShiftHours: 0,
      nightShiftHoursExtra: 0,
      paidLeaveDays: 0,
      lunchCount: 0,
      scheduledHours: 0,
      remainingPaidLeave: 0,
      otAllowance: 0,
      lateNightOTAllowance: 0,
      nightShiftAllowance: 0,
      nightShiftAllowanceExtra: 0,
      holidayWorkAllowance: 0,
      holidayNightAllowance: 0,
      familyAllowance: 0,
      housingAllowance: 0,
      nonTaxableCommuting: 0,
      taxableCommuting: 0,
      absenceDeduction: 0,
      lateEarlyDeduction: 0,
      prevMonthAdj: 0,
      leaveAllowance: 0,
      healthInsurance: 0,
      nursingCareInsurance: 0,
      pension: 0,
      socInsAdj: 0,
      employmentInsurance: 0,
      incomeTax: 0,
      residentTax: 0,
      lunchFee: 0,
      hostelFee: 0,
      beddingFee: 0,
      yearEndAdj: 0,
      otherAdj1: 0,
      otherAdj2: 0,
      paidLeaveBuyback: 0,
      cashPayment: 0,
      kindPayment: 0,
    });
    setMyanmarData({
      otHours: 0,
      attendanceBonus: 0,
      mealAllowance: 0,
      ssbAmount: 0,
      incomeTax: 0,
      exchangeRate: 0
    });
  };

  const handleGenerate = async () => {
    if (!selectedEmployee || !firestore || !user) return;
    if (country === "Japan") {
      const policy = japanData.workPolicy;
      const error = !policy ? "Company payroll settings are still loading. Please wait or check your connection." :
        validatePolicy(policy) || validateHolidayEntries(japanData.holidayEntries || [], policy, selectedMonth) ||
        (japanData.shifts?.some(s => !Number.isInteger(s.days) || s.days < 0 || s.days > 31) ? "Regular shift days must be whole numbers between 0 and 31." : null) ||
        ((japanData.shifts || []).reduce((sum, s) => sum + s.days, 0) > new Date(Number(selectedMonth.slice(0, 4)), Number(selectedMonth.slice(5)), 0).getDate() ? "Regular shift days exceed the days in the payroll month." : null) ||
        ([japanData.absenceHours, japanData.lateEarlyHours, japanData.regularOTHours, japanData.lateNightOTHours, japanData.paidLeaveDays, japanData.saturdayHolidayMorningHours || 0, japanData.saturdayHolidayAfternoonHours || 0, japanData.sundayHolidayMorningHours || 0, japanData.sundayHolidayAfternoonHours || 0].some(n => !Number.isFinite(n) || n < 0) ? "Attendance and overtime hours cannot be negative or invalid." : null);
      if (error) {
        toast({ variant: "destructive", title: "Check payroll details", description: error });
        return;
      }
    }
    
    let grossPay = 0;
    let deductions = 0;
    let netPay = 0;
    const baseSalary = historicalSalary; 

    if (country === "Japan") {
      grossPay = baseSalary + 
                (japanData.otAllowance || 0) + 
                (japanData.lateNightOTAllowance || 0) + 
                (japanData.nightShiftAllowance || 0) + 
                (japanData.nightShiftAllowanceExtra || 0) + 
                (japanData.holidayWorkAllowance || 0) + 
                (japanData.holidayNightAllowance || 0) + 
                (japanData.familyAllowance || 0) + 
                (japanData.housingAllowance || 0) + 
                (japanData.nonTaxableCommuting || 0) + 
                (japanData.taxableCommuting || 0) + 
                (japanData.prevMonthAdj || 0) + 
                (japanData.leaveAllowance || 0) -
                (japanData.absenceDeduction || 0) -
                (japanData.lateEarlyDeduction || 0);

      deductions = (japanData.healthInsurance || 0) + 
                   (japanData.nursingCareInsurance || 0) +
                   (japanData.pension || 0) + 
                   (japanData.socInsAdj || 0) + 
                   (japanData.employmentInsurance || 0) + 
                   (japanData.incomeTax || 0) + 
                   (japanData.residentTax || 0) +
                   (japanData.lunchFee || 0) +
                   (japanData.hostelFee || 0) +
                   (japanData.beddingFee || 0);
      
      const others = (japanData.yearEndAdj || 0) + (japanData.otherAdj1 || 0) + (japanData.otherAdj2 || 0) + (japanData.paidLeaveBuyback || 0);
      netPay = grossPay - deductions + others;
    } else {
      const isUsd = selectedEmployee.salaryCurrency === "USD" || (baseSalary > 0 && baseSalary < 10000);
      const rate = myanmarData.exchangeRate || 1;
      const effectiveBaseMMK = isUsd ? baseSalary * rate : baseSalary;
      const hourlyRate = (effectiveBaseMMK / 30 / 8);
      grossPay = effectiveBaseMMK + (myanmarData.otHours * hourlyRate * 2) + (myanmarData.attendanceBonus || 0) + (myanmarData.mealAllowance || 0);
      deductions = (myanmarData.ssbAmount || 0) + (myanmarData.incomeTax || 0);
      netPay = grossPay - deductions;
    }

    const payload = {
      amount: Math.round(netPay),
      month: selectedMonth,
      employeeId: selectedEmpId,
      companyId: user.uid,
      payPeriodStartDate: `${selectedMonth}-01`,
      payPeriodEndDate: `${selectedMonth}-${new Date(Number(selectedMonth.slice(0, 4)), Number(selectedMonth.slice(5)), 0).getDate()}`,
      payoutDate: new Date().toISOString(),
      country,
      basicSalary: baseSalary,
      status: "Calculated",
      totalGrossPay: Math.round(grossPay),
      totalDeductions: Math.round(deductions),
      netPay: Math.round(netPay),
      paidLeaveDays: Number(japanData.paidLeaveDays || 0), 
      japanData: country === "Japan" ? japanData : null,
      myanmarData: country === "Myanmar" ? myanmarData : null,
      updatedAt: serverTimestamp()
    };

    const batch = writeBatch(firestore);
    const payrollRef = editingRecordId 
      ? doc(firestore, "payrollRecords", editingRecordId)
      : doc(collection(firestore, "payrollRecords"));

    if (editingRecordId) {
      batch.update(payrollRef, payload);
    } else {
      batch.set(payrollRef, { ...payload, createdAt: serverTimestamp() });
    }

    batch.commit().then(() => {
      toast({ 
        title: editingRecordId ? "Payroll updated" : "Payroll generated", 
        description: `Successfully processed for ${selectedMonth}` 
      });
      setIsModalOpen(false);
      resetForm();
    }).catch(err => {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: payrollRef.path,
        operation: 'write',
        requestResourceData: payload
      }));
    });
  };

  const handleEdit = (record: any) => {
    setEditingRecordId(record.id);
    setSelectedEmpId(record.employeeId);
    setSelectedMonth(record.payPeriodStartDate?.substring(0, 7) || record.month || "");
    
    if (record.country === "Japan") {
      const jd = { ...record.japanData };
      // Legacy payslips use their original policy, not new company defaults.
      jd.workPolicy = jd.workPolicy || structuredClone(DEFAULT_PAYROLL_POLICY);
      jd.holidayEntries = jd.holidayEntries || [];
      jd.incomeTaxOverride = jd.incomeTaxOverride ?? jd.incomeTax ?? 0;
      // Migrate legacy single Sat field + shiftType to new split fields
      if (jd.saturdayHolidayMorningHours === undefined && jd.saturdayHolidayAfternoonHours === undefined && jd.saturdayHolidayHours) {
        if (jd.holidayShiftType === "afternoon") {
          jd.saturdayHolidayAfternoonHours = jd.saturdayHolidayHours;
          jd.saturdayHolidayMorningHours = 0;
        } else {
          jd.saturdayHolidayMorningHours = jd.saturdayHolidayHours;
          jd.saturdayHolidayAfternoonHours = 0;
        }
      }
      jd.saturdayHolidayMorningHours = jd.saturdayHolidayMorningHours ?? 0;
      jd.saturdayHolidayAfternoonHours = jd.saturdayHolidayAfternoonHours ?? 0;
      jd.sundayHolidayMorningHours = jd.sundayHolidayMorningHours ?? 0;
      jd.sundayHolidayAfternoonHours = jd.sundayHolidayAfternoonHours ?? 0;
      // Migrate legacy Sunday single field
      if (jd.sundayHolidayMorningHours === 0 && jd.sundayHolidayAfternoonHours === 0 && jd.sundayHolidayHours) {
        jd.sundayHolidayMorningHours = jd.sundayHolidayHours;
      }
      jd.sundayHolidayHours = jd.sundayHolidayHours ?? 0;
      jd.holidayShiftType = jd.holidayShiftType ?? "morning";
      setJapanData(jd);
    } else {
      setMyanmarData({
        ...record.myanmarData,
        exchangeRate: record.myanmarData?.exchangeRate || 0
      });
    }
    setIsModalOpen(true);
  };

  const handleDelete = async (record: any) => {
    if (!firestore || !confirm("Are you sure you want to delete this payroll record?")) return;
    
    const batch = writeBatch(firestore);
    const payrollRef = doc(firestore, "payrollRecords", record.id);
    batch.delete(payrollRef);

    batch.commit().then(() => {
      toast({ title: "Payroll deleted", variant: "destructive" });
    }).catch(err => {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: payrollRef.path,
        operation: 'delete'
      }));
    });
  };

  const handlePreview = (record: any) => {
    const emp = (employees || []).find((e: any) => e.id === record.employeeId);
    setPreviewData({ 
      ...record, 
      employee: emp, 
      data: record.japanData || record.myanmarData, 
      month: record.payPeriodStartDate?.substring(0, 7) || record.month || "" 
    });
    setIsPreviewOpen(true);
  };

  const handleDownloadExcel = async () => {
    if (!previewData || isDownloading) return;
    setIsDownloading(true);
    
    try {
      const { utils, writeFile } = await import('xlsx');
      
      const emp = previewData.employee;
      const data = previewData.data;
      const record = previewData;
      
      let exportData: any[] = [
        ["PAYSLIP REPORT", ""],
        ["Employee Name", emp?.fullName || "N/A"],
        ["Employee ID", emp?.employeeNumber || "N/A"],
        ["Period", previewData.month],
        ["Country", previewData.country],
        ["Status", record.status],
        ["", ""],
      ];

      if (previewData.country === "Japan") {
        exportData.push(["ATTENDANCE", "VALUE"]);
        exportData.push(["Work Days", data.scheduledDays]);
        exportData.push(["Absence", data.absenceHours]);
        exportData.push(["Paid Leave", data.paidLeaveDays]);
        exportData.push(["Holiday Work Hours", data.holidayTotalHours || 0]);
        exportData.push(["Holiday Night Hours", data.holidayNightHours || 0]);
        if (data.holidayEntries?.length) {
          exportData.push(["HOLIDAY DATE", "SHIFT", "PAID HOURS", "NIGHT HOURS", "RATE", "MULTIPLIER"]);
          for (const entry of data.holidayEntries) {
            const rate = data.workPolicy?.holidayRates?.find((r: { id: string }) => r.id === entry.rateId);
            exportData.push([entry.date, entry.shiftName, entry.hours, entry.nightHours, rate?.name || "", rate?.multiplier || ""]);
          }
        }
        exportData.push(["", ""]);
        
        exportData.push(["EARNINGS", "AMOUNT (JPY)"]);
        exportData.push(["Basic Salary", record.basicSalary]);
        exportData.push(["Overtime Allowance", data.otAllowance]);
        exportData.push(["Late Night Allowance", data.lateNightOTAllowance]);
        exportData.push(["Company Shift Allowance 1", data.nightShiftAllowance]);
        exportData.push(["Company Shift Allowance 2", data.nightShiftAllowanceExtra]);
        exportData.push(["Holiday Work Allowance", data.holidayWorkAllowance]);
        exportData.push(["Holiday Night Allowance", data.holidayNightAllowance]);
        exportData.push(["Gross Total", record.totalGrossPay]);
        exportData.push(["", ""]);
        
        exportData.push(["DEDUCTIONS", "AMOUNT (JPY)"]);
        exportData.push(["Health Insurance", data.healthInsurance]);
        exportData.push(["Pension", data.pension]);
        exportData.push(["Income Tax", data.incomeTax]);
        exportData.push(["Total Deductions", record.totalDeductions]);
        exportData.push(["", ""]);
        
        exportData.push(["NET PAY", record.netPay]);
      } else {
        exportData.push(["EARNINGS", "AMOUNT (MMK)"]);
        exportData.push(["Basic Salary (MMK)", Math.round(record.totalGrossPay - (data.otHours * (record.basicSalary / 240) * 2) - (data.attendanceBonus || 0) - (data.mealAllowance || 0))]);
        exportData.push(["OT Hours", data.otHours]);
        exportData.push(["Gross Total", record.totalGrossPay]);
        exportData.push(["", ""]);
        
        exportData.push(["DEDUCTIONS", "AMOUNT (MMK)"]);
        exportData.push(["SSB", data.ssbAmount]);
        exportData.push(["Income Tax", data.incomeTax]);
        exportData.push(["Total Deductions", record.totalDeductions]);
        exportData.push(["", ""]);
        
        exportData.push(["NET PAY", record.netPay]);
      }

      const ws = utils.aoa_to_sheet(exportData);
      const wb = utils.book_new();
      utils.book_append_sheet(wb, ws, "Payslip");
      writeFile(wb, `Payslip_${emp?.fullName || 'Employee'}_${previewData.month}.xlsx`);
      
      toast({ title: "Success", description: "Payslip downloaded as Excel file." });
    } catch (error) {
      console.error("Excel Download failed:", error);
      toast({ title: "Error", description: "Failed to download Excel.", variant: "destructive" });
    } finally {
      setIsDownloading(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!printRef.current || isPdfDownloading) return;
    setIsPdfDownloading(true);
    
    try {
      const html2canvas = (await import('html2canvas')).default;
      const { jsPDF } = await import('jspdf');
      
      const element = printRef.current;
      const canvas = await html2canvas(element, {
        scale: 2,
        logging: false,
        useCORS: true,
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Payslip_${previewData?.employee?.fullName || 'Employee'}_${previewData?.month}.pdf`);
      
      toast({ title: "Success", description: "Payslip downloaded as PDF file." });
    } catch (error) {
      console.error("PDF Download failed:", error);
      toast({ title: "Error", description: "Failed to download PDF.", variant: "destructive" });
    } finally {
      setIsPdfDownloading(false);
    }
  };

  return (
    <div className="mobile-app-content md:pl-64 min-h-screen bg-background dark:bg-slate-950 transition-colors duration-300">
      <Navbar />
      <main className="p-4 md:p-8 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl md:text-3xl font-black tracking-tight text-slate-900 dark:text-slate-100 uppercase">Monthly Payroll</h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Historical audit & processing for {country}</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex items-center gap-2 bg-background dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl pl-3 shadow-sm h-11 w-full sm:w-auto transition-all hover:bg-slate-50 dark:hover:bg-slate-800/50 group overflow-hidden">
              <Filter size={16} className="text-slate-400 shrink-0 group-hover:text-primary transition-colors" />
              <Select onValueChange={setFilterMonth} value={filterMonth}>
                <SelectTrigger className="border-none shadow-none focus:ring-0 h-full p-0 pr-3 flex-1 bg-transparent hover:bg-transparent min-w-[120px] font-bold text-xs uppercase tracking-wider transition-none">
                  <SelectValue placeholder="All Months" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Months</SelectItem>
                  {monthOptions.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <Dialog open={isModalOpen} onOpenChange={(open) => {
              setIsModalOpen(open);
              if (!open) resetForm();
            }}>
              <DialogTrigger asChild>
                <Button onClick={resetForm} className="gap-2 bg-primary shadow-md hover:shadow-lg transition-all font-bold h-11">
                  <Calculator size={18} /> New Payroll Entry
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[800px] max-h-[95vh] overflow-y-auto border-none shadow-2xl dark:bg-slate-900">
                <DialogHeader>
                  <DialogTitle className="text-xl font-black dark:text-slate-100">{editingRecordId ? "Adjust Payroll" : "Process New Payroll"} - {country}</DialogTitle>
                </DialogHeader>
                <div className="space-y-6 py-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Select Employee</Label>
                      <Select onValueChange={setSelectedEmpId} value={selectedEmpId}>
                        <SelectTrigger className="h-11 font-bold dark:bg-slate-800">
                          <SelectValue placeholder="Choose employee" />
                        </SelectTrigger>
                        <SelectContent>
                          {(employees || []).map((emp: any) => (
                            <SelectItem key={emp.id} value={emp.id}>{emp.fullName || emp.name} ({emp.employeeNumber})</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Payroll Month</Label>
                      <Select onValueChange={setSelectedMonth} value={selectedMonth}>
                        <SelectTrigger className="h-11 font-bold dark:bg-slate-800">
                          <SelectValue placeholder="Choose month" />
                        </SelectTrigger>
                        <SelectContent>
                          {monthOptions.map(opt => (
                            <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {selectedEmployee && (
                    <div className="mt-4 p-5 border border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-50 dark:bg-slate-800/50 flex items-center gap-4 shadow-inner">
                      <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-black text-lg">
                        {selectedEmployee.fullName?.[0] || 'E'}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-black text-slate-900 dark:text-slate-100">{selectedEmployee.fullName}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] font-black bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-2 py-0.5 rounded text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                            Base: {historicalSalary.toLocaleString()} {selectedEmployee.salaryCurrency || currency}
                          </span>
                          {selectedEmployee.salaryHistory && selectedEmployee.salaryHistory.length > 1 && (
                            <span className="text-[10px] bg-primary/20 text-primary px-2 py-0.5 rounded font-black flex items-center gap-1 uppercase tracking-wider">
                              <History size={10} /> Historical Rate Applied
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {country === "Japan" ? (
                    <JapanPayrollForm 
                      data={japanData} 
                      onChange={setJapanData} 
                      baseSalary={historicalSalary}
                      employeeLeave={
                        selectedEmployee ? { 
                          total: Number(selectedEmployee.totalPaidLeave) || 0, 
                          used: currentYearLeaveUsed 
                        } : undefined
                      }
                      selectedMonth={selectedMonth}
                    />
                  ) : (
                    <MyanmarPayrollForm 
                      data={myanmarData} 
                      onChange={setMyanmarData} 
                      baseSalary={historicalSalary}
                      salaryCurrency={selectedEmployee?.salaryCurrency}
                    />
                  )}
                  
                  <DialogFooter>
                    <Button onClick={handleGenerate} className="w-full h-12 text-sm font-black shadow-lg" disabled={!selectedEmpId}>
                      {editingRecordId ? "UPDATE PAYSLIP" : "PROCESS PAYSLIP"}
                    </Button>
                  </DialogFooter>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <Card className="border-none shadow-sm overflow-hidden bg-white dark:bg-slate-900/50">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/50 dark:bg-slate-900/30 hover:bg-slate-50/50 dark:hover:bg-slate-900/30">
                  <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Period</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Employee Profile</TableHead>
                  <TableHead className="hidden sm:table-cell text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Net Disbursement</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Status</TableHead>
                  <TableHead className="text-right text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payrollLoading ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-12 text-sm font-medium text-slate-400 dark:text-slate-500">Syncing payroll logs...</TableCell></TableRow>
                ) : sortedRecords.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-12 text-sm font-medium text-slate-400 dark:text-slate-500 italic">No disbursements found for this period.</TableCell></TableRow>
                ) : (
                  sortedRecords.map((rec: any) => (
                    <TableRow key={rec.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors border-slate-100 dark:border-slate-800">
                      <TableCell className="font-bold text-xs flex items-center gap-2 dark:text-slate-300">
                        <Calendar size={14} className="text-slate-400" />
                        {rec.payPeriodStartDate?.substring(0, 7) || rec.month || 'N/A'}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-900 dark:text-slate-100">{(employees || []).find((e: any) => e.id === rec.employeeId)?.fullName || 'Unknown'}</span>
                          <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-tighter">Code: {(employees || []).find((e: any) => e.id === rec.employeeId)?.employeeNumber || 'N/A'}</span>
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell font-black text-slate-900 dark:text-slate-100">
                        {Math.round(rec.netPay || 0).toLocaleString()} <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">{currency}</span>
                      </TableCell>
                      <TableCell>
                        <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 text-[9px] font-black uppercase tracking-widest border border-emerald-200 dark:border-emerald-800">{rec.status}</span>
                      </TableCell>
                      <TableCell className="text-right space-x-1">
                        <Button variant="ghost" size="icon" onClick={() => handlePreview(rec)} className="h-8 w-8 hover:bg-slate-100 dark:hover:bg-slate-800"><Eye size={14} className="text-slate-600 dark:text-slate-400" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(rec)} className="h-8 w-8 hover:bg-slate-100 dark:hover:bg-slate-800"><Pencil size={14} className="text-slate-600 dark:text-slate-400" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(rec)} className="h-8 w-8 hover:bg-red-50 dark:hover:bg-red-950 text-red-400"><Trash2 size={14} /></Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </Card>

        <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
          <DialogContent className="max-w-[1000px] w-[95vw] h-[95vh] overflow-y-auto p-4 md:p-6 border-none shadow-2xl dark:bg-slate-900">
            <DialogHeader>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pr-12 gap-4">
                <DialogTitle className="text-xl font-black dark:text-slate-100">Payslip Document Preview</DialogTitle>
                <div className="flex gap-2">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button 
                          variant="outline" 
                          size="icon" 
                          onClick={handleDownloadPdf} 
                          className="h-10 w-10 font-bold border-slate-200 dark:border-slate-800 dark:bg-slate-800"
                          disabled={isPdfDownloading}
                        >
                          {isPdfDownloading ? <Loader2 size={18} className="animate-spin" /> : <FileDown size={18} className="text-red-500" />}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Download PDF</TooltipContent>
                    </Tooltip>
                    
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button 
                          variant="outline" 
                          size="icon" 
                          onClick={handleDownloadExcel} 
                          className="h-10 w-10 font-bold border-slate-200 dark:border-slate-800 dark:bg-slate-800"
                          disabled={isDownloading}
                        >
                          {isDownloading ? <Loader2 size={18} className="animate-spin" /> : <FileSpreadsheet size={18} className="text-emerald-500" />}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Download Excel</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </div>
            </DialogHeader>
            <div className="bg-slate-100 dark:bg-slate-800/50 p-4 md:p-8 rounded-2xl mt-4 shadow-inner">
              {previewData && (
                <div className="bg-white text-black rounded-xl shadow-2xl p-0 overflow-hidden ring-1 ring-slate-200">
                  <PayslipDocument 
                    ref={printRef}
                    country={previewData.country} 
                    employee={previewData.employee} 
                    month={previewData.month} 
                    data={previewData.data} 
                    record={previewData}
                  />
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
