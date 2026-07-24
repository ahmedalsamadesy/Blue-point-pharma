"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Wallet, TrendingUp, TrendingDown, Truck } from "lucide-react"

interface StatsCardsProps {
  income: number;
  expenses: number;
  profit: number;
  debt?: number;
}

export function StatsCards({ income, expenses, profit, debt = 0 }: StatsCardsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4" dir="rtl">
      <StatCard 
        label="إجمالي الإيرادات" 
        value={income} 
        icon={TrendingUp} 
        color="emerald" 
        tag="بيانات حية" 
      />
      <StatCard 
        label="إجمالي المصروفات" 
        value={expenses} 
        icon={TrendingDown} 
        color="rose" 
        tag="بيانات حية" 
      />
      <StatCard 
        label="مديونية الموردين" 
        value={debt} 
        icon={Truck} 
        color="amber" 
        tag="تنبيه ديون" 
      />
      <StatCard 
        label="صافي الربح الفعلي" 
        value={profit} 
        icon={Wallet} 
        color="primary" 
        tag="صافي الربح" 
        isHighlight
      />
    </div>
  )
}

function StatCard({ label, value, icon: Icon, color, tag, isHighlight = false }: any) {
  const colorStyles: any = {
    emerald: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
    rose: "text-rose-500 bg-rose-500/10 border-rose-500/20",
    amber: "text-amber-500 bg-amber-500/10 border-amber-500/20",
    primary: "text-primary bg-primary/10 border-primary/20",
  }

  return (
    <Card className={`group relative overflow-hidden transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl rounded-[2rem] border ${isHighlight ? 'bg-primary text-primary-foreground border-none' : 'glass-card glow-primary'}`}>
      {/* تأثير لمعان خلفي */}
      <div className={`absolute -right-4 -bottom-4 w-24 h-24 blur-3xl opacity-20 transition-opacity group-hover:opacity-40 ${isHighlight ? 'bg-white' : 'bg-primary'}`} />
      
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className={`h-12 w-12 rounded-2xl flex items-center justify-center transition-transform duration-500 group-hover:rotate-12 ${isHighlight ? 'bg-white/20 border border-white/30' : colorStyles[color]}`}>
            <Icon className="h-6 w-6" />
          </div>
          <div className={`text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full ${isHighlight ? 'bg-white/20' : 'bg-muted/50 text-muted-foreground'}`}>
            {tag}
          </div>
        </div>
        
        <div className="space-y-1">
          <p className={`text-[11px] font-bold uppercase tracking-wider ${isHighlight ? 'opacity-80' : 'text-muted-foreground'}`}>
            {label}
          </p>
          <div className="flex items-baseline gap-2">
            <h3 className={`text-3xl font-black font-english tabular-nums ${isHighlight ? 'text-white' : 'text-foreground'}`}>
              {value.toLocaleString()}
            </h3>
            <span className={`text-xs font-bold ${isHighlight ? 'opacity-70' : 'text-muted-foreground'}`}>ج.م</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}