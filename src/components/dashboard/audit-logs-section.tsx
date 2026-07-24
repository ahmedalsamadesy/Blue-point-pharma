"use client"

import { useState, useMemo } from "react"
import { useFirestore, useUser, useCollection, useMemoFirebase } from "@/firebase"
import { collection, query, orderBy, limit } from "firebase/firestore"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Loader2, History, Search, Filter, ShieldCheck, Clock, FileSpreadsheet } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import * as XLSX from 'xlsx'

export function AuditLogsSection() {
  const firestore = useFirestore()
  const { user } = useUser()
  const { toast } = useToast()
  const [searchTerm, setSearchTerm] = useState("")
  const [isAdvFilterOpen, setIsAdvFilterOpen] = useState(false)
  const [advFilters, setAdvFilters] = useState({
    section: "all",
    userName: "all"
  })

  const logsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null
    return query(
      collection(firestore, "users", user.uid, "auditLogs"),
      orderBy("timestamp", "desc"),
      limit(200)
    )
  }, [firestore, user])

  const { data: logs, isLoading } = useCollection(logsQuery)

  const usersList = useMemo(() => {
    if (!logs) return []
    return Array.from(new Set(logs.map(l => l.userName).filter(Boolean)))
  }, [logs])

  const sectionsList = useMemo(() => {
    if (!logs) return []
    return Array.from(new Set(logs.map(l => l.section).filter(Boolean)))
  }, [logs])

  const filteredLogs = useMemo(() => {
    if (!logs) return []
    return logs.filter(log => {
      const matchSearch = (log.action || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (log.userName || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (log.details || "").toLowerCase().includes(searchTerm.toLowerCase())
      
      const matchSection = advFilters.section === 'all' || log.section === advFilters.section
      const matchUser = advFilters.userName === 'all' || log.userName === advFilters.userName
      
      return matchSearch && matchSection && matchUser
    })
  }, [logs, searchTerm, advFilters])

  const handleExportExcel = () => {
    const exportData = filteredLogs.map(log => ({
      "التاريخ والوقت": log.timestamp?.replace('T', ' ').substring(0, 16),
      "المستخدم": log.userName,
      "الحدث": log.action,
      "القسم": log.section,
      "التفاصيل": log.details
    }));
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "سجل الرقابة");
    XLSX.writeFile(wb, `سجل_رقابة_بلو_بوينت_${new Date().toISOString().split('T')[0]}.xlsx`);
    toast({ title: "تم تصدير الإكسيل" });
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-20">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20" dir="rtl">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-foreground flex items-center gap-3">
            <History className="h-8 w-8 text-primary" />
            سجل المراجعة والرقابة
          </h2>
          <p className="text-muted-foreground font-medium">تتبع كافة الحركات المالية والإدارية التي تمت على النظام.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={handleExportExcel} variant="outline" className="h-12 rounded-xl border-emerald-200 font-bold gap-2 hover:bg-emerald-50 text-emerald-700">
            <FileSpreadsheet className="h-4 w-4" /> تصدير إكسيل
          </Button>
          <div className="bg-primary/5 border border-primary/20 px-4 py-2 rounded-2xl flex items-center gap-3">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <span className="text-xs font-bold text-primary">نظام مراقبة نشط 24/7</span>
          </div>
        </div>
      </div>

      <Card className="border shadow-xl bg-card rounded-[2rem] overflow-hidden">
        <CardHeader className="border-b bg-muted/30">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-xl">الأحداث المسجلة</CardTitle>
            </div>
            <div className="flex items-center gap-3 w-full md:w-auto">
              <div className="relative max-w-sm w-full">
                <Search className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="ابحث في الأحداث أو المستخدمين..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="h-10 pr-10 rounded-xl bg-background border-border font-bold"
                />
              </div>
              <Button variant="outline" onClick={() => setIsAdvFilterOpen(true)} className="h-10 rounded-xl font-bold gap-2 bg-background">
                <Filter className="h-4 w-4" /> فلترة
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {filteredLogs.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent bg-muted/30">
                  <TableHead className="text-right font-bold text-foreground py-4">الوقت والتاريخ</TableHead>
                  <TableHead className="text-right font-bold text-foreground">المستخدم</TableHead>
                  <TableHead className="text-right font-bold text-foreground">الحدث</TableHead>
                  <TableHead className="text-right font-bold text-foreground">القسم</TableHead>
                  <TableHead className="text-right font-bold text-foreground">التفاصيل</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs.map((log) => (
                  <TableRow key={log.id} className="hover:bg-muted/30 transition-colors">
                    <TableCell className="text-right font-english text-muted-foreground text-[11px] whitespace-nowrap">
                      {log.timestamp?.replace('T', ' ').substring(0, 16)}
                    </TableCell>
                    <TableCell className="text-right font-bold text-foreground">{log.userName}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant="secondary" className="bg-primary/5 text-primary border-none font-bold">
                        {log.action}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right text-xs font-bold text-muted-foreground">{log.section}</TableCell>
                    <TableCell className="text-right text-[11px] font-medium max-w-xs truncate" title={log.details}>
                      {log.details}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="p-20 text-center space-y-4">
              <History className="h-16 w-16 text-muted-foreground/20 mx-auto" />
              <p className="text-muted-foreground font-bold">لم يتم تسجيل أي أحداث مطابقة للبحث.</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isAdvFilterOpen} onOpenChange={setIsAdvFilterOpen}>
        <DialogContent className="sm:max-w-[450px] text-right rounded-[2.5rem]" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black">فلترة سجل الأحداث</DialogTitle>
            <DialogDescription className="font-bold text-right">تضييق نطاق البحث حسب القسم أو المستخدم.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-6 py-6 text-right">
            <div className="space-y-2 text-right">
              <Label className="font-bold">حسب القسم</Label>
              <Select value={advFilters.section} onValueChange={(v) => setAdvFilters({...advFilters, section: v})}>
                <SelectTrigger className="h-12 rounded-xl text-right"><SelectValue /></SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="all" className="font-bold text-right">كل الأقسام</SelectItem>
                  {sectionsList.map(s => <SelectItem key={s} value={s} className="text-right">{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 text-right">
              <Label className="font-bold">حسب المستخدم</Label>
              <Select value={advFilters.userName} onValueChange={(v) => setAdvFilters({...advFilters, userName: v})}>
                <SelectTrigger className="h-12 rounded-xl text-right"><SelectValue /></SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="all" className="font-bold text-right">كل المستخدمين</SelectItem>
                  {usersList.map(u => <SelectItem key={u} value={u} className="text-right">{u}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button onClick={() => setIsAdvFilterOpen(false)} className="bg-primary text-white flex-1 font-black h-12 rounded-xl shadow-lg">تطبيق</Button>
            <Button variant="outline" onClick={() => { setAdvFilters({section:"all", userName:"all"}); setIsAdvFilterOpen(false); }} className="flex-1 font-bold h-12 rounded-xl">تصفير</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
