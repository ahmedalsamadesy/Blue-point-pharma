"use client"

import { useState, useMemo, useEffect } from "react"
import { useFirestore, useUser, useDoc, useCollection, useMemoFirebase } from "@/firebase"
import { collection, getDocs, doc, query, orderBy } from "firebase/firestore"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { financialPerformanceSummary } from "@/ai/flows/financial-performance-summary"
import { predictFuturePerformance, type ForecastOutput } from "@/ai/flows/financial-forecasting"
import { 
  Loader2, 
  Printer, 
  FileBarChart, 
  TrendingUp, 
  TrendingDown, 
  BarChart3, 
  Sparkles, 
  BrainCircuit, 
  Wallet,
  Target,
  Zap,
  ArrowUpRight,
  CalendarDays,
  LayoutGrid,
  FileSpreadsheet,
  Check,
  ChevronLeft
} from "lucide-react"
import { cn, printReport } from "@/lib/utils"
import * as XLSX from 'xlsx'
import { APP_CONSTANTS } from "@/lib/constants"
import { useToast } from "@/hooks/use-toast"

export function ReportsSection() {
  const firestore = useFirestore()
  const { user } = useUser()
  const { toast } = useToast()
  
  const [activeTab, setActiveTab] = useState("overview")
  const [startDate, setStartDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0])
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0])
  
  const [isGenerating, setIsGenerating] = useState(false)
  const [isForecasting, setIsForecasting] = useState(false)
  const [aiSummary, setAiSummary] = useState<string | null>(null)
  const [forecastData, setForecastData] = useState<ForecastOutput | null>(null)
  
  const [aggregatedData, setAggregatedData] = useState({ incomes: [] as any[], expenses: [] as any[] })
  const [selectedCats, setSelectedCats] = useState<Set<string>>(new Set())

  const settingsRef = useMemoFirebase(() => {
    if (!firestore || !user) return null
    return doc(firestore, APP_CONSTANTS.COLLECTIONS.USERS, user.uid, APP_CONSTANTS.COLLECTIONS.SETTINGS, "current")
  }, [firestore, user])
  const { data: settings } = useDoc(settingsRef)

  const incomeCatsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null
    return collection(firestore, APP_CONSTANTS.COLLECTIONS.USERS, user.uid, APP_CONSTANTS.COLLECTIONS.INCOME_CATS)
  }, [firestore, user])
  const { data: incomeCategories } = useCollection(incomeCatsQuery)

  const expenseCatsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null
    return collection(firestore, APP_CONSTANTS.COLLECTIONS.USERS, user.uid, APP_CONSTANTS.COLLECTIONS.EXPENSE_CATS)
  }, [firestore, user])
  const { data: expenseCategories } = useCollection(expenseCatsQuery)

  const performAggregation = async (start: string, end: string) => {
    if (!firestore || !user || !incomeCategories || !expenseCategories) return
    try {
      const allIncomes: any[] = []
      const allExpenses: any[] = []
      for (const cat of incomeCategories) {
        const snap = await getDocs(collection(firestore, "users", user.uid, APP_CONSTANTS.COLLECTIONS.INCOME_CATS, cat.id, APP_CONSTANTS.COLLECTIONS.INCOMES))
        snap.docs.forEach(d => { if (d.data().date >= start && d.data().date <= end) allIncomes.push({ ...d.data(), categoryName: cat.name, categoryId: cat.id }) })
      }
      for (const cat of expenseCategories) {
        const snap = await getDocs(collection(firestore, "users", user.uid, APP_CONSTANTS.COLLECTIONS.EXPENSE_CATS, cat.id, APP_CONSTANTS.COLLECTIONS.EXPENSES))
        snap.docs.forEach(d => { if (d.data().date >= start && d.data().date <= end) allExpenses.push({ ...d.data(), categoryName: cat.name, categoryId: cat.id }) })
      }
      setAggregatedData({ incomes: allIncomes, expenses: allExpenses })
      if (selectedCats.size === 0) setSelectedCats(new Set([...incomeCategories.map(c=>c.id), ...expenseCategories.map(c=>c.id)]))
    } catch (e) { }
  }

  useEffect(() => { performAggregation(startDate, endDate) }, [incomeCategories, expenseCategories, startDate, endDate])

  const stats = useMemo(() => {
    const filteredIncomes = aggregatedData.incomes.filter(i => selectedCats.has(i.categoryId))
    const filteredExpenses = aggregatedData.expenses.filter(e => selectedCats.has(e.categoryId))
    const totalInc = filteredIncomes.reduce((s, i) => s + Number(i.amount), 0)
    const totalExp = filteredExpenses.reduce((s, e) => s + Number(e.amount), 0)
    const profit = totalInc - totalExp
    const incomeBreakdown = (incomeCategories || []).map(cat => ({ name: cat.name, id: cat.id, amount: filteredIncomes.filter(i => i.categoryId === cat.id).reduce((s, i) => s + Number(i.amount), 0) })).filter(item => item.amount > 0 || selectedCats.has(item.id))
    const expenseBreakdown = (expenseCategories || []).map(cat => ({ name: cat.name, id: cat.id, amount: filteredExpenses.filter(e => e.categoryId === cat.id).reduce((s, e) => s + Number(e.amount), 0) })).filter(item => item.amount > 0 || selectedCats.has(item.id))
    return { totalInc, totalExp, netProfit: profit, profitMargin: totalInc > 0 ? ((profit / totalInc) * 100).toFixed(1) : "0", incomeBreakdown, expenseBreakdown }
  }, [aggregatedData, selectedCats, incomeCategories, expenseCategories])

  const handleExportExcel = () => {
    const data = [
      ["تقرير مالي - BluePointPharma"],
      [`الفترة: من ${startDate} إلى ${endDate}`],
      ["البند", "النوع", "القيمة (ج.م)"],
      ...stats.incomeBreakdown.filter(i=>selectedCats.has(i.id)).map(i=>[i.name, "إيراد", i.amount]),
      ...stats.expenseBreakdown.filter(e=>selectedCats.has(e.id)).map(e=>[e.name, "مصروف", e.amount]),
      ["إجمالي الربح", "", stats.netProfit]
    ];
    const ws = XLSX.utils.aoa_to_sheet(data); const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "التقرير");
    XLSX.writeFile(wb, `تقرير_صيدلية_${startDate}.xlsx`);
  }

  const handleGenerateReport = async () => {
    setIsGenerating(true)
    try {
      const aiResult = await financialPerformanceSummary({ currentPeriod: { startDate, endDate, totalIncome: stats.totalInc, totalExpenses: stats.totalExp, netProfit: stats.netProfit, keyIncomeSources: stats.incomeBreakdown.filter(i => selectedCats.has(i.id)).map(i => ({ source: i.name, amount: i.amount })), keyExpenseCategories: stats.expenseBreakdown.filter(e => selectedCats.has(e.id)).map(e => ({ category: e.name, amount: e.amount })) } })
      setAiSummary(aiResult.summary); setActiveTab("generator_view")
    } finally { setIsGenerating(false) }
  }

  const handlePrint = () => {
    const success = printReport("reportResult");
    if (!success) {
      toast({ variant: "destructive", title: "لا يوجد محتوى", description: "يرجى إنشاء تقرير أولاً ليتم طباعته." });
    }
  }

  return (
    <div className="space-y-8 animate-in fade-in pb-20 px-4 md:px-0" dir="rtl">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 print:hidden">
        <div className="space-y-1"><h2 className="text-3xl font-black text-foreground flex items-center gap-3"><FileBarChart className="h-8 w-8 text-primary" /> مركز التقارير والتحليل الذكي</h2><p className="text-muted-foreground font-medium">النسخة المستقرة v1.0 للإدارة المالية الرسمية.</p></div>
        <div className="flex gap-2 bg-card p-2 rounded-2xl border shadow-sm items-center"><CalendarDays className="h-4 w-4 text-primary ml-2" /><Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="h-9 border-none bg-muted/50 font-english rounded-lg text-xs" /><span className="text-[10px] font-black opacity-40">إلى</span><Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="h-9 border-none bg-muted/50 font-english rounded-lg text-xs" /><Button onClick={() => window.print()} variant="outline" size="sm" className="h-9 rounded-xl font-bold gap-2"><Printer className="h-4 w-4" /> طباعة</Button></div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
        <TabsList className="bg-muted/50 p-1.5 rounded-2xl print:hidden h-auto gap-1">
          <TabsTrigger value="overview" className="rounded-xl px-6 py-2.5 font-black text-xs">نظرة عامة</TabsTrigger>
          <TabsTrigger value="generator" className="rounded-xl px-6 py-2.5 font-black text-xs gap-2"><LayoutGrid className="h-3.5 w-3.5" /> مهندس التقارير</TabsTrigger>
          <TabsTrigger value="forecast" className="rounded-xl px-6 py-2.5 font-black text-xs gap-2"><Target className="h-3.5 w-3.5" /> التوقعات المالية</TabsTrigger>
          {activeTab === 'generator_view' && <TabsTrigger value="generator_view" className="rounded-xl px-6 py-2.5 font-black text-xs">معاينة المستند</TabsTrigger>}
        </TabsList>

        <TabsContent value="overview" className="space-y-8 animate-in slide-in-from-bottom-2 print:hidden">
          <div className="grid gap-4 md:grid-cols-4">
            <KPI icon={TrendingUp} label="إجمالي الإيرادات" value={stats.totalInc.toLocaleString()} color="emerald" />
            <KPI icon={TrendingDown} label="إجمالي المصاريف" value={stats.totalExp.toLocaleString()} color="rose" />
            <KPI icon={Wallet} label="صافي الربح" value={stats.netProfit.toLocaleString()} color="primary" highlight />
            <KPI icon={BarChart3} label="هامش الربحية" value={`${stats.profitMargin}%`} color="amber" />
          </div>
          <Card className="border shadow-xl bg-card rounded-[2.5rem] overflow-hidden"><CardHeader className="bg-muted/30 border-b p-6"><CardTitle className="text-xl font-black">تحليل البنود للفترة المحددة</CardTitle></CardHeader><CardContent className="p-0"><Table><TableHeader><TableRow className="bg-muted/30"><TableHead className="text-right py-5 font-black">البند المحاسبي</TableHead><TableHead className="text-right font-black">الحالة</TableHead><TableHead className="text-right font-black">القيمة (ج.م)</TableHead></TableRow></TableHeader><TableBody>{[...stats.incomeBreakdown.map(i=>(<TableRow key={i.id} className="hover:bg-emerald-50/20 border-b"><TableCell className="font-bold py-4">{i.name}</TableCell><TableCell><Badge className="bg-emerald-500/10 text-emerald-600 border-none font-black text-[9px]">إيراد (+)</Badge></TableCell><TableCell className="font-english font-black text-emerald-600 text-lg">+{i.amount.toLocaleString()}</TableCell></TableRow>)), ...stats.expenseBreakdown.map(e=>(<TableRow key={e.id} className="hover:bg-rose-50/20 border-b"><TableCell className="font-bold py-4">{e.name}</TableCell><TableCell><Badge className="bg-rose-500/10 text-rose-600 border-none font-black text-[9px]">مصروف (-)</Badge></TableCell><TableCell className="font-english font-black text-rose-600 text-lg">-{e.amount.toLocaleString()}</TableCell></TableRow>))]}</TableBody></Table></CardContent></Card>
        </TabsContent>

        <TabsContent value="generator" className="animate-in slide-in-from-bottom-2 print:hidden">
          <div className="grid gap-8 lg:grid-cols-12">
            <div className="lg:col-span-8 space-y-10">
              <div className="space-y-4"><h3 className="text-xl font-black flex items-center gap-2"><TrendingUp className="h-5 w-5 text-emerald-500" /> بنود الإيرادات المتاحة</h3><div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">{incomeCategories?.map(cat => (<SelectionCard key={cat.id} title={cat.name} selected={selectedCats.has(cat.id)} onClick={() => { const next = new Set(selectedCats); if (next.has(cat.id)) next.delete(cat.id); else next.add(cat.id); setSelectedCats(next); }} color="emerald" />))}</div></div>
              <div className="space-y-4"><h3 className="text-xl font-black flex items-center gap-2"><TrendingDown className="h-5 w-5 text-rose-500" /> بنود المصروفات المتاحة</h3><div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">{expenseCategories?.map(cat => (<SelectionCard key={cat.id} title={cat.name} selected={selectedCats.has(cat.id)} onClick={() => { const next = new Set(selectedCats); if (next.has(cat.id)) next.delete(cat.id); else next.add(cat.id); setSelectedCats(next); }} color="rose" />))}</div></div>
            </div>
            <div className="lg:col-span-4"><Card className="border shadow-2xl bg-card rounded-[3rem] overflow-hidden sticky top-24"><CardHeader className="bg-primary text-primary-foreground p-8 text-center"><CardTitle className="text-2xl font-black">مهندس التقرير المخصص</CardTitle></CardHeader><CardContent className="p-8 space-y-6 text-center"><div className="p-6 rounded-3xl bg-primary/5 border border-primary/10"><p className="text-[10px] font-black text-muted-foreground mb-1">صافي النتيجة المحددة</p><h3 className="text-4xl font-black font-english text-primary">{stats.netProfit.toLocaleString()} ج.م</h3></div><Button onClick={handleGenerateReport} disabled={isGenerating || selectedCats.size === 0} className="w-full h-16 rounded-2xl font-black text-lg shadow-xl gap-2">{isGenerating ? <Loader2 className="h-6 w-6 animate-spin" /> : <Sparkles className="h-6 w-6" />} توليد التقرير الذكي</Button></CardContent></Card></div>
          </div>
        </TabsContent>

        <TabsContent value="generator_view" className="animate-in slide-in-from-bottom-4">
          <div className="flex justify-end gap-3 mb-6 print:hidden"><Button onClick={handleExportExcel} variant="outline" className="h-12 rounded-xl border-emerald-200 text-emerald-700 font-bold gap-2"><FileSpreadsheet className="h-4 w-4" /> تصدير إكسيل</Button><Button onClick={handlePrint} className="h-12 rounded-xl bg-slate-900 text-white font-black px-8"><Printer className="h-4 w-4 ml-2" /> طباعة المستند</Button></div>
          
          <div id="reportResult">
            <Card className="max-w-5xl mx-auto border-2 shadow-2xl rounded-[3.5rem] overflow-hidden print:border-black print:rounded-none">
              <CardHeader className="bg-muted/30 border-b p-12 text-center print:bg-white print:border-black">
                <div className="flex justify-between items-start mb-8">
                  <div className="text-right space-y-1">
                    <h1 className="text-3xl font-black">بيان الأرباح والخسائر التفصيلي</h1>
                    <p className="text-xl font-bold">صيدلية: {settings?.pharmacyName || "---"}</p>
                    <p id="printDate" className="text-sm font-bold text-muted-foreground"></p>
                  </div>
                  {settings?.printLogoUrl && <img src={settings.printLogoUrl} className="h-24 w-24 object-contain" alt="Logo" />}
                </div>
                <Badge variant="outline" className="px-6 py-1.5 border-primary/20 text-primary font-english font-black rounded-full">الفترة: {startDate} — {endDate}</Badge>
              </CardHeader>
              <CardContent className="p-12 space-y-10 print:p-6">
                <div className="grid grid-cols-3 gap-8">
                  <div className="text-center p-6 bg-muted/30 rounded-3xl"><p className="text-[10px] font-black opacity-50 mb-1">إجمالي الإيرادات</p><h3 className="text-3xl font-black text-emerald-600 font-english">{stats.totalInc.toLocaleString()}</h3></div>
                  <div className="text-center p-6 bg-muted/30 rounded-3xl"><p className="text-[10px] font-black opacity-50 mb-1">إجمالي المصروفات</p><h3 className="text-3xl font-black text-rose-600 font-english">{stats.totalExp.toLocaleString()}</h3></div>
                  <div className="text-center p-6 bg-primary/10 rounded-3xl"><p className="text-[10px] font-black text-primary mb-1">صافي النتيجة</p><h3 className="text-3xl font-black text-primary font-english">{stats.netProfit.toLocaleString()}</h3></div>
                </div>
                <Separator className="print:bg-black" />
                <div className="space-y-6">
                  <h3 className="text-xl font-black">التفصيل المحاسبي للبنود:</h3>
                  <Table className="print:border-black">
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead className="text-right font-black py-4">البند</TableHead>
                        <TableHead className="text-right font-black">النوع</TableHead>
                        <TableHead className="text-left font-black">القيمة (ج.م)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {[...stats.incomeBreakdown.filter(i=>selectedCats.has(i.id)).map(i=>(<TableRow key={i.id} className="border-b"><TableCell className="font-bold py-4">{i.name}</TableCell><TableCell><span className="text-[10px] font-bold text-emerald-600">إيراد (+)</span></TableCell><TableCell className="text-left font-english font-black">+{i.amount.toLocaleString()}</TableCell></TableRow>)),...stats.expenseBreakdown.filter(e=>selectedCats.has(e.id)).map(e=>(<TableRow key={e.id} className="border-b"><TableCell className="font-bold py-4">{e.name}</TableCell><TableCell><span className="text-[10px] font-bold text-rose-600">مصروف (-)</span></TableCell><TableCell className="text-left font-english font-black text-rose-600">-{e.amount.toLocaleString()}</TableCell></TableRow>))]}</TableBody>
                    <TableFooter className="bg-primary/5 print:bg-white print:border-t-2">
                      <TableRow>
                        <TableCell colSpan={2} className="font-black text-lg py-8">الصافي النهائي للمستند</TableCell>
                        <TableCell className="text-left font-english font-black text-3xl text-primary">{stats.netProfit.toLocaleString()}</TableCell>
                      </TableRow>
                    </TableFooter>
                  </Table>
                </div>
                {aiSummary && (
                  <div className="p-8 rounded-[2rem] bg-primary/[0.03] border border-primary/10 print:border-black">
                    <h4 className="text-sm font-black mb-4 flex items-center gap-2 text-primary"><BrainCircuit className="h-5 w-5" /> تحليل Gemini الذكي:</h4>
                    <p className="text-xs leading-relaxed font-medium whitespace-pre-wrap">{aiSummary}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="forecast" className="animate-in slide-in-from-bottom-2 print:hidden">
          <div className="max-w-5xl mx-auto space-y-8">{!forecastData ? (<Card className="border-none shadow-2xl glass-card rounded-[3rem] p-12 text-center space-y-6"><div className="h-24 w-24 bg-primary/10 rounded-[2rem] flex items-center justify-center mx-auto mb-4"><Target className="h-12 w-12 text-primary animate-pulse" /></div><div className="space-y-2"><h3 className="text-3xl font-black">التنبؤ المالي المستقبلي</h3><p className="text-muted-foreground font-bold max-w-lg mx-auto leading-relaxed">بناءً على الأداء التاريخي للفترة المختارة، سيقوم Gemini بتوقع نتائج الشهر القادم.</p></div><Button onClick={async () => { setIsForecasting(true); try { const result = await predictFuturePerformance({ historicalData: [{ month: "الفترة المختارة", income: stats.totalInc, expenses: stats.totalExp, netProfit: stats.netProfit }], currentContext: { totalCustomerDebt: 0, totalSupplierDebt: 0 } }); setForecastData(result); } catch (e) {} finally { setIsForecasting(false); } }} disabled={isForecasting} className="h-16 px-12 rounded-2xl bg-primary text-white font-black text-lg shadow-xl">{isForecasting ? <Loader2 className="h-6 w-6 animate-spin ml-2" /> : <Zap className="h-6 w-6 ml-2" />} بدء التنبؤ الذكي</Button></Card>) : (<div className="grid gap-6 md:grid-cols-12 animate-in fade-in duration-500"><Card className="md:col-span-4 bg-primary text-primary-foreground rounded-[2.5rem] p-8 flex flex-col justify-between"><div className="space-y-1"><p className="text-xs font-black uppercase opacity-80">الدخل المتوقع</p><h2 className="text-5xl font-black font-english">{forecastData.predictedIncome.toLocaleString()}</h2></div><div className="mt-8 bg-white/20 p-4 rounded-2xl flex items-center gap-3"><ArrowUpRight className="h-8 w-8" /><div><p className="text-xs font-bold opacity-80">النمو</p><p className="text-2xl font-black font-english">{forecastData.expectedGrowth}</p></div></div></Card><Card className="md:col-span-8 border shadow-xl bg-card rounded-[2.5rem] overflow-hidden"><CardHeader className="bg-muted/30 border-b p-6"><CardTitle className="text-xl font-black flex items-center gap-2"><BrainCircuit className="h-5 w-5 text-primary" /> توصيات Gemini الإدارية</CardTitle></CardHeader><CardContent className="p-8"><div className="prose prose-sm max-w-none text-foreground font-medium leading-relaxed whitespace-pre-wrap">{forecastData.analysis}</div></CardContent></Card></div>)}</div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

function KPI({ icon: Icon, label, value, color, highlight = false }: any) {
  const colors: any = { emerald: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20", rose: "bg-rose-500/10 text-rose-600 border-rose-500/20", primary: "bg-primary/10 text-primary border-primary/20", amber: "bg-amber-500/10 text-amber-600 border-amber-500/20" }
  return (
    <Card className={cn("border shadow-sm rounded-[2rem] overflow-hidden group", highlight && "ring-2 ring-primary ring-offset-2")}>
      <CardContent className="p-6 flex flex-col gap-4"><div className="flex items-center justify-between"><div className={cn("h-10 w-10 rounded-xl flex items-center justify-center border", colors[color])}><Icon className="h-5 w-5" /></div><span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{label}</span></div><div className="text-right"><h3 className={cn("text-2xl font-black font-english", highlight ? "text-white" : "text-foreground")}>{value}</h3><span className="text-[9px] font-bold opacity-30">ج.م</span></div></CardContent>
    </Card>
  )
}

function SelectionCard({ title, selected, onClick, color }: any) {
  const styles: any = { emerald: selected ? "bg-emerald-600 text-white shadow-lg" : "bg-card hover:bg-emerald-50 border-border/50", rose: selected ? "bg-rose-600 text-white shadow-lg" : "bg-card hover:bg-rose-50 border-border/50" }
  return (
    <div onClick={onClick} className={cn("cursor-pointer p-5 rounded-[1.75rem] border-2 transition-all flex items-center justify-between group", styles[color])}><div className="flex items-center gap-3"><div className={cn("h-8 w-8 rounded-lg flex items-center justify-center", selected ? "bg-white/20" : "bg-muted")}>{selected ? <Check className="h-4 w-4" /> : <div className="h-2 w-2 rounded-full bg-muted-foreground/30" />}</div><span className="font-black text-sm">{title}</span></div>{!selected && <ChevronLeft className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-all" />}</div>
  )
}