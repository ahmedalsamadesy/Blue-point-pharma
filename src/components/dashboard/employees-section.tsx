
"use client"

import { useState, useMemo } from "react"
import { useFirestore, useUser, useCollection, useMemoFirebase } from "@/firebase"
import { collection, doc, query, orderBy, getDocs } from "firebase/firestore"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { useToast } from "@/hooks/use-toast"
import { 
  Loader2, 
  UserPlus, 
  Search, 
  Edit3, 
  Trash2, 
  Users, 
  Clock, 
  Wallet, 
  CalendarDays, 
  UserCheck, 
  FileSpreadsheet, 
  Calculator,
  UserRound,
  MinusCircle,
  PlusCircle,
  AlertCircle,
  HandCoins,
  Printer,
  FileText,
  Activity,
  Award,
  History,
  ArrowRight,
  UserCog,
  ToggleLeft,
  ToggleRight,
  CheckCircle2,
  XCircle,
  RefreshCcw
} from "lucide-react"
import { addDocumentNonBlocking, updateDocumentNonBlocking, deleteDocumentNonBlocking } from "@/firebase/non-blocking-updates"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { recordEmployeePaymentTransaction } from "@/lib/financial-logic"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import * as XLSX from 'xlsx'
import { APP_CONSTANTS } from "@/lib/constants"
import { ExternalSupportManager } from "./features/external-support-manager"

const JOB_ROLES = [
  { id: "pharmacist", label: "صيدلي" },
  { id: "assistant", label: "مساعد صيدلي" },
  { id: "accountant", label: "محاسب" },
  { id: "manager", label: "مدير فرع" },
  { id: "worker", label: "عامل خدمات" },
]

const ADJUSTMENT_TYPES = [
  { id: "incentive", label: "حافز / مكافأة", icon: PlusCircle, color: "text-emerald-600" },
  { id: "deduction", label: "خصم مالي / جزاء", icon: MinusCircle, color: "text-rose-600" },
  { id: "absence", label: "غياب (أيام فعلي)", icon: AlertCircle, color: "text-amber-600" },
  { id: "salary_payment", label: "صرف مرتب", icon: HandCoins, color: "text-blue-600" },
  { id: "advance_payment", label: "سلفة نقدية", icon: HandCoins, color: "text-indigo-600" },
]

