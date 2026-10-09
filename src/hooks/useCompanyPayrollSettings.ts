"use client";

import { collection, doc, query, serverTimestamp, setDoc, where } from "firebase/firestore";
import { useCollection, useFirestore, useMemoFirebase, useUser } from "@/firebase";
import { DEFAULT_PAYROLL_POLICY, validatePolicy, type PayrollPolicy } from "@/lib/japan-payroll";

export function useCompanyPayrollSettings() {
  const firestore = useFirestore();
  const { user } = useUser();
  // Separate country discriminator keeps settings out of existing payroll/dashboard queries
  // while reusing the deployed company-owner security rules.
  const settingsQuery = useMemoFirebase(() => user && firestore ? query(collection(firestore, "payrollRecords"), where("companyId", "==", user.uid), where("country", "==", "JapanPayrollSettings")) : null, [user, firestore]);
  const { data, isLoading, error } = useCollection(settingsQuery);
  let policy = DEFAULT_PAYROLL_POLICY;
  const saved = data?.[0]?.policy as PayrollPolicy | undefined;
  try { if (saved && !validatePolicy(saved)) policy = saved; } catch { /* Ignore malformed settings. */ }

  const savePolicy = async (next: PayrollPolicy) => {
    const problem = validatePolicy(next);
    if (problem) throw new Error(problem);
    if (!user || !firestore) throw new Error("Sign in and check your connection before saving.");
    await setDoc(doc(firestore, "payrollRecords", `settings_Japan_${user.uid}`), {
      companyId: user.uid, country: "JapanPayrollSettings", employeeId: "__settings__",
      recordType: "payrollSettings", policy: next, updatedAt: serverTimestamp(),
    });
  };
  return { policy, isLoading, isLoaded: data !== null, error, savePolicy };
}
