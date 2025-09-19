
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { machines, productionCapacities, pieces, molds } from "@/lib/data";
import { MoreHorizontal, PlusCircle } from "lucide-react";

export default function AdminMachinesPage() {
  return (
    <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-headline font-bold">Catálogo de Máquinas</h1>
          <p className="text-muted-foreground">Gestiona las máquinas y sus capacidades de producción.</p>
        </div>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" /> Añadir Máquina
        </Button>
      </div>

      <div className="grid gap-6">
        {machines.map((machine) => {
          const capacities = productionCapacities.filter(c => c.machineId === machine.id);
          return (
            <Card key={machine.id}>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle className="text-2xl">{machine.nombre}</CardTitle>
                    <CardDescription>
                        Tonelaje: {machine.tonelaje}T | Turnos/Semana: {machine.turnosSemana} | OEE Objetivo: {machine.OEE_obj * 100}%
                    </CardDescription>
                </div>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Abrir menú</span>
                            <MoreHorizontal className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                        <DropdownMenuItem>
                           <PlusCircle className="mr-2 h-4 w-4" />
                            Añadir Capacidad
                        </DropdownMenuItem>
                        <DropdownMenuItem>Editar Máquina</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive focus:text-destructive focus:bg-destructive/10">
                            Eliminar Máquina
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Pieza/Molde</TableHead>
                      <TableHead className="text-right">Producción por Hora</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {capacities.map((cap) => {
                      const piece = pieces.find(p => p.id === cap.pieceId);
                      const mold = molds.find(m => m.id === cap.moldId);
                      return (
                        <TableRow key={`${cap.machineId}-${cap.pieceId}-${cap.moldId}`}>
                          <TableCell className="font-mono">{piece?.codigo}/{mold?.nombre}</TableCell>
                          <TableCell className="text-right font-medium">{cap.produccionHora.toLocaleString()} uds./hr</TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="sm">Editar</Button>
                            <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive/80">Eliminar</Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                     {capacities.length === 0 && (
                        <TableRow>
                            <TableCell colSpan={3} className="text-center text-muted-foreground">
                                No hay capacidades de producción definidas para esta máquina.
                            </TableCell>
                        </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </main>
  );
}
