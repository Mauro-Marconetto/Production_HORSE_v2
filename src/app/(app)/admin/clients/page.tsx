
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { clients, pieces } from "@/lib/data";
import { PlusCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function AdminClientsPage() {
  return (
    <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-headline font-bold">Catálogo de Clientes</h1>
          <p className="text-muted-foreground">Gestiona los clientes y las piezas que adquieren.</p>
        </div>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" /> Añadir Cliente
        </Button>
      </div>
      <Card>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre del Cliente</TableHead>
                <TableHead>Piezas Asociadas</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clients.map((client) => {
                const clientPieces = pieces.filter(p => p.clienteId === client.id);
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
                      <Button variant="ghost" size="sm">Editar</Button>
                      <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive/80">Eliminar</Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </main>
  );
}
