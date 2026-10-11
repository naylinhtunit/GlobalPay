"use client";

import { collection, doc, query, serverTimestamp, setDoc, where } from "firebase/firestore";
import { useCollection, useFirestore, useMemoFirebase, useUser } from "@/firebase";
import { COMPANY_NAME_MAX_LENGTH, normalizeCompanyName } from "@/lib/company-profile";

export function useCompanyProfile() {
  const firestore = useFirestore();
  const { user } = useUser();
  // Like payroll settings: an isolated discriminator uses the existing deployed owner rules.
  // This is neither a payroll nor a calendar event and cannot appear in country queries.
  const profileQuery = useMemoFirebase(() => user && firestore ? query(collection(firestore, "payrollRecords"), where("companyId", "==", user.uid), where("country", "==", "CompanyProfile")) : null, [user, firestore]);
  const { data, isLoading, error } = useCollection(profileQuery);
  const profile = data?.find(row => row.companyId === user?.uid && row.id === `profile_${user?.uid}`);
  const isLoaded = Boolean(user && data !== null && !isLoading && !error && data.every(row => row.companyId === user.uid));
  const companyName = normalizeCompanyName(profile?.companyName);
  const saveCompanyName = async (value: string) => {
    const next = normalizeCompanyName(value);
    if (!next || next.length > COMPANY_NAME_MAX_LENGTH) throw new Error("Enter a company name between 1 and 120 characters.");
    if (!user || !firestore || !isLoaded) throw new Error("Sign in and check your connection before saving.");
    await setDoc(doc(firestore, "payrollRecords", `profile_${user.uid}`), {
      companyId: user.uid, country: "CompanyProfile", employeeId: "__settings__",
      recordType: "companyProfile", companyName: next, updatedAt: serverTimestamp(),
    }, { merge: true });
  };
  return { companyName, isLoaded, isLoading, error, saveCompanyName, accountId: user?.uid };
}
