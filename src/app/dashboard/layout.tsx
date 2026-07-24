
"use client"

import { Activity, LogOut, Loader2, Sun, Moon, Clock, Calendar, Users, ShieldAlert, Megaphone, Monitor, Hammer, RefreshCcw, ShieldCheck, Timer, PlusSquare, Pill, Stethoscope, Star, HeartPulse, FlaskConical, BriefcaseMedical, Truck, Phone, MapPin, UserCheck, Settings2, Store } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { useAuth, useUser, useDoc, useMemoFirebase, useFirestore } from "@/firebase"
import { useRouter } from "next/navigation"
import { useEffect, useState, useMemo } from "react"
import { signOut } from "firebase/auth"
import { doc } from "firebase/firestore"
import { UserGate } from "@/components/dashboard/user-gate"
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle,
  AlertDialogTrigger
} from "@/components/ui/alert-dialog"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useToast } from "@/hooks/use-toast"
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu"
import { updateDocumentNonBlocking } from "@/firebase/non-blocking-updates"
import { APP_CONSTANTS } from "@/lib/constants"
import { cn } from "@/lib/utils"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const auth = useAuth()
  const firestore = useFirestore()
  const { user, isUserLoading } = useUser()
  const router = useRouter()
  const { toast } = useToast()
  
  const [currentTime, setCurrentTime] = useState<Date | null>(null)
  const [activeSysUser, setActiveSysUser] = useState<any>(null)

  useEffect(() => {
    setCurrentTime(new Date())
    const timer = setInterval(() => setCurrentTime(new Date()), 60000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    const checkUser = () => {
      try {
        const saved = localStorage.getItem("activeSystemUser")
        if (saved) {
          setActiveSysUser(JSON.parse(saved))
        } else {
          setActiveSysUser(null)
        }
      } catch (error) {
        console.error("Failed to parse system user from storage", error)
        setActiveSysUser(null)
      }
    }
    
    checkUser()
    window.addEventListener('storage', checkUser)
    return () => window.removeEventListener('storage', checkUser)
  }, [])

  const settingsRef = useMemoFirebase(() => {
    if (!firestore || !user) return null
    return doc(firestore, "users", user.uid, "settings", "current")
  }, [firestore, user])
  
  const { data: settings } = useDoc(settingsRef)

  const isAdmin = activeSysUser?.role === 'admin' || activeSysUser?.role === 'owner';

  useEffect(() => {
    if (!settings) return;

    if (settings.primaryColor) {
      document.documentElement.style.setProperty('--primary', hexToHsl(settings.primaryColor));
    }

    const applyTheme = () => {
      let isDark = false;
      if (settings.themeMode === 'dark') {
        isDark = true;
      } else if (settings.themeMode === 'auto') {
        const hour = new Date().getHours();
        isDark = hour >= 18 || hour < 6;
      }

      if (isDark) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    };

    applyTheme();
    
    let interval: any;
    if (settings.themeMode === 'auto') {
      interval = setInterval(applyTheme, 60000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [settings]);

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/')
    }
  }, [user, isUserLoading, router])

  const handleThemeChange = (newMode: string) => {
    if (!firestore || !user || !settingsRef) return
    updateDocumentNonBlocking(settingsRef, { 
      themeMode: newMode,
      updatedAt: new Date().toISOString()
    })
    toast({ 
      title: "تم تغيير السمة", 
      description: `تم التحويل إلى الوضع ${newMode === 'dark' ? 'الداكن' : newMode === 'light' ? 'الفاتح' : 'التلقائي'}.`
    })
  }

  const handleLockScreen = () => {
    localStorage.removeItem("activeSystemUser")
    window.location.reload() 
  }

  const handleFullSignOut = async () => {
    localStorage.removeItem("activeSystemUser")
    if (auth) {
      await signOut(auth)
      router.push('/')
    }
  }

  const handleBroadcastClick = () => {
    window.dispatchEvent(new CustomEvent('switch-dashboard-tab', { detail: 'broadcasts' }))
  }

  const restoreNormalMode = () => {
    if (!settingsRef) return
    updateDocumentNonBlocking(settingsRef, { systemMode: 'normal', modeExpectedEndTime: "", updatedAt: new Date().toISOString() })
    toast({ title: "تمت استعادة الوضع العادي" })
  }

  function hexToHsl(hex: string) {
    let r = 0, g = 0, b = 0;
    if (hex.length === 4) {
      r = parseInt(hex[1] + hex[1], 16);
      g = parseInt(hex[2] + hex[2], 16);
      b = parseInt(hex[3] + hex[3], 16);
    } else if (hex.length === 7) {
      r = parseInt(hex.substring(1, 3), 16);
      g = parseInt(hex.substring(3, 5), 16);
      b = parseInt(hex.substring(5, 7), 16);
    }
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0, s, l = (max + min) / 2;
    if (max === min) { h = s = 0; }
    else {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
      }
      h /= 6;
    }
    return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
  }

  const LogoComponent = useMemo(() => {
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
    return null;
  }, [settings?.systemLogoUrl]);

  if (isUserLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-10 w-10 text-primary animate-spin" />
      </div>
    )
  }

  if (!user) return null

  const renderBlockScreen = (mode: 'update' | 'maintenance') => {
    const isUpdate = mode === 'update';
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 text-center overflow-y-auto" dir="rtl">
        <div className="max-w-2xl w-full space-y-10 animate-in zoom-in duration-500 py-10">
          <div className="relative">
            <div className={cn("absolute inset-0 blur-[100px] rounded-full animate-pulse opacity-20", isUpdate ? "bg-rose-500" : "bg-amber-500")} />
            <div className={cn("h-32 w-32 rounded-[2.5rem] flex items-center justify-center mx-auto shadow-2xl relative z-10 border-4 border-white/10", isUpdate ? "bg-rose-600" : "bg-amber-600")}>
              {isUpdate ? <RefreshCcw className="h-16 w-16 text-white animate-spin" /> : <Hammer className="h-16 w-16 text-white" />}
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex flex-col items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40">Powered by BluePoint Architecture</span>
              <h1 className="text-4xl md:text-6xl font-black text-white tracking-tighter">
                {isUpdate ? "النظام قيد التحديث" : "النظام في وضع الصيانة"}
              </h1>
            </div>
            <p className="text-slate-400 font-bold text-lg max-w-lg mx-auto leading-relaxed">
              {isUpdate 
                ? "نحن نقوم حالياً بترقية خوادم السحابة وتحسين أداء المحرك المالي لضمان أعلى درجات الدقة." 
                : "يتم الآن إجراء عمليات جرد وتدقيق مالي دورية، العمليات المالية معطلة مؤقتاً لضمان نزاهة الأرصدة."}
            </p>
          </div>

          <Card className="bg-white/5 border-white/10 rounded-[3rem] p-8 md:p-12 overflow-hidden relative shadow-2xl">
            <div className="grid gap-8 md:grid-cols-2 text-right">
              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-2xl bg-white/10 flex items-center justify-center text-white"><Store className="h-6 w-6" /></div>
                  <div><p className="text-[10px] font-black text-white/40 uppercase">الصيدلية</p><p className="text-xl font-black text-white">{settings?.pharmacyName || "صيدلية النقطة الزرقاء"}</p></div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-2xl bg-white/10 flex items-center justify-center text-white"><UserCheck className="h-6 w-6" /></div>
                  <div><p className="text-[10px] font-black text-white/40 uppercase">المدير المسؤول</p><p className="text-xl font-black text-white">{settings?.managingDirector || "---"}</p></div>
                </div>
              </div>
              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-2xl bg-white/10 flex items-center justify-center text-white"><Phone className="h-6 w-6" /></div>
                  <div><p className="text-[10px] font-black text-white/40 uppercase">للتواصل الطارئ</p><p className="text-xl font-black text-white font-english">{settings?.phone || "---"}</p></div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-2xl bg-white/10 flex items-center justify-center text-white"><MapPin className="h-6 w-6" /></div>
                  <div><p className="text-[10px] font-black text-white/40 uppercase">الموقع</p><p className="text-sm font-bold text-white leading-tight">{settings?.address || "---"}</p></div>
                </div>
              </div>
            </div>

            {settings?.modeExpectedEndTime && (
              <div className={cn("mt-10 p-5 rounded-2xl inline-flex items-center gap-4 border shadow-inner w-full justify-center", isUpdate ? "bg-rose-500/10 border-rose-500/20 text-rose-500" : "bg-amber-500/10 border-amber-500/20 text-amber-500")}>
                <Timer className="h-6 w-6 animate-pulse" />
                <span className="text-sm font-black uppercase tracking-widest">الوقت المتوقع للعودة: {settings.modeExpectedEndTime}</span>
              </div>
            )}
          </Card>

          {isAdmin && (
            <div className="pt-6 border-t border-white/5 flex flex-col items-center gap-4">
              <p className="text-[10px] font-black text-white/30 uppercase">صلاحيات سيادية مكتشفة للمدير</p>
              <Button onClick={restoreNormalMode} className="bg-white/5 hover:bg-white/10 text-white rounded-2xl gap-3 font-black h-14 px-10 border border-white/10 transition-all">
                <ShieldCheck className="h-5 w-5 text-emerald-500" /> استعادة التحكم الكامل (Normal Mode)
              </Button>
            </div>
          )}
        </div>
      </div>
    )
  }

  if (settings?.systemMode === APP_CONSTANTS.SYSTEM_MODES.UPDATE) {
    return renderBlockScreen('update');
  }

  if (settings?.systemMode === APP_CONSTANTS.SYSTEM_MODES.MAINTENANCE && !isAdmin) {
    return renderBlockScreen('maintenance');
  }

  return (
    <UserGate>
      <div className="min-h-screen bg-background relative flex flex-col transition-colors duration-300" dir="rtl">
        {settings?.systemMode === APP_CONSTANTS.SYSTEM_MODES.MAINTENANCE && (
          <div className="bg-amber-500 text-slate-950 py-2 px-4 text-center text-[10px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-3 relative z-[60] shadow-lg">
            <Hammer className="h-4 w-4 animate-bounce" />
            النظام في وضع الصيانة السيادية - الوصول مقتصر على الجرد والتدقيق للمدير فقط
            {settings?.modeExpectedEndTime && (
              <span className="bg-slate-950/10 px-3 py-0.5 rounded-full border border-slate-950/20">
                (موعد الانتهاء: {settings.modeExpectedEndTime})
              </span>
            )}
            <Hammer className="h-4 w-4 animate-bounce" />
          </div>
        )}

        <div className="fixed inset-0 pointer-events-none opacity-[0.03] dark:opacity-[0.07] overflow-hidden z-0 print:hidden">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-primary blur-[120px] animate-pulse" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-blue-400 blur-[120px] animate-pulse delay-1000" />
        </div>

        <header className="sticky top-0 z-50 w-full bg-blue-50/90 dark:bg-slate-950/80 backdrop-blur-xl border-b border-primary/20 shadow-lg glow-primary print:hidden">
          <div className="max-w-[1600px] mx-auto px-4 md:px-6 h-14 md:h-16 flex items-center justify-between">
            <div className="flex items-center gap-2 md:gap-3 shrink-0">
              <div className="flex h-9 w-9 md:h-10 md:w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-blue-600 text-white shadow-xl shadow-primary/20 overflow-hidden border-[3px] border-blue-800">
                {settings?.systemLogoUrl ? (
                  settings.systemLogoUrl.startsWith('preset:') ? (
                    LogoComponent && <LogoComponent className="h-5 w-5 md:h-6 md:w-6" />
                  ) : (
                    <img src={settings.systemLogoUrl} className="h-full w-full object-cover" alt="App Logo" />
                  )
                ) : (
                  <Activity className="h-5 w-5 md:h-6 md:w-6" />
                )}
              </div>
              <div className="flex flex-col">
                <span className="font-headline text-sm md:text-xl font-black text-foreground leading-none tracking-tight">
                  {settings?.systemName || "BluePointPharma"}
                </span>
                <span className="text-[9px] md:text-[10px] font-bold text-primary/80 mt-0.5 truncate max-w-[100px] md:max-w-none">
                  {settings?.pharmacyName || "صيدلية النقطة الزرقاء"}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5 md:gap-3 shrink-0">
              <div className="hidden sm:flex items-center gap-3 px-4 py-1.5 bg-white/50 dark:bg-white/5 rounded-full border border-primary/10 transition-all">
                <div className="flex items-center gap-1.5 border-l border-primary/10 dark:border-white/10 pl-3">
                  <Clock className="h-3.5 w-3.5 text-primary" />
                  <span className="text-[12px] font-english font-black text-foreground">
                    {currentTime ? currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }) : "--:--"}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-primary/60" />
                  <span className="text-[11px] font-bold text-muted-foreground whitespace-nowrap">
                    {currentTime ? currentTime.toLocaleDateString('ar-EG', { day: 'numeric', month: 'short', year: 'numeric' }) : "---"}
                  </span>
                </div>
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-xl text-foreground/70 hover:bg-primary/10 h-9 w-9 md:h-10 md:w-10">
                    <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                    <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                    <span className="sr-only">تبديل السمة</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="rounded-2xl font-bold p-2 min-w-[120px] glass-card border-primary/10">
                  <DropdownMenuItem onClick={() => handleThemeChange('light')} className="rounded-xl cursor-pointer gap-2">
                    <Sun className="h-4 w-4 text-amber-500" />
                    <span>وضع فاتح</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleThemeChange('dark')} className="rounded-xl cursor-pointer gap-2">
                    <Moon className="h-4 w-4 text-blue-500" />
                    <span>وضع داكن</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleThemeChange('auto')} className="rounded-xl cursor-pointer gap-2">
                    <Monitor className="h-4 w-4 text-primary" />
                    <span>تلقائي</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Button 
                variant="ghost" 
                size="icon" 
                className="rounded-xl text-amber-500 hover:bg-amber-500/10 h-9 w-9 md:h-10 md:w-10 group"
                onClick={handleBroadcastClick}
                title="إدارة الأخبار والإشعارات"
              >
                <Megaphone className="h-5 w-5 transition-transform group-hover:scale-110" />
              </Button>

              <div className="h-6 w-px bg-border/50 mx-0.5 md:mx-1" />

              <div className="hidden md:flex flex-col items-end px-2">
                <span className="text-[11px] font-black text-foreground leading-tight truncate max-w-[120px]">{activeSysUser?.name || "مستخدم"}</span>
                <span className="text-[9px] font-bold text-primary/70 uppercase tracking-widest">
                  {activeSysUser?.role === 'admin' ? 'مدير النظام' : activeSysUser?.role === 'owner' ? 'صاحب صيدلية' : 'موظف'}
                </span>
              </div>
              
              <Avatar className="h-9 w-9 md:h-10 md:w-10 rounded-xl border border-primary/10 shadow-sm overflow-hidden bg-muted transition-transform active:scale-95">
                <AvatarImage 
                  src={activeSysUser?.photoUrl} 
                  alt={activeSysUser?.name} 
                  className="object-cover" 
                />
                <AvatarFallback className="bg-primary/10 text-primary font-black text-[10px] md:text-xs">
                  {activeSysUser?.name?.substring(0, 2) || "BP"}
                </AvatarFallback>
              </Avatar>
              
              <Button 
                variant="ghost" 
                size="icon" 
                className="rounded-xl text-primary hover:bg-primary/10 h-9 w-9" 
                onClick={handleLockScreen} 
                title="قفل الشاشة"
              >
                <Users className="h-5 w-5" />
              </Button>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="rounded-xl text-rose-500 hover:bg-rose-500/10 h-9 w-9" 
                    title="فصل الجهاز"
                  >
                    <LogOut className="h-5 w-5" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="text-right glass-card rounded-[2.5rem]" dir="rtl">
                  <AlertDialogHeader>
                    <AlertDialogTitle className="text-2xl font-black flex items-center gap-3 text-rose-500">
                      <ShieldAlert className="h-8 w-8" />
                      تنبيه أمان سحابي
                    </AlertDialogTitle>
                    <AlertDialogDescription className="text-base leading-relaxed mt-2">
                      أنت على وشك "فصل الجهاز" من الصيدلية سحابياً. سيتم تسجيل الخروج من حساب Google وإلغاء صلاحية الوصول الحالية لهذا المتصفح.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter className="gap-3 mt-6">
                    <AlertDialogAction 
                      onClick={handleFullSignOut}
                      className="bg-rose-600 hover:bg-rose-700 text-white flex-1 font-black h-12 rounded-2xl shadow-lg"
                    >
                      تأكيد الفصل
                    </AlertDialogAction>
                    <AlertDialogCancel className="flex-1 font-bold h-12 rounded-2xl border-primary/20">إلغاء</AlertDialogCancel>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </header>

        <main className="flex-1 w-full max-w-[1600px] mx-auto z-10 print:m-0 print:p-0 print:max-w-none">
          {children}
        </main>
      </div>
    </UserGate>
  )
}
