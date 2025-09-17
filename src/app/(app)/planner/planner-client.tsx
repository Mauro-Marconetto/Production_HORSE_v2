"use client";

import { useState, useTransition } from "react";
import {
  BrainCircuit,
  FileDown,
  Play,
  SlidersHorizontal,
} from "lucide-react";

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

const WEEKS = ["202426", "202427", "202428", "202429"];
const HOURS_PER_WEEK = 120; // total available hours

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

  const handleGeneratePlan = () => {
    startTransition(async () => {
      const result = await runGeneratePlan({
        oee: oee / 100,
        scrap: scrap / 100,
        shifts,
      });
      if (result.success) {
        setAssignments(result.plan);
        toast({
          title: "Plan Generated",
          description: "The new production plan has been successfully generated.",
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
          <h1 className="text-3xl font-headline font-bold">Production Planner</h1>
          <p className="text-muted-foreground">
            Weekly schedule for all machines.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <FileDown className="mr-2 h-4 w-4" /> Export Plan
          </Button>
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline">
                <SlidersHorizontal className="mr-2 h-4 w-4" /> What-If
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>What-If Scenario</DialogTitle>
                <DialogDescription>
                  Adjust parameters to simulate a new plan.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
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
                    Shifts
                  </Label>
                  <Slider
                    id="shifts"
                    defaultValue={[shifts]}
                    onValueChange={(value) => setShifts(value[0])}
                    max={21}
                    step={1}
                    className="col-span-2"
                  />
                  <span className="text-sm font-medium">{shifts}/week</span>
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleGeneratePlan} disabled={isPending}>
                  {isPending ? "Simulating..." : "Run Simulation"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Button onClick={handleGeneratePlan} disabled={isPending}>
            <BrainCircuit className="mr-2 h-4 w-4" />{" "}
            {isPending ? "Generating..." : "Generate Suggested Plan"}
          </Button>
          <Button variant="default" className="bg-green-600 hover:bg-green-700">
            <Play className="mr-2 h-4 w-4" /> Publish Plan
          </Button>
        </div>
      </div>
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table className="min-w-full">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[150px] sticky left-0 bg-card z-10">
                    Machine
                  </TableHead>
                  {WEEKS.map((week) => (
                    <TableHead key={week} className="text-center">
                      Week {week.substring(4)}
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
                    {WEEKS.map((week) => {
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
                                      Production: {a.prodUnidades.toLocaleString()}{" "}
                                      units
                                    </p>
                                    <p>Hours: {a.horas}</p>
                                    {a.setup && <p>Includes setup time</p>}
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
