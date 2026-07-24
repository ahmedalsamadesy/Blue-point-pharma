
"use client"

import { useState, useMemo, useEffect, useRef } from "react"
import { useUser, useDoc, useMemoFirebase, useFirestore, useCollection } from "@/firebase"
import { doc, collection } from "firebase/firestore"
import { 
  LayoutDashboard, 
  ShoppingCart, 
  ShoppingBag, 
  Truck, 
  Landmark, 
  UserRound, 
  Settings,
  Receipt,
  FileBarChart,
  ShieldCheck,
  Users,
  Sparkles,
  Package,
  Target,
  Trophy,
  BookOpen,
  ArrowRightLeft,
  Calendar,
  Megaphone,
  Boxes,
  Code2,
  ChevronDown,
  CircleDollarSign,
  PieChart,
  UserCog,
  HelpCircle,
  Activity,
  Pill,
  Stethoscope,
  PlusSquare,
  Star,
  HeartPulse,
  FlaskConical,
  BriefcaseMedical,
  ShieldAlert,
  ArrowUpRight,
  Hammer,
  History,
  Lock
} from "lucide-react"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { StatsCards } from "@/components/dashboard/stats-cards"
import { AIInsights } from "@/components/dashboard/ai-insights"
import { PerformanceChart } from "@/components/dashboard/performance-chart"
import { NewsTicker } from "@/components/dashboard/news-ticker"
import { DailySummary } from "@/components/dashboard/daily-summary"
import { QuickActions } from "@/components/dashboard/quick-actions"
import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu"

import { SalesSection } from "@/components/dashboard/sales-section"
import { EmployeesSection } from "@/components/dashboard/employees-section"
import { TreasurySection } from "@/components/dashboard/treasury-section"
import { SuppliersSection } from "@/components/dashboard/suppliers-section"
import { PurchasesSection } from "@/components/dashboard/purchases-section"
import { CashTransfersSection } from "@/components/dashboard/cash-transfers-section"
import { SettingsSection } from "@/components/dashboard/settings-section"
import { ExpensesSection } from "@/components/dashboard/expenses-section"
import { ReportsSection } from "@/components/dashboard/reports-section"
import { FinancialClosingSection } from "@/components/dashboard/financial-closing-section"
import { CustomersSection } from "@/components/dashboard/customers-section"
import { AuditLogsSection } from "@/components/dashboard/audit-logs-section"
import { InventorySection } from "@/components/dashboard/inventory-section"
import { BroadcastsSection } from "@/components/dashboard/broadcasts-section"
import { GoalsSection } from "@/components/dashboard/goals-section"
import { UserGuideSection } from "@/components/dashboard/user-guide-section"
import { InterBranchTransfersSection } from "@/components/dashboard/inter-branch-transfers-section"
import { APP_CONSTANTS } from "@/lib/constants"
import { calculateGlobalFinancialSnapshot } from "@/lib/financial-logic"
import { cn } from "@/lib/utils"

