
"use client"

import { ShieldCheck, Lock } from "lucide-react"
import { cn } from "@/lib/utils"

interface ReadOnlyGuardProps {
  role: string;
  type?: 'owner' | 'restricted';
  description?: string;
  className?: string;
}

/**
 * مكون موحد لحماية واجهة "صاحب الصيدلية" أو المستخدمين غير المصرح لهم.
 * يقلل تكرار الكود ويضمن هوية بصرية موحدة للرقابة.
 */
export function ReadOnlyGuard({ role, type = 'owner', description, className }: ReadOnlyGuardProps) {
  const isOwner = role === 'owner';
  const isRestricted = type === 'restricted';

  return (
    <div className={cn(
      "p-12 text-center space-y-4 rounded-[2.5rem] bg-card border shadow-xl animate-in fade-in zoom-in duration-500",
      isOwner ? "bg-primary/5 border-primary/10" : "bg-rose-50/10 border-rose-100",
      className
    )}>
      <div className={cn(
        "h-16 w-16 rounded-[2rem] flex items-center justify-center mx-auto shadow-inner",
        isOwner ? "bg-primary/10 text-primary" : "bg-rose-500/10 text-rose-600"
      )}>
        {isOwner ? <ShieldCheck className="h-8 w-8" /> : <Lock className="h-8 w-8" />}
      </div>
      <div className="space-y-2">
        <h3 className={cn("text-xl font-black", isOwner ? "text-primary" : "text-rose-700")}>
          {isOwner ? "واجهة رقابية (للاطلاع فقط)" : "وصول مقيد"}
        </h3>
        <p className="text-xs text-muted-foreground font-bold max-w-xs mx-auto leading-relaxed">
          {description || (isOwner 
            ? "بصفتك صاحب الصيدلية، يمكنك متابعة كافة البيانات والتقارير المالية والرقابية دون التدخل في العمليات التشغيلية اليومية."
            : "عذراً، ليس لديك صلاحية كافية للقيام بهذا الإجراء. يرجى التواصل مع مدير النظام.")}
        </p>
      </div>
    </div>
  );
}
