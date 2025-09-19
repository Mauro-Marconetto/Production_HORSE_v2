
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { pieces, scrap, clients } from "@/lib/data";
import { FileUp, PlusCircle } from "lucide-react";

export default function QualityPage() {
  return (
    <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-headline font-bold">Gestión de Calidad</h1>
          <p className="text-muted-foreground">Registrar y analizar el scrap de producción.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <FileUp className="mr-2 h-4 w-4" /> Importar Historial de Scrap
          </Button>
          <Button>
            <PlusCircle className="mr-2 h-4 w-4" /> Añadir Registro de Scrap
          </Button>
        </div>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Historial de Scrap</CardTitle>
          <CardDescription>
            Registros de piezas desechadas por problemas de calidad.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Mes</TableHead>
                <TableHead>Código de Pieza</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Causa</TableHead>
                <TableHead className="text-right">Cantidad (unidades)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {scrap.sort((a,b) => b.periodoYYYYMM.localeCompare(a.periodoYYYYMM)).map((entry) => {
                const piece = pieces.find(p => p.id === entry.pieceId);
                const client = clients.find(c => c.id === piece?.clienteId);
                return (
                  <TableRow key={entry.id}>
                    <TableCell>{entry.periodoYYYYMM.slice(0,4)}-{entry.periodoYYYYMM.slice(4)}</TableCell>
                    <TableCell className="font-medium">{piece?.codigo}</TableCell>
                    <TableCell>{client?.nombre}</TableCell>
                    <TableCell>{entry.causa}</TableCell>
                    <TableCell className="text-right">{entry.qty.toLocaleString()}</TableCell>
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
