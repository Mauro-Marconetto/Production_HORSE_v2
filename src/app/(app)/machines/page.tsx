
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
import type { Machine, Mold, ProductionAssignment, Piece } from '@/lib/types';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { addDays, format, isWithinInterval } from 'date-fns';
import { DateRange } from 'react-day-picker';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Wind } from 'lucide-react';

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
  const [machineType, setMachineType] = useState<Machine['type'] | ''>('');
  
  const [assignmentDate, setAssignmentDate] = useState<DateRange | undefined>();
  const [assignmentMoldId, setAssignmentMoldId] = useState<string>("");
  const [assignmentPieceId, setAssignmentPieceId] = useState<string>("");
  const [assignmentQty, setAssignmentQty] = useState<number>(0);
  const [editingAssignmentId, setEditingAssignmentId] = useState<string | null>(null);

  useEffect(() => {
    if (isDialogOpen) {
      setMachineType(selectedMachine?.type || 'inyectora');
    }
  }, [isDialogOpen, selectedMachine]);
  
  useEffect(() => {
    if (selectedMachine && machines) {
        const updatedMachine = machines.find(m => m.id === selectedMachine.id);
        if (updatedMachine) {
            setSelectedMachine(updatedMachine);
        }
    }
  }, [machines, selectedMachine]);

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
    setAssignmentPieceId("");
    setAssignmentQty(0);
    setEditingAssignmentId(null);
  }

  const handleEditAssignmentClick = (assignment: ProductionAssignment) => {
    setEditingAssignmentId(assignment.id);
    setAssignmentMoldId(assignment.moldId || "");
    setAssignmentPieceId(assignment.pieceId || "");
    setAssignmentQty(assignment.qty || 0);
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
    const type = formData.get('type') as Machine['type'];
    const machineData: Omit<Machine, 'assignments'> = {
      id: machineId,
      nombre: formData.get('nombre') as string,
      type: type,
      tonelaje: type === 'inyectora' ? Number(formData.get('tonelaje')) : 0,
      turnosSemana: Number(formData.get('turnosSemana')),
      horasTurno: Number(formData.get('horasTurno')),
      OEE_obj: Number(formData.get('OEE_obj')) / 100, // Convert from % to decimal
      produccionHora: Number(formData.get('produccionHora')),
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
    if (!firestore || !selectedMachine || !assignmentDate?.from || !assignmentDate?.to) {
        toast({ title: "Error", description: "Completa el rango de fechas para añadir la programación.", variant: "destructive"});
        return;
    }

    const isInjection = selectedMachine.type === 'inyectora';
    if (isInjection && !assignmentMoldId) {
        toast({ title: "Error", description: "Selecciona un molde para la inyectora.", variant: "destructive"});
        return;
    }
    if (!isInjection && (!assignmentPieceId || !assignmentQty)) {
        toast({ title: "Error", description: "Selecciona una pieza y una cantidad para la granalladora.", variant: "destructive"});
        return;
    }


    setIsSaving(true);
    const machineDocRef = doc(firestore, 'machines', selectedMachine.id);
    let updatedAssignments = [...(selectedMachine.assignments || [])];

    const newAssignmentData = {
        startDate: assignmentDate.from.toISOString(),
        endDate: assignmentDate.to.toISOString(),
        ...(isInjection 
            ? { moldId: assignmentMoldId, pieceId: null, qty: null } 
            : { moldId: null, pieceId: assignmentPieceId, qty: assignmentQty })
    };

    if (editingAssignmentId) {
        // Update existing assignment
        const assignmentIndex = updatedAssignments.findIndex(a => a.id === editingAssignmentId);
        if (assignmentIndex > -1) {
            const currentAssignment = updatedAssignments[assignmentIndex];
            updatedAssignments[assignmentIndex] = {
                ...currentAssignment,
                ...newAssignmentData
            }
        }
    } else {
        // Add new assignment
        const newAssignment: ProductionAssignment = {
            id: `ASGN-${Date.now()}`,
            ...newAssignmentData,
        };
        updatedAssignments.push(newAssignment);
    }

    try {
        await updateDoc(machineDocRef, {
            assignments: updatedAssignments
        });
        toast({ title: "Éxito", description: `Programación ${editingAssignmentId ? 'actualizada' : 'añadida'}.`});
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
    const updatedAssignments = selectedMachine.assignments?.filter(a => a.id !== assignmentId) || [];

    try {
        await updateDoc(machineDocRef, { assignments: updatedAssignments });
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

  const currentAssignmentForMachine = (machine: Machine): ProductionAssignment | null => {
    if (!machine.assignments) return null;
    const today = new Date();
    const currentAssignment = machine.assignments.find(a => 
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
        {(isLoadingMachines || isLoadingMolds || isLoadingPieces) && (
            <div className="flex items-center justify-center py-12 col-span-2">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        )}
        {!isLoadingMachines && machines?.map((machine) => {
          const currentAssignment = currentAssignmentForMachine(machine);
          const currentMold = currentAssignment?.moldId ? molds?.find(m => m.id === currentAssignment.moldId) : null;
          const currentPiece = currentAssignment?.pieceId ? pieces?.find(p => p.id === currentAssignment.pieceId) : null;
          
          return (
            <Card key={machine.id}>
              <CardHeader className="flex flex-row items-start justify-between">
                <div>
                  <CardTitle className="text-2xl flex items-center gap-2">
                    {machine.nombre}
                    <Badge variant="outline" className="text-sm">{machine.type === 'inyectora' ? 'Inyectora' : 'Granalladora'}</Badge>
                    </CardTitle>
                  <CardDescription>
                     {currentAssignment ? (
                        <>
                            {machine.type === 'inyectora' && `Molde actual: ${currentMold?.nombre}`}
                            {machine.type === 'granalladora' && `Pieza actual: ${currentPiece?.codigo}`}
                            <span className="text-xs ml-2">
                                (del {format(new Date(currentAssignment!.startDate), 'dd/MM/yy')} al {format(new Date(currentAssignment!.endDate), 'dd/MM/yy')})
                            </span>
                        </>
                    ) : 'Sin programación activa'}
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
                    {machine.type === 'inyectora' && (
                        <>
                            <div><span className="font-medium">Tonelaje:</span> {machine.tonelaje}T</div>
                        </>
                    )}
                    <div><span className="font-medium">Turnos/Semana:</span> {machine.turnosSemana}</div>
                    <div><span className="font-medium">OEE Obj.:</span> {machine.OEE_obj * 100}%</div>
                    <div><span className="font-medium">Producción/Hora:</span> {machine.produccionHora} u/h</div>
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
                <Label htmlFor="type" className="text-right">Tipo</Label>
                <Select name="type" value={machineType} onValueChange={(v) => setMachineType(v as Machine['type'])}>
                    <SelectTrigger className="col-span-3">
                        <SelectValue placeholder="Selecciona un tipo" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="inyectora">Inyectora</SelectItem>
                        <SelectItem value="granalladora">Granalladora</SelectItem>
                    </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="produccionHora" className="text-right">Prod. por Hora</Label>
                <Input id="produccionHora" name="produccionHora" type="number" defaultValue={selectedMachine?.produccionHora || ''} className="col-span-3" required />
              </div>

              {machineType === 'inyectora' && (
                <>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="tonelaje" className="text-right">Tonelaje (T)</Label>
                        <Input id="tonelaje" name="tonelaje" type="number" defaultValue={selectedMachine?.tonelaje || ''} className="col-span-3" required />
                    </div>
                </>
              )}
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
                <DialogTitle>Programador para {selectedMachine?.nombre}</DialogTitle>
                <DialogDescription>
                    Asigna qué se producirá en esta máquina y durante qué fechas. Haz clic en una programación existente para editarla.
                </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-8 py-4">
                <div className="space-y-4">
                    <h4 className="font-semibold text-lg border-b pb-2">{editingAssignmentId ? 'Editar Programación' : 'Nueva Programación'}</h4>
                    {selectedMachine?.type === 'inyectora' ? (
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
                    ) : (
                        <>
                         <div className="space-y-2">
                            <Label>1. Selecciona una Pieza</Label>
                            <Select value={assignmentPieceId} onValueChange={setAssignmentPieceId}>
                                <SelectTrigger><SelectValue placeholder="Elige una pieza..." /></SelectTrigger>
                                <SelectContent>
                                    {pieces?.filter(p => p.requiereGranallado).map(p => (
                                        <SelectItem key={p.id} value={p.id}>{p.codigo}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                         </div>
                         <div className="space-y-2">
                            <Label htmlFor="qty">2. Cantidad a Producir</Label>
                            <Input id="qty" type="number" value={assignmentQty} onChange={(e) => setAssignmentQty(Number(e.target.value))} placeholder="Ej: 5000" />
                         </div>
                        </>
                    )}
                     <div className="space-y-2">
                        <Label>Paso final: Selecciona un Rango de Fechas</Label>
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
                        {selectedMachine?.assignments && selectedMachine.assignments.length > 0 ? (
                            selectedMachine.assignments.sort((a,b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime()).map(assignment => {
                                const mold = molds?.find(m => m.id === assignment.moldId);
                                const piece = pieces?.find(p => p.id === assignment.pieceId);
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
                                            <p className="font-semibold">{mold?.nombre || piece?.codigo}</p>
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
