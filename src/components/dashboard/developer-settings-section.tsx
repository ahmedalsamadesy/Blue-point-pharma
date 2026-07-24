
"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import { useFirestore, useUser, useDoc, useMemoFirebase } from "@/firebase"
import { collection, getDocs, doc } from "firebase/firestore"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  Terminal, 
  Cpu, 
  Database, 
  Wifi, 
  ShieldAlert, 
  RefreshCw, 
  Activity, 
  Code2,
  Trash2,
  CloudLightning,
  Loader2,
  LayoutGrid,
  Image as ImageIcon,
  CheckCircle2,
  Settings2,
  Upload,
  Pill,
  Stethoscope,
  PlusSquare,
  Eye,
  EyeOff,
  MousePointerClick,
  Zap,
  Star,
  HeartPulse,
  FlaskConical,
  BriefcaseMedical,
  Truck,
  ShieldCheck,
  Receipt,
  ShoppingBag,
  Users,
  Boxes,
  ArrowRightLeft,
  FileBarChart,
  Target,
  History,
  Save
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { APP_CONSTANTS } from "@/lib/constants"
import { cn } from "@/lib/utils"
import { updateDocumentNonBlocking } from "@/firebase/non-blocking-updates"
import { Checkbox } from "@/components/ui/checkbox"
import { Separator } from "@/components/ui/separator"

const PRESET_ICONS = [
  { id: 'default', label: 'الافتراضي', icon: Activity, color: 'bg-primary' },
  { id: 'pharmacy_cross', label: 'كروس صيدلية', icon: PlusSquare, color: 'bg-emerald-500' },
  { id: 'pill', label: 'دواء/كبسولة', icon: Pill, color: 'bg-blue-500' },
  { id: 'medical', label: 'سماعة طبيب', icon: Stethoscope, color: 'bg-rose-500' },
  { id: 'star_premium', label: 'نجمة التميز', icon: Star, color: 'bg-amber-500' },
  { id: 'heart', label: 'نبض القلب', icon: HeartPulse, color: 'bg-red-500' },
  { id: 'lab', label: 'مختبر', icon: FlaskConical, color: 'bg-purple-500' },
  { id: 'kit', label: 'إسعافات', icon: BriefcaseMedical, color: 'bg-teal-600' },
  { id: 'delivery', label: 'توصيل/شحن', icon: Truck, color: 'bg-orange-500' },
  { id: 'secure', label: 'حماية', icon: ShieldCheck, color: 'bg-slate-700' },
]

const ALL_QUICK_ACTIONS = [
  { id: "sales", label: "مبيعات", icon: Receipt },
  { id: "expenses", label: "مصروف", icon: PlusSquare },
  { id: "purchases", label: "مشتريات", icon: ShoppingBag },
  { id: "customers", label: "تحصيل عميل", icon: Users },
  { id: "suppliers", label: "سداد مورد", icon: Truck },
  { id: "inventory", label: "إضافة صنف", icon: LayoutGrid },
  { id: "branch_transfers", label: "تبادل أدوية", icon: Boxes },
  { id: "transfers", label: "تحويل نقدية", icon: ArrowRightLeft },
  { id: "reports", label: "تقرير سريع", icon: FileBarChart },
  { id: "goals", label: "هدف جديد", icon: Target },
  { id: "closing", label: "حساب ختامي", icon: ShieldCheck },
  { id: "audit", label: "سجل الرقابة", icon: History },
]

