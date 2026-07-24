
"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingUp, ShoppingCart, ShoppingBag, Activity, ArrowUpRight, ArrowDownRight, Zap, ShieldCheck, Pulse } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

interface DailySummaryProps {
  stats: {
    income: number;
    expenses: number;
    salesCount: number;
    purchasesCount: number;
  }
}

export function DailySummary({ stats }: DailySummaryProps) {
  const netProfit = stats.income - stats.expenses;
  const isProfitable = netProfit >= 0;

  return (
    <Card className="border-none shadow-xl glass-card rounded-[2.5rem] overflow-hidden relative group transition-all duration-500 hover:shadow-2xl">
      <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-primary via-blue-400 to-primary opacity-60" />
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shadow-inner">
              <Zap className="h-5 w-5 fill-current animate-pulse" />
            </div>
            <div className="space-y-0.5">
              <CardTitle className="text-xl font-black text-foreground">النبض المالي لليوم</CardTitle>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Real-time Financial Status</p>
            </div>
          </div>
          <div className="px-4 py-1.5 rounded-full bg-primary/5 border border-primary/10 text-[11px] font-black text-primary uppercase tracking-wider shadow-sm">
            {new Date().toLocaleDateString('ar-EG', { day: 'numeric', month: 'long', year: 'numeric' })}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="grid grid-cols-2 md:grid-cols-12 gap-5">
          <div className="md:col-span-3 p-5 rounded-[2rem] bg-emerald-500/[0.04] border border-emerald-500/10 space-y-2 transition-transform hover:scale-[1.02]">
            <div className="flex items-center justify-between">
              <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600">
                <ShoppingCart className="h-4 w-4" />
              </div>
              <span className="text-[10px] font-black text-emerald-600/70 bg-emerald-500/5 px-2 py-0.5 rounded-lg">{stats.salesCount} عمليات</span>
            </div>
            <p className="text-[11px] font-black text-muted-foreground uppercase">إيرادات اليوم</p>
            <p className="text-2xl font-black font-english text-emerald-600">+{stats.income.toLocaleString()}</p>
          </div>

          <div className="md:col-span-3 p-5 rounded-[2rem] bg-rose-500/[0.04] border border-rose-500/10 space-y-2 transition-transform hover:scale-[1.02]">
            <div className="flex items-center justify-between">
              <div className="h-8 w-8 rounded-lg bg-rose-500/10 flex items-center justify-center text-rose-600">
                <ShoppingBag className="h-4 w-4" />
              </div>
              <span className="text-[10px] font-black text-rose-600/70 bg-rose-500/5 px-2 py-0.5 rounded-lg">{stats.purchasesCount} فواتير</span>
            </div>
            <p className="text-[11px] font-black text-muted-foreground uppercase">مدفوعات اليوم</p>
            <p className="text-2xl font-black font-english text-rose-600">-{stats.expenses.toLocaleString()}</p>
          </div>

          <div className={cn(
            "p-6 rounded-[2rem] border col-span-2 md:col-span-4 flex items-center justify-between transition-all duration-700 hover:shadow-lg",
            isProfitable ? "bg-primary/[0.04] border-primary/20" : "bg-amber-500/[0.04] border-amber-500/20"
          )}>
            <div className="space-y-1">
              <p className="text-[11px] font-black text-muted-foreground uppercase tracking-widest">صافي النتيجة (Live)</p>
              <div className="flex items-baseline gap-2">
                <p className={cn("text-4xl font-black font-english tabular-nums", isProfitable ? "text-primary" : "text-amber-600")}>
                  {netProfit.toLocaleString()}
                </p>
                <span className="text-xs font-bold text-muted-foreground">ج.م</span>
              </div>
            </div>
            <div className={cn(
              "h-16 w-16 rounded-[1.5rem] flex items-center justify-center shadow-2xl transition-transform group-hover:rotate-12",
              isProfitable ? "bg-primary text-primary-foreground shadow-primary/30" : "bg-amber-500 text-white shadow-amber-500/30"
            )}>
              {isProfitable ? <ArrowUpRight className="h-8 w-8" /> : <ArrowDownRight className="h-8 w-8" />}
            </div>
          </div>

          <div className="col-span-2 md:col-span-2 flex flex-col justify-center">
            <Button 
              variant="outline" 
              className="h-full rounded-[2rem] border-primary/20 bg-primary/5 hover:bg-primary text-primary hover:text-primary-foreground font-black gap-2 text-xs flex-col py-6 shadow-xl transition-all duration-500 active:scale-95 group/btn"
              onClick={() => {
                const closingTab = document.querySelector('[value="closing"]') as HTMLButtonElement;
                if (closingTab) closingTab.click();
              }}
            >
              <ShieldCheck className="h-7 w-7 group-hover/btn:animate-bounce" />
              إغلاق الدفاتر اليومية
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
