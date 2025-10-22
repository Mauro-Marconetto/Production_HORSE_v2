

'use client';

import { useState, useMemo, useEffect } from "react";
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";


interface InventoryRow {
    piece: Piece;
    state: 'Inyectado' | 'Mecanizado' | 'Granallado' | 'Listo';
    stock: number;
    totalStockForPiece: number;
}


export default function StockPage() {
    const firestore = useFirestore();
    const { toast } = useToast();

    const piecesCollection = useMemoFirebase(() => firestore ? collection(firestore, 'pieces') : null, [firestore]);
    const { data: pieces, isLoading: isLoadingPieces } = useCollection<Piece>(piecesCollection);

    const productionCollection = useMemoFirebase(() => firestore ? collection(firestore, 'production') : null, [firestore]);
    const { data: initialProduction, isLoading: isLoadingProduction, forceRefresh } = useCollection<Production>(productionCollection);

    const [allProduction, setAllProduction] = useState(initialProduction);
    const [isSubprocessDialogOpen, setIsSubprocessDialogOpen] = useState(false);
    const [subprocessForm, setSubprocessForm] = useState({ pieceId: '', process: 'mecanizado', quantity: '' });

     useMemo(() => {
        setAllProduction(initialProduction);
    }, [initialProduction]);
    
    const inventoryData = useMemo((): InventoryRow[] => {
        if (!pieces || !allProduction) return [];

        const stockByState = new Map<string, { piece: Piece; stockInyectado: number; stockMecanizado: number; stockGranallado: number; stockListo: number; }>();

        pieces.forEach(p => {
             if (!stockByState.has(p.codigo)) {
                stockByState.set(p.codigo, { 
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
            if (piece && stockByState.has(piece.codigo)) {
                const entry = stockByState.get(piece.codigo)!;
                const finalizado = (prod.qtyFinalizada || 0) + (prod.qtyAptaCalidad || 0);

                if (prod.subproceso === 'mecanizado') {
                    entry.stockMecanizado += finalizado;
                } else if (prod.subproceso === 'granallado') {
                    entry.stockGranallado += finalizado;
                } else {
                     entry.stockListo += finalizado;
                }
                entry.stockInyectado += (prod.qtySinPrensar || 0) + (prod.qtyAptaSinPrensarCalidad || 0);
            }
        });
        
        // Adjust for movements
        allProduction.forEach(prod => {
           if (prod.machineId === 'stock-transfer') {
               const piece = pieces.find(p => p.id === prod.pieceId);
               if (piece && stockByState.has(piece.codigo)) {
                    const entry = stockByState.get(piece.codigo)!;
                    // qtyFinalizada < 0 means it was moved OUT of 'Listo'
                    if (prod.qtyFinalizada < 0) {
                         if (prod.subproceso === 'mecanizado') {
                            entry.stockMecanizado += Math.abs(prod.qtyFinalizada);
                            entry.stockListo += prod.qtyFinalizada; // Decrease listo stock
                         }
                    }
               }
           }
        });

        const rows: InventoryRow[] = [];
        stockByState.forEach((data) => {
            const totalStock = data.stockInyectado + data.stockMecanizado + data.stockGranallado + data.stockListo;
            
            if (data.stockInyectado > 0) rows.push({ piece: data.piece, state: 'Inyectado', stock: data.stockInyectado, totalStockForPiece: totalStock });
            if (data.stockMecanizado > 0) rows.push({ piece: data.piece, state: 'Mecanizado', stock: data.stockMecanizado, totalStockForPiece: totalStock });
            if (data.stockGranallado > 0) rows.push({ piece: data.piece, state: 'Granallado', stock: data.stockGranallado, totalStockForPiece: totalStock });
            if (data.stockListo > 0) rows.push({ piece: data.piece, state: 'Listo', stock: data.stockListo, totalStockForPiece: totalStock });
            
            if (totalStock === 0) {
                 rows.push({ piece: data.piece, state: 'Listo', stock: 0, totalStockForPiece: 0 });
            }
        });

        return rows;
    }, [pieces, allProduction]);
    
    const isLoading = isLoadingPieces || isLoadingProduction;

    const handleSendToSubprocess = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const { pieceId, process, quantity } = subprocessForm;
        const qty = Number(quantity);

        const pieceCode = pieces?.find(p => p.id === pieceId)?.codigo;
        const listoRow = inventoryData.find(d => d.piece.id === pieceId && d.state === 'Listo');
        const stockListo = listoRow?.stock || 0;

        if (qty > stockListo) {
            toast({ title: "Error de Stock", description: `No hay suficiente stock "Listo" para la pieza ${pieceCode}. Disponible: ${stockListo}`, variant: "destructive" });
            return;
        }

        // This mock represents moving stock from 'Listo' to a subprocess
        // A negative production record for 'Listo' stock
        const mockProdSalida: Production = {
            id: `mock-out-${Date.now()}`,
            fechaISO: new Date().toISOString(),
            machineId: 'stock-transfer', // Special ID to identify this as a manual transfer
            pieceId: pieceId,
            moldId: '',
            turno: '',
            qtyFinalizada: -qty, // Negative quantity to decrease stock "Listo"
            qtySinPrensar: 0,
            qtyScrap: 0,
            qtySegregada: 0,
            subproceso: process as 'mecanizado', // The target subprocess
            inspeccionadoCalidad: true,
        };

        setAllProduction(prev => [...(prev || []), mockProdSalida]);
        
        toast({ title: "Éxito", description: `${qty.toLocaleString()} unidades de ${pieceCode} enviadas a ${process}.`});
        setIsSubprocessDialogOpen(false);
        setSubprocessForm({ pieceId: '', process: 'mecanizado', quantity: '' });
    };

    const getStateBadgeVariant = (state: InventoryRow['state']) => {
        switch(state) {
            case 'Inyectado': return 'outline';
            case 'Mecanizado': return 'secondary';
            case 'Granallado': return 'secondary';
            case 'Listo': return 'default';
            default: return 'secondary';
        }
    }

    return (
        <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-headline font-bold">Stock</h1>
                    <p className="text-muted-foreground">Monitoriza los niveles de stock en tiempo real en cada etapa del proceso.</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setIsSubprocessDialogOpen(true)}>
                        <Wrench className="mr-2 h-4 w-4" /> Enviar a Mecanizado
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
                                <TableHead className="w-[250px]">Pieza</TableHead>
                                <TableHead className="text-right">Stock Actual</TableHead>
                                <TableHead className="text-right font-bold">Stock Total (Pieza)</TableHead>
                                <TableHead className="w-[200px] text-center">Mín / Máx</TableHead>
                                <TableHead className="w-[200px] text-center">Capacidad</TableHead>
                                <TableHead className="text-center">Estado</TableHead>
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
                            {!isLoading && inventoryData.map(({ piece, state, stock, totalStockForPiece }) => {
                                const stockMin = piece.stockMin || 0;
                                const stockMax = piece.stockMax || 1;

                                const stockPercentage = stockMax > stockMin ? Math.round(((totalStockForPiece - stockMin) / (stockMax - stockMin)) * 100) : 100;
                                const status = stockPercentage < 10 ? 'critical' : stockPercentage > 90 ? 'high' : 'ok';
                                const statusText = status === 'critical' ? 'Crítico' : status === 'high' ? 'Alto' : 'Ok';

                                return (
                                    <TableRow key={`${piece.id}-${state}`}>
                                        <TableCell className="font-medium">
                                            <div className="flex items-center gap-2">
                                                <span>{piece.codigo}</span>
                                                <Badge variant={getStateBadgeVariant(state)}>{state}</Badge>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right font-semibold">{stock.toLocaleString('es-ES')}</TableCell>
                                        <TableCell className="text-right font-bold bg-muted/50">{totalStockForPiece.toLocaleString('es-ES')}</TableCell>
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
                                    <TableCell colSpan={6} className="h-24 text-center">
                                        No se encontraron piezas o datos de producción.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <Dialog open={isSubprocessDialogOpen} onOpenChange={setIsSubprocessDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Enviar Stock a Mecanizado</DialogTitle>
                        <DialogDescription>Mueve unidades del stock "Listo" al proceso externo de mecanizado.</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSendToSubprocess}>
                        <div className="grid gap-4 py-4">
                            <div className="space-y-2">
                                <Label htmlFor="sp-piece">Pieza a Mover</Label>
                                <Select required value={subprocessForm.pieceId} onValueChange={(v) => setSubprocessForm(s => ({...s, pieceId: v}))}>
                                    <SelectTrigger id="sp-piece"><SelectValue placeholder="Selecciona una pieza..." /></SelectTrigger>
                                    <SelectContent>
                                        {pieces?.filter(p => p.requiereMecanizado).map(p => <SelectItem key={p.id} value={p.id}>{p.codigo}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            
                            <div className="space-y-2">
                                <Label htmlFor="sp-quantity">Cantidad a Mover</Label>
                                <Input id="sp-quantity" type="number" required value={subprocessForm.quantity} onChange={(e) => setSubprocessForm(s => ({...s, quantity: e.target.value}))} />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsSubprocessDialogOpen(false)}>Cancelar</Button>
                            <Button type="submit">Confirmar Envío</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

        </main>
    );
}
