
"use client"

import { useState, useMemo } from "react"
import { useFirestore, useUser, useCollection, useMemoFirebase } from "@/firebase"
import { collection, doc } from "firebase/firestore"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { useToast } from "@/hooks/use-toast"
import { 
  Loader2, 
  PlusCircle, 
  Trash2, 
  Edit3, 
  Calendar,
  Search,
  Star,
  Rocket,
  Filter,
  Trophy,
  Target
} from "lucide-react"
import { 
  addDocumentNonBlocking, 
  updateDocumentNonBlocking, 
  deleteDocumentNonBlocking 
} from "@/firebase/non-blocking-updates"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

export function GoalsSection() {
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
    title: "", type: "financial", targetValue: "", currentValue: "0", unit: "ج.م",
    endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    emoji: "🎯", color: "primary"
  })

  const [editingGoal, setEditingGoal] = useState<any>(null)
  const [goalToDelete, setGoalToDelete] = useState<any>(null)

  const goalsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null
    return collection(firestore, "users", user.uid, "goals")
  }, [firestore, user])
  
  const { data: goals, isLoading } = useCollection(goalsQuery)

  const filteredGoals = useMemo(() => {
    if (!goals) return []
    return goals.filter(g => {
      const matchSearch = g.title?.toLowerCase().includes(searchTerm.toLowerCase())
      const matchType = advFilters.type === 'all' || g.type === advFilters.type
      const matchStatus = advFilters.status === 'all' || g.status === advFilters.status
      return matchSearch && matchType && matchStatus
    }).sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
  }, [goals, searchTerm, advFilters])

  const handleAddGoal = async () => {
    if (!firestore || !user || !formData.title || !formData.targetValue) return
    setLoading(true)
    addDocumentNonBlocking(collection(firestore, "users", user.uid, "goals"), {
      ...formData,
      targetValue: Number(formData.targetValue),
      currentValue: Number(formData.currentValue) || 0,
      status: "active",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }).then(() => {
      setIsAddOpen(false); setLoading(false);
      setFormData({ title: "", type: "financial", targetValue: "", currentValue: "0", unit: "ج.م", endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], emoji: "🎯", color: "primary" })
      toast({ title: "تم تسجيل الهدف" })
    }).catch(() => setLoading(false))
  }

  const handleUpdateGoal = () => {
    if (!firestore || !user || !editingGoal) return
    const targetVal = Number(editingGoal.targetValue)
    const currentVal = Number(editingGoal.currentValue)
    
    updateDocumentNonBlocking(doc(firestore, "users", user.uid, "goals", editingGoal.id), {
      ...editingGoal,
      targetValue: targetVal,
      currentValue: currentVal,
      status: currentVal >= targetVal ? "achieved" : "active",
      updatedAt: new Date().toISOString()
    })
    setIsEditOpen(false); toast({ title: "تم التحديث بنجاح" })
  }

  const handleDeleteGoal = () => {
    if (!firestore || !user || !goalToDelete) return
    deleteDocumentNonBlocking(doc(firestore, "users", user.uid, "goals", goalToDelete.id))
    setIsDeleteOpen(false); setGoalToDelete(null); toast({ title: "تم الحذف" })
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20 px-4 md:px-0" dir="rtl">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-3xl font-black text-foreground flex items-center gap-3">
            <Rocket className="h-8 w-8 text-primary" /> 
            أهداف الصيدلية الذكية
          </h2>
          <p className="text-muted-foreground font-medium">خطط لمستقبلك المالي والتشغيلي وتابع إنجازاتك.</p>
        </div>
        <Button onClick={() => setIsAddOpen(true)} className="h-14 rounded-2xl bg-primary text-white font-black px-8 shadow-xl shadow-primary/20 transition-all hover:scale-105 active:scale-95 gap-2">
          <PlusCircle className="h-6 w-6" /> إضافة هدف جديد
        </Button>
      </div>

      <Card className="border shadow-xl bg-card rounded-[2.5rem] overflow-hidden border-blue-800/10">
        <CardHeader className="border-b bg-muted/30 p-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Star className="h-5 w-5 text-amber-500 fill-current" />
            <CardTitle className="text-xl font-black">لوحة متابعة المستهدفات</CardTitle>
          </div>
          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <Search className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="بحث في الأهداف..." 
                value={searchTerm} 
                onChange={(e) => setSearchTerm(e.target.value)} 
                className="h-10 pr-10 rounded-xl font-bold bg-background border-none shadow-inner" 
              />
            </div>
            <Button variant="outline" onClick={() => setIsAdvFilterOpen(true)} className="h-10 rounded-xl font-bold gap-2 bg-background border-primary/20">
              <Filter className="h-4 w-4" /> فلترة
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          {isLoading ? (
            <div className="p-20 text-center flex flex-col items-center gap-4">
              <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
              <p className="font-bold text-muted-foreground">جاري استرجاع الأهداف...</p>
            </div>
          ) : filteredGoals.length > 0 ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filteredGoals.map((goal) => {
                const progress = Math.min(Math.round(((goal.currentValue || 0) / goal.targetValue) * 100), 100)
                return (
                  <Card key={goal.id} className="border shadow-sm rounded-[2rem] overflow-hidden transition-all hover:shadow-lg relative group">
                    <div className={cn("absolute top-0 right-0 w-1.5 h-full", goal.color === 'emerald' ? 'bg-emerald-500' : goal.color === 'amber' ? 'bg-amber-500' : goal.color === 'rose' ? 'bg-rose-500' : 'bg-primary')} />
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-start">
                        <div className="h-12 w-12 rounded-2xl bg-muted flex items-center justify-center text-2xl shadow-inner border border-white/10">{goal.emoji || "🎯"}</div>
                        <div className="flex gap-1">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-primary rounded-xl hover:bg-primary/5" 
                            onClick={() => { setEditingGoal(goal); setIsEditOpen(true); }}
                          >
                            <Edit3 className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-rose-500 rounded-xl hover:bg-rose-50" 
                            onClick={() => { setGoalToDelete(goal); setIsDeleteOpen(true); }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <CardTitle className="text-xl font-black mt-3 leading-tight">{goal.title}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-5">
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs font-black">
                          <span className="text-muted-foreground">التقدم: <span className="font-english text-foreground">{(goal.currentValue || 0).toLocaleString()}</span> {goal.unit}</span>
                          <span className={cn("font-english", progress >= 100 ? "text-emerald-600" : "text-primary")}>{progress}%</span>
                        </div>
                        <Progress value={progress} className="h-2.5 rounded-full bg-muted shadow-inner" />
                      </div>
                      <div className="pt-4 border-t border-dashed flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-[10px] font-black text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          <span>ينتهي في: <span className="font-english">{goal.endDate}</span></span>
                        </div>
                        {progress >= 100 ? (
                          <Badge className="bg-emerald-500/10 text-emerald-600 border-none font-black text-[9px] px-3 py-1 rounded-lg">تم الإنجاز 🎉</Badge>
                        ) : (
                          <Badge variant="secondary" className="bg-primary/5 text-primary border-none font-black text-[9px] px-3 py-1 rounded-lg">نشط</Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          ) : (
            <div className="p-32 text-center space-y-4">
              <Target className="h-16 w-16 text-muted-foreground/20 mx-auto" />
              <p className="text-muted-foreground font-bold italic">لم يتم تحديد أي أهداف استراتيجية بعد.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* نافذة الفلترة المتقدمة للأهداف */}
      <Dialog open={isAdvFilterOpen} onOpenChange={setIsAdvFilterOpen}>
        <DialogContent className="sm:max-w-[450px] text-right rounded-[2.5rem]" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black">فلترة الأهداف</DialogTitle>
            <DialogDescription className="font-bold text-right">عرض نوع محدد من الأهداف أو تصفية حسب الحالة.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-6 py-6 text-right">
            <div className="space-y-2 text-right">
              <Label className="font-bold">حسب النوع</Label>
              <Select value={advFilters.type} onValueChange={(v) => setAdvFilters({...advFilters, type: v})}>
                <SelectTrigger className="h-12 rounded-xl text-right font-bold"><SelectValue /></SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="all" className="font-bold text-right">كل الأنواع</SelectItem>
                  <SelectItem value="financial" className="font-bold text-right text-emerald-600">أهداف مالية (ج.م)</SelectItem>
                  <SelectItem value="quantity" className="font-bold text-right text-blue-600">أهداف كمية (وحدات)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 text-right">
              <Label className="font-bold">حسب الحالة</Label>
              <Select value={advFilters.status} onValueChange={(v) => setAdvFilters({...advFilters, status: v})}>
                <SelectTrigger className="h-12 rounded-xl text-right font-bold"><SelectValue /></SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="all" className="font-bold text-right">كل الحالات</SelectItem>
                  <SelectItem value="active" className="font-bold text-right text-primary">نشط حالياً</SelectItem>
                  <SelectItem value="achieved" className="font-bold text-right text-emerald-600">تم الإنجاز</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button onClick={() => setIsAdvFilterOpen(false)} className="bg-primary text-white flex-1 font-black h-12 rounded-xl shadow-lg">تطبيق</Button>
            <Button variant="outline" onClick={() => { setAdvFilters({type: "all", status: "all"}); setIsAdvFilterOpen(false); }} className="flex-1 font-bold h-12 rounded-xl">تصفير</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* نافذة إضافة هدف جديد */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="sm:max-w-[500px] text-right rounded-[2.5rem]" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black text-primary">تحديد هدف استراتيجي</DialogTitle>
            <DialogDescription className="font-bold text-right">أدخل مسمى الهدف والقيمة التي تسعى للوصول إليها.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-6 py-6 text-right">
            <div className="space-y-2 text-right">
              <Label className="font-bold">مسمى الهدف</Label>
              <Input 
                value={formData.title} 
                onChange={(e) => setFormData({...formData, title: e.target.value})} 
                placeholder="مثال: مبيعات الربع الأول"
                className="h-12 rounded-xl bg-muted/30 border-none font-bold" 
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2 text-right">
                <Label className="font-bold">نوع الهدف</Label>
                <Select value={formData.type} onValueChange={(v: any) => setFormData({...formData, type: v, unit: v === 'financial' ? 'ج.م' : 'عبوة'})}>
                  <SelectTrigger className="h-12 rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="financial">هدف مالي</SelectItem>
                    <SelectItem value="quantity">هدف كمي</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 text-right">
                <Label className="font-bold">الوحدة</Label>
                <Input value={formData.unit} onChange={(e) => setFormData({...formData, unit: e.target.value})} className="h-12 rounded-xl" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2 text-right">
                <Label className="font-black text-primary">القيمة المستهدفة</Label>
                <Input 
                  type="number" 
                  value={formData.targetValue} 
                  onChange={(e) => setFormData({...formData, targetValue: e.target.value})} 
                  className="h-12 rounded-xl font-english font-black text-xl bg-muted/30 border-none" 
                />
              </div>
              <div className="space-y-2 text-right">
                <Label className="font-bold">تاريخ الانتهاء</Label>
                <Input 
                  type="date" 
                  value={formData.endDate} 
                  onChange={(e) => setFormData({...formData, endDate: e.target.value})} 
                  className="h-12 rounded-xl font-english" 
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleAddGoal} disabled={loading || !formData.title || !formData.targetValue} className="bg-primary text-white flex-1 h-14 rounded-2xl font-black text-lg shadow-xl shadow-primary/20">اعتماد الهدف الجديد</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* نافذة تعديل هدف */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-[500px] text-right rounded-[2.5rem]" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black text-primary flex items-center gap-2">
              <Edit3 className="h-6 w-6" /> تعديل بيانات الهدف
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-6 py-6 text-right">
            <div className="space-y-2 text-right">
              <Label className="font-bold">اسم الهدف</Label>
              <Input 
                value={editingGoal?.title || ""} 
                onChange={(e) => setEditingGoal({...editingGoal, title: e.target.value})} 
                className="h-12 rounded-xl font-black bg-muted/30 border-none" 
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2 text-right">
                <Label className="font-black text-emerald-600">المحقق فعلياً</Label>
                <Input 
                  type="number" 
                  value={editingGoal?.currentValue || 0} 
                  onChange={(e) => setEditingGoal({...editingGoal, currentValue: e.target.value})} 
                  className="h-12 rounded-xl font-english font-black bg-muted/30 border-none" 
                />
              </div>
              <div className="space-y-2 text-right">
                <Label className="font-black text-primary">المستهدف الكلي</Label>
                <Input 
                  type="number" 
                  value={editingGoal?.targetValue || 0} 
                  onChange={(e) => setEditingGoal({...editingGoal, targetValue: e.target.value})} 
                  className="h-12 rounded-xl font-english font-black bg-muted/30 border-none" 
                />
              </div>
            </div>
            <div className="space-y-2 text-right">
              <Label className="font-bold">تاريخ الانتهاء المخطط</Label>
              <Input 
                type="date" 
                value={editingGoal?.endDate || ""} 
                onChange={(e) => setEditingGoal({...editingGoal, endDate: e.target.value})} 
                className="h-12 rounded-xl font-english" 
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleUpdateGoal} className="bg-primary text-white flex-1 h-14 rounded-2xl font-black text-lg shadow-lg shadow-primary/20">حفظ التغييرات</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* تأكيد الحذف */}
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent className="text-right border-2 border-rose-500 rounded-[2.5rem]" dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-2xl font-black text-rose-600 flex items-center gap-2">
              <Trash2 className="h-8 w-8" /> حذف الهدف نهائياً
            </AlertDialogTitle>
            <AlertDialogDescription className="text-base font-bold mt-2 text-right">
              هل أنت متأكد من رغبتك في حذف الهدف <b>({goalToDelete?.title})</b>؟ سيؤدي ذلك لإزالته من لوحة التحكم وشريط المتابعة. لا يمكن التراجع.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-3 mt-8">
            <AlertDialogAction 
              onClick={handleDeleteGoal} 
              className="bg-rose-600 hover:bg-rose-700 text-white flex-1 h-14 rounded-2xl font-black shadow-lg shadow-rose-500/20"
            >
              نعم، احذف السجل
            </AlertDialogAction>
            <AlertDialogCancel className="flex-1 h-14 rounded-2xl font-bold border-2">إلغاء</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function KPIItem({ label, value, icon: Icon, color, highlight }: any) {
  const styles: any = { 
    primary: "bg-primary/10 text-primary border-primary/20", 
    rose: "bg-rose-500/10 text-rose-600 border-rose-500/20", 
    emerald: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" 
  }
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
