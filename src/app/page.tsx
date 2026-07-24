
"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useUser, useAuth, useFirestore } from "@/firebase"
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail } from "firebase/auth"
import { doc, setDoc } from "firebase/firestore"
import { Loader2, Activity, Mail, Lock, LogIn, UserPlus, ShieldCheck, KeyRound, ArrowRight, AlertCircle } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { APP_CONSTANTS } from "@/lib/constants"

export default function RootPage() {
  const router = useRouter()
  const { user, isUserLoading } = useUser()
  const auth = useAuth()
  const firestore = useFirestore()
  const { toast } = useToast()

  const [mode, setMode] = useState<"login" | "register" | "reset">("login")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!isUserLoading && user) {
      router.push('/dashboard')
    }
  }, [user, isUserLoading, router])

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!auth || !email) return

    setLoading(true)
    try {
      if (mode === "login") {
        if (!password) return
        await signInWithEmailAndPassword(auth, email, password)
        toast({ title: "تم الدخول بنجاح", description: "جاري تحميل بيانات الصيدلية..." })
      } else if (mode === "register") {
        if (!password || !firestore) return
        const userCredential = await createUserWithEmailAndPassword(auth, email, password)
        
        const userRef = doc(firestore, "users", userCredential.user.uid)
        await setDoc(userRef, {
          id: userCredential.user.uid,
          email: email,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        })
        
        toast({ title: "تم إنشاء الحساب", description: "مرحباً بك في BluePointPharma" })
      } else if (mode === "reset") {
        await sendPasswordResetEmail(auth, email)
        toast({ 
          title: "تم إرسال الرابط بنجاح", 
          description: "يرجى فحص بريدك الإلكتروني (وصندوق الرسائل غير المرغوب فيها) لإعادة تعيين كلمة السر." 
        })
        setMode("login")
      }
      
      if (mode !== "reset") {
        router.push('/dashboard')
      }
    } catch (error: any) {
      console.error("Auth error:", error)
      let message = "فشل الاتصال بالسحابة"
      if (error.code === "auth/user-not-found") message = "هذا الحساب غير مسجل"
      if (error.code === "auth/wrong-password") message = "كلمة المرور غير صحيحة"
      if (error.code === "auth/email-already-in-use") message = "هذا البريد مسجل مسبقاً"
      if (error.code === "auth/invalid-credential") message = "بيانات الدخول غير صحيحة"
      if (error.code === "auth/too-many-requests") message = "محاولات كثيرة خاطئة، يرجى المحاولة لاحقاً"
      
      toast({ variant: "destructive", title: "خطأ في العملية", description: message })
    } finally {
      setLoading(false)
    }
  }

  if (isUserLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center p-4 selection:bg-primary/30" dir="rtl">
      <div className="mb-8 text-center space-y-4 animate-in fade-in zoom-in duration-700">
        <div className="flex h-20 w-20 items-center justify-center rounded-[2rem] bg-primary text-white mx-auto shadow-2xl shadow-primary/20 rotate-3 border-[4px] border-blue-800">
          <Activity className="h-12 w-12" />
        </div>
        <div className="space-y-1">
          <h1 className="text-4xl font-black text-white tracking-tight">BluePointPharma</h1>
          <p className="text-muted-foreground font-bold">نظام الإدارة المالية السحابي المحمي</p>
        </div>
      </div>

      <Card className="w-full max-w-md border-none shadow-[0_0_50px_rgba(0,0,0,0.5)] bg-[#141414] rounded-[2.5rem] overflow-hidden">
        <div className="h-2 bg-gradient-to-r from-primary via-blue-400 to-primary w-full" />
        <CardHeader className="space-y-1 pb-6">
          <CardTitle className="text-2xl font-bold text-white text-right">
            {mode === "login" ? "تسجيل الدخول" : mode === "register" ? "إنشاء حساب جديد" : "استعادة كلمة السر"}
          </CardTitle>
          <CardDescription className="text-right">
            {mode === "login" ? "أدخل بيانات حسابك للمزامنة بين الأجهزة" : mode === "register" ? "ابدأ بتأمين بيانات صيدليتك على السحابة" : "أدخل بريدك الإلكتروني لإرسال رابط تعيين كلمة السر"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAuth} className="space-y-5">
            <div className="space-y-2">
              <Label className="text-white">البريد الإلكتروني للصيدلية</Label>
              <div className="relative">
                <Input 
                  type="email" 
                  placeholder="name@pharmacy.com" 
                  className="h-12 bg-white/5 border-white/10 text-white pr-10 text-right font-english focus:ring-primary/50" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
                <Mail className="absolute right-3 top-3.5 h-5 w-5 text-muted-foreground" />
              </div>
            </div>
            
            {mode !== "reset" && (
              <div className="space-y-2">
                <div className="flex justify-between items-center px-1">
                  <Label className="text-white">كلمة المرور</Label>
                  {mode === "login" && (
                    <button 
                      type="button"
                      onClick={() => setMode("reset")}
                      className="text-[10px] text-primary hover:underline font-bold"
                    >
                      نسيت كلمة السر؟
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Input 
                    type="password" 
                    placeholder="••••••••" 
                    className="h-12 bg-white/5 border-white/10 text-white pr-10 text-right font-english focus:ring-primary/50" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <Lock className="absolute right-3 top-3.5 h-5 w-5 text-muted-foreground" />
                </div>
              </div>
            )}

            {mode === "reset" && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex gap-3">
                <AlertCircle className="h-5 w-5 text-amber-500 shrink-0" />
                <p className="text-[10px] text-amber-200/80 leading-relaxed">
                  سيتم إرسال بريد إلكتروني يحتوي على رابط آمن. يرجى الضغط عليه لتعيين كلمة سر جديدة والتمكن من الدخول مرة أخرى.
                </p>
              </div>
            )}

            <Button 
              type="submit" 
              disabled={loading}
              className="w-full h-14 bg-primary hover:bg-primary/90 text-primary-foreground font-black text-lg rounded-2xl shadow-xl shadow-primary/20 transition-all hover:scale-[1.02] active:scale-95 gap-2"
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : mode === "login" ? (
                <LogIn className="h-5 w-5" />
              ) : mode === "register" ? (
                <UserPlus className="h-5 w-5" />
              ) : (
                <KeyRound className="h-5 w-5" />
              )}
              {mode === "login" ? "دخول إلى النظام" : mode === "register" ? "إنشاء الحساب والبدء" : "إرسال رابط الاستعادة"}
            </Button>

            {mode === "reset" && (
              <button 
                type="button"
                onClick={() => setMode("login")}
                className="w-full text-sm text-muted-foreground hover:text-white flex items-center justify-center gap-2 mt-2 transition-colors font-bold"
              >
                <ArrowRight className="h-4 w-4" />
                العودة لتسجيل الدخول
              </button>
            )}
          </form>
        </CardContent>
        <CardFooter className="flex flex-col gap-4 border-t border-white/5 pt-6 mt-2">
          <div className="flex items-center justify-center gap-2 text-sm">
            <span className="text-muted-foreground">
              {mode === "login" ? "ليس لديك حساب؟" : "لديك حساب بالفعل؟"}
            </span>
            <button 
              onClick={() => setMode(mode === "login" ? "register" : "login")}
              className="text-primary font-bold hover:underline"
            >
              {mode === "login" ? "أنشئ حساباً الآن" : "سجل دخولك"}
            </button>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
            <ShieldCheck className="h-4 w-4 text-emerald-500" />
            <span className="text-[10px] text-emerald-500 font-bold">بياناتك مشفرة ومحمية بسحابة Google</span>
          </div>
        </CardFooter>
      </Card>
      
      <p className="mt-8 text-muted-foreground text-[10px] uppercase tracking-widest font-bold">
        BluePointPharma Professional Accounting v{APP_CONSTANTS.VERSION}
      </p>
    </div>
  )
}
