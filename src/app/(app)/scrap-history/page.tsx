
'use client';

import { useMemo } from "react";
import { collection, query, where, orderBy } from 'firebase/firestore';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2 } from "lucide-react";
import type { Production, Piece, Client } from "@/lib/types";

interface AggregatedScrapEntry {
    id: string;
    periodo: string;
    pieceId: string;
    qty: number;
    origen: string;
    causa?: string;
}

export default function ScrapHistoryPage() {
    const firestore = useFirestore();

    const piecesQuery = useMemoFirebase(() => firestore ? collection(firestore, 'pieces') : null, [firestore]);
    const { data: pieces, isLoading: isLoadingPieces } = useCollection<Piece>(piecesQuery);

    const clientsQuery = useMemoFirebase(() => firestore ? collection(firestore, 'clients') : null, [firestore]);
    const { data: clients, isLoading: isLoadingClients } = useCollection<Client>(clientsQuery);
    
    // This query fetches all production documents that have any kind of scrap recorded.
    const scrapProductionQuery = useMemoFirebase(() => 
        firestore 
            ? query(collection(firestore, 'production'), orderBy('fechaISO', 'desc')) 
            : null,
    [firestore]);

    const { data: productionWithScrap, isLoading: isLoadingProduction } = useCollection<Production>(scrapProductionQuery);

    const isLoading = isLoadingPieces || isLoadingClients || isLoadingProduction;

    const aggregatedScrap = useMemo(() => {
        if (!productionWithScrap) return [];

        const scrapEntries: AggregatedScrapEntry[] = [];

        productionWithScrap.forEach(prod => {
            const monthYear = format(new Date(prod.fechaISO), 'yyyy-MM');
            
            if (prod.qtyScrap > 0) {
                scrapEntries.push({
                    id: `${prod.id}-prod`,
                    periodo: monthYear,
                    pieceId: prod.pieceId,
                    qty: prod.qtyScrap,
                    origen: prod.machineId === 'prensado-manual' ? 'Prensado Manual' : 'Producción Interna',
                    causa: 'N/A',
                });
            }
            if (prod.qtyScrapCalidad > 0) {
                 scrapEntries.push({
                    id: `${prod.id}-calidad`,
                    periodo: monthYear,
                    pieceId: prod.pieceId,
                    qty: prod.qtyScrapCalidad,
                    origen: 'Inspección de Calidad',
                    causa: prod.defecto || 'Sin especificar',
                });
            }
             if (prod.qtyArranque > 0) {
                 scrapEntries.push({
                    id: `${prod.id}-arranque`,
                    periodo: monthYear,
                    pieceId: prod.pieceId,
                    qty: prod.qtyArranque,
                    origen: 'Piezas de Arranque',
                    causa: 'N/A',
                });
            }
        });

        // Further aggregation could be done here if needed, but for now we list all sources.
        return scrapEntries.sort((a,b) => b.periodo.localeCompare(a.periodo));
    }, [productionWithScrap]);

    const getPieceCode = (pieceId: string) => pieces?.find(p => p.id === pieceId)?.codigo || 'N/A';
    const getClientName = (pieceId: string) => {
        const piece = pieces?.find(p => p.id === pieceId);
        return clients?.find(c => c.id === piece?.clienteId)?.nombre || 'N/A';
    };


  return (
    <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-headline font-bold">Historial de Scrap</h1>
          <p className="text-muted-foreground">Consulta los registros históricos de piezas desechadas por problemas de calidad.</p>
        </div>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Registros de Scrap</CardTitle>
          <CardDescription>
            Información detallada sobre las causas, cantidades y origen del scrap.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Mes</TableHead>
                <TableHead>Código de Pieza</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Origen</TableHead>
                <TableHead>Causa</TableHead>
                <TableHead className="text-right">Cantidad (unidades)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                 <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                        <Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground" />
                    </TableCell>
                </TableRow>
              )}
              {!isLoading && aggregatedScrap.map((entry) => {
                return (
                  <TableRow key={entry.id}>
                    <TableCell>{entry.periodo}</TableCell>
                    <TableCell className="font-medium">{getPieceCode(entry.pieceId)}</TableCell>
                    <TableCell>{getClientName(entry.pieceId)}</TableCell>
                    <TableCell>{entry.origen}</TableCell>
                    <TableCell>{entry.causa}</TableCell>
                    <TableCell className="text-right">{entry.qty.toLocaleString()}</TableCell>
                  </TableRow>
                );
              })}
               {!isLoading && (!aggregatedScrap || aggregatedScrap.length === 0) && (
                 <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                        No hay registros de scrap.
                    </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </main>
  );
}
