
"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { inventory as allInventory, pieces as initialPieces } from "@/lib/data";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle, TrendingUp, PlusCircle } from "lucide-react";
import type { Piece } from "@/lib/types";

export default function InventoryPage() {
  const [pieces, setPieces] = useState<Piece[]>(initialPieces);

  const handleStockChange = (pieceId: string, field: 'stockMin' | 'stockMax', value: string) => {
    const numericValue = parseInt(value, 10);
    if (isNaN(numericValue)) return;

    setPieces(prevPieces => 
      prevPieces.map(p => 
        p.id === pieceId ? { ...p, [field]: numericValue } : p
      )
    );
  };

  const uniquePiecesByCode = useMemo(() => {
    const pieceMap = new Map<string, Piece>();
    pieces.forEach(p => {
        if (!pieceMap.has(p.codigo)) {
            pieceMap.set(p.codigo, p);
        }
    });
    return Array.from(pieceMap.values());
  }, [pieces]);

  return (
    <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-headline font-bold">Inventario</h1>
          <p className="text-muted-foreground">Monitoriza y gestiona los niveles de stock.</p>
        </div>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" /> Nueva Entrada de Stock
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Niveles de Stock Actuales</CardTitle>
          <CardDescription>Resumen de todas las piezas en inventario. Puedes editar los valores de Mín/Máx directamente.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[300px]">Pieza</TableHead>
                <TableHead className="text-right">Stock Actual</TableHead>
                <TableHead className="w-[250px] text-center">Mín / Máx</TableHead>
                <TableHead className="w-[200px] text-center">Capacidad</TableHead>
                <TableHead className="text-center">Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {uniquePiecesByCode.map((piece) => {
                // Aggregate stock for all pieces with the same code
                const piecesWithSameCode = pieces.filter(p => p.codigo === piece.codigo);
                const pieceIds = piecesWithSameCode.map(p => p.id);
                const totalStock = allInventory
                    .filter(inv => pieceIds.includes(inv.pieceId))
                    .reduce((sum, inv) => sum + inv.stock, 0);

                const stockPercentage = piece.stockMax > piece.stockMin ? Math.round(((totalStock - piece.stockMin) / (piece.stockMax - piece.stockMin)) * 100) : 100;
                const status = stockPercentage < 10 ? 'critical' : stockPercentage > 90 ? 'high' : 'ok';
                const statusText = status === 'critical' ? 'Crítico' : status === 'high' ? 'Alto' : 'Ok';

                return (
                  <TableRow key={piece.id}>
                    <TableCell className="font-medium">{piece.codigo}</TableCell>
                    <TableCell className="text-right">{totalStock.toLocaleString('es-ES')}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          value={piece.stockMin}
                          onChange={(e) => handleStockChange(piece.id, 'stockMin', e.target.value)}
                          className="w-24 h-8 text-right"
                        />
                        <span>/</span>
                        <Input
                          type="number"
                          value={piece.stockMax}
                          onChange={(e) => handleStockChange(piece.id, 'stockMax', e.target.value)}
                          className="w-24 h-8 text-right"
                        />
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                         <Progress value={stockPercentage} className="h-2" />
                         <span>{stockPercentage}%</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={status === 'critical' ? 'destructive' : status === 'high' ? 'outline' : 'secondary'} className="border-primary/50">
                        {status === 'critical' && <AlertCircle className="mr-1 h-3 w-3" />}
                        {status === 'ok' && <CheckCircle className="mr-1 h-3 w-3 text-green-500" />}
                        {status === 'high' && <TrendingUp className="mr-1 h-3 w-3 text-amber-500" />}
                        {statusText}
                      </Badge>
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
