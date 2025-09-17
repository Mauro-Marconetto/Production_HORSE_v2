
"use client";

import React, { useState } from "react";
import { format, getMonth, getYear, startOfYear, endOfYear, eachDayOfInterval, getISODay, getISOWeek } from "date-fns";
import { es } from 'date-fns/locale';
import { RotateCcw } from "lucide-react";

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
import { Button } from "@/components/ui/button";

import { calendarEvents as initialEvents } from "@/lib/data";
import type { CalendarEvent } from "@/lib/types";
import { cn } from "@/lib/utils";

const eventTypes: { [key: string]: { label: string, className: string } } = {
  feriado: { label: "Feriado", className: "bg-red-100 dark:bg-red-900/50" },
  vacaciones: { label: "Vacaciones", className: "bg-blue-100 dark:bg-blue-900/50" },
  mantenimiento: { label: "Mantenimiento", className: "bg-yellow-100 dark:bg-yellow-800/50" },
  arranque: { label: "Arranque/Parada", className: "bg-purple-100 dark:bg-purple-900/50" },
};

const weekendClass = 'bg-muted/50';

export default function CalendarPage() {
  const [events, setEvents] = useState<CalendarEvent[]>(initialEvents);
  const [year, setYear] = useState(new Date().getFullYear());

  const handleEventTypeChange = (date: Date, type: string) => {
    const dateString = format(date, 'yyyy-MM-dd');
    setEvents(prevEvents => {
      const existingEventIndex = prevEvents.findIndex(e => e.date === dateString);
      if (type === 'laborable') {
        if (existingEventIndex !== -1) {
          return prevEvents.filter((_, index) => index !== existingEventIndex);
        }
      } else {
        const newEvent: CalendarEvent = {
          id: `evt-${dateString}`,
          machineId: 'all',
          date: dateString,
          type: type as CalendarEvent['type'],
          description: eventTypes[type].label,
        };
        if (existingEventIndex !== -1) {
          const updatedEvents = [...prevEvents];
          updatedEvents[existingEventIndex] = newEvent;
          return updatedEvents;
        } else {
          return [...prevEvents, newEvent];
        }
      }
      return prevEvents;
    });
  };

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
          <h1 className="text-3xl font-headline font-bold">Calendario de Disponibilidad {year}</h1>
          <p className="text-muted-foreground">
            Gestiona los días no productivos para toda la planta. Los fines de semana no son laborables por defecto.
          </p>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {Object.entries(daysByMonth).map(([monthIndex, days]) => {
          const monthName = format(days[0], 'MMMM', { locale: es });
          
          const workingDays = days.filter(day => {
            const dayOfWeek = getISODay(day); // 1 (Mon) - 7 (Sun)
            const isSunday = dayOfWeek === 7;
            const dateString = format(day, 'yyyy-MM-dd');
            const dayEvent = events.find(e => e.date === dateString);
            return !isSunday && !dayEvent;
          }).length;

          return (
            <div key={monthIndex}>
              <h3 className="text-xl font-semibold text-center mb-2 capitalize">
                {monthName} <span className="text-base font-normal text-muted-foreground">({workingDays} días)</span>
              </h3>
              <Table className="border rounded-lg">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[15%] text-center">Sem</TableHead>
                    <TableHead className="w-[25%] text-center">Fecha</TableHead>
                    <TableHead className="w-[20%]">Día</TableHead>
                    <TableHead className="w-[40%]">Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {days.map(day => {
                    const dayOfWeek = getISODay(day); // 1 (Mon) - 7 (Sun)
                    const isSunday = dayOfWeek === 7;
                    const dateString = format(day, 'yyyy-MM-dd');
                    const dayEvent = events.find(e => e.date === dateString);

                    let rowClass = '';
                    if (dayEvent) {
                      rowClass = eventTypes[dayEvent.type].className;
                    } else if (isSunday) {
                      rowClass = weekendClass;
                    }
                    
                    return (
                      <TableRow key={dateString} className={cn(rowClass)}>
                        <TableCell className="text-center font-mono text-xs">S{getISOWeek(day)}</TableCell>
                        <TableCell className="text-center font-mono text-xs">{format(day, 'dd/MM')}</TableCell>
                        <TableCell className="text-sm capitalize">{format(day, 'EEE', { locale: es })}.</TableCell>
                        <TableCell className="p-1">
                          {isSunday ? (
                            <span className="text-sm text-muted-foreground pl-2">Fin de semana</span>
                          ) : (
                            <div className="flex items-center">
                              <Select 
                                onValueChange={(value) => handleEventTypeChange(day, value)} 
                                value={dayEvent?.type || 'laborable'}
                              >
                                <SelectTrigger className="h-8 text-xs focus:ring-0 focus:ring-offset-0 border-0 bg-transparent flex-grow">
                                  <SelectValue placeholder="Laborable" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="laborable" className="text-xs">Laborable</SelectItem>
                                  {Object.entries(eventTypes).map(([key, { label }]) => (
                                    <SelectItem key={key} value={key} className="text-xs">{label}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              {dayEvent && (
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6"
                                    onClick={() => handleEventTypeChange(day, 'laborable')}
                                >
                                    <RotateCcw className="h-3 w-3" />
                                </Button>
                              )}
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          );
        })}
      </div>
    </main>
  );
}
