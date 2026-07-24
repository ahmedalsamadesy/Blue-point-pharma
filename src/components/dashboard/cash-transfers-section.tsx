
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
import { useToast } from "@/hooks/use-toast"
import { 
  Loader2, 
  ArrowLeftRight, 
  Printer, 
  Search, 
  PlusCircle, 
  Filter,
  FileSpreadsheet,
  ArrowUpCircle,
  ArrowDownCircle,
  Wallet,
  Edit3,
  Trash2,
  Lock,
  Landmark,
  Eye,
  ShieldCheck,
  ArrowRightLeft as TransferIcon
} from "lucide-react"
import { 
  addDocumentNonBlocking, 
  updateDocumentNonBlocking, 
  deleteDocumentNonBlocking 
} from "@/firebase/non-blocking-updates"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import * as XLSX from 'xlsx'
import { APP_CONSTANTS } from "@/lib/constants"

export function CashTransfersSection() {
  const firestore = useFirestore()
  const { user } = useUser()
  const { toast } = useToast()
  
  const [loading, setLoading] = useState(false)
  const [amount, setAmount] = useState("")
  const [targetTreasuryId, setTargetTreasuryId] = useState("")
  const [type, setType] = useState<"in" | "out">("out")
  const [description, setDescription] = useState("")
  const [recipientName, setRecipientName] = useState("")
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  
  const [searchTerm, setSearchTerm] = useState("")
  const [isAdvFilterOpen, setIsAdvFilterOpen] = useState(false)
  const [filterType, setFilterType] = useState("all")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")

  // حالات التعديل والحذف
  const [editingTransfer, setEditingTransfer] = useState<any>(null)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [transferToDelete, setTransferToDelete] = useState<any>(null)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)

  const activeSysUser = useMemo(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem("activeSystemUser") : null
    return saved ? JSON.parse(saved) : null
  }, [])

  const isManager = activeSysUser?.role === 'admin';
  const isOwner = activeSysUser?.role === 'owner';
  const canManage = isManager; 

  // جلب الخزائن المعتمدة من قسم الخزينة
  const treasuriesQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null
    return collection(firestore, APP_CONSTANTS.COLLECTIONS.USERS, user.uid, APP_CONSTANTS.COLLECTIONS.TREASURIES)
  }, [firestore, user])
  const { data: treasuries, isLoading: isTreasuriesLoading } = useCollection(treasuriesQuery)

  const transfersQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null
    return collection(firestore, APP_CONSTANTS.COLLECTIONS.USERS, user.uid, APP_CONSTANTS.COLLECTIONS.CASH_TRANSFERS)
  }, [firestore, user])
  const { data: transfers, isLoading: isTransfersLoading } = useCollection(transfersQuery)

  const filteredTransfers = useMemo(() => {
    if (!transfers) return []
    return transfers.filter(t => {
      const matchSearch = (t.targetTreasury || "").toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (t.description || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (t.recipientName || "").toLowerCase().includes(searchTerm.toLowerCase())
      const matchType = filterType === 'all' || t.type === filterType
      const matchStart = !startDate || t.date >= startDate
      const matchEnd = !endDate || t.date <= endDate
      return matchSearch && matchType && matchStart && matchEnd
    }).sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
  }, [transfers, searchTerm, filterType, startDate, endDate])

  const stats = useMemo(() => {
    const totalIn = filteredTransfers.filter(t => t.type === 'in').reduce((sum, t) => sum + (Number(t.amount) || 0), 0)
    const totalOut = filteredTransfers.filter(t => t.type === 'out').reduce((sum, t) => sum + (Number(t.amount) || 0), 0)
    return { totalIn, totalOut, net: totalIn - totalOut }
  }, [filteredTransfers])

  const handleExportExcel = () => {
    const exportData = filteredTransfers.map(t => ({
      "التاريخ": t.date,
      "النوع": t.type === 'in' ? "وارد من جهة" : "صادر لجهة",
      "الخزينة/الجهة": t.targetTreasury,
      "المستلم": t.recipientName,
      "المسؤول": t.recordedByName,
      "المبلغ": t.amount
    }));
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "التحويلات");
    XLSX.writeFile(wb, `تحويلات_نقدية_بلو_بوينت_${new Date().toISOString().split('T')[0]}.xlsx`);
    toast({ title: "تم تصدير الإكسيل" });
  }

  const handleAddTransfer = async () => {
    if (!canManage || !firestore || !user || !amount || !targetTreasuryId) return
    setLoading(true)
    
    const selectedT = treasuries?.find(t => t.id === targetTreasuryId)
    const targetName = selectedT?.name || "جهة غير معروفة"

    addDocumentNonBlocking(collection(firestore, APP_CONSTANTS.COLLECTIONS.USERS, user.uid, APP_CONSTANTS.COLLECTIONS.CASH_TRANSFERS), { 
      amount: Number(amount), 
      type, 
      targetTreasury: targetName,
      targetTreasuryId,
      description: description || `تحويل ${type === 'in' ? 'وارد' : 'صادر'} إلى ${targetName}`, 
      recipientName: recipientName || "---",
      recordedByName: activeSysUser?.name || "موظف",
      date, 
      lockedPeriod: false,
      createdAt: new Date().toISOString()
    }).then(() => {
      setAmount(""); setTargetTreasuryId(""); setDescription(""); setRecipientName(""); setLoading(false); toast({ title: "تم تسجيل التحويل" })
      window.dispatchEvent(new CustomEvent('refresh-stats'))
    }).catch(() => setLoading(false))
  }

  const handleUpdateTransfer = () => {
    if (!canManage || !firestore || !user || !editingTransfer) return
    updateDocumentNonBlocking(doc(firestore, APP_CONSTANTS.COLLECTIONS.USERS, user.uid, APP_CONSTANTS.COLLECTIONS.CASH_TRANSFERS, editingTransfer.id), {
      ...editingTransfer,
      amount: Number(editingTransfer.amount),
      updatedAt: new Date().toISOString()
    })
    setIsEditOpen(false)
    toast({ title: "تم التحديث" })
    window.dispatchEvent(new CustomEvent('refresh-stats'))
  }

  const handleDeleteTransfer = () => {
    if (!canManage || !firestore || !user || !transferToDelete) return
    deleteDocumentNonBlocking(doc(firestore, APP_CONSTANTS.COLLECTIONS.USERS, user.uid, APP_CONSTANTS.COLLECTIONS.CASH_TRANSFERS, transferToDelete.id))
    setIsDeleteOpen(false)
    toast({ title: "تم الحذف بنجاح" })
    window.dispatchEvent(new CustomEvent('refresh-stats'))
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20 px-4 md:px-0" dir="rtl">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
        <div>
          <h2 className="text-3xl font-black text-foreground flex items-center gap-3">
            <ArrowLeftRight className="h-8 w-8 text-primary" /> 
            التحويلات النقدية والبنكية
          </h2>
          <p className="text-muted-foreground font-medium">نظام الربط المالي بين خزينة الصيدلية والحسابات البنكية والمحافظ.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={handleExportExcel} variant="outline" className="h-12 rounded-xl border-emerald-200 font-bold gap-2 hover:bg-emerald-50 text-emerald-700">
            <FileSpreadsheet className="h-4 w-4" /> تصدير إكسيل
          </Button>
          <Button onClick={() => window.print()} variant="outline" className="gap-2 h-12 rounded-xl font-bold">
            <Printer className="h-4 w-4" /> طباعة
          </Button>
        </div>
      </div>

      <div className="grid gap-4 grid-cols-1 md:grid-cols-3 print:hidden">
        <StatsKPI label="إجمالي الوارد للخزينة" value={stats.totalIn.toLocaleString()} icon={ArrowUpCircle} color="emerald" />
        <StatsKPI label="إجمالي الخارج للبنوك" value={stats.totalOut.toLocaleString()} icon={ArrowDownCircle} color="rose" />
        <StatsKPI label="صافي حركة الأرصدة" value={stats.net.toLocaleString()} icon={Wallet} color="primary" highlight />
      </div>

      <div className="grid gap-8 md:grid-cols-12 print:block">
        <div className="md:col-span-4 print:hidden">
          <Card className={cn("border shadow-xl bg-card rounded-[2.5rem] h-fit sticky top-24", isOwner && "opacity-60 grayscale-[0.5]")}>
            {isOwner ? (
              <div className="p-12 text-center space-y-4">
                <div className="h-16 w-16 rounded-[2rem] bg-primary/10 flex items-center justify-center mx-auto text-primary shadow-inner">
                  <ShieldCheck className="h-8 w-8" />
                </div>
                <p className="font-black text-primary">واجهة رقابية (للاطلاع فقط)</p>
                <p className="text-xs text-muted-foreground font-bold leading-relaxed">بصفتك صاحب الصيدلية، يمكنك مراقبة كافة التحويلات البنكية والتحصيلات دون التدخل في التنفيذ التشغيلي.</p>
              </div>
            ) : canManage ? (
              <CardContent className="p-6 space-y-5">
                <CardTitle className="text-xl flex items-center gap-2 font-black text-primary"><TransferIcon className="h-5 w-5" /> تسجيل تحويل مالي</CardTitle>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="font-bold text-xs opacity-70">التاريخ</Label>
                    <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-12 rounded-xl font-english" />
                  </div>
                  <div className="space-y-2">
                    <Label className="font-bold text-xs opacity-70">نوع العملية</Label>
                    <Select onValueChange={(v: any) => setType(v)} value={type}>
                      <SelectTrigger className="h-12 rounded-xl font-bold"><SelectValue /></SelectTrigger>
                      <SelectContent className="rounded-xl">
                        <SelectItem value="out" className="font-bold text-rose-600">صادر للبنك/الجهة (-)</SelectItem>
                        <SelectItem value="in" className="font-bold text-emerald-600">وارد للخزينة (+)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="font-bold text-xs opacity-70">الجهة (من/إلى)</Label>
                  <Select onValueChange={setTargetTreasuryId} value={targetTreasuryId}>
                    <SelectTrigger className="h-12 rounded-xl bg-muted/30 border-none font-black">
                      <SelectValue placeholder="اختر الخزينة/البنك..." />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      {isTreasuriesLoading ? (
                        <div className="p-4 text-center"><Loader2 className="h-4 w-4 animate-spin mx-auto" /></div>
                      ) : treasuries && treasuries.length > 0 ? (
                        treasuries.map(t => (
                          <SelectItem key={t.id} value={t.id} className="font-bold">
                            {t.name} ({t.type === 'bank' ? 'بنك' : t.type === 'wallet' ? 'محفظة' : 'خزينة'})
                          </SelectItem>
                        ))
                      ) : (
                        <div className="p-4 text-center text-xs text-muted-foreground font-bold">لا يوجد خزائن مسجلة.</div>
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="font-bold text-xs opacity-70">اسم المستلم (اختياري)</Label>
                  <Input value={recipientName} onChange={(e) => setRecipientName(e.target.value)} placeholder="من قام باستلام/تسليم المبلغ؟" className="h-12 rounded-xl font-bold" />
                </div>

                <div className="space-y-2">
                  <Label className="font-black text-primary">المبلغ الإجمالي (ج.م)</Label>
                  <Input 
                    type="number" 
                    value={amount} 
                    onChange={(e) => setAmount(e.target.value)} 
                    className="h-16 text-3xl font-black text-primary text-left rounded-2xl bg-muted/30 border-none shadow-inner font-english" 
                    placeholder="0.00"
                  />
                </div>

                <Button 
                  onClick={handleAddTransfer} 
                  disabled={loading || !amount || !targetTreasuryId} 
                  className="w-full h-14 bg-primary text-white rounded-2xl font-black shadow-lg transition-all hover:scale-[1.02] active:scale-95 gap-2"
                >
                  {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <PlusCircle className="h-5 w-5" />} 
                  اعتماد التحويل المالي
                </Button>
              </CardContent>
            ) : <div className="p-16 text-center opacity-30"><Lock className="h-12 w-12 mx-auto" /></div>}
          </Card>
        </div>

        <div className="md:col-span-8">
          <Card className="border shadow-xl bg-card rounded-[2.5rem] overflow-hidden">
            <CardHeader className="border-b bg-muted/30 p-6 flex flex-col md:flex-row items-center justify-between gap-4 print:hidden">
              <CardTitle className="text-xl font-black">سجل التحويلات الموثق</CardTitle>
              <div className="flex items-center gap-3 w-full md:w-auto">
                <div className="relative flex-1 md:w-48"><Search className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" /><Input placeholder="بحث سريع..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="h-10 pr-10 rounded-xl font-bold border-none bg-background shadow-inner" /></div>
                <Button variant="outline" onClick={() => setIsAdvFilterOpen(true)} className="h-10 rounded-xl font-bold gap-2 bg-background border-primary/20"><Filter className="h-4 w-4" /> فلترة</Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table className="ledger-table">
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="text-right py-5 font-black text-foreground">التاريخ</TableHead>
                    <TableHead className="text-right font-black text-foreground">الجهة / الوعاء</TableHead>
                    <TableHead className="text-right font-black text-foreground">المبلغ</TableHead>
                    <TableHead className="text-center font-black text-foreground print:hidden">إجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isTransfersLoading ? (
                    <TableRow><TableCell colSpan={4} className="p-20 text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" /></TableCell></TableRow>
                  ) : filteredTransfers.length > 0 ? (
                    filteredTransfers.map((t) => (
                      <TableRow key={t.id} className="hover:bg-primary/[0.02] border-b transition-colors">
                        <TableCell className="font-english text-xs font-black py-4">{t.date}</TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-black text-foreground">{t.targetTreasury}</span>
                            <Badge variant="outline" className={cn("w-fit text-[9px] font-black border-none", t.type === 'in' ? "bg-emerald-500/10 text-emerald-600" : "bg-rose-500/10 text-rose-600")}>
                              {t.type === 'in' ? "وارد للخزينة" : "صادر للجهة"}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell className={cn("font-black font-english text-lg", t.type==='in'?'text-emerald-600':'text-rose-600')}>
                          {t.type==='in'?'+':'-'}{t.amount?.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-center print:hidden border-l">
                          <div className="flex justify-center gap-1.5">
                            {t.lockedPeriod ? (
                              <Lock className="h-4 w-4 text-rose-500" title="هذه العملية مغلقة محاسبياً" />
                            ) : canManage ? (
                              <>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-8 w-8 text-primary rounded-xl hover:bg-primary/10"
                                  onClick={() => { setEditingTransfer(t); setIsEditOpen(true); }}
                                >
                                  <Edit3 className="h-4 w-4" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-8 w-8 text-rose-500 rounded-xl hover:bg-rose-50"
                                  onClick={() => { setTransferToDelete(t); setIsDeleteOpen(true); }}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </>
                            ) : <Eye className="h-4 w-4 text-muted-foreground opacity-30" />}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow><TableCell colSpan={4} className="p-20 text-center font-bold text-muted-foreground">لا توجد تحويلات مسجلة.</TableCell></TableRow>
                  )}
                </TableBody>
                <TableFooter className="bg-primary/5 border-t-2">
                  <TableRow>
                    <TableCell colSpan={2} className="py-10 font-black text-2xl text-foreground">صافي حركة التحويلات المفرزة</TableCell>
                    <TableCell className="text-right font-black text-primary text-4xl font-english">{stats.net.toLocaleString()}</TableCell>
                    <TableCell className="print:hidden border-none" />
                  </TableRow>
                </TableFooter>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* نافذة تعديل التحويل */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-[450px] text-right rounded-[2.5rem]" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black text-primary">تعديل بيانات التحويل</DialogTitle>
          </DialogHeader>
          <div className="grid gap-6 py-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2 text-right">
                <Label className="font-bold">التاريخ</Label>
                <Input type="date" value={editingTransfer?.date || ""} onChange={(e) => setEditingTransfer({...editingTransfer, date: e.target.value})} className="h-12 rounded-xl font-english" />
              </div>
              <div className="space-y-2 text-right">
                <Label className="font-bold">النوع</Label>
                <Select value={editingTransfer?.type} onValueChange={(v: any) => setEditingTransfer({...editingTransfer, type: v})}>
                  <SelectTrigger className="h-12 rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="in">وارد (+)</SelectItem>
                    <SelectItem value="out">صادر (-)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2 text-right">
              <Label className="font-bold">الجهة (الوعاء المالي)</Label>
              <Select value={editingTransfer?.targetTreasuryId} onValueChange={(v) => {
                const name = treasuries?.find(tr => tr.id === v)?.name || editingTransfer.targetTreasury
                setEditingTransfer({...editingTransfer, targetTreasuryId: v, targetTreasury: name})
              }}>
                <SelectTrigger className="h-12 rounded-xl font-black">
                  <SelectValue placeholder="اختر الخزينة..." />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {treasuries?.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 text-right">
              <Label className="font-black text-primary">المبلغ المعدل (ج.م)</Label>
              <Input type="number" value={editingTransfer?.amount || ""} onChange={(e) => setEditingTransfer({...editingTransfer, amount: e.target.value})} className="h-16 text-center text-3xl font-black text-primary bg-muted/30 border-none rounded-2xl font-english shadow-inner" />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleUpdateTransfer} className="bg-primary text-white flex-1 h-14 rounded-2xl font-black text-xl shadow-lg shadow-primary/20">حفظ التغييرات</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* نافذة تأكيد الحذف */}
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent className="text-right border-2 border-rose-500 rounded-[2.5rem]" dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-2xl font-black text-rose-600 flex items-center gap-3">
              <Trash2 className="h-8 w-8" /> حذف تحويل مالي
            </AlertDialogTitle>
            <AlertDialogDescription className="text-base font-bold mt-2">
              هل أنت متأكد من حذف هذا السجل؟ سيؤدي ذلك إلى تعديل رصيد الخزينة التراكمي فوراً. لا يمكن التراجع.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-3 mt-8">
            <AlertDialogAction onClick={handleDeleteTransfer} className="bg-rose-600 text-white flex-1 h-14 rounded-2xl font-black shadow-lg shadow-rose-500/20">نعم، احذف السجل</AlertDialogAction>
            <AlertDialogCancel className="flex-1 h-14 rounded-2xl font-bold border-2">إلغاء</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={isAdvFilterOpen} onOpenChange={setIsAdvFilterOpen}>
        <DialogContent className="sm:max-w-[450px] text-right rounded-[2.5rem]" dir="rtl">
          <DialogHeader><DialogTitle className="text-2xl font-black">فلترة التحويلات</DialogTitle></DialogHeader>
          <div className="grid gap-6 py-6">
            <div className="grid grid-cols-2 gap-4 text-right">
              <div className="space-y-2 text-right"><Label className="font-bold">من تاريخ</Label><Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="h-12 rounded-xl" /></div>
              <div className="space-y-2 text-right"><Label className="font-bold">إلى تاريخ</Label><Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="h-12 rounded-xl" /></div>
            </div>
            <div className="space-y-2 text-right"><Label className="font-bold">نوع التحويل</Label>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="h-12 rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent className="rounded-xl"><SelectItem value="all">كل التحويلات</SelectItem><SelectItem value="in">وارد من جهة (+)</SelectItem><SelectItem value="out">صادر لجهة (-)</SelectItem></SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button onClick={() => setIsAdvFilterOpen(false)} className="bg-primary text-white flex-1 font-black h-12 rounded-xl shadow-lg">تطبيق</Button>
            <Button variant="outline" onClick={() => { setStartDate(""); setEndDate(""); setFilterType("all"); setIsAdvFilterOpen(false); }} className="flex-1 font-bold h-12 rounded-xl">تصفير</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function StatsKPI({ label, value, icon: Icon, color, highlight }: any) {
  const styles: any = { primary: "bg-primary/10 text-primary border-primary/20", rose: "bg-rose-500/10 text-rose-600 border-rose-500/20", emerald: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" }
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
            <span className="text-[10px] font-bold text-muted-foreground shrink-0">ج.م</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
