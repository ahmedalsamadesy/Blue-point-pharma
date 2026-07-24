
"use client"

import { useState, useMemo, useEffect } from "react"
import { useFirestore, useUser, useCollection, useMemoFirebase, useDoc } from "@/firebase"
import { collection, doc, getDocs, DocumentReference } from "firebase/firestore"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle,
  AlertDialogTrigger
} from "@/components/ui/alert-dialog"
import { useToast } from "@/hooks/use-toast"
import { 
  Loader2, 
  Printer, 
  ShieldCheck, 
  TrendingUp, 
  TrendingDown, 
  Wallet,
  Calendar,
  Lock,
  BarChart3,
  ShieldAlert,
  Zap,
  CheckCircle2,
  AlertTriangle,
  Scale,
  Database,
  Users,
  FileSpreadsheet,
  Banknote
} from "lucide-react"
import { cn } from "@/lib/utils"
import { APP_CONSTANTS } from "@/lib/constants"
import { closeFinancialPeriodTransaction, roundMoney } from "@/lib/financial-logic"
import * as XLSX from 'xlsx'

export function FinancialClosingSection() {
  const firestore = useFirestore()
  const { user } = useUser()
  const { toast } = useToast()
  
  const todayStr = new Date().toISOString().split('T')[0]
  const [startDate, setStartDate] = useState(todayStr)
  const [endDate, setEndDate] = useState(todayStr)
  const [actualCash, setActualCash] = useState("")
  const [loading, setLoading] = useState(false)
  const [isAggregating, setIsAggregating] = useState(false)

  const activeSysUser = useMemo(() => {
    if (typeof window === 'undefined') return null
    const saved = localStorage.getItem("activeSystemUser")
    return saved ? JSON.parse(saved) : null
  }, [])

  const isAdmin = activeSysUser?.role === 'admin' || activeSysUser?.role === 'owner'

  const [reportData, setReportData] = useState({
    totalIncome: 0,
    totalExpenses: 0,
    cashIn: 0,
    cashOut: 0,
    incomeDetails: [] as any[],
    expenseDetails: [] as any[],
    totalInventoryValuation: 0,
    totalCustomerDebt: 0,
    calculatedTreasury: 0,
    docsToLock: [] as DocumentReference[]
  })

  const settingsRef = useMemoFirebase(() => {
    if (!firestore || !user) return null
    return doc(firestore, "users", user.uid, "settings", "current")
  }, [firestore, user])
  const { data: settings } = useDoc(settingsRef)

  const incomeCatsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null
    return collection(firestore, "users", user.uid, "incomeCategories")
  }, [firestore, user])
  const { data: incomeCategories } = useCollection(incomeCatsQuery)

  const expenseCatsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null
    return collection(firestore, "users", user.uid, "expenseCategories")
  }, [firestore, user])
  const { data: expenseCategories } = useCollection(expenseCatsQuery)

  const closedPeriodsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null
    return collection(firestore, "users", user.uid, APP_CONSTANTS.COLLECTIONS.CLOSED_PERIODS)
  }, [firestore, user])
  const { data: closedPeriods } = useCollection(closedPeriodsQuery)

  const fetchPeriodData = async () => {
    if (!firestore || !user || !incomeCategories || !expenseCategories) return
    setIsAggregating(true)
    
    try {
      let incomeSum = 0, expenseSum = 0, cashIn = 0, cashOut = 0;
      const incDetails: any[] = []
      const expDetails: any[] = []
      const lockRefs: DocumentReference[] = []

      for (const cat of incomeCategories) {
        const snap = await getDocs(collection(firestore, "users", user.uid, "incomeCategories", cat.id, "incomes"))
        const filteredDocs = snap.docs.filter(d => {
          const dData = d.data();
          return dData.date >= startDate && dData.date <= endDate && !dData.lockedPeriod;
        })
        filteredDocs.forEach(d => {
          const data = d.data(), val = Number(data.amount) || 0;
          if (['shift_sales', 'general_income'].includes(data.type)) incomeSum += val;
          if (['shift_sales', 'customer_collection', 'general_income'].includes(data.type)) cashIn += val;
          lockRefs.push(d.ref)
        })
        const catSum = filteredDocs.reduce((s, d) => s + (Number(d.data().amount) || 0), 0)
        if (catSum > 0) incDetails.push({ name: cat.name, amount: catSum })
      }

      for (const cat of expenseCategories) {
        const snap = await getDocs(collection(firestore, "users", user.uid, "expenseCategories", cat.id, "expenses"))
        const filteredDocs = snap.docs.filter(d => {
          const dData = d.data();
          return dData.date >= startDate && dData.date <= endDate && !dData.lockedPeriod;
        })
        filteredDocs.forEach(d => {
          const data = d.data(), val = Number(data.amount) || 0;
          if (['purchase_bill', 'general_expense', 'employee_salary'].includes(data.type)) expenseSum += val;
          if (data.type === 'purchase_return') expenseSum -= val;
          if (['supplier_payment', 'general_expense', 'employee_salary', 'employee_advance'].includes(data.type)) cashOut += val;
          lockRefs.push(d.ref)
        })
        const catSum = filteredDocs.reduce((s, d) => s + (Number(d.data().amount) || 0), 0)
        if (catSum > 0) expDetails.push({ name: cat.name, amount: catSum })
      }

      const invSnap = await getDocs(collection(firestore, "users", user.uid, "inventoryValuations"))
      const lastInv = invSnap.docs.sort((a, b) => b.data().date.localeCompare(a.data().date))[0]?.data()?.amount || 0

      const custSnap = await getDocs(collection(firestore, "users", user.uid, "customers"))
      const detailedCustDebt = custSnap.docs.reduce((s, d) => s + (Number(d.data().balance) || 0), 0)

      const transfersSnap = await getDocs(collection(firestore, "users", user.uid, "cashTransfers"))
      const tIn = transfersSnap.docs.reduce((s, d) => d.data().type === 'in' ? s + Number(d.data().amount) : s, 0)
      const tOut = transfersSnap.docs.reduce((s, d) => d.data().type === 'out' ? s + Number(d.data().amount) : s, 0)
      
      const opening = Number(settings?.openingTreasuryBalance) || 0
      const calcTreasury = roundMoney(opening + cashIn - cashOut + tIn - tOut)

      setReportData({
        totalIncome: incomeSum,
        totalExpenses: expenseSum,
        cashIn, cashOut,
        incomeDetails: incDetails,
        expenseDetails: expDetails,
        totalInventoryValuation: lastInv,
        totalCustomerDebt: detailedCustDebt,
        calculatedTreasury: calcTreasury,
        docsToLock: lockRefs
      })

    } catch (e) { console.error(e) } finally { setIsAggregating(false) }
  }

  useEffect(() => { fetchPeriodData() }, [startDate, endDate, incomeCategories, expenseCategories, settings])

  const stats = useMemo(() => {
    const profit = reportData.totalIncome - reportData.totalExpenses
    const discrepancy = Number(actualCash) ? roundMoney(Number(actualCash) - reportData.calculatedTreasury) : 0
    return {
      totalIncome: reportData.totalIncome,
      totalExpenses: reportData.totalExpenses,
      netProfit: profit,
      profitMargin: reportData.totalIncome > 0 ? ((profit / reportData.totalIncome) * 100).toFixed(1) : "0",
      cashDiscrepancy: discrepancy
    }
  }, [reportData, actualCash])

  const handleExportExcel = () => {
    const summaryData = [
      ["تقرير الحساب الختامي الموثق - BluePointPharma"],
      [`الفترة من: ${startDate}`, `إلى: ${endDate}`],
      [""],
      ["1. ملخص النتائج المالية (الربح والخسارة)"],
      ["إجمالي المبيعات (استحقاق)", stats.totalIncome],
      ["إجمالي التكلفة والمصروفات", stats.totalExpenses],
      ["صافي الربح النهائي", stats.netProfit],
      [""],
      ["2. مطابقة السيولة النقدية (الخزينة)"],
      ["الرصيد الدفتري المتوقع", reportData.calculatedTreasury],
      ["الرصيد الفعلي (الدرج)", Number(actualCash) || reportData.calculatedTreasury],
      ["العجز / الزيادة", stats.cashDiscrepancy]
    ]
    const ws = XLSX.utils.aoa_to_sheet(summaryData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "الحساب الختامي");
    XLSX.writeFile(wb, `الحساب_الختامي_${startDate}.xlsx`);
  }

  const handleClosePeriod = async () => {
    if (!isAdmin || !firestore || !user) return
    if (reportData.docsToLock.length === 0) {
      toast({ variant: "destructive", title: "لا توجد حركات", description: "لا توجد عمليات جديدة لإغلاقها." }); return
    }
    setLoading(true)
    const closingData = {
      startDate, endDate, totalSales: stats.totalIncome, totalExpenses: stats.totalExpenses, netProfit: stats.netProfit,
      openingBalance: Number(settings?.openingTreasuryBalance) || 0, closingBalance: Number(actualCash) || reportData.calculatedTreasury,
      totalInventorySnapshot: reportData.totalInventoryValuation, totalCustomerDebtSnapshot: reportData.totalCustomerDebt,
      cashDiscrepancy: stats.cashDiscrepancy, closedBy: activeSysUser?.name || "مدير النظام", status: "Closed", lockedPeriod: true
    }
    try {
      await closeFinancialPeriodTransaction(firestore, user.uid, closingData, reportData.docsToLock)
      toast({ title: "تم الإغلاق بنجاح" }); setActualCash(""); fetchPeriodData()
    } catch (e) {
      toast({ variant: "destructive", title: "خطأ تقني" })
    } finally { setLoading(false) }
  }

  const isPeriodClosed = useMemo(() => closedPeriods?.some(p => p.startDate === startDate && p.endDate === endDate), [closedPeriods, startDate, endDate])

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20 px-4 md:px-0" dir="rtl">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 print:hidden">
        <div className="space-y-1"><h2 className="text-3xl font-black text-foreground flex items-center gap-3"><ShieldCheck className="h-8 w-8 text-primary" /> الحساب الختامي والمطابقة المالية</h2><p className="text-muted-foreground font-medium">التقرير النهائي لفصل السيولة النقدية عن الأرباح المحاسبية.</p></div>
        <div className="flex flex-wrap items-center gap-3 bg-card p-3 rounded-[1.5rem] border shadow-sm"><div className="flex items-center gap-2"><Calendar className="h-4 w-4 text-primary" /><Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="h-10 rounded-xl bg-muted/50 border-none w-36 text-xs font-english" /><span className="text-[10px] font-black opacity-40">إلى</span><Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="h-10 rounded-xl bg-muted/50 border-none w-36 text-xs font-english" /></div><div className="h-6 w-px bg-border mx-1" /><div className="flex items-center gap-2"><Button onClick={handleExportExcel} variant="outline" size="sm" className="h-10 rounded-xl border-emerald-200 text-emerald-700 font-bold gap-2 hover:bg-emerald-50"><FileSpreadsheet className="h-4 w-4" /> إكسيل</Button><Button onClick={() => window.print()} variant="outline" size="sm" className="h-10 rounded-xl border-border font-bold gap-2"><Printer className="h-4 w-4" /> طباعة</Button></div></div>
      </div>

      {isAggregating ? (
        <div className="flex flex-col items-center justify-center p-20 space-y-4"><Loader2 className="h-12 w-12 animate-spin text-primary" /><p className="font-bold text-muted-foreground">جاري مراجعة القيود ومطابقة السيولة...</p></div>
      ) : (
        <div className="grid gap-8 lg:grid-cols-12">
          <div className="lg:col-span-4 space-y-6 print:hidden">
            <Card className="border shadow-xl bg-card rounded-[2.5rem] overflow-hidden">
              <CardHeader className="bg-primary/5 border-b p-6"><CardTitle className="text-lg font-black flex items-center gap-2"><Wallet className="h-5 w-5 text-primary" /> جرد نقدية الدرج</CardTitle></CardHeader>
              <CardContent className="p-6 space-y-5">
                <div className="p-4 rounded-2xl bg-muted/30 border border-border/50 space-y-1"><span className="text-[10px] font-black text-muted-foreground uppercase">السيولة الدفترية المتوقعة</span><p className="text-2xl font-black font-english text-primary">{reportData.calculatedTreasury.toLocaleString()} ج.م</p></div>
                <div className="space-y-2"><Label className="font-bold text-xs">إدخال النقدية الفعلية (الدرج)</Label><Input type="number" value={actualCash} onChange={e => setActualCash(e.target.value)} placeholder="أدخل المبلغ الموجود فعلياً..." className="h-12 rounded-xl text-lg font-english font-black border-primary/20" /></div>
                {actualCash && (<div className={cn("p-4 rounded-2xl border flex flex-col gap-1 transition-all", stats.cashDiscrepancy === 0 ? "bg-emerald-500/5 border-emerald-500/20" : "bg-rose-500/5 border-rose-500/20")}><span className="text-[10px] font-black uppercase">الفارق (عجز / زيادة)</span><p className={cn("text-xl font-black font-english", stats.cashDiscrepancy === 0 ? "text-emerald-600" : "text-rose-600")}>{stats.cashDiscrepancy > 0 ? "+" : ""}{stats.cashDiscrepancy.toLocaleString()} ج.م</p></div>)}
              </CardContent>
            </Card>
            <Card className="border-2 border-primary/20 shadow-2xl bg-card rounded-[2.5rem] overflow-hidden">
              <CardHeader className="bg-muted/30 border-b p-6"><CardTitle className="text-lg flex items-center gap-2"><Lock className="h-5 w-5 text-rose-500" /> اعتماد الفترة</CardTitle></CardHeader>
              <CardContent className="p-6 space-y-4 text-center">
                <p className="text-xs text-muted-foreground leading-relaxed font-medium">سيتم ترحيل النقدية الفعلية كبداية للفترة القادمة وقفل كافة السجلات.</p>
                {isPeriodClosed ? (<div className="p-6 bg-emerald-500/10 rounded-3xl border border-emerald-500/20 text-emerald-600 space-y-2 animate-in zoom-in"><CheckCircle2 className="h-12 w-12 mx-auto" /><p className="font-black">تم الإغلاق والترحيل</p></div>) : isAdmin ? (<AlertDialog><AlertDialogTrigger asChild><Button className="w-full h-16 bg-primary text-white font-black text-xl rounded-2xl shadow-xl gap-3">تنفيذ الإغلاق النهائي</Button></AlertDialogTrigger><AlertDialogContent className="text-right rounded-[2.5rem]" dir="rtl"><AlertDialogHeader><AlertDialogTitle className="text-2xl font-black text-rose-500 flex items-center gap-3"><ShieldAlert className="h-8 w-8" /> تأكيد الإغلاق</AlertDialogTitle><AlertDialogDescription className="text-base font-medium mt-2">سيتم ترحيل مبلغ <b>{(Number(actualCash) || reportData.calculatedTreasury).toLocaleString()} ج.م</b> كبداية للفترة التالية. لا يمكن التعديل بعد ذلك.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter className="gap-3 mt-8"><AlertDialogAction onClick={handleClosePeriod} disabled={loading} className="bg-primary h-14 flex-1 font-black rounded-2xl">نعم، اعتمد الترحيل</AlertDialogAction><AlertDialogCancel className="h-14 flex-1 font-bold rounded-2xl">إلغاء</AlertDialogCancel></AlertDialogFooter></AlertDialogContent></AlertDialog>) : <div className="p-4 bg-amber-500/5 rounded-2xl border border-dashed border-amber-500/30 text-amber-600 text-xs font-bold">الإغلاق متاح فقط للمدير.</div>}
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-8">
            <Card className="border shadow-xl bg-card rounded-[3.5rem] overflow-hidden print:shadow-none print:border-2 print:border-black">
              <CardHeader className="bg-muted/30 border-b p-10 flex flex-row justify-between items-center"><div className="space-y-1"><CardTitle className="text-3xl font-black">بيان الأرباح والمطابقة المالية</CardTitle><CardDescription className="font-english font-bold text-lg">النطاق: {startDate} — {endDate}</CardDescription></div>{settings?.printLogoUrl && <img src={settings.printLogoUrl} className="h-20 w-20 object-contain" alt="Logo" />}</CardHeader>
              <CardContent className="p-10 space-y-12">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <ClosingStat label="إيراد المبيعات" value={stats.totalIncome} color="emerald" />
                  <ClosingStat label="إجمالي التكاليف" value={stats.totalExpenses} color="rose" />
                  <ClosingStat label="صافي الربح" value={stats.netProfit} color="primary" highlight />
                  <ClosingStat label="هامش الربح" value={stats.profitMargin} isPercent color="amber" />
                </div>
                <div className="space-y-8"><div className="space-y-4"><h3 className="text-xl font-black text-foreground flex items-center gap-2"><div className="h-2 w-2 rounded-full bg-primary" /> تفصيل القيود المحاسبية</h3><div className="rounded-3xl border border-border/50 overflow-hidden"><Table className="ledger-table"><TableHeader><TableRow className="bg-muted/50"><TableHead className="text-right py-5 font-black">البند</TableHead><TableHead className="text-right font-black">الحالة المالية</TableHead></TableRow></TableHeader><TableBody>{reportData.incomeDetails.map((inc, i) => (<TableRow key={i} className="border-b"><TableCell className="font-bold text-right">{inc.name}</TableCell><TableCell className="font-english font-black text-emerald-600 text-right">+{inc.amount.toLocaleString()}</TableCell></TableRow>))}{reportData.expenseDetails.map((exp, i) => (<TableRow key={i} className="border-b"><TableCell className="font-bold text-right">{exp.name}</TableCell><TableCell className="font-english font-black text-rose-600 text-right">-{exp.amount.toLocaleString()}</TableCell></TableRow>))}</TableBody></Table></div></div><div className="space-y-4"><h3 className="text-xl font-black text-foreground flex items-center gap-2"><div className="h-2 w-2 rounded-full bg-emerald-500" /> الحالة الرقابية للسيولة</h3><div className="grid grid-cols-1 md:grid-cols-3 gap-4"><SnapshotBox label="نقدية الخزينة" value={reportData.calculatedTreasury} icon={Wallet} /><SnapshotBox label="ديون العملاء (خارجي)" value={reportData.totalCustomerDebt} icon={Users} /><SnapshotBox label="رأس مال بضاعة" value={reportData.totalInventoryValuation} icon={Database} /></div></div></div>
                <div className="p-10 bg-primary/5 rounded-[3rem] border-2 border-primary/20 flex flex-col md:flex-row justify-between items-center gap-8 relative overflow-hidden"><div className="z-10 text-center md:text-right"><p className="text-sm font-black text-muted-foreground mb-2">صافي الربح المعتمد للفترة</p><h2 className="text-6xl font-black text-primary font-english tabular-nums text-right">{stats.netProfit.toLocaleString()} <span className="text-2xl">ج.م</span></h2></div><div className="z-10 bg-primary text-primary-foreground px-12 py-6 rounded-[2rem] shadow-2xl text-center"><p className="text-[10px] font-black uppercase opacity-70 mb-1 tracking-widest">توقيع المدير المسؤول</p><div className="h-12 w-32 border-b-2 border-white/30 border-dashed mx-auto mb-2" /><p className="text-xs font-bold">{activeSysUser?.name || "---"}</p></div></div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}

function ClosingStat({ label, value, color, isPercent, highlight }: any) {
  const styles: any = { emerald: "text-emerald-600 bg-emerald-500/10", rose: "text-rose-600 bg-rose-500/10", primary: "text-primary bg-primary/10", amber: "text-amber-600 bg-amber-500/10" }
  return (<div className={cn("p-5 rounded-[2rem] text-center border shadow-sm", highlight && "ring-2 ring-primary ring-offset-2", styles[color])}><p className="text-[10px] font-black uppercase mb-1 opacity-70">{label}</p><h4 className="text-2xl font-black font-english tabular-nums">{value.toLocaleString()}{isPercent ? '%' : ''}</h4></div>)
}

function SnapshotBox({ label, value, icon: Icon }: any) {
  return (<div className="p-6 rounded-3xl bg-muted/30 border border-border/50 text-center space-y-2 hover:bg-white hover:shadow-lg transition-all"><div className="h-10 w-10 rounded-xl bg-background border flex items-center justify-center mx-auto shadow-sm"><Icon className="h-5 w-5 text-primary" /></div><p className="text-[10px] font-black text-muted-foreground uppercase">{label}</p><p className="text-xl font-black font-english text-foreground">{value.toLocaleString()} <span className="text-[10px]">ج.م</span></p></div>)
}
