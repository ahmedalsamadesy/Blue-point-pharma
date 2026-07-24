
"use client"

import { 
  Zap, 
  PlusCircle, 
  Receipt, 
  ShoppingBag, 
  HandCoins, 
  Banknote, 
  PackagePlus,
  LayoutGrid,
  Pill,
  Activity,
  Database,
  Boxes,
  ArrowRightLeft,
  FileBarChart,
  Target,
  ShieldCheck,
  History,
  Users,
  Truck
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface QuickActionsProps {
  onAction: (tabId: string) => void
  config?: string[]
}

const ALL_ACTIONS = [
  { id: "sales", label: "مبيعات", icon: Receipt, color: "text-emerald-500", bg: "bg-emerald-500/10" },
  { id: "expenses", label: "مصروف", icon: PlusCircle, color: "text-rose-500", bg: "bg-rose-500/10" },
  { id: "purchases", label: "مشتريات", icon: ShoppingBag, color: "text-blue-500", bg: "bg-blue-500/10" },
  { id: "customers", label: "تحصيل عميل", icon: Users, color: "text-teal-500", bg: "bg-teal-500/10" },
  { id: "suppliers", label: "سداد مورد", icon: Truck, color: "text-amber-500", bg: "bg-amber-500/10" },
  { id: "inventory", label: "إضافة صنف", icon: PackagePlus, color: "text-indigo-500", bg: "bg-indigo-500/10" },
  { id: "branch_transfers", label: "تبادل أدوية", icon: Boxes, color: "text-orange-500", bg: "bg-orange-500/10" },
  { id: "transfers", label: "تحويل نقدية", icon: ArrowRightLeft, color: "text-blue-600", bg: "bg-blue-600/10" },
  { id: "reports", label: "تقرير سريع", icon: FileBarChart, color: "text-purple-500", bg: "bg-purple-500/10" },
  { id: "goals", label: "هدف جديد", icon: Target, color: "text-rose-600", bg: "bg-rose-600/10" },
  { id: "closing", label: "حساب ختامي", icon: ShieldCheck, color: "text-emerald-600", bg: "bg-emerald-600/10" },
  { id: "audit", label: "سجل الرقابة", icon: History, color: "text-slate-600", bg: "bg-slate-600/10" },
]

export function QuickActions({ onAction, config }: QuickActionsProps) {
  const actions = ALL_ACTIONS.filter(a => !config || config.includes(a.id));

  if (actions.length === 0) return null;

  return (
    <div className="w-full bg-background/40 backdrop-blur-md border-b border-primary/5 py-1.5 px-4 overflow-x-auto scrollbar-hide print:hidden">
      <div className="max-w-[1600px] mx-auto flex items-center gap-2 md:gap-4 justify-start md:justify-center whitespace-nowrap">
        <div className="flex items-center gap-2 px-3 border-l border-primary/10 ml-2">
          <Zap className="h-3.5 w-3.5 text-primary animate-pulse fill-current" />
          <span className="text-[10px] font-black text-muted-foreground uppercase tracking-tighter">إجراءات سريعة</span>
        </div>
        
        {actions.map((action) => (
          <Button
            key={action.id}
            variant="ghost"
            size="sm"
            onClick={() => onAction(action.id)}
            className={cn(
              "h-8 gap-2 rounded-full px-4 hover:scale-105 transition-all duration-300 group",
              "hover:bg-primary/5 border border-transparent hover:border-primary/10"
            )}
          >
            <div className={cn("h-5 w-5 rounded-full flex items-center justify-center transition-colors", action.bg)}>
              <action.icon className={cn("h-3 w-3", action.color)} />
            </div>
            <span className="text-[11px] font-bold text-foreground/80 group-hover:text-primary transition-colors">
              {action.label}
            </span>
          </Button>
        ))}
      </div>
    </div>
  )
}
