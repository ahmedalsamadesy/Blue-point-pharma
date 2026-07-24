"use client"

import { useState, useMemo } from "react"
import { useUser, useDoc, useMemoFirebase, useFirestore, useCollection } from "@/firebase"
import { collection, doc } from "firebase/firestore"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableFooter, TableHead, TableHeader, TableRow, TableCell } from "@/components/ui/table"
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
  ReceiptText, 
  Printer, 
  Search, 
  Trash2, 
  Edit3,
  Lock,
  Filter,
  TrendingUp,
  ArrowDownNarrowWide,
  Users,
  FileSpreadsheet,
  PlusCircle,
  Hammer,
  Eye,
  ShieldCheck
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { cn, printTable } from "@/lib/utils"
import { recordSaleTransaction, updateSaleTransaction, deleteSaleTransaction } from "@/lib/financial-logic"
import { APP_CONSTANTS } from "@/lib/constants"
import { ReadOnlyGuard } from "./shared/read-only-guard"
import * as XLSX from 'xlsx'

export function SalesSection() {
  const firestore = useFirestore()
  const { user } = useUser()
  const { toast } = useToast()
  
  const [loading, setLoading] = useState(false)
  const [amount, setAmount] = useState("")
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [time, setTime] = useState(new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }))
  const [selectedEmployee, setSelectedEmployee] = useState("")
  
  const [searchTerm, setSearchTerm] = useState("")
  const [isAdvFilterOpen, setIsAdvFilterOpen] = useState(false)
  const [advFilters, setAdvFilters] = useState({ startDate: "", endDate: "", employee: "all" })

  const [editingShift, setEditingShift] = useState<any>(null)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [shiftToDelete, setShiftToDelete] = useState<any>(null)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)

  const activeSysUser = useMemo(() => {
    if (typeof window === 'undefined') return null
    const saved = localStorage.getItem("activeSystemUser")
    return saved ? JSON.parse(saved) : null
  }, [])

  const isManager = activeSysUser?.role === 'admin';
  const isOwner = activeSysUser?.role === 'owner';
  const canManage = isManager; 

  const settingsRef = useMemoFirebase(() => {
    if (!firestore || !user) return null
    return doc(firestore, "users", user.uid, "settings", "current")
  }, [firestore, user])
  const { data: settings } = useDoc(settingsRef)

  const isMaintenanceMode = settings?.systemMode === APP_CONSTANTS.SYSTEM_MODES.MAINTENANCE;

  const employeesQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null
    return collection(firestore, APP_CONSTANTS.COLLECTIONS.USERS, user.uid, APP_CONSTANTS.COLLECTIONS.EMPLOYEES)
  }, [firestore, user])
  const { data: employees } = useCollection(employeesQuery)

  const categoriesQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null
    return collection(firestore, APP_CONSTANTS.COLLECTIONS.USERS, user.uid, APP_CONSTANTS.COLLECTIONS.INCOME_CATS)
  }, [firestore, user])
  const { data: categories } = useCollection(categoriesQuery)

  const goalsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null
    return collection(firestore, APP_CONSTANTS.COLLECTIONS.USERS, user.uid, APP_CONSTANTS.COLLECTIONS.GOALS)
  }, [firestore, user])
  const { data: goals } = useCollection(goalsQuery)
  
  const shiftCategory = useMemo(() => {
    return categories?.find(c => c.name.includes("مبيعات") || c.name.includes("شفت")) || categories?.[0]
  }, [categories])

  const incomesQuery = useMemoFirebase(() => {
    if (!firestore || !user || !shiftCategory) return null
    return collection(firestore, APP_CONSTANTS.COLLECTIONS.USERS, user.uid, APP_CONSTANTS.COLLECTIONS.INCOME_CATS, shiftCategory.id, APP_CONSTANTS.COLLECTIONS.INCOMES)
  }, [firestore, user, shiftCategory])
  const { data: shifts, isLoading: isShiftsLoading } = useCollection(incomesQuery)

  const filteredShifts = useMemo(() => {
    if (!shifts) return []
    return shifts.filter(s => {
      const matchSearch = s.employeeName?.toLowerCase().includes(searchTerm.toLowerCase()) || s.date?.includes(searchTerm)
      const matchEmployee = advFilters.employee === 'all' || s.employeeName === advFilters.employee
      const matchStart = !advFilters.startDate || s.date >= advFilters.startDate
      const matchEnd = !advFilters.endDate || s.date <= advFilters.endDate
      return matchSearch && matchEmployee && matchStart && matchEnd
    }).sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || a.date).getTime())
  }, [shifts, searchTerm, advFilters])

  const stats = useMemo(() => {
    const totalFiltered = filteredShifts.reduce((sum, s) => sum + (Number(s.amount) || 0), 0)
    const todayStr = new Date().toISOString().split('T')[0]
    const todayTotal = (shifts || []).filter(s => s.date === todayStr).reduce((sum, s) => sum + (Number(s.amount) || 0), 0)
    const employeesCount = new Set(filteredShifts.map(s => s.employeeName)).size
    return { totalFiltered, todayTotal, employeesCount }
  }, [filteredShifts, shifts])

  const handleExportExcel = () => {
    const exportData = filteredShifts.map(s => ({
      "التاريخ": s.date,
      "الوقت": s.time,
      "الموظف": s.employeeName,
      "المبلغ": s.amount,
      "المسؤول": s.recordedByName,
      "الحالة": s.lockedPeriod ? "مغلقة" : "مفتوحة"
    }));
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "المبيعات");
    XLSX.writeFile(wb, `مبيعات_بلو_بوينت_${new Date().toISOString().split('T')[0]}.xlsx`);
    toast({ title: "تم تصدير الإكسيل" });
  }

  const handleAddShift = async () => {
    if (isMaintenanceMode) {
      toast({ variant: "destructive", title: "وضع الصيانة نشط", description: "لا يمكن إضافة عمليات مالية جديدة حالياً." });
      return;
    }
    if (!canManage || !firestore || !user || !shiftCategory) return
    if (!amount || !selectedEmployee) {
      toast({ variant: "destructive", title: "بيانات ناقصة" }); return
    }

    setLoading(true)
    const saleData = { amount, date, time, employeeName: selectedEmployee, recordedByName: activeSysUser?.name || "مستخدم", type: "shift_sales" }
    
    try {
      await recordSaleTransaction(firestore, user.uid, shiftCategory.id, saleData, goals || [])
      window.dispatchEvent(new CustomEvent('refresh-stats'))
      setAmount(""); setLoading(false); toast({ title: "تم الحفظ بنجاح" })
    } catch (e) {
      setLoading(false)
    }
  }

  const handleUpdateShift = async () => {
    if (!canManage || isMaintenanceMode) return
    if (!firestore || !user || !shiftCategory || !editingShift) return
    setLoading(true)
    const old = shifts?.find(s => s.id === editingShift.id)
    const oldAmount = Number(old?.amount || 0)
    
    try {
      await updateSaleTransaction(firestore, user.uid, shiftCategory.id, editingShift.id, oldAmount, {
        ...editingShift,
        amount: Number(editingShift.amount),
        recordedByName: activeSysUser?.name || editingShift.recordedByName
      }, goals || [])
      setIsEditOpen(false); setEditingShift(null); setLoading(false)
      window.dispatchEvent(new CustomEvent('refresh-stats'))
      toast({ title: "تم التحديث بنجاح" })
    } catch (e) {
      setLoading(false)
    }
  }

  const handleDeleteShift = async () => {
    if (!canManage || isMaintenanceMode) return
    if (!firestore || !user || !shiftCategory || !shiftToDelete) return
    if (shiftToDelete.lockedPeriod) {
      toast({ variant: "destructive", title: "عملية محصنة", description: "لا يمكن حذف عملية في فترة مغلقة." })
      return
    }

    setLoading(true)
    const amountNum = Number(shiftToDelete.amount) || 0
    
    try {
      await deleteSaleTransaction(firestore, user.uid, shiftCategory.id, shiftToDelete.id, amountNum, goals || [], activeSysUser?.name || "مستخدم")
      setIsDeleteOpen(false); setShiftToDelete(null); setLoading(false)
      window.dispatchEvent(new CustomEvent('refresh-stats'))
      toast({ title: "تم الحذف بنجاح" })
    } catch (e) {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-8 pb-20 px-4 md:px-0" dir="rtl">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-600"><ReceiptText className="h-6 w-6" /></div>
          <div><h2 className="text-3xl font-black text-foreground">المبيعات والشفتات</h2><p className="text-muted-foreground font-medium">سجل وراقب التوريدات المالية المعتمدة.</p></div>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={handleExportExcel} variant="outline" className="h-12 rounded-xl border-emerald-200 font-bold gap-2 hover:bg-emerald-50 text-emerald-700">
            <FileSpreadsheet className="h-4 w-4" /> تصدير إكسيل
          </Button>
          <Button onClick={() => printTable("salesTable", settings?.pharmacyName)} variant="outline" className="h-12 rounded-xl font-bold gap-2"><Printer className="h-4 w-4" /> طباعة السجل</Button>
        </div>
      </div>

      <div className="grid gap-4 grid-cols-1 md:grid-cols-3 print:hidden">
        <KPIItem label="مبيعات اليوم" value={stats.todayTotal.toLocaleString()} sub="إجمالي توريدات الشفت اليوم" icon={TrendingUp} color="emerald" />
        <KPIItem label="نتائج الفلترة" value={stats.totalFiltered.toLocaleString()} sub={`إجمالي ${filteredShifts.length} عملية`} icon={ArrowDownNarrowWide} color="primary" highlight />
        <KPIItem label="كادر الشفت" value={stats.employeesCount} sub="موظفين مسجلين حالياً" icon={Users} color="amber" />
      </div>

      <div className="grid gap-8 md:grid-cols-12 print:block">
        <div className="md:col-span-4 print:hidden">
          <Card className={cn("border shadow-xl bg-card rounded-[2.5rem] overflow-hidden sticky top-24", (isMaintenanceMode || isOwner) && "opacity-60 grayscale-[0.5]")}>
            {isMaintenanceMode ? (
              <div className="p-12 text-center space-y-4">
                <Hammer className="h-12 w-12 text-amber-500 mx-auto animate-bounce" />
                <p className="font-black text-amber-700">النظام في وضع الصيانة</p>
                <p className="text-xs text-muted-foreground font-bold leading-relaxed">إضافة المعاملات المالية معطلة مؤقتاً لحماية أرصدة النظام.</p>
              </div>
            ) : isOwner ? (
              <ReadOnlyGuard role="owner" description="بصفتك صاحب الصيدلية، يمكنك متابعة كافة التوريدات والتقارير المالية دون التدخل في العمليات اليومية للمدير." />
            ) : canManage ? (
              <>
                <CardHeader className="bg-emerald-500/5 border-b p-6"><CardTitle className="text-xl font-black text-emerald-600">تسجيل شفت</CardTitle></CardHeader>
                <CardContent className="p-6 space-y-5">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2"><Label className="font-bold text-xs opacity-70">التاريخ</Label><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-12 rounded-xl bg-muted/30 border-none" /></div>
                    <div className="space-y-2"><Label className="font-bold text-xs opacity-70">الوقت</Label><Input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="h-12 rounded-xl bg-muted/30 border-none" /></div>
                  </div>
                  <div className="space-y-2">
                    <Label className="font-bold text-xs opacity-70">الموظف</Label>
                    <Select onValueChange={setSelectedEmployee} value={selectedEmployee}>
                      <SelectTrigger className="h-12 rounded-xl bg-muted/30 border-none font-bold">
                        <SelectValue placeholder="اختر الموظف" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        {employees?.map(emp => <SelectItem key={emp.id} value={`${emp.firstName} ${emp.lastName}`} className="font-bold">{emp.firstName} {emp.lastName}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="font-black text-emerald-600">المبلغ ({APP_CONSTANTS.CURRENCY})</Label>
                    <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" className="h-16 rounded-2xl bg-muted/30 border-none text-2xl font-black text-emerald-600 text-left font-english shadow-inner" />
                  </div>
                  <Button onClick={handleAddShift} disabled={loading} className="w-full h-14 bg-emerald-600 text-white rounded-2xl font-black text-lg shadow-lg transition-transform active:scale-95">
                    {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <PlusCircle className="h-5 w-5" />} حفظ التوريد
                  </Button>
                </CardContent>
              </>
            ) : <ReadOnlyGuard role="staff" type="restricted" />}
          </Card>
        </div>

        <div className="md:col-span-8 space-y-6">
          <Card className="border shadow-xl bg-card rounded-[2.5rem] overflow-hidden">
            <CardHeader className="border-b bg-muted/30 p-6 flex flex-col md:flex-row items-center justify-between gap-4 print:hidden">
              <CardTitle className="text-xl font-black">دفتر مبيعات الشفتات المعتمد</CardTitle>
              <div className="flex items-center gap-3 w-full md:w-auto print:hidden">
                <div className="relative flex-1 md:w-48"><Search className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" /><Input placeholder="بحث سريع..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="h-10 pr-10 rounded-xl font-bold border-none bg-background shadow-inner" /></div>
                <Button variant="outline" onClick={() => setIsAdvFilterOpen(true)} className="h-10 rounded-xl font-bold gap-2 bg-background border-primary/20"><Filter className="h-4 w-4" /> فلترة</Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table id="salesTable" className="ledger-table">
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="text-right py-6 font-black text-foreground">التاريخ</TableHead>
                      <TableHead className="text-right font-black text-foreground">الموظف</TableHead>
                      <TableHead className="text-right font-black text-foreground">المبلغ</TableHead>
                      <TableHead className="text-center font-black text-foreground print:hidden">إجراءات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isShiftsLoading ? (
                      <TableRow><TableCell colSpan={4} className="p-20 text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto text-emerald-600" /></TableCell></TableRow>
                    ) : filteredShifts.length > 0 ? (
                      filteredShifts.map((s) => (
                        <TableRow key={s.id} className="hover:bg-emerald-500/[0.03] transition-colors border-b">
                          <TableCell className="font-english text-xs font-black text-right">{s.date}</TableCell>
                          <TableCell className="font-black text-foreground text-right">{s.employeeName}</TableCell>
                          <TableCell className="font-black text-lg text-emerald-600 font-english text-right">+{s.amount?.toLocaleString()} <span className="text-[10px]">{APP_CONSTANTS.CURRENCY}</span></TableCell>
                          <TableCell className="text-center print:hidden border-l">
                            <div className="flex justify-center gap-1">
                              {s.lockedPeriod ? <Lock className="h-4 w-4 text-rose-500" /> : (
                                canManage ? (
                                  <>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-primary rounded-lg hover:bg-primary/10" onClick={() => { setEditingShift(s); setIsEditOpen(true); }}><Edit3 className="h-4 w-4" /></Button>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-rose-500 rounded-lg hover:bg-rose-50" onClick={() => { setShiftToDelete(s); setIsDeleteOpen(true); }}><Trash2 className="h-4 w-4" /></Button>
                                  </>
                                ) : <Eye className="h-4 w-4 text-muted-foreground opacity-30" />
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : <TableRow><TableCell colSpan={4} className="p-20 text-center font-bold text-muted-foreground">لا توجد مبيعات مطابقة.</TableCell></TableRow>}
                  </TableBody>
                  <TableFooter className="bg-emerald-500/10 border-t-4 border-emerald-500/20">
                    <TableRow>
                      <TableCell colSpan={2} className="py-10 font-black text-2xl text-foreground text-right border-none">إجمالي مبيعات العرض</TableCell>
                      <TableCell className="text-right font-black text-emerald-600 text-4xl font-english border-none">{stats.totalFiltered.toLocaleString()} <span className="text-lg">{APP_CONSTANTS.CURRENCY}</span></TableCell>
                      <TableCell className="print:hidden border-none" />
                    </TableRow>
                  </TableFooter>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={isAdvFilterOpen} onOpenChange={setIsAdvFilterOpen}>
        <DialogContent className="sm:max-w-[450px] text-right rounded-[2.5rem]" dir="rtl">
          <DialogHeader><DialogTitle className="text-2xl font-black">فلترة المبيعات</DialogTitle></DialogHeader>
          <div className="grid gap-6 py-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2 text-right"><Label className="font-bold text-xs opacity-70">من تاريخ</Label><Input type="date" value={advFilters.startDate} onChange={(e) => setAdvFilters({...advFilters, startDate: e.target.value})} className="h-12 rounded-xl" /></div>
              <div className="space-y-2 text-right"><Label className="font-bold text-xs opacity-70">إلى تاريخ</Label><Input type="date" value={advFilters.endDate} onChange={(e) => setAdvFilters({...advFilters, endDate: e.target.value})} className="h-12 rounded-xl" /></div>
            </div>
            <div className="space-y-2 text-right">
              <Label className="font-bold text-xs opacity-70">الموظف المسؤول</Label>
              <Select value={advFilters.employee} onValueChange={(v) => setAdvFilters({...advFilters, employee: v})}>
                <SelectTrigger className="h-12 rounded-xl"><SelectValue placeholder="كل الموظفين" /></SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="all" className="font-bold">كل الموظفين</SelectItem>
                  {employees?.map(emp => <SelectItem key={emp.id} value={`${emp.firstName} ${emp.lastName}`}>{emp.firstName} {emp.lastName}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button onClick={() => setIsAdvFilterOpen(false)} className="bg-primary text-white flex-1 font-black h-12 rounded-xl shadow-lg">تطبيق</Button>
            <Button variant="outline" onClick={() => { setAdvFilters({startDate:"", endDate:"", employee:"all"}); setIsAdvFilterOpen(false); }} className="flex-1 font-bold h-12 rounded-xl">إعادة ضبط</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-[425px] text-right rounded-[2.5rem]" dir="rtl">
          <DialogHeader><DialogTitle className="text-2xl font-black text-primary">تعديل بيانات الشفت</DialogTitle></DialogHeader>
          <div className="grid gap-6 py-6">
            <div className="space-y-2 text-right">
              <Label className="font-bold text-xs opacity-70">الموظف</Label>
              <Select value={editingShift?.employeeName} onValueChange={(v) => setEditingShift({...editingShift, employeeName: v})}>
                <SelectTrigger className="h-12 rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {employees?.map(emp => <SelectItem key={emp.id} value={`${emp.firstName} ${emp.lastName}`}>{emp.firstName} {emp.lastName}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2 text-right"><Label className="font-bold text-xs">التاريخ</Label><Input type="date" value={editingShift?.date || ""} onChange={(e) => setEditingShift({...editingShift, date: e.target.value})} className="h-12 rounded-xl" /></div>
              <div className="space-y-2 text-right"><Label className="font-bold text-xs">الوقت</Label><Input type="time" value={editingShift?.time || ""} onChange={(e) => setEditingShift({...editingShift, time: e.target.value})} className="h-12 rounded-xl" /></div>
            </div>
            <div className="space-y-2 text-right">
              <Label className="font-black text-primary">المبلغ المعدل (ج.م)</Label>
              <Input type="number" value={editingShift?.amount || ""} onChange={(e) => setEditingShift({...editingShift, amount: e.target.value})} className="h-16 text-center text-3xl font-black text-primary bg-muted/30 border-none rounded-2xl font-english shadow-inner" />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleUpdateShift} disabled={loading} className="bg-primary text-white flex-1 h-14 rounded-2xl font-black text-xl shadow-lg transition-transform active:scale-95">حفظ التعديلات</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent className="text-right rounded-[2.5rem]" dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-2xl font-black text-rose-600">تأكيد حذف مبيعات</AlertDialogTitle><AlertDialogDescription className="font-bold text-base mt-2">هل أنت متأكد من حذف هذا السجل؟ سيتم خصم المبلغ من الأهداف المالية آلياً.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter className="gap-2 mt-6"><AlertDialogAction onClick={handleDeleteShift} disabled={loading} className="bg-rose-600 text-white flex-1 h-14 rounded-2xl font-black">تأكيد الحذف</AlertDialogAction><AlertDialogCancel className="flex-1 h-14 rounded-2xl font-bold">إلغاء</AlertDialogCancel></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function KPIItem({ label, value, sub, icon: Icon, color, highlight }: any) {
  const styles: any = {
    emerald: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
    primary: "bg-primary/10 text-primary border-primary/20",
    amber: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  }
  return (
    <Card className={cn("border shadow-sm rounded-[2rem] transition-all duration-500 hover:shadow-xl", highlight && "ring-2 ring-primary ring-offset-2")}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className={cn("h-12 w-12 rounded-2xl flex items-center justify-center", styles[color])}><Icon className="h-6 w-6" /></div>
          <span className="text-[9px] font-black uppercase tracking-widest bg-muted/50 px-3 py-1 rounded-full">تحديث لحظي</span>
        </div>
        <div className="space-y-1">
          <p className="text-[11px] font-bold text-muted-foreground uppercase">{label}</p>
          <div className="flex items-baseline gap-2"><h3 className="text-3xl font-black font-english">{value}</h3>{label.includes('مبيعات') && <span className="text-[10px] font-bold text-muted-foreground">ج.م</span>}</div>
          <p className="text-[10px] text-muted-foreground font-medium">{sub}</p>
        </div>
      </CardContent>
    </Card>
  )
}