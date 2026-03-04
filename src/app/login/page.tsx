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
    
    // Auto-append domain if not present for convenience
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
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-2">
            <Shield className="w-10 h-10 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold">GlobalPay</CardTitle>
          <CardDescription>International Payroll Management System</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Username / Email</Label>
              <Input
                id="email"
                placeholder="e.g. globalpay"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
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
              />
            </div>
            <Button type="submit" className="w-full gap-2" disabled={isLoading}>
              {isLoading ? "Signing in..." : <><LogIn size={18} /> Sign In</>}
            </Button>
          </form>
          <div className="mt-6 pt-4 border-t text-center">
            <p className="text-xs text-muted-foreground">Authorized Access Only</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}