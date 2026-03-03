
"use client";

import React, { useState, useEffect } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { db } from "@/lib/firebase";
import { collection, addDoc, getDocs, query, where, deleteDoc, doc, updateDoc } from "firebase/firestore";
import { useCountry } from "@/context/CountryContext";
import { Button } from "@/components/ui/button";
import { Plus, Pencil, Trash2, Search, UserCircle } from "lucide-react";
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
  employeeCode: string;
  name: string;
  department: string;
  baseSalary: number;
  country: string;
}

export default function EmployeesPage() {
  const { country } = useCountry();
  const { toast } = useToast();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    name: "",
    employeeCode: "",
    department: "",
    baseSalary: 0
  });

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, "employees"), where("country", "==", country));
      const querySnapshot = await getDocs(q);
      const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Employee[];
      setEmployees(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, [country]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await updateDoc(doc(db, "employees", editingId), { ...formData, country });
        toast({ title: "Success", description: "Employee updated successfully." });
      } else {
        await addDoc(collection(db, "employees"), { ...formData, country });
        toast({ title: "Success", description: "Employee added successfully." });
      }
      setIsModalOpen(false);
      setEditingId(null);
      setFormData({ name: "", employeeCode: "", department: "", baseSalary: 0 });
      fetchEmployees();
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Failed to save employee." });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this employee?")) return;
    try {
      await deleteDoc(doc(db, "employees", id));
      toast({ title: "Deleted", description: "Employee removed from database." });
      fetchEmployees();
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Delete failed." });
    }
  };

  const openEdit = (emp: Employee) => {
    setEditingId(emp.id);
    setFormData({
      name: emp.name,
      employeeCode: emp.employeeCode,
      department: emp.department,
      baseSalary: emp.baseSalary
    });
    setIsModalOpen(true);
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
          <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => {
                setEditingId(null);
                setFormData({ name: "", employeeCode: "", department: "", baseSalary: 0 });
              }} className="gap-2 bg-accent hover:bg-accent/90 shadow-lg w-full md:w-auto">
                <Plus size={18} /> Add Employee
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>{editingId ? "Edit Employee" : "Add New Employee"}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input id="name" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="code">Employee Code</Label>
                  <Input id="code" required value={formData.employeeCode} onChange={e => setFormData({...formData, employeeCode: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dept">Department</Label>
                  <Input id="dept" required value={formData.department} onChange={e => setFormData({...formData, department: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="salary">Base Salary ({country === "Japan" ? "JPY" : "MMK"})</Label>
                  <Input id="salary" type="number" required value={formData.baseSalary} onChange={e => setFormData({...formData, baseSalary: Number(e.target.value)})} />
                </div>
                <DialogFooter>
                  <Button type="submit" className="w-full">{editingId ? "Update" : "Save"}</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
          <div className="p-4 border-b flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
              <Input placeholder="Search employees..." className="pl-10" />
            </div>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead>Code</TableHead>
                  <TableHead>Employee</TableHead>
                  <TableHead className="hidden sm:table-cell">Department</TableHead>
                  <TableHead>Base Salary</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-8">Loading employees...</TableCell></TableRow>
                ) : employees.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No employees found for this region.</TableCell></TableRow>
                ) : (
                  employees.map((emp) => (
                    <TableRow key={emp.id} className="hover:bg-muted/20">
                      <TableCell className="font-mono text-xs font-semibold">{emp.employeeCode}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-accent/10 flex items-center justify-center text-accent hidden sm:flex">
                            <UserCircle size={20} />
                          </div>
                          <span className="font-medium">{emp.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">{emp.department}</TableCell>
                      <TableCell>{emp.baseSalary.toLocaleString()}</TableCell>
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
