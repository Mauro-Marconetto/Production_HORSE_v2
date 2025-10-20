
'use client';

import { useState, useMemo } from 'react';
import { collection, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { useToast } from '@/hooks/use-toast';

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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MoreHorizontal, PlusCircle, Loader2, Trash2 } from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import type { Client, Piece } from '@/lib/types';


export default function AdminClientsPage() {
  const firestore = useFirestore();
  const { toast } = useToast();

  const clientsCollection = useMemoFirebase(() => firestore ? collection(firestore, 'clients') : null, [firestore]);
  const { data: clients, isLoading: isLoadingClients } = useCollection<Client>(clientsCollection);

  const piecesCollection = useMemoFirebase(() => firestore ? collection(firestore, 'pieces') : null, [firestore]);
  const { data: pieces, isLoading: isLoadingPieces } = useCollection<Piece>(piecesCollection);

  const [isSaving, setIsSaving] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  const openNewClientDialog = () => {
    setSelectedClient(null);
    setIsDialogOpen(true);
  };

  const openEditClientDialog = (client: Client) => {
    setSelectedClient(client);
    setIsDialogOpen(true);
  };

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!firestore) return;

    setIsSaving(true);
    const formData = new FormData(e.currentTarget);
    const clientId = selectedClient ? selectedClient.id : `C${Date.now()}`;
    
    const clientData: Client = {
      id: clientId,
      nombre: formData.get('nombre') as string,
    };

    try {
      const clientDocRef = doc(firestore, 'clients', clientId);
      await setDoc(clientDocRef, clientData, { merge: true });

      toast({
        title: 'Éxito',
        description: `Cliente ${selectedClient ? 'actualizado' : 'creado'} correctamente.`,
      });
      setIsDialogOpen(false);
    } catch (error: any) {
      console.error('Error saving client:', error);
      toast({
        title: 'Error',
        description: error.message || 'No se pudo guardar el cliente.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

    const handleDelete = async (clientId: string) => {
        if (!firestore) return;
        // Check if client has pieces
        const clientHasPieces = pieces?.some(p => p.clienteId === clientId);
        if (clientHasPieces) {
            toast({
                title: 'Error al Eliminar',
                description: 'No se puede eliminar un cliente que tiene piezas asociadas.',
                variant: 'destructive',
            });
            return;
        }

        try {
        await deleteDoc(doc(firestore, 'clients', clientId));
        toast({
            title: 'Cliente Eliminado',
            description: 'El cliente ha sido eliminado correctamente.',
        });
        } catch (error: any) {
        console.error('Error deleting client:', error);
        toast({
            title: 'Error',
            description: 'No se pudo eliminar el cliente.',
            variant: 'destructive',
        });
        }
    };

    const isLoading = isLoadingClients || isLoadingPieces;

  return (
    <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-headline font-bold">Catálogo de Clientes</h1>
          <p className="text-muted-foreground">Gestiona los clientes y las piezas que adquieren.</p>
        </div>
        <Button onClick={openNewClientDialog}>
          <PlusCircle className="mr-2 h-4 w-4" /> Añadir Cliente
        </Button>
      </div>
      <Card>
        <CardContent className="p-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre del Cliente</TableHead>
                <TableHead>Piezas Asociadas</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
                {isLoading && (
                    <TableRow>
                        <TableCell colSpan={3} className="h-24 text-center">
                            <Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground" />
                        </TableCell>
                    </TableRow>
                )}
                {!isLoading && clients?.map((client) => {
                    const clientPieces = pieces?.filter(p => p.clienteId === client.id) || [];
                    return (
                    <TableRow key={client.id}>
                        <TableCell className="font-medium">{client.nombre}</TableCell>
                        <TableCell>
                            <div className="flex flex-wrap gap-1">
                                {clientPieces.length > 0 ? (
                                    clientPieces.map(p => <Badge key={p.id} variant="secondary">{p.codigo}</Badge>)
                                ) : (
                                    <span className="text-xs text-muted-foreground">Sin piezas asignadas</span>
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
                                    <DropdownMenuItem onClick={() => openEditClientDialog(client)}>
                                        Editar Cliente
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <AlertDialogTrigger asChild>
                                        <DropdownMenuItem className="text-destructive focus:text-destructive focus:bg-destructive/10">
                                            <Trash2 className="mr-2 h-4 w-4" />
                                            Eliminar Cliente
                                        </DropdownMenuItem>
                                    </AlertDialogTrigger>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                    <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        Esta acción no se puede deshacer. Esto eliminará permanentemente el cliente.
                                    </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction
                                        className="bg-destructive hover:bg-destructive/90"
                                        onClick={() => handleDelete(client.id)}
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
                 {!isLoading && (!clients || clients.length === 0) && (
                    <TableRow>
                        <TableCell colSpan={3} className="h-24 text-center">
                            No se encontraron clientes.
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
            <DialogTitle>{selectedClient ? 'Editar Cliente' : 'Añadir Nuevo Cliente'}</DialogTitle>
            <DialogDescription>
              Completa los detalles del cliente. Haz clic en guardar cuando hayas terminado.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSave}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="nombre" className="text-right">Nombre</Label>
                <Input id="nombre" name="nombre" defaultValue={selectedClient?.nombre || ''} className="col-span-3" required />
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

    