

'use client';

import { useState, useMemo, useTransition, useCallback } from 'react';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { collection, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { useFirestore, useUser, useCollection, useMemoFirebase } from '@/firebase';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, PlusCircle, Trash2, Edit, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { UserProfile } from '@/lib/types';
import { ADMIN_EMAILS } from '@/lib/config';


function AdminUsersPageClient() {
  const { user } = useUser();
  const firestore = useFirestore();
  const auth = getAuth();
  const { toast } = useToast();

  const usersCollection = useMemoFirebase(() => firestore ? collection(firestore, 'users') : null, [firestore]);
  const { data: users, isLoading: isLoadingUsers } = useCollection<UserProfile>(usersCollection);

  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const currentUserProfileExists = useMemo(() => {
    return users?.some(u => u.id === user?.uid);
  }, [users, user]);

  const handleSyncProfile = async () => {
    if (!user || !firestore) {
        toast({ title: "Error", description: "No has iniciado sesión o la base de datos no está disponible.", variant: "destructive" });
        return;
    }
    setIsSyncing(true);
    try {
        const userDocRef = doc(firestore, 'users', user.uid);
        await setDoc(userDocRef, {
            id: user.uid,
            name: user.displayName || user.email,
            email: user.email,
            role: 'Admin'
        }, { merge: true });

        toast({
            title: "Éxito",
            description: "Tu perfil ha sido sincronizado correctamente."
        });

    } catch (error: any) {
        console.error("Error syncing profile:", error);
        toast({ title: "Error", description: "No se pudo sincronizar el perfil.", variant: "destructive" });
    } finally {
        setIsSyncing(false);
    }
  }

  const openNewUserDialog = () => {
    setSelectedUser(null);
    setIsDialogOpen(true);
  };

  const openEditUserDialog = (user: UserProfile) => {
    setSelectedUser(user);
    setIsDialogOpen(true);
  };

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!firestore) return;

    setIsSaving(true);
    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const name = formData.get('name') as string;
    const role = formData.get('role') as UserProfile['role'];
    const password = formData.get('password') as string;

    try {
      if (!selectedUser) {
         if (!password) {
            toast({
                title: "Error",
                description: "La contraseña es obligatoria para nuevos usuarios.",
                variant: "destructive",
            });
            setIsSaving(false);
            return;
        }
        
        // We don't await this so the admin's auth state doesn't change mid-flow.
        // The user is created, and then we immediately create their Firestore doc.
        createUserWithEmailAndPassword(auth, email, password)
          .then(async (userCredential) => {
            const uid = userCredential.user.uid;
            const userDocRef = doc(firestore, 'users', uid);
            // This setDoc will succeed because the rules are open.
            await setDoc(userDocRef, { name, email, role, id: uid });
          })
          .catch((error) => {
             console.error('Error creating user:', error);
             // More specific error for email-already-in-use
             if (error.code === 'auth/email-already-in-use') {
               toast({
                   title: 'Error al crear usuario',
                   description: 'El correo electrónico ya está en uso. Por favor, utiliza otro.',
                   variant: 'destructive',
               });
             } else {
                toast({
                 title: 'Error',
                 description: error.message || 'No se pudo crear la cuenta de usuario.',
                 variant: 'destructive',
               });
             }
          });
      } else {
        const userDocRef = doc(firestore, 'users', selectedUser.id);
        await setDoc(userDocRef, { name, email: selectedUser.email, role, id: selectedUser.id }, { merge: true });
      }

      toast({
        title: 'Éxito',
        description: `Usuario ${selectedUser ? 'actualizado' : 'creado'} correctamente.`,
      });
      setIsDialogOpen(false);
    } catch (error: any)
      {
      console.error('Error saving user data to Firestore:', error);
       toast({
        title: 'Error de base de datos',
        description: error.message || 'No se pudo guardar el perfil de usuario.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (userId: string) => {
    if (!firestore) return;
    if (!window.confirm('¿Estás seguro de que quieres eliminar este usuario? Esta acción no se puede deshacer.')) {
        return;
    }
    setIsDeleting(true);
    try {
        // Note: This does not delete the user from Firebase Auth. That would require a backend function.
        await deleteDoc(doc(firestore, 'users', userId));
        toast({
            title: 'Usuario Eliminado',
            description: 'El perfil de usuario ha sido eliminado de Firestore.',
        });
    } catch (error: any) {
        console.error('Error deleting user:', error);
        toast({
            title: 'Error',
            description: 'No se pudo eliminar el usuario.',
            variant: 'destructive',
        });
    } finally {
        setIsDeleting(false);
    }
  };

  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-headline font-bold">Gestión de Usuarios</h1>
          <p className="text-muted-foreground">
            Crear, editar y gestionar los usuarios de la aplicación.
          </p>
        </div>
        <div className='flex items-center gap-2'>
            {!currentUserProfileExists && !isLoadingUsers && (
                <Button onClick={handleSyncProfile} disabled={isSyncing} variant="outline">
                    {isSyncing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                    Sincronizar Mi Perfil
                </Button>
            )}
            <Button onClick={openNewUserDialog}>
                <PlusCircle className="mr-2 h-4 w-4" /> Añadir Usuario
            </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Usuarios</CardTitle>
          <CardDescription>
            Usuarios registrados en el sistema.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Rol</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoadingUsers && (
                 <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center">
                        <Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground" />
                    </TableCell>
                </TableRow>
              )}
              {!isLoadingUsers && users && users.length > 0 ? (
                users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{user.role}</TableCell>
                    <TableCell className="text-right">
                       <Button variant="ghost" size="icon" onClick={() => openEditUserDialog(user)}>
                          <Edit className="h-4 w-4" />
                       </Button>
                       <Button variant="ghost" size="icon" onClick={() => handleDelete(user.id)} disabled={isDeleting} className="text-destructive hover:text-destructive/80">
                          <Trash2 className="h-4 w-4" />
                       </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : null}
              {!isLoadingUsers && (!users || users.length === 0) && (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center">
                    No se encontraron usuarios.
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
            <DialogTitle>{selectedUser ? 'Editar Usuario' : 'Añadir Nuevo Usuario'}</DialogTitle>
            <DialogDescription>
              {selectedUser ? 'Modifica los detalles del usuario.' : 'Crea un nuevo usuario y asígnale un rol.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSave} className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Nombre
              </Label>
              <Input id="name" name="name" defaultValue={selectedUser?.name || ''} className="col-span-3" required />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="email" className="text-right">
                Email
              </Label>
              <Input id="email" name="email" type="email" defaultValue={selectedUser?.email || ''} className="col-span-3" required disabled={!!selectedUser} />
            </div>
            {!selectedUser && (
                 <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="password" className="text-right">
                        Contraseña
                    </Label>
                    <Input id="password" name="password" type="password" className="col-span-3" placeholder="Mínimo 6 caracteres"/>
                </div>
            )}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="role" className="text-right">
                Rol
              </Label>
              <Select name="role" defaultValue={selectedUser?.role || 'Viewer'}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Selecciona un rol" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Admin">Admin</SelectItem>
                  <SelectItem value="Planner">Planner</SelectItem>
                  <SelectItem value="Shop Floor">Shop Floor</SelectItem>
                  <SelectItem value="Viewer">Viewer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {isSaving ? 'Guardando...' : 'Guardar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default function AdminUsersPage() {
    const { user, isUserLoading } = useUser();

    if (isUserLoading) {
        return (
            <div className="flex h-screen w-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }

    const isAdmin = user?.email && ADMIN_EMAILS.includes(user.email);

    if (!isAdmin) {
        return (
            <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
                <Card>
                    <CardHeader>
                        <CardTitle>Acceso Denegado</CardTitle>
                        <CardDescription>No tienes permisos para acceder a esta sección.</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p>Si crees que esto es un error, por favor contacta al administrador del sistema.</p>
                    </CardContent>
                </Card>
            </main>
        );
    }
    
    return (
        <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
            <AdminUsersPageClient />
        </main>
    );
}

    