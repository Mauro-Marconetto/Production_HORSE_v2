
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { demands, pieces, clients } from "@/lib/data";
import { FileUp, CheckCircle } from "lucide-react";

export default function DemandPage() {
  return (
    <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-headline font-bold">Gestión de Demanda</h1>
          <p className="text-muted-foreground">Importar y ver la demanda de los clientes.</p>
        </div>
        <Button>
          <FileUp className="mr-2 h-4 w-4" /> Importar CSV
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Demanda Semanal</CardTitle>
          <CardDescription>Unidades previstas por pieza para las próximas semanas.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Semana</TableHead>
                <TableHead>Código de Pieza</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead className="text-right">Cantidad</TableHead>
                <TableHead className="text-center">Prioridad</TableHead>
                <TableHead className="text-center">Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {demands.map((demand) => {
                const piece = pieces.find(p => p.id === demand.pieceId);
                const client = clients.find(c => c.id === piece?.clienteId);
                return (
                  <TableRow key={demand.id}>
                    <TableCell>2024-W{demand.periodoYYYYWW.slice(4)}</TableCell>
                    <TableCell className="font-medium">{piece?.codigo}</TableCell>
                    <TableCell>{client?.nombre}</TableCell>
                    <TableCell className="text-right">{demand.qty.toLocaleString()}</TableCell>
                    <TableCell className="text-center">{demand.prioridad}</TableCell>
                    <TableCell className="text-center">
                      {demand.congelado ? (
                        <span className="flex items-center justify-center text-green-600"><CheckCircle className="h-4 w-4 mr-1"/> Congelado</span>
                      ) : (
                        "Borrador"
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm">Editar</Button>
                      <Button variant="ghost" size="sm" className="text-green-600 hover:text-green-700">Congelar</Button>
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
