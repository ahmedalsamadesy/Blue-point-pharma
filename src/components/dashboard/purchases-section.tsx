
"use client"

import { useState, useMemo } from "react"
import { useFirestore, useUser, useCollection, useMemoFirebase } from "@/firebase"
import { collection, doc } from "firebase/firestore"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableFooter, TableHead, TableHeader, TableRow, TableCell } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import { 
  Loader2, 
  ShoppingBag, 
  Printer, 
  Search, 
  Trash2, 
  PlusCircle, 
  Truck,
  ArrowDownNarrowWide,
  FileSpreadsheet,
  Filter,
  Lock,
  Eye,
  ShieldCheck
} from "lucide-react"
import { cn } from "@/lib/utils"
import { recordPurchaseTransaction, deletePurchaseTransaction } from "@/lib/financial-logic"
import { APP_CONSTANTS } from "@/lib/constants"
import { ReadOnlyGuard } from "./shared/read-only-guard"
import * as XLSX from 'xlsx'

export function PurchasesSection() {
  const firestore = useFirestore()
  const { user } = useUser()
  const { toast } = useToast()
  
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [activeFormTab, setActiveFormTab] = useState("bill")

  const [isAdvFilterOpen, setIsAdvFilterOpen] = useState(false)
  const [advFilters, setAdvFilters] = useState({ startDate: "", endDate: "", supplierId: "all" })

  const [billData, setBillData] = useState({ 
    amount: "", 
    invoiceNumber: "", 
    date: new Date().toISOString().split('T')[0], 
    supplierId: "" 
  })
  
  const [returnData, setReturnData] = useState({ 
    amount: "", 
    invoiceNumber: "", 
    itemName: "", 
    supplierId: "", 
    date: new Date().toISOString().split('T')[0]
  })

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [purchaseToDelete, setPurchaseToDelete] = useState<any>(null)

  const activeSysUser = useMemo(() => {
    if (typeof window === 'undefined') return null
    const saved = localStorage.getItem("activeSystemUser")
    return saved ? JSON.parse(saved) : null
  }, [])

  const isManager = activeSysUser?.role === 'admin';
  const isOwner = activeSysUser?.role === 'owner';
  const canManage = isManager;

  const suppliersQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null
    return collection(firestore, APP_CONSTANTS.COLLECTIONS.USERS, user.uid, APP_CONSTANTS.COLLECTIONS.SUPPLIERS)
  }, [firestore, user])
  const { data: suppliers } = useCollection(suppliersQuery)

  const expenseCatsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null
    return collection(firestore, APP_CONSTANTS.COLLECTIONS.USERS, user.uid, APP_CONSTANTS.COLLECTIONS.EXPENSE_CATS)
  }, [firestore, user])
  const { data: expenseCategories } = useCollection(expenseCatsQuery)

  const purchaseCategory = useMemo(() => {
    if (!expenseCategories) return null;
    return expenseCategories.find(cat => cat.name.includes("مشتريات") || cat.name.includes("فواتير")) || expenseCategories[0];
  }, [expenseCategories])

  const purchasesQuery = useMemoFirebase(() => {
    if (!firestore || !user || !purchaseCategory) return null
    return collection(firestore, APP_CONSTANTS.COLLECTIONS.USERS, user.uid, APP_CONSTANTS.COLLECTIONS.EXPENSE_CATS, purchaseCategory.id, APP_CONSTANTS.COLLECTIONS.EXPENSES)
  }, [firestore, user, purchaseCategory])
  const { data: purchases, isLoading: isPurchasesLoading } = useCollection(purchasesQuery)

  const filteredPurchases = useMemo(() => {
    if (!purchases) return []
    return purchases.filter(p => {
      const matchSearch = p.supplierName?.toLowerCase().includes(searchTerm.toLowerCase()) || p.invoiceNumber?.includes(searchTerm)
      const matchSupplier = advFilters.supplierId === 'all' || p.supplierId === advFilters.supplierId
      const matchStart = !advFilters.startDate || p.date >= advFilters.startDate
      const matchEnd = !advFilters.endDate || p.date <= advFilters.endDate
      return matchSearch && matchSupplier && matchStart && matchEnd
    }).sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || a.date).getTime())
  }, [purchases, searchTerm, advFilters])

  const stats = useMemo(() => {
    const netTotal = filteredPurchases.reduce((sum, p) => p.type === 'purchase_return' ? sum - Number(p.amount) : sum + Number(p.amount), 0)
    const todayStr = new Date().toISOString().split('T')[0]
    const todayTotal = (purchases || []).filter(p => p.date === todayStr).reduce((sum, p) => p.type === 'purchase_return' ? sum - Number(p.amount) : sum + Number(p.amount), 0)
    const suppliersCount = new Set(filteredPurchases.map(p => p.supplierId)).size
    return { netTotal, todayTotal, suppliersCount }
  }, [filteredPurchases, purchases])

  const handleExportExcel = () => {
    const exportData = filteredPurchases.map(p => ({
      "التاريخ": p.date,
      "المورد": p.supplierName,
      "النوع": p.type === 'purchase_bill' ? "فاتورة" : "مرتجع",
      "رقم الفاتورة": p.invoiceNumber,
      "المبلغ": p.amount
    }));
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "المشتريات");
    XLSX.writeFile(wb, `مشتريات_بلو_بوينت_${new Date().toISOString().split('T')[0]}.xlsx`);
    toast({ title: "تم تصدير الإكسيل" });
  }

  const handleAddPurchase = async () => {
    if (!canManage || !firestore || !user || !purchaseCategory || !billData.amount || !billData.supplierId) return
    setLoading(true)
    const supplier = suppliers?.find(s => s.id === billData.supplierId)
    try {
      await recordPurchaseTransaction(firestore, user.uid, billData.supplierId, purchaseCategory.id, {
        ...billData, amount: Number(billData.amount), supplierName: supplier?.name, type: "purchase_bill", recordedByName: activeSysUser?.name
      })
      setBillData({ amount: "", invoiceNumber: "", date: new Date().toISOString().split('T')[0], supplierId: "" });
      toast({ title: "تم الحفظ" }); window.dispatchEvent(new CustomEvent('refresh-stats'))
    } finally { setLoading(false) }
  }

  const handleAddReturn = async () => {
    if (!canManage || !firestore || !user || !purchaseCategory || !returnData.amount || !returnData.supplierId || !returnData.invoiceNumber) return
    setLoading(true)
    const supplier = suppliers?.find(s => s.id === returnData.supplierId)
    try {
      await recordPurchaseTransaction(firestore, user.uid, returnData.supplierId, purchaseCategory.id, {
        ...returnData, amount: Number(returnData.amount), supplierName: supplier?.name, type: "purchase_return", recordedByName: activeSysUser?.name
      })
      setReturnData({ amount: "", invoiceNumber: "", itemName: "", supplierId: "", date: new Date().toISOString().split('T')[0] });
      toast({ title: "تم تسجيل المرتجع" }); window.dispatchEvent(new CustomEvent('refresh-stats'))
    } finally { setLoading(false) }
  }

  const handleDeletePurchase = async () => {
    if (!canManage || !firestore || !user || !purchaseCategory || !purchaseToDelete) return
    setLoading(true)
    try {
      await deletePurchaseTransaction(firestore, user.uid, purchaseToDelete.supplierId, purchaseCategory.id, purchaseToDelete.id, Number(purchaseToDelete.amount), purchaseToDelete.type, activeSysUser?.name || "مستخدم")
      setIsDeleteDialogOpen(false); setPurchaseToDelete(null); setLoading(false)
      window.dispatchEvent(new CustomEvent('refresh-stats'))
      toast({ title: "تم الحفظ" })
    } finally { setLoading(false) }
  }

  return (
    <div className="space-y-8 pb-20 px-4 md:px-0" dir="rtl">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-600"><ShoppingBag className="h-6 w-6" /></div>
          <div><h2 className="text-3xl font-black text-foreground">المشتريات والديون</h2><p className="text-muted-foreground font-medium">تتبع فواتير الشركات ومرتجعات الأصناف.</p></div>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={handleExportExcel} variant="outline" className="h-12 rounded-xl border-blue-200 font-bold gap-2 text-blue-700 hover:bg-blue-50">
            <FileSpreadsheet className="h-4 w-4" /> تصدير إكسيل
          </Button>
          <Button onClick={() => window.print()} variant="outline" className="h-12 rounded-xl font-bold gap-2"><Printer className="h-4 w-4" /> طباعة</Button>
        </div>
      </div>

      <div className="grid gap-4 grid-cols-1 md:grid-cols-3 print:hidden">
        <KPIItem label="مشتريات اليوم" value={stats.todayTotal.toLocaleString()} icon={ShoppingBag} color="blue" />
        <KPIItem label="صافي المشتريات" value={stats.netTotal.toLocaleString()} icon={ArrowDownNarrowWide} color="primary" highlight />
        <KPIItem label="الشركات المتعاملة" value={stats.suppliersCount} icon={Truck} color="amber" />
      </div>

      <div className="grid gap-8 md:grid-cols-12 print:block">
        <div className="md:col-span-4 print:hidden">
          <Card className={cn("glass-card rounded-[2.5rem] overflow-hidden shadow-2xl border-none sticky top-24", isOwner && "opacity-60 grayscale-[0.5]")}>
            {isOwner ? (
              <ReadOnlyGuard role="owner" />
            ) : canManage ? (
              <Tabs value={activeFormTab} onValueChange={setActiveFormTab}>
                <TabsList className="grid w-full grid-cols-2 rounded-xl bg-muted/50 p-6">
                  <TabsTrigger value="bill" className="font-black text-xs">فاتورة (+)</TabsTrigger>
                  <TabsTrigger value="return" className="font-black text-xs">مرتجع (-)</TabsTrigger>
                </TabsList>
                <CardContent className="p-6">
                  <TabsContent value="bill" className="space-y-4">
                    <Select onValueChange={(v) => setBillData({...billData, supplierId: v})} value={billData.supplierId}>
                      <SelectTrigger className="h-12 rounded-xl bg-muted/30 border-none"><SelectValue placeholder="المورد" /></SelectTrigger>
                      <SelectContent className="rounded-xl">{suppliers?.map(s => <SelectItem key={s.id} value={s.id} className="font-bold">{s.name}</SelectItem>)}</SelectContent>
                    </Select>
                    <div className="grid grid-cols-2 gap-4">
                      <Input type="date" value={billData.date} onChange={(e) => setBillData({...billData, date: e.target.value})} className="h-12 rounded-xl" />
                      <Input value={billData.invoiceNumber} onChange={(e) => setBillData({...billData, invoiceNumber: e.target.value})} placeholder="رقم الفاتورة" className="h-12 rounded-xl" />
                    </div>
                    <Input type="number" value={billData.amount} onChange={(e) => setBillData({...billData, amount: e.target.value})} placeholder="0.00" className="h-14 text-2xl font-black text-blue-600 text-left font-english shadow-inner" />
                    <Button onClick={handleAddPurchase} disabled={loading} className="w-full h-14 bg-blue-600 text-white rounded-2xl font-black shadow-lg">
                      {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <PlusCircle className="h-5 w-5" />} حفظ الفاتورة
                    </Button>
                  </TabsContent>
                  <TabsContent value="return" className="space-y-4">
                    <Select onValueChange={(v) => setReturnData({...returnData, supplierId: v})} value={returnData.supplierId}>
                      <SelectTrigger className="h-12 rounded-xl bg-muted/30 border-none"><SelectValue placeholder="المورد" /></SelectTrigger>
                      <SelectContent className="rounded-xl">{suppliers?.map(s => <SelectItem key={s.id} value={s.id} className="font-bold">{s.name}</SelectItem>)}</SelectContent>
                    </Select>
                    <Input value={returnData.invoiceNumber} onChange={(e) => setReturnData({...returnData, invoiceNumber: e.target.value})} placeholder="رقم الفاتورة الأصلية" className="h-12 rounded-xl" />
                    <Input value={returnData.itemName} onChange={(e) => setReturnData({...returnData, itemName: e.target.value})} placeholder="اسم الصنف" className="h-12 rounded-xl" />
                    <Input type="number" value={returnData.amount} onChange={(e) => setReturnData({...returnData, amount: e.target.value})} placeholder="0.00" className="h-14 text-2xl font-black text-amber-500 text-left font-english shadow-inner" />
                    <Button onClick={handleAddReturn} disabled={loading} className="w-full h-14 bg-amber-500 text-white rounded-2xl font-black shadow-lg">تسجيل مرتجع</Button>
                  </TabsContent>
                </CardContent>
              </Tabs>
            ) : <ReadOnlyGuard role="staff" type="restricted" />}
          </Card>
        </div>
        <div className="md:col-span-8 space-y-6">
          <Card className="border shadow-xl bg-card rounded-[2.5rem] overflow-hidden">
            <CardHeader className="border-b bg-muted/30 p-6 flex flex-col md:flex-row items-center justify-between gap-4 print:hidden">
              <CardTitle className="text-xl font-black">دفتر المشتريات والديون</CardTitle>
              <div className="flex items-center gap-3 w-full md:w-auto">
                <div className="relative flex-1 md:w-48"><Search className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" /><Input placeholder="بحث..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="h-10 pr-10 rounded-xl" /></div>
                <Button variant="outline" onClick={() => setIsAdvFilterOpen(true)} className="h-10 rounded-xl font-bold gap-2 bg-background border-primary/20"><Filter className="h-4 w-4" /> فلترة</Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader><TableRow className="bg-muted/30 border-b-2"><TableHead className="text-right py-6 font-black">التاريخ</TableHead><TableHead className="text-right font-black">المورد / البيان</TableHead><TableHead className="text-right font-black">المبلغ</TableHead><TableHead className="text-center print:hidden">إجراءات</TableHead></TableRow></TableHeader>
                <TableBody>
                  {isPurchasesLoading ? <TableRow><TableCell colSpan={4} className="p-20 text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" /></TableCell></TableRow> : filteredPurchases.map((p) => (
                    <TableRow key={p.id} className="hover:bg-primary/[0.02] border-b transition-colors">
                      <TableCell className="font-english text-xs font-bold py-4">{p.date}</TableCell>
                      <TableCell className="py-4"><div className="flex flex-col"><span className="font-black">{p.supplierName}</span><span className="text-[10px] opacity-60 font-bold">{p.type === 'purchase_return' ? `مرتجع: ${p.itemName}` : `فاتورة #${p.invoiceNumber}`}</span></div></TableCell>
                      <TableCell className={cn("font-black text-lg font-english", p.type==='purchase_return'?'text-amber-600':'text-rose-600')}>{p.type==='purchase_return'?'-':'+'}{p.amount?.toLocaleString()}</TableCell>
                      <TableCell className="text-center print:hidden">
                        {canManage ? (
                          <Button variant="ghost" size="icon" className="text-rose-500" onClick={() => { setPurchaseToDelete(p); setIsDeleteDialogOpen(true); }}><Trash2 className="h-4 w-4" /></Button>
                        ) : <Eye className="h-4 w-4 text-muted-foreground opacity-30" />}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                <TableFooter className="bg-primary/5 border-t-2">
                  <TableRow>
                    <TableCell colSpan={2} className="py-10 font-black text-2xl text-foreground">صافي المشتريات المفلترة</TableCell>
                    <TableCell className="text-right font-black text-rose-600 text-4xl font-english">{stats.netTotal.toLocaleString()}</TableCell>
                    <TableCell className="print:hidden"/>
                  </TableRow>
                </TableFooter>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={isAdvFilterOpen} onOpenChange={setIsAdvFilterOpen}>
        <DialogContent className="sm:max-w-[450px] text-right rounded-[2.5rem]" dir="rtl">
          <DialogHeader><DialogTitle className="text-2xl font-black">فلترة المشتريات</DialogTitle></DialogHeader>
          <div className="grid gap-6 py-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2 text-right"><Label className="font-bold">من تاريخ</Label><Input type="date" value={advFilters.startDate} onChange={(e) => setAdvFilters({...advFilters, startDate: e.target.value})} className="h-12 rounded-xl" /></div>
              <div className="space-y-2 text-right"><Label className="font-bold">إلى تاريخ</Label><Input type="date" value={advFilters.endDate} onChange={(e) => setAdvFilters({...advFilters, endDate: e.target.value})} className="h-12 rounded-xl" /></div>
            </div>
            <div className="space-y-2 text-right">
              <Label className="font-bold">حسب المورد</Label>
              <Select value={advFilters.supplierId} onValueChange={(v) => setAdvFilters({...advFilters, supplierId: v})}>
                <SelectTrigger className="h-12 rounded-xl"><SelectValue placeholder="الكل" /></SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="all" className="font-bold">كل الموردين</SelectItem>
                  {suppliers?.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button onClick={() => setIsAdvFilterOpen(false)} className="bg-primary text-white flex-1 font-black h-12 rounded-xl shadow-lg">تطبيق</Button>
            <Button variant="outline" onClick={() => { setAdvFilters({startDate:"", endDate:"", supplierId:"all"}); setIsAdvFilterOpen(false); }} className="flex-1 font-bold h-12 rounded-xl">إعادة ضبط</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent className="text-right rounded-[2.5rem]" dir="rtl">
          <AlertDialogHeader><AlertDialogTitle className="text-2xl font-black text-rose-600">تأكيد حذف عملية</AlertDialogTitle><AlertDialogDescription className="font-bold">سيتم إعادة ضبط مديونية المورد فوراً في قاعدة البيانات.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter className="gap-2 mt-6"><AlertDialogAction onClick={handleDeletePurchase} className="bg-rose-600 text-white flex-1 h-12 rounded-xl font-black">حذف</AlertDialogAction><AlertDialogCancel className="flex-1 h-12 rounded-xl font-bold">إلغاء</AlertDialogCancel></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function KPIItem({ label, value, icon: Icon, color, highlight }: any) {
  const styles: any = { blue: "bg-blue-500/10 text-blue-500 border-blue-500/20", primary: "bg-primary/10 text-primary border-primary/20", amber: "bg-amber-500/10 text-amber-600 border-amber-500/20" }
  return (
    <Card className={cn("border shadow-sm rounded-[2rem] transition-all hover:shadow-xl", highlight && "ring-2 ring-primary ring-offset-2")}>
      <CardContent className="p-6 flex items-center justify-between">
        <div><p className="text-[11px] font-bold text-muted-foreground uppercase">{label}</p><h3 className="text-3xl font-black font-english">{value}</h3></div>
        <div className={cn("h-12 w-12 rounded-xl flex items-center justify-center shadow-inner", styles[color])}><Icon className="h-6 w-6" /></div>
      </CardContent>
    </Card>
  )
}
