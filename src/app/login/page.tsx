
"use client";

import React, { useEffect, useState } from "react";
import { useAuth, useUser } from "@/firebase";
import { browserLocalPersistence, setPersistence, signInWithEmailAndPassword } from "firebase/auth";
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
  const [errorMsg, setErrorMsg] = useState("");
  const auth = useAuth();
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    if (!isUserLoading && user) {
      router.replace("/dashboard");
    }
  }, [isUserLoading, router, user]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    const loginEmail = email.includes("@") ? email : `${email}@globalpay.com`;

    try {
      if (!auth) throw new Error("Authentication service is not ready");
      await setPersistence(auth, browserLocalPersistence);
      await signInWithEmailAndPassword(auth, loginEmail, password);
      toast({ title: "Login Successful", description: "Welcome back to GlobalPay." });
      router.replace("/dashboard");
    } catch (error: any) {
      console.error(error);
      const reason = error?.code || error?.message || "Unknown error";
      setErrorMsg(reason);
      toast({
        title: "Login Failed",
        description: `(${reason}) Please check your username and password.`,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Do not flash the login form while Firebase restores a persisted session.
  if (isUserLoading || user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Shield className="w-14 h-14 text-primary animate-pulse" strokeWidth={1.5} />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md shadow-2xl border-primary/10">
        <CardHeader className="space-y-2 text-center pt-10">
          <div className="flex justify-center mb-4">
            <Shield className="w-16 h-16 text-primary" strokeWidth={1.5} />
          </div>
          <CardTitle className="text-4xl font-bold tracking-tight text-foreground">GlobalPay</CardTitle>
          <CardDescription className="text-base text-muted-foreground">
            International Payroll Management System
          </CardDescription>
        </CardHeader>
        <CardContent className="px-8 pb-10">
          <form onSubmit={handleLogin} className="space-y-6 mt-6">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-semibold">Username / Email</Label>
              <Input
                id="email"
                placeholder="e.g. globalpay"
                className="h-12 bg-muted/50"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" throws-error="false" className="text-sm font-semibold">Password</Label>
              <Input
                id="password"
                type="password"
                className="h-12 bg-muted/50"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <Button type="submit" className="w-full h-12 text-base font-semibold gap-2 mt-4 transition-all hover:scale-[1.01]" disabled={isLoading}>
              {isLoading ? "Signing in..." : <><LogIn size={20} /> Sign In</>}
            </Button>
            {errorMsg && (
              <p className="mt-4 text-sm font-medium text-destructive text-center break-words">{errorMsg}</p>
            )}
          </form>
          <div className="mt-10 pt-6 border-t border-border text-center">
            <p className="text-xs font-medium text-muted-foreground tracking-wider uppercase">Authorized Access Only</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