export default function DashboardSPA() {
  const { user } = useUser()
  const firestore = useFirestore()
  
  const [activeTab, setActiveTab] = useState("dashboard")
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [sysUser, setSysUser] = useState<any>(null)
  const [isStatsLoading, setIsStatsLoading] = useState(true)
  
  // تحسين الأداء: تتبع آخر عملية جلب لمنع التكرار المفرط
  const lastFetchRef = useRef<number>(0)

  const [dynamicStats, setDynamicStats] = useState({
    totalIncome: 0, totalExpenses: 0, supplierDebt: 0, customerDebt: 0, totalCash: 0,
    todayIncome: 0, todayExpenses: 0, todaySalesCount: 0, todayPurchasesCount: 0,
    chartData: [] as any[]
  })

  const settingsRef = useMemoFirebase(() => {
    if (!firestore || !user) return null
    return doc(firestore, "users", user.uid, "settings", "current")
  }, [firestore, user])
  const { data: settings } = useDoc(settingsRef)

  const employeesQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null
    return collection(firestore, "users", user.uid, "employees")
  }, [firestore, user])
  const { data: employees } = useCollection(employeesQuery)

  const suppliersQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null
    return collection(firestore, "users", user.uid, "suppliers")
  }, [firestore, user])
  const { data: suppliers } = useCollection(suppliersQuery)

  const inventoryQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null
    return collection(firestore, "users", user.uid, "inventory")
  }, [firestore, user])
  const { data: inventory } = useCollection(inventoryQuery)

  const calculateLiveStats = async (force = false) => {
    if (!firestore || !user) return
    
    // منع الجلب إذا تمت عملية جلب منذ أقل من 5 ثوانٍ، إلا في حالة الطلب الإجباري
    const now = Date.now()
    if (!force && now - lastFetchRef.current < 5000) return;
    
    lastFetchRef.current = now
    setIsStatsLoading(true)
    try {
      const opening = Number(settings?.openingTreasuryBalance) || 0
      const snapshot = await calculateGlobalFinancialSnapshot(firestore, user.uid, opening)
      setDynamicStats(snapshot)
    } catch (e) { 
      console.error("Stats Calculation Error:", e) 
    } finally {
      setIsStatsLoading(false)
    }
  }

  useEffect(() => {
    const saved = localStorage.getItem("activeSystemUser")
    if (saved) setSysUser(JSON.parse(saved))
    const handleSwitch = (e: any) => { setActiveTab(e.detail); window.scrollTo(0,0) }
    const handleRefresh = () => calculateLiveStats(true)
    window.addEventListener('switch-dashboard-tab', handleSwitch)
    window.addEventListener('refresh-stats', handleRefresh)
    return () => {
      window.removeEventListener('switch-dashboard-tab', handleSwitch)
      window.removeEventListener('refresh-stats', handleRefresh)
    }
  }, [])

  useEffect(() => { 
    if (activeTab === "dashboard") {
      calculateLiveStats() 
    }
  }, [activeTab, user, settings])

  const goalsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null
    return collection(firestore, "users", user.uid, "goals")
  }, [firestore, user])
  const { data: goals } = useCollection(goalsQuery)

  const topGoal = useMemo(() => {
    if (!goals) return null
    return goals.filter(g => g.status === 'active').sort((a,b) => new Date(a.endDate).getTime() - new Date(b.endDate).getTime())[0] || null
  }, [goals])

  const isMaintenanceMode = settings?.systemMode === APP_CONSTANTS.SYSTEM_MODES.MAINTENANCE;
  const isManager = sysUser?.role === 'admin';
  const isOwner = sysUser?.role === 'owner';

  const navGroups = useMemo(() => {
    const baseGroups = [
      {
        id: "finance_ops",
        label: "العمليات المالية",
        icon: CircleDollarSign,
        items: [
          { id: "sales", label: "المبيعات", icon: Receipt },
          { id: "purchases", label: "المشتريات", icon: ShoppingBag },
          { id: "expenses", label: "المصروفات", icon: Receipt },
          { id: "inventory", label: "المخزون", icon: Package },
          { id: "branch_transfers", label: "تبادل أدوية", icon: Boxes },
          { id: "transfers", label: "التحويلات النقدية", icon: ArrowRightLeft },
        ]
      },
      {
        id: "accounts",
        label: "الحسابات",
        icon: Users,
        items: [
          { id: "customers", label: "العملاء", icon: Users },
          { id: "suppliers", label: "الموردين", icon: Truck },
          { id: "treasury", label: "الخزينة", icon: Landmark },
        ]
      },
      {
        id: "analysis",
        label: "التقارير والتحليل",
        icon: PieChart,
        items: [
          { id: "reports", label: "التقارير", icon: FileBarChart },
          { id: "goals", label: "الأهداف", icon: Target },
          { id: "closing", label: "الحساب الختامي", icon: ShieldCheck },
          { id: "audit", label: "سجل الرقابة", icon: History },
        ]
      },
      {
        id: "management",
        label: "إدارة النظام",
        icon: UserCog,
        items: [
          { id: "employees", label: "الموظفين", icon: UserRound },
          { id: "broadcasts", label: "الأخبار", icon: Megaphone },
          { id: "settings", label: "الإعدادات", icon: Settings },
        ]
      },
      {
        id: "help",
        label: "المساعدة",
        icon: HelpCircle,
        items: [
          { id: "guide", label: "دليل المستخدم", icon: BookOpen },
        ]
      }
    ];

    let groups = baseGroups;

    if (isOwner) {
      groups = baseGroups.map(group => {
        if (group.id === 'management') {
          return {
            ...group,
            items: group.items.filter(i => i.id !== 'settings' && i.id !== 'employees')
          }
        }
        return group;
      }).filter(g => g.items.length > 0);
    }

    if (isMaintenanceMode && isManager) {
      groups = [
        {
          id: "maint_ops",
          label: "عمليات الصيانة والجرد",
          icon: Hammer,
          items: [
            { id: "inventory", label: "المخزون", icon: Package },
            { id: "customers", label: "العملاء", icon: Users },
            { id: "settings", label: "الإعدادات", icon: Settings },
          ]
        }
      ];
    }

    if (!isManager && !isOwner) {
      const userPerms = sysUser?.permissions || [];
      groups = groups.map(group => ({
        ...group,
        items: group.items.filter(item => userPerms.includes(item.id) || item.id === "guide")
      })).filter(group => group.items.length > 0);
    }

    return groups;
  }, [isMaintenanceMode, isManager, isOwner, sysUser]);

  const isTabPermitted = useMemo(() => {
    if (activeTab === "dashboard" || activeTab === "guide") return true;
    if (isManager || isOwner) return true;
    return sysUser?.permissions?.includes(activeTab);
  }, [activeTab, sysUser, isManager, isOwner]);

  useEffect(() => {
    if (isMaintenanceMode && isManager) {
      const allowed = ["inventory", "customers", "settings", "dashboard"];
      if (!allowed.includes(activeTab)) {
        setActiveTab("inventory");
      }
    }
  }, [isMaintenanceMode, isManager]);

  const handleQuickAction = (tabId: string) => {
    setActiveTab(tabId)
    window.scrollTo(0, 0)
  }

  const isGroupActive = (items: any[]) => items.some(item => item.id === activeTab)

  const DashboardIcon = useMemo(() => {
    const url = settings?.systemLogoUrl || "";
    if (url.startsWith('preset:')) {
      const id = url.split(':')[1];
      switch(id) {
        case 'pharmacy_cross': return PlusSquare;
        case 'pill': return Pill;
        case 'medical': return Stethoscope;
        case 'star_premium': return Star;
        case 'heart': return HeartPulse;
        case 'lab': return FlaskConical;
        case 'kit': return BriefcaseMedical;
        case 'delivery': return Truck;
        case 'secure': return ShieldCheck;
        default: return Activity;
      }
    }
    return Sparkles;
  }, [settings?.systemLogoUrl]);

  const filteredShortcuts = useMemo(() => {
    if (!settings?.enabledShortcuts) return [];
    if (isManager) return settings.enabledShortcuts;
    if (isOwner) return settings.enabledShortcuts;
    const userPerms = sysUser?.permissions || [];
    return settings.enabledShortcuts.filter((s: string) => userPerms.includes(s));
  }, [settings, sysUser, isManager, isOwner]);

  return (
    <div className="pb-10" dir="rtl">
      <div className="sticky top-[3.5rem] md:top-[4rem] z-40 bg-blue-50/95 dark:bg-slate-900/90 backdrop-blur-xl border-b border-primary/20 shadow-xl">
        {(settings?.dashboardConfig?.showMarquee !== false) && (
          <NewsTicker 
            stats={{ totalIncome: dynamicStats.totalIncome, totalExpenses: dynamicStats.totalExpenses, netProfit: dynamicStats.totalCash, totalDebt: dynamicStats.supplierDebt }} 
            pharmacyName={settings?.pharmacyName} 
            settings={settings}
            employees={employees || []}
            suppliers={suppliers || []}
            inventory={inventory || []}
          />
        )}
        <div className="w-full print:hidden">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <div className="flex items-center gap-1 p-2 md:p-3 overflow-x-auto scrollbar-hide">
              <TabsList className="bg-transparent h-auto p-0 flex gap-1 shrink-0">
                <TabsTrigger 
                  value="dashboard" 
                  onClick={() => setOpenMenuId(null)}
                  className="px-4 py-2.5 rounded-2xl data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-black text-[11px] md:text-[13px] transition-all duration-300"
                >
                  <LayoutDashboard className="h-4 w-4 ml-2" /> الرئيسية
                </TabsTrigger>
              </TabsList>

              {navGroups.map(group => (
                <DropdownMenu 
                  key={group.id} 
                  open={openMenuId === group.id} 
                  onOpenChange={(open) => setOpenMenuId(open ? group.id : null)}
                >
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="ghost" 
                      className={cn(
                        "h-auto px-4 py-2.5 rounded-2xl font-black text-[11px] md:text-[13px] transition-all duration-300 flex items-center gap-2",
                        isGroupActive(group.items) ? "bg-primary text-primary-foreground shadow-md" : "text-muted-foreground hover:bg-primary/10"
                      )}
                    >
                      <group.icon className="h-4 w-4" />
                      <span>{group.label}</span>
                      <ChevronDown className={cn("h-3 w-3 transition-transform", openMenuId === group.id ? "rotate-180" : "")} />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent 
                    align="start" 
                    className="rounded-3xl p-0 min-w-[220px] glass-card border-primary/10 font-bold shadow-2xl overflow-hidden z-[60]"
                  >
                    <div className="max-h-[50vh] md:max-h-[65vh] overflow-y-auto scrollbar-hide p-2 space-y-1">
                      {group.items.map(item => (
                        <DropdownMenuItem 
                          key={item.id} 
                          onClick={() => {
                            setActiveTab(item.id);
                            setOpenMenuId(null);
                          }}
                          className={cn(
                            "rounded-2xl cursor-pointer gap-3 p-3 transition-colors",
                            activeTab === item.id ? "bg-primary/10 text-primary" : "hover:bg-muted"
                          )}
                        >
                          <item.icon className="h-4 w-4" />
                          <span className="text-xs md:text-sm">{item.label}</span>
                        </DropdownMenuItem>
                      ))}
                    </div>
                  </DropdownMenuContent>
                </DropdownMenu>
              ))}
            </div>
          </Tabs>
        </div>
      </div>

      <div className="mt-6 px-4 md:px-8 max-w-[1600px] mx-auto space-y-6">
        {activeTab === "dashboard" && (
          <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-700">
            {isMaintenanceMode && (
              <Card className="border-2 border-dashed border-amber-500 bg-amber-500/5 rounded-[2rem] p-6 text-center space-y-2">
                <p className="text-amber-700 font-black flex items-center justify-center gap-2"><Hammer className="h-5 w-5" /> تنبيه: وضع الصيانة نشط</p>
                <p className="text-xs text-muted-foreground font-bold">يمكنك الآن فقط تحديث بيانات المخزون والعملاء أو العودة للوضع الطبيعي من الإعدادات.</p>
              </Card>
            )}

            {(settings?.dashboardConfig?.showWelcomeCard !== false) && (
              <Card className="border-none shadow-2xl glass-card rounded-[3rem] overflow-hidden relative border-blue-800/10 transition-all duration-500">
                <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-br from-primary/15 via-transparent to-transparent opacity-60 pointer-events-none" />
                <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-primary/10 rounded-full blur-[100px] animate-pulse pointer-events-none" />
                
                <CardContent className="p-8 md:p-16 relative z-10 flex flex-col min-h-[340px] justify-between">
                  <div className="flex flex-col md:flex-row-reverse items-center justify-start gap-8 md:gap-12">
                    {settings?.printLogoUrl ? (
                      <div className="relative group shrink-0">
                        <div className="absolute inset-0 bg-primary/10 blur-3xl rounded-full animate-pulse group-hover:bg-primary/20 transition-all" />
                        <div className="h-32 w-32 md:h-48 md:w-48 flex items-center justify-center relative overflow-hidden transition-transform duration-700 group-hover:scale-105">
                          <img 
                            src={settings.printLogoUrl} 
                            className="h-full w-full object-contain mix-blend-multiply dark:mix-blend-plus-lighter drop-shadow-[0_10px_20px_rgba(0,0,0,0.1)] animate-floating" 
                            alt="Pharmacy Logo" 
                          />
                        </div>
                      </div>
                    ) : settings?.systemLogoUrl && !settings.systemLogoUrl.startsWith('preset:') ? (
                      <div className="h-32 w-32 md:h-48 md:w-48 rounded-[2.5rem] bg-white shadow-xl flex items-center justify-center overflow-hidden border-4 border-primary/20 animate-floating">
                        <img src={settings.systemLogoUrl} className="h-full w-full object-cover" />
                      </div>
                    ) : (
                      <div className="h-32 w-32 md:h-48 md:w-48 rounded-[3rem] bg-gradient-to-br from-primary to-blue-600 shadow-2xl flex items-center justify-center border-4 border-white/20 animate-floating">
                        <DashboardIcon className="h-16 w-16 md:h-24 md:w-24 text-white" />
                      </div>
                    )}

                    <div className="text-center md:text-right space-y-4 max-w-2xl">
                      <div className="flex items-center justify-center md:justify-start gap-4">
                        <div className="h-12 w-12 md:h-16 md:w-16 rounded-[1.5rem] bg-primary text-white flex items-center justify-center shadow-2xl border-2 border-white/20">
                          <Sparkles className="h-6 w-6 md:h-9 md:w-9 animate-pulse" />
                        </div>
                        <h1 className="text-4xl md:text-7xl font-black text-foreground tracking-tighter drop-shadow-sm">
                          أهلاً {sysUser?.name?.split(' ')[0]} 👋
                        </h1>
                      </div>
                      <p className="text-muted-foreground font-bold text-lg md:text-2xl leading-relaxed opacity-90">
                        إليك النبض المالي لـ <span className="text-primary font-black underline decoration-primary/30 underline-offset-8 decoration-4">{settings?.pharmacyName || "BluePointPharma"}</span> المستخرج الآن من السحابة.
                      </p>
                    </div>
                  </div>

                  <div className="mt-12 flex flex-col md:flex-row items-center justify-between gap-6 border-t border-primary/10 pt-8 bg-gradient-to-l from-transparent to-white/5 rounded-b-[3rem]">
                    <div className="flex flex-col md:flex-row items-center gap-4">
                      <div className="flex items-center gap-3 text-muted-foreground/70 bg-white/10 px-5 py-2.5 rounded-2xl backdrop-blur-sm border border-white/10 shadow-sm group hover:border-primary/30 transition-all">
                        <Code2 className="h-4 w-4 text-primary group-hover:rotate-12 transition-transform" />
                        <span className="text-[11px] font-black uppercase tracking-[0.2em] font-english">
                          BluePoint Architecture v{APP_CONSTANTS.VERSION}
                        </span>
                      </div>
                    </div>
                    
                    <div className="text-center md:text-left space-y-1 bg-primary/5 px-6 py-3 rounded-2xl border border-primary/5 shadow-inner">
                      <p className="text-[12px] font-bold text-muted-foreground/80 uppercase tracking-widest">
                        تطوير وبرمجة: <span className="text-primary font-black ml-1">AHMED ALSAMADESY</span>
                      </p>
                      <p className="text-[10px] font-black text-primary/50 uppercase tracking-[0.3em]">
                        جميع الحقوق محفوظة © 2026 | النسخة الملكية المستقرة
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {!isMaintenanceMode && (settings?.dashboardConfig?.showQuickActions !== false) && (
              <QuickActions onAction={handleQuickAction} config={filteredShortcuts} />
            )}

            {!isMaintenanceMode && topGoal && (settings?.dashboardConfig?.showGoals !== false) && (
              <div className="p-6 md:p-10 glass-card rounded-[2.5rem] shadow-xl cursor-pointer group/goal border-blue-800/10 relative overflow-hidden transition-all hover:scale-[1.01]" onClick={() => setActiveTab("goals")}>
                <div className="absolute top-0 left-0 w-1 h-full bg-primary" />
                <div className="flex justify-between items-center mb-6">
                  <div className="flex items-center gap-4">
                    <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center text-3xl shadow-inner border border-primary/5 group-hover/goal:scale-110 transition-transform">{topGoal.emoji}</div>
                    <div>
                      <h3 className="font-black text-2xl group-hover/goal:text-primary transition-colors">{topGoal.title}</h3>
                      <p className="text-xs font-bold text-muted-foreground flex items-center gap-1.5 mt-1">
                        <Target className="h-3.5 w-3.5 text-primary" /> المستهدف المتابع حالياً
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-4xl font-black font-english text-primary drop-shadow-sm">
                      {Math.min(Math.round(((topGoal.currentValue || 0) / topGoal.targetValue) * 100), 100)}%
                    </span>
                  </div>
                </div>
                <Progress value={Math.min(Math.round(((topGoal.currentValue || 0) / topGoal.targetValue) * 100), 100)} className="h-4 rounded-full shadow-inner bg-muted/30" />
                <div className="flex justify-between mt-5 text-[12px] font-black text-muted-foreground uppercase tracking-wider">
                  <div className="flex items-center gap-2"><Trophy className="h-4 w-4 text-amber-500" /><span>المحقق: <span className="font-english text-foreground text-sm">{(topGoal.currentValue || 0).toLocaleString()}</span> {topGoal.unit}</span></div>
                  <div className="flex items-center gap-2"><Calendar className="h-4 w-4 text-primary/60" /><span>تاريخ الانتهاء: <span className="font-english text-foreground text-sm">{topGoal.endDate}</span></span></div>
                </div>
              </div>
            )}

            {!isMaintenanceMode && settings?.dashboardConfig?.showSummary !== false && (
              <DailySummary stats={{ income: dynamicStats.todayIncome, expenses: dynamicStats.todayExpenses, salesCount: dynamicStats.todaySalesCount, purchasesCount: dynamicStats.todayPurchasesCount }} />
            )}
            
            {settings?.dashboardConfig?.showStats !== false && (
              <StatsCards 
                income={dynamicStats.totalIncome} 
                expenses={dynamicStats.totalExpenses} 
                profit={dynamicStats.totalCash} 
                debt={dynamicStats.supplierDebt + dynamicStats.customerDebt} 
              />
            )}

            <div className="grid gap-6 lg:grid-cols-12">
              <div className={cn(settings?.dashboardConfig?.showAi === false ? "lg:col-span-12" : "lg:col-span-8")}>
                {settings?.dashboardConfig?.showCharts !== false && (
                  <div className="glass-card rounded-[2.5rem] p-3 glow-primary border-blue-800/10 shadow-2xl transition-all hover:shadow-primary/5 h-full">
                    <PerformanceChart data={dynamicStats.chartData} />
                  </div>
                )}
              </div>
              {settings?.dashboardConfig?.showAi !== false && (
                <div className="lg:col-span-4">
                  <AIInsights stats={{ totalIncome: dynamicStats.totalIncome, totalExpenses: dynamicStats.totalExpenses, netProfit: dynamicStats.totalCash }} />
                </div>
              )}
            </div>
          </div>
        )}

        <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
          {!isTabPermitted ? (
            <div className="flex items-center justify-center p-20">
              <Card className="max-w-md w-full border-rose-200 bg-rose-50/10 rounded-[2.5rem]">
                <CardContent className="p-10 text-center space-y-4">
                  <ShieldAlert className="h-16 w-16 text-rose-500 mx-auto animate-pulse" />
                  <h3 className="text-2xl font-black text-rose-600">وصول غير مصرح</h3>
                  <p className="text-sm font-bold text-muted-foreground leading-relaxed">
                    عذراً، ليس لديك صلاحية الوصول إلى هذا القسم. يرجى التواصل مع مدير النظام لتعديل صلاحيات حسابك.
                  </p>
                  <Button 
                    variant="outline" 
                    className="rounded-xl font-bold h-12 px-8 border-rose-200 text-rose-700 hover:bg-rose-50"
                    onClick={() => setActiveTab("dashboard")}
                  >
                    العودة للرئيسية
                  </Button>
                </CardContent>
              </Card>
            </div>
          ) : (
            <>
              {activeTab === "sales" && <SalesSection />}
              {activeTab === "expenses" && <ExpensesSection />}
              {activeTab === "inventory" && <InventorySection />}
              {activeTab === "branch_transfers" && <InterBranchTransfersSection />}
              {activeTab === "employees" && <EmployeesSection />}
              {activeTab === "treasury" && <TreasurySection />}
              {activeTab === "suppliers" && <SuppliersSection />}
              {activeTab === "customers" && <CustomersSection />}
              {activeTab === "purchases" && <PurchasesSection />}
              {activeTab === "transfers" && <CashTransfersSection />}
              {activeTab === "reports" && <ReportsSection />}
              {activeTab === "closing" && <FinancialClosingSection />}
              {activeTab === "audit" && <AuditLogsSection />}
              {activeTab === "settings" && <SettingsSection />}
              {activeTab === "broadcasts" && <BroadcastsSection />}
              {activeTab === "goals" && <GoalsSection />}
              {activeTab === "guide" && <UserGuideSection />}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
