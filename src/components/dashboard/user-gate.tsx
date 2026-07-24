
"use client"

import { useState, useEffect, useMemo } from "react"
import { useFirestore, useUser, useCollection, useMemoFirebase, useDoc } from "@/firebase"
import { collection, doc, setDoc } from "firebase/firestore"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, KeyRound, UserCircle2, ShieldCheck, LogOut, UserPlus, Sparkles, Activity, PlusSquare, Pill, Stethoscope, Star, HeartPulse, FlaskConical, BriefcaseMedical, Truck } from "lucide-react"
import { useAuth } from "@/firebase"
import { signOut } from "firebase/auth"
import { useRouter } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { APP_CONSTANTS } from "@/lib/constants"

export function UserGate({ children }: UserGateProps) {
  const { user, isUserLoading } = useUser()
  const firestore = useFirestore()
  const auth = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  
  const [activeSystemUser, setActiveSystemUser] = useState<any>(null)
  const [selectedUser, setSelectedUser] = useState<any>(null)
  const [pin, setPin] = useState("")
  const [error, setError] = useState("")
  const [isInitializing, setIsInitializing] = useState(true)
  const [isBootstrapping, setIsBootstrapping] = useState(false)

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

  useEffect(() => {
    const savedUser = localStorage.getItem("activeSystemUser")
    if (savedUser) {
      try {
        setActiveSystemUser(JSON.parse(savedUser))
      } catch (e) {
        localStorage.removeItem("activeSystemUser")
      }
    }
    setIsInitializing(false)
  }, [])

  const handleLogin = () => {
    if (!selectedUser) return
    if (selectedUser.pinCode === pin) {
      setActiveSystemUser(selectedUser)
      try {
        localStorage.setItem("activeSystemUser", JSON.stringify(selectedUser))
      } catch (e) {
        toast({ variant: "destructive", title: "خطأ في الجلسة" })
      }
      setError("")
      setPin("")
    } else {
      setError("رمز PIN غير صحيح، حاول مجدداً.")
      setPin("")
    }
  }

  const handleFullLogout = async () => {
    localStorage.removeItem("activeSystemUser")
    setActiveSystemUser(null)
    if (auth) {
      await signOut(auth)
      router.push("/")
    }
  }

  const handleSwitchUser = () => {
    localStorage.removeItem("activeSystemUser")
    setActiveSystemUser(null)
    setSelectedUser(null)
    setPin("")
  }

  const handleCreateFirstAdmin = async () => {
    if (!firestore || !user) return
    setIsBootstrapping(true)
    try {
      const batchTime = new Date().toISOString()
      
      const settingsRef = doc(firestore, "users", user.uid, "settings", "current")
      await setDoc(settingsRef, {
        pharmacyName: "صيدلية النقطة الزرقاء",
        currency: "ج.م",
        openingTime: "08:00",
        closingTime: "23:00",
        operationMode: "auto",
        decimalPlaces: 2,
        maxDebtLimit: 10000,
        taxRate: 0,
        maxDiscountRate: 5,
        minCashThreshold: 500,
        maxShiftDiscrepancy: 10,
        supplierWarningDays: 3,
        primaryColor: "#3b82f6",
        themeMode: "auto",
        createdAt: batchTime,
        updatedAt: batchTime,
        openingTreasuryBalance: 0,
        systemMode: "normal"
      })

      const incomeCats = ["توريد مبيعات الشفت", "تحصيلات عملاء آجلة", "إيرادات خدمات أخرى"]
      for (const cat of incomeCats) {
        const catRef = doc(collection(firestore, "users", user.uid, "incomeCategories"))
        await setDoc(catRef, { id: catRef.id, name: cat, createdAt: batchTime })
      }

      const expenseCats = ["مشتريات وفواتير شركات", "سداد مديونية موردين", "رواتب موظفين", "مصروفات عامة", "تحويلات بنكية"]
      for (const cat of expenseCats) {
        const catRef = doc(collection(firestore, "users", user.uid, "expenseCategories"))
        await setDoc(catRef, { id: catRef.id, name: cat, createdAt: batchTime })
      }

      const newUserRef = doc(collection(firestore, "users", user.uid, "systemUsers"))
      const adminData = {
        id: newUserRef.id,
        name: "مدير النظام",
        role: "admin",
        pinCode: "1234",
        isActive: true,
        permissions: ["*"],
        createdAt: batchTime,
        updatedAt: batchTime
      }
      await setDoc(newUserRef, adminData)

      toast({
        title: "تم تهيئة النظام بنجاح",
        description: "رمز الدخول الافتراضي للمدير هو: 1234 (يرجى تغييره فوراً).",
      })
    } catch (e: any) {
      toast({ variant: "destructive", title: "خطأ في التهيئة", description: "فشل إعداد قاعدة البيانات." })
    } finally {
      setIsBootstrapping(false)
    }
  }

  const GateLogo = useMemo(() => {
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

  if (isUserLoading || isInitializing || isUsersLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 text-primary animate-spin" />
          <p className="text-xs font-bold text-muted-foreground animate-pulse">جاري التحقق من السحابة...</p>
        </div>
      </div>
    )
  }

  if (!activeSystemUser) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 selection:bg-primary/20" dir="rtl">
        <div className="mb-8 text-center space-y-2 animate-in fade-in zoom-in duration-700">
          <div className="flex h-20 w-20 items-center justify-center rounded-[2rem] bg-primary text-white mx-auto shadow-2xl shadow-primary/20 rotate-3 border-[4px] border-blue-800 overflow-hidden">
            {settings?.systemLogoUrl ? (
              settings.systemLogoUrl.startsWith('preset:') ? (
                GateLogo && <GateLogo className="h-12 w-12" />
              ) : (
                <img src={settings.systemLogoUrl} className="h-full w-full object-cover" alt="Logo" />
              )
            ) : (
              <Activity className="h-12 w-12" />
            )}
          </div>
          <h1 className="text-3xl font-black text-foreground tracking-tight">BluePointPharma</h1>
          <p className="text-muted-foreground font-bold">بوابة دخول المستخدمين المعتمدة</p>
        </div>

        <Card className="w-full max-w-md border-none shadow-[0_0_50px_rgba(0,0,0,0.1)] bg-card rounded-[3rem] overflow-hidden">
          <div className="h-2 bg-gradient-to-r from-primary via-blue-400 to-primary w-full" />
          <CardHeader className="pb-4 text-center">
            <CardTitle className="text-2xl font-black flex items-center justify-center gap-3">
              <KeyRound className="h-6 w-6 text-primary" />
              {selectedUser ? `أهلاً ${selectedUser.name}` : "من أنت؟"}
            </CardTitle>
            {!selectedUser && <CardDescription className="font-bold">اختر هويتك للمتابعة إلى لوحة التحكم.</CardDescription>}
          </CardHeader>
          <CardContent className="space-y-6 p-8">
            {!selectedUser ? (
              <div className="grid gap-3">
                {systemUsers && systemUsers.length > 0 ? (
                  systemUsers.map((u) => (
                    <Button 
                      key={u.id} 
                      variant="outline" 
                      className="h-24 rounded-[2rem] justify-between px-6 border-border/50 hover:border-primary hover:bg-primary/[0.02] transition-all group"
                      onClick={() => setSelectedUser(u)}
                    >
                      <div className="flex items-center gap-4">
                        <Avatar className="h-14 w-14 rounded-2xl border-2 border-primary/5 overflow-hidden shadow-sm group-hover:scale-105 transition-transform">
                          <AvatarImage src={u.photoUrl} alt={u.name} className="object-cover" />
                          <AvatarFallback className="bg-muted text-muted-foreground">
                            <UserCircle2 className="h-8 w-8" />
                          </AvatarFallback>
                        </Avatar>
                        <div className="text-right">
                          <p className="font-black text-foreground text-xl truncate max-w-[150px]">{u.name}</p>
                          <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">{u.role === 'admin' ? 'مدير نظام' : 'موظف'}</p>
                        </div>
                      </div>
                      <Badge variant="secondary" className="px-4 py-1 rounded-xl bg-primary/10 text-primary font-black text-[10px]">
                        دخول
                      </Badge>
                    </Button>
                  ))
                ) : (
                  <div className="py-6 text-center space-y-6">
                    <div className="p-8 bg-primary/5 rounded-[2.5rem] border border-dashed border-primary/20 space-y-4">
                      <Sparkles className="h-12 w-12 text-primary mx-auto animate-pulse" />
                      <p className="font-bold text-sm text-muted-foreground leading-relaxed">أهلاً بك في نظام BluePointPharma. سنقوم بتهيئة قاعدة البيانات بالعملة المصرية والبنود الأساسية للبدء فوراً.</p>
                    </div>
                    <Button 
                      onClick={handleCreateFirstAdmin} 
                      disabled={isBootstrapping}
                      className="w-full h-16 rounded-[2rem] font-black text-xl gap-2 shadow-xl shadow-primary/20"
                    >
                      {isBootstrapping ? <Loader2 className="h-6 w-6 animate-spin" /> : <UserPlus className="h-6 w-6" />}
                      بدء تهيئة النظام (ج.م)
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-8 animate-in slide-in-from-bottom-4">
                <div className="flex justify-center flex-col items-center gap-6">
                  <Avatar className="h-32 w-32 rounded-[2.5rem] border-[4px] border-blue-800 shadow-2xl overflow-hidden group">
                    <AvatarImage src={selectedUser.photoUrl} alt={selectedUser.name} className="object-cover" />
                    <AvatarFallback className="bg-muted text-primary text-4xl font-black">
                      {selectedUser.name.substring(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="space-y-3 text-center w-full">
                    <Label className="font-black text-sm text-muted-foreground uppercase tracking-widest">أدخل رمز الدخول الآمن</Label>
                    <Input 
                      type="password" 
                      autoFocus
                      maxLength={6}
                      value={pin}
                      onChange={(e) => setPin(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                      placeholder="****"
                      className="h-24 text-center text-5xl font-english tracking-[0.5em] rounded-[2.5rem] bg-muted/50 border-none focus:ring-4 focus:ring-primary/10 shadow-inner"
                    />
                  </div>
                  {error && (
                    <div className="bg-rose-500/10 text-rose-600 px-6 py-2.5 rounded-2xl text-xs font-black animate-bounce border border-rose-500/20">
                      {error}
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Button onClick={handleLogin} className="h-16 rounded-[2rem] font-black text-xl bg-primary shadow-xl shadow-primary/20 transition-all hover:scale-105 active:scale-95">دخول</Button>
                  <Button variant="outline" onClick={handleSwitchUser} className="h-16 rounded-[2rem] font-bold border-2 transition-all">تبديل الحساب</Button>
                </div>
              </div>
            )}
          </CardContent>
          <div className="p-8 border-t bg-muted/20 text-center">
            <Button variant="link" onClick={handleFullLogout} className="text-muted-foreground text-[11px] gap-2 hover:text-destructive font-black uppercase tracking-tighter">
              <LogOut className="h-3.5 w-3.5" /> تسجيل خروج نهائي وفصل هذا الجهاز
            </Button>
          </div>
        </Card>
        
        <p className="mt-8 text-muted-foreground text-[10px] font-black uppercase tracking-[0.3em] opacity-40">
          BluePointPharma Cloud Security v{APP_CONSTANTS.VERSION}
        </p>
      </div>
    )
  }

  return <>{children}</>
}

interface UserGateProps {
  children: React.ReactNode
}
