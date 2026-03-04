"use client";

import React, { useState } from "react";
import { useAuth } from "@/firebase";
import { signInWithEmailAndPassword } from "firebase/auth";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { LogIn, Shield } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const auth = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    const loginEmail = email.includes("@") ? email : `${email}@globalpay.com`;

    try {
      await signInWithEmailAndPassword(auth, loginEmail, password);
      toast({ title: "Login Successful", description: "Welcome back to GlobalPay." });
      router.push("/");
    } catch (error: any) {
      console.error(error);
      toast({
        title: "Login Failed",
        description: "Invalid credentials. Please check your username and password.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <Card className="w-full max-w-md shadow-xl border-none">
        <CardHeader className="space-y-2 text-center pt-10">
          <div className="flex justify-center mb-4">
            <Shield className="w-16 h-16 text-primary" strokeWidth={1.5} />
          </div>
          <CardTitle className="text-4xl font-bold tracking-tight text-slate-900">GlobalPay</CardTitle>
          <CardDescription className="text-base text-slate-500">
            International Payroll Management System
          </CardDescription>
        </CardHeader>
        <CardContent className="px-8 pb-10">
          <form onSubmit={handleLogin} className="space-y-6 mt-6">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-semibold text-slate-700">Username / Email</Label>
              <Input
                id="email"
                placeholder="e.g. globalpay"
                className="h-12 bg-slate-50 border-slate-200"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" throws-error="false" className="text-sm font-semibold text-slate-700">Password</Label>
              <Input
                id="password"
                type="password"
                className="h-12 bg-slate-50 border-slate-200"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <Button type="submit" className="w-full h-12 text-base font-semibold gap-2 mt-4 transition-all hover:scale-[1.01]" disabled={isLoading}>
              {isLoading ? "Signing in..." : <><LogIn size={20} /> Sign In</>}
            </Button>
          </form>
          <div className="mt-10 pt-6 border-t border-slate-100 text-center">
            <p className="text-xs font-medium text-slate-400 tracking-wider uppercase">Authorized Access Only</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}