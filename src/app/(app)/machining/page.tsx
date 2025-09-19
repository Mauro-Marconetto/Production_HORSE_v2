
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { machining, pieces } from "@/lib/data";
import { MoreHorizontal, PlusCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const statusConfig = {
    pendiente: { label: "Pendiente de Mecanizar", color: "bg-yellow-500" },
    validacion: { label: "En Validación", color: "bg-blue-500" },
    finalizada: { label: "Finalizada", color: "bg-green-500" },
    segregada: { label: "Segregada", color: "bg-red-500" },
}

export default function MachiningPage() {
  return (
    <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-headline font-bold">Seguimiento de Mecanizado</h1>
          <p className="text-muted-foreground">Trazabilidad de piezas en proveedores externos.</p>
        </div>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" /> Enviar Lote a Mecanizar
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Lotes en Mecanizado</CardTitle>
          <CardDescription>
            Piezas que se encuentran actualmente en un proceso de mecanizado externo.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Pieza</TableHead>
                <TableHead className="text-right">Cantidad</TableHead>
                <TableHead>Proveedor</TableHead>
                <TableHead>Fecha Envío</TableHead>
                <TableHead>Fecha Retorno</TableHead>
                <TableHead className="text-center">Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {machining.map((entry) => {
                const piece = pieces.find(p => p.id === entry.pieceId);
                const { label, color } = statusConfig[entry.status];
                return (
                  <TableRow key={entry.id}>
                    <TableCell className="font-medium">{piece?.codigo || 'N/A'}</TableCell>
                    <TableCell className="text-right">{entry.qty.toLocaleString()}</TableCell>
                    <TableCell>{entry.proveedor}</TableCell>
                    <TableCell>{new Date(entry.fechaEnvio).toLocaleDateString()}</TableCell>
                    <TableCell>{entry.fechaRetorno ? new Date(entry.fechaRetorno).toLocaleDateString() : 'Pendiente'}</TableCell>
                    <TableCell className="text-center">
                        <Badge className={cn("text-white", color)}>
                            {label}
                        </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuItem>Marcar en Validación</DropdownMenuItem>
                          <DropdownMenuItem>Marcar como Finalizada</DropdownMenuItem>
                          <DropdownMenuItem>Marcar como Segregada</DropdownMenuItem>
                          <DropdownMenuItem>Editar Lote</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
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

