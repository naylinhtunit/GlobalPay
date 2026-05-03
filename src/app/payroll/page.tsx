
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
  getDoc
} from "firebase/firestore";
import { useCountry } from "@/context/CountryContext";
import { Button } from "@/components/ui/button";
import { Eye, Calculator, Pencil, Trash2, Filter, Calendar, Download, Loader2, History } from "lucide-react";
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
import { MyanmarPayrollForm, type MyanmarData } from "@/components/payroll/MyanmarPayrollForm";
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
  
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewData, setPreviewData] = useState<any>(null);
  const [isDownloading, setIsDownloading] = useState(false);

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

  // Salary History Logic: Find the effective salary for the chosen payroll month
  const historicalSalary = useMemo(() => {
    if (!selectedEmployee || !selectedMonth) return 0;
    
    // Migration: If no history exists, use baseSalary
    if (!selectedEmployee.salaryHistory || selectedEmployee.salaryHistory.length === 0) {
      return selectedEmployee.baseSalary || 0;
    }

    // Sort history to find the most recent record that is NOT later than the selected month
    const history = [...selectedEmployee.salaryHistory].sort((a, b) => b.effectiveMonth.localeCompare(a.effectiveMonth));
    const effectiveRecord = history.find(h => h.effectiveMonth <= selectedMonth);
    
    return effectiveRecord ? effectiveRecord.amount : (history[history.length - 1]?.amount || 0);
  }, [selectedEmployee, selectedMonth]);

  // Yearly Leave Logic: Calculate already used leave for this year, excluding current editing record
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
      incomeTax: 0,
      exchangeRate: 0
    });
  };

  const handleGenerate = async () => {
    if (!selectedEmployee || !firestore || !user) return;
    
    let grossPay = 0;
    let deductions = 0;
    let netPay = 0;
    const baseSalary = historicalSalary; // Use the salary from date, not current

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
      payPeriodEndDate: `${selectedMonth}-30`,
      payoutDate: new Date().toISOString(),
      country,
      basicSalary: baseSalary,
      status: "Calculated",
      totalGrossPay: Math.round(grossPay),
      totalDeductions: Math.round(deductions),
      netPay: Math.round(netPay),
      paidLeaveDays: Number(japanData.paidLeaveDays || 0), // Persist leave count for yearly calculation
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
      setJapanData({ ...record.japanData });
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

  const handleDownloadPDF = async () => {
    if (!printRef.current || isDownloading) return;
    setIsDownloading(true);
    
    try {
      const html2canvas = (await import('html2canvas')).default;
      const { jsPDF } = await import('jspdf');

      const element = printRef.current;
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Payslip_${previewData?.employee?.fullName || 'Employee'}_${previewData?.month}.pdf`);
      
      toast({ title: "Success", description: "Payslip downloaded as PDF." });
    } catch (error) {
      console.error("PDF Download failed:", error);
      toast({ title: "Error", description: "Failed to download PDF.", variant: "destructive" });
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="md:pl-64 pt-16 md:pt-0 min-h-screen bg-background">
      <Navbar />
      <main className="p-4 md:p-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-primary">Monthly Payroll</h2>
            <p className="text-muted-foreground">Process payments based on historical salary and yearly leave</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex items-center gap-2 bg-card border rounded-lg px-3 shadow-sm h-10 w-full sm:w-auto">
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

                  {selectedEmployee && (
                    <div className="mt-4 p-4 border rounded-lg bg-primary/5 flex items-center gap-4">
                      <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
                        {selectedEmployee.fullName?.[0] || 'E'}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-bold text-primary">{selectedEmployee.fullName}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] font-bold bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
                            Base: {historicalSalary.toLocaleString()} {selectedEmployee.salaryCurrency || currency}
                          </span>
                          {selectedEmployee.salaryHistory && selectedEmployee.salaryHistory.length > 1 && (
                            <span className="text-[10px] bg-primary/20 text-primary px-1.5 py-0.5 rounded flex items-center gap-1">
                              <History size={10} /> History Applied
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
                          <span className="font-semibold">{(employees || []).find((e: any) => e.id === rec.employeeId)?.fullName || 'Unknown'}</span>
                          <span className="text-[10px] text-muted-foreground">ID: {(employees || []).find((e: any) => e.id === rec.employeeId)?.employeeNumber || 'N/A'}</span>
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell font-mono font-bold">
                        {Math.round(rec.netPay || 0).toLocaleString()} <span className="text-[10px] font-normal text-muted-foreground">{currency}</span>
                      </TableCell>
                      <TableCell>
                        <span className="px-2 py-0.5 rounded-full bg-green-500/10 text-green-600 text-[10px] font-bold border border-green-500/20">{rec.status}</span>
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
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleDownloadPDF} 
                    className="gap-2 h-9 min-w-[140px]"
                    disabled={isDownloading}
                  >
                    {isDownloading ? (
                      <>
                        <Loader2 size={16} className="animate-spin" /> Downloading...
                      </>
                    ) : (
                      <>
                        <Download size={16} /> Download PDF
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </DialogHeader>
            <div className="bg-muted p-2 md:p-8 rounded-lg mt-4 shadow-inner">
              {previewData && (
                <div className="overflow-x-auto bg-white text-black rounded shadow-xl p-4">
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
