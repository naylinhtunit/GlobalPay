
"use client";

import React, { useState } from "react";
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
  deleteDoc, 
  doc, 
  updateDoc, 
  serverTimestamp 
} from "firebase/firestore";
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
  const { firestore } = useFirestore();
  const { toast } = useToast();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  
  const [formData, setFormData] = useState({
    name: "",
    employeeCode: "",
    department: "",
    baseSalary: 0
  });

  const employeesQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, "employees"), where("country", "==", country));
  }, [firestore, country]);

  const { data: employees, isLoading: loading } = useCollection<Employee>(employeesQuery);

  const resetForm = () => {
    setFormData({ name: "", employeeCode: "", department: "", baseSalary: 0 });
    setEditingId(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!firestore) return;

    const dataToSave = {
      ...formData,
      country,
      updatedAt: serverTimestamp()
    };

    if (editingId) {
      const docRef = doc(firestore, "employees", editingId);
      updateDoc(docRef, dataToSave)
        .then(() => {
          toast({ title: "Success", description: "Employee updated successfully." });
          setIsModalOpen(false);
          resetForm();
        })
        .catch(async (error) => {
          errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: docRef.path,
            operation: 'update',
            requestResourceData: dataToSave
          }));
          toast({ variant: "destructive", title: "Error", description: "Failed to update employee." });
        });
    } else {
      const colRef = collection(firestore, "employees");
      addDoc(colRef, { ...dataToSave, createdAt: serverTimestamp() })
        .then(() => {
          toast({ title: "Success", description: "Employee added successfully." });
          setIsModalOpen(false);
          resetForm();
        })
        .catch(async (error) => {
          errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: colRef.path,
            operation: 'create',
            requestResourceData: dataToSave
          }));
          toast({ variant: "destructive", title: "Error", description: "Failed to add employee." });
        });
    }
  };

  const handleDelete = (id: string) => {
    if (!firestore || !confirm("Are you sure you want to delete this employee?")) return;
    
    const docRef = doc(firestore, "employees", id);
    deleteDoc(docRef)
      .then(() => {
        toast({ title: "Deleted", description: "Employee removed from database." });
      })
      .catch(async (error) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: docRef.path,
          operation: 'delete'
        }));
        toast({ variant: "destructive", title: "Error", description: "Delete failed." });
      });
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

  const handleSalaryFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    if (e.target.value === "0") {
      e.target.select();
    }
  };

  const filteredEmployees = (employees || []).filter(emp => 
    emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.employeeCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.department.toLowerCase().includes(searchTerm.toLowerCase())
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
              <Button onClick={() => resetForm()} className="gap-2 bg-accent hover:bg-accent/90 shadow-lg w-full md:w-auto">
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
                  <Input 
                    id="salary" 
                    type="number" 
                    required 
                    value={formData.baseSalary} 
                    onFocus={handleSalaryFocus}
                    onChange={e => setFormData({...formData, baseSalary: e.target.value === "" ? 0 : Number(e.target.value)})} 
                  />
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
                  <TableHead>Base Salary</TableHead>
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
