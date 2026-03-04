
"use client";

import React, { useState, useRef } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { 
  useFirestore, 
  useCollection, 
  useMemoFirebase,
  useUser,
  addDocumentNonBlocking
} from "@/firebase";
import { 
  collection, 
  query, 
  where, 
  serverTimestamp 
} from "firebase/firestore";
import { useCountry } from "@/context/CountryContext";
import { Button } from "@/components/ui/button";
import { Eye, Calculator, Printer, Download } from "lucide-react";
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
import { JapanPayrollForm } from "@/components/payroll/JapanPayrollForm";
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

export default function PayrollPage() {
  const { country, currency } = useCountry();
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEmpId, setSelectedEmpId] = useState("");
  const [selectedMonth, setSelectedMonth] = useState("2024-01");
  
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewData, setPreviewData] = useState<any>(null);

  const [japanData, setJapanData] = useState({
    ot125Hours: 0,
    nightShiftHours: 0,
    lateNightOTHours: 0,
    healthInsurance: 0,
    pension: 0,
    incomeTax: 0,
    hostelFee: 0
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

  const handleGenerate = () => {
    if (!selectedEmpId || !firestore || !user) return;
    
    const emp = (employees || []).find((e: any) => e.id === selectedEmpId);
    if (!emp) return;

    let grossPay = 0;
    let deductions = 0;
    const baseSalary = emp.baseSalary;

    if (country === "Japan") {
      const hourlyRate = baseSalary / 160;
      grossPay = baseSalary + (japanData.ot125Hours * hourlyRate * 1.25) + (japanData.nightShiftHours * hourlyRate * 0.25) + (japanData.lateNightOTHours * hourlyRate * 1.5);
      deductions = japanData.healthInsurance + japanData.pension + japanData.incomeTax + japanData.hostelFee;
    } else {
      const hourlyRate = (baseSalary / 30 / 8);
      grossPay = baseSalary + (myanmarData.otHours * hourlyRate * 2) + myanmarData.attendanceBonus + myanmarData.mealAllowance;
      deductions = myanmarData.ssbAmount + myanmarData.incomeTax;
    }

    const payload = {
      employeeId: selectedEmpId,
      companyId: user.uid,
      payPeriodStartDate: `${selectedMonth}-01`,
      payPeriodEndDate: `${selectedMonth}-30`,
      payoutDate: new Date().toISOString(),
      country,
      basicSalary: baseSalary,
      status: "Calculated",
      totalGrossPay: grossPay,
      totalDeductions: deductions,
      netPay: grossPay - deductions,
      japanData: country === "Japan" ? japanData : null,
      myanmarData: country === "Myanmar" ? myanmarData : null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    const colRef = collection(firestore, "payrollRecords");
    addDocumentNonBlocking(colRef, payload);
    
    toast({
      title: "Payroll generated",
      description: `Payslip for month ${selectedMonth} has been created.`
    });

    setIsModalOpen(false);
  };

  const handlePreview = (record: any) => {
    const emp = (employees || []).find((e: any) => e.id === record.employeeId);
    setPreviewData({ 
      ...record, 
      employee: emp, 
      data: record.japanData || record.myanmarData, 
      month: record.payPeriodStartDate.substring(0, 7) 
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
            <title>Payslip - ${previewData.employee?.fullName || 'Employee'}</title>
            <script src="https://cdn.tailwindcss.com"></script>
          </head>
          <body>${content}</body>
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
          <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 bg-primary shadow-lg w-full md:w-auto">
                <Calculator size={18} /> New Payroll Entry
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Process Payroll - {country}</DialogTitle>
              </DialogHeader>
              <div className="space-y-6 py-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Select Employee</Label>
                    <Select onValueChange={setSelectedEmpId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose employee" />
                      </SelectTrigger>
                      <SelectContent>
                        {(employees || []).map((emp: any) => (
                          <SelectItem key={emp.id} value={emp.id}>{emp.fullName} ({emp.employeeNumber})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Payroll Month</Label>
                    <Select onValueChange={setSelectedMonth} defaultValue="2024-01">
                      <SelectTrigger>
                        <SelectValue placeholder="Choose month" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="2024-01">January 2024</SelectItem>
                        <SelectItem value="2024-02">February 2024</SelectItem>
                        <SelectItem value="2024-03">March 2024</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {selectedEmpId && (
                  <div className="mt-4 p-4 border rounded-lg bg-primary/5">
                    <p className="text-sm font-bold text-primary">
                      Employee: {(employees || []).find((e: any) => e.id === selectedEmpId)?.fullName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Base Salary: {(employees || []).find((e: any) => e.id === selectedEmpId)?.baseSalary?.toLocaleString()} {currency}
                    </p>
                  </div>
                )}

                {country === "Japan" ? (
                  <JapanPayrollForm 
                    data={japanData} 
                    onChange={setJapanData} 
                    baseSalary={(employees || []).find((e: any) => e.id === selectedEmpId)?.baseSalary || 200000}
                  />
                ) : (
                  <MyanmarPayrollForm 
                    data={myanmarData} 
                    onChange={setMyanmarData} 
                    baseSalary={(employees || []).find((e: any) => e.id === selectedEmpId)?.baseSalary || 400000}
                  />
                )}
                
                <DialogFooter>
                  <Button onClick={handleGenerate} className="w-full" disabled={!selectedEmpId}>Generate Payslip</Button>
                </DialogFooter>
              </div>
            </DialogContent>
          </Dialog>
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
                ) : (payrollRecords || []).length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No records found.</TableCell></TableRow>
                ) : (
                  (payrollRecords || []).map((rec: any) => (
                    <TableRow key={rec.id} className="hover:bg-muted/20">
                      <TableCell className="font-medium">{rec.payPeriodStartDate.substring(0, 7)}</TableCell>
                      <TableCell>{(employees || []).find((e: any) => e.id === rec.employeeId)?.fullName || 'Unknown'}</TableCell>
                      <TableCell className="hidden sm:table-cell font-mono">{rec.netPay?.toLocaleString()}</TableCell>
                      <TableCell>
                        <span className="px-2 py-1 rounded-full bg-green-100 text-green-700 text-xs font-bold">{rec.status}</span>
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button variant="ghost" size="sm" onClick={() => handlePreview(rec)} className="gap-2">
                          <Eye size={14} /> <span className="hidden sm:inline">View Payslip</span>
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
          <DialogContent className="max-w-[900px] w-[95vw] h-[90vh] overflow-y-auto p-4 md:p-6">
            <DialogHeader>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pr-12 gap-4">
                <DialogTitle>Payslip Preview</DialogTitle>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handlePrint} className="gap-2">
                    <Printer size={16} /> Print
                  </Button>
                </div>
              </div>
            </DialogHeader>
            <div className="bg-gray-100 p-2 md:p-8 rounded-lg mt-4">
              {previewData && (
                <div className="overflow-x-auto">
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
