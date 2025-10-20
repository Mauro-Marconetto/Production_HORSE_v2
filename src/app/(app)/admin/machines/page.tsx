
'use client';

import { useState, useMemo } from 'react';
import { collection, doc, setDoc, deleteDoc } from 'firebase/firestore';
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
import { MoreHorizontal, PlusCircle, Loader2, Trash2 } from 'lucide-react';
import type { Machine } from '@/lib/types';
import { productionCapacities, pieces, molds } from "@/lib/data"; // Capacities still from static data

export default function AdminMachinesPage() {
  const firestore = useFirestore();
  const { toast } = useToast();

  const machinesCollection = useMemoFirebase(() => firestore ? collection(firestore, 'machines') : null, [firestore]);
  const { data: machines, isLoading: isLoadingMachines } = useCollection<Machine>(machinesCollection);

  const [isSaving, setIsSaving] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedMachine, setSelectedMachine] = useState<Machine | null>(null);

  const openNewMachineDialog = () => {
    setSelectedMachine(null);
    setIsDialogOpen(true);
  };

  const openEditMachineDialog = (machine: Machine) => {
    setSelectedMachine(machine);
    setIsDialogOpen(true);
  };

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!firestore) return;

    setIsSaving(true);
    const formData = new FormData(e.currentTarget);
    
    const machineId = selectedMachine ? selectedMachine.id : `M${Date.now()}`;
    const machineData: Machine = {
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

      <div className="grid gap-6">
        {isLoadingMachines && (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        )}
        {!isLoadingMachines && machines?.map((machine) => {
          const capacities = productionCapacities.filter(c => c.machineId === machine.id);
          return (
            <Card key={machine.id}>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-2xl">{machine.nombre}</CardTitle>
                  <CardDescription>
                    Tonelaje: {machine.tonelaje}T | Turnos/Semana: {machine.turnosSemana} | OEE Objetivo: {machine.OEE_obj * 100}%
                  </CardDescription>
                </div>
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
              </CardHeader>
              <CardContent>
                <h4 className="mb-2 font-semibold text-muted-foreground">Capacidades de Producción (Datos Estáticos)</h4>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Pieza/Molde</TableHead>
                      <TableHead className="text-right">Producción por Hora</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {capacities.length > 0 ? capacities.map((cap) => {
                      const piece = pieces.find(p => p.id === cap.pieceId);
                      const mold = molds.find(m => m.id === cap.moldId);
                      return (
                        <TableRow key={`${cap.machineId}-${cap.pieceId}-${cap.moldId}`}>
                          <TableCell className="font-mono">{piece?.codigo}/{mold?.nombre}</TableCell>
                          <TableCell className="text-right font-medium">{cap.produccionHora.toLocaleString()} uds./hr</TableCell>
                        </TableRow>
                      );
                    }) : (
                      <TableRow>
                        <TableCell colSpan={2} className="text-center text-muted-foreground">
                          No hay capacidades de producción definidas para esta máquina.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
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
    </main>
  );
}

    