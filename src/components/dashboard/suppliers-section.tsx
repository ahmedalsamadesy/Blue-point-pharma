
"use client"

import { useState, useMemo, useEffect } from "react"
import { useFirestore, useUser, useDoc, useCollection, useMemoFirebase } from "@/firebase"
import { collection, doc, getDocs, writeBatch, query, where } from "firebase/firestore"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { useToast } from "@/hooks/use-toast"
import { 
  Loader2, 
  Truck, 
  Search, 
  Edit3, 
  Trash2, 
  Printer, 
  Banknote, 
  FileText, 
  Filter,
  Wallet,
  FileSearch,
  PlusCircle,
  Building2,
  HandCoins,
  FileSpreadsheet,
  ArrowRight,
  ScrollText,
  RefreshCw,
  History,
  Lock,
  CalendarDays,
  Eye,
  ShieldCheck
} from "lucide-react"
import { addDocumentNonBlocking, updateDocumentNonBlocking, deleteDocumentNonBlocking } from "@/firebase/non-blocking-updates"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { recordSupplierPaymentTransaction } from "@/lib/financial-logic"
import * as XLSX from 'xlsx'
import { APP_CONSTANTS } from "@/lib/constants"

const DEAL_TYPES = [
  { id: "cash", label: "نقدي (كاش)", color: "bg-emerald-500/10 text-emerald-600" },
  { id: "weekly", label: "أسبوعي", color: "bg-blue-500/10 text-blue-600" },
  { id: "monthly", label: "شهري", color: "bg-purple-500/10 text-purple-600" },
  { id: "invoice_by_invoice", label: "فاتورة بفاتورة", color: "bg-amber-500/10 text-amber-600" },
]

