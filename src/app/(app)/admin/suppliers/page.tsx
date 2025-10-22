
'use client';

import { useState } from 'react';
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
import type { Supplier } from '@/lib/types';


export default function AdminSuppliersPage() {
  const firestore = useFirestore();
  const { toast } = useToast();

  const suppliersCollection = useMemoFirebase(() => firestore ? collection(firestore, 'suppliers') : null, [firestore]);
  const { data: suppliers, isLoading: isLoadingSuppliers } = useCollection<Supplier>(suppliersCollection);

  const [isSaving, setIsSaving] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);

  const openNewSupplierDialog = () => {
    setSelectedSupplier(null);
    setIsDialogOpen(true);
  };

  const openEditSupplierDialog = (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    setIsDialogOpen(true);
  };

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!firestore) return;

    setIsSaving(true);
    const formData = new FormData(e.currentTarget);
    const supplierId = selectedSupplier ? selectedSupplier.id : `SUP-${Date.now()}`;
    
    const supplierData: Supplier = {
      id: supplierId,
      nombre: formData.get('nombre') as string,
      cuit: formData.get('cuit') as string,
      direccion: formData.get('direccion') as string,
    };

    try {
        const supplierDocRef = doc(firestore, 'suppliers', supplierId);
        await setDoc(supplierDocRef, supplierData, { merge: true });

        toast({
            title: 'Éxito',
            description: `Proveedor ${selectedSupplier ? 'actualizado' : 'creado'} correctamente.`,
        });
        setIsDialogOpen(false);
    } catch (error: any) {
      console.error('Error saving supplier:', error);
      toast({
        title: 'Error',
        description: error.message || 'No se pudo guardar el proveedor.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

    const handleDelete = async (supplierId: string) => {
        if (!firestore) return;
        // Add check if supplier is in use before deleting
        // For now, direct delete
        try {
            await deleteDoc(doc(firestore, 'suppliers', supplierId));
            
            toast({
                title: 'Proveedor Eliminado',
                description: 'El proveedor ha sido eliminado correctamente.',
            });
        } catch (error: any) {
            console.error('Error deleting supplier:', error);
            toast({
                title: 'Error',
                description: 'No se pudo eliminar el proveedor.',
                variant: 'destructive',
            });
        }
    };


  return (
    <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-headline font-bold">Catálogo de Proveedores</h1>
          <p className="text-muted-foreground">Gestiona los proveedores de procesos externos como mecanizado.</p>
        </div>
        <Button onClick={openNewSupplierDialog}>
          <PlusCircle className="mr-2 h-4 w-4" /> Añadir Proveedor
        </Button>
      </div>
      <Card>
        <CardContent className="p-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>CUIT</TableHead>
                <TableHead>Dirección</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
                {isLoadingSuppliers && (
                    <TableRow>
                        <TableCell colSpan={4} className="h-24 text-center">
                            <Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground" />
                        </TableCell>
                    </TableRow>
                )}
                {!isLoadingSuppliers && suppliers?.map((supplier) => (
                    <TableRow key={supplier.id}>
                        <TableCell className="font-medium">{supplier.nombre}</TableCell>
                        <TableCell>{supplier.cuit}</TableCell>
                        <TableCell>{supplier.direccion}</TableCell>
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
                                    <DropdownMenuItem onClick={() => openEditSupplierDialog(supplier)}>
                                        Editar Proveedor
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <AlertDialogTrigger asChild>
                                        <DropdownMenuItem className="text-destructive focus:text-destructive focus:bg-destructive/10">
                                            <Trash2 className="mr-2 h-4 w-4" />
                                            Eliminar Proveedor
                                        </DropdownMenuItem>
                                    </AlertDialogTrigger>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                    <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        Esta acción no se puede deshacer. Esto eliminará permanentemente el proveedor.
                                    </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction
                                        className="bg-destructive hover:bg-destructive/90"
                                        onClick={() => handleDelete(supplier.id)}
                                    >
                                        Sí, eliminar
                                    </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </TableCell>
                    </TableRow>
                    ))}
                 {!isLoadingSuppliers && (!suppliers || suppliers.length === 0) && (
                    <TableRow>
                        <TableCell colSpan={4} className="h-24 text-center">
                            No se encontraron proveedores.
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
            <DialogTitle>{selectedSupplier ? 'Editar Proveedor' : 'Añadir Nuevo Proveedor'}</DialogTitle>
            <DialogDescription>
              Completa los detalles del proveedor.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSave}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="nombre" className="text-right">Nombre</Label>
                <Input id="nombre" name="nombre" defaultValue={selectedSupplier?.nombre || ''} className="col-span-3" required />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="cuit" className="text-right">CUIT</Label>
                <Input id="cuit" name="cuit" defaultValue={selectedSupplier?.cuit || ''} className="col-span-3" required />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="direccion" className="text-right">Dirección</Label>
                <Input id="direccion" name="direccion" defaultValue={selectedSupplier?.direccion || ''} className="col-span-3" required />
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
