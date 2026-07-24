
"use client"

import { useState, useMemo, useEffect } from "react"
import { useFirestore, useUser, useMemoFirebase, useDoc, useCollection } from "@/firebase"
import { collection, doc } from "firebase/firestore"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { 
  Loader2, 
  Landmark, 
  ArrowUpCircle, 
  ArrowDownCircle, 
  Printer, 
  Search, 
  Wallet,
  ReceiptText,
  RefreshCw,
  Filter,
  Info,
  FileSpreadsheet,
  PlusCircle,
  LayoutGrid,
  Edit3,
  Trash2,
  CalendarDays,
  ShieldCheck,
  Lock
} from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"
import { APP_CONSTANTS } from "@/lib/constants"
import { useToast } from "@/hooks/use-toast"
import { addDocumentNonBlocking, updateDocumentNonBlocking, deleteDocumentNonBlocking } from "@/firebase/non-blocking-updates"
import { calculateGlobalFinancialSnapshot, roundMoney } from "@/lib/financial-logic"
import { ReadOnlyGuard } from "./shared/read-only-guard"
import * as XLSX from 'xlsx'

export function TreasurySection() {
  const firestore = useFirestore()
  const { user } = useUser()
  const { toast } = useToast()
  
  const [activeTab, setActiveTab] = useState("ledger")
  const [searchTerm, setSearchTerm] = useState("")
  const [isAdvFilterOpen, setIsAdvFilterOpen] = useState(false)
  const [filterType, setFilterType] = useState("all")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [summaryStats, setSummaryStats] = useState({ totalIn: 0, totalOut: 0, balance: 0, opening: 0, branchNet: 0 })

  // تصنيفات الخزائن
  const [isAddTreasuryOpen, setIsAddTreasuryOpen] = useState(false)
  const [isEditTreasuryOpen, setIsEditTreasuryOpen] = useState(false)
  const [editingTreasury, setEditingTreasury] = useState<any>(null)
  const [treasuryFormData, setTreasuryFormData] = useState({ name: "", type: "cash", openingBalance: "0" })

  const activeSysUser = useMemo(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem("activeSystemUser") : null
    return saved ? JSON.parse(saved) : null
  }, [])

  const isAdmin = activeSysUser?.role === 'admin';
  const isOwner = activeSysUser?.role === 'owner';
  const canManage = isAdmin;

  const settingsRef = useMemoFirebase(() => {
    if (!firestore || !user) return null
    return doc(firestore, APP_CONSTANTS.COLLECTIONS.USERS, user.uid, APP_CONSTANTS.COLLECTIONS.SETTINGS, "current")
  }, [firestore, user])
  const { data: settings } = useDoc(settingsRef)

  const treasuriesQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null
    return collection(firestore, APP_CONSTANTS.COLLECTIONS.USERS, user.uid, APP_CONSTANTS.COLLECTIONS.TREASURIES)
  }, [firestore, user])
  const { data: treasuries, isLoading: isTreasuriesLoading } = useCollection(treasuriesQuery)

  const fetchLedger = async () => {
    if (!firestore || !user) return
    setIsRefreshing(true)
    try {
      const opening = Number(settings?.openingTreasuryBalance) || 0
      const snapshot = await calculateGlobalFinancialSnapshot(firestore, user.uid, opening)
      
      setSummaryStats({
        totalIn: snapshot.totalIncome,
        totalOut: snapshot.totalExpenses,
        balance: snapshot.totalCash,
        opening: opening,
        branchNet: snapshot.branchNet || 0
      })

      toast({ title: "تم تحديث مرآة الخزينة" })
    } catch (e) { 
      toast({ variant: "destructive", title: "فشل تحديث البيانات" })
    } finally { setIsRefreshing(false) }
  }

  useEffect(() => { 
    fetchLedger();
    const handleRefresh = () => fetchLedger();
    window.addEventListener('refresh-stats', handleRefresh)
    return () => window.removeEventListener('refresh-stats', handleRefresh)
  }, [firestore, user, settings])

  const handleAddTreasury = () => {
    if (!canManage || !firestore || !user || !treasuryFormData.name) return
    addDocumentNonBlocking(collection(firestore, APP_CONSTANTS.COLLECTIONS.USERS, user.uid, APP_CONSTANTS.COLLECTIONS.TREASURIES), {
      ...treasuryFormData,
      openingBalance: roundMoney(Number(treasuryFormData.openingBalance)),
      createdAt: new Date().toISOString()
    }).then(() => {
      setIsAddTreasuryOpen(false); setTreasuryFormData({ name: "", type: "cash", openingBalance: "0" });
      toast({ title: "تم تسجيل الخزينة" })
    })
  }

  const handleUpdateTreasury = () => {
    if (!canManage || !firestore || !user || !editingTreasury) return
    updateDocumentNonBlocking(doc(firestore, APP_CONSTANTS.COLLECTIONS.USERS, user.uid, APP_CONSTANTS.COLLECTIONS.TREASURIES, editingTreasury.id), {
      ...editingTreasury,
      openingBalance: roundMoney(Number(editingTreasury.openingBalance)),
      updatedAt: new Date().toISOString()
    })
    setIsEditTreasuryOpen(false); toast({ title: "تم التحديث" })
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20 px-4 md:px-0" dir="rtl">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
        <div>
          <h2 className="text-3xl font-black text-foreground flex items-center gap-3">
            <Landmark className="h-8 w-8 text-primary" /> 
            مرآة الخزينة والسيولة
          </h2>
          <p className="text-muted-foreground font-medium">سجل شامل لكافة التدفقات النقدية الداخلة والخارجة بدقة تراكمية.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={fetchLedger} variant="ghost" size="icon" className="h-12 w-12 rounded-xl border">
            <RefreshCw className={cn("h-5 w-5", isRefreshing && "animate-spin")} />
          </Button>
          <Button onClick={() => window.print()} variant="outline" className="h-12 rounded-xl font-bold gap-2">
            <Printer className="h-4 w-4" /> طباعة
          </Button>
          {canManage && activeTab === 'classifications' && (
            <Button onClick={() => setIsAddTreasuryOpen(true)} className="h-12 rounded-2xl bg-primary text-white font-black px-6 shadow-lg gap-2">
              <PlusCircle className="h-5 w-5" /> إضافة خزينة
            </Button>
          )}
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-8 print:hidden">
          <TabsList className="bg-muted/50 p-1.5 rounded-2xl h-auto gap-1">
            <TabsTrigger value="ledger" className="rounded-xl px-8 py-3 font-black text-xs gap-2">
              <ReceiptText className="h-4 w-4" /> الرصيد التراكمي الموحد
            </TabsTrigger>
            <TabsTrigger value="classifications" className="rounded-xl px-8 py-3 font-black text-xs gap-2">
              <LayoutGrid className="h-4 w-4" /> تصنيفات الخزائن
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="ledger" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3 print:hidden">
            <KPIItem label="إجمالي الوارد (+)" value={`+${summaryStats.totalIn.toLocaleString()}`} icon={ArrowUpCircle} color="emerald" />
            <KPIItem label="إجمالي المنصرف (-)" value={`-${summaryStats.totalOut.toLocaleString()}`} icon={ArrowDownCircle} color="rose" />
            <KPIItem label="الرصيد النقدي المتاح" value={summaryStats.balance.toLocaleString()} icon={Wallet} color="primary" highlight />
          </div>

          <Card className="border shadow-xl bg-card rounded-[2.5rem] overflow-hidden print:rounded-none">
            <CardHeader className="bg-primary/5 p-8 border-b">
              <CardTitle className="text-2xl font-black">الحالة النقدية النهائية</CardTitle>
              <CardDescription className="font-bold">هذه الأرقام تمثل السيولة المتاحة في درج الصيدلية والحسابات البنكية المدمجة.</CardDescription>
            </CardHeader>
            <CardContent className="p-12 text-center space-y-8">
               {isOwner ? (
                 <ReadOnlyGuard role="owner" />
               ) : (
                 <div className="p-10 rounded-[3rem] bg-muted/30 border-2 border-dashed border-primary/20 max-w-2xl mx-auto">
                    <Landmark className="h-16 w-16 text-primary/20 mx-auto mb-4" />
                    <p className="text-xl font-bold text-muted-foreground leading-relaxed">
                      يتم استخراج الرصيد التراكمي لحظة بلحظة من كافة أقسام النظام (مبيعات، مشتريات، سداد، تحويلات).
                    </p>
                 </div>
               )}
               
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
                  <div className="p-8 rounded-3xl bg-emerald-500/5 border border-emerald-500/10 shadow-inner">
                    <p className="text-[10px] font-black uppercase text-emerald-600 mb-2">الرصيد الافتتاحي المعتمد</p>
                    <p className="text-3xl font-black font-english text-emerald-700">{summaryStats.opening.toLocaleString()} ج.م</p>
                  </div>
                  <div className="p-8 rounded-3xl bg-primary/5 border border-primary/10 shadow-inner">
                    <p className="text-[10px] font-black uppercase text-primary mb-2">صافي الربح التشغيلي</p>
                    <p className="text-3xl font-black font-english text-primary">{(summaryStats.totalIn - summaryStats.totalOut).toLocaleString()} ج.م</p>
                  </div>
                  <div className={cn("p-8 rounded-3xl border shadow-inner transition-all", summaryStats.branchNet >= 0 ? "bg-blue-500/5 border-blue-500/10" : "bg-rose-500/5 border-rose-500/10")}>
                    <p className="text-[10px] font-black uppercase text-muted-foreground mb-2">صافي مديونية الفروع</p>
                    <p className={cn("text-3xl font-black font-english", summaryStats.branchNet >= 0 ? "text-blue-600" : "text-rose-600")}>
                      {summaryStats.branchNet > 0 ? "+" : ""}{summaryStats.branchNet.toLocaleString()} ج.م
                    </p>
                  </div>
               </div>

               <div className="pt-10 border-t">
                  <p className="text-sm font-black text-muted-foreground mb-4">إجمالي السيولة الفعلية الموثقة حالياً:</p>
                  <h2 className="text-7xl font-black text-primary font-english tracking-tighter">
                    {summaryStats.balance.toLocaleString()} <span className="text-3xl">ج.م</span>
                  </h2>
               </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="classifications" className="space-y-8 animate-in slide-in-from-bottom-2">
          {isOwner ? (
            <ReadOnlyGuard role="owner" />
          ) : !canManage ? (
            <ReadOnlyGuard role="staff" type="restricted" />
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {isTreasuriesLoading ? (
                <div className="col-span-full p-20 text-center"><Loader2 className="h-10 w-10 animate-spin mx-auto text-primary" /></div>
              ) : treasuries && treasuries.length > 0 ? (
                treasuries.map((tr) => (
                  <Card key={tr.id} className="border shadow-lg rounded-[2.5rem] overflow-hidden group transition-all hover:shadow-xl relative bg-card">
                    <div className={cn("absolute top-0 right-0 w-1.5 h-full", tr.type === 'bank' ? 'bg-blue-600' : tr.type === 'wallet' ? 'bg-amber-500' : 'bg-emerald-500')} />
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-start">
                        <div className="h-12 w-12 rounded-2xl bg-muted flex items-center justify-center text-primary shadow-inner">
                          <Wallet className="h-6 w-6" />
                        </div>
                        <div className="flex gap-1 print:hidden">
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-primary hover:bg-primary/10 rounded-lg" onClick={() => { setEditingTreasury(tr); setIsEditTreasuryOpen(true); }}><Edit3 className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-rose-500 hover:bg-rose-50 rounded-lg" onClick={() => deleteDocumentNonBlocking(doc(firestore!, "users", user!.uid, "treasuries", tr.id))}><Trash2 className="h-4 w-4" /></Button>
                        </div>
                      </div>
                      <CardTitle className="text-xl font-black mt-4">{tr.name}</CardTitle>
                      <Badge variant="secondary" className="w-fit text-[9px] font-black border-none bg-primary/5 text-primary">
                        {tr.type === 'cash' ? 'خزينة نقدية' : tr.type === 'bank' ? 'حساب بنكي' : 'محفظة إلكترونية'}
                      </Badge>
                    </CardHeader>
                    <CardContent className="pt-4">
                      <div className="p-4 rounded-2xl bg-muted/30 border border-border/50 text-center">
                        <p className="text-[10px] font-black text-muted-foreground uppercase mb-1">الرصيد الافتتاحي</p>
                        <p className="text-2xl font-black font-english text-primary">{Number(tr.openingBalance || 0).toLocaleString()} <span className="text-xs">ج.م</span></p>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <div className="col-span-full p-32 text-center space-y-4">
                  <Landmark className="h-16 w-16 text-muted-foreground/20 mx-auto" />
                  <p className="text-muted-foreground font-bold">لا توجد خزائن مسجلة. أضف خزائنك (درج، بنك، فودافون كاش).</p>
                </div>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* نافذة إضافة خزينة */}
      <Dialog open={isAddTreasuryOpen} onOpenChange={setIsAddTreasuryOpen}>
        <DialogContent className="sm:max-w-[450px] text-right rounded-[2.5rem]" dir="rtl">
          <DialogHeader><DialogTitle className="text-2xl font-black text-primary">إضافة خزينة / وعاء مالي</DialogTitle></DialogHeader>
          <div className="grid gap-6 py-6">
            <div className="space-y-2 text-right"><Label className="font-bold">اسم الخزينة</Label><Input value={treasuryFormData.name} onChange={e => setTreasuryFormData({...treasuryFormData, name: e.target.value})} className="h-12 rounded-xl" placeholder="مثال: درج الصيدلية الرئيسي" /></div>
            <div className="space-y-2 text-right">
              <Label className="font-bold">النوع</Label>
              <Select value={treasuryFormData.type} onValueChange={v => setTreasuryFormData({...treasuryFormData, type: v})}>
                <SelectTrigger className="h-12 rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="cash" className="text-right font-bold">خزينة نقدية (درج)</SelectItem>
                  <SelectItem value="bank" className="text-right font-bold">حساب بنكي</SelectItem>
                  <SelectItem value="wallet" className="text-right font-bold">محفظة إلكترونية</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 text-right"><Label className="font-black text-primary">الرصيد الافتتاحي (ج.م)</Label><Input type="number" value={treasuryFormData.openingBalance} onChange={e => setTreasuryFormData({...treasuryFormData, openingBalance: e.target.value})} className="h-14 text-center text-2xl font-black rounded-xl font-english" /></div>
          </div>
          <DialogFooter><Button onClick={handleAddTreasury} className="bg-primary text-white flex-1 h-14 rounded-2xl font-black shadow-lg">حفظ الخزينة</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* نافذة تعديل خزينة */}
      <Dialog open={isEditTreasuryOpen} onOpenChange={setIsEditTreasuryOpen}>
        <DialogContent className="sm:max-w-[450px] text-right rounded-[2.5rem]" dir="rtl">
          <DialogHeader><DialogTitle className="text-2xl font-black text-primary">تعديل بيانات الخزينة</DialogTitle></DialogHeader>
          <div className="grid gap-6 py-6">
            <div className="space-y-2 text-right"><Label className="font-bold">اسم الخزينة</Label><Input value={editingTreasury?.name || ""} onChange={e => setEditingTreasury({...editingTreasury, name: e.target.value})} className="h-12 rounded-xl" /></div>
            <div className="space-y-2 text-right"><Label className="font-bold">الرصيد الافتتاحي</Label><Input type="number" value={editingTreasury?.openingBalance || 0} onChange={e => setEditingTreasury({...editingTreasury, openingBalance: e.target.value})} className="h-12 rounded-xl font-english" /></div>
          </div>
          <DialogFooter><Button onClick={handleUpdateTreasury} className="bg-primary text-white flex-1 h-12 rounded-xl font-black shadow-lg">حفظ التعديلات</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function KPIItem({ label, value, icon: Icon, color, highlight }: any) {
  const styles: any = { 
    emerald: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20", 
    rose: "bg-rose-500/10 text-rose-600 border-rose-500/20", 
    primary: "bg-primary/10 text-primary border-primary/20" 
  }
  return (
    <Card className={cn("border shadow-sm rounded-[2.25rem] transition-all hover:shadow-lg relative overflow-hidden group", highlight && "ring-2 ring-primary ring-offset-2")}>
      <CardContent className="p-6 flex flex-col gap-4">
        <div className="flex items-center justify-between"><div className={cn("h-12 w-12 rounded-2xl flex items-center justify-center border shadow-inner transition-transform group-hover:scale-110", styles[color])}><Icon className="h-6 w-6" /></div><div className="text-[9px] font-black uppercase tracking-widest bg-muted/50 px-3 py-1 rounded-full text-muted-foreground">تحديث لحظي</div></div>
        <div className="space-y-1">
          <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">{label}</p>
          <div className="flex items-baseline gap-2 flex-wrap"><h3 className={cn("text-2xl md:text-3xl font-black font-english tracking-tight", highlight ? "text-primary" : "text-foreground")}>{value}</h3><span className="text-[10px] font-bold text-muted-foreground shrink-0">ج.م</span></div>
        </div>
      </CardContent>
    </Card>
  )
}