export function SuppliersSection() {
  const firestore = useFirestore()
  const { user } = useUser()
  const { toast } = useToast()

  const [view, setView] = useState<"list" | "ledger">("list")
  const [searchTerm, setSearchTerm] = useState("")
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [isResetOpen, setIsResetOpen] = useState(false)
  const [isPaymentOpen, setIsPaymentOpen] = useState(false)
  
  const [isAdvFilterOpen, setIsAdvFilterOpen] = useState(false)
  const [advFilters, setAdvFilters] = useState({ dealType: "all", minBalance: "", maxBalance: "" })

  const [loading, setLoading] = useState(false)
  const [ledgerLoading, setLedgerLoading] = useState(false)
  const [rawSupplierTransactions, setRawSupplierTransactions] = useState<any[]>([])
  const [paymentAmount, setPaymentAmount] = useState("")
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0])
  
  const activeSysUser = useMemo(() => {
    if (typeof window === 'undefined') return null
    const saved = localStorage.getItem("activeSystemUser")
    return saved ? JSON.parse(saved) : null
  }, [])

  const isManager = activeSysUser?.role === 'admin';
  const isOwner = activeSysUser?.role === 'owner';
  const canManage = isManager; 

  const [formData, setFormData] = useState({ name: "", phone: "", email: "", address: "", balance: 0, dealType: "cash" })
  const [editingSupplier, setEditingSupplier] = useState<any>(null)
  const [supplierToDelete, setSupplierToDelete] = useState<any>(null)
  const [supplierToReset, setSupplierToReset] = useState<any>(null)
  const [selectedSupplier, setSelectedSupplier] = useState<any>(null)

  const suppliersQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null
    return collection(firestore, APP_CONSTANTS.COLLECTIONS.USERS, user.uid, APP_CONSTANTS.COLLECTIONS.SUPPLIERS)
  }, [firestore, user])
  const { data: suppliers, isLoading } = useCollection(suppliersQuery)

  const expenseCatsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null
    return collection(firestore, APP_CONSTANTS.COLLECTIONS.USERS, user.uid, APP_CONSTANTS.COLLECTIONS.EXPENSE_CATS)
  }, [firestore, user])
  const { data: expenseCategories } = useCollection(expenseCatsQuery)

  const supplierPaymentCategory = useMemo(() => {
    if (!expenseCategories) return null;
    return expenseCategories.find(cat => cat.name.includes("سداد") || cat.name.includes("موردين")) || expenseCategories[0];
  }, [expenseCategories])

  const filteredSuppliers = useMemo(() => {
    if (!suppliers) return []
    return suppliers.filter(sup => {
      const matchSearch = (sup.name || "").toLowerCase().includes(searchTerm.toLowerCase()) || (sup.phone || "").includes(searchTerm)
      const matchDeal = advFilters.dealType === 'all' || sup.dealType === advFilters.dealType
      const matchMin = !advFilters.minBalance || (Number(sup.balance) || 0) >= Number(advFilters.minBalance)
      const matchMax = !advFilters.maxBalance || (Number(sup.balance) || 0) <= Number(advFilters.maxBalance)
      return matchSearch && matchDeal && matchMin && matchMax
    }).sort((a, b) => (Number(b.balance) || 0) - (Number(a.balance) || 0))
  }, [suppliers, searchTerm, advFilters])

  const totalDebts = useMemo(() => {
    return filteredSuppliers.reduce((s, sup) => s + (Number(sup.balance) || 0), 0)
  }, [filteredSuppliers])

  const fetchSupplierTransactions = async (supplier: any) => {
    if (!firestore || !user || !expenseCategories) return
    setLedgerLoading(true)
    try {
      const allTransactions: any[] = []
      for (const cat of expenseCategories) {
        const snap = await getDocs(collection(firestore, "users", user.uid, APP_CONSTANTS.COLLECTIONS.EXPENSE_CATS, cat.id, APP_CONSTANTS.COLLECTIONS.EXPENSES))
        snap.docs.forEach(d => {
          const data = d.data()
          if (data.supplierId === supplier.id) {
            allTransactions.push({ 
              ...data, 
              id: d.id, 
              entryType: (data.type === 'supplier_payment' || data.type === 'purchase_return') ? 'credit' : 'bill',
              sortDate: data.createdAt || data.date
            })
          }
        })
      }
      
      const sorted = allTransactions.sort((a, b) => (a.sortDate || "").localeCompare(b.sortDate || ""))
      
      let runningBalance = 0
      const withRunningBalance = sorted.map(t => {
        if (t.entryType === 'bill') runningBalance += Number(t.amount || 0)
        else runningBalance -= Number(t.amount || 0)
        return { ...t, runningBalance }
      })

      setRawSupplierTransactions(withRunningBalance.reverse())
    } finally { setLedgerLoading(false) }
  }

  const handleOpenLedger = (supplier: any) => {
    setSelectedSupplier(supplier)
    fetchSupplierTransactions(supplier)
    setView("ledger")
  }

  const handleRecordPayment = async () => {
    if (!canManage || !firestore || !user || !selectedSupplier || !paymentAmount || !supplierPaymentCategory) return
    setLoading(true)
    try {
      await recordSupplierPaymentTransaction(firestore, user.uid, selectedSupplier.id, supplierPaymentCategory.id, { 
        amount: Number(paymentAmount), 
        date: paymentDate, 
        description: `سداد مورد: ${selectedSupplier.name}`, 
        supplierId: selectedSupplier.id, 
        supplierName: selectedSupplier.name, 
        recordedByName: activeSysUser?.name || "مستخدم", 
        type: "supplier_payment" 
      })
      window.dispatchEvent(new CustomEvent('refresh-stats')); setIsPaymentOpen(false); setPaymentAmount(""); setLoading(false); toast({ title: "تم السداد بنجاح" })
    } catch (e) { setLoading(false) }
  }

  const handleAddSupplier = () => {
    if (!canManage || !firestore || !user || !formData.name) return
    setLoading(true)
    addDocumentNonBlocking(collection(firestore, "users", user.uid, "suppliers"), { ...formData, balance: Number(formData.balance) || 0, createdAt: new Date().toISOString() }).then(() => {
      setFormData({ name: "", phone: "", email: "", address: "", balance: 0, dealType: "cash" }); setIsAddOpen(false); setLoading(false); toast({ title: "تم الحفظ" })
    })
  }

  const handleUpdateSupplier = () => {
    if (!canManage || !firestore || !user || !editingSupplier) return
    updateDocumentNonBlocking(doc(firestore, "users", user.uid, "suppliers", editingSupplier.id), {
      ...editingSupplier,
      balance: Number(editingSupplier.balance) || 0,
      updatedAt: new Date().toISOString()
    })
    setIsEditOpen(false)
    toast({ title: "تم التحديث" })
  }

  const handleDeleteSupplier = () => {
    if (!canManage || !firestore || !user || !supplierToDelete) return
    deleteDocumentNonBlocking(doc(firestore, "users", user.uid, "suppliers", supplierToDelete.id))
    setIsDeleteOpen(false)
    setSupplierToDelete(null)
    toast({ title: "تم حذف المورد نهائياً" })
  }

  const handleResetSupplier = async () => {
    if (!canManage || !firestore || !user || !supplierToReset || !expenseCategories) return
    setLoading(true)
    try {
      const batch = writeBatch(firestore)
      
      batch.update(doc(firestore, "users", user.uid, "suppliers", supplierToReset.id), {
        balance: 0,
        updatedAt: new Date().toISOString(),
        resetAt: new Date().toISOString()
      })

      for (const cat of expenseCategories) {
        const q = query(
          collection(firestore, "users", user.uid, "expenseCategories", cat.id, "expenses"),
          where("supplierId", "==", supplierToReset.id)
        )
        const snap = await getDocs(q)
        snap.docs.forEach(d => batch.delete(d.ref))
      }

      await batch.commit()
      toast({ title: "تم تصفير الحساب", description: "تم مسح كافة السجلات المالية لهذا المورد بنجاح." })
      window.dispatchEvent(new CustomEvent('refresh-stats'))
    } catch (e) {
      toast({ variant: "destructive", title: "فشل التصفير" })
    } finally {
      setLoading(false); setIsResetOpen(false); setSupplierToReset(null)
    }
  }

  if (view === "ledger") {
    const totalBills = rawSupplierTransactions.filter(t => t.entryType === 'bill').reduce((s, t) => s + Number(t.amount || 0), 0)
    const totalCredits = rawSupplierTransactions.filter(t => t.entryType === 'credit').reduce((s, t) => s + Number(t.amount || 0), 0)

    return (
      <div className="space-y-8 pb-20 animate-in fade-in" dir="rtl">
        <div className="flex justify-between items-center px-4 print:hidden">
          <Button variant="ghost" onClick={() => setView("list")} className="gap-2 font-black rounded-xl hover:bg-primary/10">
            <ArrowRight className="h-5 w-5" /> العودة لسجل الموردين
          </Button>
          <Button onClick={() => window.print()} className="h-12 rounded-2xl bg-emerald-600 text-white font-black px-8 shadow-lg gap-2">
            <Printer className="h-5 w-5" /> طباعة كشف الحساب
          </Button>
        </div>

        <Card className="bg-white text-slate-950 p-10 shadow-2xl rounded-[3.5rem] max-w-[1000px] mx-auto min-h-[1000px] border print:shadow-none print:border-none print:p-0">
          <div className="flex justify-between items-start border-b-4 border-slate-900 pb-10 mb-10">
            <div className="flex items-center gap-5">
              <div className="h-16 w-16 rounded-2xl bg-slate-900 flex items-center justify-center text-white">
                <ScrollText className="h-8 w-8" />
              </div>
              <div className="text-right space-y-1">
                <h1 className="text-4xl font-black text-slate-900">كشف حساب مورد</h1>
                <p className="text-slate-500 font-bold text-lg">الشركة: {selectedSupplier?.name}</p>
                <p className="text-xs text-slate-400 font-english">تاريخ الاستخراج: {new Date().toLocaleDateString('ar-EG')}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-slate-50 border text-center">
                <p className="text-[10px] font-black uppercase text-slate-400">إجمالي المديونية</p>
                <p className="text-xl font-black font-english text-rose-600">+{totalBills.toLocaleString()}</p>
              </div>
              <div className="p-4 rounded-2xl bg-slate-50 border text-center">
                <p className="text-[10px] font-black uppercase text-slate-400">إجمالي المسدد</p>
                <p className="text-xl font-black font-english text-emerald-600">-{totalCredits.toLocaleString()}</p>
              </div>
              <div className="p-6 rounded-3xl bg-slate-900 text-white text-center col-span-2 shadow-xl">
                <p className="text-[10px] font-black uppercase opacity-60">الرصيد المتبقي المستحق</p>
                <p className="text-4xl font-black font-english">{Number(selectedSupplier?.balance || 0).toLocaleString()}</p>
              </div>
            </div>
          </div>

          <Table className="print:border-slate-900">
            <TableHeader>
              <TableRow className="bg-slate-900 hover:bg-slate-900">
                <TableHead className="text-right py-5 text-white font-black">التاريخ</TableHead>
                <TableHead className="text-right text-white font-black">البيان / الفاتورة</TableHead>
                <TableHead className="text-right text-white font-black">القيمة</TableHead>
                <TableHead className="text-right text-white font-black bg-slate-800">الرصيد التراكمي</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ledgerLoading ? (
                <TableRow><TableCell colSpan={4} className="p-20 text-center font-black">جاري تحليل البيانات المالية...</TableCell></TableRow>
              ) : rawSupplierTransactions.length > 0 ? (
                rawSupplierTransactions.map(t => (
                  <TableRow key={t.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                    <TableCell className="font-english text-xs py-5 font-bold">{t.date}</TableCell>
                    <TableCell className="font-bold text-slate-700">
                      <div className="flex flex-col">
                        <span>{t.description}</span>
                        {t.invoiceNumber && <span className="text-[10px] opacity-50">فاتورة رقم: #{t.invoiceNumber}</span>}
                      </div>
                    </TableCell>
                    <TableCell className={cn("font-black font-english text-xl", t.entryType === 'bill' ? 'text-rose-600' : 'text-emerald-600')}>
                      {t.entryType === 'bill' ? '+' : '-'}{Number(t.amount).toLocaleString()}
                    </TableCell>
                    <TableCell className="font-black font-english text-xl bg-slate-50 text-slate-900">
                      {Number(t.runningBalance).toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow><TableCell colSpan={4} className="p-20 text-center text-slate-400 font-bold">لا توجد حركات مسجلة لهذا المورد.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
          
          <div className="mt-10 p-8 border-t-2 border-dashed border-slate-200 text-center space-y-2 print:mt-20">
            <p className="text-xs font-black text-slate-400">نظام BluePointPharma v2.5 - الحسابات المعتمدة</p>
            <div className="flex justify-around pt-10">
              <div className="text-center"><div className="h-px w-32 bg-slate-300 mb-2"></div><p className="text-[10px] font-bold">توقيع المورد</p></div>
              <div className="text-center"><div className="h-px w-32 bg-slate-300 mb-2"></div><p className="text-[10px] font-bold">ختم الصيدلية</p></div>
            </div>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20 px-4 md:px-0" dir="rtl">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
        <div><h2 className="text-3xl font-black text-foreground flex items-center gap-3"><Truck className="h-8 w-8 text-primary" /> إدارة الموردين والديون</h2><p className="text-muted-foreground font-medium">متابعة مديونيات شركات الأدوية والمدفوعات الآجلة.</p></div>
        <div className="flex flex-wrap items-center gap-2">
          {canManage && (
            <>
              <Button onClick={() => setIsAdvFilterOpen(true)} variant="outline" className="h-12 rounded-xl font-black gap-2 border-primary/20 hover:bg-primary/5">
                <Filter className="h-4 w-4" /> فلترة متقدمة
              </Button>
              <Button onClick={() => setIsAddOpen(true)} className="h-12 rounded-2xl bg-primary text-white font-black px-6 shadow-lg gap-2 shadow-primary/20 transition-all hover:scale-105 active:scale-95">
                <PlusCircle className="h-5 w-5" /> مورد جديد
              </Button>
            </>
          )}
          <Button onClick={() => window.print()} variant="outline" className="h-12 rounded-xl font-bold gap-2"><Printer className="h-4 w-4" /> طباعة</Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 print:hidden">
        <SupplierKPI label="إجمالي الموردين" value={filteredSuppliers.length} icon={Building2} color="primary" />
        <SupplierKPI label="إجمالي مديونية الشركات" value={totalDebts.toLocaleString()} icon={Banknote} color="rose" highlight />
      </div>

      <Card className="border shadow-xl bg-card rounded-[2.5rem] overflow-hidden">
        <CardHeader className="border-b bg-muted/30 p-6 flex flex-col md:flex-row items-center justify-between gap-4 print:hidden">
          <CardTitle className="text-xl font-black flex items-center gap-2"><FileSearch className="h-5 w-5 text-primary" /> سجل الموردين المعتمد</CardTitle>
          <div className="relative max-w-xs w-full"><Search className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" /><Input placeholder="بحث بالاسم أو الهاتف..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="h-10 pr-10 rounded-xl font-bold border-none bg-background shadow-inner" /></div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-20 text-center flex flex-col items-center gap-4">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
              <p className="font-bold text-muted-foreground">جاري استرجاع الموردين...</p>
            </div>
          ) : filteredSuppliers.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader><TableRow className="bg-muted/30 border-b-2"><TableHead className="text-right py-5 font-black text-foreground">الشركة</TableHead><TableHead className="text-right font-black text-foreground">نظام التعامل</TableHead><TableHead className="text-right font-black text-foreground">الرصيد المستحق</TableHead><TableHead className="text-center print:hidden font-black text-foreground">إجراءات</TableHead></TableRow></TableHeader>
                <TableBody>
                  {filteredSuppliers.map((sup) => (
                    <TableRow key={sup.id} className="hover:bg-primary/[0.02] border-b transition-colors group">
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-black text-lg text-foreground group-hover:text-primary transition-colors">{sup.name}</span>
                          <span className="text-[10px] font-english font-bold text-muted-foreground">{sup.phone || "بدون هاتف"}</span>
                        </div>
                      </TableCell>
                      <TableCell><Badge variant="outline" className={cn("font-bold border-none", DEAL_TYPES.find(d=>d.id===sup.dealType)?.color)}>{DEAL_TYPES.find(d=>d.id===sup.dealType)?.label || sup.dealType}</Badge></TableCell>
                      <TableCell><span className={cn("font-black font-english text-xl", (Number(sup.balance)||0)>0 ? 'text-rose-600' : 'text-emerald-600')}>{Number(sup.balance||0).toLocaleString()} <span className="text-[10px]">ج.م</span></span></TableCell>
                      <TableCell className="text-center print:hidden">
                        <div className="flex justify-center gap-1.5">
                          {canManage && <Button variant="outline" size="sm" className="rounded-xl font-bold h-9 border-emerald-600 text-emerald-600 hover:bg-emerald-50" onClick={() => { setSelectedSupplier(sup); setIsPaymentOpen(true); }}><HandCoins className="h-4 w-4 ml-2" /> سداد</Button>}
                          <Button variant="outline" size="sm" className="rounded-xl font-bold h-9 border-primary/30 text-primary hover:bg-primary/5" onClick={() => handleOpenLedger(sup)}>كشف حساب</Button>
                          {canManage ? (
                            <>
                              <Button variant="ghost" size="icon" title="تصفير الحساب" className="text-amber-600 h-9 w-9 rounded-xl hover:bg-amber-50" onClick={() => { setSupplierToReset(sup); setIsResetOpen(true); }}><RefreshCw className="h-4 w-4" /></Button>
                              <Button variant="ghost" size="icon" className="text-primary h-9 w-9 rounded-xl hover:bg-primary/5" onClick={() => { setEditingSupplier(sup); setIsEditOpen(true); }}><Edit3 className="h-4 w-4" /></Button>
                              <Button variant="ghost" size="icon" className="text-rose-500 h-9 w-9 rounded-xl hover:bg-rose-50" onClick={() => { setSupplierToDelete(sup); setIsDeleteOpen(true); }}><Trash2 className="h-4 w-4" /></Button>
                            </>
                          ) : <Eye className="h-4 w-4 text-muted-foreground opacity-30" />}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                <TableFooter className="bg-primary/5 border-t-2">
                  <TableRow>
                    <TableCell colSpan={2} className="py-8 font-black text-lg text-foreground">إجمالي مديونيات العرض المفلتر</TableCell>
                    <TableCell className="text-right font-black font-english text-3xl text-rose-600">{totalDebts.toLocaleString()} <span className="text-sm">ج.م</span></TableCell>
                    <TableCell className="print:hidden"/>
                  </TableRow>
                </TableFooter>
              </Table>
            </div>
          ) : (
            <div className="p-32 text-center space-y-4">
              <Truck className="h-16 w-16 text-muted-foreground/20 mx-auto" />
              <p className="text-muted-foreground font-bold">لا يوجد موردين مطابقين للبحث.</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isAdvFilterOpen} onOpenChange={setIsAdvFilterOpen}>
        <DialogContent className="sm:max-w-[450px] text-right rounded-[2.5rem]" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black">فلترة الموردين</DialogTitle>
            <DialogDescription className="font-bold">تخصيص العرض حسب نوع التعامل أو حجم المديونية.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-6 py-6">
            <div className="space-y-2 text-right">
              <Label className="font-bold">نظام التعامل</Label>
              <Select value={advFilters.dealType} onValueChange={(v) => setAdvFilters({...advFilters, dealType: v})}>
                <SelectTrigger className="h-12 rounded-xl"><SelectValue placeholder="الكل" /></SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="all" className="font-bold">كل الأنظمة</SelectItem>
                  {DEAL_TYPES.map(d => <SelectItem key={d.id} value={d.id} className="font-bold">{d.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2 text-right"><Label className="font-bold">أقل رصيد</Label><Input type="number" value={advFilters.minBalance} onChange={(e) => setAdvFilters({...advFilters, minBalance: e.target.value})} className="h-12 rounded-xl font-english" /></div>
              <div className="space-y-2 text-right"><Label className="font-bold">أكبر رصيد</Label><Input type="number" value={advFilters.maxBalance} onChange={(e) => setAdvFilters({...advFilters, maxBalance: e.target.value})} className="h-12 rounded-xl font-english" /></div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button onClick={() => setIsAdvFilterOpen(false)} className="bg-primary text-white flex-1 font-black h-12 rounded-xl shadow-lg shadow-primary/20">تطبيق الفلتر</Button>
            <Button variant="outline" onClick={() => { setAdvFilters({dealType: "all", minBalance: "", maxBalance: ""}); setIsAdvFilterOpen(false); }} className="flex-1 font-bold h-12 rounded-xl">إعادة ضبط</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isPaymentOpen} onOpenChange={setIsPaymentOpen}>
        <DialogContent className="sm:max-w-[400px] text-right rounded-[2.5rem]" dir="rtl">
          <DialogHeader><DialogTitle className="text-2xl font-black text-emerald-600">سداد مديونية مورد</DialogTitle></DialogHeader>
          <div className="space-y-6 py-6">
            <div className="p-6 bg-emerald-500/5 rounded-[2.5rem] text-center border border-emerald-500/10 shadow-inner">
              <Label className="font-bold opacity-60 text-xs">إجمالي مديونية {selectedSupplier?.name}</Label>
              <p className="text-3xl font-black font-english text-rose-600 mt-1">{Number(selectedSupplier?.balance || 0).toLocaleString()} <span className="text-sm">ج.م</span></p>
            </div>
            
            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-2">
                <Label className="font-black flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-primary" />
                  تاريخ السداد
                </Label>
                <Input 
                  type="date" 
                  value={paymentDate} 
                  onChange={(e) => setPaymentDate(e.target.value)} 
                  className="h-12 rounded-xl font-english border-primary/20" 
                />
              </div>
              <div className="space-y-2">
                <Label className="font-black">المبلغ المدفوع (كاش)</Label>
                <Input 
                  type="number" 
                  value={paymentAmount} 
                  onChange={(e) => setPaymentAmount(e.target.value)} 
                  className="h-16 text-center text-4xl font-black text-emerald-600 bg-muted/30 border-none rounded-2xl font-english shadow-inner" 
                  placeholder="0.00" 
                  autoFocus 
                />
              </div>
            </div>
          </div>
          <DialogFooter><Button onClick={handleRecordPayment} disabled={loading || !paymentAmount} className="bg-emerald-600 hover:bg-emerald-700 text-white flex-1 h-16 rounded-2xl font-black text-xl shadow-lg shadow-emerald-500/20">{loading ? <Loader2 className="h-6 w-6 animate-spin" /> : "تأكيد السداد وتحديث الخزينة"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="sm:max-w-[500px] text-right rounded-[2.5rem]" dir="rtl">
          <DialogHeader><DialogTitle className="text-2xl font-black flex items-center gap-2"><PlusCircle className="h-6 w-6 text-primary" /> إضافة مورد جديد</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2"><Label className="font-bold">اسم الشركة / المورد</Label><Input value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="h-12 rounded-xl bg-muted/30 border-none font-bold" placeholder="مثال: شركة المتحدون للأدوية" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label className="font-bold">الهاتف</Label><Input value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} className="h-12 rounded-xl font-english" /></div>
              <div className="space-y-2"><Label className="font-bold">نظام التعامل</Label><Select value={formData.dealType} onValueChange={(v) => setFormData({...formData, dealType: v})}><SelectTrigger className="h-12 rounded-xl bg-muted/30 border-none"><SelectValue /></SelectTrigger><SelectContent className="rounded-xl">{DEAL_TYPES.map(d=><SelectItem key={d.id} value={d.id} className="font-bold">{d.label}</SelectItem>)}</SelectContent></Select></div>
            </div>
            <div className="space-y-2"><Label className="font-black text-rose-600">الرصيد الحالي المستحق (مديونية سابقة)</Label><Input type="number" value={formData.balance} onChange={(e) => setFormData({...formData, balance: Number(e.target.value)})} className="h-14 rounded-xl bg-muted/30 border-none font-english text-left font-black text-xl shadow-inner" /></div>
          </div>
          <DialogFooter><Button onClick={handleAddSupplier} disabled={loading || !formData.name} className="bg-primary text-white flex-1 h-14 rounded-2xl font-black shadow-xl shadow-primary/20 text-lg">حفظ بيانات المورد</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-[500px] text-right rounded-[2.5rem]" dir="rtl">
          <DialogHeader><DialogTitle className="text-2xl font-black text-primary">تعديل بيانات المورد</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2"><Label className="font-bold">الاسم</Label><Input value={editingSupplier?.name || ""} onChange={(e) => setEditingSupplier({...editingSupplier, name: e.target.value})} className="h-12 rounded-xl font-bold" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label className="font-bold">الهاتف</Label><Input value={editingSupplier?.phone || ""} onChange={(e) => setEditingSupplier({...editingSupplier, phone: e.target.value})} className="h-12 rounded-xl font-english" /></div>
              <div className="space-y-2"><Label className="font-bold">التعامل</Label><Select value={editingSupplier?.dealType} onValueChange={(v) => setEditingSupplier({...editingSupplier, dealType: v})}><SelectTrigger className="h-12 rounded-xl"><SelectValue /></SelectTrigger><SelectContent className="rounded-xl">{DEAL_TYPES.map(d=><SelectItem key={d.id} value={d.id}>{d.label}</SelectItem>)}</SelectContent></Select></div>
            </div>
            <div className="space-y-2"><Label className="font-bold">الرصيد</Label><Input type="number" value={editingSupplier?.balance || 0} onChange={(e) => setEditingSupplier({...editingSupplier, balance: e.target.value})} className="h-12 rounded-xl font-english text-left font-black" /></div>
          </div>
          <DialogFooter><Button onClick={handleUpdateSupplier} className="bg-primary text-white flex-1 h-12 rounded-xl font-black shadow-lg">حفظ التغييرات</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent className="text-right border-2 border-rose-500 rounded-[2.5rem]" dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-2xl font-black text-rose-600 flex items-center gap-2">
              <Trash2 className="h-6 w-6" /> حذف سجل مورد
            </AlertDialogTitle>
            <AlertDialogDescription className="text-base font-bold mt-2">
              هل أنت متأكد من حذف المورد <b>({supplierToDelete?.name})</b> نهائياً؟ سيتم مسح بياناته من السجل، ولكن ستبقى العمليات المالية السابقة موثقة في الخزينة.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-3 mt-8">
            <AlertDialogAction onClick={handleDeleteSupplier} className="bg-rose-600 text-white flex-1 font-black h-14 rounded-2xl shadow-lg shadow-rose-500/20">نعم، احذف المورد</AlertDialogAction>
            <AlertDialogCancel className="flex-1 font-bold h-14 rounded-2xl border-primary/20">إلغاء</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isResetOpen} onOpenChange={setIsResetOpen}>
        <AlertDialogContent className="text-right border-2 border-amber-500 rounded-[2.5rem]" dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-2xl font-black text-amber-600 flex items-center gap-2">
              <RefreshCw className="h-6 w-6" /> تصفير حساب المورد
            </AlertDialogTitle>
            <AlertDialogDescription className="text-base font-bold mt-2">
              أنت على وشك تصفير حساب <b>({supplierToReset?.name})</b>. 
              <br />
              <b>تحذير:</b> هذا الإجراء سيقوم بمسح كافة الفواتير والسندات المالية المرتبطة بهذا المورد من السجلات لتبدأ صفحة جديدة برصيد (صفر). لا يمكن التراجع عن هذا الإجراء.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-3 mt-8">
            <AlertDialogAction onClick={handleResetSupplier} disabled={loading} className="bg-amber-600 text-white flex-1 font-black h-14 rounded-2xl shadow-lg">
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "نعم، صفر الحساب وامسح السجلات"}
            </AlertDialogAction>
            <AlertDialogCancel className="flex-1 font-bold h-14 rounded-2xl border-primary/20">إلغاء</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function SupplierKPI({ label, value, icon: Icon, color, highlight }: any) {
  const styles: any = { primary: "bg-primary/10 text-primary border-primary/20", rose: "bg-rose-500/10 text-rose-600 border-rose-500/20" }
  return (
    <Card className={cn("border shadow-sm rounded-[2.25rem] transition-all hover:shadow-lg relative overflow-hidden group", highlight && "ring-2 ring-primary ring-offset-2")}>
      <CardContent className="p-6 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className={cn("h-12 w-12 rounded-2xl flex items-center justify-center border shadow-inner transition-transform group-hover:scale-110", styles[color])}>
            <Icon className="h-6 w-6" />
          </div>
          <div className="text-[9px] font-black uppercase tracking-widest bg-muted/50 px-3 py-1 rounded-full text-muted-foreground">تحديث لحظي</div>
        </div>
        <div className="space-y-1">
          <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">{label}</p>
          <div className="flex items-baseline gap-2 flex-wrap">
            <h3 className={cn("text-2xl md:text-3xl font-black font-english tracking-tight", highlight ? "text-primary" : "text-foreground")}>{value}</h3>
            {label.includes('مديونية') && <span className="text-[10px] font-bold text-muted-foreground shrink-0">ج.م</span>}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
