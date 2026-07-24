
"use client"

import { useState, useMemo, useRef } from "react"
import { useFirestore, useUser, useCollection, useMemoFirebase } from "@/firebase"
import { collection, doc, writeBatch, getDocs, query, orderBy } from "firebase/firestore"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle 
} from "@/components/ui/alert-dialog"
import { useToast } from "@/hooks/use-toast"
import { 
  Loader2, 
  Users, 
  Search, 
  Printer, 
  FileSpreadsheet, 
  Wallet,
  Filter,
  FileText,
  HandCoins,
  Eraser,
  Scale,
  History,
  UserPlus,
  Edit3,
  Calendar,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  ArrowUpDown,
  FileDown,
  ScrollText,
  ArrowRight,
  ClipboardCheck,
  CheckSquare,
  Square,
  ShieldCheck,
  Eye,
  Lock
} from "lucide-react"
import { updateDocumentNonBlocking, addDocumentNonBlocking, deleteDocumentNonBlocking } from "@/firebase/non-blocking-updates"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { APP_CONSTANTS } from "@/lib/constants"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import * as XLSX from 'xlsx'
import { cn } from "@/lib/utils"

export function CustomersSection() {
  const firestore = useFirestore()
  const { user } = useUser()
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [activeTab, setActiveTab] = useState("list")
  const [viewMode, setViewMode] = useState<"standard" | "statement" | "consolidated">("standard")
  const [searchTerm, setSearchTerm] = useState("")
  const [valuationSearchTerm, setValuationSearchTerm] = useState("")
  
  const [isCollectionOpen, setIsCollectionOpen] = useState(false)
  const [isWipeOpen, setIsWipeOpen] = useState(false)
  const [isAdvFilterOpen, setIsAdvFilterOpen] = useState(false)
  
  const [loading, setLoading] = useState(false)
  const [importing, setImporting] = useState(false)
  const [operationProgress, setOperationProgress] = useState(0)
  
  const [collectionAmount, setCollectionAmount] = useState("")
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null)
  const [statementCustomer, setStatementCustomer] = useState<any>(null)
  
  // اختيار المطالبات المجمعة
  const [selectedClaimIds, setSelectedClaimIds] = useState<Set<string>>(new Set())

  const [advFilters, setAdvFilters] = useState({ minBalance: "", maxBalance: "" })
  const [sortBy, setSortBy] = useState("balance_desc")

  const [valuationAmount, setValuationAmount] = useState("")
  const [valuationDate, setValuationDate] = useState(new Date().toISOString().split('T')[0])
  
  const [editingValuation, setEditingValuation] = useState<any>(null)
  const [isEditValOpen, setIsEditValOpen] = useState(false)
  const [valToDelete, setValToDelete] = useState<any>(null)
  const [isDelValOpen, setIsDelValOpen] = useState(false)

  const [editingCustomer, setEditingCustomer] = useState<any>(null)
  const [isEditCustOpen, setIsEditCustOpen] = useState(false)

  const activeSysUser = useMemo(() => {
    if (typeof window === 'undefined') return null
    const saved = localStorage.getItem("activeSystemUser")
    return saved ? JSON.parse(saved) : null
  }, [])

  const isManager = activeSysUser?.role === 'admin';
  const isOwner = activeSysUser?.role === 'owner';
  const canManage = isManager; 

  const customersQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null
    return collection(firestore, APP_CONSTANTS.COLLECTIONS.USERS, user.uid, APP_CONSTANTS.COLLECTIONS.CUSTOMERS)
  }, [firestore, user])
  const { data: customers, isLoading } = useCollection(customersQuery)

  const valuationsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null
    return query(collection(firestore, APP_CONSTANTS.COLLECTIONS.USERS, user.uid, APP_CONSTANTS.COLLECTIONS.CUSTOMER_VALUATIONS), orderBy("date", "desc"))
  }, [firestore, user])
  const { data: valuations, isLoading: isValuationsLoading } = useCollection(valuationsQuery)

  const filteredCustomers = useMemo(() => {
    if (!customers) return []
    let result = customers.filter(cust => {
      const matchSearch = cust.name?.toLowerCase().includes(searchTerm.toLowerCase())
      const matchMin = !advFilters.minBalance || (Number(cust.balance) || 0) >= Number(advFilters.minBalance)
      const matchMax = !advFilters.maxBalance || (Number(cust.balance) || 0) <= Number(advFilters.maxBalance)
      return matchSearch && matchMin && matchMax
    })

    result.sort((a, b) => {
      if (sortBy === 'balance_desc') return (Number(b.balance) || 0) - (Number(a.balance) || 0)
      if (sortBy === 'balance_asc') return (Number(a.balance) || 0) - (Number(b.balance) || 0)
      if (sortBy === 'name_asc') return (a.name || "").localeCompare(b.name || "")
      return 0
    })

    return result
  }, [customers, searchTerm, advFilters, sortBy])

  const stats = useMemo(() => {
    const totalDebt = (customers || []).reduce((s, c) => s + (Number(c.balance) || 0), 0)
    const latestTimestamp = (customers || []).reduce((max, item) => {
      const current = item.updatedAt || item.createdAt || ""
      return current > max ? current : max
    }, "")
    let lastUpdate = "---"
    if (latestTimestamp) lastUpdate = latestTimestamp.split('T')[0]
    const lastValDate = valuations && valuations[0] ? valuations[0].date : ""
    if (lastValDate && lastValDate > lastUpdate) lastUpdate = lastValDate
    return { count: customers?.length || 0, debt: totalDebt, lastValuation: valuations && valuations[0] ? Number(valuations[0].totalAmount).toLocaleString() : "0", lastUpdate }
  }, [customers, valuations])

  const handleDownloadTemplate = () => {
    const data = [["اسم العميل", "الرصيد المستحق (اختياري)"]];
    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, "BluePoint_Customers_Template.xlsx");
    toast({ title: "تم تنزيل قالب الاستيراد" });
  }

  const handleExportExcel = () => {
    let exportData: any[] = []
    if (activeTab === 'list' || activeTab === 'claims') {
      exportData = filteredCustomers.map(c => ({ "اسم العميل": c.name, "الرصيد المستحق": c.balance }));
    } else {
      exportData = filteredValuations.map(v => ({ "التاريخ": v.date, "القيمة المجمعة": v.totalAmount, "المسؤول": v.recordedByName }));
    }
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "البيانات");
    XLSX.writeFile(wb, `عملاء_بلو_بوينت_${new Date().toISOString().split('T')[0]}.xlsx`);
    toast({ title: "تم تصدير الإكسيل" });
  }

  const handleRecordCollection = () => {
    if (!canManage || !firestore || !user || !selectedCustomer || !collectionAmount) return
    const amt = Number(collectionAmount)
    const newBalance = (Number(selectedCustomer.balance) || 0) - amt
    updateDocumentNonBlocking(doc(firestore, APP_CONSTANTS.COLLECTIONS.USERS, user.uid, APP_CONSTANTS.COLLECTIONS.CUSTOMERS, selectedCustomer.id), { balance: newBalance, updatedAt: new Date().toISOString() })
    getDocs(collection(firestore, APP_CONSTANTS.COLLECTIONS.USERS, user.uid, APP_CONSTANTS.COLLECTIONS.INCOME_CATS)).then(snap => {
      const cat = snap.docs.find(d => d.data().name.includes("عملاء")) || snap.docs[0]
      if (cat) {
        addDocumentNonBlocking(collection(firestore, APP_CONSTANTS.COLLECTIONS.USERS, user.uid, APP_CONSTANTS.COLLECTIONS.INCOME_CATS, cat.id, APP_CONSTANTS.COLLECTIONS.INCOMES), {
          amount: amt, date: new Date().toISOString().split('T')[0], description: `تحصيل من عميل: ${selectedCustomer.name}`, type: "customer_collection", recordedByName: activeSysUser?.name || "مستخدم", createdAt: new Date().toISOString()
        })
      }
    })
    setIsCollectionOpen(false); setCollectionAmount(""); toast({ title: "تم التحصيل" }); window.dispatchEvent(new CustomEvent('refresh-stats'))
  }

  const handleUpdateCustomer = () => {
    if (!canManage || !firestore || !user || !editingCustomer) return
    updateDocumentNonBlocking(doc(firestore, APP_CONSTANTS.COLLECTIONS.USERS, user.uid, APP_CONSTANTS.COLLECTIONS.CUSTOMERS, editingCustomer.id), { name: editingCustomer.name, balance: Number(editingCustomer.balance), updatedAt: new Date().toISOString() })
    setIsEditCustOpen(false); setEditingCustomer(null); toast({ title: "تم تحديث بيانات العميل" })
  }

  const handleAddValuation = () => {
    if (!canManage || !firestore || !user || !valuationAmount) return
    addDocumentNonBlocking(collection(firestore, APP_CONSTANTS.COLLECTIONS.USERS, user.uid, APP_CONSTANTS.COLLECTIONS.CUSTOMER_VALUATIONS), { totalAmount: Number(valuationAmount), date: valuationDate, recordedByName: activeSysUser?.name || "موظف", createdAt: new Date().toISOString() }).then(() => {
      setValuationAmount(""); toast({ title: "تم تسجيل تدقيق المديونية" })
    })
  }

  const handleUpdateValuation = () => {
    if (!canManage || !firestore || !user || !editingValuation) return
    updateDocumentNonBlocking(doc(firestore, APP_CONSTANTS.COLLECTIONS.USERS, user.uid, APP_CONSTANTS.COLLECTIONS.CUSTOMER_VALUATIONS, editingValuation.id), { totalAmount: Number(editingValuation.totalAmount), date: editingValuation.date, updatedAt: new Date().toISOString() })
    setIsEditValOpen(false); setEditingValuation(null); toast({ title: "تم تحديث التدقيق" })
  }

  const handleDeleteValuation = () => {
    if (!canManage || !firestore || !user || !valToDelete) return
    deleteDocumentNonBlocking(doc(firestore, APP_CONSTANTS.COLLECTIONS.USERS, user.uid, APP_CONSTANTS.COLLECTIONS.CUSTOMER_VALUATIONS, valToDelete.id))
    setIsDelValOpen(false); setValToDelete(null); toast({ title: "تم حذف السجل" })
  }

  const handleWipeCustomers = async () => {
    if (!canManage || !firestore || !user) return
    setLoading(true)
    try {
      const snap = await getDocs(collection(firestore, APP_CONSTANTS.COLLECTIONS.USERS, user.uid, APP_CONSTANTS.COLLECTIONS.CUSTOMERS))
      let batch = writeBatch(firestore); let count = 0
      for (const d of snap.docs) { batch.delete(d.ref); count++; if (count >= 450) { await batch.commit(); batch = writeBatch(firestore); count = 0 } }
      if (count > 0) await batch.commit()
      setIsWipeOpen(false); toast({ title: "تم حذف السجل بالكامل" })
    } finally { setLoading(false) }
  }

  const handleImportExcel = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!canManage || importing) return
    if (customers && customers.length > 0) { toast({ variant: "destructive", title: "لا يمكن الاستيراد", description: "يجب تصفير السجل أولاً." }); return }
    const file = event.target.files?.[0]
    if (!file || !firestore || !user) return
    setImporting(true); setOperationProgress(0)
    const reader = new FileReader()
    reader.onload = async (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer); const workbook = XLSX.read(data, { type: 'array' }); const worksheet = workbook.Sheets[workbook.SheetNames[0]]; const jsonData: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 }); const rows = jsonData.slice(1).filter(row => row[0]); const total = rows.length; let processed = 0, batch = writeBatch(firestore), bCount = 0
        for (const row of rows) {
          const itemRef = doc(collection(firestore, "users", user.uid, "customers"))
          batch.set(itemRef, { name: String(row[0]).trim(), balance: Number(row[1]) || 0, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() })
          bCount++; processed++; if (bCount === 400) { await batch.commit(); batch = writeBatch(firestore); bCount = 0; setOperationProgress(Math.round((processed / total) * 100)) }
        }
        if (bCount > 0) await batch.commit(); setOperationProgress(100); toast({ title: "اكتمل الاستيراد" })
      } catch (err) { toast({ variant: "destructive", title: "فشل الاستيراد" }) }
      finally { setImporting(false); if (fileInputRef.current) fileInputRef.current.value = "" }
    }
    reader.readAsArrayBuffer(file)
  }

  const filteredValuations = useMemo(() => {
    if (!valuations) return []
    return valuations.filter(v => v.date?.includes(valuationSearchTerm) || v.recordedByName?.toLowerCase().includes(valuationSearchTerm.toLowerCase()))
  }, [valuations, valuationSearchTerm])

  const consolidatedCustomers = useMemo(() => { if (!customers || selectedClaimIds.size === 0) return []; return customers.filter(c => selectedClaimIds.has(c.id)) }, [customers, selectedClaimIds])
  const consolidatedTotal = useMemo(() => { return consolidatedCustomers.reduce((s, c) => s + (Number(c.balance) || 0), 0) }, [consolidatedCustomers])

  if (viewMode === 'statement') {
    return (
      <div className="space-y-8 pb-20 animate-in fade-in" dir="rtl">
        <div className="flex justify-between items-center px-4 print:hidden"><Button variant="ghost" onClick={() => setViewMode("standard")} className="gap-2 font-black rounded-xl hover:bg-primary/10"><ArrowRight className="h-5 w-5" /> العودة لسجل العملاء</Button><Button onClick={() => window.print()} className="h-12 rounded-2xl bg-emerald-600 text-white font-black px-8 shadow-lg gap-2"><Printer className="h-5 w-5" /> طباعة كشف المطالبة</Button></div>
        <Card className="bg-white text-slate-950 p-10 shadow-2xl rounded-[3.5rem] max-w-[900px] mx-auto border print:p-0">
          <div className="flex justify-between items-start border-b-4 border-slate-900 pb-10 mb-10"><div className="flex items-center gap-5"><div className="h-16 w-16 rounded-2xl bg-slate-900 flex items-center justify-center text-white border-[3px] border-blue-800"><ScrollText className="h-8 w-8" /></div><div className="text-right space-y-1"><h1 className="text-4xl font-black text-slate-900">كشف مطالبة مالية</h1><p className="text-slate-500 font-bold text-lg">العميل: {statementCustomer?.name}</p><p className="text-xs text-slate-400 font-english">تاريخ الاستخراج: {new Date().toLocaleDateString('ar-EG')}</p></div></div><div className="p-8 rounded-[2.5rem] bg-slate-900 text-white text-center shadow-xl min-w-[200px]"><p className="text-[10px] font-black uppercase opacity-60 mb-2">إجمالي المديونية المستحقة</p><p className="text-5xl font-black font-english">{Number(statementCustomer?.balance || 0).toLocaleString()}</p><p className="text-[10px] font-bold mt-2">جنيه مصري</p></div></div>
          <div className="space-y-10"><div className="p-8 rounded-3xl bg-slate-50 border-2 border-slate-100"><h3 className="text-xl font-black mb-4">تفاصيل المطالبة:</h3><p className="text-lg leading-relaxed text-slate-700">يرجى العلم بأن الرصيد المستحق على ذمتكم لصالح الصيدلية حتى تاريخه هو مبلغ وقدره <span className="font-black text-slate-900 mx-2 text-2xl font-english">({Number(statementCustomer?.balance || 0).toLocaleString()})</span> جنيهاً مصرياً لا غير.</p></div><div className="grid grid-cols-2 gap-8"><div className="p-6 rounded-2xl border border-dashed border-slate-300"><p className="text-xs font-black text-slate-400 mb-4 uppercase">ملاحظات إدارية</p><p className="text-sm text-slate-500 italic">يتم تحديث الأرصدة تلقائياً عند كل عملية تحصيل نقدي موثقة.</p></div><div className="p-6 rounded-2xl border border-dashed border-slate-300"><p className="text-xs font-black text-slate-400 mb-4 uppercase">طرق السداد المتاحة</p><p className="text-sm text-slate-500">نقداً في مقر الصيدلية / تحويل بنكي / محافظ إلكترونية.</p></div></div></div>
          <div className="mt-32 p-8 border-t-2 border-dashed border-slate-200 text-center space-y-2"><p className="text-xs font-black text-slate-400">BluePointPharma v2.6 - Professional Accounting</p><div className="flex justify-around pt-10"><div className="text-center"><div className="h-px w-32 bg-slate-300 mb-2"></div><p className="text-[10px] font-bold">توقيع المحاسب</p></div><div className="text-center"><div className="h-px w-32 bg-slate-300 mb-2"></div><p className="text-[10px] font-bold">ختم الصيدلية الرسمي</p></div></div></div>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-8 pb-20 px-4 md:px-0" dir="rtl">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 print:hidden">
        <div className="space-y-1"><h2 className="text-3xl font-black text-foreground flex items-center gap-3"><Users className="h-8 w-8 text-primary" /> إدارة العملاء والديون</h2><p className="text-muted-foreground font-medium">متابعة أرصدة الآجل وتدقيق حجم المديونية الكلية.</p></div>
        <div className="flex flex-wrap items-center gap-2">
          {canManage && <Button onClick={() => setIsWipeOpen(true)} variant="outline" className="h-12 rounded-xl text-rose-600 font-bold border-rose-200 hover:bg-rose-50"><Eraser className="h-4 w-4" /> حذف السجل</Button>}
          <Button onClick={handleExportExcel} variant="outline" className="h-12 rounded-xl border-emerald-200 font-bold gap-2 text-emerald-700 hover:bg-emerald-50"><FileSpreadsheet className="h-4 w-4" /> تصدير إكسيل</Button>
          <Button onClick={() => window.print()} variant="outline" className="h-12 rounded-xl font-bold gap-2"><Printer className="h-4 w-4" /> طباعة</Button>
        </div>
      </div>

      <div className="grid gap-4 grid-cols-1 md:grid-cols-4 print:hidden">
        <StatsKPI label="إجمالي العملاء" value={stats.count} icon={Users} color="primary" />
        <StatsKPI label="مديونية النظام" value={stats.debt.toLocaleString()} icon={Wallet} color="rose" highlight />
        <StatsKPI label="آخر تدقيق مالي" value={stats.lastValuation} icon={Scale} color="primary" />
        <StatsKPI label="تاريخ آخر تحديث" value={stats.lastUpdate} icon={Calendar} color="amber" />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-muted/50 p-1.5 rounded-2xl h-auto gap-1 mb-6 print:hidden">
          <TabsTrigger value="list" className="rounded-xl px-8 py-3 font-black text-xs">سجل الأرصدة</TabsTrigger>
          <TabsTrigger value="claims" className="rounded-xl px-8 py-3 font-black text-xs gap-2"><ClipboardCheck className="h-4 w-4" /> مطالبات العملاء</TabsTrigger>
          <TabsTrigger value="audit" className="rounded-xl px-8 py-3 font-black text-xs">تدقيق المديونية الكلية</TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="space-y-6">
          <Card className="border shadow-xl bg-card rounded-[2.5rem] overflow-hidden">
            <CardHeader className="bg-muted/30 p-6 flex flex-col md:flex-row items-center justify-between gap-4 print:hidden">
              <div className="flex items-center gap-3"><FileText className="h-5 w-5 text-primary" /><CardTitle className="text-xl font-black">دفتر المديونيات</CardTitle></div>
              <div className="flex flex-wrap items-center gap-3 w-full md:w-auto print:hidden">
                <div className="relative flex-1 md:w-64"><Search className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" /><Input placeholder="بحث..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="h-10 pr-10 rounded-xl font-bold bg-background shadow-inner border-none" /></div>
                {canManage && (
                  <div className="flex gap-1.5">
                    <Button variant="outline" size="icon" onClick={handleDownloadTemplate} className="h-10 w-10 rounded-xl bg-background border-primary/20"><FileDown className="h-4 w-4 text-primary" /></Button>
                    <input type="file" ref={fileInputRef} className="hidden" accept=".xlsx, .xls" onChange={handleImportExcel} />
                    <Button onClick={() => fileInputRef.current?.click()} disabled={isLoading || importing || (customers && customers.length > 0)} className="h-10 rounded-xl bg-primary text-white font-black px-4 shadow-md active:scale-95 disabled:opacity-50"><UserPlus className="h-4 w-4 ml-2" /> استيراد</Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader><TableRow className="bg-muted/30 border-b-2"><TableHead className="text-right py-5 font-black">اسم العميل</TableHead><TableHead className="text-right font-black">الرصيد المستحق</TableHead><TableHead className="text-center print:hidden font-black">إجراءات</TableHead></TableRow></TableHeader>
                <TableBody>
                  {isLoading ? <TableRow><TableCell colSpan={3} className="p-20 text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" /></TableCell></TableRow> : filteredCustomers.length > 0 ? filteredCustomers.map(cust => (
                    <TableRow key={cust.id} className="hover:bg-primary/[0.02] border-b group">
                      <TableCell className="text-right py-6 font-black text-lg">{cust.name}</TableCell>
                      <TableCell className="text-right"><span className={cn("font-black font-english text-xl", (Number(cust.balance) || 0) > 0 ? 'text-rose-600' : 'text-emerald-600')}>{Number(cust.balance || 0).toLocaleString()} <span className="text-[10px]">ج.م</span></span></TableCell>
                      <TableCell className="text-center print:hidden">
                        <div className="flex justify-center gap-2">
                          {canManage ? (
                            <>
                              <Button variant="outline" size="sm" className="rounded-xl font-bold h-10 px-4 border-emerald-600 text-emerald-600 hover:bg-emerald-50" onClick={() => { setSelectedCustomer(cust); setIsCollectionOpen(true); }}><HandCoins className="h-4 w-4 ml-2" /> تحصيل</Button>
                              <Button variant="ghost" size="icon" className="text-primary h-10 w-10" onClick={() => { setEditingCustomer(cust); setIsEditCustOpen(true); }}><Edit3 className="h-4 w-4" /></Button>
                            </>
                          ) : <Eye className="h-4 w-4 text-muted-foreground opacity-30" />}
                        </div>
                      </TableCell>
                    </TableRow>
                  )) : <TableRow><TableCell colSpan={3} className="p-20 text-center font-bold text-muted-foreground">لا يوجد عملاء.</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audit" className="space-y-8">
          <div className="grid gap-8 lg:grid-cols-12">
            <div className="lg:col-span-4">
              <Card className={cn("border shadow-xl bg-card rounded-[2.5rem] overflow-hidden sticky top-24", isOwner && "opacity-60")}>
                {isOwner ? (
                  <div className="p-12 text-center space-y-4">
                    <div className="h-16 w-16 rounded-[2rem] bg-emerald-500/10 flex items-center justify-center mx-auto text-emerald-600 shadow-inner">
                      <ShieldCheck className="h-8 w-8" />
                    </div>
                    <p className="font-black text-emerald-700">رقابة تدقيق المديونيات</p>
                    <p className="text-xs text-muted-foreground font-bold leading-relaxed">بصفتك صاحب الصيدلية، تظهر لك سجلات التحقق المالي من إجمالي مديونيات العملاء للاطلاع فقط.</p>
                  </div>
                ) : canManage ? (
                  <>
                    <CardHeader className="bg-primary/5 p-6 border-b"><CardTitle className="font-black flex gap-2"><Scale className="h-5 w-5 text-primary" /> تسجيل تدقيق مديونية</CardTitle></CardHeader>
                    <CardContent className="p-6 space-y-5">
                      <div className="space-y-2"><Label className="font-bold">تاريخ التدقيق</Label><Input type="date" value={valuationDate} onChange={e => setValuationDate(e.target.value)} className="h-12 rounded-xl bg-muted/30 border-none font-english" /></div>
                      <div className="space-y-2"><Label className="font-black text-primary">إجمالي المبلغ لدى العملاء (ج.م)</Label><Input type="number" value={valuationAmount} onChange={e => setValuationAmount(e.target.value)} placeholder="0.00" className="h-16 text-3xl font-black text-primary text-left font-english shadow-inner rounded-2xl border-none bg-muted/30" /></div>
                      <Button onClick={handleAddValuation} disabled={!valuationAmount} className="w-full h-14 bg-primary text-white rounded-2xl font-black shadow-lg">اعتماد التدقيق المالي</Button>
                    </CardContent>
                  </>
                ) : <div className="p-16 text-center opacity-30"><Lock className="h-12 w-12 mx-auto" /></div>}
              </Card>
            </div>
            <div className="lg:col-span-8">
              <Card className="border shadow-xl bg-card rounded-[2.5rem] overflow-hidden">
                <CardHeader className="bg-muted/30 border-b p-6 flex flex-col md:flex-row items-center justify-between gap-4"><CardTitle className="font-black flex gap-2"><History className="h-5 w-5 text-primary" /> سجل التدقيقات التاريخي</CardTitle></CardHeader>
                <CardContent className="p-0">
                  <Table className="ledger-table">
                    <TableHeader><TableRow className="bg-muted/50 border-b-2"><TableHead className="text-right py-6 font-black">التاريخ</TableHead><TableHead className="text-right font-black">المسؤول</TableHead><TableHead className="text-right font-black">القيمة المالية</TableHead><TableHead className="text-center font-black">إجراءات</TableHead></TableRow></TableHeader>
                    <TableBody>{filteredValuations.map(v => (<TableRow key={v.id} className="border-b hover:bg-primary/[0.01]"><TableCell className="text-right font-english font-black py-5">{v.date}</TableCell><TableCell className="text-right font-bold">{v.recordedByName}</TableCell><TableCell className="text-right font-black text-2xl text-primary font-english">{Number(v.totalAmount).toLocaleString()} ج.م</TableCell><TableCell className="text-center">{canManage ? <div className="flex justify-center gap-1"><Button variant="ghost" size="icon" onClick={() => { setEditingValuation(v); setIsEditValOpen(true); }}><Edit3 className="h-4 w-4" /></Button><Button variant="ghost" size="icon" className="text-rose-500" onClick={() => { setValToDelete(v); setIsDelValOpen(true); }}><Trash2 className="h-4 w-4" /></Button></div> : <Eye className="h-4 w-4 text-muted-foreground opacity-30" />}</TableCell></TableRow>))}</TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={isEditCustOpen} onOpenChange={setIsEditCustOpen}>
        <DialogContent className="sm:max-w-[450px] text-right rounded-[2.5rem]" dir="rtl"><DialogHeader><DialogTitle className="text-2xl font-black text-primary">تعديل بيانات العميل</DialogTitle></DialogHeader><div className="grid gap-6 py-6"><div className="space-y-2"><Label className="font-bold">اسم العميل</Label><Input value={editingCustomer?.name || ""} onChange={e => setEditingCustomer({...editingCustomer, name: e.target.value})} className="h-12 rounded-xl" /></div><div className="space-y-2"><Label className="font-bold">الرصيد الحالي (ج.م)</Label><Input type="number" value={editingCustomer?.balance || 0} onChange={e => setEditingCustomer({...editingCustomer, balance: e.target.value})} className="h-12 rounded-xl font-english text-left font-black" /></div></div><DialogFooter><Button onClick={handleUpdateCustomer} className="bg-primary text-white flex-1 h-14 rounded-2xl font-black text-lg shadow-lg">حفظ التغييرات</Button></DialogFooter></DialogContent>
      </Dialog>

      <Dialog open={isCollectionOpen} onOpenChange={setIsCollectionOpen}>
        <DialogContent className="sm:max-w-[400px] text-right rounded-[2.5rem]" dir="rtl"><DialogHeader><DialogTitle className="text-2xl font-black text-emerald-600">تحصيل مديونية</DialogTitle></DialogHeader><div className="space-y-6 py-6"><div className="p-8 bg-emerald-500/5 rounded-[2rem] text-center border shadow-inner"><Label className="font-bold opacity-60 text-xs">الرصيد المستحق على {selectedCustomer?.name}</Label><p className="text-4xl font-black font-english text-emerald-600 mt-2">{Number(selectedCustomer?.balance || 0).toLocaleString()} <span className="text-sm">ج.م</span></p></div><div className="space-y-3"><Label className="font-black">المبلغ المستلم (نقداً)</Label><Input type="number" value={collectionAmount} onChange={(e) => setCollectionAmount(e.target.value)} className="h-20 text-center text-4xl font-black text-emerald-600 bg-muted/30 border-none rounded-2xl shadow-inner" placeholder="0.00" autoFocus /></div></div><DialogFooter><Button onClick={handleRecordCollection} className="bg-emerald-600 hover:bg-emerald-700 text-white flex-1 h-16 rounded-2xl font-black text-xl shadow-lg">اعتماد التحصيل</Button></DialogFooter></DialogContent>
      </Dialog>

      <AlertDialog open={isWipeOpen} onOpenChange={setIsWipeOpen}><AlertDialogContent className="text-right border-2 border-rose-500 rounded-[2.5rem]" dir="rtl"><AlertDialogHeader><AlertDialogTitle className="text-2xl font-black text-rose-600">حذف شامل لسجل العملاء</AlertDialogTitle><AlertDialogDescription className="font-bold text-base mt-2">هل أنت متأكد؟ لا يمكن التراجع.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter className="gap-3 mt-8"><AlertDialogAction onClick={handleWipeCustomers} disabled={loading} className="bg-rose-600 text-white flex-1 h-14 rounded-2xl font-black">{loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "نعم، احذف بالكامل"}</AlertDialogAction><AlertDialogCancel className="flex-1 h-14 rounded-2xl font-bold">إلغاء</AlertDialogCancel></AlertDialogFooter></AlertDialogContent></AlertDialog>
    </div>
  )
}

function StatsKPI({ label, value, icon: Icon, color, highlight }: any) {
  const styles: any = { primary: "bg-primary/10 text-primary border-primary/20", rose: "bg-rose-500/10 text-rose-600 border-rose-500/20", amber: "bg-amber-500/10 text-amber-600 border-amber-500/20" }
  return (
    <Card className={cn("border shadow-sm rounded-[2.25rem] transition-all hover:shadow-lg relative overflow-hidden group", highlight && "ring-2 ring-primary ring-offset-2")}>
      <CardContent className="p-6 flex flex-col gap-4">
        <div className="flex items-center justify-between"><div className={cn("h-12 w-12 rounded-2xl flex items-center justify-center border shadow-inner transition-transform group-hover:scale-110", styles[color])}><Icon className="h-6 w-6" /></div><div className="text-[9px] font-black uppercase tracking-widest bg-muted/50 px-3 py-1 rounded-full text-muted-foreground">تحديث لحظي</div></div>
        <div className="space-y-1"><p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">{label}</p><div className="flex items-baseline gap-2 flex-wrap"><h3 className={cn("text-2xl md:text-3xl font-black font-english tracking-tight", highlight ? "text-primary" : "text-foreground")}>{value}</h3>{(label.includes('مديونية') || label.includes('تدقيق')) && <span className="text-[10px] font-bold text-muted-foreground shrink-0">ج.م</span>}</div></div>
      </CardContent>
    </Card>
  )
}
