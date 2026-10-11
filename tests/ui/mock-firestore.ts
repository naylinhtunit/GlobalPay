import { useEffect, useMemo, useState } from "react";
let serial = 1;
const subscribers = new Set<() => void>();
const initial = {
  employees: [{ id: "e1", companyId: "qa-company", country: "Japan", fullName: "Test Employee", employeeNumber: "3095", baseSalary: 241200, hireDate: "2020-01-01", totalPaidLeave: 12 }],
  payrollRecords: [{ id: "p1", companyId: "qa-company", country: "Japan", employeeId: "e1", month: "2026-10", payPeriodStartDate: "2026-10-01", paidLeaveDays: 2 }],
  companyCalendars: [{ id: "qa-company_Japan_2026-10-12", companyId: "qa-company", country: "Japan", date: "2026-10-12", title: "Company holiday", isWorkday: false }],
};
export const store: Record<string, any[]> = JSON.parse(localStorage.getItem("globalpay_qa_store") || JSON.stringify(initial));
const publish = () => { localStorage.setItem("globalpay_qa_store", JSON.stringify(store)); subscribers.forEach(callback => callback()); };
export const useFirestore = () => ({ fixture: true });
const user = { uid: "qa-company", email: "test@example.invalid" };
export const useUser = () => ({ user, isUserLoading: false });
export const useAuth = () => null;
export const useMemoFirebase = useMemo;
export function useCollection(target: any) {
  const [, changed] = useState(0);
  useEffect(() => { const callback = () => changed(value => value + 1); subscribers.add(callback); return () => { subscribers.delete(callback); }; }, []);
  const data = target ? (store[target.path] || []).filter(row => (target.filters || []).every((condition: any) => row[condition.field] === condition.value)) : null;
  return { data, isLoading: false, error: null };
}
export const collection = (_database: any, path: string) => ({ path });
export const where = (field: string, _operator: string, value: unknown) => ({ field, value });
export const query = (source: any, ...filters: any[]) => ({ ...source, filters });
export const doc = (source: any, name?: string, id?: string) => ({ path: source.path || name, id: source.path ? name || `qa-${serial++}` : id });
export const serverTimestamp = () => ({ seconds: Date.now() / 1000 });
function save(reference: any, payload: any, merge = false) {
  const list = store[reference.path] ||= [];
  const existing = list.findIndex(row => row.id === reference.id);
  const row = merge && existing >= 0 ? structuredClone(list[existing]) : { id: reference.id };
  for (const [key, value] of Object.entries(payload)) {
    const parts = key.split(".");
    if (parts.length === 2) { row[parts[0]] ||= {}; row[parts[0]][parts[1]] = value; } else row[key] = value;
  }
  if (existing >= 0) list[existing] = row; else list.push(row);
}
export async function setDoc(reference: any, payload: any, options: any) { save(reference, payload, options?.merge); publish(); }
export async function deleteDoc(reference: any) { store[reference.path] = (store[reference.path] || []).filter(row => row.id !== reference.id); publish(); }
export function writeBatch() {
  const operations: (() => void)[] = [];
  return { set: (reference: any, payload: any) => operations.push(() => save(reference, payload)), update: (reference: any, payload: any) => operations.push(() => save(reference, payload, true)), delete: (reference: any) => operations.push(() => { store[reference.path] = store[reference.path].filter(row => row.id !== reference.id); }), commit: async () => { operations.forEach(operation => operation()); publish(); } };
}
export async function runTransaction(_database: any, callback: any) {
  await callback({ get: async (reference: any) => ({ exists: () => true, data: () => store[reference.path].find(row => row.id === reference.id) }), update: (reference: any, payload: any) => save(reference, payload, true) });
  publish();
}
