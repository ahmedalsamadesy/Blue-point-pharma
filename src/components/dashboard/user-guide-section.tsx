
"use client"

import { 
  BookOpen, 
  Zap, 
  Landmark, 
  ShoppingCart, 
  ShoppingBag, 
  Users, 
  BrainCircuit, 
  ShieldCheck, 
  Settings, 
  Printer, 
  Info,
  ChevronRight,
  Target,
  History,
  Wallet,
  CheckCircle2,
  AlertTriangle
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"

export function UserGuideSection() {
  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20 px-4 md:px-0" dir="rtl">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-3xl font-black text-foreground flex items-center gap-3">
            <BookOpen className="h-8 w-8 text-primary" />
            دليل المستخدم الشامل
          </h2>
          <p className="text-muted-foreground font-medium">كل ما تحتاجه لإتقان العمل على نظام BluePointPharma v2.5</p>
        </div>
        <Badge variant="outline" className="h-10 px-4 rounded-xl border-primary/20 text-primary font-black">
          إصدار النظام المستقر
        </Badge>
      </div>

      <div className="grid gap-8 lg:grid-cols-12">
        {/* القائمة الجانبية السريعة */}
        <div className="lg:col-span-4 space-y-6">
          <Card className="border-none shadow-xl bg-primary text-primary-foreground rounded-[2.5rem] overflow-hidden">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl font-black">
                <Zap className="h-5 w-5 fill-current" />
                البداية السريعة
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm font-medium leading-relaxed">
              <p>أهلاً بك في عالم الإدارة المالية الذكية. للبدء فوراً اتبع الخطوات التالية:</p>
              <ul className="space-y-3">
                <li className="flex items-start gap-2 bg-white/10 p-3 rounded-2xl">
                  <span className="h-5 w-5 rounded-full bg-white text-primary flex items-center justify-center text-[10px] font-black shrink-0">1</span>
                  <span>توجه إلى <b>الإعدادات</b> واضبط <b>الرصيد الافتتاحي</b> للخزينة.</span>
                </li>
                <li className="flex items-start gap-2 bg-white/10 p-3 rounded-2xl">
                  <span className="h-5 w-5 rounded-full bg-white text-primary flex items-center justify-center text-[10px] font-black shrink-0">2</span>
                  <span>قم بتعريف <b>الموردين والعملاء</b> الحاليين وأرصدتهم السابقة.</span>
                </li>
                <li className="flex items-start gap-2 bg-white/10 p-3 rounded-2xl">
                  <span className="h-5 w-5 rounded-full bg-white text-primary flex items-center justify-center text-[10px] font-black shrink-0">3</span>
                  <span>ابدأ بتسجيل <b>مبيعات الشفتات</b> وستجد شريط الأهداف يتحرك تلقائياً.</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card className="border shadow-lg rounded-[2.5rem] overflow-hidden bg-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-black flex items-center gap-2">
                <Info className="h-5 w-5 text-primary" />
                نصائح الرقابة المالية
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/10 space-y-2">
                <p className="text-xs font-black text-amber-700 flex items-center gap-2">
                  <AlertTriangle className="h-3.5 w-3.5" /> تنبيه أمان
                </p>
                <p className="text-[11px] leading-relaxed text-amber-800 font-bold">
                  لا تشارك رمز الـ PIN الخاص بك مع أي موظف آخر. كل حركة تسجل باسم صاحب الرمز في سجل الرقابة.
                </p>
              </div>
              <div className="p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/10 space-y-2">
                <p className="text-xs font-black text-emerald-700 flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5" /> نصيحة ذكية
                </p>
                <p className="text-[11px] leading-relaxed text-emerald-800 font-bold">
                  استخدم زر "إغلاق اليوم مالياً" قبل الانصراف لضمان أرشفة أرباحك وتوقيعها محاسبياً.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* التفاصيل والأسئلة الشائعة */}
        <div className="lg:col-span-8">
          <Card className="border shadow-xl rounded-[2.5rem] overflow-hidden">
            <CardContent className="p-8">
              <Accordion type="single" collapsible className="w-full space-y-4">
                
                <AccordionItem value="treasury" className="border-none">
                  <AccordionTrigger className="hover:no-underline p-6 rounded-[2rem] bg-muted/30 data-[state=open]:bg-primary/5 transition-all">
                    <div className="flex items-center gap-4 text-right">
                      <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-inner">
                        <Landmark className="h-6 w-6" />
                      </div>
                      <div>
                        <h3 className="text-lg font-black">الخزينة والرصيد التراكمي</h3>
                        <p className="text-xs text-muted-foreground font-bold">كيف تطابق أموال الدرج بدقة؟</p>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="p-8 space-y-4 text-sm leading-relaxed font-medium">
                    <p>قسم الخزينة هو "مرآة الحقيقة" في صيدليتك. يعتمد النظام على معادلة بسيطة:</p>
                    <div className="bg-muted p-4 rounded-2xl text-center font-black font-english text-primary text-lg">
                      (الرصيد الافتتاحي + الإيرادات) - المصروفات = رصيد الخزينة الحالي
                    </div>
                    <ul className="list-disc pr-6 space-y-2">
                      <li><b>الرصيد التراكمي:</b> يظهر لك في كل سطر قيمة النقدية التي "كان يجب أن تكون" موجودة بعد تلك العملية مباشرة.</li>
                      <li><b>التسوية:</b> إذا وجدت فرقاً بين نقدية الدرج والرصيد الفعلي، يمكنك استخدام "التحويلات" لتصحيح الرصيد (وارد/منصرف).</li>
                    </ul>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="sales" className="border-none">
                  <AccordionTrigger className="hover:no-underline p-6 rounded-[2rem] bg-muted/30 data-[state=open]:bg-emerald-500/5 transition-all">
                    <div className="flex items-center gap-4 text-right">
                      <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 shadow-inner">
                        <ShoppingCart className="h-6 w-6" />
                      </div>
                      <div>
                        <h3 className="text-lg font-black">المبيعات والشفتات</h3>
                        <p className="text-xs text-muted-foreground font-bold">إدارة توريدات الكاشير اليومية.</p>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="p-8 space-y-4 text-sm leading-relaxed font-medium">
                    <p>النظام مخصص لإدارة الحسابات (Accounting) وليس نقاط البيع (POS) التفصيلية، لذلك:</p>
                    <ul className="list-disc pr-6 space-y-2">
                      <li>يتم تسجيل <b>إجمالي مبيعات كل شفت</b> عند انتهائه.</li>
                      <li>بمجرد تسجيل التوريد، تزيد سيولة الخزينة ويتحرك <b>شريط الأهداف</b> نحو النجاح.</li>
                      <li>يمكنك البحث عن مبيعات موظف محدد أو مبيعات يوم معين باستخدام الفلاتر المتقدمة.</li>
                    </ul>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="suppliers" className="border-none">
                  <AccordionTrigger className="hover:no-underline p-6 rounded-[2rem] bg-muted/30 data-[state=open]:bg-blue-500/5 transition-all">
                    <div className="flex items-center gap-4 text-right">
                      <div className="h-12 w-12 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-600 shadow-inner">
                        <ShoppingBag className="h-6 w-6" />
                      </div>
                      <div>
                        <h3 className="text-lg font-black">المشتريات والديون</h3>
                        <p className="text-xs text-muted-foreground font-bold">تتبع فواتير شركات الأدوية.</p>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="p-8 space-y-4 text-sm leading-relaxed font-medium">
                    <p>إدارة المشتريات تضمن لك عدم ضياع حقوقك مع شركات التوريد:</p>
                    <ul className="list-disc pr-6 space-y-2">
                      <li><b>الفاتورة الواردة:</b> تزيد من مديونية المورد وتوثق في الخزينة.</li>
                      <li><b>المرتجع:</b> يخصم من مديونية المورد (يقلل الدين).</li>
                      <li><b>كشف الحساب:</b> يمكنك طباعة كشف حساب رسمي لأي شركة لمطابقة الديون مع مندوب الشركة.</li>
                    </ul>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="ai" className="border-none">
                  <AccordionTrigger className="hover:no-underline p-6 rounded-[2rem] bg-muted/30 data-[state=open]:bg-purple-500/5 transition-all">
                    <div className="flex items-center gap-4 text-right">
                      <div className="h-12 w-12 rounded-2xl bg-purple-500/10 flex items-center justify-center text-purple-600 shadow-inner">
                        <BrainCircuit className="h-6 w-6" />
                      </div>
                      <div>
                        <h3 className="text-lg font-black">المساعد المالي Gemini</h3>
                        <p className="text-xs text-muted-foreground font-bold">قوة الذكاء الاصطناعي في جيبك.</p>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="p-8 space-y-4 text-sm leading-relaxed font-medium">
                    <p>يوفر النظام ذكاءً اصطناعياً متكاملاً عبر وظيفتين:</p>
                    <ul className="list-disc pr-6 space-y-2">
                      <li><b>التحليل اللحظي (AI Insights):</b> يحلل بياناتك الحالية ويعطيك ملخصاً نصياً للأداء المالي فوراً.</li>
                      <li><b>التوقعات المالية (Forecasting):</b> يدرس مبيعاتك التاريخية ويتوقع لك إجمالي مبيعات الشهر القادم مع تقديم نصائح إدارية لنمو الأرباح.</li>
                    </ul>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="security" className="border-none">
                  <AccordionTrigger className="hover:no-underline p-6 rounded-[2rem] bg-muted/30 data-[state=open]:bg-rose-500/5 transition-all">
                    <div className="flex items-center gap-4 text-right">
                      <div className="h-12 w-12 rounded-2xl bg-rose-500/10 flex items-center justify-center text-rose-600 shadow-inner">
                        <ShieldCheck className="h-6 w-6" />
                      </div>
                      <div>
                        <h3 className="text-lg font-black">الأمان وصلاحيات الوصول</h3>
                        <p className="text-xs text-muted-foreground font-bold">حماية خصوصية بياناتك المالية.</p>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="p-8 space-y-4 text-sm leading-relaxed font-medium">
                    <p>يعمل النظام بمبدأ "المستخدمين النشطين" (System Users):</p>
                    <ul className="list-disc pr-6 space-y-2">
                      <li><b>رمز الـ PIN:</b> كل مستخدم يدخل برمز PIN مكون من 4-6 أرقام.</li>
                      <li><b>الصلاحيات المفلترة:</b> يمكن للمدير تحديد من يحق له "العرض فقط" ومن يحق له "الإدارة والحذف" لكل قسم على حدة.</li>
                      <li><b>سجل الرقابة (Audit):</b> يسجل النظام كل عملية تعديل أو حذف حساسة مع ذكر اسم الفاعل والوقت والتفاصيل قبل وبعد التعديل.</li>
                    </ul>
                  </AccordionContent>
                </AccordionItem>

              </Accordion>

              <div className="mt-12 pt-8 border-t border-dashed">
                <div className="flex flex-col md:flex-row items-center justify-between gap-6 p-8 rounded-[2.5rem] bg-muted/30">
                  <div className="flex items-center gap-4">
                    <div className="h-14 w-14 rounded-full bg-primary text-white flex items-center justify-center shadow-lg shadow-primary/20">
                      <Printer className="h-7 w-7" />
                    </div>
                    <div>
                      <h4 className="text-lg font-black">نظام الطباعة الاحترافي</h4>
                      <p className="text-xs text-muted-foreground font-bold italic">مصمم لمقاسات A4 الرسمية والتقارير.</p>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground max-w-[300px] leading-relaxed font-medium">
                    كافة التقارير وكشوف الحسابات مصممة للطباعة مباشرة من المتصفح (Ctrl + P) بتنسيق محاسبي فخم يتضمن شعار صيدليتك وأختام المسؤولين.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
