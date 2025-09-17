import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileUp } from "lucide-react";

const downtimeData = [
    { machine: "Inyectora 500T", month: "2024-06", minutes: 480, category: "No Planificado", cause: "Fuga Hidráulica", planned: false },
    { machine: "Inyectora 800T", month: "2024-06", minutes: 1200, category: "Planificado", cause: "Cambio de Molde", planned: true },
    { machine: "Inyectora 500T", month: "2024-05", minutes: 600, category: "No Planificado", cause: "Fallo Eléctrico", planned: false },
    { machine: "Inyectora 800T", month: "2024-05", minutes: 300, category: "No Planificado", cause: "Atasco de Material", planned: false },
]

export default function DowntimePage() {
  return (
    <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-headline font-bold">Análisis de Inactividad</h1>
          <p className="text-muted-foreground">Registra y analiza el tiempo de inactividad de la máquina.</p>
        </div>
        <Button>
          <FileUp className="mr-2 h-4 w-4" /> Importar CSV de Inactividad
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Eventos Recientes de Inactividad</CardTitle>
          <CardDescription>
            Tiempos de inactividad registrados manualmente o importados desde un archivo.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Máquina</TableHead>
                <TableHead>Mes</TableHead>
                <TableHead>Categoría</TableHead>
                <TableHead>Causa</TableHead>
                <TableHead className="text-right">Minutos</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {downtimeData.map((d, i) => (
                <TableRow key={i}>
                  <TableCell className="font-medium">{d.machine}</TableCell>
                  <TableCell>{d.month}</TableCell>
                  <TableCell>{d.category}</TableCell>
                  <TableCell>{d.cause}</TableCell>
                  <TableCell className="text-right">{d.minutes}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </main>
  );
}
