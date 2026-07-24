
"use client"

import { useState, useMemo, useEffect } from "react"
import { useFirestore, useUser, useCollection, useMemoFirebase } from "@/firebase"
import { collection, doc, getDocs } from "firebase/firestore"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableFooter, TableHead, TableHeader, TableRow, TableCell } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import { 
  Loader2, 
  Printer, 
  Search, 
  Receipt,
  Tags,
  Filter,
  TrendingDown,
  Info,
  FileSpreadsheet,
  PlusCircle,
  Lock,
  LayoutGrid,
  Edit3,
  Trash2,
  CalendarDays,
  ShieldCheck,
  Eye
} from "lucide-react"
import { addDocumentNonBlocking, updateDocumentNonBlocking, deleteDocumentNonBlocking } from "@/firebase/non-blocking-updates"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { ReadOnlyGuard } from "./shared/read-only-guard"
import * as XLSX from 'xlsx'
import { APP_CONSTANTS } from "@/lib/constants"

export function ExpensesSection() {
  const firestore = useFirestore()
  const { user } = useUser()
  const { toast } = useToast()
  
  const [activeTab, setActiveTab] = useState("log")
  const [loading, setLoading] = useState(false)
  const [globalLoading, setGlobalLoading] = useState(true)
  const [allExpenses, setAllExpenses] = useState<any[]>([])
  
  // حقول إضافة مصروف
  const [amount, setAmount] = useState("")
  const [selectedCategoryId, setSelectedCategoryId] = useState("")
  const [description, setDescription] = useState("")
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  
  // حقول البحث والفلترة
  const [searchTerm, setSearchTerm] = useState("")
  const [filterCategoryId, setFilterCategoryId] = useState("all")
  const [isAdvFilterOpen, setIsAdvFilterOpen] = useState(false)
  const [advFilters, setAdvFilters] = useState({ startDate: "", endDate: "" })

  // تصنيفات المصروفات
  const [isAddCatOpen, setIsAddCatOpen] = useState(false)
  const [isEditCatOpen, setIsEditCatOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<any>(null)
  const [catName, setCatCatName] = useState("")

  const activeSysUser = useMemo(() => {
    if (typeof window === 'undefined') return null
    const saved = localStorage.getItem("activeSystemUser")
    return saved ? JSON.parse(saved) : null
  }, [])

  const isManager = activeSysUser?.role === 'admin';
  const isOwner = activeSysUser?.role === 'owner';
  const canManage = isManager; 

  const categoriesQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null
    return collection(firestore, APP_CONSTANTS.COLLECTIONS.USERS, user.uid, APP_CONSTANTS.COLLECTIONS.EXPENSE_CATS)
  }, [firestore, user])
  const { data: categories, isLoading: isCatsLoading } = useCollection(categoriesQuery)

  const fetchAllExpenses = async () => {
    if (!firestore || !user || !categories) return
    setGlobalLoading(true)
    try {
      const consolidated: any[] = []
      for (const cat of categories) {
        const snap = await getDocs(collection(firestore, APP_CONSTANTS.COLLECTIONS.USERS, user.uid, APP_CONSTANTS.COLLECTIONS.EXPENSE_CATS, cat.id, APP_CONSTANTS.COLLECTIONS.EXPENSES))
        snap.docs.forEach(d => {
          const data = d.data()
          if (data.type !== 'supplier_payment' && data.type !== 'employee_payment') {
            consolidated.push({ ...data, id: d.id, categoryName: cat.name, expenseCategoryId: cat.id })
          }
        })
      }
      setAllExpenses(consolidated.sort((a, b) => new Date(b.createdAt || b.date).getTime() - new Date(a.createdAt || a.date).getTime()))
    } finally { setGlobalLoading(false) }
  }

  useEffect(() => { fetchAllExpenses() }, [categories])

  const filteredExpenses = useMemo(() => {
    return allExpenses.filter(e => {
      const matchSearch = e.description?.toLowerCase().includes(searchTerm.toLowerCase()) || e.amount?.toString().includes(searchTerm) || e.categoryName?.toLowerCase().includes(searchTerm.toLowerCase())
      const matchCat = filterCategoryId === 'all' || e.expenseCategoryId === filterCategoryId
      const matchStart = !advFilters.startDate || e.date >= advFilters.startDate
      const matchEnd = !advFilters.endDate || e.date <= advFilters.endDate
      return matchSearch && matchCat && matchStart && matchEnd
    })
  }, [allExpenses, searchTerm, filterCategoryId, advFilters])

  const totals = useMemo(() => {
    const totalFiltered = filteredExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0)
    const todayStr = new Date().toISOString().split('T')[0]
    const todayTotal = allExpenses.filter(e => e.date === todayStr).reduce((sum, e) => sum + (Number(e.amount) || 0), 0)
    return { totalFiltered, todayTotal }
  }, [filteredExpenses, allExpenses])

  const handleAddExpense = async () => {
    if (!canManage || !firestore || !user || !amount || !selectedCategoryId || !description) return
    setLoading(true)
    const colRef = collection(firestore, APP_CONSTANTS.COLLECTIONS.USERS, user.uid, APP_CONSTANTS.COLLECTIONS.EXPENSE_CATS, selectedCategoryId, APP_CONSTANTS.COLLECTIONS.EXPENSES)
    addDocumentNonBlocking(colRef, { amount: Number(amount), date, description, recordedByName: activeSysUser?.name || "مستخدم", type: "general_expense", createdAt: new Date().toISOString() }).then(() => {
      setAmount(""); setDescription(""); setLoading(false); toast({ title: "تم الحفظ" }); window.dispatchEvent(new CustomEvent('refresh-stats')); fetchAllExpenses()
    })
  }

  const handleAddCategory = () => {
    if (!canManage || !firestore || !user || !catName) return
    addDocumentNonBlocking(collection(firestore, APP_CONSTANTS.COLLECTIONS.USERS, user.uid, APP_CONSTANTS.COLLECTIONS.EXPENSE_CATS), {
      name: catName,
      createdAt: new Date().toISOString()
    }).then(() => {
      setIsAddCatOpen(false); setCatCatName(""); toast({ title: "تمت إضافة البند" })
    })
  }

  const handleUpdateCategory = () => {
    if (!canManage || !firestore || !user || !editingCategory) return
    updateDocumentNonBlocking(doc(firestore, APP_CONSTANTS.COLLECTIONS.USERS, user.uid, APP_CONSTANTS.COLLECTIONS.EXPENSE_CATS, editingCategory.id), {
      name: editingCategory.name,
      updatedAt: new Date().toISOString()
    })
    setIsEditCatOpen(false); toast({ title: "تم التحديث" })
  }

  const handleExportExcel = () => {
    const exportData = filteredExpenses.map(e => ({ "التاريخ": e.date, "البند": e.categoryName, "البيان": e.description, "المبلغ": e.amount }));
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "المصروفات");
    XLSX.writeFile(wb, `مصروفات_بلو_بوينت_${new Date().toISOString().split('T')[0]}.xlsx`);
    toast({ title: "تم تصدير الإكسيل" });
  }

  return (
    <div className="space-y-8 pb-20 px-4 md:px-0" dir="rtl">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
        <div>
          <h2 className="text-3xl font-black text-foreground flex items-center gap-3">
            <Receipt className="h-8 w-8 text-rose-500" /> 
            المصروفات التشغيلية
          </h2>
          <p className="text-muted-foreground flex items-center gap-2"><Info className="h-4 w-4 text-primary" /> متابعة التدفقات الخارجة والمصاريف العامة.</p>
        </div>
        <div className="flex items-center gap-2">
          {activeTab === 'log' && (
            <Button onClick={handleExportExcel} variant="outline" className="h-12 rounded-xl border-rose-200 text-rose-700 font-bold gap-2">
              <FileSpreadsheet className="h-4 w-4" /> تصدير إكسيل
            </Button>
          )}
          <Button onClick={() => window.print()} variant="outline" className="h-12 rounded-xl font-bold border-primary/20">
            <Printer className="h-4 w-4" /> طباعة
          </Button>
          {canManage && activeTab === 'categories' && (
            <Button onClick={() => setIsAddCatOpen(true)} className="h-12 rounded-2xl bg-primary text-white font-black px-6 shadow-lg gap-2">
              <PlusCircle className="h-5 w-5" /> إضافة بند مصروفات
            </Button>
          )}
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-8 print:hidden">
          <TabsList className="bg-muted/50 p-1.5 rounded-2xl h-auto gap-1">
            <TabsTrigger value="log" className="rounded-xl px-8 py-3 font-black text-xs gap-2">
              <Receipt className="h-4 w-4" /> سجل المصروفات
            </TabsTrigger>
            <TabsTrigger value="categories" className="rounded-xl px-8 py-3 font-black text-xs gap-2">
              <LayoutGrid className="h-4 w-4" /> بنود المصروفات
            </TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <Search className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="بحث سريع..." 
                value={searchTerm} 
                onChange={(e) => setSearchTerm(e.target.value)} 
                className="h-10 pr-10 rounded-xl font-bold border-none bg-card shadow-inner" 
              />
            </div>
            {activeTab === 'log' && (
              <Button variant="outline" onClick={() => setIsAdvFilterOpen(true)} className="h-10 rounded-xl font-bold gap-2 bg-background border-primary/20">
                <Filter className="h-4 w-4" /> فلترة
              </Button>
            )}
          </div>
        </div>

        <TabsContent value="log" className="space-y-8 animate-in fade-in">
          <div className="grid gap-4 md:grid-cols-3">
            <KPIItem label="منصرف اليوم" value={totals.todayTotal.toLocaleString()} icon={TrendingDown} color="rose" />
            <KPIItem label="نتائج الفلترة" value={totals.totalFiltered.toLocaleString()} icon={Filter} color="primary" highlight />
            <KPIItem label="بنود الميزانية" value={categories?.length || 0} icon={Tags} color="amber" />
          </div>

          <div className="grid gap-8 md:grid-cols-12 print:block">
            <div className="md:col-span-4 print:hidden">
              <Card className={cn("glass-card rounded-[2.5rem] border-none shadow-2xl overflow-hidden sticky top-24", isOwner && "opacity-60")}>
                {isOwner ? (
                  <ReadOnlyGuard role="owner" />
                ) : canManage ? (
                  <CardContent className="p-6 space-y-5">
                    <CardTitle className="text-xl font-black flex items-center gap-2"><PlusCircle className="h-5 w-5 text-rose-500" /> تسجيل مصروف</CardTitle>
                    <Select onValueChange={setSelectedCategoryId} value={selectedCategoryId}>
                      <SelectTrigger className="h-12 rounded-xl bg-muted/30 border-none font-bold"><SelectValue placeholder="اختر البند..." /></SelectTrigger>
                      <SelectContent className="rounded-xl">{categories?.map(cat => <SelectItem key={cat.id} value={cat.id} className="font-bold">{cat.name}</SelectItem>)}</SelectContent>
                    </Select>
                    <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-12 rounded-xl" />
                    <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" className="h-14 text-2xl font-black text-rose-600 text-left font-english shadow-inner" />
                    <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="البيان (إيجار، فاتورة كهرباء...)" className="h-12 rounded-xl font-bold" />
                    <Button onClick={handleAddExpense} disabled={loading} className="w-full h-14 bg-rose-600 text-white rounded-2xl font-black shadow-lg">
                      {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "حفظ المصروف"}
                    </Button>
                  </CardContent>
                ) : <ReadOnlyGuard role="staff" type="restricted" />}
              </Card>
            </div>
            <div className="md:col-span-8">
              <Card className="border shadow-xl bg-card rounded-[2.5rem] overflow-hidden">
                <CardHeader className="bg-muted/30 p-6">
                  <CardTitle className="text-xl font-black">سجل المصروفات الموثق</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <Table className="ledger-table">
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead className="text-right py-6 font-black">التاريخ</TableHead>
                        <TableHead className="text-right font-black">البيان / البند</TableHead>
                        <TableHead className="text-right font-black">المبلغ</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {globalLoading ? <TableRow><TableCell colSpan={3} className="p-20 text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto text-rose-600" /></TableCell></TableRow> : filteredExpenses.length > 0 ? filteredExpenses.map((exp) => (
                        <TableRow key={exp.id} className="border-b transition-colors hover:bg-rose-500/[0.03]">
                          <TableCell className="font-english text-xs font-black text-right">{exp.date}</TableCell>
                          <TableCell className="text-right"><div className="flex flex-col"><span className="font-black">{exp.description}</span><Badge variant="outline" className="w-fit text-[9px] h-4 mt-1 border-none bg-muted font-bold">{exp.categoryName}</Badge></div></TableCell>
                          <TableCell className="font-black text-rose-500 text-lg font-english text-right">-{exp.amount?.toLocaleString()}</TableCell>
                        </TableRow>
                      )) : <TableRow><TableCell colSpan={3} className="p-20 text-center font-bold text-muted-foreground">لا توجد مصروفات مطابقة.</TableCell></TableRow>}
                    </TableBody>
                    <TableFooter className="bg-rose-500/10 border-t-4 border-rose-500/20">
                      <TableRow>
                        <TableCell colSpan={2} className="py-10 font-black text-2xl text-right border-none">إجمالي مصروفات العرض</TableCell>
                        <TableCell className="text-right font-black text-rose-600 text-4xl font-english border-none">{totals.totalFiltered.toLocaleString()}</TableCell>
                      </TableRow>
                    </TableFooter>
                  </Table>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="categories" className="space-y-8 animate-in slide-in-from-bottom-2">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {isCatsLoading ? (
              <div className="col-span-full p-20 text-center"><Loader2 className="h-10 w-10 animate-spin mx-auto text-primary" /></div>
            ) : categories && categories.length > 0 ? (
              categories.map((cat) => (
                <Card key={cat.id} className="border shadow-lg rounded-[2.5rem] overflow-hidden group transition-all hover:shadow-xl relative bg-card">
                  <div className={cn("absolute top-0 right-0 w-1.5 h-full bg-rose-500")} />
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <div className="h-12 w-12 rounded-2xl bg-muted flex items-center justify-center text-rose-500 shadow-inner">
                        <Tags className="h-6 w-6" />
                      </div>
                      <div className="flex gap-1 print:hidden">
                        {canManage ? (
                          <>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-primary hover:bg-primary/10 rounded-lg" onClick={() => { setEditingCategory(cat); setIsEditCatOpen(true); }}><Edit3 className="h-4 w-4" /></Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-rose-500 hover:bg-rose-50 rounded-lg" onClick={() => deleteDocumentNonBlocking(doc(firestore!, "users", user!.uid, "expenseCategories", cat.id))}><Trash2 className="h-4 w-4" /></Button>
                          </>
                        ) : <Eye className="h-4 w-4 text-muted-foreground opacity-30" />}
                      </div>
                    </div>
                    <CardTitle className="text-xl font-black mt-4">{cat.name}</CardTitle>
                    <CardDescription className="font-bold">بند ميزانية معتمد</CardDescription>
                  </CardHeader>
                </Card>
              ))
            ) : (
              <div className="col-span-full p-32 text-center space-y-4">
                <Tags className="h-16 w-16 text-muted-foreground/20 mx-auto" />
                <p className="text-muted-foreground font-bold">لم تقم بتعريف بنود ميزانية المصروفات بعد.</p>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={isAdvFilterOpen} onOpenChange={setIsAdvFilterOpen}>
        <DialogContent className="sm:max-w-[450px] text-right rounded-[2.5rem]" dir="rtl">
          <DialogHeader><DialogTitle className="text-2xl font-black">فلترة المصروفات</DialogTitle></DialogHeader>
          <div className="grid gap-6 py-6">
            <div className="space-y-2 text-right"><Label className="font-bold">حسب البند</Label>
              <Select value={filterCategoryId} onValueChange={setFilterCategoryId}>
                <SelectTrigger className="h-12 rounded-xl text-right font-bold"><SelectValue /></SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="all" className="font-bold text-right">كل البنود</SelectItem>
                  {categories?.map(cat => <SelectItem key={cat.id} value={cat.id} className="font-bold text-right">{cat.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2 text-right"><Label className="font-bold">من تاريخ</Label><Input type="date" value={advFilters.startDate} onChange={(e) => setAdvFilters({...advFilters, startDate: e.target.value})} className="h-12 rounded-xl font-english" /></div>
              <div className="space-y-2 text-right"><Label className="font-bold">إلى تاريخ</Label><Input type="date" value={advFilters.endDate} onChange={(e) => setAdvFilters({...advFilters, endDate: e.target.value})} className="h-12 rounded-xl font-english" /></div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button onClick={() => setIsAdvFilterOpen(false)} className="bg-primary text-white flex-1 font-black h-12 rounded-xl shadow-lg">تطبيق</Button>
            <Button variant="outline" onClick={() => { setAdvFilters({startDate:"", endDate:""}); setFilterCategoryId("all"); setIsAdvFilterOpen(false); }} className="flex-1 font-bold h-12 rounded-xl">إعادة ضبط</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isAddCatOpen} onOpenChange={setIsAddCatOpen}>
        <DialogContent className="sm:max-w-[450px] text-right rounded-[2.5rem]" dir="rtl">
          <DialogHeader><DialogTitle className="text-2xl font-black text-rose-600 flex items-center gap-2"><PlusCircle className="h-6 w-6" /> إضافة بند ميزانية</DialogTitle></DialogHeader>
          <div className="grid gap-6 py-6">
            <div className="space-y-2 text-right">
              <Label className="font-bold">اسم البند</Label>
              <Input value={catName} onChange={e => setCatCatName(e.target.value)} className="h-12 rounded-xl font-black" placeholder="مثال: فاتورة الإنترنت / صيانة التكييف" />
            </div>
          </div>
          <DialogFooter><Button onClick={handleAddCategory} className="bg-rose-600 text-white flex-1 h-14 rounded-2xl font-black shadow-lg">حفظ البند الجديد</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditCatOpen} onOpenChange={setIsEditCatOpen}>
        <DialogContent className="sm:max-w-[450px] text-right rounded-[2.5rem]" dir="rtl">
          <DialogHeader><DialogTitle className="text-2xl font-black text-primary">تعديل مسمى البند</DialogTitle></DialogHeader>
          <div className="grid gap-6 py-6">
            <div className="space-y-2 text-right"><Label className="font-bold">اسم البند</Label><Input value={editingCategory?.name || ""} onChange={e => setEditingCategory({...editingCategory, name: e.target.value})} className="h-12 rounded-xl font-black" /></div>
          </div>
          <DialogFooter><Button onClick={handleUpdateCategory} className="bg-primary text-white flex-1 h-12 rounded-xl font-black shadow-lg">حفظ التغييرات</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function KPIItem({ label, value, icon: Icon, color, highlight }: any) {
  const styles: any = { rose: "bg-rose-500/10 text-rose-500 border-rose-500/20", primary: "bg-primary/10 text-primary border-primary/20", amber: "bg-amber-500/10 text-amber-600 border-amber-500/20" }
  return (
    <Card className={cn("border shadow-sm rounded-[2rem] transition-all hover:shadow-xl", highlight && 'ring-2 ring-primary ring-offset-2')}>
      <CardContent className="p-6 flex items-center justify-between">
        <div><p className="text-[11px] font-bold text-muted-foreground uppercase">{label}</p><h3 className="text-3xl font-black font-english">{value}</h3></div>
        <div className={cn("h-12 w-12 rounded-xl flex items-center justify-center shadow-inner", styles[color])}><Icon className="h-6 w-6" /></div>
      </CardContent>
    </Card>
  )
}
