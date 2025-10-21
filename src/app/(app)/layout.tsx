

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
  PanelLeft,
  History,
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
  SidebarTrigger,
  useSidebar,
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
  { href: "/machines", icon: Factory, label: "Máquinas" },
  { href: "/pieces", icon: Package, label: "Piezas" },
  { href: "/clients", icon: Building, label: "Clientes" },
  { href: "/production", icon: LineChart, label: "Producción" },
  { href: "/machining", icon: Wrench, label: "Mecanizado" },
  { href: "/downtime", icon: Wrench, label: "Inactividad" },
  { href: "/quality", icon: ShieldCheck, label: "Calidad" },
  { href: "/scrap-history", icon: History, label: "Historial Scrap" },
];

const adminNavItems = [
  { href: "/admin/users", icon: Users, label: "Usuarios" },
  { href: "/admin/roles", icon: Shield, label: "Roles" },
];

function AppLayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const firestore = useFirestore();
  const { setOpenMobile } = useSidebar();

  const userProfileRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);

  const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userProfileRef);
  
  const rolesCollection = useMemoFirebase(() => firestore ? collection(firestore, 'roles') : null, [firestore]);
  const { data: roles, isLoading: isLoadingRoles } = useCollection<Role>(rolesCollection);

  const [visibleNavItems, setVisibleNavItems] = useState(allNavItems);
  const [isClientLoading, setIsClientLoading] = useState(true);

  useEffect(() => {
    // This effect runs only on the client, after initial render.
    // This helps avoid hydration errors by ensuring server and client match initially.
    const combinedLoading = isUserLoading || isProfileLoading || isLoadingRoles;
    setIsClientLoading(combinedLoading);

    if (!combinedLoading && !user) {
      router.push("/");
    }
  }, [user, isUserLoading, isProfileLoading, isLoadingRoles, router]);

  useEffect(() => {
    setOpenMobile(false);
  }, [pathname, setOpenMobile]);

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

   if (isClientLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }
  
  return (
      <>
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
        <div className="flex flex-col flex-1">
            <header className="sticky top-0 z-40 flex h-[57px] items-center gap-1 border-b bg-background px-4 xl:hidden">
                <SidebarTrigger>
                    <PanelLeft />
                </SidebarTrigger>
            </header>
            <SidebarInset>{children}</SidebarInset>
        </div>
      </>
  );
}


export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <AppLayoutContent>{children}</AppLayoutContent>
    </SidebarProvider>
  )
}