export function EmployeesSection() {
  const firestore = useFirestore()
  const { user } = useUser()
  const { toast } = useToast()

  const [activeTab, setActiveTab] = useState("list")
  const [searchTerm, setSearchTerm] = useState("")
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [isAdjustmentOpen, setIsAdjustmentOpen] = useState(false)
  const [isPaymentOpen, setIsPaymentOpen] = useState(false)
  const [isReportOpen, setIsReportOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  
  const [formData, setFormData] = useState({ firstName: "", lastName: "", role: "pharmacist", startTime: "09:00", endTime: "17:00", salary: 0, allowedVacations: 4 })
  const [adjData, setAdjustmentData] = useState({ employeeId: "", type: "incentive", amount: "", days: "1", reason: "", date: new Date().toISOString().split('T')[0] })
  const [paymentData, setPaymentData] = useState({ amount: "", type: "salary", date: new Date().toISOString().split('T')[0] })

  const [editingEmployee, setEditingEmployee] = useState<any>(null)
  const [employeeToDelete, setEmployeeToDelete] = useState<any>(null)
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null)
  const [reportEmployee, setReportEmployee] = useState<any>(null)

  const activeSysUser = useMemo(() => {
    if (typeof window === 'undefined') return null
    const saved = localStorage.getItem("activeSystemUser")
    return saved ? JSON.parse(saved) : null
  }, [])

  const isAdmin = activeSysUser?.role === 'admin' || activeSysUser?.role === 'owner'

  const employeesQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null
    return collection(firestore, APP_CONSTANTS.COLLECTIONS.USERS, user.uid, APP_CONSTANTS.COLLECTIONS.EMPLOYEES)
  }, [firestore, user])
  const { data: employees, isLoading } = useCollection(employeesQuery)

  const adjQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null
    return query(collection(firestore, APP_CONSTANTS.COLLECTIONS.USERS, user.uid, APP_CONSTANTS.COLLECTIONS.PAYROLL_ADJUSTMENTS), orderBy("date", "desc"))
  }, [firestore, user])
  const { data: adjustments } = useCollection(adjQuery)

  const expenseCategoriesQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null
    return collection(firestore, APP_CONSTANTS.COLLECTIONS.USERS, user.uid, APP_CONSTANTS.COLLECTIONS.EXPENSE_CATS)
  }, [firestore, user])
  const { data: expenseCategories } = useCollection(expenseCategoriesQuery)

  const filteredEmployees = useMemo(() => {
    if (!employees) return []
    return employees.filter(emp => 
      `${emp.firstName} ${emp.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.role?.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [employees, searchTerm])

  const payrollSummary = useMemo(() => {
    if (!employees) return []
    const currentMonth = new Date().toISOString().substring(0, 7)
    
    return employees.map(emp => {
      const empAdj = adjustments?.filter(a => a.employeeId === emp.id && a.date.startsWith(currentMonth)) || []
      const incentives = empAdj.filter(a => a.type === 'incentive').reduce((s, a) => s + (Number(a.amount) || 0), 0)
      const deductions = empAdj.filter(a => a.type === 'deduction').reduce((s, a) => s + (Number(a.amount) || 0), 0)
      const payments = empAdj.filter(a => ['salary_payment', 'advance_payment'].includes(a.type)).reduce((s, a) => s + (Number(a.amount) || 0), 0)
      
      const actualAbsenceDays = empAdj.filter(a => a.type === 'absence').reduce((s, a) => s + (Number(a.days) || 0), 0)
      const allowedV = emp.allowedVacations !== undefined ? Number(emp.allowedVacations) : 4
      const baseSalary = Number(emp.salary) || 0
      const dayRate = baseSalary / 30

      let absenceDeduction = actualAbsenceDays > allowedV ? (actualAbsenceDays - allowedV) * dayRate : 0
      let vacationBonus = (actualAbsenceDays < allowedV && allowedV > 0) ? (allowedV - actualAbsenceDays) * 2 * dayRate : 0

      const totalDue = baseSalary + incentives + vacationBonus - deductions - absenceDeduction
      const remaining = totalDue - payments
      
      return { ...emp, incentives, deductions, actualAbsenceDays, allowedV, absenceDeduction, vacationBonus, payments, remaining, totalDue, baseSalary, adjustments: empAdj }
    })
  }, [employees, adjustments])

  const handleAddEmployee = async () => {
    if (!isAdmin || !firestore || !user || !formData.firstName) return
    setLoading(true)
    addDocumentNonBlocking(collection(firestore, "users", user.uid, "employees"), { 
      ...formData, 
      salary: Number(formData.salary) || 0, 
      allowedVacations: Number(formData.allowedVacations) ?? 4, 
      presenceOverride: "auto", 
      createdAt: new Date().toISOString() 
    }).then(() => {
      setFormData({ firstName: "", lastName: "", role: "pharmacist", startTime: "09:00", endTime: "17:00", salary: 0, allowedVacations: 4 }); setIsAddOpen(false); setLoading(false); toast({ title: "تم الحفظ" })
    })
  }

  const handleUpdateEmployee = () => {
    if (!isAdmin || !firestore || !user || !editingEmployee) return
    updateDocumentNonBlocking(doc(firestore, "users", user.uid, "employees", editingEmployee.id), { 
      ...editingEmployee, 
      salary: Number(editingEmployee.salary), 
      allowedVacations: Number(editingEmployee.allowedVacations) ?? 0, 
      updatedAt: new Date().toISOString() 
    })
    setIsEditOpen(false); toast({ title: "تم التحديث" })
  }

  const togglePresenceOverride = (emp: any, newState: string) => {
    if (!firestore || !user) return
    updateDocumentNonBlocking(doc(firestore, "users", user.uid, "employees", emp.id), {
      presenceOverride: newState,
      updatedAt: new Date().toISOString()
    })
    toast({ 
      title: newState === 'auto' ? "تمت العودة للجدولة" : newState === 'force_available' ? "تفعيل يدوي (متاح)" : "تعطيل يدوي (غير متاح)"
    })
  }

  const handleAddAdjustment = () => {
    if (!isAdmin || !firestore || !user || !adjData.employeeId) return
    setLoading(true)
    addDocumentNonBlocking(collection(firestore, "users", user.uid, "payrollAdjustments"), { ...adjData, amount: Number(adjData.amount) || 0, days: Number(adjData.days) || 0, employeeName: employees?.find(e => e.id === adjData.employeeId)?.firstName, recordedByName: activeSysUser?.name || "مدير", createdAt: new Date().toISOString() }).then(() => {
      setAdjustmentData({ employeeId: "", type: "incentive", amount: "", days: "1", reason: "", date: new Date().toISOString().split('T')[0] }); setIsAdjustmentOpen(false); setLoading(false); toast({ title: "تم التسجيل" })
    })
  }

  const handleRecordPayment = async () => {
    if (!isAdmin || !firestore || !user || !selectedEmployee || !paymentData.amount || !expenseCategories) return
    setLoading(true)
    const salaryCategory = expenseCategories.find(c => c.name.includes("رواتب") || c.name.includes("أجور")) || expenseCategories[0]
    if (!salaryCategory) { toast({ variant: "destructive", title: "خطأ", description: "يرجى إنشاء فئة (رواتب) في المصروفات." }); setLoading(false); return }

    try {
      await recordEmployeePaymentTransaction(firestore, user.uid, salaryCategory.id, { amount: Number(paymentData.amount), date: paymentData.date, description: `صرف ${paymentData.type === 'salary' ? 'مرتب' : 'سلفة'}: ${selectedEmployee.firstName}`, employeeId: selectedEmployee.id, employeeName: selectedEmployee.firstName, type: paymentData.type === 'salary' ? 'employee_salary' : 'employee_advance', recordedByName: activeSysUser?.name || "مدير" })
      await addDocumentNonBlocking(collection(firestore, "users", user.uid, "payrollAdjustments"), { employeeId: selectedEmployee.id, employeeName: selectedEmployee.firstName, type: paymentData.type === 'salary' ? 'salary_payment' : 'advance_payment', amount: Number(paymentData.amount), reason: `صرف مالي (${paymentData.type === 'salary' ? 'مرتب' : 'سلفة'})`, date: paymentData.date, recordedByName: activeSysUser?.name || "مدير", createdAt: new Date().toISOString() })
      setPaymentData({ amount: "", type: "salary", date: new Date().toISOString().split('T')[0] }); setIsPaymentOpen(false); setLoading(false); toast({ title: "تم الصرف" }); window.dispatchEvent(new CustomEvent('refresh-stats'))
    } catch (e) { setLoading(false) }
  }

  const handleExportExcel = () => {
    const exportData = payrollSummary.map(p => ({ "الموظف": `${p.firstName} ${p.lastName}`, "الأساسي": p.baseSalary, "الغياب": p.actualAbsenceDays, "المكافأة": p.vacationBonus, "الخصم": p.deductions + p.absenceDeduction, "المسدد": p.payments, "المتبقي": p.remaining }));
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "الرواتب");
    XLSX.writeFile(wb, `رواتب_بلو_بوينت_${new Date().toISOString().substring(0, 7)}.xlsx`);
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20 px-4 md:px-0" dir="rtl">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
        <div className="space-y-1"><h2 className="text-3xl font-black text-foreground flex items-center gap-3"><Users className="h-8 w-8 text-primary" /> شؤون الموظفين والرواتب</h2><p className="text-muted-foreground font-medium">إدارة الكادر، مواعيد العمل، ونظام الإجازات والمكافآت المصري.</p></div>
        <div className="flex items-center gap-2">
          <Button onClick={handleExportExcel} variant="outline" className="h-12 rounded-xl border-blue-200 font-bold gap-2 text-blue-700 hover:bg-blue-50"><FileSpreadsheet className="h-4 w-4" /> تصدير الكشف</Button>
          <Button onClick={() => window.print()} variant="outline" className="h-12 rounded-xl font-bold gap-2"><Printer className="h-4 w-4" /> طباعة</Button>
          {isAdmin && <Button onClick={() => setIsAddOpen(true)} className="h-12 rounded-xl bg-primary text-white font-black px-6 shadow-lg shadow-primary/20"><UserPlus className="h-5 w-5 ml-2" /> إضافة موظف</Button>}
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-muted/50 p-1.5 rounded-2xl h-auto gap-1 mb-8 print:hidden">
          <TabsTrigger value="list" className="rounded-xl px-8 py-3 font-black text-xs gap-2"><UserRound className="h-4 w-4" /> كادر الصيدلية</TabsTrigger>
          <TabsTrigger value="adjustments" className="rounded-xl px-8 py-3 font-black text-xs gap-2"><Calculator className="h-4 w-4" /> الحوافز والخصومات</TabsTrigger>
          <TabsTrigger value="payroll" className="rounded-xl px-8 py-3 font-black text-xs gap-2"><Wallet className="h-4 w-4" /> كشف صافي المرتبات</TabsTrigger>
          <TabsTrigger value="external" className="rounded-xl px-8 py-3 font-black text-xs gap-2"><UserCog className="h-4 w-4" /> الدعم الخارجي</TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="space-y-6">
          <Card className="border shadow-xl bg-card rounded-[2.5rem] overflow-hidden">
            <CardHeader className="bg-muted/30 border-b p-6 flex flex-col md:flex-row items-center justify-between gap-4"><CardTitle className="text-xl font-black">بيانات الفريق الأساسي</CardTitle><div className="relative w-full md:w-64"><Search className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" /><Input placeholder="بحث باسم الموظف..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="h-10 pr-10 rounded-xl" /></div></CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader><TableRow className="bg-muted/30 border-b-2"><TableHead className="text-right py-5 font-black">الموظف والتواجد</TableHead><TableHead className="text-right font-black">الشفت</TableHead><TableHead className="text-right font-black">الأساسي / إجازات</TableHead><TableHead className="text-center font-black print:hidden">إجراءات</TableHead></TableRow></TableHeader>
                <TableBody>
                  {isLoading ? <TableRow><TableCell colSpan={4} className="p-20 text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" /></TableCell></TableRow> : filteredEmployees.map(emp => (
                    <TableRow key={emp.id} className="hover:bg-primary/[0.02] border-b transition-colors">
                      <TableCell className="py-6">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10 rounded-xl border border-primary/10">
                            <AvatarFallback className="bg-primary/5 text-primary text-xs font-black">{emp.firstName?.substring(0, 2)}</AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col">
                            <span className="font-black text-lg">{emp.role === 'pharmacist' ? `د. ${emp.firstName}` : emp.firstName} {emp.lastName}</span>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="secondary" className="w-fit bg-primary/5 text-primary text-[9px] font-black border-none">{JOB_ROLES.find(r => r.id === emp.role)?.label || emp.role}</Badge>
                              {emp.presenceOverride !== 'auto' && (
                                <Badge variant="outline" className="text-[8px] font-bold border-amber-200 text-amber-600 bg-amber-50">تحكم يدوي</Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1.5">
                          <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground"><Clock className="h-3.5 w-3.5 text-primary" /><span className="font-english">{emp.startTime}</span> - <span className="font-english">{emp.endTime}</span></div>
                          <div className="flex gap-1 print:hidden">
                            <Button variant="ghost" size="icon" onClick={() => togglePresenceOverride(emp, 'force_available')} title="تفعيل يدوي (متاح الآن)" className={cn("h-7 w-7 rounded-lg", emp.presenceOverride === 'force_available' ? "bg-emerald-500 text-white" : "hover:bg-emerald-50 text-emerald-600")}><CheckCircle2 className="h-4 w-4" /></Button>
                            <Button variant="ghost" size="icon" onClick={() => togglePresenceOverride(emp, 'force_unavailable')} title="تعطيل يدوي (غادر العمل)" className={cn("h-7 w-7 rounded-lg", emp.presenceOverride === 'force_unavailable' ? "bg-rose-500 text-white" : "hover:bg-rose-50 text-rose-600")}><XCircle className="h-4 w-4" /></Button>
                            <Button variant="ghost" size="icon" onClick={() => togglePresenceOverride(emp, 'auto')} title="العودة للجدولة التلقائية" className={cn("h-7 w-7 rounded-lg", emp.presenceOverride === 'auto' ? "bg-primary text-white" : "hover:bg-primary/5 text-primary")}><RefreshCcw className="h-4 w-4" /></Button>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell><div className="flex flex-col"><span className="font-english font-black text-primary text-xl">{Number(emp.salary || 0).toLocaleString()} <span className="text-xs">ج.م</span></span><span className="text-[10px] font-bold text-muted-foreground">إجازة: {emp.allowedVacations ?? 0} أيام</span></div></TableCell>
                      <TableCell className="text-center print:hidden"><div className="flex justify-center gap-1">
                        <Button variant="outline" size="sm" className="rounded-xl font-bold h-9 border-primary text-primary hover:bg-primary/5" onClick={() => { setReportEmployee(payrollSummary.find(p => p.id === emp.id) || emp); setIsReportOpen(true); }}><FileText className="h-4 w-4 ml-2" /> ملف الموظف</Button>
                        <Button variant="outline" size="sm" className="rounded-xl font-bold h-9 border-emerald-600 text-emerald-600 hover:bg-emerald-50" onClick={() => { setSelectedEmployee(emp); setIsPaymentOpen(true); }}><HandCoins className="h-4 w-4 ml-2" /> صرف مالي</Button>
                        <Button variant="ghost" size="icon" className="text-primary h-9 w-9" onClick={() => { setEditingEmployee(emp); setIsEditOpen(true); }}><Edit3 className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" className="text-rose-500 h-9 w-9" onClick={() => { setEmployeeToDelete(emp); setIsDeleteOpen(true); }}><Trash2 className="h-4 w-4" /></Button>
                      </div></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="adjustments" className="space-y-6">
          <div className="grid gap-8 lg:grid-cols-12">
            <div className="lg:col-span-4">
              <Card className="border shadow-xl bg-card rounded-[2.5rem] overflow-hidden sticky top-24">
                <CardHeader className="bg-primary/5 border-b p-6"><CardTitle className="font-black flex gap-2"><PlusCircle className="h-5 w-5" /> إضافة حافز / خصم / غياب</CardTitle></CardHeader>
                <CardContent className="p-6 space-y-5">
                  <div className="space-y-2"><Label className="font-bold">الموظف</Label>
                    <Select value={adjData.employeeId} onValueChange={(v) => setAdjustmentData({...adjData, employeeId: v})}>
                      <SelectTrigger className="h-12 rounded-xl"><SelectValue placeholder="اختر الموظف" /></SelectTrigger>
                      <SelectContent className="rounded-xl">{employees?.map(e => <SelectItem key={e.id} value={e.id} className="font-bold">{e.firstName} {e.lastName}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2"><Label className="font-bold">نوع الحركة</Label>
                    <Select value={adjData.type} onValueChange={(v:any) => setAdjustmentData({...adjData, type: v})}>
                      <SelectTrigger className="h-12 rounded-xl"><SelectValue /></SelectTrigger>
                      <SelectContent className="rounded-xl">{ADJUSTMENT_TYPES.map(t => <SelectItem key={t.id} value={t.id} className="font-bold">{t.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  {adjData.type === 'absence' ? (
                    <div className="space-y-2"><Label className="font-black text-amber-600">عدد أيام الغياب</Label><Input type="number" value={adjData.days} onChange={e => setAdjustmentData({...adjData, days: e.target.value})} className="h-12 rounded-xl font-english" /></div>
                  ) : (
                    <div className="space-y-2"><Label className="font-black text-primary">المبلغ (ج.م)</Label><Input type="number" value={adjData.amount} onChange={e => setAdjustmentData({...adjData, amount: e.target.value})} className="h-12 rounded-xl font-english" /></div>
                  )}
                  <div className="space-y-2"><Label className="font-bold text-xs opacity-70">التاريخ والسبب</Label><div className="grid grid-cols-2 gap-2"><Input type="date" value={adjData.date} onChange={e => setAdjustmentData({...adjData, date: e.target.value})} className="h-12 rounded-xl" /><Input value={adjData.reason} onChange={e => setAdjustmentData({...adjData, reason: e.target.value})} placeholder="السبب..." className="h-12 rounded-xl" /></div></div>
                  <Button onClick={handleAddAdjustment} disabled={loading} className="w-full h-14 bg-primary text-white rounded-2xl font-black shadow-lg">تسجيل الحركة الآن</Button>
                </CardContent>
              </Card>
            </div>
            <div className="lg:col-span-8">
              <Card className="border shadow-xl bg-card rounded-[2.5rem] overflow-hidden">
                <CardHeader className="bg-muted/30 border-b p-6"><CardTitle className="font-black flex gap-2"><CalendarDays className="h-5 w-5 text-primary" /> سجل الحركات الأخير</CardTitle></CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader><TableRow className="bg-muted/30 border-b-2"><TableHead className="text-right py-5 font-black">التاريخ</TableHead><TableHead className="text-right font-black">الموظف</TableHead><TableHead className="text-right font-black">النوع / التفاصيل</TableHead><TableHead className="text-right font-black">القيمة</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {adjustments?.map(a => {
                        const style = ADJUSTMENT_TYPES.find(t => t.id === a.type)
                        return (
                          <TableRow key={a.id} className="hover:bg-muted/20 border-b transition-colors">
                            <TableCell className="font-english text-xs py-4">{a.date}</TableCell>
                            <TableCell className="font-black">{a.employeeName}</TableCell>
                            <TableCell><div className="flex flex-col"><Badge variant="outline" className={cn("w-fit font-bold text-[9px]", style?.color)}>{style?.label}</Badge><span className="text-[10px] text-muted-foreground mt-1">{a.reason}</span></div></TableCell>
                            <TableCell className={cn("font-black font-english text-lg", (a.type === 'incentive' || a.type === 'salary_payment' || a.type === 'advance_payment') ? 'text-emerald-600' : 'text-rose-600')}>{a.type === 'absence' ? `${a.days} يوم` : `${Number(a.amount || 0).toLocaleString()} ج.م`}</TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="payroll" className="space-y-6">
          <Card className="border shadow-xl bg-card rounded-[2.5rem] overflow-hidden">
            <CardHeader className="bg-primary/5 border-b p-8 text-center"><CardTitle className="text-2xl font-black">كشف صافي المرتبات (الشهر الحالي)</CardTitle><CardDescription className="font-bold">يتم خصم السلف والغياب الزائد تلقائياً، وإضافة مكافأة أيام العمل الإضافية.</CardDescription></CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader><TableRow className="bg-muted/30 border-b-2"><TableHead className="text-right py-6 font-black">الموظف</TableHead><TableHead className="text-right font-black">إجمالي المستحق</TableHead><TableHead className="text-right font-black text-rose-600">المسدد (سلف)</TableHead><TableHead className="text-right font-black bg-primary/5 text-primary">المتبقي للصرف</TableHead></TableRow></TableHeader>
                <TableBody>
                  {payrollSummary.map(p => (
                    <TableRow key={p.id} className="hover:bg-primary/[0.01] border-b transition-colors">
                      <TableCell className="font-black py-6"><div className="flex flex-col"><span>{p.role === 'pharmacist' ? `د. ${p.firstName}` : p.firstName} {p.lastName}</span><span className="text-[10px] text-muted-foreground font-bold">{JOB_ROLES.find(r=>r.id===p.role)?.label}</span></div></TableCell>
                      <TableCell><div className="flex flex-col"><span className="text-xs font-bold">الأساسي: {p.baseSalary.toLocaleString()}</span><span className="text-emerald-600 font-black">إجمالي: {p.totalDue.toLocaleString()}</span></div></TableCell>
                      <TableCell className="font-english font-black text-lg text-rose-600">{p.payments.toLocaleString()}</TableCell>
                      <TableCell className="font-english font-black text-2xl text-primary bg-primary/[0.02]">{p.remaining.toLocaleString()} ج.م</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                <TableFooter className="bg-muted/50 border-t-4"><TableRow><TableCell colSpan={3} className="py-8 font-black text-xl text-right">إجمالي صافي المرتبات المتبقي للصرف</TableCell><TableCell className="text-right font-black text-primary text-3xl font-english">{payrollSummary.reduce((s,p) => s + p.remaining, 0).toLocaleString()} <span className="text-lg">ج.م</span></TableCell></TableRow></TableFooter>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="external" className="space-y-6">
          <ExternalSupportManager />
        </TabsContent>
      </Tabs>

      <Dialog open={isReportOpen} onOpenChange={setIsReportOpen}>
        <DialogContent className="sm:max-w-[800px] p-0 overflow-hidden rounded-[2.5rem] border-none shadow-2xl" dir="rtl">
          <div className="bg-primary p-8 text-white flex flex-col md:flex-row items-center gap-6 relative">
            <DialogTitle className="sr-only">الملف الوظيفي: {reportEmployee?.firstName}</DialogTitle>
            <DialogDescription className="sr-only">استعراض الحالة المالية والتشغيلية للموظف</DialogDescription>
            <div className="absolute top-0 left-0 p-10 opacity-10"><FileText className="h-32 w-32 rotate-12" /></div>
            <Avatar className="h-24 w-24 rounded-[2rem] border-4 border-white/20 shadow-xl overflow-hidden bg-white/10">
              <AvatarImage src={reportEmployee?.photoUrl} className="object-cover" />
              <AvatarFallback className="text-3xl font-black">{reportEmployee?.firstName?.substring(0, 2)}</AvatarFallback>
            </Avatar>
            <div className="text-center md:text-right space-y-1 z-10">
              <h2 className="text-3xl font-black text-white">{reportEmployee?.role === 'pharmacist' ? `د. ${reportEmployee?.firstName}` : reportEmployee?.firstName} {reportEmployee?.lastName}</h2>
              <p className="text-white/70 font-bold">تقرير الحالة المالية والتشغيلية للموظف.</p>
              <Badge className="bg-white/20 text-white border-none font-bold">{JOB_ROLES.find(r => r.id === reportEmployee?.role)?.label}</Badge>
            </div>
            <Button onClick={() => window.print()} variant="secondary" className="md:mr-auto rounded-xl font-black gap-2"><Printer className="h-4 w-4" /> طباعة الملف</Button>
          </div>
          <div className="p-8 space-y-8 max-h-[70vh] overflow-y-auto scrollbar-hide bg-background">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="border-none bg-muted/30 rounded-3xl overflow-hidden">
                <CardHeader className="pb-2"><CardTitle className="text-sm font-black flex items-center gap-2"><Activity className="h-4 w-4 text-primary" /> الحالة التشغيلية</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center"><span className="text-xs font-bold text-muted-foreground">مواعيد الشفت:</span><span className="font-english font-black text-primary">{reportEmployee?.startTime} - {reportEmployee?.endTime}</span></div>
                  <div className="flex justify-between items-center"><span className="text-xs font-bold text-muted-foreground">الإجازات الشهرية:</span><span className="font-bold">{reportEmployee?.allowedV || 0} أيام</span></div>
                  <div className="flex justify-between items-center"><span className="text-xs font-bold text-muted-foreground">الغياب الفعلي:</span><span className={cn("font-black", (reportEmployee?.actualAbsenceDays || 0) > (reportEmployee?.allowedV || 0) ? "text-rose-600" : "text-emerald-600")}>{reportEmployee?.actualAbsenceDays || 0} يوم</span></div>
                </CardContent>
              </Card>
              <Card className="border-none bg-primary/5 rounded-3xl overflow-hidden">
                <CardHeader className="pb-2"><CardTitle className="text-sm font-black flex items-center gap-2 text-primary"><Award className="h-4 w-4" /> النبض المالي</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center"><span className="text-xs font-bold text-muted-foreground">الراتب الأساسي:</span><span className="font-english font-black">{Number(reportEmployee?.baseSalary || 0).toLocaleString()} ج.م</span></div>
                  <div className="flex justify-between items-center"><span className="text-xs font-bold text-muted-foreground">حوافز ومكافآت (+):</span><span className="font-english font-black text-emerald-600">+{Number((reportEmployee?.incentives || 0) + (reportEmployee?.vacationBonus || 0)).toLocaleString()} ج.م</span></div>
                  <div className="flex justify-between items-center"><span className="text-xs font-bold text-muted-foreground">خصومات وغياب (-):</span><span className="font-english font-black text-rose-600">-{Number((reportEmployee?.deductions || 0) + (reportEmployee?.absenceDeduction || 0)).toLocaleString()} ج.م</span></div>
                  <Separator className="bg-primary/10" />
                  <div className="flex justify-between items-center pt-1"><span className="font-black text-primary">المتبقي للصرف:</span><span className="text-2xl font-black font-english text-primary">{Number(reportEmployee?.remaining || 0).toLocaleString()} ج.م</span></div>
                </CardContent>
              </Card>
            </div>
            <div className="space-y-4">
              <h3 className="text-lg font-black flex items-center gap-2"><History className="h-5 w-5 text-primary" /> سجل حركات الشهر</h3>
              <div className="rounded-2xl border border-border/50 overflow-hidden">
                <Table>
                  <TableHeader className="bg-muted/50"><TableRow><TableHead className="text-right font-black">التاريخ</TableHead><TableHead className="text-right font-black">النوع والبيان</TableHead><TableHead className="text-right font-black">القيمة</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {reportEmployee?.adjustments?.length > 0 ? reportEmployee.adjustments.map((a: any) => (
                      <TableRow key={a.id}>
                        <TableCell className="font-english text-xs py-4">{a.date}</TableCell>
                        <TableCell><span className="font-bold text-xs">{ADJUSTMENT_TYPES.find(t => t.id === a.type)?.label} - {a.reason}</span></TableCell>
                        <TableCell className={cn("font-black font-english", (a.type === 'incentive' || a.type === 'salary_payment' || a.type === 'advance_payment') ? 'text-emerald-600' : 'text-rose-600')}>{a.type === 'absence' ? `${a.days} يوم` : `${Number(a.amount || 0).toLocaleString()} ج.م`}</TableCell>
                      </TableRow>
                    )) : <TableRow><TableCell colSpan={3} className="text-center py-10 text-muted-foreground italic font-bold">لا توجد حركات مسجلة.</TableCell></TableRow>}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="sm:max-w-[500px] text-right rounded-[2.5rem]" dir="rtl"><DialogHeader><DialogTitle className="text-2xl font-black">إضافة موظف جديد</DialogTitle></DialogHeader><div className="grid gap-4 py-4"><div className="grid grid-cols-2 gap-4"><div className="space-y-2"><Label className="font-bold">الاسم الأول</Label><Input value={formData.firstName} onChange={e => setFormData({...formData, firstName: e.target.value})} className="h-12 rounded-xl" /></div><div className="space-y-2"><Label className="font-bold">اللقب</Label><Input value={formData.lastName} onChange={e => setFormData({...formData, lastName: e.target.value})} className="h-12 rounded-xl" /></div></div><div className="grid grid-cols-2 gap-4"><div className="space-y-2"><Label className="font-bold">المسمى الوظيفي</Label><Select onValueChange={v => setFormData({...formData, role: v})} value={formData.role}><SelectTrigger className="h-12 rounded-xl"><SelectValue /></SelectTrigger><SelectContent className="rounded-xl">{JOB_ROLES.map(r => <SelectItem key={r.id} value={r.id} className="font-bold">{r.label}</SelectItem>)}</SelectContent></Select></div><div className="space-y-2"><Label className="font-bold">إجازات شهرية (أيام)</Label><Input type="number" value={formData.allowedVacations} onChange={e => setFormData({...formData, allowedVacations: Number(e.target.value)})} className="h-12 rounded-xl font-english" /></div></div><div className="grid grid-cols-2 gap-4"><div className="space-y-2"><Label className="font-bold">بداية الشفت</Label><Input type="time" value={formData.startTime} onChange={e => setFormData({...formData, startTime: e.target.value})} className="h-12 rounded-xl font-english" /></div><div className="space-y-2"><Label className="font-bold">نهاية الشفت</Label><Input type="time" value={formData.endTime} onChange={e => setFormData({...formData, endTime: e.target.value})} className="h-12 rounded-xl font-english" /></div></div><div className="space-y-2"><Label className="font-black text-primary">المرتب الأساسي (ج.م)</Label><Input type="number" value={formData.salary} onChange={e => setFormData({...formData, salary: Number(e.target.value)})} className="h-14 text-2xl font-black text-primary text-left rounded-2xl bg-muted/30 border-none shadow-inner" /></div></div><DialogFooter><Button onClick={handleAddEmployee} disabled={loading} className="bg-primary text-white flex-1 h-14 rounded-2xl font-black shadow-lg">حفظ الموظف</Button></DialogFooter></DialogContent>
      </Dialog>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-[500px] text-right rounded-[2.5rem]" dir="rtl"><DialogHeader><DialogTitle className="text-2xl font-black text-primary">تعديل بيانات الكادر</DialogTitle></DialogHeader><div className="grid gap-4 py-4"><div className="grid grid-cols-2 gap-4"><div className="space-y-2"><Label className="font-bold">الاسم</Label><Input value={editingEmployee?.firstName || ""} onChange={e => setEditingEmployee({...editingEmployee, firstName: e.target.value})} className="h-12 rounded-xl" /></div><div className="space-y-2"><Label className="font-bold">اللقب</Label><Input value={editingEmployee?.lastName || ""} onChange={e => setEditingEmployee({...editingEmployee, lastName: e.target.value})} className="h-12 rounded-xl" /></div></div><div className="grid grid-cols-2 gap-4"><div className="space-y-2"><Label className="font-bold">المسمى الوظيفي</Label><Select onValueChange={v => setEditingEmployee({...editingEmployee, role: v})} value={editingEmployee?.role}><SelectTrigger className="h-12 rounded-xl"><SelectValue /></SelectTrigger><SelectContent className="rounded-xl">{JOB_ROLES.map(r => <SelectItem key={r.id} value={r.id} className="font-bold">{r.label}</SelectItem>)}</SelectContent></Select></div><div className="space-y-2"><Label className="font-bold">إجازات مسموحة (أيام)</Label><Input type="number" value={editingEmployee?.allowedVacations ?? 0} onChange={e => setEditingEmployee({...editingEmployee, allowedVacations: e.target.value})} className="h-12 rounded-xl font-english" /></div></div><div className="grid grid-cols-2 gap-4"><div className="space-y-2"><Label className="font-bold">بداية الشفت</Label><Input type="time" value={editingEmployee?.startTime || ""} onChange={e => setEditingEmployee({...editingEmployee, startTime: e.target.value})} className="h-12 rounded-xl font-english" /></div><div className="space-y-2"><Label className="font-bold">نهاية الشفت</Label><Input type="time" value={editingEmployee?.endTime || ""} onChange={e => setEditingEmployee({...editingEmployee, endTime: e.target.value})} className="h-12 rounded-xl font-english" /></div></div><div className="space-y-2"><Label className="font-black text-primary">المرتب الشهري</Label><Input type="number" value={editingEmployee?.salary || 0} onChange={e => setEditingEmployee({...editingEmployee, salary: e.target.value})} className="h-14 text-2xl font-black text-primary text-left font-english bg-muted/30 border-none rounded-2xl" /></div></div><DialogFooter><Button onClick={handleUpdateEmployee} className="bg-primary text-white flex-1 h-14 rounded-2xl font-black">حفظ التغييرات</Button></DialogFooter></DialogContent>
      </Dialog>

      <Dialog open={isPaymentOpen} onOpenChange={setIsPaymentOpen}>
        <DialogContent className="sm:max-w-[400px] text-right rounded-[2.5rem]" dir="rtl"><DialogHeader><DialogTitle className="text-2xl font-black text-emerald-600">صرف مبالغ للموظف</DialogTitle></DialogHeader><div className="space-y-6 py-6"><div className="p-6 bg-emerald-500/5 rounded-3xl text-center border border-emerald-500/10"><p className="text-[10px] font-black opacity-60">صرف للموظف:</p><p className="text-xl font-black text-emerald-700">{selectedEmployee?.firstName} {selectedEmployee?.lastName}</p></div><div className="space-y-3"><Label className="font-bold">نوع الصرف</Label><Select value={paymentData.type} onValueChange={(v: any) => setPaymentData({...paymentData, type: v})}><SelectTrigger className="h-12 rounded-xl bg-muted/30 border-none"><SelectValue /></SelectTrigger><SelectContent className="rounded-xl"><SelectItem value="salary" className="font-bold">صرف مرتب كامل</SelectItem><SelectItem value="advance" className="font-bold text-amber-600">سلفة تحت الحساب</SelectItem></SelectContent></Select></div><div className="space-y-3"><Label className="font-black">المبلغ المصروف (ج.م)</Label><Input type="number" value={paymentData.amount} onChange={e => setPaymentData({...paymentData, amount: e.target.value})} className="h-16 text-center text-3xl font-black text-emerald-600 bg-muted/30 border-none rounded-2xl" placeholder="0.00" autoFocus /></div></div><DialogFooter><Button onClick={handleRecordPayment} disabled={loading || !paymentData.amount} className="bg-emerald-600 hover:bg-emerald-700 text-white flex-1 h-16 rounded-2xl font-black text-xl shadow-lg">{loading ? <Loader2 className="h-6 w-6 animate-spin" /> : "تأكيد الصرف النقدي"}</Button></DialogFooter></DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent className="text-right border-2 border-rose-500 rounded-[2.5rem]" dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-2xl font-black text-rose-600">تأكيد حذف سجل موظف</AlertDialogTitle>
            <AlertDialogDescription className="font-bold text-base mt-2">هل أنت متأكد من حذف هذا الموظف؟ سيتم مسح كافة سجلات التسويات الخاصة به نهائياً.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-3 mt-8">
            <AlertDialogAction onClick={() => { deleteDocumentNonBlocking(doc(firestore!, "users", user!.uid, "employees", employeeToDelete.id)); setIsDeleteOpen(false); }} className="bg-rose-600 text-white flex-1 h-14 rounded-2xl font-black">تأكيد الحذف</AlertDialogAction>
            <AlertDialogCancel className="flex-1 h-14 rounded-2xl font-bold">إلغاء</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
