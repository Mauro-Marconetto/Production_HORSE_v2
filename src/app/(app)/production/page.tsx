

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { production, pieces, machines, molds } from "@/lib/data";
import { CheckCircle, AlertTriangle } from "lucide-react";

export default function ProductionPage() {
  return (
    <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-headline font-bold">Producción</h1>
          <p className="text-muted-foreground">Monitoriza el progreso de la producción real.</p>
        </div>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Registros de Producción Recientes</CardTitle>
          <CardDescription>Datos de producción reportados desde la planta.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Máquina</TableHead>
                <TableHead>Pieza</TableHead>
                <TableHead>Molde</TableHead>
                <TableHead>Turno</TableHead>
                <TableHead className="text-right">Unidades Producidas</TableHead>
                <TableHead className="text-right">Scrap (%)</TableHead>
                <TableHead className="text-center">Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {production.map((p) => {
                const piece = pieces.find(pc => pc.id === p.pieceId);
                const machine = machines.find(m => m.id === p.machineId);
                const mold = molds.find(m => m.id === p.moldId);
                const isScrapHigh = p.scrapPct > 0.05;

                return (
                  <TableRow key={p.id}>
                    <TableCell>{new Date(p.fechaISO).toLocaleDateString()}</TableCell>
                    <TableCell className="font-medium">{machine?.nombre}</TableCell>
                    <TableCell>{piece?.codigo}</TableCell>
                    <TableCell>{mold?.nombre}</TableCell>
                    <TableCell className="capitalize">{p.turno}</TableCell>
                    <TableCell className="text-right">{p.unidades.toLocaleString()}</TableCell>
                    <TableCell className={`text-right ${isScrapHigh ? 'text-destructive' : ''}`}>
                      {(p.scrapPct * 100).toFixed(1)}%
                    </TableCell>
                    <TableCell className="text-center">
                      {isScrapHigh ? (
                        <span className="flex items-center justify-center text-destructive"><AlertTriangle className="h-4 w-4 mr-1"/> Scrap Alto</span>
                      ) : (
                        <span className="flex items-center justify-center text-green-600"><CheckCircle className="h-4 w-4 mr-1"/> En Tolerancia</span>
                      )}
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
