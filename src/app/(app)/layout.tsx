"use client";

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
import { Logo } from "@/components/logo";
import { UserNav } from "@/components/user-nav";
import { Separator } from "@/components/ui/separator";

const navItems = [
  { href: "/dashboard", icon: Home, label: "Dashboard" },
  { href: "/planner", icon: GanttChartSquare, label: "Planner" },
  { href: "/demand", icon: Truck, label: "Demand" },
  { href: "/inventory", icon: Warehouse, label: "Inventory" },
  { href: "/execution", icon: LineChart, label: "Execution" },
  { href: "/downtime", icon: Wrench, label: "Downtime" },
];

const adminNavItems = [
  { href: "/admin/pieces", icon: Package, label: "Pieces" },
  { href: "/admin/molds", icon: Factory, label: "Molds" },
  { href: "/admin/machines", icon: Cog, label: "Machines" },
  { href: "/admin/users", icon: Users, label: "Users" },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
          <Link href="/dashboard" className="flex items-center gap-2">
            <Logo className="w-6 h-6" />
            <span className="font-headline font-semibold text-lg">ForgeFlow</span>
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
            <SidebarGroupLabel>Administration</SidebarGroupLabel>
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
