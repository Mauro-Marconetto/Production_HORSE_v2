

'use client';

import { useState, useMemo } from "react";
import { collection } from 'firebase/firestore';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { useToast } from "@/hooks/use-toast";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle, TrendingUp, Loader2, Wrench, Wind } from "lucide-react";
import type { Piece, Production } from "@/lib/types";
import { Button } from "@/components/ui/button";

interface InventoryData {
    piece: Piece;
    stockInyectado: number;
    stockMecanizado: number;
    stockGranallado: number;
    stockListo: number;
}

export default function StockPage() {
    const firestore = useFirestore();
    const { toast } = useToast();

    const piecesCollection = useMemoFirebase(() => firestore ? collection(firestore, 'pieces') : null, [firestore]);
    const { data: pieces, isLoading: isLoadingPieces } = useCollection<Piece>(piecesCollection);

    const productionCollection = useMemoFirebase(() => firestore ? collection(firestore, 'production') : null, [firestore]);
    const { data: allProduction, isLoading: isLoadingProduction } = useCollection<Production>(productionCollection);
    
    const inventoryData = useMemo((): InventoryData[] => {
        if (!pieces || !allProduction) return [];

        const pieceMap = new Map<string, InventoryData>();

        pieces.forEach(p => {
             if (!pieceMap.has(p.codigo)) {
                pieceMap.set(p.codigo, { 
                    piece: p, 
                    stockInyectado: 0,
                    stockMecanizado: 0,
                    stockGranallado: 0,
                    stockListo: 0 
                });
            }
        });
        
        allProduction.forEach(prod => {
            const piece = pieces.find(p => p.id === prod.pieceId);
            if (piece && pieceMap.has(piece.codigo)) {
                const entry = pieceMap.get(piece.codigo)!;
                const finalizado = (prod.qtyFinalizada || 0) + (prod.qtyAptaCalidad || 0);

                if (prod.subproceso === 'mecanizado') {
                    entry.stockMecanizado += finalizado;
                } else if (prod.subproceso === 'granallado') {
                    entry.stockGranallado += finalizado;
                } else if (piece.requiereGranallado) { 
                    // Si requiere granallado pero no viene de ese proceso, va a stock bruto
                    entry.stockInyectado += finalizado;
                }
                else {
                    entry.stockListo += finalizado;
                }

                // Las piezas sin prensar siempre son stock inyectado bruto
                entry.stockInyectado += (prod.qtySinPrensar || 0) + (prod.qtyAptaSinPrensarCalidad || 0);
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
                    <p className="text-muted-foreground">Monitoriza los niveles de stock en tiempo real en cada etapa del proceso.</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline">
                        <Wrench className="mr-2 h-4 w-4" /> Enviar para Mecanizado
                    </Button>
                </div>
            </div>
            <Card>
                <CardHeader>
                    <CardTitle>Niveles de Stock por Etapa</CardTitle>
                    <CardDescription>Resumen de todas las piezas en stock, diferenciando entre cada etapa del proceso productivo.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[150px]">Pieza</TableHead>
                                <TableHead className="text-right">Inyectado (Bruto)</TableHead>
                                <TableHead className="text-right">Mecanizado</TableHead>
                                <TableHead className="text-right">Granallado</TableHead>
                                <TableHead className="text-right">Listo (OK)</TableHead>
                                <TableHead className="text-right font-bold">Stock Total</TableHead>
                                <TableHead className="w-[200px] text-center">Mín / Máx</TableHead>
                                <TableHead className="w-[200px] text-center">Capacidad</TableHead>
                                <TableHead className="text-center">Estado</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading && (
                                <TableRow>
                                    <TableCell colSpan={9} className="h-24 text-center">
                                        <Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground" />
                                    </TableCell>
                                </TableRow>
                            )}
                            {!isLoading && inventoryData.map(({ piece, stockInyectado, stockMecanizado, stockGranallado, stockListo }) => {
                                const totalStock = stockInyectado + stockMecanizado + stockGranallado + stockListo;
                                const stockMin = piece.stockMin || 0;
                                const stockMax = piece.stockMax || 1;

                                const stockPercentage = stockMax > stockMin ? Math.round(((totalStock - stockMin) / (stockMax - stockMin)) * 100) : 100;
                                const status = stockPercentage < 10 ? 'critical' : stockPercentage > 90 ? 'high' : 'ok';
                                const statusText = status === 'critical' ? 'Crítico' : status === 'high' ? 'Alto' : 'Ok';

                                return (
                                    <TableRow key={piece.id}>
                                        <TableCell className="font-medium">{piece.codigo}</TableCell>
                                        <TableCell className="text-right">{stockInyectado.toLocaleString('es-ES')}</TableCell>
                                        <TableCell className="text-right">{stockMecanizado.toLocaleString('es-ES')}</TableCell>
                                        <TableCell className="text-right">{stockGranallado.toLocaleString('es-ES')}</TableCell>
                                        <TableCell className="text-right font-semibold">{stockListo.toLocaleString('es-ES')}</TableCell>
                                        <TableCell className="text-right font-bold bg-muted/50">{totalStock.toLocaleString('es-ES')}</TableCell>
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
                                    <TableCell colSpan={9} className="h-24 text-center">
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
