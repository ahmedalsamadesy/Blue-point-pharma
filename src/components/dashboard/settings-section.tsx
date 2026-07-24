
"use client"

import { useState, useEffect, useRef, useMemo } from "react"
import { useFirestore, useUser, useDoc, useMemoFirebase, useCollection } from "@/firebase"
import { collection, doc, getDoc, getDocs, writeBatch, query, where, orderBy, DocumentReference } from "firebase/firestore"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow,
  TableFooter
} from "@/components/ui/table"
import { 
  Settings2, 
  Save, 
  Loader2, 
  Trash2, 
  Building2,
  KeyRound,
  ShieldCheck,
  ShieldAlert,
  Palette,
  Database,
  Eraser,
  Receipt,
  Package,
  Users,
  Truck,
  RefreshCw,
  RefreshCcw,
  Lock,
  ShoppingBag,
  Banknote,
  ArrowRightLeft,
  Target,
  Zap,
  Scale,
  Terminal,
  UserPlus,
  Edit3,
  CheckCircle2,
  CloudDownload,
  CloudUpload,
  Clock,
  Hammer,
  Search,
  Filter,
  Check,
  Coins,
  Percent,
  AlertTriangle,
  ArrowRight,
  MoreVertical,
  Calendar,
  Eye,
  EyeOff
} from "lucide-react"
import { 
  updateDocumentNonBlocking, 
  addDocumentNonBlocking,
  deleteDocumentNonBlocking
} from "@/firebase/non-blocking-updates"
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog"
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { APP_CONSTANTS } from "@/lib/constants"
import { Checkbox } from "@/components/ui/checkbox"
import { DeveloperSettingsSection } from "./developer-settings-section"

const DAYS_OF_WEEK = [
  { id: "sunday", label: "الأحد" },
  { id: "monday", label: "الاثنين" },
  { id: "tuesday", label: "الثلاثاء" },
  { id: "wednesday", label: "الأربعاء" },
  { id: "thursday", label: "الخميس" },
  { id: "friday", label: "الجمعة" },
  { id: "saturday", label: "السبت" },
]

const THEME_COLORS = [
  { name: "أزرق النقطة", hex: "#3b82f6", class: "bg-[#3b82f6]" },
  { name: "زمردي محترف", hex: "#10b981", class: "bg-[#10b981]" },
  { name: "ياقوتي دافئ", hex: "#f43f5e", class: "bg-[#f43f5e]" },
  { name: "كهرماني نشط", hex: "#f59e0b", class: "bg-[#f59e0b]" },
  { name: "كربوني فخم", hex: "#1e293b", class: "bg-[#1e293b]" },
]

const SYSTEM_SECTIONS = [
  { id: "sales", label: "المبيعات", icon: Receipt, type: "financial", dateField: "date" },
  { id: "purchases", label: "المشتريات", icon: ShoppingBag, type: "financial", dateField: "date" },
  { id: "expenses", label: "المصروفات", icon: Banknote, type: "financial", dateField: "date" },
  { id: "inventory", label: "المخزون", icon: Package, type: "system", dateField: "createdAt" },
  { id: "branch_transfers", label: "تبادل الأدوية", icon: RefreshCw, type: "system", dateField: "date" },
  { id: "customers", label: "العملاء", icon: Users, type: "users", dateField: "createdAt" },
  { id: "suppliers", label: "الموردين", icon: Truck, type: "users", dateField: "createdAt" },
  { id: "transfers", label: "التحويلات النقدية", icon: ArrowRightLeft, type: "financial", dateField: "date" },
  { id: "treasury", label: "الخزينة", icon: Scale, type: "financial", dateField: "createdAt" },
  { id: "reports", label: "التقارير", icon: Database, type: "reports", dateField: "createdAt" },
  { id: "employees", label: "الموظفين", icon: Users, type: "users", dateField: "createdAt" },
  { id: "broadcasts", label: "الأخبار", icon: Zap, type: "system", dateField: "createdAt" },
  { id: "goals", label: "الأهداف", icon: Target, type: "system", dateField: "createdAt" },
  { id: "closing", label: "الحساب الختامي", icon: Lock, type: "financial", dateField: "closedAt" },
  { id: "audit", label: "سجل الأحداث", icon: ShieldCheck, type: "logs", dateField: "timestamp" },
]

const DATA_GROUPS = [
  { id: "all", label: "كل الأقسام" },
  { id: "financial", label: "البيانات المالية" },
  { id: "users", label: "بيانات المستخدمين" },
  { id: "system", label: "بيانات النظام" },
  { id: "reports", label: "بيانات التقارير" },
  { id: "logs", label: "سجلات الرقابة" },
]

