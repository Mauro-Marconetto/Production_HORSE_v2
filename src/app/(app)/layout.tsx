

"use client";

import Image from "next/image";
import {
  Package,
  Home,
  GanttChartSquare,
  LineChart,
  Warehouse,
  Wrench,
  Users,
  Factory,
  Cog,
  Truck,
  ShieldCheck,
  CalendarDays,
  Building,
  Loader2,
  Shield,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { collection, doc } from 'firebase/firestore';

import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarInset,
} from "@/components/ui/sidebar";
import { UserNav } from "@/components/user-nav";
import { useUser, useDoc, useFirestore, useMemoFirebase, useCollection } from "@/firebase";
import { useEffect, useMemo, useState } from "react";
import type { UserProfile, Role } from "@/lib/types";

const allNavItems = [
  { href: "/dashboard", icon: Home, label: "Panel" },
  { href: "/planner", icon: GanttChartSquare, label: "Planificador" },
  { href: "/calendar", icon: CalendarDays, label: "Calendario" },
  { href: "/demand", icon: Truck, label: "Demanda" },
  { href: "/inventory", icon: Warehouse, label: "Inventario" },
  { href: "/machining", icon: Factory, label: "Mecanizado" },
  { href: "/production", icon: LineChart, label: "Producción" },
  { href: "/downtime", icon: Wrench, label: "Inactividad" },
  { href: "/quality", icon: ShieldCheck, label: "Calidad" },
];

const adminNavItems = [
  { href: "/admin/pieces", icon: Package, label: "Piezas" },
  { href: "/admin/machines", icon: Cog, label: "Máquinas" },
  { href: "/admin/clients", icon: Building, label: "Clientes" },
  { href: "/admin/users", icon: Users, label: "Usuarios" },
  { href: "/admin/roles", icon: Shield, label: "Roles" },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const firestore = useFirestore();

  const userProfileRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);

  const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userProfileRef);
  
  const rolesCollection = useMemoFirebase(() => firestore ? collection(firestore, 'roles') : null, [firestore]);
  const { data: roles, isLoading: isLoadingRoles } = useCollection<Role>(rolesCollection);

  const [visibleNavItems, setVisibleNavItems] = useState(allNavItems);

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push("/");
    }
  }, [user, isUserLoading, router]);

  const { isAdmin, userAllowedRoutes } = useMemo(() => {
    const isAdmin = userProfile?.role === 'Admin';
    if (isAdmin) {
      return { isAdmin: true, userAllowedRoutes: allNavItems.map(item => item.href) };
    }
    const userRole = roles?.find(r => r.name === userProfile?.role);
    const userAllowedRoutes = userRole?.allowedRoutes || [];
    return { isAdmin: false, userAllowedRoutes };
  }, [userProfile, roles]);

  useEffect(() => {
    if (isAdmin) {
      setVisibleNavItems(allNavItems);
    } else {
      const filteredNav = allNavItems.filter(item => userAllowedRoutes.includes(item.href));
      setVisibleNavItems(filteredNav);
    }
  }, [isAdmin, userAllowedRoutes]);

  const isLoading = isUserLoading || isProfileLoading || isLoadingRoles;

  if (isLoading || !user) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }
  
  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
          <Link href="/dashboard" className="flex items-center gap-2">
            <Image src="/logo.png" width={140} height={32} alt="ForgeFlow Logo" />
          </Link>
        </SidebarHeader>
        <SidebarContent>
          <SidebarMenu>
            {visibleNavItems.map((item) => (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton
                  asChild
                  isActive={pathname.startsWith(item.href)}
                  tooltip={item.label}
                >
                  <Link href={item.href}>
                    <item.icon />
                    <span>{item.label}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
          
          {isAdmin && (
            <SidebarGroup className="mt-auto">
                <SidebarGroupLabel>Administración</SidebarGroupLabel>
                <SidebarMenu>
                {adminNavItems.map((item) => (
                    <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                        asChild
                        isActive={pathname.startsWith(item.href)}
                        tooltip={item.label}
                    >
                        <Link href={item.href}>
                        <item.icon />
                        <span>{item.label}</span>
                        </Link>
                    </SidebarMenuButton>
                    </SidebarMenuItem>
                ))}
                </SidebarMenu>
            </SidebarGroup>
          )}

        </SidebarContent>
        <SidebarFooter>
          <UserNav />
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>{children}</SidebarInset>
    </SidebarProvider>
  );
}

    