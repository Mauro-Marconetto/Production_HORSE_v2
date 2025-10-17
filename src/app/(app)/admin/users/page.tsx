
'use client';

import { useMemo } from 'react';
import { collection } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import type { UserProfile } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { PlusCircle, MoreHorizontal, Loader2 } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

const roleColors: { [key: string]: string } = {
  Admin: 'bg-red-500 text-white',
  Planner: 'bg-blue-500 text-white',
  'Shop Floor': 'bg-yellow-500 text-black',
  Viewer: 'bg-gray-500 text-white',
};

export default function AdminUsersPage() {
  const firestore = useFirestore();

  const usersCollectionRef = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'users');
  }, [firestore]);

  const { data: users, isLoading, error } = useCollection<UserProfile>(usersCollectionRef);

  return (
    <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-headline font-bold">Gestión de Usuarios</h1>
          <p className="text-muted-foreground">Añade, edita y gestiona los roles de los usuarios.</p>
        </div>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" /> Añadir Usuario
        </Button>
      </div>
      <Card>
        <CardHeader>
            <CardTitle>Listado de Usuarios</CardTitle>
            <CardDescription>Usuarios con acceso a la plataforma.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Usuario</TableHead>
                <TableHead>Rol</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={3} className="text-center">
                    <div className="flex justify-center items-center p-8">
                        <Loader2 className="h-6 w-6 animate-spin" />
                        <span className="ml-2">Cargando usuarios...</span>
                    </div>
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && error && (
                 <TableRow>
                    <TableCell colSpan={3} className="text-center text-destructive p-8">
                        Error al cargar los usuarios: {error.message}
                    </TableCell>
                </TableRow>
              )}
              {!isLoading && users?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} className="text-center p-8">
                    No se encontraron usuarios.
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && users && users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarImage src={user.avatar} alt={user.name} />
                        <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium">{user.name}</div>
                        <div className="text-sm text-muted-foreground">{user.email}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={roleColors[user.role] || 'bg-gray-400'}>{user.role}</Badge>
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
                        <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                        <DropdownMenuItem>Editar Usuario</DropdownMenuItem>
                        <DropdownMenuItem>Cambiar Rol</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive focus:text-destructive focus:bg-destructive/10">
                          Eliminar Usuario
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
    </main>
  );
}
