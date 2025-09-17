
"use client";

import { useState } from "react";
import { format, addDays, getWeek, getMonth, getYear, startOfYear, endOfYear, eachDayOfInterval } from "date-fns";
import { es } from 'date-fns/locale';
import { PlusCircle, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";

import { calendarEvents as initialEvents } from "@/lib/data";
import type { CalendarEvent } from "@/lib/types";
import { cn } from "@/lib/utils";

const eventTypes = {
  feriado: { label: "Feriado", className: "bg-red-200" },
  vacaciones: { label: "Vacaciones", className: "bg-blue-200" },
  mantenimiento: { label: "Mantenimiento", className: "bg-yellow-200" },
  arranque: { label: "Arranque/Parada", className: "bg-purple-200" },
};


const getWeekNumber = (date: Date) => {
    return getWeek(date, { weekStartsOn: 1, firstWeekContainsDate: 4 });
}

export default function CalendarPage() {
  const [events, setEvents] = useState<CalendarEvent[]>(initialEvents);
  const [year, setYear] = useState(new Date().getFullYear());

  const yearStart = startOfYear(new Date(year, 0, 1));
  const yearEnd = endOfYear(new Date(year, 0, 1));
  const daysInYear = eachDayOfInterval({ start: yearStart, end: yearEnd });

  const daysByMonth = daysInYear.reduce((acc, day) => {
    const month = getMonth(day);
    if (!acc[month]) {
      acc[month] = [];
    }
    acc[month].push(day);
    return acc;
  }, {} as { [key: number]: Date[] });

  return (
    <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-headline font-bold">Calendario de Disponibilidad</h1>
          <p className="text-muted-foreground">
            Gestiona los días no productivos para toda la planta.
          </p>
        </div>
      </div>
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4">
            {Object.entries(daysByMonth).map(([monthIndex, days]) => {
              const monthName = format(days[0], 'MMMM', { locale: es });

              const daysByWeek = days.reduce((acc, day) => {
                const week = getWeekNumber(day);
                if (!acc[week]) {
                  acc[week] = [];
                }
                acc[week].push(day);
                return acc;
              }, {} as { [key: number]: Date[] });

              return (
                <div key={monthIndex}>
                  <h3 className="text-lg font-semibold text-center mb-2 capitalize">{monthName}</h3>
                  <Table className="border">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[15%]">Sem</TableHead>
                        <TableHead className="w-[25%]">Fecha</TableHead>
                        <TableHead className="w-[25%]">Día</TableHead>
                        <TableHead className="w-[35%] text-center">Tipo</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {Object.entries(daysByWeek).map(([week, weekDays]) => (
                        <React.Fragment key={week}>
                            <TableRow className="bg-muted/50">
                                <TableCell className="font-bold align-middle row-span-7">S{week.toString().padStart(2,'0')}</TableCell>
                                <TableCell colSpan={3} className="py-1">
                                  {/* Placeholder for weekly actions or info */}
                                </TableCell>
                            </TableRow>
                           {weekDays.map(day => {
                            const dayEvent = events.find(e => format(new Date(`${e.date}T00:00:00`), 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd'));
                             const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                             const eventClass = dayEvent ? eventTypes[dayEvent.type].className : '';
                             const weekendClass = isWeekend ? 'bg-gray-100' : '';

                            return (
                                <TableRow key={day.toString()} className={cn(weekendClass, eventClass)}>
                                <TableCell></TableCell>
                                <TableCell>{format(day, 'd/M')}</TableCell>
                                <TableCell>{format(day, 'EEE', { locale: es })}.</TableCell>
                                <TableCell className="text-center">
                                    {dayEvent ? (
                                        <Badge variant="outline" className="border-primary/50 text-xs">
                                          {eventTypes[dayEvent.type].label}
                                        </Badge>
                                    ) : (isWeekend ? 'Fin de semana' : 'Laborable')}
                                </TableCell>
                                </TableRow>
                            )
                           })}
                        </React.Fragment>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
