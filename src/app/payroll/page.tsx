
"use client";

import React, { useState, useRef } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { 
  useFirestore, 
  useCollection, 
  useMemoFirebase, 
  errorEmitter, 
  FirestorePermissionError 
} from "@/firebase";
import { 
  collection, 
  addDoc, 
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
import { useToast } from "@/hooks/use-toast";
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

export default function PayrollPage() {
  const { country } = useCountry();
  const { firestore } = useFirestore();
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
    if (!firestore) return null;
    return query(collection(firestore, "payroll_records"), where("country", "==", country));
  }, [firestore, country]);

  const employeesQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, "employees"), where("country", "==", country));
  }, [firestore, country]);

  const { data: payrollRecords, isLoading: payrollLoading } = useCollection(payrollQuery);
  const { data: employees, isLoading: employeesLoading } = useCollection(employeesQuery);

  const handleGenerate = () => {
    if (!selectedEmpId || !firestore) return;
    
    const emp = (employees || []).find(e => e.id === selectedEmpId);
    const colRef = collection(firestore, "payroll_records");
    const payload = {
      employeeId: selectedEmpId,
      employeeName: emp?.name || "Unknown",
      month: selectedMonth,
      country,
      data: country === "Japan" ? japanData : myanmarData,
      createdAt: serverTimestamp()
    };

    addDoc(colRef, payload)
      .then(() => {
        toast({ title: "Success", description: "Payroll record generated." });
        setIsModalOpen(false);
      })
      .catch(async (error) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: colRef.path,
          operation: 'create',
          requestResourceData: payload
        }));
        toast({ variant: "destructive", title: "Error", description: "Failed to generate record." });
      });
  };

  const handlePreview = (record: any) => {
    const emp = (employees || []).find(e => e.id === record.employeeId);
    setPreviewData({ ...record, employee: emp });
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
            <title>Payslip - ${previewData.employee?.name || 'Employee'}</title>
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
                        {(employees || []).map(emp => (
                          <SelectItem key={emp.id} value={emp.id}>{emp.name} ({emp.employeeCode})</SelectItem>
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
                    <p className="text-sm font-bold text-primary">Employee: {(employees || []).find(e => e.id === selectedEmpId)?.name}</p>
                    <p className="text-xs text-muted-foreground">Base Salary: {(employees || []).find(e => e.id === selectedEmpId)?.baseSalary.toLocaleString()} {country === "Japan" ? "JPY" : "MMK"}</p>
                  </div>
                )}

                {country === "Japan" ? (
                  <JapanPayrollForm 
                    data={japanData} 
                    onChange={setJapanData} 
                    baseSalary={(employees || []).find(e => e.id === selectedEmpId)?.baseSalary || 0}
                  />
                ) : (
                  <MyanmarPayrollForm 
                    data={myanmarData} 
                    onChange={setMyanmarData} 
                    baseSalary={(employees || []).find(e => e.id === selectedEmpId)?.baseSalary || 0}
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
                  <TableHead className="hidden sm:table-cell">Country</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payrollLoading ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-8">Loading records...</TableCell></TableRow>
                ) : (payrollRecords || []).length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No payroll records found.</TableCell></TableRow>
                ) : (
                  (payrollRecords || []).map((rec: any) => (
                    <TableRow key={rec.id} className="hover:bg-muted/20">
                      <TableCell className="font-medium">{rec.month}</TableCell>
                      <TableCell>{rec.employeeName}</TableCell>
                      <TableCell className="hidden sm:table-cell">{rec.country}</TableCell>
                      <TableCell>
                        <span className="px-2 py-1 rounded-full bg-green-100 text-green-700 text-xs font-bold">Processed</span>
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
                  <Button variant="outline" size="sm" className="gap-2">
                    <Download size={16} /> <span className="hidden sm:inline">PDF</span>
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
