
"use client"

import { useState, useMemo } from "react"
import { useFirestore, useUser, useCollection, useMemoFirebase } from "@/firebase"
import { collection, doc, query, orderBy } from "firebase/firestore"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { 
  Loader2, 
  UserPlus, 
  Phone, 
  Stethoscope, 
  Trash2, 
  Edit3, 
  CheckCircle2, 
  AlertCircle,
  HandCoins,
  Search,
  UserCog,
  Printer,
  FileSpreadsheet,
  Filter
} from "lucide-react"
import { addDocumentNonBlocking, deleteDocumentNonBlocking, updateDocumentNonBlocking } from "@/firebase/non-blocking-updates"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"
import * as XLSX from 'xlsx'

export function ExternalSupportManager() {
  const firestore = useFirestore()
  const { user } = useUser()
  const { toast } = useToast()

  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterSpecialty, setFilterSpecialty] = useState("all")
  
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  
  const [formData, setFormData] = useState({ name: "", phone: "", specialty: "صيدلي", notes: "", isAvailable: true })
  const [editingStaff, setEditingStaff] = useState<any>(null)

  const staffQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null
    return query(collection(firestore, "users", user.uid, "externalStaff"), orderBy("createdAt", "desc"))
  }, [firestore, user])
  
  const { data: staff, isLoading } = useCollection(staffQuery)

  const filteredStaff = useMemo(() => {
    if (!staff) return []
    return staff.filter(s => {
      const matchSearch = s.name?.toLowerCase().includes(searchTerm.toLowerCase()) || s.phone?.includes(searchTerm)
      const matchSpecialty = filterSpecialty === 'all' || s.specialty === filterSpecialty
      return matchSearch && matchSpecialty
    })
  }, [staff, searchTerm, filterSpecialty])

  const handleAddStaff = () => {
    if (!firestore || !user || !formData.name) return
    setLoading(true)
    addDocumentNonBlocking(collection(firestore, "users", user.uid, "externalStaff"), {
      ...formData,
      createdAt: new Date().toISOString()
    }).then(() => {
      setIsAddOpen(false); setLoading(false); 
      setFormData({ name: "", phone: "", specialty: "صيدلي", notes: "", isAvailable: true });
      toast({ title: "تمت إضافة موظف دعم خارجي" })
    })
  }

  const handleUpdateStaff = () => {
    if (!firestore || !user || !editingStaff) return
    updateDocumentNonBlocking(doc(firestore, "users", user.uid, "externalStaff", editingStaff.id), {
      ...editingStaff,
      updatedAt: new Date().toISOString()
    })
    setIsEditOpen(false)
    toast({ title: "تم تحديث البيانات بنجاح" })
  }

  const toggleAvailability = (item: any) => {
    if (!firestore || !user) return
    updateDocumentNonBlocking(doc(firestore, "users", user.uid, "externalStaff", item.id), {
      isAvailable: !item.isAvailable
    })
  }

  const handleExportExcel = () => {
    const exportData = filteredStaff.map(s => ({
      "الاسم": s.name,
      "التخصص": s.specialty,
      "رقم الهاتف": s.phone,
      "الحالة": s.isAvailable ? "متاح" : "غير متاح",
      "ملاحظات": s.notes
    }));
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "كادر الانتداب");
    XLSX.writeFile(wb, `كادر_الدعم_الخارجي_${new Date().toISOString().split('T')[0]}.xlsx`);
    toast({ title: "تم تصدير الإكسيل" });
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-2xl bg-primary text-white flex items-center justify-center shadow-lg border-2 border-blue-800">
            <Stethoscope className="h-7 w-7" />
          </div>
          <div>
            <h3 className="text-2xl font-black">كادر الدعم الخارجي (الانتداب)</h3>
            <p className="text-muted-foreground font-bold text-xs">إدارة الفريق الاحتياطي للتشغيل الطارئ.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={handleExportExcel} variant="outline" className="h-11 rounded-xl border-emerald-200 font-bold gap-2 text-emerald-700 hover:bg-emerald-50">
            <FileSpreadsheet className="h-4 w-4" /> إكسيل
          </Button>
          <Button onClick={() => window.print()} variant="outline" className="h-11 rounded-xl font-bold gap-2 border-primary/20">
            <Printer className="h-4 w-4" /> طباعة
          </Button>
          <Button onClick={() => setIsAddOpen(true)} className="h-11 rounded-xl bg-primary text-white font-black px-6 shadow-lg hover:scale-105 transition-all gap-2">
            <UserPlus className="h-4 w-4" /> إضافة كادر
          </Button>
        </div>
      </div>

      <Card className="border shadow-xl bg-card rounded-[2.5rem] overflow-hidden border-blue-800/10">
        <CardHeader className="bg-muted/30 border-b p-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <CardTitle className="text-xl font-black flex items-center gap-2"><UserCog className="h-5 w-5 text-primary" /> سجل الكوادر الخارجية</CardTitle>
          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <Search className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="بحث بالاسم أو الهاتف..." 
                value={searchTerm} 
                onChange={(e) => setSearchTerm(e.target.value)} 
                className="h-10 pr-10 rounded-xl font-bold bg-background shadow-inner border-none" 
              />
            </div>
            <Select value={filterSpecialty} onValueChange={setFilterSpecialty}>
              <SelectTrigger className="h-10 w-[140px] rounded-xl font-bold bg-background border-primary/10">
                <Filter className="h-3.5 w-3.5 ml-2 opacity-50" />
                <SelectValue placeholder="التخصص" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="all" className="font-bold">الكل</SelectItem>
                <SelectItem value="صيدلي" className="font-bold text-primary">صيدلي</SelectItem>
                <SelectItem value="مساعد" className="font-bold text-amber-600">مساعد</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table className="ledger-table">
            <TableHeader>
              <TableRow className="bg-muted/50 border-b-2">
                <TableHead className="text-right py-5 font-black">الاسم والتخصص</TableHead>
                <TableHead className="text-right font-black">رقم التواصل</TableHead>
                <TableHead className="text-right font-black">الحالة الحالية</TableHead>
                <TableHead className="text-center font-black print:hidden">إجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={4} className="p-20 text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" /></TableCell></TableRow>
              ) : filteredStaff.length > 0 ? (
                filteredStaff.map((item) => (
                  <TableRow key={item.id} className="hover:bg-primary/[0.02] border-b transition-colors group">
                    <TableCell className="py-6">
                      <div className="flex flex-col">
                        <span className="font-black text-lg text-foreground group-hover:text-primary transition-colors">{item.name}</span>
                        <Badge variant="outline" className={cn("w-fit text-[9px] font-black border-none", item.specialty === 'صيدلي' ? "bg-primary/5 text-primary" : "bg-amber-500/5 text-amber-600")}>
                          {item.specialty}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 font-english font-black text-xs">
                        <Phone className="h-3 w-3 text-muted-foreground" />
                        {item.phone || "---"}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Button 
                        variant="ghost" 
                        onClick={() => toggleAvailability(item)}
                        className={cn("h-8 rounded-full gap-2 px-4 font-black text-[10px] shadow-sm", item.isAvailable ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20" : "bg-rose-500/10 text-rose-600 border border-rose-500/20")}
                      >
                        {item.isAvailable ? <CheckCircle2 className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
                        {item.isAvailable ? "متاح للعمل" : "غير متاح حالياً"}
                      </Button>
                    </TableCell>
                    <TableCell className="text-center print:hidden border-l">
                      <div className="flex justify-center gap-1.5">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="rounded-xl font-black h-9 border-amber-500 text-amber-600 hover:bg-amber-50 gap-2"
                          onClick={() => {
                            window.dispatchEvent(new CustomEvent('switch-dashboard-tab', { detail: 'expenses' }))
                            toast({ title: "توجه لقسم المصروفات", description: "سجل مبلغه تحت بند (مصروفات انتداب)." })
                          }}
                        >
                          <HandCoins className="h-4 w-4" /> صرف يومية
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="text-primary h-9 w-9 rounded-xl hover:bg-primary/5"
                          onClick={() => { setEditingStaff(item); setIsEditOpen(true); }}
                        >
                          <Edit3 className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="text-rose-500 h-9 w-9 rounded-xl hover:bg-rose-50"
                          onClick={() => deleteDocumentNonBlocking(doc(firestore, "users", user.uid, "externalStaff", item.id))}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow><TableCell colSpan={4} className="p-32 text-center text-muted-foreground font-bold italic">لا يوجد كادر مطابق للبحث.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* نافذة الإضافة */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="sm:max-w-[450px] text-right rounded-[2.5rem]" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black flex items-center gap-3 text-primary">
              <UserCog className="h-6 w-6" />
              تسجيل كادر انتداب
            </DialogTitle>
            <DialogDescription className="font-bold">أدخل بيانات الموظف المتاح للعمل الخارجي.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-6 py-6">
            <div className="space-y-2">
              <Label className="font-bold">الاسم الكامل</Label>
              <Input 
                value={formData.name} 
                onChange={(e) => setFormData({...formData, name: e.target.value})} 
                className="h-12 rounded-xl bg-muted/30 border-none font-bold" 
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="font-bold">التخصص</Label>
                <Select value={formData.specialty} onValueChange={(v) => setFormData({...formData, specialty: v})}>
                  <SelectTrigger className="h-12 rounded-xl bg-muted/30 border-none font-bold"><SelectValue /></SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="صيدلي" className="font-bold">صيدلي</SelectItem>
                    <SelectItem value="مساعد" className="font-bold">مساعد</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="font-bold">رقم الهاتف</Label>
                <Input value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} className="h-12 rounded-xl font-english" />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="font-bold">ملاحظات إضافية</Label>
              <Input value={formData.notes} onChange={(e) => setFormData({...formData, notes: e.target.value})} className="h-12 rounded-xl" placeholder="أيام التوافر أو ملاحظات مالية..." />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleAddStaff} disabled={loading || !formData.name} className="bg-primary text-white flex-1 h-14 rounded-2xl font-black shadow-lg shadow-primary/20">حفظ البيانات</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* نافذة التعديل */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-[450px] text-right rounded-[2.5rem]" dir="rtl">
          <DialogHeader><DialogTitle className="text-2xl font-black text-primary">تعديل بيانات الموظف</DialogTitle></DialogHeader>
          <div className="grid gap-6 py-6">
            <div className="space-y-2">
              <Label className="font-bold">الاسم</Label>
              <Input value={editingStaff?.name || ""} onChange={e => setEditingStaff({...editingStaff, name: e.target.value})} className="h-12 rounded-xl font-bold" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="font-bold">التخصص</Label>
                <Select value={editingStaff?.specialty} onValueChange={v => setEditingStaff({...editingStaff, specialty: v})}>
                  <SelectTrigger className="h-12 rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="صيدلي">صيدلي</SelectItem>
                    <SelectItem value="مساعد">مساعد</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="font-bold">الهاتف</Label>
                <Input value={editingStaff?.phone || ""} onChange={e => setEditingStaff({...editingStaff, phone: e.target.value})} className="h-12 rounded-xl font-english" />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="font-bold">الملاحظات</Label>
              <Input value={editingStaff?.notes || ""} onChange={e => setEditingStaff({...editingStaff, notes: e.target.value})} className="h-12 rounded-xl" />
            </div>
          </div>
          <DialogFooter><Button onClick={handleUpdateStaff} className="bg-primary text-white flex-1 h-12 rounded-xl font-black shadow-lg">حفظ التغييرات</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
