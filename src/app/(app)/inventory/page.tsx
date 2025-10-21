
'use client';

import { useState, useMemo, useEffect } from "react";
import { collection, doc, updateDoc } from 'firebase/firestore';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { useToast } from "@/hooks/use-toast";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle, TrendingUp, Loader2, Save } from "lucide-react";
import type { Piece, Production } from "@/lib/types";

export default function InventoryPage() {
    const firestore = useFirestore();
    const { toast } = useToast();

    const piecesCollection = useMemoFirebase(() => firestore ? collection(firestore, 'pieces') : null, [firestore]);
    const { data: pieces, isLoading: isLoadingPieces, forceRefresh: refreshPieces } = useCollection<Piece>(piecesCollection);

    const productionCollection = useMemoFirebase(() => firestore ? collection(firestore, 'production') : null, [firestore]);
    const { data: allProduction, isLoading: isLoadingProduction } = useCollection<Production>(productionCollection);

    const [editablePieces, setEditablePieces] = useState<Piece[]>([]);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (pieces) {
            setEditablePieces(pieces);
        }
    }, [pieces]);

    const handleStockChange = (pieceId: string, field: 'stockMin' | 'stockMax', value: string) => {
        const numericValue = parseInt(value, 10);
        if (isNaN(numericValue)) return;

        setEditablePieces(prevPieces =>
            prevPieces.map(p =>
                p.id === pieceId ? { ...p, [field]: numericValue } : p
            )
        );
    };

    const handleSaveStockLevels = async () => {
        if (!firestore) return;
        setIsSaving(true);
        const batch = firestore ? writeBatch(firestore) : null;
        if (!batch) return;

        let changes = 0;
        editablePieces.forEach(editable => {
            const original = pieces?.find(p => p.id === editable.id);
            if (original && (original.stockMin !== editable.stockMin || original.stockMax !== editable.stockMax)) {
                const pieceRef = doc(firestore, "pieces", editable.id);
                batch.update(pieceRef, { 
                    stockMin: editable.stockMin || 0,
                    stockMax: editable.stockMax || 0
                });
                changes++;
            }
        });

        if (changes > 0) {
            try {
                await batch.commit();
                toast({
                    title: "Éxito",
                    description: "Niveles de stock actualizados correctamente."
                });
                refreshPieces();
            } catch (error: any) {
                toast({
                    title: "Error",
                    description: "No se pudieron actualizar los niveles de stock.",
                    variant: "destructive"
                });
            }
        } else {
             toast({
                title: "Sin cambios",
                description: "No se detectaron cambios en los niveles de stock.",
            });
        }


        setIsSaving(false);
    }
    
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
                    <h1 className="text-3xl font-headline font-bold">Inventario</h1>
                    <p className="text-muted-foreground">Monitoriza y gestiona los niveles de stock en tiempo real.</p>
                </div>
                 <Button onClick={handleSaveStockLevels} disabled={isSaving}>
                    {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Guardar Cambios
                </Button>
            </div>
            <Card>
                <CardHeader>
                    <CardTitle>Niveles de Stock Actuales</CardTitle>
                    <CardDescription>Resumen de todas las piezas en inventario, diferenciando entre stock listo y sin prensar. Puedes editar los valores de Mín/Máx directamente.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[250px]">Pieza</TableHead>
                                <TableHead className="text-right">Stock Listo (OK)</TableHead>
                                <TableHead className="text-right">Stock Sin Prensar</TableHead>
                                <TableHead className="text-right">Stock Total</TableHead>
                                <TableHead className="w-[250px] text-center">Mín / Máx</TableHead>
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
                                const editablePiece = editablePieces.find(p => p.id === piece.id) || piece;
                                const stockMin = editablePiece.stockMin || 0;
                                const stockMax = editablePiece.stockMax || 1;

                                const stockPercentage = stockMax > stockMin ? Math.round(((totalStock - stockMin) / (stockMax - stockMin)) * 100) : 100;
                                const status = stockPercentage < 10 ? 'critical' : stockPercentage > 90 ? 'high' : 'ok';
                                const statusText = status === 'critical' ? 'Crítico' : status === 'high' ? 'Alto' : 'Ok';

                                return (
                                    <TableRow key={piece.id}>
                                        <TableCell className="font-medium">{piece.codigo}</TableCell>
                                        <TableCell className="text-right font-semibold">{stockListo.toLocaleString('es-ES')}</TableCell>
                                        <TableCell className="text-right text-muted-foreground">{stockSinPrensar.toLocaleString('es-ES')}</TableCell>
                                        <TableCell className="text-right font-bold">{totalStock.toLocaleString('es-ES')}</TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <Input
                                                    type="number"
                                                    value={stockMin}
                                                    onChange={(e) => handleStockChange(piece.id, 'stockMin', e.target.value)}
                                                    className="w-24 h-8 text-right"
                                                />
                                                <span>/</span>
                                                <Input
                                                    type="number"
                                                    value={stockMax}
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
