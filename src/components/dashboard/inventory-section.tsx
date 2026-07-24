
"use client"

import { useState, useMemo, useRef } from "react"
import { useFirestore, useUser, useCollection, useMemoFirebase } from "@/firebase"
import { collection, doc, writeBatch, getDocs, orderBy, query } from "firebase/firestore"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { 
  Loader2, 
  Package, 
  Search, 
  FileSpreadsheet, 
  Trash2, 
  Printer,
  Boxes,
  History,
  Eraser,
  Scale,
  Download,
  PackagePlus,
  Calendar,
  AlertCircle,
  ClipboardList,
  PlusCircle,
  ShoppingCart,
  Filter,
  TrendingUp,
  Edit3,
  ShieldCheck,
  Eye,
  Lock
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { deleteDocumentNonBlocking, addDocumentNonBlocking, updateDocumentNonBlocking } from "@/firebase/non-blocking-updates"
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { APP_CONSTANTS } from "@/lib/constants"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import * as XLSX from 'xlsx'
import { cn } from "@/lib/utils"

export function InventorySection() {
  const firestore = useFirestore()
  const { user } = useUser()
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [activeTab, setActiveTab] = useState("list")
  const [searchTerm, setSearchTerm] = useState("")
  const [isAdvFilterOpen, setIsAdvFilterOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [importing, setImporting] = useState(false)
  const [operationProgress, setOperationProgress] = useState(0)
  
  const [advFilters, setAdvFilters] = useState({
    expiryStatus: "all",
    stockStatus: "all"
  })

  const [isWipeOpen, setIsWipeOpen] = useState(false)
  const [isManualAddOpen, setIsAddManualOpen] = useState(false)
  const [manualShortageData, setManualShortageData] = useState({ name: "", supplier: "", notes: "" })

  const [valuationAmount, setValuationAmount] = useState("")
  const [valuationDate, setValuationAmountDate] = useState(new Date().toISOString().split('T')[0])
  const [editingValuation, setEditingValuation] = useState<any>(null)
  const [isEditValOpen, setIsEditValOpen] = useState(false)
  const [valToDelete, setValToDelete] = useState<any>(null)
  const [isDelValOpen, setIsDelValOpen] = useState(false)

  const [selectedForOrder, setSelectedForOrder] = useState<Set<string>>(new Set())

  const activeSysUser = useMemo(() => {
    if (typeof window === 'undefined') return null
    const saved = localStorage.getItem("activeSystemUser")
    return saved ? JSON.parse(saved) : null
  }, [])

  const isManager = activeSysUser?.role === 'admin';
  const isOwner = activeSysUser?.role === 'owner';
  const canManage = isManager;

  const inventoryQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null
    return collection(firestore, APP_CONSTANTS.COLLECTIONS.USERS, user.uid, APP_CONSTANTS.COLLECTIONS.INVENTORY)
  }, [firestore, user])
  const { data: inventory, isLoading } = useCollection(inventoryQuery)

  const valuationsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null
    return query(collection(firestore, APP_CONSTANTS.COLLECTIONS.USERS, user.uid, APP_CONSTANTS.COLLECTIONS.INVENTORY_VALUATIONS), orderBy("date", "desc"))
  }, [firestore, user])
  const { data: valuations } = useCollection(valuationsQuery)

  const manualShortagesQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null
    return collection(firestore, APP_CONSTANTS.COLLECTIONS.USERS, user.uid, APP_CONSTANTS.COLLECTIONS.SHORTAGES)
  }, [firestore, user])
  const { data: manualShortages } = useCollection(manualShortagesQuery)

  const stats = useMemo(() => {
    if (!inventory) return { total: 0, outOfStock: 0, totalPublicValue: 0, lastValuation: "0", lastUpdate: "---" }
    
    const totalPublicValue = inventory.reduce((sum, item) => sum + (Number(item.totalPublicValue) || 0), 0)
    
    const latestTimestamp = inventory.reduce((max, item) => {
      const current = item.updatedAt || item.createdAt || ""
      return current > max ? current : max
    }, "")

    let lastUpdate = "---"
    if (latestTimestamp) {
      lastUpdate = latestTimestamp.split('T')[0]
    } else if (valuations && valuations[0]) {
      lastUpdate = valuations[0].date
    }

    return {
      total: inventory.length,
      outOfStock: inventory.filter(i => (Number(i.packages) || 0) <= 0 && (Number(i.parts) || 0) <= 0).length,
      totalPublicValue,
      lastValuation: valuations && valuations[0] ? Number(valuations[0].amount).toLocaleString() : "0",
      lastUpdate
    }
  }, [inventory, valuations])

  const filteredInventory = useMemo(() => {
    if (!inventory) return []
    const today = new Date()
    const nearExpiryLimit = new Date(); nearExpiryLimit.setDate(today.getDate() + 90)

    return inventory.filter(item => {
      const matchSearch = item.name?.toLowerCase().includes(searchTerm.toLowerCase())
      
      let matchExpiry = true
      if (advFilters.expiryStatus === 'expired') {
        matchExpiry = item.expiryDate && new Date(item.expiryDate) < today
      } else if (advFilters.expiryStatus === 'near') {
        const d = new Date(item.expiryDate)
        matchExpiry = d >= today && d <= nearExpiryLimit
      }

      let matchStock = true
      const hasStock = (Number(item.packages) || 0) > 0 || (Number(item.parts) || 0) > 0
      if (advFilters.stockStatus === 'out') matchStock = !hasStock
      else if (advFilters.stockStatus === 'low') matchStock = hasStock && (Number(item.packages) || 0) < 5

      return matchSearch && matchExpiry && matchStock
    }).sort((a, b) => (a.name || "").localeCompare(b.name || ""))
  }, [inventory, searchTerm, advFilters])

  const autoShortages = useMemo(() => {
    if (!inventory) return []
    return inventory.filter(i => (Number(i.packages) || 0) <= 0 && (Number(i.parts) || 0) <= 0)
  }, [inventory])

  const handleDownloadTemplate = () => {
    const headers = [["إسم الصنف", "سعر البيع", "تاريخ الصلاحية", "العبوات", "الوحدات", "القيمة الإجمالية جمهور"]];
    const ws = XLSX.utils.aoa_to_sheet(headers);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Inventory Template");
    XLSX.writeFile(wb, "BluePoint_Inventory_Template.xlsx");
    toast({ title: "تم تنزيل قالب المخزون" });
  }

  const handleExportExcel = () => {
    let exportData: any[] = []
    if (activeTab === 'list') {
      exportData = filteredInventory.map(i => ({
        "إسم الصنف": i.name,
        "سعر البيع": i.price,
        "تاريخ الصلاحية": i.expiryDate,
        "العبوات": i.packages,
        "الوحدات": i.parts,
        "القيمة الإجمالية جمهور": i.totalPublicValue
      }));
    } else if (activeTab === 'shortages') {
      exportData = manualShortages?.map(s => ({ "إسم الصنف": s.name, "المورد": s.supplier, "ملاحظات": s.notes })) || []
    } else {
      exportData = valuations?.map(v => ({ "التاريخ": v.date, "المسؤول": v.recordedByName, "القيمة (تكلفة)": v.amount })) || []
    }
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "المخزون");
    XLSX.writeFile(wb, `مخزون_بلو_بوينت_${new Date().toISOString().split('T')[0]}.xlsx`);
    toast({ title: "تم تصدير الإكسيل" });
  }

  const parseExcelDate = (val: any) => {
    if (typeof val === 'number') {
      const date = new Date(Math.round((val - 25569) * 86400 * 1000));
      return date.toISOString().split('T')[0];
    }
    return String(val || "").trim();
  };

  const cleanNumeric = (val: any) => {
    if (typeof val === 'number') return val;
    if (!val) return 0;
    const cleaned = String(val).replace(/[^0-9.]/g, "");
    return Number(cleaned) || 0;
  };

  const handleImportExcel = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!canManage || importing) return
    if (inventory && inventory.length > 0) {
      toast({ variant: "destructive", title: "لا يمكن الاستيراد", description: "يجب تصفير المخزن الحالي أولاً لمنع تكرار البيانات." });
      return;
    }

    const file = event.target.files?.[0]
    if (!file || !firestore || !user) return
    
    setImporting(true); 
    setOperationProgress(0);
    
    const reader = new FileReader()
    reader.onload = async (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer)
        const workbook = XLSX.read(data, { type: 'array' })
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        const rows = jsonData.slice(1).filter(row => row && row.length > 0 && (row[0] || row[1] || row[3]));
        const totalRows = rows.length;

        if (totalRows === 0) {
          setImporting(false);
          toast({ variant: "destructive", title: "ملف فارغ" });
          return;
        }

        let successCount = 0;
        const now = new Date().toISOString();
        const batchSize = 300; 

        const chunks = [];
        for (let i = 0; i < totalRows; i += batchSize) {
          chunks.push(rows.slice(i, i + batchSize));
        }

        for (let i = 0; i < chunks.length; i++) {
          const chunk = chunks[i];
          const batch = writeBatch(firestore);
          
          chunk.forEach((row) => {
            const itemRef = doc(collection(firestore, APP_CONSTANTS.COLLECTIONS.USERS, user.uid, APP_CONSTANTS.COLLECTIONS.INVENTORY));
            batch.set(itemRef, { 
              name: String(row[0] || "صنف بدون اسم").trim(), 
              price: cleanNumeric(row[1]),
              expiryDate: parseExcelDate(row[2]),
              packages: cleanNumeric(row[3]), 
              parts: cleanNumeric(row[4]), 
              totalPublicValue: cleanNumeric(row[5]),
              createdAt: now,
              updatedAt: now
            });
          });

          await batch.commit();
          successCount += chunk.length;
          setOperationProgress(Math.round(((i + 1) / chunks.length) * 100));
          await new Promise(resolve => setTimeout(resolve, 250));
        }
        
        toast({ title: "اكتمل الاستيراد", description: `تم حفظ ${successCount} صنفاً.` });
        window.dispatchEvent(new CustomEvent('refresh-stats'));
      } catch (err) { 
        toast({ variant: "destructive", title: "فشل الاستيراد" });
      } finally { 
        setImporting(false); 
        if (fileInputRef.current) fileInputRef.current.value = ""; 
      }
    }
    reader.readAsArrayBuffer(file)
  }

  const handleWipeInventory = async () => {
    if (!canManage || !firestore || !user || loading) return
    setLoading(true)
    setOperationProgress(0)
    try {
      const snap = await getDocs(collection(firestore, APP_CONSTANTS.COLLECTIONS.USERS, user.uid, APP_CONSTANTS.COLLECTIONS.INVENTORY))
      const totalDocs = snap.docs.length
      const batchSize = 450;
      let processed = 0;
      for (let i = 0; i < totalDocs; i += batchSize) {
        const chunk = snap.docs.slice(i, i + batchSize)
        const batch = writeBatch(firestore)
        chunk.forEach(d => batch.delete(d.ref))
        await batch.commit()
        processed += chunk.length
        setOperationProgress(Math.round((processed / totalDocs) * 100))
        await new Promise(resolve => setTimeout(resolve, 150));
      }
      setIsWipeOpen(false); 
      toast({ title: "تم مسح المخزن بنجاح" })
      window.dispatchEvent(new CustomEvent('refresh-stats'))
    } finally {
      setLoading(false)
    }
  }

  const handleAddValuation = () => {
    if (!canManage || !firestore || !user || !valuationAmount) return
    addDocumentNonBlocking(collection(firestore, APP_CONSTANTS.COLLECTIONS.USERS, user.uid, APP_CONSTANTS.COLLECTIONS.INVENTORY_VALUATIONS), {
      amount: Number(valuationAmount),
      date: valuationDate,
      recordedByName: activeSysUser?.name || "موظف",
      createdAt: new Date().toISOString()
    }).then(() => {
      setValuationAmount(""); toast({ title: "تم تسجيل القيمة" }); window.dispatchEvent(new CustomEvent('refresh-stats'));
    })
  }

  const handleUpdateValuation = () => {
    if (!canManage || !firestore || !user || !editingValuation) return
    updateDocumentNonBlocking(doc(firestore, APP_CONSTANTS.COLLECTIONS.USERS, user.uid, APP_CONSTANTS.COLLECTIONS.INVENTORY_VALUATIONS, editingValuation.id), {
      amount: Number(editingValuation.amount),
      date: editingValuation.date,
      updatedAt: new Date().toISOString()
    })
    setIsEditValOpen(false); setEditingValuation(null); toast({ title: "تم تحديث التقييم" })
  }

  const handleDeleteValuation = () => {
    if (!canManage || !firestore || !user || !valToDelete) return
    deleteDocumentNonBlocking(doc(firestore, APP_CONSTANTS.COLLECTIONS.USERS, user.uid, APP_CONSTANTS.COLLECTIONS.INVENTORY_VALUATIONS, valToDelete.id))
    setIsDelValOpen(false); setValToDelete(null); toast({ title: "تم حذف السجل" })
  }

  const handleAddManualShortage = () => {
    if (!firestore || !user || !manualShortageData.name) return
    addDocumentNonBlocking(collection(firestore, APP_CONSTANTS.COLLECTIONS.USERS, user.uid, APP_CONSTANTS.COLLECTIONS.SHORTAGES), {
      ...manualShortageData,
      createdAt: new Date().toISOString()
    }).then(() => {
      setManualShortageData({ name: "", supplier: "", notes: "" }); setIsAddManualOpen(false); toast({ title: "تمت إضافة الطلب" })
    })
  }

  return (
    <div className="space-y-8 pb-20 px-4 md:px-0" dir="rtl">
      {(importing || loading) && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-6">
          <Card className="max-w-md w-full border-none shadow-2xl bg-white dark:bg-slate-900 rounded-[2rem] p-10 space-y-6 animate-in zoom-in duration-300">
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
              </div>
              <div className="space-y-1">
                <h3 className="text-xl font-black">{importing ? "جاري مزامنة المخزن..." : "جاري تطهير قاعدة البيانات..."}</h3>
                <p className="text-xs font-bold text-muted-foreground leading-relaxed">يرجى الانتظار حتى اكتمال 100%. يتم التعامل مع السحابة بدفعات ذرية (Atomic).</p>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-[10px] font-black uppercase"><span>تقدم العملية</span><span>{operationProgress}%</span></div>
              <Progress value={operationProgress} className="h-3 rounded-full bg-muted" />
            </div>
          </Card>
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
        <div className="space-y-1">
          <h2 className="text-3xl font-black flex items-center gap-3"><Package className="h-8 w-8 text-primary" /> إدارة المخزون والمقارنات المالية</h2>
          <p className="text-muted-foreground font-medium">متابعة دقيقة لرأس المال المخزن وحالة الأصناف.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {canManage && <Button onClick={() => setIsWipeOpen(true)} variant="outline" className="h-12 rounded-xl text-rose-600 font-bold border-rose-200 hover:bg-rose-50"><Eraser className="h-4 w-4" /> حذف المخزن</Button>}
          <Button onClick={handleExportExcel} variant="outline" className="h-12 rounded-xl border-emerald-200 font-bold gap-2 text-emerald-700 hover:bg-emerald-50"><FileSpreadsheet className="h-4 w-4" /> تصدير إكسيل</Button>
          <Button onClick={() => window.print()} variant="outline" className="h-12 rounded-xl font-bold gap-2"><Printer className="h-4 w-4" /> طباعة</Button>
        </div>
      </div>

      <div className="grid gap-4 grid-cols-1 md:grid-cols-5 print:hidden">
        <InventoryKPI label="إجمالي الأصناف" value={stats.total} icon={Boxes} color="primary" />
        <InventoryKPI label="إجمالي الجمهور" value={stats.totalPublicValue.toLocaleString()} icon={TrendingUp} color="emerald" highlight />
        <InventoryKPI label="آخر تقييم (تكلفة)" value={stats.lastValuation} icon={Scale} color="primary" highlight />
        <InventoryKPI label="نواقص المخزن" value={stats.outOfStock} icon={AlertCircle} color="rose" highlight={stats.outOfStock > 0} />
        <InventoryKPI label="تاريخ آخر تحديث" value={stats.lastUpdate} icon={Calendar} color="amber" />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-muted/50 p-1.5 rounded-2xl h-auto gap-1 mb-6 print:hidden">
          <TabsTrigger value="list" className="rounded-xl px-8 py-3 font-black text-xs">سجل الجرد الدوري</TabsTrigger>
          <TabsTrigger value="shortages" className="rounded-xl px-8 py-3 font-black text-xs gap-2"><ClipboardList className="h-4 w-4" /> النواقص والطلبيات</TabsTrigger>
          <TabsTrigger value="valuation" className="rounded-xl px-8 py-3 font-black text-xs">تدقيق القيمة المالية</TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="space-y-6">
          <Card className="border shadow-xl bg-card rounded-[2.5rem] overflow-hidden">
            <CardHeader className="bg-muted/30 p-6 flex flex-col md:flex-row items-center justify-between gap-4">
              <CardTitle className="font-black">دفتر المخزن المحاسبي</CardTitle>
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative w-64">
                  <Search className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="بحث بإسم الصنف..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="h-10 pr-10 rounded-xl font-bold bg-background shadow-inner border-none font-bold" />
                </div>
                <Button variant="outline" onClick={() => setIsAdvFilterOpen(true)} className="h-10 rounded-xl font-bold gap-2 bg-background border-primary/20"><Filter className="h-4 w-4" /> فلترة</Button>
                {canManage && (
                  <div className="flex gap-1.5">
                    <Button variant="outline" size="icon" onClick={handleDownloadTemplate} className="h-10 w-10 rounded-xl bg-background border-primary/20" title="تنزيل قالب المخزون">
                      <Download className="h-4 w-4 text-primary" />
                    </Button>
                    <input type="file" ref={fileInputRef} className="hidden" accept=".xlsx, .xls" onChange={handleImportExcel} />
                    <Button 
                      onClick={() => fileInputRef.current?.click()} 
                      disabled={isLoading || importing || (inventory && inventory.length > 0)} 
                      className="h-10 rounded-xl bg-primary text-white font-black px-4 shadow-md active:scale-95 disabled:opacity-50"
                      title={isLoading ? "جاري فحص البيانات..." : (inventory && inventory.length > 0) ? "يجب تصفير المخزن أولاً لمنع تكرار البيانات" : "استيراد ملف إكسيل"}
                    >
                      <PackagePlus className="h-4 w-4 ml-2" /> استيراد شامل
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table className="ledger-table">
                <TableHeader>
                  <TableRow className="bg-muted/50 border-b-2">
                    <TableHead className="text-right py-6 font-black text-foreground">إسم الصنف</TableHead>
                    <TableHead className="text-right font-black text-foreground">سعر البيع</TableHead>
                    <TableHead className="text-right font-black text-foreground">العبوات</TableHead>
                    <TableHead className="text-right font-black text-foreground">الوحدات</TableHead>
                    <TableHead className="text-right font-black text-foreground">إجمالي جمهور</TableHead>
                    <TableHead className="text-right font-black text-foreground">الصلاحية</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow><TableCell colSpan={6} className="p-20 text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" /></TableCell></TableRow>
                  ) : filteredInventory.length > 0 ? (
                    filteredInventory.map(i => {
                      const today = new Date(); const exp = new Date(i.expiryDate)
                      const isExpired = exp < today; const isNear = exp >= today && exp <= new Date(today.getTime() + 90 * 24 * 60 * 60 * 1000)
                      return (
                        <TableRow key={i.id} className="hover:bg-primary/[0.03] transition-colors border-b">
                          <TableCell className="text-right py-6 font-black text-lg text-foreground">{i.name}</TableCell>
                          <TableCell className="text-right font-english font-black text-emerald-600">{Number(i.price || 0).toLocaleString()}</TableCell>
                          <TableCell className="text-right font-english font-black text-primary">{i.packages || 0}</TableCell>
                          <TableCell className="text-right font-english font-black text-primary">{i.parts || 0}</TableCell>
                          <TableCell className="text-right font-english font-black text-blue-600 bg-blue-50/20">{Number(i.totalPublicValue || 0).toLocaleString()}</TableCell>
                          <TableCell className="text-right"><Badge variant="outline" className={cn("font-english font-bold", isExpired ? "border-rose-500 text-rose-600 bg-rose-50" : isNear ? "border-amber-500 text-amber-600 bg-amber-50" : "border-muted text-muted-foreground")}>{i.expiryDate || "---"}</Badge></TableCell>
                        </TableRow>
                      )
                    })
                  ) : <TableRow><TableCell colSpan={6} className="p-20 text-center font-bold text-muted-foreground">لا توجد أصناف مطابقة.</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="shortages" className="space-y-8 animate-in slide-in-from-bottom-2">
          <div className="grid gap-8 lg:grid-cols-12">
            <div className="lg:col-span-7">
              <Card className="border shadow-xl bg-card rounded-[2.5rem] overflow-hidden">
                <CardHeader className="bg-rose-500/5 border-b p-6 flex justify-between items-center"><div className="flex items-center gap-2"><AlertCircle className="h-5 w-5 text-rose-600" /><CardTitle className="text-xl font-black text-rose-600">تنبيهات المخزن (تلقائي)</CardTitle></div><Badge className="bg-rose-600 text-white font-english">{autoShortages.length} أصناف</Badge></CardHeader>
                <CardContent className="p-0">
                  <Table className="ledger-table">
                    <TableHeader><TableRow className="bg-muted/50 border-b-2"><TableHead className="w-12 px-6"><Checkbox checked={selectedForOrder.size === autoShortages.length && autoShortages.length > 0} onCheckedChange={() => setSelectedForOrder(selectedForOrder.size === autoShortages.length ? new Set() : new Set(autoShortages.map(i => i.id)))} /></TableHead><TableHead className="text-right py-6 font-black">إسم الصنف الناقص</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {autoShortages.map(i => (
                        <TableRow key={i.id} className={cn("hover:bg-rose-50 transition-colors border-b", selectedForOrder.has(i.id) && "bg-rose-50/50")}>
                          <TableCell className="px-6 text-right"><Checkbox checked={selectedForOrder.has(i.id)} onCheckedChange={() => { const next = new Set(selectedForOrder); if (next.has(i.id)) next.delete(i.id); else next.add(i.id); setSelectedForOrder(next); }} /></TableCell>
                          <TableCell className="text-right py-5 font-black text-foreground border-l">{i.name}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
            <div className="lg:col-span-5 space-y-6">
              <Card className="border shadow-xl bg-card rounded-[2.5rem] overflow-hidden">
                <CardHeader className="bg-primary/5 border-b p-6 flex justify-between items-center"><div className="flex items-center gap-2"><ShoppingCart className="h-5 w-5 text-primary" /><CardTitle className="text-xl font-black">طلبيات مخصصة (يدوي)</CardTitle></div>
                {canManage && <Button onClick={() => setIsAddManualOpen(true)} size="sm" className="rounded-xl h-10 font-bold gap-2"><PlusCircle className="h-4 w-4" /> إضافة طلب</Button>}
                </CardHeader>
                <CardContent className="p-0">
                  <Table className="ledger-table">
                    <TableHeader><TableRow className="bg-muted/50 border-b-2"><TableHead className="text-right py-6 font-black">النوع</TableHead><TableHead className="text-right py-6 font-black">الصنف المطلوب</TableHead><TableHead className="text-center font-black">إجراءات</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {manualShortages?.map(s => (
                        <TableRow key={s.id} className="border-b hover:bg-primary/[0.01]">
                          <TableCell className="text-right py-4 font-black"><Badge variant="outline">يدوي</Badge></TableCell>
                          <TableCell className="text-right py-4 font-black">{s.name}</TableCell>
                          <TableCell className="text-center border-l">
                            {canManage ? (
                              <Button variant="ghost" size="icon" onClick={() => deleteDocumentNonBlocking(doc(firestore, "users", user.uid, "shortages", s.id))} className="text-rose-500 h-8 w-8"><Trash2 className="h-4 w-4" /></Button>
                            ) : <Eye className="h-4 w-4 text-muted-foreground opacity-30" />}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="valuation" className="space-y-8">
          <div className="grid gap-8 lg:grid-cols-12">
            <div className="lg:col-span-4">
              <Card className={cn("border shadow-xl bg-card rounded-[2.5rem] overflow-hidden sticky top-24", isOwner && "opacity-60")}>
                {isOwner ? (
                  <div className="p-12 text-center space-y-4">
                    <div className="h-16 w-16 rounded-[2rem] bg-primary/10 flex items-center justify-center mx-auto text-primary shadow-inner">
                      <ShieldCheck className="h-8 w-8" />
                    </div>
                    <p className="font-black text-primary">تقييمات المخزون التاريخية</p>
                    <p className="text-xs text-muted-foreground font-bold leading-relaxed">يمكنك مراجعة كافة عمليات جرد وتقييم المخزون التي قام بها المدير المسؤول.</p>
                  </div>
                ) : canManage ? (
                  <>
                    <CardHeader className="bg-primary/5 p-6 border-b"><CardTitle className="font-black flex gap-2"><Scale className="h-5 w-5 text-primary" /> تسجيل تقييم مالي (تكلفة)</CardTitle></CardHeader>
                    <CardContent className="p-6 space-y-5">
                      <div className="space-y-2"><Label className="font-bold">تاريخ الجرد</Label><Input type="date" value={valuationDate} onChange={e => setValuationAmountDate(e.target.value)} className="h-12 rounded-xl font-english" /></div>
                      <div className="space-y-2"><Label className="font-black text-primary">إجمالي قيمة البضاعة تكلفة (ج.م)</Label><Input type="number" value={valuationAmount} onChange={e => setValuationAmount(e.target.value)} placeholder="0.00" className="h-16 text-3xl font-black text-primary text-left font-english shadow-inner rounded-2xl border-none bg-muted/30" /></div>
                      <Button onClick={handleAddValuation} disabled={!valuationAmount} className="w-full h-14 bg-primary text-white rounded-2xl font-black shadow-lg">اعتماد التقييم المالي</Button>
                    </CardContent>
                  </>
                ) : <div className="p-16 text-center opacity-30"><Lock className="h-12 w-12 mx-auto" /></div>}
              </Card>
            </div>
            <div className="lg:col-span-8">
              <Card className="border shadow-xl bg-card rounded-[2.5rem] overflow-hidden">
                <CardHeader className="bg-muted/30 p-6 border-b"><CardTitle className="font-black flex gap-2"><History className="h-5 w-5 text-primary" /> سجل التقييمات التاريخي</CardTitle></CardHeader>
                <CardContent className="p-0">
                  <Table className="ledger-table">
                    <TableHeader><TableRow className="bg-muted/50 border-b-2"><TableHead className="text-right py-6 font-black text-foreground">التاريخ</TableHead><TableHead className="text-right font-black text-foreground">المسؤول</TableHead><TableHead className="text-right font-black text-foreground">القيمة (تكلفة)</TableHead><TableHead className="text-center font-black text-foreground">إجراءات</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {valuations?.map(v => (
                        <TableRow key={v.id} className="border-b hover:bg-muted/30 transition-colors">
                          <TableCell className="text-right font-english font-black py-5">{v.date}</TableCell>
                          <TableCell className="text-right font-bold">{v.recordedByName}</TableCell>
                          <TableCell className="text-right font-black text-2xl text-primary font-english">{Number(v.amount).toLocaleString()} ج.م</TableCell>
                          <TableCell className="text-center border-l">
                            <div className="flex justify-center gap-1">
                              {canManage ? (
                                <>
                                  <Button variant="ghost" size="icon" className="h-8 w-8 text-primary rounded-xl" onClick={() => { setEditingValuation(v); setIsEditValOpen(true); }}><Edit3 className="h-4 w-4" /></Button>
                                  <Button variant="ghost" size="icon" className="h-8 w-8 text-rose-500 rounded-xl" onClick={() => { setValToDelete(v); setIsDelValOpen(true); }}><Trash2 className="h-4 w-4" /></Button>
                                </>
                              ) : <Eye className="h-4 w-4 text-muted-foreground opacity-30" />}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={isEditValOpen} onOpenChange={setIsEditValOpen}>
        <DialogContent className="sm:max-w-[450px] text-right rounded-[2.5rem]" dir="rtl">
          <DialogHeader><DialogTitle className="text-2xl font-black">تعديل سجل تقييم</DialogTitle></DialogHeader>
          <div className="grid gap-6 py-6">
            <div className="space-y-2"><Label className="font-bold">التاريخ</Label><Input type="date" value={editingValuation?.date || ""} onChange={e => setEditingValuation({...editingValuation, date: e.target.value})} className="h-12 rounded-xl" /></div>
            <div className="space-y-2"><Label className="font-bold">المبلغ المسجل (تكلفة)</Label><Input type="number" value={editingValuation?.amount || ""} onChange={e => setEditingValuation({...editingValuation, totalAmount: e.target.value})} className="h-12 rounded-xl font-english" /></div>
          </div>
          <DialogFooter><Button onClick={handleUpdateValuation} className="bg-primary text-white flex-1 h-12 rounded-xl font-black">حفظ التعديلات</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDelValOpen} onOpenChange={setIsDelValOpen}>
        <AlertDialogContent className="text-right border-2 border-rose-500 rounded-[2.5rem]" dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-2xl font-black text-rose-600 flex items-center gap-2"><Trash2 className="h-6 w-6" /> حذف سجل تقييم</AlertDialogTitle>
            <AlertDialogDescription className="font-bold text-base mt-2">هل أنت متأكد من حذف هذا السجل التقيمي؟ لا يمكن التراجع عن هذا الإجراء.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-3 mt-8">
            <AlertDialogAction onClick={handleDeleteValuation} className="bg-rose-600 text-white flex-1 h-14 rounded-2xl font-black">تأكيد الحذف</AlertDialogAction>
            <AlertDialogCancel className="flex-1 h-14 rounded-2xl font-bold">إلغاء</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={isAdvFilterOpen} onOpenChange={setIsAdvFilterOpen}>
        <DialogContent className="sm:max-w-[450px] text-right rounded-[2.5rem]" dir="rtl">
          <DialogHeader><DialogTitle className="text-2xl font-black">تصفية المخزن</DialogTitle></DialogHeader>
          <div className="grid gap-6 py-6">
            <div className="space-y-2">
              <Label className="font-bold">حالة الصلاحية</Label>
              <Select value={advFilters.expiryStatus} onValueChange={(v) => setAdvFilters({...advFilters, expiryStatus: v})}>
                <SelectTrigger className="h-12 rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="all" className="font-bold">الكل</SelectItem>
                  <SelectItem value="expired" className="font-bold text-rose-600">منتهي الصلاحية</SelectItem>
                  <SelectItem value="near" className="font-bold text-amber-600">قريب الانتهاء (90 يوم)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="font-bold">حالة الرصيد</Label>
              <Select value={advFilters.stockStatus} onValueChange={(v) => setAdvFilters({...advFilters, stockStatus: v})}>
                <SelectTrigger className="h-12 rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="all" className="font-bold">الكل</SelectItem>
                  <SelectItem value="out" className="font-bold text-rose-600">نواقص (رصيد صفر)</SelectItem>
                  <SelectItem value="low" className="font-bold text-amber-600">رصيد منخفض (أقل من 5)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button onClick={() => setIsAdvFilterOpen(false)} className="bg-primary text-white flex-1 font-black h-12 rounded-xl">تطبيق</Button>
            <Button variant="outline" onClick={() => { setAdvFilters({expiryStatus: "all", stockStatus: "all"}); setIsAdvFilterOpen(false); }} className="flex-1 font-bold h-12 rounded-xl">إعادة ضبط</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isManualAddOpen} onOpenChange={setIsAddManualOpen}>
        <DialogContent className="sm:max-w-[450px] text-right rounded-[2.5rem]" dir="rtl"><DialogHeader><DialogTitle className="text-2xl font-black">إضافة طلب شراء يدوي</DialogTitle></DialogHeader><div className="grid gap-6 py-6"><div className="space-y-2"><Label className="font-bold">إسم الصنف</Label><Input value={manualShortageData.name} onChange={e => setManualShortageData({...manualShortageData, name: e.target.value})} className="h-12 rounded-xl" placeholder="دواء جديد أو صنف غير مسجل..." /></div><div className="space-y-2"><Label className="font-bold">المورد المفضل (اختياري)</Label><Input value={manualShortageData.supplier} onChange={e => setManualShortageData({...manualShortageData, supplier: e.target.value})} className="h-12 rounded-xl" /></div></div><DialogFooter><Button onClick={handleAddManualShortage} className="bg-primary text-white flex-1 h-14 rounded-xl font-black shadow-lg">حفظ في قائمة الطلبات</Button></DialogFooter></DialogContent>
      </Dialog>

      <AlertDialog open={isWipeOpen} onOpenChange={setIsWipeOpen}>
        <AlertDialogContent className="text-right border-2 border-rose-500 rounded-[2.5rem]" dir="rtl"><AlertDialogHeader><AlertDialogTitle className="text-2xl font-black text-rose-600">حذف شامل للمخزون</AlertDialogTitle><AlertDialogDescription className="font-bold text-base mt-2">هل أنت متأكد من مسح كافة سجلات الأصناف نهائياً؟ هذا الإجراء سيقوم بتطهير قاعدة البيانات بالكامل.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter className="gap-3 mt-8"><AlertDialogAction onClick={handleWipeInventory} disabled={loading} className="bg-rose-600 text-white flex-1 h-14 rounded-2xl font-black">{loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "نعم، احذف بالكامل"}</AlertDialogAction><AlertDialogCancel className="flex-1 h-14 rounded-2xl font-bold">إلغاء</AlertDialogCancel></AlertDialogFooter></AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function InventoryKPI({ label, value, icon: Icon, color, highlight }: any) {
  const styles: any = { primary: "bg-primary/10 text-primary border-primary/20", amber: "bg-amber-500/10 text-amber-600 border-amber-500/20", rose: "bg-rose-500/10 text-rose-600 border-rose-500/20", emerald: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" }
  return (
    <Card className={cn("border shadow-sm rounded-[2.25rem] transition-all hover:shadow-lg group", highlight && "ring-2 ring-primary ring-offset-2")}>
      <CardContent className="p-6 flex flex-col gap-4">
        <div className="flex items-center justify-between"><div className={cn("h-12 w-12 rounded-2xl flex items-center justify-center border shadow-inner transition-transform group-hover:scale-110", styles[color])}><Icon className="h-6 w-6" /></div><div className="text-[9px] font-black uppercase tracking-widest bg-muted/50 px-3 py-1 rounded-full text-muted-foreground">تحديث لحظي</div></div>
        <div className="space-y-1">
          <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">{label}</p>
          <div className="flex items-baseline gap-2 flex-wrap"><h3 className={cn("text-2xl md:text-3xl font-black font-english tracking-tight", highlight ? "text-primary" : "text-foreground")}>{value}</h3>{(label.includes('قيمة') || label.includes('تقييم')) && <span className="text-[10px] font-bold text-muted-foreground shrink-0">ج.م</span>}</div>
        </div>
      </CardContent>
    </Card>
  )
}
