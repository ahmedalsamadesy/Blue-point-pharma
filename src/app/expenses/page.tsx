"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"

export default function ExpensesRedirect() {
  const router = useRouter()

  useEffect(() => {
    // توجيه كافة الطلبات إلى لوحة التحكم الرئيسية SPA
    router.replace("/dashboard")
  }, [router])

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background">
      <Loader2 className="h-10 w-10 animate-spin text-primary" />
      <p className="font-bold text-muted-foreground">جاري تحويلك إلى لوحة التحكم الموحدة...</p>
    </div>
  )
}
