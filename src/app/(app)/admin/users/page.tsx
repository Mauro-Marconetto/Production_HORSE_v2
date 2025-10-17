'use client';

import { useState } from 'react';
import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
} from 'firebase/firestore';
import {
  getAuth,
  createUserWithEmailAndPassword,
} from 'firebase/auth';

import { useCollection, useFirestore, useUser, type WithId, useMemoFirebase } from '@/firebase';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { PlusCircle, MoreHorizontal, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { UserProfile } from '@/lib/types';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

function UserForm({
  user,
  onSave,
  onCancel,
}: {
  user: Partial<UserProfile> | null;
  onSave: (data: Partial<UserProfile>) => Promise<void>;
  onCancel: () => void;
}) {
  const [formData, setFormData] = useState(user || {});
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    await onSave(formData);
    setIsSaving(false);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleRoleChange = (role: UserProfile['role']) => {
    setFormData({ ...formData, role });
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="grid gap-4 py-4">
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="name" className="text-right">
            Nombre
          </Label>
          <Input
            id="name"
            name="name"
            value={formData.name || ''}
            onChange={handleChange}
            className="col-span-3"
            required
          />
        </div>
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="email" className="text-right">
            Email
          </Label>
          <Input
            id="email"
            name="email"
            type="email"
            value={formData.email || ''}
            onChange={handleChange}
            className="col-span-3"
            required
            disabled={!!user?.id}
          />
        </div>
        {!user?.id && (
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="password" className="text-right">
              Contraseña
            </Label>
            <Input
              id="password"
              name="password"
              type="password"
              className="col-span-3"
              required={!user?.id}
            />
          </div>
        )}
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="role" className="text-right">
            Rol
          </Label>
          <Select
            value={formData.role || ''}
            onValueChange={handleRoleChange}
            required
          >
            <SelectTrigger className="col-span-3">
              <SelectValue placeholder="Seleccionar un rol" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Admin">Admin</SelectItem>
              <SelectItem value="Planner">Planner</SelectItem>
              <SelectItem value="Shop Floor">Shop Floor</SelectItem>
              <SelectItem value="Viewer">Viewer</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isSaving}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isSaving ? 'Guardando...' : 'Guardar'}
        </Button>
      </DialogFooter>
    </form>
  );
}

export default function AdminUsersPage() {
  const firestore = useFirestore();
  const usersRef = useMemoFirebase(() => collection(firestore, 'users'), [firestore]);
  const { data: users, isLoading } = useCollection<UserProfile>(usersRef);
  const { user: currentUser } = useUser();
  const { toast } = useToast();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<WithId<UserProfile> | null>(
    null
  );
  const [deletingUser, setDeletingUser] = useState<WithId<UserProfile> | null>(
    null
  );

  const handleAddNew = () => {
    setEditingUser(null);
    setIsFormOpen(true);
  };

  const handleEdit = (user: WithId<UserProfile>) => {
    setEditingUser(user);
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingUser(null);
  };

  const handleSave = async (data: Partial<UserProfile>) => {
    try {
      if (editingUser) {
        // Editing an existing user, just update their Firestore document
        const userDoc = doc(firestore, 'users', editingUser.id);
        await updateDoc(userDoc, { name: data.name, role: data.role });
        toast({ title: 'Usuario actualizado', description: 'Los cambios se guardaron correctamente.' });
      } else {
        // Creating a new user
        if (!data.email || !data.password || !data.name || !data.role) {
            throw new Error("Todos los campos son requeridos para crear un usuario.");
        }
        
        // 1. Create the user in Firebase Auth
        const auth = getAuth();
        const userCredential = await createUserWithEmailAndPassword(auth, data.email, data.password);
        const newAuthUser = userCredential.user;

        // 2. Create the user profile document in Firestore with the UID from Auth
        const userProfile: Omit<UserProfile, 'id'> = {
            name: data.name,
            email: data.email,
            role: data.role,
        };
        await setDoc(doc(firestore, 'users', newAuthUser.uid), userProfile);
        
        toast({ title: 'Usuario creado', description: 'El nuevo usuario se ha añadido.' });
      }
      handleCloseForm();
    } catch (error: any) {
      console.error("Error saving user:", error);
      let description = "Ha ocurrido un error inesperado.";
      if (error.code === 'auth/email-already-in-use') {
          description = "El correo electrónico ya está en uso por otra cuenta.";
      } else if (error.code === 'auth/weak-password') {
          description = "La contraseña es demasiado débil. Debe tener al menos 6 caracteres.";
      } else if (error.code === 'auth/invalid-email') {
          description = "El formato del correo electrónico no es válido.";
      }

      toast({
        title: 'Error al guardar',
        description: description,
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async () => {
    if (!deletingUser) return;
    try {
      // Note: This only deletes the Firestore document.
      // Deleting a user from Firebase Auth requires admin privileges and is a backend operation.
      // For this client-side app, we'll just remove them from our user list.
      const userDoc = doc(firestore, 'users', deletingUser.id);
      await deleteDoc(userDoc);
      toast({ title: 'Usuario eliminado', description: 'El usuario ha sido eliminado de la lista.' });
      setDeletingUser(null);
    } catch (error: any) {
      toast({
        title: 'Error al eliminar',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  return (
    <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-headline font-bold">
            Gestión de Usuarios
          </h1>
          <p className="text-muted-foreground">
            Añadir, editar o eliminar usuarios y asignar roles.
          </p>
        </div>
        <Button onClick={handleAddNew}>
          <PlusCircle className="mr-2 h-4 w-4" /> Añadir Usuario
        </Button>
      </div>

      <Card>
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
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center">
                    <Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground" />
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && users?.length === 0 && (
                 <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    No se encontraron usuarios. ¡Añade el primero!
                  </TableCell>
                </TableRow>
              )}
              {!isLoading &&
                users?.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{user.role}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Abrir menú</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(user)}>
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => setDeletingUser(user)}
                            className="text-destructive focus:text-destructive"
                            disabled={user.id === currentUser?.uid}
                          >
                            Eliminar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>
              {editingUser ? 'Editar Usuario' : 'Añadir Nuevo Usuario'}
            </DialogTitle>
            <DialogDescription>
              {editingUser
                ? 'Modifica los detalles del usuario.'
                : 'Crea un nuevo usuario y asígnale un rol.'}
            </DialogDescription>
          </DialogHeader>
          <UserForm
            user={editingUser}
            onSave={handleSave}
            onCancel={handleCloseForm}
          />
        </DialogContent>
      </Dialog>
      <AlertDialog open={!!deletingUser} onOpenChange={() => setDeletingUser(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará el perfil del
              usuario de Firestore, pero no de Firebase Authentication.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/80">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}
