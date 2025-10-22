

'use client';

import { useState, useMemo, useEffect } from "react";
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useFirestore, useCollection, useMemoFirebase, errorEmitter, FirestorePermissionError } from '@/firebase';
import { useToast } from "@/hooks/use-toast";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle, TrendingUp, Loader2, Wrench, Wind, Plus, Trash2 } from "lucide-react";
import type { Piece, Production, Supplier, Remito, RemitoItem } from "@/lib/types";
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
    
    const suppliersCollection = useMemoFirebase(() => firestore ? collection(firestore, 'suppliers') : null, [firestore]);
    const { data: suppliers, isLoading: isLoadingSuppliers } = useCollection<Supplier>(suppliersCollection);

    const [allProduction, setAllProduction] = useState(initialProduction);
    const [isRemitoDialogOpen, setIsRemitoDialogOpen] = useState(false);
    const [remitoForm, setRemitoForm] = useState({ supplierId: '', transportista: '', vehiculo: '' });
    const [remitoItems, setRemitoItems] = useState<RemitoItem[]>([]);
    const [isSaving, setIsSaving] = useState(false);

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
    
    const isLoading = isLoadingPieces || isLoadingProduction || isLoadingSuppliers;

    const handleCreateRemito = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!firestore) return;
        
        if (remitoItems.length === 0 || remitoItems.some(item => !item.pieceId || !item.qty || item.qty <= 0)) {
            toast({ title: "Error", description: "Completa todos los ítems del remito con cantidades válidas.", variant: "destructive"});
            return;
        }

        // Validate stock for each item
        for (const item of remitoItems) {
            const listoRow = inventoryData.find(d => d.piece.id === item.pieceId && d.state === 'Listo');
            const stockListo = listoRow?.stock || 0;
            if (item.qty > stockListo) {
                const pieceCode = pieces?.find(p => p.id === item.pieceId)?.codigo;
                toast({ title: "Error de Stock", description: `No hay suficiente stock "Listo" para la pieza ${pieceCode}. Disponible: ${stockListo}`, variant: "destructive" });
                return;
            }
        }

        setIsSaving(true);

        const remitoData: Omit<Remito, 'id'> = {
            ...remitoForm,
            fecha: new Date().toISOString(),
            status: 'enviado',
            items: remitoItems,
        };

        try {
            await addDoc(collection(firestore, "remitos"), remitoData);
            
            // Here you would also create the negative production parts to update stock,
            // for now, we'll just show a success toast.
            
            toast({ title: "Éxito", description: "Remito creado correctamente." });
            setIsRemitoDialogOpen(false);
            setRemitoForm({ supplierId: '', transportista: '', vehiculo: '' });
            setRemitoItems([]);
        } catch (error) {
            const contextualError = new FirestorePermissionError({
                path: 'remitos',
                operation: 'create',
                requestResourceData: remitoData,
            });
            errorEmitter.emit('permission-error', contextualError);
        } finally {
            setIsSaving(false);
        }
    };
    
    const addRemitoItem = () => {
        setRemitoItems([...remitoItems, { pieceId: '', qty: 0 }]);
    }
    
    const updateRemitoItem = (index: number, field: keyof RemitoItem, value: string | number) => {
        const newItems = [...remitoItems];
        (newItems[index] as any)[field] = value;
        setRemitoItems(newItems);
    }
    
    const removeRemitoItem = (index: number) => {
        setRemitoItems(remitoItems.filter((_, i) => i !== index));
    }


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
                    <Button variant="outline" onClick={() => setIsRemitoDialogOpen(true)}>
                        <Wrench className="mr-2 h-4 w-4" /> Crear Remito de Mecanizado
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
                            {!isLoading && inventoryData.map(({ piece, state, stock, totalStockForPiece }, index) => {
                                const stockMin = piece.stockMin || 0;
                                const stockMax = piece.stockMax || 1;

                                const stockPercentage = stockMax > stockMin ? Math.round(((totalStockForPiece - stockMin) / (stockMax - stockMin)) * 100) : 100;
                                const status = stockPercentage < 10 ? 'critical' : stockPercentage > 90 ? 'high' : 'ok';
                                const statusText = status === 'critical' ? 'Crítico' : status === 'high' ? 'Alto' : 'Ok';

                                return (
                                    <TableRow key={`${piece.id}-${state}-${index}`}>
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

            <Dialog open={isRemitoDialogOpen} onOpenChange={setIsRemitoDialogOpen}>
                <DialogContent className="sm:max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Crear Remito de Mecanizado</DialogTitle>
                        <DialogDescription>Genera un nuevo remito para enviar piezas a un proveedor externo.</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleCreateRemito}>
                        <div className="grid gap-4 py-4">
                            <div className="space-y-2">
                                <Label htmlFor="rem-supplier">Proveedor</Label>
                                <Select required value={remitoForm.supplierId} onValueChange={(v) => setRemitoForm(s => ({...s, supplierId: v}))}>
                                    <SelectTrigger id="rem-supplier"><SelectValue placeholder="Selecciona un proveedor..." /></SelectTrigger>
                                    <SelectContent>
                                        {suppliers?.map(s => <SelectItem key={s.id} value={s.id}>{s.nombre}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="rem-transportista">Transportista</Label>
                                    <Input id="rem-transportista" required value={remitoForm.transportista} onChange={(e) => setRemitoForm(s => ({...s, transportista: e.target.value}))} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="rem-vehiculo">Vehículo</Label>
                                    <Input id="rem-vehiculo" value={remitoForm.vehiculo} onChange={(e) => setRemitoForm(s => ({...s, vehiculo: e.target.value}))} />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>Ítems del Remito</Label>
                                <div className="space-y-2 rounded-md border p-2">
                                    {remitoItems.map((item, index) => (
                                        <div key={index} className="flex items-center gap-2">
                                            <Select value={item.pieceId} onValueChange={(v) => updateRemitoItem(index, 'pieceId', v)}>
                                                <SelectTrigger className="flex-1"><SelectValue placeholder="Selecciona pieza..." /></SelectTrigger>
                                                <SelectContent>
                                                    {pieces?.filter(p => p.requiereMecanizado).map(p => <SelectItem key={p.id} value={p.id}>{p.codigo}</SelectItem>)}
                                                </SelectContent>
                                            </Select>
                                            <Input 
                                                type="number" 
                                                placeholder="Cantidad" 
                                                className="w-32" 
                                                value={item.qty || ''} 
                                                onChange={(e) => updateRemitoItem(index, 'qty', Number(e.target.value))}
                                            />
                                            <Button type="button" variant="ghost" size="icon" onClick={() => removeRemitoItem(index)}><Trash2 className="h-4 w-4 text-destructive"/></Button>
                                        </div>
                                    ))}
                                     <Button type="button" variant="outline" size="sm" onClick={addRemitoItem} className="w-full">
                                        <Plus className="mr-2 h-4 w-4" /> Añadir Ítem
                                    </Button>
                                </div>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsRemitoDialogOpen(false)}>Cancelar</Button>
                            <Button type="submit" disabled={isSaving}>
                                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
                                Crear Remito
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

        </main>
    );
}

    