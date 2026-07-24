"use client"

import { useState, useMemo } from "react"
import { useFirestore, useUser, useCollection, useMemoFirebase } from "@/firebase"
import { collection, doc } from "firebase/firestore"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { useToast } from "@/hooks/use-toast"
import { 
  Loader2, 
  Megaphone, 
  Search, 
  Edit3, 
  Trash2, 
  PlusCircle, 
  Bell, 
  Calendar, 
  Clock, 
  ShieldCheck, 
  ToggleLeft, 
  ToggleRight,
  Info,
  AlertTriangle,
  AlertOctagon,
  CheckCircle2,
  UserCheck,
  FileSpreadsheet,
  Filter
} from "lucide-react"
import { 
  addDocumentNonBlocking, 
  updateDocumentNonBlocking, 
  deleteDocumentNonBlocking 
} from "@/firebase/non-blocking-updates"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"
import * as XLSX from 'xlsx'

export function BroadcastsSection() {
  const firestore = useFirestore()
  const { user } = useUser()
  const { toast } = useToast()

  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [isAdvFilterOpen, setIsAdvFilterOpen] = useState(false)
  
  const [advFilters, setAdvFilters] = useState({
    type: "all",
    status: "all"
  })

  const [formData, setFormData] = useState({
    content: "",
    type: "info",
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    startTime: "00:00",
    endTime: "23:59",
    isActive: true,
    priority: 0
  })

  const [editingBroadcast, setEditingBroadcast] = useState<any>(null)
  const [broadcastToDelete, setBroadcastToDelete] = useState<any>(null)

  const activeSysUser = useMemo(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem("activeSystemUser") : null
    return saved ? JSON.parse(saved) : null
  }, [])

  const canManage = true 

  const broadcastsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null
    return collection(firestore, "users", user.uid, "broadcasts")
  }, [firestore, user])
  
  const { data: broadcasts, isLoading } = useCollection(broadcastsQuery)

  const filteredBroadcasts = useMemo(() => {
    if (!broadcasts) return []
    return broadcasts.filter(b => {
      const matchSearch = b.content?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (b.recordedByName || "").toLowerCase().includes(searchTerm.toLowerCase())
      
      const matchType = advFilters.type === 'all' || b.type === advFilters.type
      const matchStatus = advFilters.status === 'all' || 
                          (advFilters.status === 'active' && b.isActive) ||
                          (advFilters.status === 'inactive' && !b.isActive)
      
      return matchSearch && matchType && matchStatus
    }).sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
  }, [broadcasts, searchTerm, advFilters])

  const handleExportExcel = () => {
    const exportData = filteredBroadcasts.map(b => ({
      "محتوى الخبر": b.content,
      "النوع": b.type,
      "المسؤول": b.recordedByName,
      "تاريخ البدء": b.startDate,
      "تاريخ الانتهاء": b.endDate,
      "الحالة": b.isActive ? "نشط" : "معطل",
      "الأولوية": b.priority
    }));
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "الأخبار");
    XLSX.writeFile(wb, `أخبار_بلو_بوينت_${new Date().toISOString().split('T')[0]}.xlsx`);
    toast({ title: "تم تصدير الإكسيل" });
  }

  const handleAddBroadcast = async () => {
    if (!firestore || !user || !formData.content) return
    setLoading(true)
    addDocumentNonBlocking(collection(firestore, "users", user.uid, "broadcasts"), {
      ...formData,
      priority: Number(formData.priority) || 0,
      recordedByName: activeSysUser?.name || "موظف",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    })
      .then(() => {
        setIsAddOpen(false)
        setLoading(false)
        setFormData({
          content: "",
          type: "info",
          startDate: new Date().toISOString().split('T')[0],
          endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          startTime: "00:00",
          endTime: "23:59",
          isActive: true,
          priority: 0
        })
        toast({ title: "تم نشر الخبر", description: "سيظهر في شريط الأخبار حسب الجدولة." })
      })
      .catch(() => setLoading(false))
  }

  const handleUpdateBroadcast = () => {
    if (!firestore || !user || !editingBroadcast) return
    updateDocumentNonBlocking(doc(firestore, "users", user.uid, "broadcasts", editingBroadcast.id), {
      ...editingBroadcast,
      priority: Number(editingBroadcast.priority) || 0,
      updatedAt: new Date().toISOString()
    })
    setIsEditOpen(false)
    toast({ title: "تم التحديث", description: "تم تعديل بيانات الخبر بنجاح." })
  }

  const toggleStatus = (broadcast: any) => {
    if (!firestore || !user) return
    updateDocumentNonBlocking(doc(firestore, "users", user.uid, "broadcasts", broadcast.id), {
      isActive: !broadcast.isActive,
      updatedAt: new Date().toISOString()
    })
    toast({ title: broadcast.isActive ? "تم الإيقاف" : "تم التفعيل" })
  }

  const handleDeleteBroadcast = () => {
    if (!firestore || !user || !broadcastToDelete) return
    deleteDocumentNonBlocking(doc(firestore, "users", user.uid, "broadcasts", broadcastToDelete.id))
    setIsDeleteOpen(false)
    toast({ title: "تم الحذف نهائياً" })
  }

  const getTypeStyle = (type: string) => {
    switch (type) {
      case 'warning': return { color: "text-amber-600", bg: "bg-amber-500/10", icon: AlertTriangle };
      case 'danger': return { color: "text-rose-600", bg: "bg-rose-500/10", icon: AlertOctagon };
      case 'success': return { color: "text-emerald-600", bg: "bg-emerald-500/10", icon: CheckCircle2 };
      default: return { color: "text-primary", bg: "bg-primary/10", icon: Info };
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20 px-4 md:px-0" dir="rtl">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-3xl font-black text-foreground flex items-center gap-3">
            <Megaphone className="h-8 w-8 text-primary" />
            إدارة شريط الأخبار والاشعارات
          </h2>
          <p className="text-muted-foreground font-medium">تحكم في الرسائل التي تظهر لجميع المستخدمين في الشريط العلوي.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={handleExportExcel} variant="outline" className="h-12 rounded-xl border-blue-200 font-bold gap-2 hover:bg-blue-50 text-blue-700">
            <FileSpreadsheet className="h-4 w-4" /> تصدير إكسيل
          </Button>
          <Button onClick={() => setIsAddOpen(true)} className="h-12 rounded-2xl bg-primary text-white font-black px-6 shadow-lg shadow-primary/20 transition-all hover:scale-105 active:scale-95">
            <PlusCircle className="h-5 w-5" /> إضافة خبر جديد
          </Button>
        </div>
      </div>

      <Card className="border shadow-xl bg-card rounded-[2.5rem] overflow-hidden">
        <CardHeader className="border-b bg-muted/30 p-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Bell className="h-5 w-5 text-primary" />
            <CardTitle className="text-xl font-black">سجل الأخبار المجدولة</CardTitle>
          </div>
          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="relative max-w-xs w-full">
              <Search className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="بحث في محتوى الأخبار..." 
                value={searchTerm} 
                onChange={(e) => setSearchTerm(e.target.value)} 
                className="h-10 pr-10 rounded-xl font-bold bg-background border-border" 
              />
            </div>
            <Button variant="outline" onClick={() => setIsAdvFilterOpen(true)} className="h-10 rounded-xl font-bold gap-2 bg-background border-primary/20">
              <Filter className="h-4 w-4" /> فلترة
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-20 text-center flex flex-col items-center gap-4">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
              <p className="font-bold text-muted-foreground">جاري تحميل الأخبار...</p>
            </div>
          ) : filteredBroadcasts.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30 border-b-2">
                    <TableHead className="text-right py-5 font-black text-foreground">الخبر والنوع</TableHead>
                    <TableHead className="text-right font-black text-foreground">المسؤول</TableHead>
                    <TableHead className="text-right font-black text-foreground">فترة العرض</TableHead>
                    <TableHead className="text-right font-black text-foreground">الحالة</TableHead>
                    <TableHead className="text-center font-black text-foreground">إجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBroadcasts.map((b) => {
                    const style = getTypeStyle(b.type)
                    const Icon = style.icon
                    return (
                      <TableRow key={b.id} className="hover:bg-primary/[0.02] transition-colors border-b">
                        <TableCell className="py-6">
                          <div className="flex items-start gap-3">
                            <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center shrink-0 border", style.bg, style.color)}>
                              <Icon className="h-5 w-5" />
                            </div>
                            <div className="space-y-1">
                              <p className="font-black text-foreground leading-relaxed max-w-md">{b.content}</p>
                              <Badge variant="outline" className={cn("text-[9px] font-bold border-none", style.bg, style.color)}>
                                {b.type === 'info' ? 'معلومات' : b.type === 'warning' ? 'تنبيه' : b.type === 'danger' ? 'عاجل' : 'إعلان'}
                              </Badge>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <UserCheck className="h-3 w-3 text-muted-foreground" />
                            <span className="text-xs font-bold">{b.recordedByName || "---"}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground">
                              <Calendar className="h-3 w-3" />
                              <span className="font-english">{b.startDate}</span> → <span className="font-english">{b.endDate}</span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Switch 
                              checked={b.isActive} 
                              onCheckedChange={() => toggleStatus(b)}
                            />
                            <span className={cn("text-xs font-black", b.isActive ? "text-emerald-600" : "text-rose-400")}>
                              {b.isActive ? "نشط" : "معطل"}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex justify-center gap-1">
                            <Button 
                              variant="ghost" size="icon" className="text-primary h-9 w-9 rounded-xl hover:bg-primary/5" 
                              onClick={() => { setEditingBroadcast(b); setIsEditOpen(true); }}
                            >
                              <Edit3 className="h-4.5 w-4.5" />
                            </Button>
                            <Button 
                              variant="ghost" size="icon" className="text-rose-500 h-9 w-9 rounded-xl hover:bg-rose-50" 
                              onClick={() => { setBroadcastToDelete(b); setIsDeleteOpen(true); }}
                            >
                              <Trash2 className="h-4.5 w-4.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="p-32 text-center space-y-4">
              <Megaphone className="h-16 w-16 text-muted-foreground/20 mx-auto" />
              <p className="text-muted-foreground font-bold">لا توجد أخبار مسجلة حالياً.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* نافذة الفلترة المتقدمة للأخبار */}
      <Dialog open={isAdvFilterOpen} onOpenChange={setIsAdvFilterOpen}>
        <DialogContent className="sm:max-w-[450px] text-right rounded-[2.5rem]" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black">تصفية سجل الأخبار</DialogTitle>
            <DialogDescription className="font-bold">عرض نوع محدد من الإعلانات أو الحالة.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-6 py-6">
            <div className="space-y-2">
              <Label className="font-bold">حسب النوع</Label>
              <Select value={advFilters.type} onValueChange={(v) => setAdvFilters({...advFilters, type: v})}>
                <SelectTrigger className="h-12 rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="all" className="font-bold">الكل</SelectItem>
                  <SelectItem value="info" className="font-bold">معلومات</SelectItem>
                  <SelectItem value="success" className="font-bold">إعلان عروض</SelectItem>
                  <SelectItem value="warning" className="font-bold">تنبيهات</SelectItem>
                  <SelectItem value="danger" className="font-bold">عاجل جداً</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="font-bold">حسب الحالة</Label>
              <Select value={advFilters.status} onValueChange={(v) => setAdvFilters({...advFilters, status: v})}>
                <SelectTrigger className="h-12 rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="all" className="font-bold">الكل</SelectItem>
                  <SelectItem value="active" className="font-bold">نشط حالياً</SelectItem>
                  <SelectItem value="inactive" className="font-bold">معطل</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button onClick={() => setIsAdvFilterOpen(false)} className="bg-primary text-white flex-1 font-black h-12 rounded-xl shadow-lg">تطبيق</Button>
            <Button variant="outline" onClick={() => { setAdvFilters({type:"all", status:"all"}); setIsAdvFilterOpen(false); }} className="flex-1 font-bold h-12 rounded-xl">تصفير</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* نافذة إضافة خبر */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="sm:max-w-[500px] text-right rounded-[2.5rem]" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black">نشر خبر جديد</DialogTitle>
            <DialogDescription className="font-bold">أدخل نص الخبر وحدد جدولته الزمنية وأولويته.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-6 py-6">
            <div className="space-y-2">
              <Label className="font-bold">محتوى الخبر</Label>
              <Input 
                value={formData.content} 
                onChange={(e) => setFormData({...formData, content: e.target.value})} 
                placeholder="مثال: يرجى العلم بأنه سيتم إجراء جرد للمخازن يوم الخميس القادم"
                className="h-14 rounded-xl bg-muted/30 border-none font-bold" 
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="font-bold">نوع الخبر</Label>
                <Select value={formData.type} onValueChange={(v: any) => setFormData({...formData, type: v})}>
                  <SelectTrigger className="h-12 rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="info" className="font-bold">معلومات (أزرق)</SelectItem>
                    <SelectItem value="success" className="font-bold">إعلان عروض (أخضر)</SelectItem>
                    <SelectItem value="warning" className="font-bold">تنبيه (أصفر)</SelectItem>
                    <SelectItem value="danger" className="font-bold">هام جداً (أحمر)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="font-bold">الأولوية (0-10)</Label>
                <Input 
                  type="number" 
                  value={formData.priority} 
                  onChange={(e) => setFormData({...formData, priority: Number(e.target.value)})} 
                  className="h-12 rounded-xl text-left font-english" 
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label className="text-[10px]">تاريخ الانتهاء</Label><Input type="date" value={formData.endDate} onChange={(e) => setFormData({...formData, endDate: e.target.value})} className="h-10 rounded-lg text-xs font-english" /></div>
              <div className="space-y-2"><Label className="text-[10px]">حتى الساعة</Label><Input type="time" value={formData.endTime} onChange={(e) => setFormData({...formData, endTime: e.target.value})} className="h-10 rounded-lg text-xs font-english" /></div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button onClick={handleAddBroadcast} disabled={loading} className="bg-primary text-white flex-1 font-black h-12 rounded-xl shadow-lg shadow-primary/20">نشر وتعميم</Button>
            <Button variant="outline" onClick={() => setIsAddOpen(false)} className="flex-1 font-bold h-12 rounded-xl">إلغاء</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* نافذة تعديل خبر */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-[500px] text-right rounded-[2.5rem]" dir="rtl">
          <DialogHeader><DialogTitle className="text-2xl font-black">تعديل الخبر المجدول</DialogTitle></DialogHeader>
          <div className="grid gap-6 py-6">
            <div className="space-y-2">
              <Label className="font-bold">المحتوى</Label>
              <Input value={editingBroadcast?.content || ""} onChange={(e) => setEditingBroadcast({...editingBroadcast, content: e.target.value})} className="h-14 rounded-xl bg-muted/30 border-none font-bold" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="font-bold">النوع</Label>
                <Select value={editingBroadcast?.type} onValueChange={(v: any) => setEditingBroadcast({...editingBroadcast, type: v})}>
                  <SelectTrigger className="h-12 rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="info">معلومات</SelectItem>
                    <SelectItem value="success">عروض</SelectItem>
                    <SelectItem value="warning">تنبيه</SelectItem>
                    <SelectItem value="danger">هام جداً</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="font-bold">الأولوية</Label>
                <Input type="number" value={editingBroadcast?.priority || 0} onChange={(e) => setEditingBroadcast({...editingBroadcast, priority: e.target.value})} className="h-12 rounded-xl font-english" />
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button onClick={handleUpdateBroadcast} className="bg-primary text-white flex-1 font-black h-12 rounded-xl shadow-lg">حفظ التغييرات</Button>
            <Button variant="outline" onClick={() => setIsEditOpen(false)} className="flex-1 font-bold h-12 rounded-xl">تراجع</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* تأكيد الحذف */}
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent className="text-right rounded-[2.5rem]" dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-black text-rose-600">حذف الخبر نهائياً</AlertDialogTitle>
            <AlertDialogDescription className="font-bold">هل أنت متأكد من رغبتك في حذف هذا الخبر المجدول؟ لا يمكن التراجع عن هذا الإجراء.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-3 mt-8">
            <AlertDialogAction onClick={handleDeleteBroadcast} className="bg-rose-600 text-white flex-1 font-black h-14 rounded-2xl">تأكيد الحذف</AlertDialogAction>
            <AlertDialogCancel className="flex-1 font-bold h-14 rounded-2xl text-foreground">إلغاء</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
