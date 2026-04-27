
"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { 
  useFirestore, 
  useCollection, 
  useMemoFirebase,
  useUser,
  addDocumentNonBlocking,
  updateDocumentNonBlocking,
  deleteDocumentNonBlocking
} from "@/firebase";
import { 
  collection, 
  query, 
  where, 
  doc,
  serverTimestamp,
  writeBatch,
  increment
} from "firebase/firestore";
import { useCountry } from "@/context/CountryContext";
import { Button } from "@/components/ui/button";
import { Eye, Calculator, Printer, Pencil, Trash2, Filter, Calendar } from "lucide-react";
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
import { JapanPayrollForm, type JapanData } from "@/components/payroll/JapanPayrollForm";
import { MyanmarPayrollForm } from "@/components/payroll/MyanmarPayrollForm";
import { PayslipDocument } from "@/components/payroll/PayslipDocument";
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
  const [oldPaidLeaveDays, setOldPaidLeaveDays] = useState(0);
  
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewData, setPreviewData] = useState<any>(null);

  useEffect(() => {
    const options = [];
    const now = new Date();
    // Generate a range of months for selection, including one month ahead
    for (let i = -1; i < 24; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const value = `${year}-${month}`;
      const label = d.toLocaleString('default', { month: 'long', year: 'numeric' });
      options.push({ value, label });
    }
    setMonthOptions(options);
    
    // Default to the next month option if available (it will be the first item in our list due to i=-1)
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
    holidayWorkHours: 0,
    holidayNightHours: 0,
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

  const [myanmarData, setMyanmarData] = useState({
    otHours: 0,
    attendanceBonus: 0,
    mealAllowance: 0,
    ssbAmount: 0,
    incomeTax: 0
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
    setOldPaidLeaveDays(0);
    if (monthOptions.length > 0) setSelectedMonth(monthOptions[0].value);
    setJapanData({
      scheduledDays: 0,
      absenceHours: 0,
      lateEarlyHours: 0,
      regularOTHours: 0,
      lateNightOTHours: 0,
      holidayWorkHours: 0,
      holidayNightHours: 0,
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
      incomeTax: 0
    });
  };

  const handleGenerate = async () => {
    if (!selectedEmpId || !firestore || !user) return;
    
    const emp = (employees || []).find((e: any) => e.id === selectedEmpId);
    if (!emp) return;

    let grossPay = 0;
    let deductions = 0;
    let netPay = 0;
    const baseSalary = Number(emp.baseSalary || emp.salary || 0);

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
      const hourlyRate = (baseSalary / 30 / 8);
      grossPay = baseSalary + (myanmarData.otHours * hourlyRate * 2) + (myanmarData.attendanceBonus || 0) + (myanmarData.mealAllowance || 0);
      deductions = (myanmarData.ssbAmount || 0) + (myanmarData.incomeTax || 0);
      netPay = grossPay - deductions;
    }

    const payload = {
      amount: Math.round(netPay),
      month: selectedMonth,
      employeeId: selectedEmpId,
      companyId: user.uid,
      payPeriodStartDate: `${selectedMonth}-01`,
      payPeriodEndDate: `${selectedMonth}-30`,
      payoutDate: new Date().toISOString(),
      country,
      basicSalary: baseSalary,
      status: "Calculated",
      totalGrossPay: Math.round(grossPay),
      totalDeductions: Math.round(deductions),
      netPay: Math.round(netPay),
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

    const empRef = doc(firestore, "employees", selectedEmpId);
    if (country === "Japan") {
      const newPaidLeave = Number(japanData.paidLeaveDays || 0);
      const leaveDiff = newPaidLeave - oldPaidLeaveDays;
      if (leaveDiff !== 0) {
        batch.update(empRef, {
          usedPaidLeave: increment(leaveDiff)
        });
      }
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
      const legacyJapanData = record.japanData || {};
      const existingShifts = legacyJapanData.shifts || (legacyJapanData.scheduledDays > 0 ? [{
        type: legacyJapanData.shiftType || "day",
        startTime: legacyJapanData.startTime || "08:00",
        days: Number(legacyJapanData.scheduledDays)
      }] : []);

      setJapanData({
        ...legacyJapanData,
        shifts: existingShifts
      });
      setOldPaidLeaveDays(Number(legacyJapanData.paidLeaveDays || 0));
    } else {
      setMyanmarData(record.myanmarData || {});
    }
    setIsModalOpen(true);
  };

  const handleDelete = (record: any) => {
    if (!firestore || !confirm("Are you sure you want to delete this payroll record?")) return;
    
    const batch = writeBatch(firestore);
    const payrollRef = doc(firestore, "payrollRecords", record.id);
    batch.delete(payrollRef);

    if (record.country === "Japan" && record.japanData?.paidLeaveDays) {
      const empRef = doc(firestore, "employees", record.employeeId);
      batch.update(empRef, {
        usedPaidLeave: increment(-Number(record.japanData.paidLeaveDays))
      });
    }

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

  const handlePrint = () => {
    if (!printRef.current) return;
    const content = printRef.current.innerHTML;
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Payslip - ${previewData?.employee?.fullName || 'Employee'}</title>
            <script src="https://cdn.tailwindcss.com"></script>
            <style>
              @media print {
                body { padding: 0; margin: 0; }
                .no-print { display: none; }
              }
            </style>
          </head>
          <body class="p-8">${content}</body>
        </html>
      `);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 500);
    }
  };

  return (
    <div className="md:pl-64 pt-16 md:pt-0 min-h-screen">
      <Navbar />
      <main className="p-4 md:p-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-primary">Monthly Payroll</h2>
            <p className="text-muted-foreground">Process payments for {country} employees</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex items-center gap-2 bg-white border rounded-lg px-3 shadow-sm h-10 w-full sm:w-auto">
              <Filter size={16} className="text-muted-foreground shrink-0" />
              <Select onValueChange={setFilterMonth} value={filterMonth}>
                <SelectTrigger className="border-none shadow-none focus:ring-0 h-8 p-0 flex-1 hover:bg-transparent min-w-[120px]">
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
                <Button onClick={resetForm} className="gap-2 bg-primary shadow-lg">
                  <Calculator size={18} /> New Payroll Entry
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[800px] max-h-[95vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editingRecordId ? "Edit Payroll" : "Process Payroll"} - {country}</DialogTitle>
                </DialogHeader>
                <div className="space-y-6 py-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Select Employee</Label>
                      <Select onValueChange={setSelectedEmpId} value={selectedEmpId}>
                        <SelectTrigger>
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
                      <Label>Payroll Month</Label>
                      <Select onValueChange={setSelectedMonth} value={selectedMonth}>
                        <SelectTrigger>
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

                  {selectedEmpId && (
                    <div className="mt-4 p-4 border rounded-lg bg-primary/5 flex items-center gap-4">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                        {(employees || []).find((e: any) => e.id === selectedEmpId)?.fullName?.[0] || 'E'}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-primary">
                          {(employees || []).find((e: any) => e.id === selectedEmpId)?.fullName || (employees || []).find((e: any) => e.id === selectedEmpId)?.name}
                        </p>
                        <p className="text-xs text-muted-foreground font-mono">
                          Base: {((employees || []).find((e: any) => e.id === selectedEmpId)?.baseSalary || (employees || []).find((e: any) => e.id === selectedEmpId)?.salary || 0).toLocaleString()} {currency}
                        </p>
                      </div>
                    </div>
                  )}

                  {country === "Japan" ? (
                    <JapanPayrollForm 
                      data={japanData} 
                      onChange={setJapanData} 
                      baseSalary={(employees || []).find((e: any) => e.id === selectedEmpId)?.baseSalary || (employees || []).find((e: any) => e.id === selectedEmpId)?.salary || 0}
                      employeeLeave={
                        (() => {
                          const emp = (employees || []).find((e: any) => e.id === selectedEmpId);
                          if (!emp) return undefined;
                          const effectiveUsed = Math.max(0, (Number(emp.usedPaidLeave) || 0) - (editingRecordId ? oldPaidLeaveDays : 0));
                          return { total: Number(emp.totalPaidLeave) || 0, used: effectiveUsed };
                        })()
                      }
                    />
                  ) : (
                    <MyanmarPayrollForm 
                      data={myanmarData} 
                      onChange={setMyanmarData} 
                      baseSalary={(employees || []).find((e: any) => e.id === selectedEmpId)?.baseSalary || (employees || []).find((e: any) => e.id === selectedEmpId)?.salary || 0}
                    />
                  )}
                  
                  <DialogFooter>
                    <Button onClick={handleGenerate} className="w-full h-12 text-base shadow-md" disabled={!selectedEmpId}>
                      {editingRecordId ? "Update Payslip" : "Generate Payslip"}
                    </Button>
                  </DialogFooter>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead>Month</TableHead>
                  <TableHead>Employee</TableHead>
                  <TableHead className="hidden sm:table-cell">Net Pay</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payrollLoading ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-8">Loading records...</TableCell></TableRow>
                ) : sortedRecords.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No records found for the selected period.</TableCell></TableRow>
                ) : (
                  sortedRecords.map((rec: any) => (
                    <TableRow key={rec.id} className="hover:bg-muted/10 transition-colors">
                      <TableCell className="font-medium flex items-center gap-2">
                        <Calendar size={14} className="text-muted-foreground" />
                        {rec.payPeriodStartDate?.substring(0, 7) || rec.month || 'N/A'}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-semibold">{(employees || []).find((e: any) => e.id === rec.employeeId)?.fullName || (employees || []).find((e: any) => e.id === rec.employeeId)?.name || 'Unknown'}</span>
                          <span className="text-[10px] text-muted-foreground">ID: {(employees || []).find((e: any) => e.id === rec.employeeId)?.employeeNumber || 'N/A'}</span>
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell font-mono font-bold">
                        {Math.round(rec.netPay || rec.amount || 0).toLocaleString()} <span className="text-[10px] font-normal text-muted-foreground">{currency}</span>
                      </TableCell>
                      <TableCell>
                        <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-[10px] font-bold border border-green-200">{rec.status}</span>
                      </TableCell>
                      <TableCell className="text-right space-x-1">
                        <Button variant="ghost" size="icon" onClick={() => handlePreview(rec)} title="View Payslip" className="h-8 w-8">
                          <Eye size={14} />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(rec)} title="Edit" className="h-8 w-8">
                          <Pencil size={14} />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(rec)} title="Delete" className="h-8 w-8 text-destructive hover:bg-destructive/10">
                          <Trash2 size={14} />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
          <DialogContent className="max-w-[1000px] w-[95vw] h-[95vh] overflow-y-auto p-4 md:p-6">
            <DialogHeader>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pr-12 gap-4">
                <DialogTitle>Payslip Preview</DialogTitle>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handlePrint} className="gap-2 h-9">
                    <Printer size={16} /> Print
                  </Button>
                </div>
              </div>
            </DialogHeader>
            <div className="bg-slate-100 p-2 md:p-8 rounded-lg mt-4 shadow-inner">
              {previewData && (
                <div className="overflow-x-auto bg-white rounded shadow-xl">
                  <PayslipDocument 
                    ref={printRef}
                    country={previewData.country} 
                    employee={previewData.employee} 
                    month={previewData.month} 
                    data={previewData.data} 
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
