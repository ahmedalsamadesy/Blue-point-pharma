"use client"

import { useState } from "react"
import { Sparkles, Loader2, Info, ChevronDown, ChevronUp, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { financialPerformanceSummary } from "@/ai/flows/financial-performance-summary"
import { Collapsible, CollapsibleContent } from "@/components/ui/collapsible"
import { cn } from "@/lib/utils"

interface AIInsightsProps {
  stats?: {
    totalIncome: number;
    totalExpenses: number;
    netProfit: number;
  }
}

export function AIInsights({ stats }: AIInsightsProps) {
  const [insight, setInsight] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(true)

  const generateInsights = async () => {
    setLoading(true)
    try {
      const result = await financialPerformanceSummary({
        currentPeriod: {
          startDate: new Date().toISOString().split('T')[0],
          endDate: new Date().toISOString().split('T')[0],
          totalIncome: stats?.totalIncome || 0,
          totalExpenses: stats?.totalExpenses || 0,
          netProfit: stats?.netProfit || 0,
          keyIncomeSources: [
            { source: "إيرادات الصيدلية المسجلة", amount: stats?.totalIncome || 0 }
          ],
          keyExpenseCategories: [
            { category: "مصروفات ومشتريات مسجلة", amount: stats?.totalExpenses || 0 }
          ]
        }
      })
      setInsight(result.summary)
      setIsOpen(true)
    } catch (error) {
      console.error("Failed to generate AI insights", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="glass-card glow-primary rounded-[2.5rem] overflow-hidden relative text-right group" dir="rtl">
      {/* تأثير بريق AI خلفي */}
      <div className="absolute top-0 left-0 p-10 opacity-[0.03] dark:opacity-[0.08] pointer-events-none transition-transform duration-1000 group-hover:scale-110">
        <Sparkles className="h-48 w-48 text-primary" />
      </div>
      
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 relative z-10">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2.5 justify-start">
            <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-primary animate-pulse" />
            </div>
            <CardTitle className="font-headline text-xl font-black">المساعد المالي الذكي</CardTitle>
          </div>
          <CardDescription className="text-[10px] font-bold text-muted-foreground mr-10">
            تحليل تلقائي فوري لسجلات صيدليتك الحقيقية.
          </CardDescription>
        </div>
        
        <div className="flex items-center gap-1.5">
          {insight && !loading && (
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={generateInsights}
              className="h-9 w-9 rounded-xl text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all"
              title="تحديث التحليل"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          )}
          {insight && (
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setIsOpen(!isOpen)}
              className="h-9 w-9 rounded-xl text-muted-foreground hover:bg-muted"
            >
              {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className={cn("pb-6 transition-all duration-500 relative z-10", !insight && "pt-0")}>
        {!insight && !loading && (
          <div className="flex flex-col items-center justify-center py-6 text-center space-y-4">
            <div className="p-5 rounded-3xl bg-primary/5 border border-primary/10 glow-primary shadow-inner">
              <Info className="h-8 w-8 text-primary/60" />
            </div>
            <p className="text-xs font-bold text-muted-foreground max-w-[280px] leading-relaxed">
              اترك مهمة تحليل الأرقام والاتجاهات للذكاء الاصطناعي الخاص بـ BluePoint.
            </p>
            <Button 
              onClick={generateInsights} 
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-black rounded-2xl h-12 px-8 shadow-xl shadow-primary/20 transition-all hover:scale-[1.03] active:scale-95"
            >
              توليد الرؤية المالية الآن
            </Button>
          </div>
        )}

        {loading && (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <div className="relative">
              <div className="absolute inset-0 bg-primary/20 blur-xl animate-pulse rounded-full" />
              <Loader2 className="h-10 w-10 text-primary animate-spin relative z-10" />
            </div>
            <p className="text-xs font-black animate-pulse text-foreground tracking-widest">جاري قراءة السجلات المالية...</p>
          </div>
        )}

        {insight && !loading && (
          <Collapsible open={isOpen}>
            <CollapsibleContent className="space-y-4 overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down">
              <div className="prose prose-sm max-w-none leading-relaxed whitespace-pre-wrap font-body bg-primary/[0.03] dark:bg-primary/[0.07] p-6 rounded-[2rem] border border-primary/10 text-foreground text-sm shadow-inner transition-all hover:bg-primary/[0.05]">
                {insight}
              </div>
            </CollapsibleContent>
            {!isOpen && (
              <div 
                className="py-4 px-6 bg-primary/5 rounded-2xl border border-dashed border-primary/20 text-center cursor-pointer hover:bg-primary/10 transition-all group/btn"
                onClick={() => setIsOpen(true)}
              >
                <p className="text-xs text-primary font-black flex items-center justify-center gap-2">
                  <ChevronDown className="h-3 w-3 animate-bounce" />
                  اضغط لاستعراض التقرير المولد
                </p>
              </div>
            )}
          </Collapsible>
        )}
      </CardContent>
    </Card>
  )
}