
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
  Building2,
  Filter,
  UserCheck,
  FileSpreadsheet,
  ArrowUpCircle,
  ArrowDownCircle,
  Boxes,
  Edit3,
  Trash2,
  Lock,
  History,
  Users,
  MapPin,
  Phone,
  LayoutGrid,
  UserRound,
  Scale,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  AlertTriangle,
  CalendarDays,
  ShieldCheck,
  Eye
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"

export function InterBranchTransfersSection() {
  const firestore = useFirestore()
  const { user } = useUser()
  const { toast } = useToast()
  
  const [activeMainTab, setActiveMainTab] = useState("transfers")
  const [loading, setLoading] = useState(false)
  
  const [transferSearch, setTransferSearch] = useState("")
  const [balanceSearch, setBalanceSearch] = useState("")
  const [directorySearch, setDirectorySearch] = useState("")
  
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [isAdvFilterOpen, setIsAdvFilterOpen] = useState(false)

  const [isAddBranchOpen, setIsAddBranchOpen] = useState(false)
  const [isEditBranchOpen, setIsEditBranchOpen] = useState(false)
  const [editingBranch, setEditingBranch] = useState<any>(null)
  const [branchToDelete, setBranchToDelete] = useState<any>(null)
  const [isDeleteBranchOpen, setIsDeleteBranchOpen] = useState(false)

  const [branchFormData, setBranchFormData] = useState({
    name: "",
    type: "sub", 
    manager: "",
    phone: "",
    employees: "",
    address: ""
  })

  const [formData, setFormData] = useState({
    otherBranch: "",
    type: "out", 
    amount: "",
    senderName: "",
    receiverName: "",
    date: new Date().toISOString().split('T')[0],
    notes: ""
  })

  const [editingTransfer, setEditingTransfer] = useState<any>(null)
  const [transferToDelete, setTransferToDelete] = useState<any>(null)
  
  const [filterType, setFilterType] = useState("all")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")

  const activeSysUser = useMemo(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem("activeSystemUser") : null
    return saved ? JSON.parse(saved) : null
  }, [])

  const isManager = activeSysUser?.role === 'admin';
  const isOwner = activeSysUser?.role === 'owner';
  const canManage = isManager; 

  const transfersQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null
    return collection(firestore, APP_CONSTANTS.COLLECTIONS.USERS, user.uid, APP_CONSTANTS.COLLECTIONS.BRANCH_TRANSFERS)
  }, [firestore, user])
  const { data: transfers, isLoading } = useCollection(transfersQuery)

  const branchesQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null
    return collection(firestore, APP_CONSTANTS.COLLECTIONS.USERS, user.uid, APP_CONSTANTS.COLLECTIONS.BRANCHES)
  }, [firestore, user])
  const { data: branches, isLoading: isBranchesLoading } = useCollection(branchesQuery)

  const employeesQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null
    return collection(firestore, APP_CONSTANTS.COLLECTIONS.USERS, user.uid, APP_CONSTANTS.COLLECTIONS.EMPLOYEES)
  }, [firestore, user])
  const { data: mainEmployees } = useCollection(employeesQuery)

  const filteredTransfers = useMemo(() => {
    if (!transfers) return []
    return transfers.filter(t => {
      const matchSearch = (t.otherBranch || "").toLowerCase().includes(transferSearch.toLowerCase()) || 
                          (t.senderName || "").toLowerCase().includes(transferSearch.toLowerCase()) ||
                          (t.receiverName || "").toLowerCase().includes(transferSearch.toLowerCase())
      const matchType = filterType === 'all' || t.type === filterType
      const matchStart = !startDate || t.date >= startDate
      const matchEnd = !endDate || t.date <= endDate
      return matchSearch && matchType && matchStart && matchEnd
    }).sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
  }, [transfers, transferSearch, filterType, startDate, endDate])

  const selectedBranchEmployees = useMemo(() => {
    if (!formData.otherBranch || !branches) return []
    const branch = branches.find(b => b.name === formData.otherBranch)
    if (!branch || !branch.employees) return []
    return branch.employees.split('\n').map((name: string) => name.trim()).filter(Boolean)
  }, [formData.otherBranch, branches])

  const stats = useMemo(() => {
    const totalIn = filteredTransfers.filter(t => t.type === 'in').reduce((sum, t) => sum + (Number(t.amount) || 0), 0)
    const totalOut = filteredTransfers.filter(t => t.type === 'out').reduce((sum, t) => sum + (Number(t.amount) || 0), 0)
    return { totalIn, totalOut, net: totalIn - totalOut }
  }, [filteredTransfers])

  const branchBalances = useMemo(() => {
    if (!transfers) return []
    const balanceMap: Record<string, { in: number, out: number }> = {}
    transfers.forEach(t => {
      const branchName = t.otherBranch || "مجهول"
      if (!balanceMap[branchName]) balanceMap[branchName] = { in: 0, out: 0 }
      if (t.type === 'in') balanceMap[branchName].in += Number(t.amount) || 0
      else balanceMap[branchName].out += Number(t.amount) || 0
    })

    return Object.entries(balanceMap)
      .map(([name, vals]) => {
        const net = vals.out - vals.in 
        return {
          name,
          totalIn: vals.in,
          totalOut: vals.out,
          net,
          status: net > 0 ? "مدين لنا" : net < 0 ? "دائن لنا" : "متعادل"
        }
      })
      .filter(b => b.name.toLowerCase().includes(balanceSearch.toLowerCase()))
      .sort((a, b) => Math.abs(b.net) - Math.abs(a.net))
  }, [transfers, balanceSearch])

  const filteredBranches = useMemo(() => {
    if (!branches) return []
    return branches.filter(b => 
      b.name?.toLowerCase().includes(directorySearch.toLowerCase()) || 
      b.manager?.toLowerCase().includes(directorySearch.toLowerCase())
    )
  }, [branches, directorySearch])

  const handleAddBranch = () => {
    if (!canManage || !firestore || !user || !branchFormData.name) return
    setLoading(true)
    addDocumentNonBlocking(collection(firestore, APP_CONSTANTS.COLLECTIONS.USERS, user.uid, APP_CONSTANTS.COLLECTIONS.BRANCHES), {
      ...branchFormData,
      createdAt: new Date().toISOString()
    }).then(() => {
      setLoading(false); setIsAddBranchOpen(false);
      setBranchFormData({ name: "", type: "sub", manager: "", phone: "", employees: "", address: "" });
      toast({ title: "تم تسجيل الفرع" })
    })
  }

  const handleUpdateBranch = () => {
    if (!canManage || !firestore || !user || !editingBranch) return
    updateDocumentNonBlocking(doc(firestore, APP_CONSTANTS.COLLECTIONS.USERS, user.uid, APP_CONSTANTS.COLLECTIONS.BRANCHES, editingBranch.id), {
      ...editingBranch,
      updatedAt: new Date().toISOString()
    })
    setIsEditBranchOpen(false); toast({ title: "تم تحديث البيانات" })
  }

  const handleDeleteBranch = () => {
    if (!canManage || !firestore || !user || !branchToDelete) return
    deleteDocumentNonBlocking(doc(firestore, APP_CONSTANTS.COLLECTIONS.USERS, user.uid, APP_CONSTANTS.COLLECTIONS.BRANCHES, branchToDelete.id))
    setIsDeleteBranchOpen(false); toast({ title: "تم حذف الفرع" })
  }

  const handleAddTransfer = async () => {
    if (!canManage || !firestore || !user || !formData.otherBranch || !formData.amount) return
    setLoading(true)
    addDocumentNonBlocking(collection(firestore, APP_CONSTANTS.COLLECTIONS.USERS, user.uid, APP_CONSTANTS.COLLECTIONS.BRANCH_TRANSFERS), {
      ...formData,
      amount: Number(formData.amount),
      recordedByName: activeSysUser?.name || "موظف",
      createdAt: new Date().toISOString(),
      lockedPeriod: false
    }).then(() => {
      setLoading(false); setIsAddOpen(false);
      setFormData({ otherBranch: "", type: "out", amount: "", senderName: "", receiverName: "", date: new Date().toISOString().split('T')[0], notes: "" });
      toast({ title: "تم تسجيل التحويل بنجاح" })
    })
  }

  const handleUpdateTransfer = () => {
    if (!canManage || !firestore || !user || !editingTransfer) return
    updateDocumentNonBlocking(doc(firestore, APP_CONSTANTS.COLLECTIONS.USERS, user.uid, APP_CONSTANTS.COLLECTIONS.BRANCH_TRANSFERS, editingTransfer.id), {
      ...editingTransfer,
      amount: Number(editingTransfer.amount),
      updatedAt: new Date().toISOString()
    })
    setIsEditOpen(false); toast({ title: "تم التحديث" })
  }

  const handleDeleteTransfer = () => {
    if (!canManage || !firestore || !user || !transferToDelete) return
    deleteDocumentNonBlocking(doc(firestore, APP_CONSTANTS.COLLECTIONS.USERS, user.uid, APP_CONSTANTS.COLLECTIONS.BRANCH_TRANSFERS, transferToDelete.id))
    setIsDeleteOpen(false); toast({ title: "تم الحذف بنجاح" })
  }

  const handleExportExcel = () => {
    let exportData: any[] = []
    let fileName = "تبادل_أدوية"

    if (activeMainTab === 'transfers') {
      exportData = filteredTransfers.map(t => ({ "التاريخ": t.date, "النوع": t.type === 'in' ? "وارد" : "صادر", "الفرع": t.otherBranch, "القيمة": t.amount, "المرسل": t.senderName, "المستلم": t.receiverName }));
      fileName = `تحويلات_الفروع_${new Date().toISOString().split('T')[0]}`
    } else if (activeMainTab === 'balances') {
      exportData = branchBalances.map(b => ({ "الفرع": b.name, "إجمالي المستلم": b.totalIn, "إجمالي المرسل": b.totalOut, "صافي الرصيد": b.net, "الحالة": b.status }));
      fileName = `ميزانية_الفروع_${new Date().toISOString().split('T')[0]}`
    }

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Data");
    XLSX.writeFile(wb, `${fileName}.xlsx`);
    toast({ title: "تم تصدير الإكسيل" });
  }

  return (
    <div className="space-y-8 pb-20 px-4 md:px-0 animate-in fade-in" dir="rtl">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
        <div className="space-y-1">
          <h2 className="text-3xl font-black text-foreground flex items-center gap-3">
            <Boxes className="h-8 w-8 text-primary" />
            تبادل أدوية (حركة الأدوية)
          </h2>
          <p className="text-muted-foreground font-medium">نظام الربط اللوجستي والمحاسبي بين فروع المجموعة.</p>
        </div>
        <div className="flex items-center gap-2">
          {(activeMainTab === 'transfers' || activeMainTab === 'balances') && (
            <Button onClick={handleExportExcel} variant="outline" className="h-12 rounded-xl border-emerald-200 font-bold gap-2 hover:bg-emerald-50 text-emerald-700">
              <FileSpreadsheet className="h-4 w-4" /> تصدير إكسيل
            </Button>
          )}
          <Button onClick={() => window.print()} variant="outline" className="h-12 rounded-xl font-bold gap-2 border-primary/20">
            <Printer className="h-4 w-4" /> طباعة
          </Button>
          {canManage && activeMainTab !== 'balances' && (
            <Button 
              onClick={() => activeMainTab === 'transfers' ? setIsAddOpen(true) : setIsAddBranchOpen(true)} 
              className="h-12 rounded-2xl bg-primary text-white font-black px-6 shadow-lg shadow-primary/20 transition-all hover:scale-105 active:scale-95 gap-2"
            >
              <PlusCircle className="h-5 w-5" /> 
              {activeMainTab === 'transfers' ? "تسجيل تبادل جديد" : "إضافة فرع للمجموعة"}
            </Button>
          )}
        </div>
      </div>

      <Tabs value={activeMainTab} onValueChange={setActiveMainTab}>
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-8 print:hidden">
          <TabsList className="bg-muted/50 p-1.5 rounded-2xl h-auto gap-1">
            <TabsTrigger value="transfers" className="rounded-xl px-8 py-3 font-black text-xs gap-2">
              <ArrowLeftRight className="h-4 w-4" /> سجل التبادل
            </TabsTrigger>
            <TabsTrigger value="balances" className="rounded-xl px-8 py-3 font-black text-xs gap-2">
              <Scale className="h-4 w-4" /> ميزانية الفروع
            </TabsTrigger>
            <TabsTrigger value="directory" className="rounded-xl px-8 py-3 font-black text-xs gap-2">
              <LayoutGrid className="h-4 w-4" /> دليل الفروع
            </TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <Search className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="بحث سريع..." 
                value={activeMainTab === 'transfers' ? transferSearch : activeMainTab === 'balances' ? balanceSearch : directorySearch}
                onChange={(e) => {
                  if (activeMainTab === 'transfers') setTransferSearch(e.target.value)
                  else if (activeMainTab === 'balances') setBalanceSearch(e.target.value)
                  else setDirectorySearch(e.target.value)
                }}
                className="h-10 pr-10 rounded-xl font-bold bg-card shadow-inner border-none" 
              />
            </div>
            {activeMainTab === 'transfers' && (
              <Button variant="outline" onClick={() => setIsAdvFilterOpen(true)} className="h-10 rounded-xl font-bold gap-2 bg-background border-primary/20">
                <Filter className="h-4 w-4" /> فلترة
              </Button>
            )}
          </div>
        </div>

        <TabsContent value="transfers" className="space-y-8">
          <div className="grid gap-4 grid-cols-1 md:grid-cols-3 print:hidden">
            <KPIItem label="إجمالي الوارد" value={stats.totalIn.toLocaleString()} icon={ArrowUpCircle} color="emerald" />
            <KPIItem label="إجمالي الصادر" value={stats.totalOut.toLocaleString()} icon={ArrowDownCircle} color="rose" />
            <KPIItem label="صافي المديونية البينية" value={stats.net.toLocaleString()} icon={ArrowLeftRight} color="primary" highlight />
          </div>

          <Card className="border shadow-xl bg-card rounded-[2.5rem] overflow-hidden border-blue-800/10">
            <CardHeader className="border-b bg-muted/30 p-6 flex items-center justify-between">
              <CardTitle className="text-xl font-black flex items-center gap-2"><History className="h-5 w-5 text-primary" /> سجل حركات التبادل الموثق</CardTitle>
              <Badge variant="outline" className="font-english opacity-50">{filteredTransfers.length} عملية</Badge>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table className="ledger-table">
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="text-right py-6 font-black text-foreground">التاريخ</TableHead>
                      <TableHead className="text-right font-black text-foreground">الفرع والنوع</TableHead>
                      <TableHead className="text-right font-black text-foreground">الأطراف المعنية</TableHead>
                      <TableHead className="text-right font-black text-foreground">القيمة المالية</TableHead>
                      <TableHead className="text-center font-black text-foreground print:hidden">إجراءات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow><TableCell colSpan={5} className="p-20 text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" /></TableCell></TableRow>
                    ) : filteredTransfers.length > 0 ? (
                      filteredTransfers.map((t) => (
                        <TableRow key={t.id} className="hover:bg-primary/[0.02] border-b transition-colors">
                          <TableCell className="font-english text-xs font-black py-5">{t.date}</TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-black text-foreground">{t.otherBranch}</span>
                              <Badge variant="outline" className={cn("w-fit text-[9px] font-bold border-none", t.type === 'in' ? "bg-emerald-500/10 text-emerald-600" : "bg-rose-500/10 text-rose-600")}>
                                {t.type === 'in' ? "وارد (+)" : "صادر (-)"}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-bold text-[10px] text-muted-foreground uppercase">{t.type === 'in' ? "المرسل من الفرع الآخر:" : "البائع من صيدليتنا:"}</span>
                              <span className="font-black text-xs text-foreground">{t.senderName || "---"}</span>
                              <span className="font-bold text-[10px] text-muted-foreground uppercase mt-1">{t.type === 'in' ? "المستلم في صيدليتنا:" : "المستلم في الفرع الآخر:"}</span>
                              <span className="font-black text-xs text-primary">{t.receiverName || "---"}</span>
                            </div>
                          </TableCell>
                          <TableCell className={cn("font-black font-english text-lg", t.type === 'in' ? 'text-emerald-600' : 'text-rose-600')}>
                            {t.type === 'in' ? '+' : '-'}{t.amount?.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-center print:hidden border-l">
                            <div className="flex justify-center gap-1.5">
                              {t.lockedPeriod ? <Lock className="h-4 w-4 text-rose-500" title="مغلقة ماليًا" /> : (
                                canManage ? (
                                  <>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-primary rounded-xl hover:bg-primary/10" onClick={() => { setEditingTransfer(t); setIsEditOpen(true); }}><Edit3 className="h-4 w-4" /></Button>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-rose-500 rounded-xl hover:bg-rose-50" onClick={() => { setTransferToDelete(t); setIsDeleteOpen(true); }}><Trash2 className="h-4 w-4" /></Button>
                                  </>
                                ) : <Eye className="h-4 w-4 text-muted-foreground opacity-30" />
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow><TableCell colSpan={5} className="p-20 text-center font-bold text-muted-foreground">لا توجد عمليات تطابق البحث والفلترة.</TableCell></TableRow>
                    )}
                  </TableBody>
                  <TableFooter className="bg-primary/5 border-t-2">
                    <TableRow>
                      <TableCell colSpan={3} className="py-10 font-black text-2xl text-foreground">صافي الفارق المالي لنتيجة البحث</TableCell>
                      <TableCell className="text-right font-black text-primary text-4xl font-english">{stats.net.toLocaleString()}</TableCell>
                      <TableCell className="print:hidden border-none" />
                    </TableRow>
                  </TableFooter>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="balances" className="space-y-8 animate-in slide-in-from-bottom-2">
          <Card className="border shadow-xl bg-card rounded-[2.5rem] overflow-hidden border-blue-800/10">
            <CardHeader className="bg-muted/30 border-b p-8">
              <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="space-y-1">
                  <CardTitle className="text-2xl font-black flex items-center gap-3">
                    <Scale className="h-6 w-6 text-primary" />
                    كشف أرصدة الفروع (المديونية البينية)
                  </CardTitle>
                  <CardDescription className="font-bold">ميزانية ختامية توضح من عليه مديونية أدوية لصالح الآخر.</CardDescription>
                </div>
                <div className="bg-primary/10 px-8 py-4 rounded-3xl border-2 border-primary/20 text-center shadow-inner">
                  <p className="text-[10px] font-black text-primary uppercase mb-1">إجمالي المديونية البينية المستحقة لنا</p>
                  <p className="text-3xl font-black font-english text-primary">
                    {branchBalances.filter(b => b.net > 0).reduce((s, b) => s + b.net, 0).toLocaleString()} <span className="text-sm font-bold">ج.م</span>
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table className="ledger-table">
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="text-right py-6 font-black">اسم الفرع</TableHead>
                      <TableHead className="text-right font-black">إجمالي المستلم منه (وارد)</TableHead>
                      <TableHead className="text-right font-black">إجمالي المرسل إليه (صادر)</TableHead>
                      <TableHead className="text-right font-black bg-primary/5 text-primary">صافي الرصيد</TableHead>
                      <TableHead className="text-center font-black">الموقف المالي</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {branchBalances.length > 0 ? (
                      branchBalances.map((branch, idx) => (
                        <TableRow key={idx} className="hover:bg-primary/[0.01] border-b transition-colors">
                          <TableCell className="font-black text-lg py-6">{branch.name}</TableCell>
                          <TableCell className="font-english font-bold text-rose-600">-{branch.totalIn.toLocaleString()}</TableCell>
                          <TableCell className="font-english font-bold text-emerald-600">+{branch.totalOut.toLocaleString()}</TableCell>
                          <TableCell className={cn("font-english font-black text-xl bg-primary/[0.02]", branch.net > 0 ? "text-emerald-600" : branch.net < 0 ? "text-rose-600" : "text-muted-foreground")}>
                            {branch.net > 0 ? "+" : ""}{branch.net.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge className={cn("font-black px-4 py-1.5 rounded-xl border-none shadow-sm", 
                              branch.net > 0 ? "bg-emerald-500/10 text-emerald-600" : 
                              branch.net < 0 ? "bg-rose-500/10 text-rose-600" : 
                              "bg-muted text-muted-foreground"
                            )}>
                              {branch.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow><TableCell colSpan={5} className="p-32 text-center text-muted-foreground font-bold">لا توجد بيانات أرصدة مسجلة أو مطابقة للبحث.</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="directory" className="space-y-8 animate-in slide-in-from-bottom-2">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {isBranchesLoading ? (
              <div className="col-span-full p-20 text-center"><Loader2 className="h-10 w-10 animate-spin mx-auto text-primary" /></div>
            ) : filteredBranches && filteredBranches.length > 0 ? (
              filteredBranches.map((branch) => (
                <Card key={branch.id} className="border shadow-lg rounded-[2.5rem] overflow-hidden group transition-all hover:shadow-xl relative bg-card border-blue-800/10">
                  <div className={cn("absolute top-0 right-0 w-1.5 h-full", 
                    branch.type === 'main' ? 'bg-primary' : 
                    branch.type === 'warehouse' ? 'bg-amber-500' : 'bg-emerald-500'
                  )} />
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <div className="h-12 w-12 rounded-2xl bg-muted flex items-center justify-center text-primary shadow-inner">
                        <Building2 className="h-6 w-6" />
                      </div>
                      <div className="flex gap-1 print:hidden">
                        {canManage ? (
                          <>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-primary hover:bg-primary/10 rounded-lg" onClick={() => { setEditingBranch(branch); setIsEditBranchOpen(true); }}><Edit3 className="h-4 w-4" /></Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-rose-500 hover:bg-rose-50 rounded-lg" onClick={() => { setBranchToDelete(branch); setIsDeleteBranchOpen(true); }}><Trash2 className="h-4 w-4" /></Button>
                          </>
                        ) : <Eye className="h-4 w-4 text-muted-foreground opacity-30" />}
                      </div>
                    </div>
                    <div className="mt-4 space-y-1">
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-xl font-black">{branch.name}</CardTitle>
                        <Badge variant="secondary" className={cn("text-[9px] font-black border-none", 
                          branch.type === 'main' ? 'bg-primary/10 text-primary' : 
                          branch.type === 'warehouse' ? 'bg-amber-500/10 text-amber-600' : 'bg-emerald-500/10 text-emerald-600'
                        )}>
                          {branch.type === 'main' ? 'فرع رئيسي' : branch.type === 'warehouse' ? 'مستودع' : 'فرع فرعي'}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground font-bold flex items-center gap-1"><MapPin className="h-3 w-3" /> {branch.address || "بدون عنوان مسجل"}</p>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4 pt-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 rounded-2xl bg-muted/30 border border-border/50">
                        <p className="text-[10px] font-black text-muted-foreground uppercase mb-1">المدير المسؤول</p>
                        <p className="text-sm font-black flex items-center gap-2 text-foreground/80"><UserCheck className="h-3.5 w-3.5 text-primary" /> {branch.manager || "---"}</p>
                      </div>
                      <div className="p-3 rounded-2xl bg-muted/30 border border-border/50">
                        <p className="text-[10px] font-black text-muted-foreground uppercase mb-1">رقم التواصل</p>
                        <p className="text-sm font-english font-black flex items-center gap-2 text-foreground/80"><Phone className="h-3.5 w-3.5 text-primary" /> {branch.phone || "---"}</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <p className="text-[10px] font-black text-muted-foreground uppercase px-1">طاقم العمل الملحق</p>
                      <div className="p-4 rounded-[1.5rem] bg-primary/5 border border-primary/10 min-h-[60px] shadow-inner">
                        <p className="text-xs leading-relaxed font-bold text-foreground/80 whitespace-pre-wrap">
                          {branch.employees || "لا يوجد بيانات موظفين حالياً."}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="col-span-full p-32 text-center space-y-4">
                <Building2 className="h-16 w-16 text-muted-foreground/20 mx-auto" />
                <p className="text-muted-foreground font-bold">لا يوجد فروع مطابقة للبحث في الدليل.</p>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={isAdvFilterOpen} onOpenChange={setIsAdvFilterOpen}>
        <DialogContent className="sm:max-w-[450px] text-right rounded-[2.5rem]" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black text-primary flex items-center gap-3"><Filter className="h-6 w-6" /> فلترة سجل التحويلات</DialogTitle>
            <DialogDescription className="font-bold">تحديد نطاق البحث الزمني ونوع حركة الأدوية.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-6 py-6 text-right">
            <div className="grid grid-cols-2 gap-4 text-right">
              <div className="space-y-2 text-right">
                <Label className="font-bold flex items-center gap-2"><CalendarDays className="h-4 w-4 text-primary" /> من تاريخ</Label>
                <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="h-12 rounded-xl text-right font-english" />
              </div>
              <div className="space-y-2 text-right">
                <Label className="font-bold flex items-center gap-2"><CalendarDays className="h-4 w-4 text-primary" /> إلى تاريخ</Label>
                <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="h-12 rounded-xl text-right font-english" />
              </div>
            </div>
            <div className="space-y-2 text-right">
              <Label className="font-bold">نوع التحويل المالي</Label>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="h-12 rounded-xl text-right font-bold"><SelectValue /></SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="all" className="font-bold text-right">كل العمليات</SelectItem>
                  <SelectItem value="out" className="font-bold text-rose-600 text-right">الصادر لفروع المجموعة (-)</SelectItem>
                  <SelectItem value="in" className="font-bold text-emerald-600 text-right">الوارد من فروع المجموعة (+)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button onClick={() => setIsAdvFilterOpen(false)} className="bg-primary text-white flex-1 font-black h-12 rounded-xl shadow-lg">تطبيق الفلتر</Button>
            <Button variant="outline" onClick={() => { setStartDate(""); setEndDate(""); setFilterType("all"); setIsAdvFilterOpen(false); }} className="flex-1 font-bold h-12 rounded-xl">تصفير</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isAddBranchOpen} onOpenChange={setIsAddBranchOpen}>
        <DialogContent className="sm:max-w-[500px] text-right rounded-[2.5rem]" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black text-primary">إضافة فرع جديد</DialogTitle>
            <DialogDescription className="font-bold">أدخل البيانات التعريفية للفرع والكادر الإداري.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-6 py-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2 text-right"><Label className="font-bold">اسم الفرع</Label><Input value={branchFormData.name} onChange={e => setBranchFormData({...branchFormData, name: e.target.value})} className="h-12 rounded-xl" /></div>
              <div className="space-y-2 text-right"><Label className="font-bold">التصنيف</Label>
                <Select value={branchFormData.type} onValueChange={v => setBranchFormData({...branchFormData, type: v})}>
                  <SelectTrigger className="h-12 rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="main" className="font-bold text-right">فرع رئيسي</SelectItem>
                    <SelectItem value="sub" className="font-bold text-right">فرع فرعي</SelectItem>
                    <SelectItem value="warehouse" className="font-bold text-right">مستودع / مخزن</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2 text-right"><Label className="font-bold">المدير المسؤول</Label><Input value={branchFormData.manager} onChange={e => setBranchFormData({...branchFormData, manager: e.target.value})} className="h-12 rounded-xl" /></div>
              <div className="space-y-2 text-right"><Label className="font-bold">رقم التواصل</Label><Input value={branchFormData.phone} onChange={e => setBranchFormData({...branchFormData, phone: e.target.value})} className="h-12 rounded-xl font-english" /></div>
            </div>
            <div className="space-y-2 text-right"><Label className="font-bold">عنوان الفرع</Label><Input value={branchFormData.address} onChange={e => setBranchFormData({...branchFormData, address: e.target.value})} className="h-12 rounded-xl" /></div>
            <div className="space-y-2 text-right">
              <Label className="font-bold">طاقم الموظفين (كل اسم في سطر)</Label>
              <Textarea value={branchFormData.employees} onChange={e => setBranchFormData({...branchFormData, employees: e.target.value})} className="h-32 rounded-xl bg-muted/30 border-none resize-none" placeholder="مثال: د. أحمد (صيدلي)&#10;م. محمد (مساعد)" />
            </div>
          </div>
          <DialogFooter><Button onClick={handleAddBranch} disabled={loading} className="bg-primary text-white flex-1 h-14 rounded-2xl font-black shadow-lg">حفظ بيانات الفرع</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="sm:max-w-[500px] text-right rounded-[2.5rem]" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black text-primary flex items-center gap-2"><PlusCircle className="h-6 w-6" /> تسجيل عملية تبادل</DialogTitle>
            <DialogDescription className="font-bold">أدخل تفاصيل تحويل الأدوية بين الفروع.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-6 py-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2 text-right"><Label className="font-bold">التاريخ</Label><Input type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="h-12 rounded-xl font-english" /></div>
              <div className="space-y-2 text-right"><Label className="font-bold">النوع</Label>
                <Select value={formData.type} onValueChange={v => setFormData({...formData, type: v, senderName: "", receiverName: ""})}>
                  <SelectTrigger className="h-12 rounded-xl font-bold"><SelectValue /></SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="out" className="font-bold text-rose-600 text-right">صادر (من صيدليتنا) (-)</SelectItem>
                    <SelectItem value="in" className="font-bold text-emerald-600 text-right">وارد (إلى صيدليتنا) (+)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="space-y-2 text-right">
              <Label className="font-bold">اسم الفرع الآخر</Label>
              <Select value={formData.otherBranch} onValueChange={v => setFormData({...formData, otherBranch: v, senderName: "", receiverName: ""})}>
                <SelectTrigger className="h-12 rounded-xl bg-muted/30 border-none font-bold"><SelectValue placeholder="اختر الفرع من الدليل..." /></SelectTrigger>
                <SelectContent className="rounded-xl">
                  {branches?.map(b => <SelectItem key={b.id} value={b.name} className="font-bold text-right">{b.name}</SelectItem>)}
                  <SelectItem value="جهة خارجية" className="font-bold italic text-muted-foreground text-right">فرع غير مسجل...</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2 text-right">
                <Label className="font-bold flex items-center gap-2">
                  <UserRound className="h-3 w-3 text-primary" /> 
                  {formData.type === 'out' ? "البائع (من صيدليتنا):" : "المرسل (من الفرع الآخر):"}
                </Label>
                
                {formData.type === 'in' ? (
                  formData.otherBranch === "جهة خارجية" || selectedBranchEmployees.length === 0 ? (
                    <Input value={formData.senderName} onChange={e => setFormData({...formData, senderName: e.target.value})} className="h-12 rounded-xl" placeholder="اسم المرسل..." />
                  ) : (
                    <Select value={formData.senderName} onValueChange={v => setFormData({...formData, senderName: v})}>
                      <SelectTrigger className="h-12 rounded-xl bg-muted/30 border-none font-bold"><SelectValue placeholder="اختر من كادر الفرع..." /></SelectTrigger>
                      <SelectContent className="rounded-xl">
                        {selectedBranchEmployees.map((name, idx) => <SelectItem key={idx} value={name} className="font-bold text-right">{name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  )
                ) : (
                  <Select value={formData.senderName} onValueChange={v => setFormData({...formData, senderName: v})}>
                    <SelectTrigger className="h-12 rounded-xl bg-muted/30 border-none font-bold"><SelectValue placeholder="اختر الموظف..." /></SelectTrigger>
                    <SelectContent className="rounded-xl">
                      {mainEmployees?.map(emp => <SelectItem key={emp.id} value={`${emp.firstName} ${emp.lastName}`} className="font-bold text-right">{emp.firstName} {emp.lastName}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )}
              </div>

              <div className="space-y-2 text-right">
                <Label className="font-bold flex items-center gap-2">
                  <UserCheck className="h-3 w-3 text-primary" /> 
                  {formData.type === 'out' ? "المستلم (في الفرع الآخر):" : "المستلم (في صيدليتنا):"}
                </Label>

                {formData.type === 'out' ? (
                  formData.otherBranch === "جهة خارجية" || selectedBranchEmployees.length === 0 ? (
                    <Input value={formData.receiverName} onChange={e => setFormData({...formData, receiverName: e.target.value})} className="h-12 rounded-xl" placeholder="اسم المستلم..." />
                  ) : (
                    <Select value={formData.receiverName} onValueChange={v => setFormData({...formData, receiverName: v})}>
                      <SelectTrigger className="h-12 rounded-xl bg-muted/30 border-none font-bold"><SelectValue placeholder="اختر من كادر الفرع..." /></SelectTrigger>
                      <SelectContent className="rounded-xl">
                        {selectedBranchEmployees.map((name, idx) => <SelectItem key={idx} value={name} className="font-bold text-right">{name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  )
                ) : (
                  <Select value={formData.receiverName} onValueChange={v => setFormData({...formData, receiverName: v})}>
                    <SelectTrigger className="h-12 rounded-xl bg-muted/30 border-none font-bold"><SelectValue placeholder="اختر الموظف..." /></SelectTrigger>
                    <SelectContent className="rounded-xl">
                      {mainEmployees?.map(emp => <SelectItem key={emp.id} value={`${emp.firstName} ${emp.lastName}`} className="font-bold text-right">{emp.firstName} {emp.lastName}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>

            <div className="space-y-2 text-right">
              <Label className="font-black text-primary">القيمة المالية الإجمالية (ج.م)</Label>
              <Input type="number" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} className="h-16 text-center text-3xl font-black text-primary bg-muted/30 border-none rounded-2xl shadow-inner font-english" />
            </div>
          </div>
          <DialogFooter><Button onClick={handleAddTransfer} disabled={loading} className="bg-primary text-white flex-1 h-14 rounded-2xl font-black text-lg shadow-lg">حفظ عملية التبادل</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-[500px] text-right rounded-[2.5rem]" dir="rtl">
          <DialogHeader><DialogTitle className="text-2xl font-black text-primary">تعديل بيانات التحويل</DialogTitle></DialogHeader>
          <div className="grid gap-6 py-6 text-right">
            <div className="space-y-2 text-right"><Label className="font-bold">اسم الفرع الآخر</Label><Input value={editingTransfer?.otherBranch || ""} onChange={e => setEditingTransfer({...editingTransfer, otherBranch: e.target.value})} className="h-12 rounded-xl" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2 text-right"><Label className="font-bold">الطرف الأول (المرسل)</Label><Input value={editingTransfer?.senderName || ""} onChange={e => setEditingTransfer({...editingTransfer, senderName: e.target.value})} className="h-12 rounded-xl" /></div>
              <div className="space-y-2 text-right"><Label className="font-bold">الطرف الثاني (المستلم)</Label><Input value={editingTransfer?.receiverName || ""} onChange={e => setEditingTransfer({...editingTransfer, receiverName: e.target.value})} className="h-12 rounded-xl" /></div>
            </div>
            <div className="space-y-2 text-right"><Label className="font-black text-primary">القيمة (ج.م)</Label><Input type="number" value={editingTransfer?.amount || ""} onChange={e => setEditingTransfer({...editingTransfer, amount: e.target.value})} className="h-14 text-center text-2xl font-black rounded-xl font-english" /></div>
          </div>
          <DialogFooter><Button onClick={handleUpdateTransfer} className="bg-primary text-white flex-1 h-12 rounded-xl font-black shadow-lg">حفظ التعديلات</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent className="text-right border-2 border-rose-500 rounded-[2.5rem]" dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-2xl font-black text-rose-600 flex items-center gap-2"><Trash2 className="h-6 w-6" /> حذف عملية تحويل</AlertDialogTitle>
            <AlertDialogDescription className="font-bold text-base mt-2">هل أنت متأكد من حذف هذا السجل؟ سيتم تعديل صافي الفوارق البينية فوراً. لا يمكن التراجع.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-3 mt-8">
            <AlertDialogAction onClick={handleDeleteTransfer} className="bg-rose-600 text-white flex-1 h-14 rounded-2xl font-black shadow-lg">نعم، احذف السجل</AlertDialogAction>
            <AlertDialogCancel className="flex-1 h-14 rounded-2xl font-bold border-2">إلغاء</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* نافذة حذف فرع */}
      <AlertDialog open={isDeleteBranchOpen} onOpenChange={setIsDeleteBranchOpen}>
        <AlertDialogContent className="text-right border-2 border-rose-500 rounded-[2.5rem]" dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-2xl font-black text-rose-600 flex items-center gap-2"><Trash2 className="h-6 w-6" /> حذف بيانات فرع</AlertDialogTitle>
            <AlertDialogDescription className="font-bold text-base mt-2 text-right">هل أنت متأكد من حذف هذا الفرع من الدليل؟ لن يؤثر ذلك على سجلات التبادل السابقة.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-3 mt-8">
            <AlertDialogAction onClick={handleDeleteBranch} className="bg-rose-600 text-white flex-1 h-14 rounded-2xl font-black shadow-lg">نعم، احذف الفرع</AlertDialogAction>
            <AlertDialogCancel className="flex-1 h-14 rounded-2xl font-bold">إلغاء</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function KPIItem({ label, value, icon: Icon, color, highlight }: any) {
  const styles: any = { primary: "bg-primary/10 text-primary border-primary/20", rose: "bg-rose-500/10 text-rose-600 border-rose-500/20", emerald: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" }
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
