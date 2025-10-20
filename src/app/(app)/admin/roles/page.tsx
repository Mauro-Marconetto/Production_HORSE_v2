
'use client';

import { useState, useEffect, useMemo } from 'react';
import { collection, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, PlusCircle, Trash2, Edit } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Role } from '@/lib/types';
import { Badge } from '@/components/ui/badge';

const allNavItems = [
    { href: "/dashboard", label: "Panel" },
    { href: "/planner", label: "Planificador" },
    { href: "/calendar", label: "Calendario" },
    { href: "/demand", label: "Demanda" },
    { href: "/inventory", label: "Inventario" },
    { href: "/machining", label: "Mecanizado" },
    { href: "/production", label: "Producción" },
    { href: "/downtime", label: "Inactividad" },
    { href: "/quality", label: "Calidad" },
  ];

export default function AdminRolesPage() {
  const firestore = useFirestore();
  const { toast } = useToast();

  const rolesCollection = useMemoFirebase(() => firestore ? collection(firestore, 'roles') : null, [firestore]);
  const { data: roles, isLoading: isLoadingRoles } = useCollection<Role>(rolesCollection);

  const [isSaving, setIsSaving] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentRoleName, setCurrentRoleName] = useState('');
  const [allowedRoutes, setAllowedRoutes] = useState<string[]>([]);

  const openNewRoleDialog = () => {
    setSelectedRole(null);
    setCurrentRoleName('');
    setAllowedRoutes([]);
    setIsDialogOpen(true);
  };

  const openEditRoleDialog = (role: Role) => {
    setSelectedRole(role);
    setCurrentRoleName(role.name);
    setAllowedRoutes(role.allowedRoutes || []);
    setIsDialogOpen(true);
  };
  
  const handleRouteToggle = (route: string) => {
    setAllowedRoutes(prev => 
        prev.includes(route) ? prev.filter(r => r !== route) : [...prev, route]
    );
  };

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!firestore || !currentRoleName) return;

    setIsSaving(true);
    
    const roleId = selectedRole ? selectedRole.id : currentRoleName.toLowerCase().replace(/\s+/g, '-');
    const roleData: Role = {
      id: roleId,
      name: currentRoleName,
      allowedRoutes: allowedRoutes,
    };

    try {
      const roleDocRef = doc(firestore, 'roles', roleId);
      await setDoc(roleDocRef, roleData, { merge: !!selectedRole });

      toast({
        title: 'Éxito',
        description: `Rol ${selectedRole ? 'actualizado' : 'creado'} correctamente.`,
      });
      setIsDialogOpen(false);
    } catch (error: any) {
      console.error('Error saving role:', error);
      toast({
        title: 'Error',
        description: error.message || 'No se pudo guardar el rol.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (roleId: string) => {
    if (!firestore) return;
    if (!window.confirm('¿Estás seguro de que quieres eliminar este rol? Los usuarios con este rol perderán sus accesos.')) {
        return;
    }
    
    try {
        await deleteDoc(doc(firestore, 'roles', roleId));
        toast({
            title: 'Rol Eliminado',
            description: 'El rol ha sido eliminado correctamente.',
        });
    } catch (error: any) {
        console.error('Error deleting role:', error);
        toast({
            title: 'Error',
            description: 'No se pudo eliminar el rol.',
            variant: 'destructive',
        });
    }
  };

  return (
    <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-headline font-bold">Gestión de Roles</h1>
          <p className="text-muted-foreground">
            Crear y configurar los roles de usuario y sus permisos.
          </p>
        </div>
        <Button onClick={openNewRoleDialog}>
            <PlusCircle className="mr-2 h-4 w-4" /> Añadir Rol
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Roles</CardTitle>
          <CardDescription>
            Roles definidos en el sistema y las páginas a las que tienen acceso.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre del Rol</TableHead>
                <TableHead>Páginas Permitidas</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoadingRoles && (
                 <TableRow>
                    <TableCell colSpan={3} className="h-24 text-center">
                        <Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground" />
                    </TableCell>
                </TableRow>
              )}
              {!isLoadingRoles && roles && roles.length > 0 ? (
                roles.map((role) => (
                  <TableRow key={role.id}>
                    <TableCell className="font-medium">{role.name}</TableCell>
                    <TableCell>
                        <div className="flex flex-wrap gap-1 max-w-md">
                            {role.allowedRoutes?.length > 0 ? (
                                role.allowedRoutes.map(route => {
                                    const navItem = allNavItems.find(item => item.href === route);
                                    return <Badge key={route} variant="secondary">{navItem?.label || route}</Badge>
                                })
                            ) : (
                                <span className='text-sm text-muted-foreground'>Sin permisos asignados</span>
                            )}
                        </div>
                    </TableCell>
                    <TableCell className="text-right">
                       <Button variant="ghost" size="icon" onClick={() => openEditRoleDialog(role)}>
                          <Edit className="h-4 w-4" />
                       </Button>
                       <Button variant="ghost" size="icon" onClick={() => handleDelete(role.id)} className="text-destructive hover:text-destructive/80" disabled={role.name === 'Admin'}>
                          <Trash2 className="h-4 w-4" />
                       </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : null}
               {!isLoadingRoles && (!roles || roles.length === 0) && (
                <TableRow>
                  <TableCell colSpan={3} className="h-24 text-center">
                    No se encontraron roles.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{selectedRole ? 'Editar Rol' : 'Añadir Nuevo Rol'}</DialogTitle>
            <DialogDescription>
              {selectedRole ? 'Modifica los permisos para este rol.' : 'Crea un nuevo rol y define a qué páginas puede acceder.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSave}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">
                  Nombre
                </Label>
                <Input 
                    id="name" 
                    name="name" 
                    value={currentRoleName}
                    onChange={(e) => setCurrentRoleName(e.target.value)}
                    className="col-span-3" 
                    required 
                    disabled={selectedRole?.name === 'Admin'}
                />
              </div>
              <div className="grid grid-cols-4 items-start gap-4">
                <Label className="text-right pt-2">
                  Permisos
                </Label>
                <div className="col-span-3 grid grid-cols-2 gap-4 rounded-lg border p-4">
                    {allNavItems.map(item => (
                        <div key={item.href} className="flex items-center space-x-2">
                            <Checkbox
                                id={`route-${item.href}`}
                                checked={allowedRoutes.includes(item.href) || selectedRole?.name === 'Admin'}
                                onCheckedChange={() => handleRouteToggle(item.href)}
                                disabled={selectedRole?.name === 'Admin'}
                            />
                            <label
                                htmlFor={`route-${item.href}`}
                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                            >
                                {item.label}
                            </label>
                        </div>
                    ))}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSaving || selectedRole?.name === 'Admin'}>
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
    