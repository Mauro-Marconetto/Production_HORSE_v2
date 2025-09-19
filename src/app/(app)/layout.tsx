

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
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

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
import { Button } from "@/components/ui/button";
import { UserNav } from "@/components/user-nav";
import { Separator } from "@/components/ui/separator";

const navItems = [
  { href: "/dashboard", icon: Home, label: "Panel" },
  { href: "/planner", icon: GanttChartSquare, label: "Planificador" },
  { href: "/calendar", icon: CalendarDays, label: "Calendario" },
  { href: "/demand", icon: Truck, label: "Demanda" },
  { href: "/inventory", icon: Warehouse, label: "Inventario" },
  { href: "/execution", icon: LineChart, label: "Ejecución" },
  { href: "/downtime", icon: Wrench, label: "Inactividad" },
  { href: "/quality", icon: ShieldCheck, label: "Calidad" },
];

const adminNavItems = [
  { href: "/admin/pieces", icon: Package, label: "Piezas" },
  { href: "/admin/molds", icon: Factory, label: "Moldes" },
  { href: "/admin/machines", icon: Cog, label: "Máquinas" },
  { href: "/admin/clients", icon: Building, label: "Clientes" },
  { href: "/admin/users", icon: Users, label: "Usuarios" },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

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
            {navItems.map((item) => (
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
        </SidebarContent>
        <SidebarFooter>
          <UserNav />
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>{children}</SidebarInset>
    </SidebarProvider>
  );
}
