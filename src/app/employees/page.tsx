"use client";

import React, { useState } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { 
  useFirestore, 
  useCollection, 
  useMemoFirebase,
  addDocumentNonBlocking,
  updateDocumentNonBlocking,
  deleteDocumentNonBlocking
} from "@/firebase";
import { 
  collection, 
  query, 
  where, 
  doc, 
  serverTimestamp 
} from "firebase/firestore";
import { useCountry } from "@/context/CountryContext";
import { Button } from "@/components/ui/button";
import { Plus, Pencil, Trash2, Search, UserCircle, Briefcase, Mail, Calendar, Hash, Banknote } from "lucide-react";
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
import { useToast } from "@/hooks/use-toast";

interface Employee {
  id: string;
  employeeNumber: string;
  fullName: string;
  department: string;
  email: string;
  baseSalary: number;
  country: string;
  hireDate: string;
}

export default function EmployeesPage() {
  const { country, currency } = useCountry();
  const { firestore } = useFirestore();
  const { toast } = useToast();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  
  const [formData, setFormData] = useState({
    fullName: "",
    employeeNumber: "",
    department: "",
    baseSalary: 0,
    email: "",
    hireDate: new Date().toISOString().split('T')[0]
  });

  const employeesQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, "employees"), where("country", "==", country));
  }, [firestore, country]);

  const { data: employees, isLoading: loading } = useCollection<Employee>(employeesQuery);

  const resetForm = () => {
    setFormData({ 
      fullName: "", 
      employeeNumber: "", 
      department: "", 
      baseSalary: 0, 
      email: "",
      hireDate: new Date().toISOString().split('T')[0]
    });
    setEditingId(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!firestore) {
      toast({ title: "Error", description: "Database not connected.", variant: "destructive" });
      return;
    }

    const dataToSave = {
      ...formData,
      baseSalary: Number(formData.baseSalary),
      country,
      updatedAt: serverTimestamp()
    };

    try {
      if (editingId) {
        const docRef = doc(firestore, "employees", editingId);
        updateDocumentNonBlocking(docRef, dataToSave);
        toast({ title: "Employee updated", description: `${formData.fullName} has been updated.` });
      } else {
        const colRef = collection(firestore, "employees");
        // Using a reliable ID generation or letting Firestore handle it
        const id = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2);
        addDocumentNonBlocking(colRef, { 
          ...dataToSave, 
          id, 
          createdAt: serverTimestamp() 
        });
        toast({ title: "Employee added", description: `${formData.fullName} has been added successfully.` });
      }
      setIsModalOpen(false);
      resetForm();
    } catch (err) {
      console.error("Submit error:", err);
      toast({ title: "Submission failed", description: "An unexpected error occurred.", variant: "destructive" });
    }
  };

  const handleDelete = (id: string) => {
    if (!firestore || !confirm("Are you sure you want to delete this employee?")) return;
    const docRef = doc(firestore, "employees", id);
    deleteDocumentNonBlocking(docRef);
    toast({ title: "Employee deleted", variant: "destructive" });
  };

  const openEdit = (emp: Employee) => {
    setEditingId(emp.id);
    setFormData({
      fullName: emp.fullName,
      employeeNumber: emp.employeeNumber,
      department: emp.department,
      baseSalary: emp.baseSalary,
      email: emp.email || "",
      hireDate: emp.hireDate ? emp.hireDate.split('T')[0] : new Date().toISOString().split('T')[0]
    });
    setIsModalOpen(true);
  };

  const filteredEmployees = (employees || []).filter(emp => 
    emp.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.employeeNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.department.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    if (e.target.value === "0") {
      e.target.select();
    }
  };

  return (
    <div className="md:pl-64 pt-16 md:pt-0 min-h-screen">
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
              <Button onClick={() => resetForm()} className="gap-2 bg-accent hover:bg-accent/90 shadow-lg w-full md:w-auto">
                <Plus size={18} /> Add Employee
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingId ? "Edit Employee" : "Add New Employee"}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName" className="flex items-center gap-2">
                    <UserCircle size={14} className="text-muted-foreground" /> Full Name
                  </Label>
                  <Input 
                    id="fullName" 
                    required 
                    placeholder="Enter full name"
                    value={formData.fullName} 
                    onChange={e => setFormData({...formData, fullName: e.target.value})} 
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="code" className="flex items-center gap-2">
                      <Hash size={14} className="text-muted-foreground" /> Employee Code
                    </Label>
                    <Input 
                      id="code" 
                      required 
                      placeholder="EMP-XXXX"
                      value={formData.employeeNumber} 
                      onChange={e => setFormData({...formData, employeeNumber: e.target.value})} 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dept" className="flex items-center gap-2">
                      <Briefcase size={14} className="text-muted-foreground" /> Department
                    </Label>
                    <Input 
                      id="dept" 
                      required 
                      placeholder="e.g. Sales"
                      value={formData.department} 
                      onChange={e => setFormData({...formData, department: e.target.value})} 
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="salary" className="flex items-center gap-2">
                    <Banknote size={14} className="text-muted-foreground" /> Base Salary ({currency})
                  </Label>
                  <Input 
                    id="salary" 
                    type="number"
                    required 
                    onFocus={handleFocus}
                    value={formData.baseSalary} 
                    onChange={e => setFormData({...formData, baseSalary: e.target.value === "" ? 0 : Number(e.target.value)})} 
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email" className="flex items-center gap-2">
                    <Mail size={14} className="text-muted-foreground" /> Email
                  </Label>
                  <Input 
                    id="email" 
                    type="email" 
                    placeholder="email@company.com"
                    value={formData.email} 
                    onChange={e => setFormData({...formData, email: e.target.value})} 
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="hireDate" className="flex items-center gap-2">
                    <Calendar size={14} className="text-muted-foreground" /> Hire Date
                  </Label>
                  <Input 
                    id="hireDate" 
                    type="date" 
                    required 
                    value={formData.hireDate} 
                    onChange={e => setFormData({...formData, hireDate: e.target.value})} 
                  />
                </div>

                <DialogFooter className="pt-4">
                  <Button type="submit" className="w-full">{editingId ? "Update Employee" : "Save Employee"}</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
          <div className="p-4 border-b flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
              <Input 
                placeholder="Search employees..." 
                className="pl-10" 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead>Code</TableHead>
                  <TableHead>Employee</TableHead>
                  <TableHead className="hidden sm:table-cell">Department</TableHead>
                  <TableHead className="hidden md:table-cell">Base Salary</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-8">Loading employees...</TableCell></TableRow>
                ) : filteredEmployees.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No employees found.</TableCell></TableRow>
                ) : (
                  filteredEmployees.map((emp) => (
                    <TableRow key={emp.id} className="hover:bg-muted/20">
                      <TableCell className="font-mono text-xs font-semibold">{emp.employeeNumber}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-accent/10 flex items-center justify-center text-accent hidden sm:flex">
                            <UserCircle size={20} />
                          </div>
                          <div className="flex flex-col">
                            <span className="font-medium">{emp.fullName}</span>
                            <span className="text-xs text-muted-foreground sm:hidden">{emp.department}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">{emp.department}</TableCell>
                      <TableCell className="hidden md:table-cell font-mono">
                        {emp.baseSalary?.toLocaleString()} {currency}
                      </TableCell>
                      <TableCell className="text-right space-x-1 md:space-x-2">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(emp)} className="h-8 w-8">
                          <Pencil size={14} className="text-blue-600" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(emp.id)} className="h-8 w-8">
                          <Trash2 size={14} className="text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </main>
    </div>
  );
}