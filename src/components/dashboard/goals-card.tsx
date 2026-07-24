
"use client"

import { useMemo } from "react"
import { useFirestore, useUser, useCollection, useMemoFirebase } from "@/firebase"
import { collection } from "firebase/firestore"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Target, Trophy, Clock, ChevronRight, Sparkles, TrendingUp } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

export function GoalsCard() {
  const firestore = useFirestore()
  const { user } = useUser()

  const goalsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null
    return collection(firestore, "users", user.uid, "goals")
  }, [firestore, user])
  
  const { data: goals, isLoading } = useCollection(goalsQuery)

  // منطق اختيار الهدف الأهم (الأقرب تاريخاً للانتهاء)
  const topGoal = useMemo(() => {
    if (!goals) return null
    return goals
      .filter(g => g.status === 'active')
      .sort((a, b) => new Date(a.endDate).getTime() - new Date(b.endDate).getTime())[0]
  }, [goals])

  if (isLoading) return (
    <Card className="border-none shadow-xl glass-card rounded-[2.5rem] h-[220px] animate-pulse bg-muted/20" />
  )
  
  if (!topGoal) return null

  const progress = Math.min(Math.round(((topGoal.currentValue || 0) / topGoal.targetValue) * 100), 100)
  
  const getColorClass = (color: string) => {
    switch (color) {
      case 'emerald': return 'from-emerald-500 to-teal-400';
      case 'amber': return 'from-amber-500 to-orange-400';
      case 'rose': return 'from-rose-500 to-pink-400';
      default: return 'from-primary to-blue-400';
    }
  }

  const getBgLight = (color: string) => {
    switch (color) {
      case 'emerald': return 'bg-emerald-500/10 text-emerald-600';
      case 'amber': return 'bg-amber-500/10 text-amber-600';
      case 'rose': return 'bg-rose-500/10 text-rose-600';
      default: return 'bg-primary/10 text-primary';
    }
  }

  return (
    <Card className="border-none shadow-2xl glass-card rounded-[2.5rem] overflow-hidden relative group transition-all hover:scale-[1.01]">
      {/* سقف البطاقة الملون */}
      <div className={cn("absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r", getColorClass(topGoal.color))} />
      
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn("h-12 w-12 rounded-2xl flex items-center justify-center text-2xl shadow-inner border border-white/10", getBgLight(topGoal.color))}>
              {topGoal.emoji || "🎯"}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-lg font-black text-foreground">الهدف القادم</CardTitle>
                <Badge variant="outline" className="text-[9px] font-bold border-primary/20 bg-primary/5 text-primary rounded-lg h-4 px-1.5">أولوية</Badge>
              </div>
              <CardDescription className="text-[10px] font-bold">المستهدف المحاسبي النشط</CardDescription>
            </div>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            className="rounded-full hover:bg-primary/10 h-8 w-8"
            onClick={() => window.dispatchEvent(new CustomEvent('switch-dashboard-tab', { detail: 'goals' }))}
          >
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="pt-0 space-y-6">
        <div className="space-y-3">
          <div className="flex justify-between items-end px-1">
            <div className="space-y-0.5">
              <h3 className="text-xl font-black text-foreground leading-tight">{topGoal.title}</h3>
              <p className="text-[10px] font-bold text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" /> ينتهي في {topGoal.endDate}
              </p>
            </div>
            <div className="text-right">
              <span className={cn("text-3xl font-black font-english leading-none", progress >= 100 ? "text-emerald-500" : "text-primary")}>
                {progress}%
              </span>
            </div>
          </div>
          
          <div className="relative h-4 w-full bg-muted/30 rounded-full overflow-hidden border border-white/5 shadow-inner">
            <div 
              className={cn("h-full transition-all duration-1000 ease-out bg-gradient-to-r relative", getColorClass(topGoal.color))} 
              style={{ width: `${progress}%` }} 
            >
              {/* لمعة الشريط */}
              <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent pointer-events-none" />
            </div>
          </div>
          
          <div className="flex justify-between px-1 text-[11px] font-black uppercase tracking-widest text-muted-foreground/70">
            <div className="flex items-center gap-1.5">
              <Trophy className="h-3.5 w-3.5" />
              <span>المحقق: <span className="font-english text-foreground">{topGoal.currentValue?.toLocaleString()}</span> {topGoal.unit}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Target className="h-3.5 w-3.5" />
              <span>المستهدف: <span className="font-english text-foreground">{topGoal.targetValue?.toLocaleString()}</span> {topGoal.unit}</span>
            </div>
          </div>
        </div>

        {progress >= 100 && (
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-3 flex items-center justify-center gap-2 animate-in zoom-in duration-500">
            <Sparkles className="h-4 w-4 text-emerald-500 animate-pulse" />
            <span className="text-xs font-black text-emerald-600">تم الإنجاز بنجاح! مبروك 🎉</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
