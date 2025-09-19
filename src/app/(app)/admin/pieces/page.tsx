

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { molds, pieces as allPieces } from "@/lib/data";
import { PlusCircle } from "lucide-react";

export default function AdminPiecesPage() {
  return (
    <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-headline font-bold">Catálogo de Piezas</h1>
          <p className="text-muted-foreground">Gestiona las piezas y sus moldes asociados.</p>
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
                <TableHead>Pieza</TableHead>
                <TableHead>Molde</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {molds.map((mold) => {
                const pieceInfo = allPieces.find(p => p.id === mold.pieces[0]);
                return (
                    <TableRow key={mold.id}>
                        <TableCell>{pieceInfo?.codigo || mold.pieces[0]}</TableCell>
                        <TableCell className="font-medium">{mold.nombre}</TableCell>
                        <TableCell>
                            <Badge variant={mold.status === 'ok' ? 'secondary' : 'destructive'}>
                            {mold.status}
                            </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                            <Button variant="ghost" size="sm">Editar</Button>
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
