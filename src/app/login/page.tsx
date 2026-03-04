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
import { LogIn, Globe } from "lucide-react";

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
    <div className="min-h-screen flex items-center justify-center bg-muted/50 p-4">
      <Card className="w-full max-w-md shadow-2xl border-t-8 border-t-primary">
        <CardHeader className="space-y-2 text-center">
          <div className="flex justify-center mb-2">
            <div className="p-4 bg-primary/10 rounded-full">
              <Globe className="w-12 h-12 text-primary stroke-[2.5px]" />
            </div>
          </div>
          <CardTitle className="text-3xl font-black tracking-tighter text-primary">GlobalPay</CardTitle>
          <CardDescription className="font-medium">International Payroll Management System</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email">Username / Email</Label>
              <Input
                id="email"
                placeholder="e.g. globalpay"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-12 border-primary/20 focus-visible:ring-primary"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-12 border-primary/20 focus-visible:ring-primary"
              />
            </div>
            <Button type="submit" className="w-full h-12 gap-2 text-lg font-bold shadow-lg shadow-primary/25" disabled={isLoading}>
              {isLoading ? "Signing in..." : <><LogIn size={20} /> Access Dashboard</>}
            </Button>
          </form>
          <div className="mt-8 pt-6 border-t text-center space-y-2">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Authorized Access Only</p>
            <p className="text-[10px] text-muted-foreground/60 italic">Please contact GlobalPay Admin to register your company.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