export function DeveloperSettingsSection() {
  const { user } = useUser()
  const firestore = useFirestore()
  const { toast } = useToast()
  const systemLogoRef = useRef<HTMLInputElement>(null)

  const [isLoadingStats, setIsLoadingStats] = useState(true)
  const [dbStats, setDbStats] = useState<Record<string, number>>({})
  const [latency, setLatency] = useState<number | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [uploading, setUploading] = useState(false)

  const settingsRef = useMemoFirebase(() => {
    if (!firestore || !user) return null
    return doc(firestore, "users", user.uid, "settings", "current")
  }, [firestore, user])
  const { data: settings } = useDoc(settingsRef)

  const [branding, setBranding] = useState({
    systemName: "BluePointPharma",
    systemLogoUrl: "",
    systemVersion: APP_CONSTANTS.VERSION,
    dashboardConfig: {
      showStats: true,
      showAi: true,
      showCharts: true,
      showGoals: true,
      showSummary: true,
      showMarquee: true,
      showQuickActions: true,
      showWelcomeCard: true
    },
    enabledShortcuts: ["sales", "expenses", "purchases", "customers", "suppliers", "inventory"]
  })

  useEffect(() => {
    if (settings) {
      setBranding({
        systemName: settings.systemName || "BluePointPharma",
        systemLogoUrl: settings.systemLogoUrl || "",
        systemVersion: settings.systemVersion || APP_CONSTANTS.VERSION,
        dashboardConfig: {
          showStats: settings.dashboardConfig?.showStats ?? true,
          showAi: settings.dashboardConfig?.showAi ?? true,
          showCharts: settings.dashboardConfig?.showCharts ?? true,
          showGoals: settings.dashboardConfig?.showGoals ?? true,
          showSummary: settings.dashboardConfig?.showSummary ?? true,
          showMarquee: settings.dashboardConfig?.showMarquee ?? true,
          showQuickActions: settings.dashboardConfig?.showQuickActions ?? true,
          showWelcomeCard: settings.dashboardConfig?.showWelcomeCard ?? true
        },
        enabledShortcuts: settings.enabledShortcuts || ["sales", "expenses", "purchases", "customers", "suppliers", "inventory"]
      })
    }
  }, [settings])

  const fetchDbStats = async () => {
    if (!firestore || !user) return
    setIsRefreshing(true)
    const startTime = performance.now()
    
    try {
      const collections = [
        "inventory", "suppliers", "customers", "employees", 
        "auditLogs", "cashTransfers", "closedPeriods", "broadcasts"
      ]
      const stats: Record<string, number> = {}
      for (const colName of collections) {
        const snap = await getDocs(collection(firestore, "users", user.uid, colName))
        stats[colName] = snap.docs.length
      }
      setDbStats(stats)
      setLatency(Math.round(performance.now() - startTime))
    } catch (e) {
      console.error(e)
    } finally {
      setIsLoadingStats(false)
      setIsRefreshing(false)
    }
  }

  useEffect(() => { fetchDbStats() }, [firestore, user])

  const handleUpdateBranding = () => {
    if (!settingsRef) return
    updateDocumentNonBlocking(settingsRef, {
      ...branding,
      updatedAt: new Date().toISOString()
    })
    toast({ title: "تم تحديث هوية ونظام البرنامج", description: "تم تطبيق كافة التغييرات على الواجهة فوراً." })
  }

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 300000) {
      toast({ variant: "destructive", title: "حجم كبير", description: "يرجى استخدام صورة أصغر من 300KB." })
      return
    }
    setUploading(true)
    const reader = new FileReader()
    reader.onloadend = () => {
      setBranding(p => ({ ...p, systemLogoUrl: reader.result as string }))
      setUploading(false)
    }
    reader.readAsDataURL(file)
  }

  const toggleDashboardElement = (key: string) => {
    setBranding(prev => ({
      ...prev,
      dashboardConfig: {
        ...prev.dashboardConfig,
        [key as keyof typeof prev.dashboardConfig]: !((prev.dashboardConfig as any)[key])
      }
    }))
  }

  const toggleShortcut = (id: string) => {
    setBranding(prev => {
      const current = prev.enabledShortcuts;
      const next = current.includes(id) ? current.filter(i => i !== id) : [...current, id];
      return { ...prev, enabledShortcuts: next };
    })
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20 px-4 md:px-0" dir="rtl">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-3xl font-black text-foreground flex items-center gap-3">
            <Terminal className="h-8 w-8 text-primary" />
            مركز المطور المتقدم v4.8.5
          </h2>
          <p className="text-muted-foreground font-medium">إدارة البنية التحتية، تخصيص الواجهات، وتوزيع العناصر البرمجية.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={handleUpdateBranding} className="h-12 px-8 rounded-xl bg-primary text-white font-black shadow-lg gap-2">
            <Save className="h-4 w-4" /> حفظ كافة التغييرات
          </Button>
        </div>
      </div>

      <Tabs defaultValue="diagnostics" className="w-full">
        <TabsList className="bg-muted/50 p-1.5 rounded-2xl h-auto flex gap-1 mb-8 shadow-sm overflow-x-auto scrollbar-hide w-full justify-start flex-nowrap">
          <TabsTrigger value="diagnostics" className="rounded-xl px-6 py-2.5 font-bold text-xs gap-2 shrink-0 whitespace-nowrap">
            <Activity className="h-4 w-4" /> التشخيص
          </TabsTrigger>
          <TabsTrigger value="branding" className="rounded-xl px-6 py-2.5 font-bold text-xs gap-2 shrink-0 whitespace-nowrap">
            <ImageIcon className="h-4 w-4" /> الهوية البصرية
          </TabsTrigger>
          <TabsTrigger value="layout" className="rounded-xl px-6 py-2.5 font-bold text-xs gap-2 shrink-0 whitespace-nowrap">
            <LayoutGrid className="h-4 w-4" /> تخصيص الواجهة
          </TabsTrigger>
          <TabsTrigger value="shortcuts" className="rounded-xl px-6 py-2.5 font-bold text-xs gap-2 shrink-0 whitespace-nowrap">
            <MousePointerClick className="h-4 w-4" /> الاختصارات
          </TabsTrigger>
          <TabsTrigger value="danger" className="rounded-xl px-6 py-2.5 font-bold text-xs gap-2 text-rose-600 shrink-0 whitespace-nowrap">
            <ShieldAlert className="h-4 w-4" /> الخطر
          </TabsTrigger>
        </TabsList>

        <TabsContent value="diagnostics" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-12">
            <Card className="md:col-span-4 border shadow-xl bg-card rounded-[2.5rem] overflow-hidden">
              <CardHeader className="bg-primary/5 border-b p-6">
                <CardTitle className="text-lg font-black flex items-center gap-2">نبض الاتصال</CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <div className="flex items-center justify-between p-4 rounded-2xl bg-muted/30">
                  <div className="flex items-center gap-3">
                    <Wifi className="h-5 w-5 text-emerald-500" />
                    <span className="font-bold text-sm">حالة Firestore</span>
                  </div>
                  <Badge className="bg-emerald-500 text-white">متصل (Online)</Badge>
                </div>
                <div className="flex items-center justify-between p-4 rounded-2xl bg-muted/30">
                  <div className="flex items-center gap-3">
                    <CloudLightning className="h-5 w-5 text-amber-500" />
                    <span className="font-bold text-sm">زمن الاستجابة</span>
                  </div>
                  <span className="font-english font-black text-primary">{latency || "--"} ms</span>
                </div>
              </CardContent>
            </Card>

            <Card className="md:col-span-8 border shadow-xl bg-card rounded-[2.5rem] overflow-hidden">
              <CardHeader className="bg-muted/30 border-b p-6">
                <CardTitle className="text-lg font-black flex items-center gap-2">إحصائيات المجموعات</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                {isLoadingStats ? (
                  <div className="flex flex-col items-center justify-center py-10 gap-2">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-xs font-bold text-muted-foreground">جاري فحص السحابة...</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {Object.entries(dbStats).map(([key, val]) => (
                      <div key={key} className="p-4 rounded-2xl bg-muted/20 border flex flex-col gap-1 transition-all hover:bg-primary/5">
                        <span className="text-[10px] font-black uppercase text-muted-foreground truncate">{key}</span>
                        <span className="text-2xl font-black font-english text-primary">{val}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="branding" className="animate-in slide-in-from-bottom-2">
          <div className="grid gap-6 md:grid-cols-12">
            <Card className="md:col-span-7 border shadow-xl bg-card rounded-[2.5rem] overflow-hidden">
              <CardHeader className="bg-primary/5 border-b p-6">
                <CardTitle className="text-xl font-black flex items-center gap-2">
                  <Settings2 className="h-5 w-5 text-primary" />
                  إعدادات الهوية الأساسية
                </CardTitle>
              </CardHeader>
              <CardContent className="p-8 space-y-8">
                <div className="space-y-4">
                  <Label className="font-black text-primary">اسم البرنامج التقني</Label>
                  <Input 
                    value={branding.systemName} 
                    onChange={e => setBranding({...branding, systemName: e.target.value})} 
                    className="h-14 rounded-2xl bg-muted/30 border-none font-black text-xl shadow-inner" 
                  />
                </div>
                
                <Separator />

                <div className="space-y-4">
                  <Label className="font-black">مكتبة الأيقونات الموسعة</Label>
                  <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
                    {PRESET_ICONS.map((icon) => (
                      <div 
                        key={icon.id}
                        onClick={() => setBranding({...branding, systemLogoUrl: icon.id === 'default' ? '' : `preset:${icon.id}`})}
                        className={cn(
                          "cursor-pointer p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 hover:bg-primary/5",
                          branding.systemLogoUrl === (icon.id === 'default' ? '' : `preset:${icon.id}`) ? "border-primary bg-primary/5 shadow-md scale-105" : "border-transparent bg-muted/30"
                        )}
                      >
                        <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center text-white shadow-lg", icon.color)}>
                          <icon.icon className="h-6 w-6" />
                        </div>
                        <span className="text-[10px] font-black text-center">{icon.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="md:col-span-5 border shadow-xl bg-card rounded-[2.5rem] overflow-hidden">
              <CardHeader className="bg-muted/30 border-b p-6">
                <CardTitle className="text-xl font-black">تحميل أيقونة مخصصة</CardTitle>
              </CardHeader>
              <CardContent className="p-8 flex flex-col items-center gap-6">
                <div className="relative">
                  <div className="h-32 w-32 rounded-[2.5rem] bg-gradient-to-br from-primary to-blue-600 shadow-2xl flex items-center justify-center overflow-hidden border-4 border-background">
                    {branding.systemLogoUrl?.startsWith('preset:') ? (
                      (() => {
                        const preset = PRESET_ICONS.find(p => `preset:${p.id}` === branding.systemLogoUrl);
                        const Icon = preset?.icon || Activity;
                        return <Icon className="h-16 w-16 text-white" />
                      })()
                    ) : branding.systemLogoUrl ? (
                      <img src={branding.systemLogoUrl} className="h-full w-full object-cover" />
                    ) : (
                      <Activity className="h-16 w-16 text-white" />
                    )}
                  </div>
                  {branding.systemLogoUrl && (
                    <Button 
                      variant="destructive" 
                      size="icon" 
                      onClick={() => setBranding({...branding, systemLogoUrl: ""})}
                      className="absolute -top-2 -right-2 h-8 w-8 rounded-full shadow-lg"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <input type="file" ref={systemLogoRef} className="hidden" accept="image/*" onChange={handleLogoUpload} />
                <Button variant="outline" onClick={() => systemLogoRef.current?.click()} disabled={uploading} className="rounded-xl font-bold h-12 gap-2 w-full">
                  {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} رفع ملف خارجي
                </Button>
                <div className="p-4 rounded-2xl bg-primary/5 border border-primary/10 w-full text-center">
                  <p className="text-[10px] text-muted-foreground font-bold leading-relaxed">
                    يفضل استخدام صورة مربعة شفافة (PNG) بحجم أقل من 300KB لضمان سرعة التحميل.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="layout" className="animate-in slide-in-from-bottom-2">
          <Card className="border shadow-xl bg-card rounded-[2.5rem] overflow-hidden border-blue-800/10">
            <CardHeader className="bg-primary/5 border-b p-8">
              <CardTitle className="text-xl flex items-center gap-2 font-black">
                <LayoutGrid className="h-5 w-5 text-primary" /> 
                هندسة الشاشة الرئيسية (Dashboard Layout)
              </CardTitle>
              <CardDescription className="font-bold">تحكم في ظهور أو إخفاء موديولات الصفحة الرئيسية لتناسب طبيعة عمل صيدليتك.</CardDescription>
            </CardHeader>
            <CardContent className="p-8 space-y-10">
              <div className="grid gap-6 md:grid-cols-2">
                {[
                  { id: 'showWelcomeCard', label: 'بطاقة الترحيب واللوجو الرئيسي', icon: Settings2 },
                  { id: 'showMarquee', label: 'شريط الأخبار والنبض التشغيلي (Ticker)', icon: Zap },
                  { id: 'showQuickActions', label: 'شريط أزرار الوصول السريع (Quick Actions)', icon: MousePointerClick },
                  { id: 'showStats', label: 'بطاقات الإحصائيات (الدخل، المنصرف، الأرباح)', icon: Activity },
                  { id: 'showAi', label: 'المساعد المالي Gemini (التحليل الذكي)', icon: FlaskConical },
                  { id: 'showCharts', label: 'الرسوم البيانية للأداء المالي', icon: CloudLightning },
                  { id: 'showGoals', label: 'بطاقة الأهداف الاستراتيجية والمتابعة', icon: Star },
                  { id: 'showSummary', label: 'نبض اليوم (ملخص المبيعات والمشتريات الحية)', icon: CheckCircle2 },
                ].map((item) => {
                  const isVisible = (branding.dashboardConfig as any)[item.id];
                  return (
                    <div 
                      key={item.id} 
                      onClick={() => toggleDashboardElement(item.id)}
                      className={cn(
                        "p-6 rounded-3xl border-2 transition-all cursor-pointer flex items-center justify-between group",
                        isVisible ? "border-primary bg-primary/5 shadow-md" : "border-border/50 bg-muted/20 grayscale opacity-60"
                      )}
                    >
                      <div className="flex items-center gap-4">
                        <div className={cn("h-12 w-12 rounded-2xl flex items-center justify-center", isVisible ? "bg-primary text-white" : "bg-muted text-muted-foreground")}>
                          <item.icon className="h-6 w-6" />
                        </div>
                        <span className="font-black text-sm">{item.label}</span>
                      </div>
                      {isVisible ? <Eye className="h-5 w-5 text-primary" /> : <EyeOff className="h-5 w-5 text-muted-foreground" />}
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="shortcuts" className="animate-in slide-in-from-bottom-2">
          <Card className="border shadow-xl bg-card rounded-[2.5rem] overflow-hidden border-blue-800/10">
            <CardHeader className="bg-muted/20 border-b p-8">
              <CardTitle className="text-xl flex items-center gap-2 font-black">
                <MousePointerClick className="h-5 w-5 text-primary" /> 
                إدارة أزرار الوصول السريع
              </CardTitle>
              <CardDescription className="font-bold">اختر العمليات التي تود إدراجها في شريط الاختصارات العلوي لتسهيل تجربة الموظف.</CardDescription>
            </CardHeader>
            <CardContent className="p-8">
              <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-4">
                {ALL_QUICK_ACTIONS.map((action) => {
                  const isEnabled = branding.enabledShortcuts.includes(action.id);
                  return (
                    <div 
                      key={action.id}
                      onClick={() => toggleShortcut(action.id)}
                      className={cn(
                        "p-5 rounded-[2rem] border-2 transition-all cursor-pointer flex items-center gap-4 group",
                        isEnabled ? "border-primary bg-primary/5 shadow-sm" : "border-border/50 opacity-40 grayscale"
                      )}
                    >
                      <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110", isEnabled ? "bg-primary/10 text-primary" : "bg-muted")}>
                        <action.icon className="h-5 w-5" />
                      </div>
                      <span className="font-black text-xs flex-1">{action.label}</span>
                      <Checkbox checked={isEnabled} onCheckedChange={() => toggleShortcut(action.id)} className="rounded-lg h-5 w-5" />
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="danger" className="space-y-6">
          <Card className="border-2 border-rose-500/20 shadow-xl bg-card rounded-[2.5rem] overflow-hidden">
            <CardHeader className="bg-rose-500/5 border-b p-6">
              <CardTitle className="text-lg font-black text-rose-600 flex items-center gap-2">أدوات الصيانة الحرجة</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid gap-4">
                <div className="flex items-center justify-between p-4 rounded-2xl bg-rose-500/5 border border-rose-500/10">
                  <div className="space-y-0.5">
                    <p className="text-sm font-black text-rose-700">تطهير الجلسة المحلية</p>
                    <p className="text-[10px] text-rose-600/70 font-bold">مسح بيانات تسجيل الدخول من هذا المتصفح.</p>
                  </div>
                  <Button variant="destructive" size="sm" onClick={() => { localStorage.removeItem("activeSystemUser"); toast({ title: "تم المسح" }) }} className="rounded-xl font-bold h-9">تنفيذ</Button>
                </div>
                <div className="flex items-center justify-between p-4 rounded-2xl bg-amber-500/5 border border-amber-500/10">
                  <div className="space-y-0.5">
                    <p className="text-sm font-black text-amber-700">محاكاة خطأ تقني</p>
                    <p className="text-[10px] text-amber-600/70 font-bold">اختبار واجهة الأخطاء (Error Boundary).</p>
                  </div>
                  <Button variant="outline" size="sm" className="rounded-xl font-bold h-9 border-amber-200 text-amber-700" onClick={() => { throw new Error("Developer Simulated Error") }}>محاكاة</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="mt-10 p-10 border-2 border-dashed rounded-[3rem] text-center space-y-4 bg-muted/10">
        <Code2 className="h-12 w-12 text-primary mx-auto opacity-20" />
        <div className="space-y-1">
          <p className="font-black text-muted-foreground">{branding.systemName} Architecture v{branding.systemVersion}</p>
          <p className="text-xs font-bold text-muted-foreground/60">تم تطويره لدقة المحاسبة الصيدلانية بالذكاء الاصطناعي.</p>
        </div>
      </div>
    </div>
  )
}
