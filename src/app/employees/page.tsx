"use client";

import React, { useState, useEffect } from "react";
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
  serverTimestamp 
} from "firebase/firestore";
import { useCountry } from "@/context/CountryContext";
import { Button } from "@/components/ui/button";
import { Plus, Pencil, Trash2, Search, UserCircle, Briefcase, Mail, Calendar, Hash } from "lucide-react";
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
  companyId: string;
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
  const { user } = useUser();
  const firestore = useFirestore();
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
    hireDate: ""
  });

  useEffect(() => {
    if (!formData.hireDate && isModalOpen && !editingId) {
      setFormData(prev => ({
        ...prev,
        hireDate: new Date().toISOString().split('T')[0]
      }));
    }
  }, [isModalOpen, editingId]);

  const employeesQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(
      collection(firestore, "employees"), 
      where("country", "==", country),
      where("companyId", "==", user.uid)
    );
  }, [firestore, country, user]);

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
    if (!firestore || !user) return;

    const dataToSave = {
      ...formData,
      baseSalary: Number(formData.baseSalary),
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
      addDocumentNonBlocking(colRef, { 
        ...dataToSave, 
        createdAt: serverTimestamp() 
      });
      toast({ title: "Employee added", description: `${formData.fullName} has been added successfully.` });
    }
    setIsModalOpen(false);
    resetForm();
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
      fullName: emp.fullName || "",
      employeeNumber: emp.employeeNumber || "",
      department: emp.department || "",
      baseSalary: emp.baseSalary || 0,
      email: emp.email || "",
      hireDate: emp.hireDate || new Date().toISOString().split('T')[0]
    });
    setIsModalOpen(true);
  };

  const filteredEmployees = (employees || []).filter(emp => 
    (emp.fullName || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (emp.employeeNumber || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

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
              <Button onClick={() => resetForm()} className="gap-2 bg-primary shadow-lg w-full md:w-auto">
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
                  <Input id="fullName" required value={formData.fullName} onChange={e => setFormData({...formData, fullName: e.target.value})} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="code" className="flex items-center gap-2">
                      <Hash size={14} className="text-muted-foreground" /> Code
                    </Label>
                    <Input id="code" required value={formData.employeeNumber} onChange={e => setFormData({...formData, employeeNumber: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dept" className="flex items-center gap-2">
                      <Briefcase size={14} className="text-muted-foreground" /> Department
                    </Label>
                    <Input id="dept" required value={formData.department} onChange={e => setFormData({...formData, department: e.target.value})} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="salary">Base Salary ({currency})</Label>
                  <Input 
                    id="salary" 
                    type="number" 
                    required 
                    value={formData.baseSalary} 
                    onChange={e => setFormData({...formData, baseSalary: Number(e.target.value)})} 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email" className="flex items-center gap-2">
                    <Mail size={14} className="text-muted-foreground" /> Email
                  </Label>
                  <Input id="email" type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="hireDate" className="flex items-center gap-2">
                    <Calendar size={14} className="text-muted-foreground" /> Hire Date
                  </Label>
                  <Input id="hireDate" type="date" required value={formData.hireDate} onChange={e => setFormData({...formData, hireDate: e.target.value})} />
                </div>
                <DialogFooter className="pt-4">
                  <Button type="submit" className="w-full">{editingId ? "Update" : "Save"}</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
          <div className="p-4 border-b">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
              <Input placeholder="Search employees..." className="pl-10" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
            </div>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Salary</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-8">Loading...</TableCell></TableRow>
                ) : filteredEmployees.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No employees found.</TableCell></TableRow>
                ) : filteredEmployees.map((emp) => (
                  <TableRow key={emp.id}>
                    <TableCell className="font-mono text-xs">{emp.employeeNumber}</TableCell>
                    <TableCell className="font-medium">{emp.fullName}</TableCell>
                    <TableCell>{emp.department}</TableCell>
                    <TableCell>{emp.baseSalary?.toLocaleString() || 0} {currency}</TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(emp)}><Pencil size={14} /></Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(emp.id)}><Trash2 size={14} className="text-destructive" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </main>
    </div>
  );
}
