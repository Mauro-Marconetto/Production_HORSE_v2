
"use client";

import { useState } from "react";
import { format } from "date-fns";
import { es } from 'date-fns/locale';
import { Calendar as CalendarIcon, PlusCircle, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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

import { machines, calendarEvents as initialEvents } from "@/lib/data";
import type { CalendarEvent, Machine } from "@/lib/types";
import { cn } from "@/lib/utils";

const eventTypes = {
  feriado: { label: "Feriado", className: "bg-red-500 text-white" },
  vacaciones: { label: "Vacaciones", className: "bg-blue-500 text-white" },
  mantenimiento: { label: "Mantenimiento", className: "bg-yellow-500 text-black" },
  arranque: { label: "Arranque/Parada", className: "bg-purple-500 text-white" },
};

export default function CalendarPage() {
  const [events, setEvents] = useState<CalendarEvent[]>(initialEvents);
  const [selectedMachine, setSelectedMachine] = useState<string>(machines[0].id);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleAddEvent = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const newEvent: CalendarEvent = {
      id: `evt-${Date.now()}`,
      machineId: selectedMachine,
      date: format(selectedDate!, "yyyy-MM-dd"),
      type: formData.get("type") as CalendarEvent["type"],
      description: formData.get("description") as string,
    };
    setEvents([...events, newEvent]);
    setIsDialogOpen(false);
  };

  const handleDeleteEvent = (eventId: string) => {
    setEvents(events.filter((event) => event.id !== eventId));
  };
  
  const filteredEvents = events.filter(e => e.machineId === selectedMachine);

  return (
    <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-headline font-bold">Calendario de Disponibilidad</h1>
          <p className="text-muted-foreground">
            Gestiona feriados, vacaciones y paradas de máquina.
          </p>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="lg:col-span-3">
          <CardHeader>
            <div className="flex justify-between items-start">
                <div>
                    <CardTitle>Seleccionar Máquina y Fecha</CardTitle>
                    <CardDescription>
                        Marca los días no productivos en el calendario.
                    </CardDescription>
                </div>
                <Select value={selectedMachine} onValueChange={setSelectedMachine}>
                    <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Seleccionar máquina" />
                    </SelectTrigger>
                    <SelectContent>
                    {machines.map((machine) => (
                        <SelectItem key={machine.id} value={machine.id}>
                        {machine.nombre}
                        </SelectItem>
                    ))}
                    </SelectContent>
                </Select>
            </div>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              locale={es}
              className="rounded-md border"
              components={{
                DayContent: ({ date }) => {
                  const dayEvents = filteredEvents.filter(e => format(new Date(`${e.date}T00:00:00`), 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd'));
                  return (
                    <div className="relative h-full w-full flex items-center justify-center">
                      <span className="relative z-10">{format(date, "d")}</span>
                      {dayEvents.length > 0 && (
                        <div className="absolute bottom-1 w-full flex justify-center gap-0.5">
                           {dayEvents.map(e => (
                               <div key={e.id} className={cn('h-1 w-1 rounded-full', eventTypes[e.type].className)}></div>
                           ))}
                        </div>
                      )}
                    </div>
                  );
                },
              }}
            />
          </CardContent>
        </Card>
        <Card className="lg:col-span-4">
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>Eventos Programados</CardTitle>
                <CardDescription>
                  Eventos para la máquina <span className="font-bold">{machines.find(m=>m.id === selectedMachine)?.nombre}</span>.
                </CardDescription>
              </div>
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button disabled={!selectedDate}>
                    <PlusCircle className="mr-2 h-4 w-4" /> Añadir Evento
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Añadir Nuevo Evento</DialogTitle>
                    <DialogDescription>
                      {`Añadir evento para el día ${selectedDate ? format(selectedDate, "PPP", {locale: es}) : ''} en la máquina ${machines.find(m => m.id === selectedMachine)?.nombre}`}
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleAddEvent}>
                    <div className="grid gap-4 py-4">
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="type" className="text-right">
                          Tipo
                        </Label>
                        <Select name="type" required>
                          <SelectTrigger className="col-span-3">
                            <SelectValue placeholder="Seleccionar tipo de evento" />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(eventTypes).map(([key, value]) => (
                                <SelectItem key={key} value={key}>{value.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="description" className="text-right">
                          Descripción
                        </Label>
                        <Textarea id="description" name="description" className="col-span-3" />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button type="submit">Guardar Evento</Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Fecha</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Descripción</TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {filteredEvents.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()).map(event => (
                        <TableRow key={event.id}>
                            <TableCell>{format(new Date(`${event.date}T00:00:00`), "PPP", { locale: es })}</TableCell>
                            <TableCell>
                                <Badge className={cn('text-xs', eventTypes[event.type].className)}>
                                    {eventTypes[event.type].label}
                                </Badge>
                            </TableCell>
                            <TableCell>{event.description}</TableCell>
                            <TableCell className="text-right">
                                <Button variant="ghost" size="icon" onClick={() => handleDeleteEvent(event.id)}>
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
