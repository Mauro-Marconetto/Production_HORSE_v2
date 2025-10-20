
'use client';

import { useState, useMemo } from 'react';
import { collection, doc, setDoc, deleteDoc } from 'firebase/firestore';
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
} from "@/components/ui/alert-dialog"
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
import { MoreHorizontal, PlusCircle, Loader2, Trash2 } from 'lucide-react';
import type { Piece, Mold, Client } from '@/lib/types';

export default function AdminPiecesPage() {
    const firestore = useFirestore();
    const { toast } = useToast();

    const piecesCollection = useMemoFirebase(() => firestore ? collection(firestore, 'pieces') : null, [firestore]);
    const { data: pieces, isLoading: isLoadingPieces } = useCollection<Piece>(piecesCollection);

    const moldsCollection = useMemoFirebase(() => firestore ? collection(firestore, 'molds') : null, [firestore]);
    const { data: molds, isLoading: isLoadingMolds } = useCollection<Mold>(moldsCollection);
    
    const clientsCollection = useMemoFirebase(() => firestore ? collection(firestore, 'clients') : null, [firestore]);
    const { data: clients, isLoading: isLoadingClients } = useCollection<Client>(clientsCollection);

    const [isSaving, setIsSaving] = useState(false);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [selectedPiece, setSelectedPiece] = useState<Piece | null>(null);

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
        const moldId = formData.get('moldId') as string;

        const pieceData: Piece = {
            id: pieceId,
            codigo: formData.get('codigo') as string,
            clienteId: formData.get('clienteId') as string,
            peso: Number(formData.get('peso')),
            familia: formData.get('familia') as string,
            stockMin: Number(formData.get('stockMin')),
            stockMax: Number(formData.get('stockMax')),
        };

        try {
            const pieceDocRef = doc(firestore, 'pieces', pieceId);
            await setDoc(pieceDocRef, pieceData, { merge: true });

            // If a mold was selected, update its 'pieces' array
            if (moldId && moldId !== 'none') {
                const moldDocRef = doc(firestore, 'molds', moldId);
                const selectedMold = molds?.find(m => m.id === moldId);
                if (selectedMold) {
                    const updatedPieces = selectedMold.pieces.includes(pieceId) 
                        ? selectedMold.pieces 
                        : [...selectedMold.pieces, pieceId];
                    await setDoc(moldDocRef, { pieces: updatedPieces }, { merge: true });
                }
            }
            
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
            await deleteDoc(doc(firestore, 'pieces', pieceId));
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
    
    const isLoading = isLoadingPieces || isLoadingMolds || isLoadingClients;

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
                        <TableHead>Cliente</TableHead>
                        <TableHead>Molde Asociado</TableHead>
                        <TableHead className="text-right">Stock Mín/Máx</TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading && (
                            <TableRow>
                                <TableCell colSpan={5} className="h-24 text-center">
                                    <Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground" />
                                </TableCell>
                            </TableRow>
                        )}
                        {!isLoading && pieces?.map((piece) => {
                            const client = clients?.find(c => c.id === piece.clienteId);
                            const mold = molds?.find(m => m.pieces.includes(piece.id));
                            return (
                                <TableRow key={piece.id}>
                                    <TableCell className="font-medium">{piece.codigo}</TableCell>
                                    <TableCell>{client?.nombre || 'N/A'}</TableCell>
                                    <TableCell>
                                        {mold ? (
                                             <Badge variant={mold.status === 'ok' ? 'secondary' : 'destructive'}>
                                                {mold.nombre}
                                            </Badge>
                                        ) : (
                                            <span className="text-xs text-muted-foreground">Sin molde</span>
                                        )}
                                   </TableCell>
                                   <TableCell className="text-right">{piece.stockMin} / {piece.stockMax}</TableCell>
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
                                <TableCell colSpan={5} className="h-24 text-center">
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
                    Completa los detalles de la pieza. Haz clic en guardar cuando hayas terminado.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSave}>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="codigo" className="text-right">Código</Label>
                            <Input id="codigo" name="codigo" defaultValue={selectedPiece?.codigo || ''} className="col-span-3" required />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="familia" className="text-right">Familia</Label>
                            <Input id="familia" name="familia" defaultValue={selectedPiece?.familia || ''} className="col-span-3" required />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="clienteId" className="text-right">Cliente</Label>
                             <Select name="clienteId" defaultValue={selectedPiece?.clienteId}>
                                <SelectTrigger className="col-span-3">
                                    <SelectValue placeholder="Selecciona un cliente" />
                                </SelectTrigger>
                                <SelectContent>
                                {isLoadingClients ? (
                                    <SelectItem value="loading" disabled>Cargando clientes...</SelectItem>
                                ) : (
                                    clients?.map(client => (
                                        <SelectItem key={client.id} value={client.id}>{client.nombre}</SelectItem>
                                    ))
                                )}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="peso" className="text-right">Peso (kg)</Label>
                            <Input id="peso" name="peso" type="number" step="0.01" defaultValue={selectedPiece?.peso || ''} className="col-span-3" required />
                        </div>
                         <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="stockMin" className="text-right">Stock Mínimo</Label>
                            <Input id="stockMin" name="stockMin" type="number" defaultValue={selectedPiece?.stockMin || ''} className="col-span-3" required />
                        </div>
                         <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="stockMax" className="text-right">Stock Máximo</Label>
                            <Input id="stockMax" name="stockMax" type="number" defaultValue={selectedPiece?.stockMax || ''} className="col-span-3" required />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                           <Label htmlFor="moldId" className="text-right">Molde</Label>
                             <Select name="moldId" defaultValue={molds?.find(m => m.pieces.includes(selectedPiece?.id || ''))?.id || 'none'}>
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

