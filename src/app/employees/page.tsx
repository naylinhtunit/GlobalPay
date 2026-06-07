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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());

  useEffect(() => {
    setCurrentYear(new Date().getFullYear());
  }, []);

  const [formData, setFormData] = useState({
    fullName: "",
    employeeNumber: "",
    department: "",
    baseSalary: 0,
    salaryCurrency: "" as "USD" | "MMK" | "JPY" | "",
    email: "",
    hireDate: "",
    totalPaidLeave: 0,
    effectiveMonth: "",
    salaryHistory: [] as SalaryHistoryItem[]
  });

  useEffect(() => {
    if (!formData.effectiveMonth) {
      setFormData(prev => ({ ...prev, effectiveMonth: new Date().toISOString().substring(0, 7) }));
    }
  }, [formData.effectiveMonth]);

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

    const newHistory = [...formData.salaryHistory];
    const existingEntryIndex = newHistory.findIndex(h => h.effectiveMonth === formData.effectiveMonth);
    
    if (existingEntryIndex > -1) {
      newHistory[existingEntryIndex].amount = Number(formData.baseSalary);
    } else {
      newHistory.push({ amount: Number(formData.baseSalary), effectiveMonth: formData.effectiveMonth });
    }

    newHistory.sort((a, b) => b.effectiveMonth.localeCompare(a.effectiveMonth));

    const dataToSave = {
      fullName: formData.fullName,
      employeeNumber: formData.employeeNumber,
      department: formData.department,
      baseSalary: Number(formData.baseSalary), 
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
    <div className="md:pl-64 pt-16 md:pt-0 min-h-screen bg-background dark:bg-slate-950 transition-colors">
      <Navbar />
      <main className="p-4 md:p-8 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl md:text-3xl font-black tracking-tight text-slate-900 dark:text-slate-100 uppercase">Employees</h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Manage your workforce in {country}</p>
          </div>
          <Dialog open={isModalOpen} onOpenChange={(open) => {
            setIsModalOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button onClick={() => resetForm()} className="gap-2 bg-primary shadow-md hover:shadow-lg transition-all w-full md:w-auto font-bold">
                <Plus size={18} /> Add Employee
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] max-h-[95vh] overflow-y-auto border-none shadow-2xl dark:bg-slate-900">
              <DialogHeader>
                <DialogTitle className="text-xl font-black dark:text-slate-100">{editingId ? "Edit Employee Profile" : "Create New Employee"}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-6 py-4">
                <div className="space-y-4 border-b dark:border-slate-800 pb-6">
                  <div className="space-y-2">
                    <Label htmlFor="fullName" className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      <UserCircle size={14} /> Full Name
                    </Label>
                    <Input id="fullName" required value={formData.fullName} onChange={e => setFormData({...formData, fullName: e.target.value})} className="h-11 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="code" className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        <Hash size={14} /> Employee Code
                      </Label>
                      <Input id="code" required value={formData.employeeNumber} onChange={e => setFormData({...formData, employeeNumber: e.target.value})} className="h-11 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="dept" className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        <Briefcase size={14} /> Department
                      </Label>
                      <Input id="dept" required value={formData.department} onChange={e => setFormData({...formData, department: e.target.value})} className="h-11 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700" />
                    </div>
                  </div>
                </div>

                <div className="space-y-4 bg-slate-50 dark:bg-slate-800/50 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-inner">
                  <div className="flex justify-between items-center">
                    <h3 className="text-xs font-black text-slate-900 dark:text-slate-100 uppercase tracking-widest flex items-center gap-2">
                      <Banknote size={16} className="text-primary" /> Salary Management
                    </h3>
                    {editingId && (
                      <Collapsible open={showHistory} onOpenChange={setShowHistory}>
                        <CollapsibleTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-7 text-[10px] font-bold gap-1 text-primary hover:bg-primary/5">
                            <History size={14} /> {showHistory ? "HIDE LOGS" : "SHOW LOGS"}
                          </Button>
                        </CollapsibleTrigger>
                      </Collapsible>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="sm:col-span-2 space-y-2">
                      <Label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Monthly Base Salary</Label>
                      <div className="relative">
                        <Input 
                          type="number" 
                          required 
                          className="h-11 pl-10 text-lg font-black dark:bg-slate-800"
                          value={formData.baseSalary === 0 ? "" : formData.baseSalary} 
                          onChange={e => setFormData({...formData, baseSalary: e.target.value === "" ? 0 : Number(e.target.value)})} 
                        />
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">{country === "Japan" ? "¥" : "K"}</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Effective Date</Label>
                      <Input 
                        type="month" 
                        required
                        className="h-11 font-bold text-sm dark:bg-slate-800"
                        value={formData.effectiveMonth}
                        onChange={e => setFormData({...formData, effectiveMonth: e.target.value})}
                      />
                    </div>
                  </div>

                  {showHistory && formData.salaryHistory.length > 0 && (
                    <div className="mt-4 space-y-2 animate-in slide-in-from-top-2">
                      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
                        <Table>
                          <TableBody>
                            {formData.salaryHistory.map((h, i) => (
                              <TableRow key={i} className="text-[11px] border-slate-100 dark:border-slate-700">
                                <TableCell className="font-bold text-slate-500 dark:text-slate-400">{h.effectiveMonth}</TableCell>
                                <TableCell className="text-right font-black text-slate-900 dark:text-slate-100">{h.amount.toLocaleString()} {formData.salaryCurrency || currency}</TableCell>
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
                    <Label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Annual Leave Balance</Label>
                    <Input 
                      type="number" 
                      className="h-11 font-bold dark:bg-slate-800"
                      value={formData.totalPaidLeave === 0 ? "" : formData.totalPaidLeave} 
                      onChange={e => setFormData({...formData, totalPaidLeave: e.target.value === "" ? 0 : Number(e.target.value)})} 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="hireDate" className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Joining Date</Label>
                    <Input id="hireDate" type="date" required value={formData.hireDate} onChange={e => setFormData({...formData, hireDate: e.target.value})} className="h-11 font-bold dark:bg-slate-800" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email" className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Official Email</Label>
                  <Input id="email" type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="h-11 dark:bg-slate-800" />
                </div>

                <DialogFooter className="pt-4">
                  <Button type="submit" className="w-full h-12 text-sm font-black shadow-lg">
                    {editingId ? "SAVE CHANGES" : "PROVISION EMPLOYEE"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Card className="border-none shadow-sm overflow-hidden bg-white dark:bg-slate-900/50">
          <CardHeader className="p-4 border-b dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" size={16} />
              <Input placeholder="Search records..." className="pl-9 h-9 text-sm bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
            </div>
          </CardHeader>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/50 dark:bg-slate-900/30 hover:bg-slate-50/50 dark:hover:bg-slate-900/30">
                  <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">ID</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Full Name</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Department</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Salary Profile</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Leave Balance</TableHead>
                  <TableHead className="text-right text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-12 text-sm font-medium text-slate-400 dark:text-slate-500">Fetching workforce data...</TableCell></TableRow>
                ) : filteredEmployees.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-12 text-sm font-medium text-slate-400 dark:text-slate-500 italic">No matching records found.</TableCell></TableRow>
                ) : filteredEmployees.map((emp) => {
                  const used = calculateUsedLeave(emp.id);
                  const rem = Math.max(0, (emp.totalPaidLeave || 0) - used);
                  return (
                    <TableRow key={emp.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors border-slate-100 dark:border-slate-800">
                      <TableCell className="font-mono text-sm text-slate-500 dark:text-slate-400">{emp.employeeNumber}</TableCell>
                      <TableCell className="font-bold text-slate-900 dark:text-slate-100 text-sm">{emp.fullName}</TableCell>
                      <TableCell className="text-sm font-medium text-slate-600 dark:text-slate-400">{emp.department}</TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-black text-slate-900 dark:text-slate-100 text-sm">{(emp.baseSalary || 0).toLocaleString()} <span className="text-sm font-bold text-slate-400 dark:text-slate-500 uppercase">{emp.salaryCurrency || currency}</span></span>
                          {emp.salaryHistory && emp.salaryHistory.length > 1 && (
                            <span className="text-sm flex items-center gap-1 font-bold text-primary uppercase tracking-tighter"><History size={14} /> {emp.salaryHistory.length} Cycles</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-black text-indigo-600 dark:text-indigo-400 text-sm">{rem} / {emp.totalPaidLeave || 0} <span className="text-sm font-bold uppercase text-slate-400 dark:text-slate-500">Available</span></span>
                          <span className="text-sm font-bold text-slate-400 dark:text-slate-500 uppercase tracking-tighter">Resets Jan 1st</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right space-x-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(emp)} className="h-8 w-8 hover:bg-slate-100 dark:hover:bg-slate-800"><Pencil size={14} className="text-slate-600 dark:text-slate-400" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(emp.id)} className="h-8 w-8 hover:bg-red-50 dark:hover:bg-red-950 text-red-400"><Trash2 size={14} /></Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </Card>
      </main>
    </div>
  );
}
