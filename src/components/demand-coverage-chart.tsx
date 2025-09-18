
"use client"

import * as React from "react"
import { addDays, format, getISOWeek, startOfWeek, eachWeekOfInterval, parse } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"
import { DateRange } from "react-day-picker"
import {
  ComposedChart,
  Bar,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import type { Demand, CurrentInventory, Piece, PlanAssignment } from "@/lib/types"

interface DemandCoverageChartProps {
  demands: Demand[];
  inventory: CurrentInventory[];
  pieces: Piece[];
  planAssignments: PlanAssignment[];
  className?: string;
}

const getWeekString = (date: Date): string => {
    // getISOWeek returns the ISO week number. String formatting ensures WW format.
    const year = format(date, 'yyyy');
    const week = getISOWeek(date);
    return `${year}${String(week).padStart(2, '0')}`;
};

// Helper to get a Date object from a 'YYYYWW' string, using the first day of that week.
const getDateFromWeekString = (weekString: string): Date => {
    const year = parseInt(weekString.substring(0, 4), 10);
    const week = parseInt(weekString.substring(4), 10);
    // `parse` with 'R' for year and 'I' for ISO week is the key.
    return parse(`${year} ${week}`, 'R I', new Date());
};


export function DemandCoverageChart({
  demands,
  inventory,
  pieces,
  planAssignments,
  className,
}: DemandCoverageChartProps) {
  const [date, setDate] = React.useState<DateRange | undefined>(() => {
    // Find the earliest week with data to set a meaningful default range
    const firstDemandWeek = demands.map(d => d.periodoYYYYWW).sort()[0] || getWeekString(new Date());
    const startDate = startOfWeek(getDateFromWeekString(firstDemandWeek), { weekStartsOn: 1 });
    return {
      from: startDate,
      to: addDays(startDate, 27), // Default to 4 weeks
    };
  });

  const chartData = React.useMemo(() => {
    if (!date?.from || !date?.to) return [];

    const startWeek = getWeekString(date.from);
    const endWeek = getWeekString(date.to);
    
    const weeklyData: { [key: string]: { week: string; demand: number; planned: number } } = {};

    // Initialize weeks in the selected date range
    const weeksInInterval = eachWeekOfInterval({
      start: date.from,
      end: date.to,
    }, { weekStartsOn: 1 });

    weeksInInterval.forEach(weekStart => {
      const weekStr = getWeekString(weekStart);
      weeklyData[weekStr] = { week: `S${weekStr.substring(4)}`, demand: 0, planned: 0 };
    });
    
    // Aggregate demand
    demands.forEach(d => {
      if (d.periodoYYYYWW >= startWeek && d.periodoYYYYWW <= endWeek) {
        if (weeklyData[d.periodoYYYYWW]) {
          weeklyData[d.periodoYYYYWW].demand += d.qty;
        }
      }
    });

    // Aggregate planned production
    planAssignments.forEach(pa => {
      if (pa.semana >= startWeek && pa.semana <= endWeek) {
        if (weeklyData[pa.semana]) {
          weeklyData[pa.semana].planned += pa.prodUnidades;
        }
      }
    });

    const totalInitialStock = inventory.reduce((sum, inv) => sum + inv.stock, 0);

    let stockLevel = totalInitialStock;
    const processedData = Object.values(weeklyData).sort((a,b) => a.week.localeCompare(b.week)).map(data => {
        const coveredByStock = Math.min(data.demand, stockLevel);
        const remainingDemand = data.demand - coveredByStock;
        stockLevel -= coveredByStock;
        
        const coveredByProd = Math.min(remainingDemand, data.planned);
        stockLevel += data.planned - coveredByProd;

        return {
            ...data,
            coveredByStock,
            coveredByProd,
            uncovered: Math.max(0, data.demand - coveredByStock - coveredByProd),
        }
    });

    return processedData;
  }, [date, demands, planAssignments, inventory]);

  return (
    <Card className={cn("xl:col-span-2", className)}>
      <CardHeader className="flex flex-row items-start justify-between">
        <div>
          <CardTitle>Cobertura de Demanda</CardTitle>
          <CardDescription>
            Demanda vs. Cobertura por Stock y Producción Planificada.
          </CardDescription>
        </div>
        <div className={"grid gap-2"}>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                id="date"
                variant={"outline"}
                className={cn(
                  "w-[260px] justify-start text-left font-normal",
                  !date && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {date?.from ? (
                  date.to ? (
                    <>
                      {format(date.from, "LLL dd, y")} -{" "}
                      {format(date.to, "LLL dd, y")}
                    </>
                  ) : (
                    format(date.from, "LLL dd, y")
                  )
                ) : (
                  <span>Selecciona un rango</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                initialFocus
                mode="range"
                defaultMonth={date?.from}
                selected={date}
                onSelect={setDate}
                numberOfMonths={2}
              />
            </PopoverContent>
          </Popover>
        </div>
      </CardHeader>
      <CardContent className="pl-2">
        <ResponsiveContainer width="100%" height={350}>
            <ComposedChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false}/>
                <XAxis dataKey="week" stroke="#888888"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false} />
                <YAxis stroke="#888888"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                />
                <Tooltip 
                    contentStyle={{
                        background: 'hsl(var(--background))',
                        borderColor: 'hsl(var(--border))',
                    }}
                    formatter={(value: number) => value.toLocaleString()}
                />
                <Legend />
                <Bar dataKey="coveredByStock" name="Cubierto por Stock" stackId="a" fill="hsl(var(--chart-1))" />
                <Bar dataKey="coveredByProd" name="Cubierto por Producción" stackId="a" fill="hsl(var(--chart-2))" />
                <Bar dataKey="uncovered" name="No Cubierto" stackId="a" fill="hsl(var(--destructive))" />
                <Area type="monotone" dataKey="demand" name="Demanda Total" fill="transparent" stroke="hsl(var(--primary))" strokeWidth={2} dot={false}/>
            </ComposedChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
