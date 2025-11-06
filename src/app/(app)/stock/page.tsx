

'use client';

import { useState, useMemo, useEffect } from "react";
import { collection, addDoc, serverTimestamp, writeBatch, doc, getDoc, updateDoc, increment } from 'firebase/firestore';
import { useFirestore, useCollection, useMemoFirebase, errorEmitter, FirestorePermissionError } from '@/firebase';
import { useToast } from "@/hooks/use-toast";
import { useRouter } from 'next/navigation';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle, TrendingUp, Loader2, Wrench, Wind, Plus, Trash2, Printer, ArrowRight, ShieldAlert } from "lucide-react";
import type { Piece, Inventory, Supplier, Remito, RemitoItem, RemitoSettings, Production } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";


interface InventoryRow {
    piece: Piece;
    state: 'Sin Prensar' | 'En Mecanizado' | 'Mecanizado' | 'Granallado' | 'Listo' | 'Pendiente Calidad';
    stock: number;
    totalStockForPiece: number;
}


export default function StockPage() {
    const firestore = useFirestore();
    const router = useRouter();
    const { toast } = useToast();

    const piecesCollection = useMemoFirebase(() => firestore ? collection(firestore, 'pieces') : null, [firestore]);
    const { data: pieces, isLoading: isLoadingPieces } = useCollection<Piece>(piecesCollection);

    const inventoryCollection = useMemoFirebase(() => firestore ? collection(firestore, 'inventory') : null, [firestore]);
    const { data: inventory, isLoading: isLoadingInventory, forceRefresh } = useCollection<Inventory>(inventoryCollection);
    
    const productionQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'production'), where('inspeccionadoCalidad', '==', false)) : null, [firestore]);
    const { data: pendingProduction, isLoading: isLoadingProduction } = useCollection<Production>(productionQuery);

    const suppliersCollection = useMemoFirebase(() => firestore ? collection(firestore, 'suppliers') : null, [firestore]);
    const { data: suppliers, isLoading: isLoadingSuppliers } = useCollection<Supplier>(suppliersCollection);

    const [isRemitoDialogOpen, setIsRemitoDialogOpen] = useState(false);
    const [createdRemitoId, setCreatedRemitoId] = useState<string | null>(null);
    const [remitoForm, setRemitoForm] = useState({ supplierId: '' });
    const [remitoItems, setRemitoItems] = useState<RemitoItem[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    
    const inventoryData = useMemo((): InventoryRow[] => {
        if (!pieces || !inventory || !pendingProduction) return [];
        
        const rows: InventoryRow[] = [];

        const pendingQualityStock = new Map<string, number>();
        pendingProduction.forEach(prod => {
            if (prod.qtySegregada > 0) {
                pendingQualityStock.set(prod.pieceId, (pendingQualityStock.get(prod.pieceId) || 0) + prod.qtySegregada);
            }
        });

        pieces.forEach(piece => {
            const invItem = inventory.find(i => i.id === piece.id);
            
            const stockInyectado = invItem?.stockInyectado || 0;
            const stockEnMecanizado = invItem?.stockEnMecanizado || 0;
            const stockMecanizado = invItem?.stockMecanizado || 0;
            const stockGranallado = invItem?.stockGranallado || 0;
            const stockListo = invItem?.stockListo || 0;
            const stockPendiente = pendingQualityStock.get(piece.id) || 0;

            const totalStock = stockInyectado + stockEnMecanizado + stockMecanizado + stockGranallado + stockListo;

            if (stockInyectado > 0) rows.push({ piece, state: 'Sin Prensar', stock: stockInyectado, totalStockForPiece: totalStock });
            if (stockEnMecanizado > 0) rows.push({ piece, state: 'En Mecanizado', stock: stockEnMecanizado, totalStockForPiece: totalStock });
            if (stockMecanizado > 0) rows.push({ piece, state: 'Mecanizado', stock: stockMecanizado, totalStockForPiece: totalStock });
            if (stockGranallado > 0) rows.push({ piece, state: 'Granallado', stock: stockGranallado, totalStockForPiece: totalStock });
            if (stockListo > 0) rows.push({ piece, state: 'Listo', stock: stockListo, totalStockForPiece: totalStock });
            if (stockPendiente > 0) rows.push({ piece, state: 'Pendiente Calidad', stock: stockPendiente, totalStockForPiece: totalStock });
            
            const pieceHasRow = rows.some(r => r.piece.id === piece.id);
            if (!pieceHasRow) {
                 rows.push({ piece, state: 'Listo', stock: 0, totalStockForPiece: 0 });
            }
        });

        return rows;
    }, [pieces, inventory, pendingProduction]);
    
    const isLoading = isLoadingPieces || isLoadingInventory || isLoadingSuppliers || isLoadingProduction;

    const handleCreateRemito = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!firestore) return;
        
        if (remitoItems.length === 0 || remitoItems.some(item => !item.pieceId || !item.qty || item.qty <= 0)) {
            toast({ title: "Error", description: "Completa todos los ítems del remito con cantidades válidas.", variant: "destructive"});
            return;
        }

        for (const item of remitoItems) {
            const invItem = inventory?.find(i => i.id === item.pieceId);
            const stockListo = invItem?.stockListo || 0;
            if (item.qty > stockListo) {
                const pieceCode = pieces?.find(p => p.id === item.pieceId)?.codigo;
                toast({ title: "Error de Stock", description: `No hay suficiente stock "Listo" para la pieza ${pieceCode}. Disponible: ${stockListo}`, variant: "destructive" });
                return;
            }
        }

        setIsSaving(true);
        
        try {
            const batch = writeBatch(firestore);
            const settingsRef = doc(firestore, "settings", "remitos");
            const settingsSnap = await getDoc(settingsRef);
            if (!settingsSnap.exists()) {
                throw new Error("La configuración de remitos no existe.");
            }
            const remitoSettings = settingsSnap.data() as RemitoSettings;
            const currentRemitoNumber = remitoSettings.nextRemitoNumber || 1;
            
            const remitoData: Omit<Remito, 'id'> = {
                supplierId: remitoForm.supplierId,
                transportista: 'CAT ARGENTINA SA - CARGO UTE',
                vehiculo: 'Camilo Henriquez N° 2808-Santa Isabel 3º Seccion, 5017 CÓRDOBA - ARGENTINA',
                transportistaCuit: '30-69847536-2',
                numero: currentRemitoNumber,
                fecha: new Date().toISOString(),
                status: 'enviado',
                items: remitoItems,
            };

            const remitosCollectionRef = collection(firestore, "remitos");
            const remitoRef = doc(remitosCollectionRef);
            batch.set(remitoRef, remitoData);
            
            // Update inventory for each item
            remitoItems.forEach(item => {
                const inventoryDocRef = doc(firestore, "inventory", item.pieceId);
                batch.update(inventoryDocRef, {
                    stockListo: increment(-item.qty),
                    stockEnMecanizado: increment(item.qty),
                });
            });
            
            batch.update(settingsRef, { nextRemitoNumber: currentRemitoNumber + 1 });

            await batch.commit();
            
            toast({ title: "Éxito", description: "Remito creado y stock actualizado correctamente." });
            setCreatedRemitoId(remitoRef.id);
            setIsRemitoDialogOpen(false);
            setRemitoForm({ supplierId: '' });
            setRemitoItems([]);
            forceRefresh();

        } catch (error) {
             console.error('Error creating remito:', error);
             toast({ title: 'Error', description: 'No se pudo crear el remito o actualizar el stock.', variant: 'destructive'});
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

    const closeSuccessDialog = () => {
        setCreatedRemitoId(null);
    };

    const getStateBadgeVariant = (state: InventoryRow['state']) => {
        switch(state) {
            case 'Sin Prensar': return 'outline';
            case 'En Mecanizado': return 'destructive';
            case 'Mecanizado': return 'secondary';
            case 'Granallado': return 'secondary';
            case 'Pendiente Calidad': return 'destructive';
            case 'Listo': return 'default';
            default: return 'secondary';
        }
    }
    
    const getStateBadgeIcon = (state: InventoryRow['state']) => {
        if (state === 'En Mecanizado') return <Wrench className="mr-1 h-3 w-3" />;
        if (state === 'Granallado') return <Wind className="mr-1 h-3 w-3" />;
        if (state === 'Pendiente Calidad') return <ShieldAlert className="mr-1 h-3 w-3" />;
        return null;
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
                                                <Badge variant={getStateBadgeVariant(state)}>
                                                    {getStateBadgeIcon(state)}
                                                    {state}
                                                </Badge>
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
                                        No se encontraron piezas o datos de inventario.
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
                        <DialogTitle>Enviar a Mecanizado</DialogTitle>
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

            <Dialog open={!!createdRemitoId} onOpenChange={(open) => !open && closeSuccessDialog()}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>¡Remito Creado con Éxito!</DialogTitle>
                        <DialogDescription>
                            El remito ha sido generado y el stock ha sido actualizado. ¿Qué deseas hacer a continuación?
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="sm:justify-center pt-4 gap-2">
                        <Button type="button" onClick={() => router.push(`/remito/${createdRemitoId}`)}>
                            <Printer className="mr-2 h-4 w-4" />
                            Imprimir Remito
                        </Button>
                        <Button type="button" variant="secondary" onClick={() => router.push('/machining')}>
                             <ArrowRight className="mr-2 h-4 w-4" />
                             Ir a Mecanizado
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

        </main>
    );
}

    
