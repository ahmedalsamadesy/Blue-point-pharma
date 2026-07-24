
"use client"

import { useMemo, useState, useEffect } from "react"
import { 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  Activity,
  Clock,
  UserCheck,
  UserX,
  CalendarDays,
  AlertCircle,
  Bell,
  PackageSearch,
  Megaphone,
  History,
  Zap,
  ShieldAlert,
  Store,
  Info,
  AlertTriangle,
  AlertOctagon,
  CheckCircle2,
  Stethoscope
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useFirestore, useUser, useCollection, useMemoFirebase } from "@/firebase"
import { collection } from "firebase/firestore"

interface NewsTickerProps {
  stats: {
    totalIncome: number;
    totalExpenses: number;
    netProfit: number;
    totalDebt: number;
  };
  pharmacyName?: string;
  settings?: any;
  employees?: any[];
  suppliers?: any[];
  inventory?: any[];
}

export function NewsTicker({ stats, pharmacyName, settings, employees, suppliers, inventory }: NewsTickerProps) {
  const firestore = useFirestore()
  const { user } = useUser()
  const [now, setNow] = useState<Date | null>(null)

  useEffect(() => {
    setNow(new Date())
    const timer = setInterval(() => setNow(new Date()), 60000)
    return () => clearInterval(timer)
  }, [])

  const broadcastsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null
    return collection(firestore, "users", user.uid, "broadcasts")
  }, [firestore, user])
  const { data: broadcasts } = useCollection(broadcastsQuery)

  const externalStaffQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null
    return collection(firestore, "users", user.uid, "externalStaff")
  }, [firestore, user])
  const { data: externalStaff } = useCollection(externalStaffQuery)

  const checkShift = (start: string, end: string) => {
    if (!start || !end || !now) return false
    const currentH = now.getHours()
    const currentM = now.getMinutes()
    const currentTime = currentH * 60 + currentM

    const [sH, sM] = start.split(':').map(Number)
    const startT = sH * 60 + sM

    const [eH, eM] = end.split(':').map(Number)
    const endT = eH * 60 + eM

    if (startT < endT) {
      return currentTime >= startT && currentTime <= endT
    } else {
      return currentTime >= startT || currentTime <= endT
    }
  }

  const activeExternalStaff = useMemo(() => {
    if (!settings?.externalSupportActive || !settings?.activeExternalStaffId || !externalStaff) return null
    return externalStaff.find(s => s.id === settings.activeExternalStaffId)
  }, [settings, externalStaff])

  const operationStatus = useMemo(() => {
    if (!now) return { label: "جاري التحميل...", color: "text-muted-foreground", isOpen: false }
    
    const mode = settings?.operationMode || "auto"
    const externalActive = settings?.externalSupportActive || false
    
    if (mode === "forced_open") return { label: "مفتوح (تشغيل طوارئ)", color: "text-emerald-500", isOpen: true }
    if (mode === "forced_closed") return { label: "مغلق (أمر إداري)", color: "text-rose-500", isOpen: false }

    const isWithinHours = checkShift(settings?.openingTime || "08:00", settings?.closingTime || "23:00")
    
    const activeStaff = employees?.filter(emp => {
      if (emp.presenceOverride === 'force_available') return true;
      if (emp.presenceOverride === 'force_unavailable') return false;
      return checkShift(emp.startTime, emp.endTime)
    }) || []

    const hasStaff = activeStaff.length > 0

    if (isWithinHours) {
      if (hasStaff) return { label: "الصيدلية مفتوحة الآن", color: "text-emerald-500", isOpen: true, pulse: true }
      if (externalActive) {
        const staffName = activeExternalStaff ? `د. ${activeExternalStaff.name}` : "انتداب"
        return { label: `مفتوح (دعم خارجي - ${staffName})`, color: "text-blue-500", isOpen: true, isExternal: true, pulse: true }
      }
      return { label: "تنبيه: مغلق لعدم توفر موظفين", color: "text-amber-500", isOpen: false, isAlert: true, isStaffGap: true }
    } else {
      return { label: `الصيدلية مغلقة (تفتح ${settings?.openingTime || "08:00"})`, color: "text-rose-500", isOpen: false }
    }
  }, [settings, employees, now, activeExternalStaff])

  const tickerItems = useMemo(() => {
    if (!now) return []
    const list: any[] = []

    list.push({
      label: "الحالة التشغيلية",
      value: operationStatus.label,
      icon: (operationStatus as any).isStaffGap ? ShieldAlert : operationStatus.isExternal ? Stethoscope : Store,
      color: operationStatus.color,
      pulse: (operationStatus as any).pulse || (operationStatus as any).isStaffGap
    })

    // إضافة تنبيه حرج في حال غياب الموظفين أثناء العمل
    if ((operationStatus as any).isStaffGap) {
      list.push({ 
        label: "إجراء إداري مطلوب", 
        value: "لا يوجد موظفين متاحين حالياً! يرجى تفعيل الدعم الخارجي (الانتداب) أو تأكيد الإغلاق.", 
        icon: AlertOctagon, 
        color: "text-rose-600", 
        isAlert: true 
      })
    }

    if (broadcasts) {
      const todayStr = now.toISOString().split('T')[0]
      const currentTimeStr = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })

      broadcasts.filter(b => {
        if (!b.isActive) return false
        return todayStr >= b.startDate && todayStr <= b.endDate && currentTimeStr >= b.startTime && currentTimeStr <= b.endTime
      }).forEach(b => {
        list.push({ label: "تنبيه إداري", value: b.content, icon: Megaphone, color: "text-primary", isAlert: true })
      })
    }

    if (employees && settings?.showStaffInTicker !== false) {
      employees.forEach(emp => {
        const isManuallyAvailable = emp.presenceOverride === 'force_available';
        const isManuallyUnavailable = emp.presenceOverride === 'force_unavailable';
        const isWithinShift = checkShift(emp.startTime, emp.endTime);

        const working = isManuallyAvailable || (isWithinShift && !isManuallyUnavailable);

        if (working) {
          const namePrefix = emp.role === 'pharmacist' ? 'د. ' : '';
          const roleSuffix = emp.role === 'pharmacist' ? '' : ` (${emp.role === 'assistant' ? 'مساعد' : emp.role})`;
          
          list.push({ 
            label: "الموظف الآن", 
            value: `${namePrefix}${emp.firstName}${roleSuffix} (متاح)`, 
            icon: UserCheck, 
            color: "text-emerald-500" 
          })
        }
      })
    }

    if (activeExternalStaff && settings?.externalSupportActive) {
      list.push({ label: "مسؤول الانتداب", value: `${activeExternalStaff.name} (${activeExternalStaff.specialty})`, icon: Stethoscope, color: "text-blue-500" })
    }

    if (settings?.showProfitInTicker !== false) {
      list.push({ label: "السيولة المتوفرة", value: `${stats.netProfit.toLocaleString()} ج.م`, icon: Wallet, color: "text-primary" })
    }

    return list
  }, [stats, operationStatus, employees, settings, broadcasts, now, activeExternalStaff])

  return (
    <div className="w-full bg-card/40 backdrop-blur-xl border-b border-primary/10 overflow-hidden h-9 flex items-center select-none print:hidden shadow-inner relative group">
      <div className="absolute left-0 top-0 h-full w-12 bg-gradient-to-r from-background to-transparent z-10" />
      <div className="absolute right-0 top-0 h-full w-12 bg-gradient-to-l from-background to-transparent z-10" />
      
      <div className="flex animate-marquee whitespace-nowrap items-center w-max">
        {tickerItems.length > 0 ? tickerItems.map((item, index) => (
          <div key={index} className="flex items-center gap-2 px-12 shrink-0 group/item transition-opacity hover:opacity-100">
            <div className="relative">
              <item.icon className={cn("h-4 w-4", item.color, item.isAlert && "animate-bounce")} />
              {item.pulse && <span className={cn("absolute -top-1 -right-1 h-2 w-2 rounded-full animate-ping", item.color === 'text-emerald-500' ? 'bg-emerald-500' : item.color === 'text-amber-500' ? 'bg-amber-500' : 'bg-primary')} />}
            </div>
            <span className="text-[11px] font-black text-muted-foreground/60 uppercase tracking-tighter">{item.label}:</span>
            <span className={cn("text-[11px] font-black font-english whitespace-nowrap px-1.5 py-0.5 rounded-lg bg-white/5", item.color)}>{item.value}</span>
            <div className="h-4 w-px bg-primary/10 mx-6" />
          </div>
        )) : (
          <div className="flex items-center gap-2 px-12 shrink-0">
            <Activity className="h-4 w-4 text-primary animate-pulse" />
            <span className="text-[11px] font-black text-muted-foreground animate-pulse">جاري جلب نبض الصيدلية...</span>
          </div>
        )}
      </div>
    </div>
  )
}
