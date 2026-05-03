
"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { 
  useFirestore, 
  useCollection, 
  useMemoFirebase,
  useUser,
  updateDocumentNonBlocking
} from "@/firebase";
import { 
  collection, 
  query, 
  where, 
  doc, 
  serverTimestamp,
  writeBatch
} from "firebase/firestore";
import { useCountry } from "@/context/CountryContext";
import { Button } from "@/components/ui/button";
import { Plus, Pencil, Trash2, Search, UserCircle, Briefcase, Mail, Calendar, Hash, Banknote, History, ChevronDown, ChevronUp } from "lucide-react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { FirestorePermissionError } from "@/firebase/errors";
import { errorEmitter } from "@/firebase/error-emitter";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface SalaryHistoryItem {
  amount: number;
  effectiveMonth: string;
}

interface Employee {
  id: string;
  companyId: string;
  employeeNumber: string;
  fullName: string;
  department: string;
  email: string;
  baseSalary: number;
  salaryHistory?: SalaryHistoryItem[];
  salaryCurrency?: "USD" | "MMK" | "JPY";
  country: string;
  hireDate: string;
  totalPaidLeave: number;
}

export default function EmployeesPage() {
  const { country, currency } = useCountry();
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [showHistory, setShowHistory] = useState(false);
  
  const currentYear = new Date().getFullYear();

  const [formData, setFormData] = useState({
    fullName: "",
    employeeNumber: "",
    department: "",
    baseSalary: 0,
    salaryCurrency: "" as "USD" | "MMK" | "JPY" | "",
    email: "",
    hireDate: "",
    totalPaidLeave: 0,
    effectiveMonth: new Date().toISOString().substring(0, 7),
    salaryHistory: [] as SalaryHistoryItem[]
  });

  const employeesQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(
      collection(firestore, "employees"), 
      where("country", "==", country),
      where("companyId", "==", user.uid)
    );
  }, [firestore, country, user]);

  const payrollQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(
      collection(firestore, "payrollRecords"),
      where("companyId", "==", user.uid),
      where("country", "==", country)
    );
  }, [firestore, user, country]);

  const { data: employees, isLoading: loading } = useCollection<Employee>(employeesQuery);
  const { data: allPayroll } = useCollection(payrollQuery);

  // Yearly Leave Reset Logic: Calculate used leave from payroll records of the current year
  const calculateUsedLeave = (employeeId: string) => {
    if (!allPayroll) return 0;
    return allPayroll
      .filter(p => p.employeeId === employeeId && p.payPeriodStartDate?.startsWith(currentYear.toString()))
      .reduce((acc, curr) => acc + (curr.paidLeaveDays || curr.japanData?.paidLeaveDays || 0), 0);
  };

  const resetForm = () => {
    setFormData({ 
      fullName: "", 
      employeeNumber: "", 
      department: "", 
      baseSalary: 0, 
      salaryCurrency: country === "Myanmar" ? "MMK" : "JPY",
      email: "",
      hireDate: new Date().toISOString().split('T')[0],
      totalPaidLeave: 0,
      effectiveMonth: new Date().toISOString().substring(0, 7),
      salaryHistory: []
    });
    setEditingId(null);
    setShowHistory(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!firestore || !user) return;

    // Implementation of salary history: merge new salary entry
    const newHistory = [...formData.salaryHistory];
    const existingEntryIndex = newHistory.findIndex(h => h.effectiveMonth === formData.effectiveMonth);
    
    if (existingEntryIndex > -1) {
      newHistory[existingEntryIndex].amount = Number(formData.baseSalary);
    } else {
      newHistory.push({ amount: Number(formData.baseSalary), effectiveMonth: formData.effectiveMonth });
    }

    // Sort history by month descending so latest is easily accessible
    newHistory.sort((a, b) => b.effectiveMonth.localeCompare(a.effectiveMonth));

    const dataToSave = {
      fullName: formData.fullName,
      employeeNumber: formData.employeeNumber,
      department: formData.department,
      baseSalary: Number(formData.baseSalary), // We keep this as "current" view
      salaryHistory: newHistory,
      salaryCurrency: formData.salaryCurrency || (country === "Myanmar" ? "MMK" : "JPY"),
      email: formData.email,
      hireDate: formData.hireDate,
      totalPaidLeave: Number(formData.totalPaidLeave),
      country,
      companyId: user.uid,
      updatedAt: serverTimestamp()
    };

    if (editingId) {
      const docRef = doc(firestore, "employees", editingId);
      updateDocumentNonBlocking(docRef, dataToSave);
      toast({ title: "Employee updated", description: `${formData.fullName} has been updated.` });
    } else {
      const colRef = collection(firestore, "employees");
      const newDocRef = doc(colRef);
      const batch = writeBatch(firestore);
      batch.set(newDocRef, { ...dataToSave, createdAt: serverTimestamp() });
      batch.commit().catch(err => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: newDocRef.path,
          operation: 'create',
          requestResourceData: dataToSave
        }));
      });
      toast({ title: "Employee added", description: `${formData.fullName} has been added successfully.` });
    }
    setIsModalOpen(false);
    resetForm();
  };

  const handleDelete = (id: string) => {
    if (!firestore || !confirm("Are you sure you want to delete this employee?")) return;
    const batch = writeBatch(firestore);
    const empRef = doc(firestore, "employees", id);
    batch.delete(empRef);
    batch.commit().catch(err => {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: empRef.path,
        operation: 'delete'
      }));
    });
    toast({ title: "Employee deleted", variant: "destructive" });
  };

  const openEdit = (emp: Employee) => {
    // Migration: ensure salaryHistory exists
    const history = emp.salaryHistory && emp.salaryHistory.length > 0 
      ? emp.salaryHistory 
      : [{ amount: emp.baseSalary, effectiveMonth: emp.hireDate?.substring(0, 7) || new Date().toISOString().substring(0, 7) }];

    setEditingId(emp.id);
    setFormData({
      fullName: emp.fullName || "",
      employeeNumber: emp.employeeNumber || "",
      department: emp.department || "",
      baseSalary: emp.baseSalary || 0,
      salaryCurrency: emp.salaryCurrency || (country === "Myanmar" ? "MMK" : "JPY"),
      email: emp.email || "",
      hireDate: emp.hireDate || new Date().toISOString().split('T')[0],
      totalPaidLeave: emp.totalPaidLeave || 0,
      effectiveMonth: history[0]?.effectiveMonth || new Date().toISOString().substring(0, 7),
      salaryHistory: history
    });
    setIsModalOpen(true);
  };

  const filteredEmployees = (employees || []).filter(emp => 
    (emp.fullName || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (emp.employeeNumber || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="md:pl-64 pt-16 md:pt-0 min-h-screen bg-background">
      <Navbar />
      <main className="p-4 md:p-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-primary">Employees</h2>
            <p className="text-muted-foreground">Manage your workforce in {country}</p>
          </div>
          <Dialog open={isModalOpen} onOpenChange={(open) => {
            setIsModalOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button onClick={() => resetForm()} className="gap-2 bg-primary shadow-lg w-full md:w-auto">
                <Plus size={18} /> Add Employee
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] max-h-[95vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingId ? "Edit Employee" : "Add New Employee"}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-6 py-4">
                <div className="space-y-4 border-b pb-6">
                  <div className="space-y-2">
                    <Label htmlFor="fullName" className="flex items-center gap-2 text-xs font-bold uppercase text-muted-foreground">
                      <UserCircle size={14} /> Full Name
                    </Label>
                    <Input id="fullName" required value={formData.fullName} onChange={e => setFormData({...formData, fullName: e.target.value})} className="h-12 bg-muted/30" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="code" className="flex items-center gap-2 text-xs font-bold uppercase text-muted-foreground">
                        <Hash size={14} /> Code
                      </Label>
                      <Input id="code" required value={formData.employeeNumber} onChange={e => setFormData({...formData, employeeNumber: e.target.value})} className="h-12 bg-muted/30" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="dept" className="flex items-center gap-2 text-xs font-bold uppercase text-muted-foreground">
                        <Briefcase size={14} /> Department
                      </Label>
                      <Input id="dept" required value={formData.department} onChange={e => setFormData({...formData, department: e.target.value})} className="h-12 bg-muted/30" />
                    </div>
                  </div>
                </div>

                <div className="space-y-4 bg-primary/5 p-4 rounded-xl border border-primary/10">
                  <div className="flex justify-between items-center">
                    <h3 className="text-sm font-bold text-primary uppercase tracking-tight flex items-center gap-2">
                      <Banknote size={16} /> Salary Management
                    </h3>
                    {editingId && (
                      <Collapsible open={showHistory} onOpenChange={setShowHistory}>
                        <CollapsibleTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 text-[10px] font-bold gap-1 text-primary">
                            <History size={14} /> {showHistory ? "HIDE HISTORY" : "SHOW HISTORY"}
                          </Button>
                        </CollapsibleTrigger>
                      </Collapsible>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="sm:col-span-2 space-y-2">
                      <Label className="text-[10px] font-bold text-muted-foreground uppercase">Monthly Base Salary</Label>
                      <div className="relative">
                        <Input 
                          type="number" 
                          required 
                          className="h-12 pl-10 text-lg font-bold"
                          value={formData.baseSalary === 0 ? "" : formData.baseSalary} 
                          onChange={e => setFormData({...formData, baseSalary: e.target.value === "" ? 0 : Number(e.target.value)})} 
                        />
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-mono">{country === "Japan" ? "¥" : "K"}</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-bold text-muted-foreground uppercase">Effective Month</Label>
                      <Input 
                        type="month" 
                        required
                        className="h-12"
                        value={formData.effectiveMonth}
                        onChange={e => setFormData({...formData, effectiveMonth: e.target.value})}
                      />
                    </div>
                  </div>

                  {showHistory && formData.salaryHistory.length > 0 && (
                    <div className="mt-4 space-y-2 animate-in slide-in-from-top-2">
                      <Label className="text-[10px] font-bold text-primary/70 uppercase">Historical Records</Label>
                      <div className="bg-background rounded-lg border overflow-hidden">
                        <Table>
                          <TableBody>
                            {formData.salaryHistory.map((h, i) => (
                              <TableRow key={i} className="text-xs">
                                <TableCell className="font-mono">{h.effectiveMonth}</TableCell>
                                <TableCell className="text-right font-bold">{h.amount.toLocaleString()} {formData.salaryCurrency || currency}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-bold text-muted-foreground uppercase">Yearly Leave Allowance (Days)</Label>
                    <Input 
                      type="number" 
                      className="h-12"
                      value={formData.totalPaidLeave === 0 ? "" : formData.totalPaidLeave} 
                      onChange={e => setFormData({...formData, totalPaidLeave: e.target.value === "" ? 0 : Number(e.target.value)})} 
                    />
                    <p className="text-[10px] text-muted-foreground italic">Resets automatically on Jan 1st</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="hireDate" className="text-[10px] font-bold text-muted-foreground uppercase">Hire Date</Label>
                    <Input id="hireDate" type="date" required value={formData.hireDate} onChange={e => setFormData({...formData, hireDate: e.target.value})} className="h-12" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email" className="text-[10px] font-bold text-muted-foreground uppercase">Contact Email</Label>
                  <Input id="email" type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="h-12" />
                </div>

                <DialogFooter className="pt-4">
                  <Button type="submit" className="w-full h-12 text-base shadow-md">{editingId ? "Update Employee Profile" : "Create Employee Record"}</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
          <div className="p-4 border-b">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
              <Input placeholder="Search employees..." className="pl-10 h-10" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
            </div>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead>Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Current Salary</TableHead>
                  <TableHead>Leave ({currentYear})</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-8">Loading employees...</TableCell></TableRow>
                ) : filteredEmployees.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No employees found.</TableCell></TableRow>
                ) : filteredEmployees.map((emp) => {
                  const used = calculateUsedLeave(emp.id);
                  const rem = Math.max(0, (emp.totalPaidLeave || 0) - used);
                  return (
                    <TableRow key={emp.id} className="hover:bg-muted/10 transition-colors">
                      <TableCell className="font-mono text-xs">{emp.employeeNumber}</TableCell>
                      <TableCell className="font-bold">{emp.fullName}</TableCell>
                      <TableCell>{emp.department}</TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-bold text-primary">{(emp.baseSalary || 0).toLocaleString()} <span className="text-[10px] text-muted-foreground">{emp.salaryCurrency || currency}</span></span>
                          {emp.salaryHistory && emp.salaryHistory.length > 1 && (
                            <span className="text-[9px] flex items-center gap-1 text-muted-foreground"><History size={10} /> Has {emp.salaryHistory.length} records</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-bold text-orange-600">{rem} / {emp.totalPaidLeave || 0} <span className="text-[10px] font-normal">Days Left</span></span>
                          <span className="text-[9px] text-muted-foreground italic">Resets Jan 1st</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right space-x-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(emp)} className="h-8 w-8"><Pencil size={14} /></Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(emp.id)} className="h-8 w-8 text-destructive hover:bg-destructive/5"><Trash2 size={14} /></Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      </main>
    </div>
  );
}
