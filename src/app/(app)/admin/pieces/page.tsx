
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { pieces, clients } from "@/lib/data";
import { PlusCircle } from "lucide-react";

export default function AdminPiecesPage() {
  return (
    <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-headline font-bold">Catálogo de Piezas</h1>
          <p className="text-muted-foreground">Gestiona todas las piezas fabricadas.</p>
        </div>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" /> Añadir Pieza
        </Button>
      </div>
       <Card>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Familia</TableHead>
                <TableHead className="text-right">Stock Mín.</TableHead>
                <TableHead className="text-right">Stock Máx.</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pieces.map((piece) => {
                const client = clients.find(c => c.id === piece.clienteId);
                return (
                    <TableRow key={piece.id}>
                    <TableCell className="font-medium">{piece.codigo}</TableCell>
                    <TableCell>{client?.nombre}</TableCell>
                    <TableCell>{piece.familia}</TableCell>
                    <TableCell className="text-right">{piece.stockMin.toLocaleString()}</TableCell>
                    <TableCell className="text-right">{piece.stockMax.toLocaleString()}</TableCell>
                    <TableCell className="text-right">
                        <Button variant="ghost" size="sm">Editar</Button>
                    </TableCell>
                    </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </main>
  );
}
