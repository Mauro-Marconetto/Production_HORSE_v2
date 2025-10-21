
'use client';

import { useMemo } from "react";
import { collection, query } from 'firebase/firestore';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2 } from "lucide-react";
import type { ScrapEntry, Piece, Client } from "@/lib/types";


export default function ScrapHistoryPage() {
    const firestore = useFirestore();

    const scrapQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'scrap')) : null, [firestore]);
    const { data: scrap, isLoading: isLoadingScrap } = useCollection<ScrapEntry>(scrapQuery);

    const { data: pieces, isLoading: isLoadingPieces } = useCollection<Piece>(useMemoFirebase(() => firestore ? collection(firestore, 'pieces') : null, [firestore]));
    const { data: clients, isLoading: isLoadingClients } = useCollection<Client>(useMemoFirebase(() => firestore ? collection(firestore, 'clients') : null, [firestore]));

    const isLoading = isLoadingScrap || isLoadingPieces || isLoadingClients;
    
    const sortedScrap = useMemo(() => {
        if (!scrap) return [];
        return [...scrap].sort((a,b) => b.periodoYYYYMM.localeCompare(a.periodoYYYYMM));
    }, [scrap]);

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
            Información detallada sobre las causas y cantidades de scrap.
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
              {isLoading && (
                 <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
                        <Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground" />
                    </TableCell>
                </TableRow>
              )}
              {!isLoading && sortedScrap.map((entry) => {
                return (
                  <TableRow key={entry.id}>
                    <TableCell>{entry.periodoYYYYMM.slice(0,4)}-{entry.periodoYYYYMM.slice(4)}</TableCell>
                    <TableCell className="font-medium">{getPieceCode(entry.pieceId)}</TableCell>
                    <TableCell>{getClientName(entry.pieceId)}</TableCell>
                    <TableCell>{entry.causa}</TableCell>
                    <TableCell className="text-right">{entry.qty.toLocaleString()}</TableCell>
                  </TableRow>
                );
              })}
               {!isLoading && (!sortedScrap || sortedScrap.length === 0) && (
                 <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
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