export function SettingsSection() {
  const { user } = useUser()
  const firestore = useFirestore()
  const { toast } = useToast()
  
  const [loading, setLoading] = useState(false)
  const [activeMainTab, setActiveMainTab] = useState("pharmacy")
  
  const [dataGroupFilter, setDataGroupFilter] = useState("all")
  const [dataSearchTerm, setDataSearchTerm] = useState("")
  const [selectedSections, setSelectedSections] = useState<Set<string>>(new Set())
  const [cleanupStartDate, setCleanupStartDate] = useState("")
  const [cleanupEndDate, setCleanupEndDate] = useState("")
  
  const [isCleanupOpen, setIsCleanupOpen] = useState(false)
  const [recordCounts, setRecordCounts] = useState<Record<string, number>>({})
  const [confirmCode, setConfirmCode] = useState("")

  const [isAddUserOpen, setIsAddUserOpen] = useState(false)
  const [isEditUserOpen, setIsEditUserOpen] = useState(false)
  const [isDeleteUserOpen, setIsDeleteUserOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<any>(null)
  const [userToDelete, setUserToDelete] = useState<any>(null)
  
  const backupInputRef = useRef<HTMLInputElement>(null)

  const [userFormData, setUserFormData] = useState({ 
    name: "", 
    role: "staff", 
    pinCode: "", 
    photoUrl: "",
    permissions: {} as Record<string, { read: boolean, add: boolean, edit: boolean, delete: boolean }>
  })

  const activeSysUserLocal = useMemo(() => {
    if (typeof window === 'undefined') return null
    const saved = localStorage.getItem("activeSystemUser")
    return saved ? JSON.parse(saved) : null
  }, [])

  const isAdminLocal = activeSysUserLocal?.role === 'admin'
  const isOwnerLocal = activeSysUserLocal?.role === 'owner'

  const settingsRef = useMemoFirebase(() => {
    if (!firestore || !user) return null
    return doc(firestore, "users", user.uid, "settings", "current")
  }, [firestore, user])
  const { data: settings } = useDoc(settingsRef)

  const systemUsersQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null
    return collection(firestore, "users", user.uid, "systemUsers")
  }, [firestore, user])
  const { data: systemUsers, isLoading: isUsersLoading } = useCollection(systemUsersQuery)

  const [localSettings, setLocalSettings] = useState<any>({
    pharmacyName: "", managingDirector: "", phone: "", email: "", address: "", printLogoUrl: "",
    workingHours: {}, currency: "ج.م", decimalPlaces: 2, roundingMethod: "standard", financialYearStart: "",
    enableExpenses: true, enableIncome: true, allowInvoiceEdit: true, allowInvoiceDelete: false, enableAuditLog: true,
    themeMode: "auto", primaryColor: "#3b82f6", fontSize: "medium", tableStyle: "modern", showCharts: true,
    systemMode: "normal", modeStartTime: "", modeEndTime: "", modeMessage: "", allowedUsersDuringMaint: [],
    taxRate: 0, maxDebtLimit: 10000, openingTreasuryBalance: 0
  })

  useEffect(() => {
    if (settings) setLocalSettings((prev: any) => ({ ...prev, ...settings }))
  }, [settings])

  const handleUpdateSettings = () => {
    if (!settingsRef || isOwnerLocal) return
    setLoading(true)
    updateDocumentNonBlocking(settingsRef, { ...localSettings, updatedAt: new Date().toISOString() })
    setTimeout(() => { setLoading(false); toast({ title: "تم حفظ التغييرات بنجاح" }) }, 500)
  }

  const handleToggleSection = (sectionId: string) => {
    const next = new Set(selectedSections)
    if (next.has(sectionId)) next.delete(sectionId)
    else next.add(sectionId)
    setSelectedSections(next)
  }

  const filteredSectionsForData = useMemo(() => {
    return SYSTEM_SECTIONS.filter(s => {
      const matchGroup = dataGroupFilter === 'all' || s.type === dataGroupFilter;
      const matchSearch = s.label.includes(dataSearchTerm);
      return matchGroup && matchSearch;
    });
  }, [dataGroupFilter, dataSearchTerm]);

  const fetchRecordCounts = async () => {
    if (!firestore || !user || selectedSections.size === 0) return
    setLoading(true)
    const counts: Record<string, number> = {}
    try {
      for (const sectionId of selectedSections) {
        const section = SYSTEM_SECTIONS.find(s => s.id === sectionId)
        if (!section) continue

        const colName = APP_CONSTANTS.COLLECTIONS[sectionId.toUpperCase() as keyof typeof APP_CONSTANTS.COLLECTIONS] || sectionId
        const dateField = section.dateField || "createdAt"

        if (sectionId === 'sales' || sectionId === 'expenses' || sectionId === 'purchases') {
          const catCol = sectionId === 'sales' ? "incomeCategories" : "expenseCategories"
          const itemCol = sectionId === 'sales' ? "incomes" : "expenses"
          const cats = await getDocs(collection(firestore, "users", user.uid, catCol))
          
          let total = 0
          for (const cat of cats.docs) {
            let q = query(collection(firestore, "users", user.uid, catCol, cat.id, itemCol))
            if (cleanupStartDate) q = query(q, where(dateField, ">=", cleanupStartDate))
            if (cleanupEndDate) q = query(q, where(dateField, "<=", cleanupEndDate))
            const snap = await getDocs(q)
            total += snap.docs.length
          }
          counts[sectionId] = total
        } else {
          let q = query(collection(firestore, "users", user.uid, colName))
          if (cleanupStartDate) q = query(q, where(dateField, ">=", cleanupStartDate))
          if (cleanupEndDate) q = query(q, where(dateField, "<=", cleanupEndDate))
          const snap = await getDocs(q)
          counts[sectionId] = snap.docs.length
        }
      }
      setRecordCounts(counts)
      setIsCleanupOpen(true)
    } catch (e) {
      console.error(e)
      toast({ variant: "destructive", title: "خطأ في جلب البيانات" })
    } finally {
      setLoading(false)
    }
  }

  const handlePerformCleanup = async () => {
    if (confirmCode !== "تأكيد" || !firestore || !user) return
    setLoading(true)
    try {
      for (const sectionId of selectedSections) {
        const section = SYSTEM_SECTIONS.find(s => s.id === sectionId)
        if (!section) continue

        const colName = APP_CONSTANTS.COLLECTIONS[sectionId.toUpperCase() as keyof typeof APP_CONSTANTS.COLLECTIONS] || sectionId
        const dateField = section.dateField || "createdAt"

        if (sectionId === 'sales' || sectionId === 'expenses' || sectionId === 'purchases') {
          const catCol = sectionId === 'sales' ? "incomeCategories" : "expenseCategories"
          const itemCol = sectionId === 'sales' ? "incomes" : "expenses"
          const cats = await getDocs(collection(firestore, "users", user.uid, catCol))
          
          for (const cat of cats.docs) {
            let q = query(collection(firestore, "users", user.uid, catCol, cat.id, itemCol))
            if (cleanupStartDate) q = query(q, where(dateField, ">=", cleanupStartDate))
            if (cleanupEndDate) q = query(q, where(dateField, "<=", cleanupEndDate))
            const snap = await getDocs(q)
            
            const batch = writeBatch(firestore)
            snap.docs.forEach(d => batch.delete(d.ref))
            await batch.commit()
          }
        } else {
          let q = query(collection(firestore, "users", user.uid, colName))
          if (cleanupStartDate) q = query(q, where(dateField, ">=", cleanupStartDate))
          if (cleanupEndDate) q = query(q, where(dateField, "<=", cleanupEndDate))
          const snap = await getDocs(q)
          
          const chunks = []
          for (let i = 0; i < snap.docs.length; i += 450) {
            chunks.push(snap.docs.slice(i, i + 450))
          }

          for (const chunk of chunks) {
            const batch = writeBatch(firestore)
            chunk.forEach(d => batch.delete(d.ref))
            await batch.commit()
          }
        }
      }
      
      toast({ title: "تمت العملية بنجاح", description: "تم تطهير البيانات وفق الفلترة المختارة." })
      setSelectedSections(new Set())
      setIsCleanupOpen(false)
      setConfirmCode("")
    } catch (e) {
      console.error(e)
      toast({ variant: "destructive", title: "فشل الحذف" })
    } finally { setLoading(false) }
  }

  const handleExportBackup = async () => {
    if (!firestore || !user) return
    setLoading(true)
    try {
      const backup: any = {
        version: APP_CONSTANTS.VERSION,
        timestamp: new Date().toISOString(),
        settings: {},
        collections: {},
        incomeCategories: [],
        expenseCategories: []
      }

      // 1. Settings
      const sSnap = await getDoc(doc(firestore, "users", user.uid, "settings", "current"))
      backup.settings = sSnap.data()

      // 2. Collections
      const cols = ["systemUsers", "inventory", "suppliers", "customers", "employees", "cashTransfers", "branchTransfers", "branches", "goals", "broadcasts", "shortages", "inventoryValuations", "customerValuations", "payrollAdjustments", "closingPeriods", "auditLogs", "treasuries"]
      for (const col of cols) {
        const snap = await getDocs(collection(firestore, "users", user.uid, col))
        backup.collections[col] = snap.docs.map(d => ({ ...d.data(), id: d.id }))
      }

      // 3. Nested
      const incCats = await getDocs(collection(firestore, "users", user.uid, "incomeCategories"))
      for (const catDoc of incCats.docs) {
        const items = await getDocs(collection(firestore, "users", user.uid, "incomeCategories", catDoc.id, "incomes"))
        backup.incomeCategories.push({
          ...catDoc.data(),
          id: catDoc.id,
          items: items.docs.map(d => ({ ...d.data(), id: d.id }))
        })
      }

      const expCats = await getDocs(collection(firestore, "users", user.uid, "expenseCategories"))
      for (const catDoc of expCats.docs) {
        const items = await getDocs(collection(firestore, "users", user.uid, "expenseCategories", catDoc.id, "expenses"))
        backup.expenseCategories.push({
          ...catDoc.data(),
          id: catDoc.id,
          items: items.docs.map(d => ({ ...d.data(), id: d.id }))
        })
      }

      const json = JSON.stringify(backup, null, 2)
      const blob = new Blob([json], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      const now = new Date()
      const timestamp = now.toISOString().split('T')[0] + '_' + now.getHours() + '-' + now.getMinutes()
      a.href = url
      a.download = `BluePoint_Full_Backup_${timestamp}.json`
      a.click()
      URL.revokeObjectURL(url)

      addDocumentNonBlocking(collection(firestore, "users", user.uid, "auditLogs"), {
        userName: activeSysUserLocal?.name || "مدير",
        action: "حفظ نسخة احتياطية",
        section: "إدارة البيانات",
        details: "نسخة احتياطية مستقرة محفوظة شاملة لكافة البيانات والسياسات.",
        timestamp: new Date().toISOString()
      })

      toast({ title: "تم الحفظ بنجاح", description: `اسم الملف: BluePoint_Full_Backup_${timestamp}.json` })
    } catch (e) {
      toast({ variant: "destructive", title: "خطأ في النسخ الاحتياطي" })
    } finally { setLoading(false) }
  }

  const handleImportBackup = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !firestore || !user) return
    setLoading(true)
    const reader = new FileReader()
    reader.onload = async (e) => {
      try {
        const data = JSON.parse(e.target?.result as string)
        if (!data.collections || !data.settings) throw new Error("ملف غير صالح")

        toast({ title: "جاري الاستعادة...", description: "يرجى عدم إغلاق الصفحة." })
        
        // 1. Restore Settings
        const settingsRef = doc(firestore, "users", user.uid, "settings", "current")
        await updateDocumentNonBlocking(settingsRef, data.settings)

        // 2. Restore Collections
        for (const [colName, docs] of Object.entries(data.collections)) {
          const typedDocs = docs as any[]
          const chunks = []
          for (let i = 0; i < typedDocs.length; i += 400) chunks.push(typedDocs.slice(i, i + 400))
          
          for (const chunk of chunks) {
            const batch = writeBatch(firestore)
            chunk.forEach(d => {
              const { id, ...rest } = d
              batch.set(doc(firestore, "users", user.uid, colName, id), rest)
            })
            await batch.commit()
          }
        }

        // 3. Restore Nested
        for (const cat of data.incomeCategories) {
          const { items, id, ...catRest } = cat
          await addDocumentNonBlocking(collection(firestore, "users", user.uid, "incomeCategories"), { ...catRest, id })
          
          const chunks = []
          for (let i = 0; i < items.length; i += 400) chunks.push(items.slice(i, i + 400))
          for (const chunk of chunks) {
            const batch = writeBatch(firestore)
            chunk.forEach((it: any) => batch.set(doc(firestore, "users", user.uid, "incomeCategories", id, "incomes", it.id), it))
            await batch.commit()
          }
        }

        for (const cat of data.expenseCategories) {
          const { items, id, ...catRest } = cat
          await addDocumentNonBlocking(collection(firestore, "users", user.uid, "expenseCategories"), { ...catRest, id })
          
          const chunks = []
          for (let i = 0; i < items.length; i += 400) chunks.push(items.slice(i, i + 400))
          for (const chunk of chunks) {
            const batch = writeBatch(firestore)
            chunk.forEach((it: any) => batch.set(doc(firestore, "users", user.uid, "expenseCategories", id, "expenses", it.id), it))
            await batch.commit()
          }
        }

        toast({ title: "اكتملت الاستعادة", description: "سيتم إعادة تحميل النظام لتطبيق التغييرات." })
        setTimeout(() => window.location.reload(), 2000)
      } catch (err) {
        toast({ variant: "destructive", title: "فشل الاستعادة", description: "تأكد من صحة ملف النسخة الاحتياطية." })
      } finally { setLoading(false) }
    }
    reader.readAsText(file)
  }

  const handleAddUser = () => {
    if (!firestore || !user || !userFormData.name || !userFormData.pinCode) return
    addDocumentNonBlocking(collection(firestore, "users", user.uid, "systemUsers"), {
      ...userFormData,
      isActive: true,
      createdAt: new Date().toISOString()
    }).then(() => {
      setIsAddUserOpen(false)
      setUserFormData({ name: "", role: "staff", pinCode: "", photoUrl: "", permissions: {} })
      toast({ title: "تمت إضافة المستخدم" })
    })
  }

  const handleUpdateSystemUser = () => {
    if (!firestore || !user || !editingUser) return
    updateDocumentNonBlocking(doc(firestore, "users", user.uid, "systemUsers", editingUser.id), {
      ...editingUser,
      updatedAt: new Date().toISOString()
    })
    setIsEditUserOpen(false)
    setEditingUser(null)
    toast({ title: "تم تحديث المستخدم" })
  }

  const handleDeleteSystemUser = () => {
    if (!firestore || !user || !userToDelete) return
    deleteDocumentNonBlocking(doc(firestore, "users", user.uid, "systemUsers", userToDelete.id))
    setIsDeleteUserOpen(false)
    setUserToDelete(null)
    toast({ title: "تم حذف المستخدم" })
  }

  const togglePermission = (sectionId: string, type: 'read' | 'add' | 'edit' | 'delete', target: 'form' | 'edit') => {
    const setter = target === 'form' ? setUserFormData : setEditingUser
    setter((prev: any) => {
      const currentPerms = prev.permissions || {}
      const sectionPerms = currentPerms[sectionId] || { read: false, add: false, edit: false, delete: false }
      return {
        ...prev,
        permissions: {
          ...currentPerms,
          [sectionId]: { ...sectionPerms, [type]: !sectionPerms[type] }
        }
      }
    })
  }

  const ModeCard = ({ current, mode, title, icon: Icon, color, onClick, description }: any) => {
    const isActive = current === mode
    const styles: any = { primary: "border-primary bg-primary/5", amber: "border-amber-500 bg-amber-500/5", rose: "border-rose-600 bg-rose-600/5" }
    return (
      <Card className={cn("border-2 rounded-[2.5rem] p-8 cursor-pointer transition-all hover:scale-[1.02]", isActive ? styles[color] : "opacity-60 grayscale-[0.5]")} onClick={() => onClick(mode)}>
        <div className={cn("h-12 w-12 rounded-2xl text-white flex items-center justify-center shadow-lg mb-4", isActive ? (mode === 'normal' ? 'bg-primary' : mode === 'maintenance' ? 'bg-amber-500' : 'bg-rose-600') : "bg-muted text-muted-foreground")}>
          <Icon className="h-6 w-6" />
        </div>
        <h4 className="text-xl font-black">{title}</h4>
        <p className="text-xs font-bold text-muted-foreground mt-2">{description}</p>
      </Card>
    )
  }

  const PolicySwitch = ({ label, description, checked, onCheckedChange, disabled }: any) => (
    <div className="flex items-center justify-between p-4 rounded-2xl border bg-muted/10 transition-all hover:bg-muted/20">
      <div className="space-y-0.5"><p className="font-black text-sm">{label}</p><p className="text-[10px] text-muted-foreground font-bold">{description}</p></div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} disabled={disabled} />
    </div>
  )

  const PolicyInput = ({ label, value, onChange, disabled, icon: Icon }: any) => (
    <div className="space-y-2">
      <Label className="font-bold flex items-center gap-2">
        <Icon className="h-4 w-4 text-primary" />
        {label}
      </Label>
      <Input type="number" value={value} onChange={e=>onChange(e.target.value)} disabled={disabled} className="h-12 rounded-xl font-english" />
    </div>
  )

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20 px-4 md:px-0" dir="rtl">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-3xl font-black text-foreground flex items-center gap-3">
            <Settings2 className="h-8 w-8 text-primary" /> إعدادات BluePoint المتقدمة
          </h2>
          <p className="text-muted-foreground font-medium">التحكم الشامل في هوية الصيدلية والسياسات والأمان.</p>
        </div>
        {!isOwnerLocal && (
          <Button onClick={handleUpdateSettings} disabled={loading} className="h-14 px-10 rounded-2xl font-black text-lg shadow-xl shadow-primary/20 bg-primary transition-all active:scale-95">
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />} حفظ كافة التغييرات
          </Button>
        )}
      </div>

      <Tabs value={activeMainTab} onValueChange={setActiveMainTab} className="w-full">
        <TabsList className="bg-muted/50 p-1.5 rounded-2xl h-auto flex gap-1 mb-10 shadow-lg overflow-x-auto scrollbar-hide w-full justify-start">
          <TabsTrigger value="pharmacy" className="rounded-xl px-6 py-3 gap-2 font-black text-xs shrink-0"><Building2 className="h-4 w-4" /> بيانات الصيدلية</TabsTrigger>
          <TabsTrigger value="policy" className="rounded-xl px-6 py-3 gap-2 font-black text-xs shrink-0"><Scale className="h-4 w-4" /> السياسة المالية</TabsTrigger>
          <TabsTrigger value="appearance" className="rounded-xl px-6 py-3 gap-2 font-black text-xs shrink-0"><Palette className="h-4 w-4" /> المظهر</TabsTrigger>
          <TabsTrigger value="modes" className="rounded-xl px-6 py-3 gap-2 font-black text-xs shrink-0"><Zap className="h-4 w-4" /> أوضاع التشغيل</TabsTrigger>
          <TabsTrigger value="account" className="rounded-xl px-6 py-3 gap-2 font-black text-xs shrink-0"><KeyRound className="h-4 w-4" /> إعدادات الحساب</TabsTrigger>
          <TabsTrigger value="users" className="rounded-xl px-6 py-3 gap-2 font-black text-xs shrink-0"><Users className="h-4 w-4" /> المستخدمون</TabsTrigger>
          {isAdminLocal && (
            <>
              <TabsTrigger value="data" className="rounded-xl px-6 py-3 gap-2 font-black text-xs shrink-0"><Database className="h-4 w-4" /> إدارة البيانات</TabsTrigger>
              <TabsTrigger value="developer" className="rounded-xl px-6 py-3 gap-2 font-black text-xs shrink-0"><Terminal className="h-4 w-4" /> مركز المطور</TabsTrigger>
            </>
          )}
        </TabsList>

        <TabsContent value="pharmacy" className="space-y-8 animate-in slide-in-from-bottom-2">
          <Card className="border shadow-xl rounded-[2.5rem] overflow-hidden border-blue-800/10">
            <CardHeader className="bg-muted/20 border-b p-8"><CardTitle className="text-xl font-black">الهوية والبيانات التعريفية</CardTitle></CardHeader>
            <CardContent className="p-8 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2"><Label className="font-bold">اسم الصيدلية</Label><Input value={localSettings.pharmacyName} onChange={e=>setLocalSettings({...localSettings, pharmacyName: e.target.value})} disabled={isOwnerLocal} className="h-12 rounded-xl" /></div>
                <div className="space-y-2"><Label className="font-bold">اسم المالك</Label><Input value={localSettings.managingDirector} onChange={e=>setLocalSettings({...localSettings, managingDirector: e.target.value})} disabled={isOwnerLocal} className="h-12 rounded-xl" /></div>
                <div className="space-y-2"><Label className="font-bold">رقم الهاتف</Label><Input value={localSettings.phone} onChange={e=>setLocalSettings({...localSettings, phone: e.target.value})} disabled={isOwnerLocal} className="h-12 rounded-xl font-english" /></div>
                <div className="space-y-2"><Label className="font-bold">البريد الإلكتروني</Label><Input value={localSettings.email} onChange={e=>setLocalSettings({...localSettings, email: e.target.value})} disabled={isOwnerLocal} className="h-12 rounded-xl font-english" /></div>
                <div className="space-y-2 md:col-span-2"><Label className="font-bold">العنوان التفصيلي</Label><Input value={localSettings.address} onChange={e=>setLocalSettings({...localSettings, address: e.target.value})} disabled={isOwnerLocal} className="h-12 rounded-xl" /></div>
              </div>
              <Separator />
              <div className="space-y-6">
                <Label className="font-black text-primary flex items-center gap-2"><Clock className="h-5 w-5" /> مواعيد العمل الأسبوعية</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {DAYS_OF_WEEK.map(day => (
                    <div key={day.id} className="p-4 rounded-2xl border bg-muted/10 flex flex-col gap-3">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm">{day.label}</span>
                        <Switch 
                          checked={localSettings.workingHours?.[day.id]?.active ?? true} 
                          onCheckedChange={v => setLocalSettings({...localSettings, workingHours: {...(localSettings.workingHours||{}), [day.id]: {...(localSettings.workingHours?.[day.id]||{}), active: v}}})}
                          disabled={isOwnerLocal}
                        />
                      </div>
                      <div className="flex gap-2">
                        <Input type="time" value={localSettings.workingHours?.[day.id]?.open || "08:00"} onChange={e=>setLocalSettings({...localSettings, workingHours: {...(localSettings.workingHours||{}), [day.id]: {...(localSettings.workingHours?.[day.id]||{}), open: e.target.value}}})} disabled={isOwnerLocal || !localSettings.workingHours?.[day.id]?.active} className="h-8 text-[10px] rounded-lg font-english" />
                        <Input type="time" value={localSettings.workingHours?.[day.id]?.close || "23:00"} onChange={e=>setLocalSettings({...localSettings, workingHours: {...(localSettings.workingHours||{}), [day.id]: {...(localSettings.workingHours?.[day.id]||{}), close: e.target.value}}})} disabled={isOwnerLocal || !localSettings.workingHours?.[day.id]?.active} className="h-8 text-[10px] rounded-lg font-english" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="policy" className="space-y-8 animate-in slide-in-from-bottom-2">
          <Card className="border shadow-xl rounded-[2.5rem] overflow-hidden border-blue-800/10">
            <CardHeader className="bg-muted/20 border-b p-8"><CardTitle className="text-xl font-black">قواعد الحسابات المالية</CardTitle></CardHeader>
            <CardContent className="p-8 space-y-10">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div className="space-y-2"><Label className="font-bold">عدد الأرقام العشرية</Label><Input type="number" value={localSettings.decimalPlaces} onChange={e=>setLocalSettings({...localSettings, decimalPlaces: Number(e.target.value)})} disabled={isOwnerLocal} className="h-12 rounded-xl w-32 font-english" /></div>
                  <div className="space-y-2"><Label className="font-bold">طريقة التقريب</Label>
                    <Select value={localSettings.roundingMethod} onValueChange={v=>setLocalSettings({...localSettings, roundingMethod: v})} disabled={isOwnerLocal}>
                      <SelectTrigger className="h-12 rounded-xl"><SelectValue /></SelectTrigger>
                      <SelectContent className="rounded-xl">
                        <SelectItem value="standard" className="font-bold">تقريب رياضي (0.5+ للأعلى)</SelectItem>
                        <SelectItem value="up" className="font-bold">تقريب دائم للأعلى (Ceiling)</SelectItem>
                        <SelectItem value="down" className="font-bold">تجاهل الكسور (Floor)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-6">
                  <div className="space-y-2"><Label className="font-bold">بداية السنة المالية</Label><Input type="date" value={localSettings.financialYearStart} onChange={e=>setLocalSettings({...localSettings, financialYearStart: e.target.value})} disabled={isOwnerLocal} className="h-12 rounded-xl font-english" /></div>
                  <div className="space-y-2"><Label className="font-bold">العملة المستخدمة</Label><Input value={localSettings.currency} onChange={e=>setLocalSettings({...localSettings, currency: e.target.value})} disabled={isOwnerLocal} className="h-12 rounded-xl" /></div>
                </div>
              </div>
              <Separator />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <PolicySwitch label="السماح بتعديل الفواتير" description="إمكانية تغيير مبالغ العمليات بعد حفظها." checked={localSettings.allowInvoiceEdit} onCheckedChange={v=>setLocalSettings({...localSettings, allowInvoiceEdit: v})} disabled={isOwnerLocal} />
                <PolicySwitch label="السماح بحذف الفواتير" description="منح الموظفين صلاحية المسح النهائي للقيود." checked={localSettings.allowInvoiceDelete} onCheckedChange={v=>setLocalSettings({...localSettings, allowInvoiceDelete: v})} disabled={isOwnerLocal} />
                <PolicySwitch label="تفعيل سجل التدقيق" description="تسجيل كافة حركات المستخدمين في Audit Log." checked={localSettings.enableAuditLog} onCheckedChange={v=>setLocalSettings({...localSettings, enableAuditLog: v})} disabled={isOwnerLocal} />
                <PolicySwitch label="تفعيل المصروفات" description="إدراج قسم المصروفات في الدورة المحاسبية." checked={localSettings.enableExpenses} onCheckedChange={v=>setLocalSettings({...localSettings, enableExpenses: v})} disabled={isOwnerLocal} />
              </div>
              <Separator />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <PolicyInput label="الرصيد الافتتاحي" value={localSettings.openingTreasuryBalance} onChange={(v: any)=>setLocalSettings({...localSettings, openingTreasuryBalance: Number(v)})} disabled={!isAdminLocal} icon={Coins} />
                <PolicyInput label="ضريبة القيمة المضافة" value={localSettings.taxRate} onChange={(v: any)=>setLocalSettings({...localSettings, taxRate: Number(v)})} disabled={!isAdminLocal} icon={Percent} />
                <PolicyInput label="سقف المديونية المسموح" value={localSettings.maxDebtLimit} onChange={(v: any)=>setLocalSettings({...localSettings, maxDebtLimit: Number(v)})} disabled={!isAdminLocal} icon={AlertTriangle} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="appearance" className="space-y-8 animate-in slide-in-from-bottom-2">
          <Card className="border shadow-xl rounded-[2.5rem] overflow-hidden border-blue-800/10">
            <CardHeader className="bg-muted/20 border-b p-8"><CardTitle className="text-xl font-black">تخصيص الواجهة</CardTitle></CardHeader>
            <CardContent className="p-8 space-y-10">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div className="space-y-4">
                  <Label className="font-black text-primary">لون الواجهة الرئيسي</Label>
                  <div className="flex flex-wrap gap-4">{THEME_COLORS.map(c => (<div key={c.hex} onClick={() => !isOwnerLocal && setLocalSettings({...localSettings, primaryColor: c.hex})} className={cn("h-14 w-14 rounded-2xl cursor-pointer border-4 flex items-center justify-center transition-all", c.class, localSettings.primaryColor === c.hex ? "border-white shadow-xl scale-110" : "border-transparent opacity-60 hover:opacity-100")}>{localSettings.primaryColor === c.hex && <CheckCircle2 className="h-6 w-6 text-white" />}</div>))}</div>
                </div>
                <div className="space-y-6">
                  <div className="space-y-2"><Label className="font-bold">حجم الخط العام</Label>
                    <Select value={localSettings.fontSize} onValueChange={v=>setLocalSettings({...localSettings, fontSize: v})} disabled={isOwnerLocal}>
                      <SelectTrigger className="h-12 rounded-xl"><SelectValue /></SelectTrigger>
                      <SelectContent className="rounded-xl"><SelectItem value="small">صغير</SelectItem><SelectItem value="medium">متوسط (افتراضي)</SelectItem><SelectItem value="large">كبير</SelectItem></SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2"><Label className="font-bold">نمط عرض الجداول</Label>
                    <Select value={localSettings.tableStyle} onValueChange={v=>setLocalSettings({...localSettings, tableStyle: v})} disabled={isOwnerLocal}>
                      <SelectTrigger className="h-12 rounded-xl"><SelectValue /></SelectTrigger>
                      <SelectContent className="rounded-xl"><SelectItem value="classic">كلاسيكي (مضغوط)</SelectItem><SelectItem value="modern">مودرن (واسع)</SelectItem></SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              <Separator />
              <PolicySwitch label="عرض الرسوم البيانية" description="إظهار التحليل البصري في لوحة التحكم والتقارير." checked={localSettings.showCharts} onCheckedChange={v=>setLocalSettings({...localSettings, showCharts: v})} disabled={isOwnerLocal} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="modes" className="space-y-8 animate-in slide-in-from-bottom-2">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <ModeCard current={localSettings.systemMode} mode="normal" title="الوضع الطبيعي" icon={CheckCircle2} color="primary" onClick={(m: any) => !isOwnerLocal && setLocalSettings({...localSettings, systemMode: m})} description="النظام يعمل بكامل طاقته لجميع الموظفين." />
            <ModeCard current={localSettings.systemMode} mode="maintenance" title="وضع الصيانة" icon={Hammer} color="amber" onClick={(m: any) => !isOwnerLocal && setLocalSettings({...localSettings, systemMode: m})} description="تعطيل العمليات الحساسة، الوصول متاح للمدير فقط." />
            <ModeCard current={localSettings.systemMode} mode="update" title="وضع التحديث" icon={RefreshCcw} color="rose" onClick={(m: any) => !isOwnerLocal && setLocalSettings({...localSettings, systemMode: m})} description="النظام تحت الترقية، كافة العمليات المالية معطلة مؤقتاً." />
          </div>
          {localSettings.systemMode !== 'normal' && (
            <Card className="border shadow-xl rounded-[2.5rem] overflow-hidden border-amber-200">
              <CardHeader className="bg-amber-50 p-6"><CardTitle className="text-lg font-black text-amber-700">إعدادات وضع {localSettings.systemMode === 'maintenance' ? 'الصيانة' : 'التحديث'}</CardTitle></CardHeader>
              <CardContent className="p-8 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2"><Label className="font-bold">وقت الانتهاء المتوقع</Label><Input type="datetime-local" value={localSettings.modeEndTime} onChange={e=>setLocalSettings({...localSettings, modeEndTime: e.target.value})} disabled={isOwnerLocal} className="h-12 rounded-xl font-english" /></div>
                  <div className="space-y-2"><Label className="font-bold">رسالة التنبيه للمستخدمين</Label><Input value={localSettings.modeMessage} onChange={e=>setLocalSettings({...localSettings, modeMessage: e.target.value})} disabled={isOwnerLocal} className="h-12 rounded-xl" placeholder="عذراً، النظام في جرد دوري حالياً..." /></div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="account" className="space-y-8 animate-in slide-in-from-bottom-2">
          <Card className="border shadow-xl rounded-[2.5rem] overflow-hidden max-w-2xl mx-auto border-blue-800/10">
            <CardHeader className="bg-muted/20 border-b p-8 text-center">
              <Avatar className="h-24 w-24 rounded-[2rem] mx-auto border-4 border-primary/20 shadow-2xl mb-4 overflow-hidden">
                <AvatarImage src={activeSysUserLocal?.photoUrl} className="object-cover" />
                <AvatarFallback className="text-2xl font-black bg-primary/10 text-primary">{activeSysUserLocal?.name?.substring(0,2)}</AvatarFallback>
              </Avatar>
              <CardTitle className="text-2xl font-black">{activeSysUserLocal?.name}</CardTitle>
              <Badge className="mt-2 px-4 py-1 rounded-xl bg-primary text-white font-bold">
                {activeSysUserLocal?.role === 'owner' ? 'صاحب الصيدلية' : activeSysUserLocal?.role === 'admin' ? 'مدير النظام' : 'موظف'}
              </Badge>
            </CardHeader>
            <CardContent className="p-8 space-y-6">
              <div className="space-y-4">
                <Label className="font-black flex items-center gap-2"><KeyRound className="h-4 w-4" /> رمز PIN الحالي</Label>
                <div className="flex gap-3">
                  <Input type="password" value="****" disabled className="h-12 rounded-xl bg-muted/30 border-none font-english text-xl tracking-widest text-center" />
                  <Button variant="outline" className="h-12 rounded-xl font-bold border-primary/20 hover:bg-primary/5">تغيير الرمز</Button>
                </div>
              </div>
              <Separator />
              <Button variant="outline" className="w-full h-12 rounded-xl text-rose-600 border-rose-100 hover:bg-rose-50 font-black gap-2 transition-all">
                <ShieldAlert className="h-4 w-4" /> تسجيل الخروج من كافة الأجهزة الأخرى
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users" className="space-y-8 animate-in slide-in-from-bottom-2">
          <div className="flex justify-between items-center">
            <h3 className="text-2xl font-black flex items-center gap-3"><Users className="h-8 w-8 text-primary" /> إدارة الصلاحيات الرباعية</h3>
            {!isOwnerLocal && <Button onClick={() => setIsAddUserOpen(true)} className="h-12 rounded-xl font-black gap-2 shadow-lg shadow-primary/20 transition-all hover:scale-105 active:scale-95"><UserPlus className="h-5 w-5" /> إضافة كادر جديد</Button>}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {isUsersLoading ? <div className="col-span-full py-20 text-center"><Loader2 className="h-10 w-10 animate-spin mx-auto text-primary" /></div> : systemUsers?.map(u => (
              <Card key={u.id} className={cn("p-6 rounded-[2.5rem] transition-all hover:shadow-2xl relative overflow-hidden group border-2", u.isActive ? "bg-card" : "bg-muted grayscale")}>
                <div className={cn("absolute top-0 right-0 w-1.5 h-full", u.role === 'owner' ? 'bg-rose-600' : u.role === 'admin' ? 'bg-blue-600' : 'bg-slate-600')} />
                <div className="flex justify-between items-start mb-6">
                  <Badge className="text-white px-3 py-1 rounded-xl shadow-sm bg-primary border-none">{u.role === 'owner' ? 'مالك' : u.role === 'admin' ? 'مدير' : 'موظف'}</Badge>
                  <Badge variant={u.isActive ? "outline" : "secondary"} className="font-bold">{u.isActive ? "نشط" : "معطل"}</Badge>
                </div>
                <div className="flex flex-col items-center text-center gap-4">
                  <Avatar className="h-20 w-20 rounded-3xl border-4 border-background shadow-xl overflow-hidden group-hover:scale-105 transition-transform">
                    <AvatarImage src={u.photoUrl} className="object-cover" />
                    <AvatarFallback className="text-xl font-black bg-primary/5 text-primary">{u.name.substring(0,2)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <h4 className="text-lg font-black">{u.name}</h4>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1 flex items-center justify-center gap-1"><ShieldCheck className="h-3 w-3" /> {u.role}</p>
                  </div>
                </div>
                {!isOwnerLocal && (
                  <div className="grid grid-cols-2 gap-2 mt-8">
                    <Button variant="outline" size="sm" onClick={() => { setEditingUser(u); setIsEditUserOpen(true); }} className="rounded-xl font-bold h-9 gap-2 border-primary/20 hover:bg-primary/5"><Edit3 className="h-3.5 w-3.5" /> الصلاحيات</Button>
                    <Button variant="outline" size="sm" onClick={() => { setUserToDelete(u); setIsDeleteUserOpen(true); }} className="rounded-xl font-bold h-9 text-rose-600 border-rose-100 hover:bg-rose-50"><Trash2 className="h-3.5 w-3.5" /> حذف</Button>
                  </div>
                )}
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="data" className="space-y-8 animate-in slide-in-from-bottom-2">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-8 space-y-6">
              <Card className="border shadow-xl rounded-[2.5rem] overflow-hidden border-blue-800/10">
                <CardHeader className="bg-muted/30 border-b p-6 flex flex-col md:flex-row items-center justify-between gap-4">
                  <CardTitle className="text-xl font-black flex items-center gap-2"><Filter className="h-5 w-5 text-primary" /> نظام الفلترة المتقدم لإدارة البيانات</CardTitle>
                  <div className="flex items-center gap-2 w-full md:w-auto">
                    <div className="relative flex-1 md:w-48">
                      <Search className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input 
                        placeholder="ابحث بالاسم..." 
                        value={dataSearchTerm}
                        onChange={(e) => setDataSearchTerm(e.target.value)}
                        className="h-9 pr-9 rounded-xl font-bold border-none bg-background shadow-inner" 
                      />
                    </div>
                    <Select value={dataGroupFilter} onValueChange={setDataGroupFilter}>
                      <SelectTrigger className="h-9 w-[160px] rounded-xl font-bold bg-background border-none shadow-inner">
                        <SelectValue placeholder="التصنيف" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        {DATA_GROUPS.map(g => <SelectItem key={g.id} value={g.id} className="font-bold text-right">{g.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </CardHeader>
                <CardContent className="p-6 space-y-8">
                  <div className="bg-primary/5 p-6 rounded-3xl border border-primary/10 space-y-4">
                    <Label className="font-black text-primary flex items-center gap-2"><Calendar className="h-4 w-4" /> فلترة النطاق الزمني للعملية (اختياري)</Label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-[10px] font-bold opacity-60">حذف السجلات من تاريخ</Label>
                        <Input type="date" value={cleanupStartDate} onChange={e=>setCleanupStartDate(e.target.value)} className="h-12 rounded-xl font-english" />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] font-bold opacity-60">حذف السجلات حتى تاريخ</Label>
                        <Input type="date" value={cleanupEndDate} onChange={e=>setCleanupEndDate(e.target.value)} className="h-12 rounded-xl font-english" />
                      </div>
                    </div>
                    <p className="text-[10px] text-muted-foreground font-bold italic">
                      * إذا تركت الحقول فارغة، سيتم تطبيق العملية على كافة السجلات التاريخية للقسم.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {filteredSectionsForData.length > 0 ? filteredSectionsForData.map(section => (
                      <div 
                        key={section.id} 
                        onClick={() => handleToggleSection(section.id)}
                        className={cn(
                          "p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between group",
                          selectedSections.has(section.id) ? "border-rose-500 bg-rose-50/50 shadow-md" : "border-border/50 hover:border-primary/30"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center transition-all", selectedSections.has(section.id) ? "bg-rose-500 text-white" : "bg-muted")}>
                            <section.icon className="h-4 w-4" />
                          </div>
                          <div className="flex flex-col">
                            <span className="font-black text-[11px] leading-none">{section.label}</span>
                            <span className="text-[8px] text-muted-foreground uppercase mt-1 font-bold">{section.type}</span>
                          </div>
                        </div>
                        {selectedSections.has(section.id) ? (
                          <div className="h-5 w-5 rounded-full bg-rose-500 flex items-center justify-center text-white"><Check className="h-3 w-3" /></div>
                        ) : (
                          <div className="h-2 w-2 rounded-full bg-muted-foreground/20" />
                        )}
                      </div>
                    )) : (
                      <div className="col-span-full py-10 text-center opacity-30">لا توجد أقسام مطابقة للبحث.</div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
            <div className="lg:col-span-4 space-y-6">
              <Card className="border-2 border-rose-500/20 shadow-2xl rounded-[2.5rem] overflow-hidden sticky top-24">
                <CardHeader className="bg-rose-500/5 p-8 text-center">
                  <ShieldAlert className="h-10 w-10 text-rose-600 mx-auto mb-2 animate-pulse" />
                  <CardTitle className="text-xl font-black text-rose-700">منطقة العمليات الحرجة</CardTitle>
                </CardHeader>
                <CardContent className="p-8 space-y-6">
                  <div className="p-6 rounded-3xl bg-rose-50 border border-rose-100 space-y-3">
                    <div className="flex justify-between items-center text-[10px] font-black text-rose-800 uppercase">
                      <span>الأقسام المختارة</span>
                      <Badge variant="outline" className="bg-white border-rose-200">{selectedSections.size}</Badge>
                    </div>
                    <Separator className="bg-rose-200" />
                    <Button 
                      onClick={() => fetchRecordCounts()} 
                      disabled={selectedSections.size === 0 || loading} 
                      className="w-full h-14 bg-rose-600 hover:bg-rose-700 rounded-2xl font-black text-lg gap-3 shadow-lg shadow-rose-200 transition-all active:scale-95"
                    >
                      {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Eraser className="h-5 w-5" />} تصفير النطاق المختار
                    </Button>
                  </div>
                  
                  <div className="p-6 rounded-3xl bg-emerald-50 border border-emerald-100 space-y-4">
                    <p className="text-[10px] font-black text-emerald-800 text-center uppercase tracking-widest">مركز النسخ الاحتياطي والترميم</p>
                    <Button 
                      onClick={handleExportBackup} 
                      disabled={loading}
                      className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold gap-2 shadow-lg transition-all"
                    >
                      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CloudDownload className="h-4 w-4" />} تصدير نسخة احتياطية JSON
                    </Button>
                    <input 
                      type="file" 
                      ref={backupInputRef} 
                      className="hidden" 
                      accept=".json" 
                      onChange={handleImportBackup} 
                    />
                    <Button 
                      variant="outline" 
                      onClick={() => backupInputRef.current?.click()}
                      disabled={loading}
                      className="w-full h-12 border-emerald-200 text-emerald-700 rounded-xl font-bold gap-2 hover:bg-emerald-100 transition-all"
                    >
                      <CloudUpload className="h-4 w-4" /> استعادة من ملف نسخة
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="developer" className="animate-in slide-in-from-bottom-2">
          <DeveloperSettingsSection />
        </TabsContent>
      </Tabs>

      <Dialog open={isCleanupOpen} onOpenChange={setIsCleanupOpen}>
        <DialogContent className="sm:max-w-[500px] text-right rounded-[3rem] p-0 overflow-hidden border-none shadow-2xl" dir="rtl">
          <DialogHeader className="p-0">
            <div className="p-8 bg-rose-700 text-white flex items-center gap-4 relative overflow-hidden">
              <div className="absolute top-0 left-0 p-10 opacity-10"><Trash2 className="h-32 w-32 rotate-12" /></div>
              <ShieldAlert className="h-12 w-12 animate-pulse shrink-0 z-10" />
              <div className="space-y-1 z-10">
                <DialogTitle className="text-2xl font-black text-white">تحذير أمني أخير</DialogTitle>
                <DialogDescription className="text-white/80 font-bold">أنت على وشك حذف بيانات حساسة بشكل نهائي من السحابة.</DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="p-8 space-y-6">
            <div className="space-y-3">
              <div className="text-sm font-black flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-rose-600" />
                سيتم مسح السجلات التالية:
              </div>
              <div className="max-h-48 overflow-y-auto scrollbar-hide space-y-2 pr-1">
                {Object.entries(recordCounts).map(([id, count]) => (
                  <div key={id} className="flex justify-between items-center p-3 rounded-xl bg-muted/50 border border-border/50 group transition-all hover:bg-rose-50 hover:border-rose-200">
                    <div className="flex items-center gap-2">
                      <div className="h-6 w-6 rounded-lg bg-background flex items-center justify-center text-rose-600"><CheckCircle2 className="h-3.5 w-3.5" /></div>
                      <span className="font-black text-xs">{SYSTEM_SECTIONS.find(s=>s.id===id)?.label}</span>
                    </div>
                    <Badge variant="secondary" className="font-english font-black bg-white shadow-sm border-none">{count} سجل</Badge>
                  </div>
                ))}
              </div>
              {(cleanupStartDate || cleanupEndDate) && (
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-100 flex items-center gap-2 mt-2">
                  <Calendar className="h-4 w-4 text-amber-600" />
                  <span className="text-[10px] font-black text-amber-800">
                    النطاق الزمني: {cleanupStartDate || 'البداية'} ← {cleanupEndDate || 'النهاية'}
                  </span>
                </div>
              )}
            </div>
            <Separator />
            <div className="space-y-3">
              <p className="text-xs font-bold text-muted-foreground leading-relaxed">
                لتأكيد حذف <span className="text-rose-600 font-black">({Object.values(recordCounts).reduce((a,b)=>a+b, 0)})</span> سجل، اكتب كلمة <b>تأكيد</b>:
              </p>
              <Input 
                value={confirmCode} 
                onChange={e=>setConfirmCode(e.target.value)} 
                className="h-14 text-center text-2xl font-black rounded-2xl border-rose-200 focus:ring-rose-500/20 shadow-inner" 
                placeholder="تأكيد" 
              />
            </div>
          </div>
          <DialogFooter className="p-8 bg-muted/20 gap-3 border-t">
            <Button 
              onClick={handlePerformCleanup} 
              disabled={confirmCode !== "تأكيد" || loading} 
              className="bg-rose-600 hover:bg-rose-700 text-white flex-1 h-14 rounded-2xl font-black text-lg shadow-xl shadow-rose-200 transition-all active:scale-95"
            >
              نعم، نفذ الحذف النهائي
            </Button>
            <Button variant="outline" onClick={() => setIsCleanupOpen(false)} className="flex-1 h-14 rounded-2xl font-bold border-2">تراجع</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isAddUserOpen} onOpenChange={setIsAddUserOpen}>
        <DialogContent className="sm:max-w-[700px] text-right rounded-[2.5rem] p-0 overflow-hidden border-none shadow-2xl" dir="rtl">
          <DialogHeader className="p-8 bg-primary text-white">
            <DialogTitle className="text-2xl font-black">إضافة كادر عمل جديد</DialogTitle>
            <DialogDescription className="text-white/70 font-bold">قم بتعريف موظف جديد وتحديد مصفوفة صلاحياته الرباعية.</DialogDescription>
          </DialogHeader>
          <div className="p-8 space-y-6 max-h-[60vh] overflow-y-auto scrollbar-hide">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label className="font-bold">الاسم الكامل</Label><Input value={userFormData.name} onChange={e=>setUserFormData({...userFormData, name: e.target.value})} className="h-12 rounded-xl" /></div>
              <div className="space-y-2"><Label className="font-bold">PIN الدخول (4-6 أرقام)</Label><Input value={userFormData.pinCode} onChange={e=>setUserFormData({...userFormData, pinCode: e.target.value})} className="h-12 rounded-xl font-english text-center text-xl tracking-widest" /></div>
            </div>
            <div className="space-y-2"><Label className="font-bold">الدور الوظيفي</Label>
              <Select value={userFormData.role} onValueChange={v => setUserFormData({...userFormData, role: v})}>
                <SelectTrigger className="h-12 rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="admin" className="font-bold text-right">مدير نظام (Manager)</SelectItem>
                  <SelectItem value="staff" className="font-bold text-right">موظف (Employee)</SelectItem>
                  <SelectItem value="owner" className="font-bold text-right">مالك (Owner)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Separator />
            <div className="space-y-4">
              <Label className="font-black text-primary flex items-center gap-2"><ShieldCheck className="h-5 w-5" /> مصفوفة الصلاحيات الرباعية:</Label>
              <div className="rounded-2xl border border-border/50 overflow-hidden">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead className="text-right font-black">القسم</TableHead>
                      <TableHead className="text-center font-bold">عرض</TableHead>
                      <TableHead className="text-center font-bold">إضافة</TableHead>
                      <TableHead className="text-center font-bold">تعديل</TableHead>
                      <TableHead className="text-center font-bold">حذف</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {SYSTEM_SECTIONS.map(s => (
                      <TableRow key={s.id}>
                        <TableCell className="font-bold text-xs py-4">{s.label}</TableCell>
                        <TableCell className="text-center"><Checkbox checked={userFormData.permissions[s.id]?.read} onCheckedChange={()=>togglePermission(s.id, 'read', 'form')} className="rounded-lg h-5 w-5" /></TableCell>
                        <TableCell className="text-center"><Checkbox checked={userFormData.permissions[s.id]?.add} onCheckedChange={()=>togglePermission(s.id, 'add', 'form')} className="rounded-lg h-5 w-5" /></TableCell>
                        <TableCell className="text-center"><Checkbox checked={userFormData.permissions[s.id]?.edit} onCheckedChange={()=>togglePermission(s.id, 'edit', 'form')} className="rounded-lg h-5 w-5" /></TableCell>
                        <TableCell className="text-center"><Checkbox checked={userFormData.permissions[s.id]?.delete} onCheckedChange={()=>togglePermission(s.id, 'delete', 'form')} className="rounded-lg h-5 w-5" /></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
          <DialogFooter className="p-8 bg-muted/20 border-t">
            <Button onClick={handleAddUser} className="bg-primary text-white flex-1 h-14 rounded-2xl font-black shadow-lg shadow-primary/20 text-lg transition-all active:scale-95">حفظ بيانات المستخدم</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditUserOpen} onOpenChange={setIsEditUserOpen}>
        <DialogContent className="sm:max-w-[700px] text-right rounded-[2.5rem] p-0 overflow-hidden border-none shadow-2xl" dir="rtl">
          <DialogHeader className="p-8 bg-primary text-white">
            <DialogTitle className="text-2xl font-black">تعديل صلاحيات المستخدم</DialogTitle>
            <DialogDescription className="text-white/70 font-bold">تعديل مصفوفة الوصول الرباعية للأقسام.</DialogDescription>
          </DialogHeader>
          <div className="p-8 space-y-6 max-h-[60vh] overflow-y-auto scrollbar-hide">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label className="font-bold">الاسم</Label><Input value={editingUser?.name || ""} onChange={e=>setEditingUser({...editingUser, name: e.target.value})} className="h-12 rounded-xl" /></div>
              <div className="space-y-2"><Label className="font-bold">تغيير PIN</Label><Input value={editingUser?.pinCode || ""} onChange={e=>setEditingUser({...editingUser, pinCode: e.target.value})} className="h-12 rounded-xl font-english text-center text-xl tracking-widest" /></div>
            </div>
            <Separator />
            <div className="space-y-4">
              <Label className="font-black text-primary">تعديل مصفوفة الصلاحيات:</Label>
              <div className="rounded-2xl border border-border/50 overflow-hidden">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead className="text-right font-black">القسم</TableHead>
                      <TableHead className="text-center font-bold">عرض</TableHead>
                      <TableHead className="text-center font-bold">إضافة</TableHead>
                      <TableHead className="text-center font-bold">تعديل</TableHead>
                      <TableHead className="text-center font-bold">حذف</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {SYSTEM_SECTIONS.map(s => (
                      <TableRow key={s.id}>
                        <TableCell className="font-bold text-xs py-4">{s.label}</TableCell>
                        <TableCell className="text-center"><Checkbox checked={editingUser?.permissions?.[s.id]?.read} onCheckedChange={()=>togglePermission(s.id, 'read', 'edit')} className="rounded-lg h-5 w-5" /></TableCell>
                        <TableCell className="text-center"><Checkbox checked={editingUser?.permissions?.[s.id]?.add} onCheckedChange={()=>togglePermission(s.id, 'add', 'edit')} className="rounded-lg h-5 w-5" /></TableCell>
                        <TableCell className="text-center"><Checkbox checked={editingUser?.permissions?.[s.id]?.edit} onCheckedChange={()=>togglePermission(s.id, 'edit', 'edit')} className="rounded-lg h-5 w-5" /></TableCell>
                        <TableCell className="text-center"><Checkbox checked={editingUser?.permissions?.[s.id]?.delete} onCheckedChange={()=>togglePermission(s.id, 'delete', 'edit')} className="rounded-lg h-5 w-5" /></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
          <DialogFooter className="p-8 bg-muted/20 border-t">
            <Button onClick={handleUpdateSystemUser} className="bg-primary text-white flex-1 h-14 rounded-2xl font-black shadow-lg shadow-primary/20 text-lg transition-all active:scale-95">تحديث الصلاحيات</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteUserOpen} onOpenChange={setIsDeleteUserOpen}>
        <AlertDialogContent className="text-right border-2 border-rose-500 rounded-[2.5rem] p-0 overflow-hidden shadow-2xl" dir="rtl">
          <AlertDialogHeader className="p-8 bg-rose-500 text-white">
            <div className="flex items-center gap-4">
              <Trash2 className="h-12 w-12 animate-bounce shrink-0" />
              <div>
                <AlertDialogTitle className="text-2xl font-black text-white">حذف مستخدم نهائياً</AlertDialogTitle>
                <AlertDialogDescription className="text-white/80 font-bold">هل أنت متأكد من حذف حساب الموظف؟</AlertDialogDescription>
              </div>
            </div>
          </AlertDialogHeader>
          <div className="p-8 text-center">
            <p className="text-lg font-black">أنت على وشك حذف <b>({userToDelete?.name})</b></p>
            <p className="text-xs text-muted-foreground mt-2">لن يتمكن هذا المستخدم من الدخول للنظام مرة أخرى، وسيتم تسجيل عملية الحذف في سجل الرقابة.</p>
          </div>
          <AlertDialogFooter className="p-8 bg-muted/20 gap-3 border-t">
            <AlertDialogAction onClick={handleDeleteSystemUser} className="bg-rose-600 hover:bg-rose-700 text-white flex-1 h-14 rounded-2xl font-black text-lg shadow-xl shadow-rose-200 transition-all active:scale-95">نعم، احذف الحساب</AlertDialogAction>
            <AlertDialogCancel className="flex-1 h-14 rounded-2xl font-bold border-2">إلغاء</AlertDialogCancel>
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
