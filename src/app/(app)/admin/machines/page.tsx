
'use client';

import { useState, useMemo, useEffect } from 'react';
import { collection, doc, setDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { MoreHorizontal, PlusCircle, Loader2, Trash2, CalendarDays, Edit } from 'lucide-react';
import type { Machine, Mold, MoldAssignment, Piece } from '@/lib/types';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { addDays, format, isWithinInterval } from 'date-fns';
import { DateRange } from 'react-day-picker';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

export default function AdminMachinesPage() {
  const firestore = useFirestore();
  const { toast } = useToast();

  const machinesCollection = useMemoFirebase(() => firestore ? collection(firestore, 'machines') : null, [firestore]);
  const { data: machines, isLoading: isLoadingMachines, forceRefresh: refreshMachines } = useCollection<Machine>(machinesCollection);

  const moldsCollection = useMemoFirebase(() => firestore ? collection(firestore, 'molds') : null, [firestore]);
  const { data: molds, isLoading: isLoadingMolds } = useCollection<Mold>(moldsCollection);
  
  const piecesCollection = useMemoFirebase(() => firestore ? collection(firestore, 'pieces') : null, [firestore]);
  const { data: pieces, isLoading: isLoadingPieces } = useCollection<Piece>(piecesCollection);

  const [isSaving, setIsSaving] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSchedulerOpen, setIsSchedulerOpen] = useState(false);

  const [selectedMachine, setSelectedMachine] = useState<Machine | null>(null);
  
  const [assignmentDate, setAssignmentDate] = useState<DateRange | undefined>();
  const [assignmentMoldId, setAssignmentMoldId] = useState<string>("");
  const [editingAssignmentId, setEditingAssignmentId] = useState<string | null>(null);

  const openNewMachineDialog = () => {
    setSelectedMachine(null);
    setIsDialogOpen(true);
  };

  const openEditMachineDialog = (machine: Machine) => {
    setSelectedMachine(machine);
    setIsDialogOpen(true);
  };

  const openSchedulerDialog = (machine: Machine) => {
    setSelectedMachine(machine);
    resetSchedulerForm();
    setIsSchedulerOpen(true);
  }

  const resetSchedulerForm = () => {
    setAssignmentDate(undefined);
    setAssignmentMoldId("");
    setEditingAssignmentId(null);
  }

  const handleEditAssignmentClick = (assignment: MoldAssignment) => {
    setEditingAssignmentId(assignment.id);
    setAssignmentMoldId(assignment.moldId);
    setAssignmentDate({
        from: new Date(assignment.startDate),
        to: new Date(assignment.endDate),
    });
  }

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!firestore) return;

    setIsSaving(true);
    const formData = new FormData(e.currentTarget);
    
    const machineId = selectedMachine ? selectedMachine.id : `M${Date.now()}`;
    const machineData: Omit<Machine, 'moldAssignments'> = {
      id: machineId,
      nombre: formData.get('nombre') as string,
      tonelaje: Number(formData.get('tonelaje')),
      turnosSemana: Number(formData.get('turnosSemana')),
      horasTurno: Number(formData.get('horasTurno')),
      OEE_obj: Number(formData.get('OEE_obj')) / 100, // Convert from % to decimal
    };

    try {
      const machineDocRef = doc(firestore, 'machines', machineId);
      await setDoc(machineDocRef, machineData, { merge: true });

      toast({
        title: 'Éxito',
        description: `Máquina ${selectedMachine ? 'actualizada' : 'creada'} correctamente.`,
      });
      setIsDialogOpen(false);
    } catch (error: any) {
      console.error('Error saving machine:', error);
      toast({
        title: 'Error',
        description: error.message || 'No se pudo guardar la máquina.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (machineId: string) => {
    if (!firestore) return;
    try {
      await deleteDoc(doc(firestore, 'machines', machineId));
      toast({
        title: 'Máquina Eliminada',
        description: 'La máquina ha sido eliminada correctamente.',
      });
    } catch (error: any) {
      console.error('Error deleting machine:', error);
      toast({
        title: 'Error',
        description: 'No se pudo eliminar la máquina.',
        variant: 'destructive',
      });
    }
  };
  
  const handleSaveAssignment = async () => {
    if (!firestore || !selectedMachine || !assignmentMoldId || !assignmentDate?.from || !assignmentDate?.to) {
        toast({ title: "Error", description: "Completa todos los campos para añadir la programación.", variant: "destructive"});
        return;
    }

    setIsSaving(true);
    const machineDocRef = doc(firestore, 'machines', selectedMachine.id);
    let updatedAssignments = [...(selectedMachine.moldAssignments || [])];

    if (editingAssignmentId) {
        // Update existing assignment
        const assignmentIndex = updatedAssignments.findIndex(a => a.id === editingAssignmentId);
        if (assignmentIndex > -1) {
            updatedAssignments[assignmentIndex] = {
                ...updatedAssignments[assignmentIndex],
                moldId: assignmentMoldId,
                startDate: assignmentDate.from.toISOString(),
                endDate: assignmentDate.to.toISOString(),
            }
        }
    } else {
        // Add new assignment
        const newAssignment: MoldAssignment = {
            id: `ASGN-${Date.now()}`,
            moldId: assignmentMoldId,
            startDate: assignmentDate.from.toISOString(),
            endDate: assignmentDate.to.toISOString(),
        };
        updatedAssignments.push(newAssignment);
    }

    try {
        await updateDoc(machineDocRef, {
            moldAssignments: updatedAssignments
        });
        toast({ title: "Éxito", description: `Programación de molde ${editingAssignmentId ? 'actualizada' : 'añadida'}.`});
        resetSchedulerForm();
        refreshMachines();
    } catch (error: any) {
        toast({ title: "Error", description: error.message || "No se pudo guardar la programación.", variant: "destructive"});
    } finally {
        setIsSaving(false);
    }
  }
  
  const handleRemoveAssignment = async (assignmentId: string) => {
    if (!firestore || !selectedMachine) return;
    setIsSaving(true);
    const machineDocRef = doc(firestore, 'machines', selectedMachine.id);
    const updatedAssignments = selectedMachine.moldAssignments?.filter(a => a.id !== assignmentId) || [];

    try {
        await updateDoc(machineDocRef, { moldAssignments: updatedAssignments });
        toast({ title: "Éxito", description: "Programación eliminada." });
        if (editingAssignmentId === assignmentId) {
            resetSchedulerForm();
        }
        refreshMachines();
    } catch (error: any) {
        toast({ title: "Error", description: error.message || "No se pudo eliminar la programación.", variant: "destructive"});
    } finally {
        setIsSaving(false);
    }
  }
  
  const getPieceCode = (pieceId: string) => pieces?.find(p => p.id === pieceId)?.codigo || 'N/A';

  const currentAssignmentForMachine = (machine: Machine): MoldAssignment | null => {
    if (!machine.moldAssignments) return null;
    const today = new Date();
    const currentAssignment = machine.moldAssignments.find(a => 
        isWithinInterval(today, { start: new Date(a.startDate), end: new Date(a.endDate) })
    );
    return currentAssignment || null;
  }

  return (
    <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-headline font-bold">Catálogo de Máquinas</h1>
          <p className="text-muted-foreground">Gestiona las máquinas y sus capacidades de producción.</p>
        </div>
        <Button onClick={openNewMachineDialog}>
          <PlusCircle className="mr-2 h-4 w-4" /> Añadir Máquina
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {(isLoadingMachines || isLoadingMolds) && (
            <div className="flex items-center justify-center py-12 col-span-2">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        )}
        {!isLoadingMachines && machines?.map((machine) => {
          const currentAssignment = currentAssignmentForMachine(machine);
          const currentMold = currentAssignment ? molds?.find(m => m.id === currentAssignment.moldId) : null;
          
          return (
            <Card key={machine.id}>
              <CardHeader className="flex flex-row items-start justify-between">
                <div>
                  <CardTitle className="text-2xl">{machine.nombre}</CardTitle>
                  <CardDescription>
                    {currentMold ? (
                        <>
                        Molde actual: {currentMold.nombre}
                        <span className="text-xs ml-2">
                            (del {format(new Date(currentAssignment!.startDate), 'dd/MM/yy')} al {format(new Date(currentAssignment!.endDate), 'dd/MM/yy')})
                        </span>
                        </>
                    ) : 'Sin molde programado'}
                  </CardDescription>
                </div>
                <div className="flex items-center">
                    <Button variant="outline" size="sm" onClick={() => openSchedulerDialog(machine)}>
                        <CalendarDays className="mr-2 h-4 w-4"/>
                        Programar
                    </Button>
                    <AlertDialog>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Abrir menú</span>
                            <MoreHorizontal className="h-4 w-4" />
                        </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => openEditMachineDialog(machine)}>
                            Editar Máquina
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <AlertDialogTrigger asChild>
                            <DropdownMenuItem className="text-destructive focus:text-destructive focus:bg-destructive/10">
                            <Trash2 className="mr-2 h-4 w-4" />
                            Eliminar Máquina
                            </DropdownMenuItem>
                        </AlertDialogTrigger>
                        </DropdownMenuContent>
                    </DropdownMenu>
                    <AlertDialogContent>
                            <AlertDialogHeader>
                            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                            <AlertDialogDescription>
                                Esta acción no se puede deshacer. Esto eliminará permanentemente la máquina
                                y sus datos asociados.
                            </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                                className="bg-destructive hover:bg-destructive/90"
                                onClick={() => handleDelete(machine.id)}
                            >
                                Sí, eliminar
                            </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </div>
              </CardHeader>
              <CardContent>
                <h4 className="mb-2 font-semibold text-muted-foreground">Datos Operativos</h4>
                 <div className="grid grid-cols-3 gap-2 text-sm">
                    <div><span className="font-medium">Tonelaje:</span> {machine.tonelaje}T</div>
                    <div><span className="font-medium">Turnos/Semana:</span> {machine.turnosSemana}</div>
                    <div><span className="font-medium">OEE Obj.:</span> {machine.OEE_obj * 100}%</div>
                 </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedMachine ? 'Editar Máquina' : 'Añadir Nueva Máquina'}</DialogTitle>
            <DialogDescription>
              Completa los detalles de la máquina. Haz clic en guardar cuando hayas terminado.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSave}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="nombre" className="text-right">Nombre</Label>
                <Input id="nombre" name="nombre" defaultValue={selectedMachine?.nombre || ''} className="col-span-3" required />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="tonelaje" className="text-right">Tonelaje (T)</Label>
                <Input id="tonelaje" name="tonelaje" type="number" defaultValue={selectedMachine?.tonelaje || ''} className="col-span-3" required />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="turnosSemana" className="text-right">Turnos/Semana</Label>
                <Input id="turnosSemana" name="turnosSemana" type="number" defaultValue={selectedMachine?.turnosSemana || ''} className="col-span-3" required />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="horasTurno" className="text-right">Horas/Turno</Label>
                <Input id="horasTurno" name="horasTurno" type="number" defaultValue={selectedMachine?.horasTurno || ''} className="col-span-3" required />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="OEE_obj" className="text-right">OEE Objetivo (%)</Label>
                <Input id="OEE_obj" name="OEE_obj" type="number" defaultValue={(selectedMachine?.OEE_obj || 0) * 100} className="col-span-3" required min="0" max="100" />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {isSaving ? 'Guardando...' : 'Guardar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      
      <Dialog open={isSchedulerOpen} onOpenChange={setIsSchedulerOpen}>
        <DialogContent className="max-w-4xl">
            <DialogHeader>
                <DialogTitle>Programador de Moldes para {selectedMachine?.nombre}</DialogTitle>
                <DialogDescription>
                    Asigna qué molde estará en esta máquina y durante qué fechas. Haz clic en una programación existente para editarla.
                </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-8 py-4">
                <div className="space-y-4">
                    <h4 className="font-semibold text-lg border-b pb-2">{editingAssignmentId ? 'Editar Programación' : 'Nueva Programación'}</h4>
                    <div className="space-y-2">
                        <Label>1. Selecciona un Molde</Label>
                         <Select value={assignmentMoldId} onValueChange={setAssignmentMoldId}>
                            <SelectTrigger><SelectValue placeholder="Elige un molde..." /></SelectTrigger>
                            <SelectContent>
                                {molds?.filter(m => m.compatibilidad.includes(selectedMachine?.id || '')).map(m => (
                                    <SelectItem key={m.id} value={m.id}>{m.nombre} ({getPieceCode(m.pieces[0])})</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                     <div className="space-y-2">
                        <Label>2. Selecciona un Rango de Fechas</Label>
                         <Popover>
                            <PopoverTrigger asChild>
                            <Button
                                id="date"
                                variant={"outline"}
                                className={cn(
                                "w-full justify-start text-left font-normal",
                                !assignmentDate && "text-muted-foreground"
                                )}
                            >
                                <CalendarDays className="mr-2 h-4 w-4" />
                                {assignmentDate?.from ? (
                                assignmentDate.to ? (
                                    <>
                                    {format(assignmentDate.from, "LLL dd, y")} -{" "}
                                    {format(assignmentDate.to, "LLL dd, y")}
                                    </>
                                ) : (
                                    format(assignmentDate.from, "LLL dd, y")
                                )
                                ) : (
                                <span>Elige un rango</span>
                                )}
                            </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                                initialFocus
                                mode="range"
                                defaultMonth={assignmentDate?.from}
                                selected={assignmentDate}
                                onSelect={setAssignmentDate}
                                numberOfMonths={2}
                            />
                            </PopoverContent>
                        </Popover>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button onClick={handleSaveAssignment} disabled={isSaving}>
                            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                            {editingAssignmentId ? 'Guardar Cambios' : 'Añadir Programación'}
                        </Button>
                        {editingAssignmentId && (
                             <Button variant="outline" onClick={resetSchedulerForm}>
                                Cancelar Edición
                             </Button>
                        )}
                    </div>
                </div>
                <div className="space-y-4">
                     <h4 className="font-semibold text-lg border-b pb-2">Programaciones Activas</h4>
                     <div className="max-h-60 overflow-y-auto pr-2 space-y-2">
                        {selectedMachine?.moldAssignments && selectedMachine.moldAssignments.length > 0 ? (
                            selectedMachine.moldAssignments.sort((a,b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime()).map(assignment => {
                                const mold = molds?.find(m => m.id === assignment.moldId);
                                return (
                                    <div 
                                        key={assignment.id} 
                                        className={cn(
                                            "flex items-center justify-between p-2 border rounded-md cursor-pointer hover:bg-muted/50",
                                            editingAssignmentId === assignment.id && "bg-muted ring-2 ring-primary"
                                        )}
                                        onClick={() => handleEditAssignmentClick(assignment)}
                                    >
                                        <div>
                                            <p className="font-semibold">{mold?.nombre}</p>
                                            <p className="text-sm text-muted-foreground">
                                                {format(new Date(assignment.startDate), 'dd/MM/yy')} - {format(new Date(assignment.endDate), 'dd/MM/yy')}
                                            </p>
                                        </div>
                                        <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); handleRemoveAssignment(assignment.id); }}>
                                            <Trash2 className="h-4 w-4 text-destructive"/>
                                        </Button>
                                    </div>
                                )
                            })
                        ) : (
                            <p className="text-sm text-muted-foreground text-center py-8">No hay programaciones para esta máquina.</p>
                        )}
                     </div>
                </div>
            </div>
             <DialogFooter>
              <Button type="button" variant="secondary" onClick={() => setIsSchedulerOpen(false)}>Cerrar</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}

    