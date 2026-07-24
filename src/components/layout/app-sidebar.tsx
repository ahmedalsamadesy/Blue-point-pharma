
"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  TrendingUp,
  ShoppingCart,
  ShoppingBag,
  Users,
  Truck,
  Landmark,
  UserRound,
  FileBarChart,
  Settings,
  ShieldCheck
} from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
} from "@/components/ui/sidebar"

const mainNav = [
  { name: "لوحة التحكم", icon: LayoutDashboard, href: "/dashboard" },
  { name: "المبيعات", icon: ShoppingCart, href: "/sales" },
  { name: "المشتريات", icon: ShoppingBag, href: "/purchases" },
  { name: "العملاء", icon: Users, href: "/customers" },
  { name: "الموردين", icon: Truck, href: "/suppliers" },
  { name: "الخزينة", icon: Landmark, href: "/treasury" },
  { name: "الموظفين", icon: UserRound, href: "/employees" },
  { name: "التقارير", icon: FileBarChart, href: "/reports" },
]

export function AppSidebar() {
  const pathname = usePathname()

  return (
    <Sidebar variant="sidebar" collapsible="icon" side="right" className="border-l bg-white">
      <SidebarHeader className="h-16 border-b flex items-center justify-center px-6">
        <div className="flex items-center gap-3 w-full justify-end group-data-[collapsible=icon]:justify-center">
          <div className="flex flex-col items-end group-data-[collapsible=icon]:hidden">
            <span className="font-headline text-lg font-bold text-slate-900 leading-none">BluePoint</span>
            <span className="text-[10px] font-bold text-primary uppercase tracking-tighter">Pharma Finance</span>
          </div>
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-white shadow-lg shadow-primary/20">
            <TrendingUp className="h-6 w-6" />
          </div>
        </div>
      </SidebarHeader>
      
      <SidebarContent className="px-4 py-6">
        <SidebarGroup>
          <SidebarGroupLabel className="px-2 text-[11px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-4 text-right">
            القائمة الرئيسية
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1">
              {mainNav.map((item) => (
                <SidebarMenuItem key={item.name}>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === item.href}
                    className={`h-11 px-3 rounded-xl transition-all duration-200 flex-row-reverse ${
                      pathname === item.href 
                      ? "bg-primary text-white shadow-md shadow-primary/20 hover:bg-primary hover:text-white" 
                      : "text-slate-600 hover:bg-slate-50 hover:text-primary"
                    }`}
                  >
                    <Link href={item.href} className="flex items-center gap-3 justify-end w-full">
                      <span className="font-semibold text-sm text-right">{item.name}</span>
                      <item.icon className={`h-5 w-5 ${pathname === item.href ? "text-white" : "text-slate-400 group-hover:text-primary"}`} />
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4 border-t bg-slate-50/50">
        <SidebarMenu className="gap-1">
          <SidebarMenuItem>
            <SidebarMenuButton asChild className="h-11 px-3 rounded-xl flex-row-reverse text-slate-600 hover:bg-slate-100">
              <Link href="/settings" className="flex items-center gap-3 justify-end w-full">
                <span className="font-semibold text-sm">الإعدادات</span>
                <Settings className="h-5 w-5 text-slate-400" />
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <div className="mt-4 p-4 bg-primary/5 rounded-2xl border border-primary/10 group-data-[collapsible=icon]:hidden">
            <div className="flex items-center gap-2 mb-2 justify-end">
              <span className="text-[10px] font-bold text-primary uppercase">نظام مالي آمن</span>
              <ShieldCheck className="h-3 w-3 text-primary" />
            </div>
            <p className="text-[10px] text-slate-500 text-right leading-relaxed">
              إدارة الحسابات المالية وفق معايير الحماية العالمية بسحابة Google.
            </p>
          </div>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
