
"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { initiateEmailSignIn, useAuth, useUser } from "@/firebase";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const auth = useAuth();
  const { user, isUserLoading } = useUser();
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  useEffect(() => {
    if (!isUserLoading && user) {
      router.push("/dashboard");
    }
  }, [user, isUserLoading, router]);

  const handleLogin = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoggingIn(true);
    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    initiateEmailSignIn(auth, email, password);
    // The useEffect will handle the redirect on successful login.
    // We'll set a timeout to handle login errors.
    setTimeout(() => {
        setIsLoggingIn(false);
        // We can add more specific error handling here if needed,
        // for now, we just stop the loading indicator.
    }, 5000); // 5 second timeout
  };

  if (isUserLoading || user) {
      return (
          <div className="flex h-screen w-full items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin" />
          </div>
      )
  }

  return (
    <div className="w-full h-screen lg:grid lg:min-h-[600px] lg:grid-cols-2 xl:min-h-[800px]">
      <div className="flex items-center justify-center py-12">
        <div className="mx-auto grid w-[350px] gap-6">
          <div className="grid gap-4 text-center">
             <div className="flex justify-center items-center gap-2">
                <Image src="/logo.png" width={180} height={40} alt="ForgeFlow Logo" />
            </div>
            <p className="text-balance text-muted-foreground">
              Introduce tu email para acceder a tu cuenta
            </p>
          </div>
          <form onSubmit={handleLogin} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="m@example.com"
                required
                defaultValue="planner@forgeflow.com"
              />
            </div>
            <div className="grid gap-2">
              <div className="flex items-center">
                <Label htmlFor="password">Contraseña</Label>
                <Link
                  href="#"
                  className="ml-auto inline-block text-sm underline"
                >
                  ¿Has olvidado tu contraseña?
                </Link>
              </div>
              <Input id="password" name="password" type="password" required defaultValue="password" />
            </div>
            <Button type="submit" className="w-full" disabled={isLoggingIn}>
              {isLoggingIn ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {isLoggingIn ? "Accediendo..." : "Acceder"}
            </Button>
          </form>
        </div>
      </div>
      <div className="hidden bg-muted lg:block">
        <Image
          src="/login-background.png"
          alt="Factory"
          width="1920"
          height="1080"
          data-ai-hint="factory"
          className="h-full w-full object-cover dark:brightness-[0.2] dark:grayscale"
        />
      </div>
    </div>
  );
}
