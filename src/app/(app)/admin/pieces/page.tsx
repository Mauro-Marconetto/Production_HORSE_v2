
'use client';

import { useState, useMemo, useEffect } from 'react';
import { collection, doc, setDoc, deleteDoc, writeBatch } from 'firebase/firestore';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
    const { data: molds, isLoading: isLoadingMolds } = useCollection<Mold>(moldsCollection);
    
    const machinesCollection = useMemoFirebase(() => firestore ? collection(firestore, 'machines') : null, [firestore]);
    const { data: machines, isLoading: isLoadingMachines } = useCollection<Machine>(machinesCollection);

    const [isSaving, setIsSaving] = useState(false);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [selectedPiece, setSelectedPiece] = useState<Piece | null>(null);
    const [selectedMoldId, setSelectedMoldId] = useState<string>('none');
    const [compatibleMachines, setCompatibleMachines] = useState<string[]>([]);
    
    const isLoading = isLoadingPieces || isLoadingMolds || isLoadingMachines;

    useEffect(() => {
        if (isDialogOpen && selectedPiece) {
            const associatedMold = molds?.find(m => m.pieces.includes(selectedPiece.id));
            if (associatedMold) {
                setSelectedMoldId(associatedMold.id);
                setCompatibleMachines(associatedMold.compatibilidad || []);
            } else {
                setSelectedMoldId('none');
                setCompatibleMachines([]);
            }
        } else if (isDialogOpen && !selectedPiece) {
            // Reset for new piece
            setSelectedMoldId('none');
            setCompatibleMachines([]);
        }
    }, [isDialogOpen, selectedPiece, molds]);

     useEffect(() => {
        if (selectedMoldId !== 'none') {
            const mold = molds?.find(m => m.id === selectedMoldId);
            setCompatibleMachines(mold?.compatibilidad || []);
        } else {
            setCompatibleMachines([]);
        }
    }, [selectedMoldId, molds]);

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
        const pieceId = selectedPiece ? selectedPiece.id : `P${Date.now()}`;
        const codigo = formData.get('codigo') as string;
        const currentMoldId = selectedMoldId;

        // Find the original mold associated with the piece if it's being edited
        const originalMold = selectedPiece ? molds?.find(m => m.pieces.includes(selectedPiece.id)) : undefined;

        try {
            const batch = writeBatch(firestore);

            // 1. Create or update the piece document
            const pieceDocRef = doc(firestore, 'pieces', pieceId);
            batch.set(pieceDocRef, { id: pieceId, codigo }, { merge: true });

            // 2. Handle mold association changes
            if (originalMold && originalMold.id !== currentMoldId) {
                // Piece was moved from an old mold, so remove it from the old mold's pieces array
                const oldMoldRef = doc(firestore, 'molds', originalMold.id);
                const updatedOldMoldPieces = originalMold.pieces.filter(pId => pId !== pieceId);
                batch.update(oldMoldRef, { pieces: updatedOldMoldPieces });
            }

            if (currentMoldId !== 'none') {
                const newMold = molds?.find(m => m.id === currentMoldId);
                if (newMold) {
                    const newMoldRef = doc(firestore, 'molds', newMold.id);
                    // Add piece to new mold's pieces array if it's not already there
                    const updatedNewMoldPieces = newMold.pieces.includes(pieceId) 
                        ? newMold.pieces 
                        : [...newMold.pieces, pieceId];
                    
                    // 3. Update the new mold with the piece association and compatibility
                    batch.update(newMoldRef, { 
                        pieces: updatedNewMoldPieces,
                        compatibilidad: compatibleMachines 
                    });
                }
            }
            
            await batch.commit();
            
            toast({
                title: 'Éxito',
                description: `Pieza ${selectedPiece ? 'actualizada' : 'creada'} correctamente.`,
            });
            setIsDialogOpen(false);
        } catch (error: any) {
            console.error('Error saving piece:', error);
            toast({
                title: 'Error',
                description: error.message || 'No se pudo guardar la pieza.',
                variant: 'destructive',
            });
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (pieceId: string) => {
        if (!firestore) return;
        try {
            // Also remove piece from any mold that contains it
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
                <h1 className="text-3xl font-headline font-bold">Catálogo de Piezas</h1>
                <p className="text-muted-foreground">Gestiona las piezas y sus moldes asociados.</p>
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
                                                    Esta acción no se puede deshacer. Esto eliminará permanentemente la pieza.
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
                            <Label htmlFor="codigo" className="text-right">Código</Label>
                            <Input id="codigo" name="codigo" defaultValue={selectedPiece?.codigo || ''} className="col-span-3" required />
                        </div>
                        
                        <div className="grid grid-cols-4 items-center gap-4">
                           <Label htmlFor="moldId" className="text-right">Molde</Label>
                             <Select name="moldId" value={selectedMoldId} onValueChange={setSelectedMoldId}>
                                <SelectTrigger className="col-span-3">
                                    <SelectValue placeholder="Selecciona un molde" />
                                </SelectTrigger>
                                <SelectContent>
                                <SelectItem value="none">Sin molde</SelectItem>
                                {isLoadingMolds ? (
                                    <SelectItem value="loading" disabled>Cargando moldes...</SelectItem>
                                ) : (
                                    molds?.map(mold => (
                                        <SelectItem key={mold.id} value={mold.id}>{mold.nombre}</SelectItem>
                                    ))
                                )}
                                </SelectContent>
                            </Select>
                        </div>

                         {selectedMoldId !== 'none' && (
                            <div className="grid grid-cols-4 items-start gap-4">
                                <Label className="text-right pt-2">
                                    Máquinas Compatibles
                                </Label>
                                <div className="col-span-3 grid grid-cols-2 gap-4 rounded-lg border p-4">
                                    {isLoadingMachines ? <p>Cargando máquinas...</p> : machines?.map(machine => (
                                        <div key={machine.id} className="flex items-center space-x-2">
                                            <Checkbox
                                                id={`machine-${machine.id}`}
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
                                                htmlFor={`machine-${machine.id}`}
                                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                            >
                                                {machine.nombre}
                                            </label>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
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

