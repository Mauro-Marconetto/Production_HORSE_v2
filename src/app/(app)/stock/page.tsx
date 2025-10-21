

'use client';

import { useState, useMemo } from "react";
import { collection } from 'firebase/firestore';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { useToast } from "@/hooks/use-toast";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle, TrendingUp, Loader2, PlusCircle } from "lucide-react";
import type { Piece, Production } from "@/lib/types";
import { Button } from "@/components/ui/button";

export default function StockPage() {
    const firestore = useFirestore();
    const { toast } = useToast();

    const piecesCollection = useMemoFirebase(() => firestore ? collection(firestore, 'pieces') : null, [firestore]);
    const { data: pieces, isLoading: isLoadingPieces } = useCollection<Piece>(piecesCollection);

    const productionCollection = useMemoFirebase(() => firestore ? collection(firestore, 'production') : null, [firestore]);
    const { data: allProduction, isLoading: isLoadingProduction } = useCollection<Production>(productionCollection);
    
    const inventoryData = useMemo(() => {
        if (!pieces || !allProduction) return [];

        const pieceMap = new Map<string, { piece: Piece; stockListo: number; stockSinPrensar: number }>();

        pieces.forEach(p => {
             if (!pieceMap.has(p.codigo)) {
                pieceMap.set(p.codigo, { piece: p, stockListo: 0, stockSinPrensar: 0 });
            }
        });
        
        allProduction.forEach(prod => {
            const piece = pieces.find(p => p.id === prod.pieceId);
            if (piece && pieceMap.has(piece.codigo)) {
                const entry = pieceMap.get(piece.codigo)!;
                entry.stockListo += (prod.qtyFinalizada || 0) + (prod.qtyAptaCalidad || 0);
                entry.stockSinPrensar += (prod.qtySinPrensar || 0) + (prod.qtyAptaSinPrensarCalidad || 0);
            }
        });

        return Array.from(pieceMap.values());
    }, [pieces, allProduction]);
    
    const isLoading = isLoadingPieces || isLoadingProduction;

    return (
        <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-headline font-bold">Stock</h1>
                    <p className="text-muted-foreground">Monitoriza los niveles de stock en tiempo real.</p>
                </div>
                <Button>
                    <PlusCircle className="mr-2 h-4 w-4" /> Enviar Lote
                </Button>
            </div>
            <Card>
                <CardHeader>
                    <CardTitle>Niveles de Stock Actuales</CardTitle>
                    <CardDescription>Resumen de todas las piezas en stock, diferenciando entre stock listo y sin prensar. Los niveles Mín/Máx se configuran en el catálogo de piezas.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[250px]">Pieza</TableHead>
                                <TableHead className="text-right">Stock Listo (OK)</TableHead>
                                <TableHead className="text-right">Stock Sin Prensar</TableHead>
                                <TableHead className="text-right">Stock Total</TableHead>
                                <TableHead className="w-[200px] text-center">Mín / Máx</TableHead>
                                <TableHead className="w-[200px] text-center">Capacidad</TableHead>
                                <TableHead className="text-center">Estado</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading && (
                                <TableRow>
                                    <TableCell colSpan={7} className="h-24 text-center">
                                        <Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground" />
                                    </TableCell>
                                </TableRow>
                            )}
                            {!isLoading && inventoryData.map(({ piece, stockListo, stockSinPrensar }) => {
                                const totalStock = stockListo + stockSinPrensar;
                                const stockMin = piece.stockMin || 0;
                                const stockMax = piece.stockMax || 1;

                                const stockPercentage = stockMax > stockMin ? Math.round(((totalStock - stockMin) / (stockMax - stockMin)) * 100) : 100;
                                const status = stockPercentage < 10 ? 'critical' : stockPercentage > 90 ? 'high' : 'ok';
                                const statusText = status === 'critical' ? 'Crítico' : status === 'high' ? 'Alto' : 'Ok';

                                return (
                                    <TableRow key={piece.id}>
                                        <TableCell className="font-medium">{piece.codigo}</TableCell>
                                        <TableCell className="text-right font-semibold">{stockListo.toLocaleString('es-ES')}</TableCell>
                                        <TableCell className="text-right text-muted-foreground">{stockSinPrensar.toLocaleString('es-ES')}</TableCell>
                                        <TableCell className="text-right font-bold">{totalStock.toLocaleString('es-ES')}</TableCell>
                                        <TableCell className="text-center">
                                            <div className="flex items-center justify-center gap-2">
                                                <span className="font-mono text-sm">{stockMin.toLocaleString('es-ES')}</span>
                                                <span className="text-muted-foreground">/</span>
                                                <span className="font-mono text-sm">{stockMax.toLocaleString('es-ES')}</span>
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
                            {!isLoading && inventoryData.length === 0 && (
                                 <TableRow>
                                    <TableCell colSpan={7} className="h-24 text-center">
                                        No se encontraron piezas o datos de producción.
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
