"use client"

import { useState } from "react"
import { Area, AreaChart, Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ChartArea, ChartBar, CalendarDays } from "lucide-react"

interface PerformanceChartProps {
  data: any[]
  initialType?: "area" | "bar"
}

const chartConfig = {
  income: {
    label: "الإيرادات",
    color: "hsl(var(--primary))",
  },
  expenses: {
    label: "المصروفات",
    color: "hsl(var(--destructive))",
  },
}

export function PerformanceChart({ data, initialType = "area" }: PerformanceChartProps) {
  const [type, setType] = useState<"area" | "bar">(initialType)
  const [range, setRange] = useState("weekly")

  return (
    <Card className="border shadow-sm rounded-[2rem] bg-card h-full overflow-hidden">
      <CardHeader className="pb-2 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <CardTitle className="text-xl font-bold text-foreground">الأداء المالي</CardTitle>
          <CardDescription>مقارنة الإيرادات والمصروفات حسب النطاق الزمني</CardDescription>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
            <Select value={range} onValueChange={setRange}>
              <SelectTrigger className="h-9 w-[110px] text-xs font-bold rounded-xl bg-muted/50 border-border focus:ring-0 focus:ring-offset-0">
                <SelectValue placeholder="النطاق" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="daily" className="text-xs font-bold">يومي</SelectItem>
                <SelectItem value="weekly" className="text-xs font-bold">أسبوعي</SelectItem>
                <SelectItem value="monthly" className="text-xs font-bold">شهري</SelectItem>
                <SelectItem value="yearly" className="text-xs font-bold">سنوي</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="h-6 w-px bg-border mx-1" />

          <div className="flex bg-muted p-1 rounded-xl border w-fit">
            <Button 
              variant={type === "area" ? "default" : "ghost"} 
              size="sm" 
              onClick={() => setType("area")}
              className={`rounded-lg h-7 px-2.5 flex gap-1.5 font-bold text-[10px] md:text-xs transition-all ${type === 'area' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}
            >
              <ChartArea className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">منحنى</span>
            </Button>
            <Button 
              variant={type === "bar" ? "default" : "ghost"} 
              size="sm" 
              onClick={() => setType("bar")}
              className={`rounded-lg h-7 px-2.5 flex gap-1.5 font-bold text-[10px] md:text-xs transition-all ${type === 'bar' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}
            >
              <ChartBar className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">أعمدة</span>
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0 pt-4">
        <div className="h-[350px] w-full px-4">
          <ChartContainer config={chartConfig} className="h-full w-full">
            {type === "area" ? (
              <AreaChart
                data={data}
                margin={{ left: 12, right: 12, top: 12, bottom: 12 }}
              >
                <defs>
                  <linearGradient id="fillIncome" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="5%"
                      stopColor="hsl(var(--primary))"
                      stopOpacity={0.3}
                    />
                    <stop
                      offset="95%"
                      stopColor="hsl(var(--primary))"
                      stopOpacity={0.01}
                    />
                  </linearGradient>
                  <linearGradient id="fillExpenses" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="5%"
                      stopColor="hsl(var(--destructive))"
                      stopOpacity={0.3}
                    />
                    <stop
                      offset="95%"
                      stopColor="hsl(var(--destructive))"
                      stopOpacity={0.01}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="currentColor" className="text-border opacity-50" />
                <XAxis
                  dataKey="name"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  style={{ fontSize: '11px', fontWeight: 'bold', fill: 'currentColor' }}
                  className="text-muted-foreground"
                />
                <YAxis hide />
                <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="dot" />} />
                <Area
                  dataKey="income"
                  type="monotone"
                  fill="url(#fillIncome)"
                  stroke="hsl(var(--primary))"
                  strokeWidth={4}
                />
                <Area
                  dataKey="expenses"
                  type="monotone"
                  fill="url(#fillExpenses)"
                  stroke="hsl(var(--destructive))"
                  strokeWidth={4}
                />
              </AreaChart>
            ) : (
              <BarChart
                data={data}
                margin={{ left: 12, right: 12, top: 12, bottom: 12 }}
              >
                <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="currentColor" className="text-border opacity-50" />
                <XAxis
                  dataKey="name"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  style={{ fontSize: '11px', fontWeight: 'bold', fill: 'currentColor' }}
                  className="text-muted-foreground"
                />
                <YAxis hide />
                <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
                <Bar 
                  dataKey="income" 
                  fill="hsl(var(--primary))" 
                  radius={[4, 4, 0, 0]} 
                  barSize={30}
                />
                <Bar 
                  dataKey="expenses" 
                  fill="hsl(var(--destructive))" 
                  radius={[4, 4, 0, 0]} 
                  barSize={30}
                />
              </BarChart>
            )}
          </ChartContainer>
        </div>
      </CardContent>
    </Card>
  )
}