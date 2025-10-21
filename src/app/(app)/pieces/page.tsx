
'use client';

import { useState, useMemo, useEffect } from 'react';
import { collection, doc, setDoc, deleteDoc, writeBatch, getDoc, getDocs, query, where } from 'firebase/firestore';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { useToast } from '@/hooks/use-toast';

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
} from "@/components/ui/alert-dialog";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from '@/components/ui/checkbox';
import { MoreHorizontal, PlusCircle, Loader2, Trash2 } from 'lucide-react';
import type { Piece, Mold, Machine } from '@/lib/types';

export default function AdminPiecesPage() {
    const firestore = useFirestore();
    const { toast } = useToast();

    const piecesCollection = useMemoFirebase(() => firestore ? collection(firestore, 'pieces') : null, [firestore]);
    const { data: pieces, isLoading: isLoadingPieces } = useCollection<Piece>(piecesCollection);

    const moldsCollection = useMemoFirebase(() => firestore ? collection(firestore, 'molds') : null, [firestore]);
    const { data: molds, isLoading: isLoadingMolds, forceRefresh: refreshMolds } = useCollection<Mold>(moldsCollection);
    
    const machinesCollection = useMemoFirebase(() => firestore ? collection(firestore, 'machines') : null, [firestore]);
    const { data: machines, isLoading: isLoadingMachines } = useCollection<Machine>(machinesCollection);

    const [isSaving, setIsSaving] = useState(false);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [selectedPiece, setSelectedPiece] = useState<Piece | null>(null);
    const [currentMoldName, setCurrentMoldName] = useState<string>('');
    const [compatibleMachines, setCompatibleMachines] = useState<string[]>([]);
    
    const isLoading = isLoadingPieces || isLoadingMolds || isLoadingMachines;

    useEffect(() => {
        if (isDialogOpen) {
            if (selectedPiece) {
                const associatedMold = molds?.find(m => m.pieces.includes(selectedPiece.id));
                setCurrentMoldName(associatedMold?.nombre || '');
                setCompatibleMachines(associatedMold?.compatibilidad || []);
            } else {
                // Reset for new piece
                setCurrentMoldName('');
                setCompatibleMachines([]);
            }
        }
    }, [isDialogOpen, selectedPiece, molds]);

    const openNewPieceDialog = () => {
        setSelectedPiece(null);
        setIsDialogOpen(true);
    };

    const openEditPieceDialog = (piece: Piece) => {
        setSelectedPiece(piece);
        setIsDialogOpen(true);
    };

    const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!firestore) return;

        setIsSaving(true);
        const formData = new FormData(e.currentTarget);
        const pieceId = selectedPiece ? selectedPiece.id : `P${'(' + ')'}Date.now()}`;
        const codigo = formData.get('codigo') as string;
        const moldNameFromInput = (formData.get('moldName') as string).trim();

        if (!codigo || !moldNameFromInput) {
            toast({ title: 'Error', description: 'El código de la pieza y el nombre del molde son obligatorios.', variant: 'destructive' });
            setIsSaving(false);
            return;
        }

        try {
            const batch = writeBatch(firestore);

            // 1. Create or update the piece document
            const pieceDocRef = doc(firestore, 'pieces', pieceId);
            batch.set(pieceDocRef, { id: pieceId, codigo }, { merge: true });

            // 2. Find original mold if editing
            const originalMold = selectedPiece ? molds?.find(m => m.pieces.includes(selectedPiece.id)) : undefined;

            // 3. Find or create the new mold
            const moldsQuery = query(collection(firestore, 'molds'), where("nombre", "==", moldNameFromInput));
            const querySnapshot = await getDocs(moldsQuery);
            let newMoldRef: any;
            let newMoldData: Mold;

            if (!querySnapshot.empty) {
                // Mold exists, get its reference and data
                const existingMoldDoc = querySnapshot.docs[0];
                newMoldRef = existingMoldDoc.ref;
                newMoldData = existingMoldDoc.data() as Mold;
            } else {
                // Mold doesn't exist, create a new one
                const newMoldId = `MOLD-${'(' + ')'}Date.now()}`;
                newMoldRef = doc(firestore, 'molds', newMoldId);
                newMoldData = {
                    id: newMoldId,
                    nombre: moldNameFromInput,
                    pieces: [],
                    compatibilidad: compatibleMachines,
                    cavidades: 1, // Default value
                    cicloBase_s: 60, // Default value
                    setupMin: 240, // Default value
                    vidaMaxTiros: 500000, // Default value
                    tiempoRecambioMin: 120, // Default value
                    status: 'ok' // Default value
                };
            }
            
            // 4. Update mold associations
            // If the piece was associated with a different mold before, remove it
            if (originalMold && originalMold.id !== newMoldData.id) {
                const oldMoldRef = doc(firestore, 'molds', originalMold.id);
                const updatedOldMoldPieces = originalMold.pieces.filter(pId => pId !== pieceId);
                batch.update(oldMoldRef, { pieces: updatedOldMoldPieces });
            }

            // Add the piece to the new/existing mold's piece list
            const updatedNewMoldPieces = newMoldData.pieces.includes(pieceId) ? newMoldData.pieces : [...newMoldData.pieces, pieceId];
            
            // Update the mold with new piece association and machine compatibility
            batch.set(newMoldRef, { 
                ...newMoldData,
                pieces: updatedNewMoldPieces,
                compatibilidad: compatibleMachines 
            }, { merge: true });

            await batch.commit();
            
            toast({
                title: 'Éxito',
                description: `Pieza ${'(' + ')'}selectedPiece ? 'actualizada' : 'creada'} y molde asociado correctamente.`,
            });
            setIsDialogOpen(false);
            if (querySnapshot.empty) {
                refreshMolds(); // Refresh mold data if a new one was created
            }

        } catch (error: any) {
            console.error('Error saving piece and mold:', error);
            toast({
                title: 'Error',
                description: error.message || 'No se pudo guardar la pieza y el molde.',
                variant: 'destructive',
            });
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (pieceId: string) => {
        if (!firestore) return;
        try {
            const batch = writeBatch(firestore);
            const pieceDocRef = doc(firestore, 'pieces', pieceId);
            
            const associatedMold = molds?.find(m => m.pieces.includes(pieceId));
            if (associatedMold) {
                const moldRef = doc(firestore, 'molds', associatedMold.id);
                const updatedPieces = associatedMold.pieces.filter(pId => pId !== pieceId);
                batch.update(moldRef, { pieces: updatedPieces });
            }

            batch.delete(pieceDocRef);
            await batch.commit();

            toast({
                title: 'Pieza Eliminada',
                description: 'La pieza ha sido eliminada correctamente.',
            });
        } catch (error: any) {
            console.error('Error deleting piece:', error);
            toast({
                title: 'Error',
                description: 'No se pudo eliminar la pieza.',
                variant: 'destructive',
            });
        }
    };
    
    return (
        <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
            <div className="flex items-center justify-between">
                <div>
                <h1 className="text-3xl font-headline font-bold">Catálogo de Piezas y Moldes</h1>
                <p className="text-muted-foreground">Gestiona las piezas y sus moldes y máquinas asociadas.</p>
                </div>
                <Button onClick={openNewPieceDialog}>
                <PlusCircle className="mr-2 h-4 w-4" /> Añadir Pieza
                </Button>
            </div>
            <Card>
                <CardContent className="p-6">
                <Table>
                    <TableHeader>
                    <TableRow>
                        <TableHead>Pieza</TableHead>
                        <TableHead>Molde Asociado</TableHead>
                        <TableHead>Máquinas Compatibles</TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading && (
                            <TableRow>
                                <TableCell colSpan={4} className="h-24 text-center">
                                    <Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground" />
                                </TableCell>
                            </TableRow>
                        )}
                        {!isLoading && pieces?.map((piece) => {
                            const mold = molds?.find(m => m.pieces.includes(piece.id));
                            const compatibleMachineNames = mold?.compatibilidad
                                .map(machineId => machines?.find(m => m.id === machineId)?.nombre)
                                .filter(Boolean) || [];

                            return (
                                <TableRow key={piece.id}>
                                    <TableCell className="font-medium">{piece.codigo}</TableCell>
                                    <TableCell>
                                        {mold ? (
                                             <Badge variant={mold.status === 'ok' ? 'secondary' : 'destructive'}>
                                                {mold.nombre}
                                            </Badge>
                                        ) : (
                                            <span className="text-xs text-muted-foreground">Sin molde</span>
                                        )}
                                   </TableCell>
                                   <TableCell>
                                        <div className="flex flex-wrap gap-1">
                                            {compatibleMachineNames.length > 0 ? (
                                                compatibleMachineNames.map(name => <Badge key={name} variant="outline">{name}</Badge>)
                                            ) : (
                                                <span className="text-xs text-muted-foreground">No definido</span>
                                            )}
                                        </div>
                                   </TableCell>
                                    <TableCell className="text-right">
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
                                                <DropdownMenuItem onClick={() => openEditPieceDialog(piece)}>
                                                    Editar Pieza
                                                </DropdownMenuItem>
                                                <DropdownMenuSeparator />
                                                <AlertDialogTrigger asChild>
                                                    <DropdownMenuItem className="text-destructive focus:text-destructive focus:bg-destructive/10">
                                                        <Trash2 className="mr-2 h-4 w-4" />
                                                        Eliminar Pieza
                                                    </DropdownMenuItem>
                                                </AlertDialogTrigger>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                    Esta acción no se puede deshacer. Esto eliminará permanentemente la pieza y su asociación con el molde.
                                                </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                <AlertDialogAction
                                                    className="bg-destructive hover:bg-destructive/90"
                                                    onClick={() => handleDelete(piece.id)}
                                                >
                                                    Sí, eliminar
                                                </AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                         {!isLoading && (!pieces || pieces.length === 0) && (
                            <TableRow>
                                <TableCell colSpan={4} className="h-24 text-center">
                                    No se encontraron piezas.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
                </CardContent>
            </Card>

             <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent>
                <DialogHeader>
                    <DialogTitle>{selectedPiece ? 'Editar Pieza' : 'Añadir Nueva Pieza'}</DialogTitle>
                    <DialogDescription>
                    Completa los detalles de la pieza y su configuración de producción.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSave}>
                    <div className="grid gap-6 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="codigo" className="text-right">Código Pieza</Label>
                            <Input id="codigo" name="codigo" defaultValue={selectedPiece?.codigo || ''} className="col-span-3" required />
                        </div>
                        
                        <div className="grid grid-cols-4 items-center gap-4">
                           <Label htmlFor="moldName" className="text-right">Nombre Molde</Label>
                           <Input id="moldName" name="moldName" defaultValue={currentMoldName} className="col-span-3" required />
                        </div>

                        <div className="grid grid-cols-4 items-start gap-4">
                            <Label className="text-right pt-2">
                                Máquinas Compatibles
                            </Label>
                            <div className="col-span-3 grid grid-cols-2 gap-4 rounded-lg border p-4">
                                {isLoadingMachines ? <p>Cargando máquinas...</p> : machines?.map(machine => (
                                    <div key={machine.id} className="flex items-center space-x-2">
                                        <Checkbox
                                            id={`machine-${'(' + ')'}machine.id}`}
                                            checked={compatibleMachines.includes(machine.id)}
                                            onCheckedChange={(checked) => {
                                                setCompatibleMachines(prev => 
                                                    checked 
                                                        ? [...prev, machine.id]
                                                        : prev.filter(id => id !== machine.id)
                                                );
                                            }}
                                        />
                                        <label
                                            htmlFor={`machine-${'(' + ')'}machine.id}`}
                                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                        >
                                            {machine.nombre}
                                        </label>
                                    </div>
                                ))}
                                {!isLoadingMachines && (!machines || machines.length === 0) && <p className="text-sm text-muted-foreground">No hay máquinas definidas. Créalas en la sección de Máquinas.</p>}
                            </div>
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

    
