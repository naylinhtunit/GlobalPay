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
import { deleteDocumentNonBlocking } from "@/firebase/non-blocking-updates";

interface Employee {
  id: string;
  employeeNumber: string;
  firstName: string;
  lastName: string;
  department: string;
  jobTitle: string;
  email: string;
  country: string;
  hireDate: string;
}

export default function EmployeesPage() {
  const { country } = useCountry();
  const { firestore } = useFirestore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    employeeNumber: "",
    department: "",
    jobTitle: "",
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
      firstName: "", 
      lastName: "", 
      employeeNumber: "", 
      department: "", 
      jobTitle: "", 
      email: "",
      hireDate: new Date().toISOString().split('T')[0]
    });
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

    // Optimistic UI: Close and reset immediately
    setIsModalOpen(false);
    resetForm();

    if (editingId) {
      const docRef = doc(firestore, "employees", editingId);
      updateDoc(docRef, dataToSave)
        .catch(async (error) => {
          errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: docRef.path,
            operation: 'update',
            requestResourceData: dataToSave
          }));
        });
    } else {
      const colRef = collection(firestore, "employees");
      addDoc(colRef, { 
        ...dataToSave, 
        id: crypto.randomUUID(), // Ensuring an ID is present if rules require it
        createdAt: serverTimestamp() 
      })
        .catch(async (error) => {
          errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: colRef.path,
            operation: 'create',
            requestResourceData: dataToSave
          }));
        });
    }
  };

  const handleDelete = (id: string) => {
    if (!firestore || !confirm("Are you sure you want to delete this employee?")) return;
    const docRef = doc(firestore, "employees", id);
    deleteDocumentNonBlocking(docRef);
  };

  const openEdit = (emp: Employee) => {
    setEditingId(emp.id);
    setFormData({
      firstName: emp.firstName,
      lastName: emp.lastName,
      employeeNumber: emp.employeeNumber,
      department: emp.department,
      jobTitle: emp.jobTitle || "",
      email: emp.email || "",
      hireDate: emp.hireDate ? emp.hireDate.split('T')[0] : new Date().toISOString().split('T')[0]
    });
    setIsModalOpen(true);
  };

  const filteredEmployees = (employees || []).filter(emp => 
    `${emp.firstName} ${emp.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.employeeNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
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
            <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingId ? "Edit Employee" : "Add New Employee"}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name</Label>
                    <Input id="firstName" required value={formData.firstName} onChange={e => setFormData({...formData, firstName: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input id="lastName" required value={formData.lastName} onChange={e => setFormData({...formData, lastName: e.target.value})} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="code">Employee Number</Label>
                  <Input id="code" required value={formData.employeeNumber} onChange={e => setFormData({...formData, employeeNumber: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="dept">Department</Label>
                    <Input id="dept" required value={formData.department} onChange={e => setFormData({...formData, department: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="job">Job Title</Label>
                    <Input id="job" value={formData.jobTitle} onChange={e => setFormData({...formData, jobTitle: e.target.value})} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="hireDate">Hire Date</Label>
                  <Input id="hireDate" type="date" required value={formData.hireDate} onChange={e => setFormData({...formData, hireDate: e.target.value})} />
                </div>
                <DialogFooter>
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
                  <TableHead>Number</TableHead>
                  <TableHead>Employee</TableHead>
                  <TableHead className="hidden sm:table-cell">Department</TableHead>
                  <TableHead className="hidden md:table-cell">Job Title</TableHead>
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
                          <span className="font-medium">{emp.firstName} {emp.lastName}</span>
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">{emp.department}</TableCell>
                      <TableCell className="hidden md:table-cell">{emp.jobTitle}</TableCell>
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
