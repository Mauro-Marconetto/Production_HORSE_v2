
"use client";

import { useState, useTransition, useMemo } from "react";
import {
  BrainCircuit,
  FileDown,
  Play,
  SlidersHorizontal,
} from "lucide-react";
import { format, addWeeks } from "date-fns";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";

import type { PlanAssignment, Machine, Mold, Piece } from "@/lib/types";
import { runGeneratePlan } from "./actions";
import { useToast } from "@/hooks/use-toast";

interface PlannerClientProps {
  initialAssignments: PlanAssignment[];
  machines: Machine[];
  molds: Mold[];
  pieces: Piece[];
}

const HOURS_PER_WEEK = 120; // total available hours

// Helper to get week string in YYYYWW format
const getWeekString = (date: Date) => {
    return format(date, "yyyy") + format(date, "I").padStart(2, '0');
};

export default function PlannerClient({
  initialAssignments,
  machines,
  molds,
  pieces,
}: PlannerClientProps) {
  const [assignments, setAssignments] = useState(initialAssignments);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  const [oee, setOee] = useState(80);
  const [scrap, setScrap] = useState(5);
  const [shifts, setShifts] = useState(15);
  const [planningWeeks, setPlanningWeeks] = useState(4);

  const weeks = useMemo(() => {
    const today = new Date();
    return Array.from({ length: planningWeeks }, (_, i) => getWeekString(addWeeks(today, i)));
  }, [planningWeeks]);


  const handleGeneratePlan = () => {
    startTransition(async () => {
      const result = await runGeneratePlan({
        oee: oee / 100,
        scrap: scrap / 100,
        shifts,
        weeks: planningWeeks,
      });
      if (result.success) {
        // Filter assignments to only include the selected weeks
        const newAssignments = result.plan.filter((a: PlanAssignment) => weeks.includes(a.semana));
        setAssignments(newAssignments);
        toast({
          title: "Plan Generado",
          description: "El nuevo plan de producción se ha generado correctamente.",
        });
      } else {
        toast({
          title: "Error",
          description: result.error,
          variant: "destructive",
        });
      }
    });
  };

  return (
    <TooltipProvider>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-headline font-bold">Planificador de Producción</h1>
          <p className="text-muted-foreground">
            Programa semanal para todas las máquinas.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <FileDown className="mr-2 h-4 w-4" /> Exportar Plan
          </Button>
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline">
                <SlidersHorizontal className="mr-2 h-4 w-4" /> Simulación
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Escenario de Simulación</DialogTitle>
                <DialogDescription>
                  Ajusta los parámetros para simular un nuevo plan.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                 <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="weeks" className="text-right">
                    Semanas
                  </Label>
                  <Slider
                    id="weeks"
                    value={[planningWeeks]}
                    onValueChange={(value) => setPlanningWeeks(value[0])}
                    min={1}
                    max={12}
                    step={1}
                    className="col-span-2"
                  />
                  <span className="text-sm font-medium">{planningWeeks} sem.</span>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="oee" className="text-right">
                    OEE
                  </Label>
                  <Slider
                    id="oee"
                    defaultValue={[oee]}
                    onValueChange={(value) => setOee(value[0])}
                    max={100}
                    step={1}
                    className="col-span-2"
                  />
                  <span className="text-sm font-medium">{oee}%</span>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="scrap" className="text-right">
                    Scrap
                  </Label>
                  <Slider
                    id="scrap"
                    defaultValue={[scrap]}
                    onValueChange={(value) => setScrap(value[0])}
                    max={20}
                    step={0.5}
                    className="col-span-2"
                  />
                  <span className="text-sm font-medium">{scrap.toFixed(1)}%</span>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="shifts" className="text-right">
                    Turnos
                  </Label>
                  <Slider
                    id="shifts"
                    defaultValue={[shifts]}
                    onValueChange={(value) => setShifts(value[0])}
                    max={21}
                    step={1}
                    className="col-span-2"
                  />
                  <span className="text-sm font-medium">{shifts}/sem</span>
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleGeneratePlan} disabled={isPending}>
                  {isPending ? "Simulando..." : "Ejecutar Simulación"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Button onClick={handleGeneratePlan} disabled={isPending}>
            <BrainCircuit className="mr-2 h-4 w-4" />{" "}
            {isPending ? "Generando..." : "Generar Plan Sugerido"}
          </Button>
          <Button variant="default" className="bg-green-600 hover:bg-green-700">
            <Play className="mr-2 h-4 w-4" /> Publicar Plan
          </Button>
        </div>
      </div>
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[150px] sticky left-0 bg-card z-10">
                    Máquina
                  </TableHead>
                  {weeks.map((week) => (
                    <TableHead key={week} className="text-center min-w-[200px]">
                      Semana {week.substring(4)}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {machines.map((machine) => (
                  <TableRow key={machine.id}>
                    <TableCell className="font-medium sticky left-0 bg-card z-10">
                      {machine.nombre}
                    </TableCell>
                    {weeks.map((week) => {
                      const weekAssignments = assignments.filter(
                        (a) => a.machineId === machine.id && a.semana === week
                      );

                      const totalHours = weekAssignments.reduce(
                        (sum, a) => sum + a.horas,
                        0
                      );

                      return (
                        <TableCell key={week} className="p-1 align-top h-32">
                          <div className="h-full w-full bg-muted rounded-md p-1 flex flex-col gap-1 relative">
                            {weekAssignments.map((a) => {
                              const piece = pieces.find(
                                (p) => p.id === a.pieceId
                              );
                              const mold = molds.find(
                                (m) => m.id === a.moldId
                              );
                              const widthPercentage =
                                (a.horas / HOURS_PER_WEEK) * 100;
                              return (
                                <Tooltip key={a.id}>
                                  <TooltipTrigger asChild>
                                    <div
                                      className="bg-primary/20 border border-primary text-primary-foreground p-1 rounded-md text-xs hover:bg-primary/40 cursor-pointer"
                                      style={{
                                        height: `${widthPercentage}%`,
                                        minHeight: '24px'
                                      }}
                                    >
                                      <p className="font-bold truncate">
                                        {piece?.codigo}
                                      </p>
                                      <p className="text-xs truncate">
                                        {mold?.nombre}
                                      </p>
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p className="font-bold">
                                      {piece?.codigo} ({mold?.nombre})
                                    </p>
                                    <p>
                                      Producción: {a.prodUnidades.toLocaleString()}{" "}
                                      unidades
                                    </p>
                                    <p>Horas: {a.horas}</p>
                                    {a.setup && <p>Incluye tiempo de preparación</p>}
                                  </TooltipContent>
                                </Tooltip>
                              );
                            })}
                            <div className="absolute bottom-1 right-1 text-xs text-muted-foreground font-mono">
                                {totalHours.toFixed(0)}h / {HOURS_PER_WEEK}h
                            </div>
                          </div>
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}

    