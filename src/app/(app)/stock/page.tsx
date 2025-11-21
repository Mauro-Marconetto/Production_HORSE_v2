
'use client';

import { useState, useMemo, useEffect } from "react";
import { collection, addDoc, serverTimestamp, writeBatch, doc, getDoc, updateDoc, increment, query, where } from 'firebase/firestore';
import { useFirestore, useCollection, useMemoFirebase, errorEmitter, FirestorePermissionError } from '@/firebase';
import { useToast } from "@/hooks/use-toast";
import { useRouter } from 'next/navigation';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle, TrendingUp, Loader2, Wrench, Wind, Plus, Trash2, Printer, ArrowRight, ShieldAlert, Package, Ship } from "lucide-react";
import type { Piece, Inventory, Supplier, Remito, RemitoItem, RemitoSettings, Production, MachiningProcess, Client, Export, QualityLot } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";


interface InventoryRow {
    piece: Piece;
    state: 'Sin Prensar' | 'En Mecanizado' | 'Mecanizado' | 'Granallado' | 'Listo' | 'Pendiente Calidad' | 'Ensamblado';
    stock: number;
    totalStockForPiece: number;
}

interface ExportItem {
    pieceId: string;
    qty: number;
    origenStock: 'stockListo' | 'stockEnsamblado';
}


export default function StockPage() {
    const firestore = useFirestore();
    const router = useRouter();
    const { toast } = useToast();

    const piecesCollection = useMemoFirebase(() => firestore ? collection(firestore, 'pieces') : null, [firestore]);
    const { data: pieces, isLoading: isLoadingPieces } = useCollection<Piece>(piecesCollection);

    const inventoryCollection = useMemoFirebase(() => firestore ? collection(firestore, 'inventory') : null, [firestore]);
    const { data: inventory, isLoading: isLoadingInventory, forceRefresh } = useCollection<Inventory>(inventoryCollection);
    
    const qualityQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'quality'), where('status', '==', 'pending')) : null, [firestore]);
    const { data: pendingQualityLots, isLoading: isLoadingQuality } = useCollection<QualityLot>(qualityQuery);

    const machiningQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'machining')) : null, [firestore]);
    const { data: machiningProcesses, isLoading: isLoadingMachining } = useCollection<MachiningProcess>(machiningQuery);

    const suppliersCollection = useMemoFirebase(() => firestore ? collection(firestore, 'suppliers') : null, [firestore]);
    const { data: suppliers, isLoading: isLoadingSuppliers } = useCollection<Supplier>(suppliersCollection);
    
    const clientsCollection = useMemoFirebase(() => firestore ? collection(firestore, 'clients') : null, [firestore]);
    const { data: clients, isLoading: isLoadingClients } = useCollection<Client>(clientsCollection);

    const [isRemitoDialogOpen, setIsRemitoDialogOpen] = useState(false);
    const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
    const [createdRemitoId, setCreatedRemitoId] = useState<string | null>(null);
    const [remitoForm, setRemitoForm] = useState({ supplierId: '' });
    const [remitoItems, setRemitoItems] = useState<RemitoItem[]>([]);
    
    const [exportForm, setExportForm] = useState({ clientId: '' });
    const [exportItems, setExportItems] = useState<ExportItem[]>([]);

    const [isSaving, setIsSaving] = useState(false);
    
    const inventoryData = useMemo((): InventoryRow[] => {
        if (!pieces || !inventory || !machiningProcesses) return [];
        
        const rows: InventoryRow[] = [];

        const pendingQualityStock = new Map<string, number>();
        if(pendingQualityLots) {
            pendingQualityLots.forEach(lot => {
                pendingQualityStock.set(lot.pieceId, (pendingQualityStock.get(lot.pieceId) || 0) + lot.qtySegregada);
            });
        }
        
        const machiningStock = new Map<string, number>();
        machiningProcesses.forEach(proc => {
            machiningStock.set(proc.pieceId, (machiningStock.get(proc.pieceId) || 0) + proc.qtyEnviada);
        });


        pieces.forEach(piece => {
            const invItem = inventory.find(i => i.id === piece.id);
            
            const stockInyectado = invItem?.stockInyectado || 0;
            const stockEnMecanizado = machiningStock.get(piece.id) || 0;
            
            let stockMecanizado = invItem?.stockMecanizado || 0;
            const stockGranallado = invItem?.stockGranallado || 0;
            let stockListo = invItem?.stockListo || 0;
            const stockEnsamblado = invItem?.stockEnsamblado || 0;
            const stockPendiente = pendingQualityStock.get(piece.id) || 0;

            if (!piece.requiereEnsamblado && stockMecanizado > 0) {
              stockListo += stockMecanizado;
              stockMecanizado = 0;
            }
            

            const totalStock = stockInyectado + stockEnMecanizado + stockMecanizado + stockGranallado + stockListo + stockEnsamblado + stockPendiente;

            if (stockInyectado > 0) rows.push({ piece, state: 'Sin Prensar', stock: stockInyectado, totalStockForPiece: totalStock });
            if (stockEnMecanizado > 0) rows.push({ piece, state: 'En Mecanizado', stock: stockEnMecanizado, totalStockForPiece: totalStock });
            if (stockMecanizado > 0) rows.push({ piece, state: 'Mecanizado', stock: stockMecanizado, totalStockForPiece: totalStock });
            if (stockGranallado > 0) rows.push({ piece, state: 'Granallado', stock: stockGranallado, totalStockForPiece: totalStock });
            if (stockListo > 0) rows.push({ piece, state: 'Listo', stock: stockListo, totalStockForPiece: totalStock });
            if (stockEnsamblado > 0) rows.push({ piece, state: 'Ensamblado', stock: stockEnsamblado, totalStockForPiece: totalStock });
            if (stockPendiente > 0) rows.push({ piece, state: 'Pendiente Calidad', stock: stockPendiente, totalStockForPiece: totalStock });
            
            const pieceHasRow = rows.some(r => r.piece.id === piece.id);
            if (!pieceHasRow) {
                 rows.push({ piece, state: 'Listo', stock: 0, totalStockForPiece: 0 });
            }
        });

        return rows;
    }, [pieces, inventory, pendingQualityLots, machiningProcesses]);
    
    const isLoading = isLoadingPieces || isLoadingInventory || isLoadingSuppliers || isLoadingQuality || isLoadingClients || isLoadingMachining;

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
            
            const remitosCollectionRef = collection(firestore, "remitos");
            const remitoRef = doc(remitosCollectionRef);

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

            batch.set(remitoRef, remitoData);
            
            // Update inventory and create machining process for each item
            for (const item of remitoItems) {
                const inventoryDocRef = doc(firestore, "inventory", item.pieceId);
                batch.update(inventoryDocRef, {
                    stockListo: increment(-item.qty),
                });
                
                const machiningId = `machining-${Date.now()}-${item.pieceId}`;
                const machiningDocRef = doc(firestore, "machining", machiningId);
                const machiningData: MachiningProcess = {
                    id: machiningId,
                    remitoId: remitoRef.id,
                    pieceId: item.pieceId,
                    qtyEnviada: item.qty,
                    status: 'Enviado',
                };
                batch.set(machiningDocRef, machiningData);
            }
            
            batch.update(settingsRef, { nextRemitoNumber: currentRemitoNumber + 1 });

            await batch.commit();
            
            toast({ title: "Éxito", description: "Remito creado, stock actualizado y proceso de mecanizado iniciado." });
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

     const handleCreateExport = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!firestore) return;
        
        if (exportItems.length === 0 || exportItems.some(item => !item.pieceId || !item.qty || item.qty <= 0)) {
            toast({ title: "Error", description: "Completa todos los ítems de la exportación.", variant: "destructive"});
            return;
        }

        for (const item of exportItems) {
            const invItem = inventory?.find(i => i.id === item.pieceId);
            const availableStock = invItem?.[item.origenStock] || 0;
            if (item.qty > availableStock) {
                const pieceCode = pieces?.find(p => p.id === item.pieceId)?.codigo;
                const stockName = item.origenStock === 'stockListo' ? 'Listo' : 'Ensamblado';
                toast({ title: "Error de Stock", description: `No hay suficiente stock "${stockName}" para la pieza ${pieceCode}. Disponible: ${availableStock}`, variant: "destructive" });
                return;
            }
        }

        setIsSaving(true);
        
        try {
            const batch = writeBatch(firestore);
            
            for (const item of exportItems) {
                 const exportData: Omit<Export, 'id'> = {
                    clientId: exportForm.clientId,
                    pieceId: item.pieceId,
                    qty: item.qty,
                    origenStock: item.origenStock,
                    fecha: new Date().toISOString(),
                };
                const exportDocRef = doc(collection(firestore, "exports"));
                batch.set(exportDocRef, exportData);
                
                const inventoryDocRef = doc(firestore, "inventory", item.pieceId);
                batch.update(inventoryDocRef, {
                    [item.origenStock]: increment(-item.qty),
                });
            }

            await batch.commit();
            
            toast({ title: "Éxito", description: "Exportación registrada y stock actualizado." });
            setIsExportDialogOpen(false);
            setExportForm({ clientId: '' });
            setExportItems([]);
            forceRefresh();

        } catch (error) {
             console.error('Error creating export:', error);
             toast({ title: 'Error', description: 'No se pudo registrar la exportación.', variant: 'destructive'});
        } finally {
            setIsSaving(false);
        }
    };
    
    const addRemitoItem = () => setRemitoItems([...remitoItems, { pieceId: '', qty: 0 }]);
    const updateRemitoItem = (index: number, field: keyof RemitoItem, value: string | number) => {
        const newItems = [...remitoItems];
        (newItems[index] as any)[field] = value;
        setRemitoItems(newItems);
    }
    const removeRemitoItem = (index: number) => setRemitoItems(remitoItems.filter((_, i) => i !== index));

    const addExportItem = () => setExportItems([...exportItems, { pieceId: '', qty: 0, origenStock: 'stockListo' }]);
    const updateExportItem = (index: number, field: keyof ExportItem, value: string | number) => {
        const newItems = [...exportItems];
        (newItems[index] as any)[field] = value;
        setExportItems(newItems);
    }
    const removeExportItem = (index: number) => setExportItems(exportItems.filter((_, i) => i !== index));


    const closeSuccessDialog = () => setCreatedRemitoId(null);

    const getStateBadgeVariant = (state: InventoryRow['state']) => {
        switch(state) {
            case 'Sin Prensar': return 'outline';
            case 'En Mecanizado': return 'destructive';
            case 'Mecanizado': return 'default';
            case 'Granallado': return 'secondary';
            case 'Pendiente Calidad': return 'destructive';
            case 'Listo': return 'default';
            case 'Ensamblado': return 'default';
            default: return 'secondary';
        }
    }
    
    const getStateBadgeIcon = (state: InventoryRow['state']) => {
        if (state === 'En Mecanizado') return <Wrench className="mr-1 h-3 w-3" />;
        if (state === 'Granallado') return <Wind className="mr-1 h-3 w-3" />;
        if (state === 'Pendiente Calidad') return <ShieldAlert className="mr-1 h-3 w-3" />;
        if (state === 'Ensamblado') return <Package className="mr-1 h-3 w-3" />;
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
                    <Button variant="default" onClick={() => setIsExportDialogOpen(true)}>
                        <Ship className="mr-2 h-4 w-4" /> Exportar a Cliente
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
                                                    {pieces?.filter(p => p.requiereMecanizado || p.requiereEnsamblado).map(p => <SelectItem key={p.id} value={p.id}>{p.codigo}</SelectItem>)}
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

            <Dialog open={isExportDialogOpen} onOpenChange={setIsExportDialogOpen}>
                <DialogContent className="sm:max-w-3xl">
                    <DialogHeader>
                        <DialogTitle>Exportar a Cliente</DialogTitle>
                        <DialogDescription>Prepara un envío de piezas terminadas para un cliente.</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleCreateExport}>
                        <div className="grid gap-4 py-4">
                            <div className="space-y-2">
                                <Label htmlFor="exp-client">Cliente</Label>
                                <Select required value={exportForm.clientId} onValueChange={(v) => setExportForm(s => ({...s, clientId: v}))}>
                                    <SelectTrigger id="exp-client"><SelectValue placeholder="Selecciona un cliente..." /></SelectTrigger>
                                    <SelectContent>
                                        {clients?.map(c => <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            
                            <div className="space-y-2">
                                <Label>Ítems a Exportar</Label>
                                <div className="space-y-2 rounded-md border p-2 max-h-60 overflow-y-auto">
                                    {exportItems.map((item, index) => {
                                        const availablePieces = pieces?.filter(p => {
                                            const inv = inventory?.find(i => i.id === p.id);
                                            return (inv?.stockListo || 0) > 0 || (inv?.stockEnsamblado || 0) > 0;
                                        });

                                        const selectedInv = inventory?.find(i => i.id === item.pieceId);

                                        return (
                                        <div key={index} className="grid grid-cols-[1fr_120px_150px_auto] items-center gap-2">
                                            <Select value={item.pieceId} onValueChange={(v) => updateExportItem(index, 'pieceId', v)}>
                                                <SelectTrigger><SelectValue placeholder="Selecciona pieza..." /></SelectTrigger>
                                                <SelectContent>
                                                    {availablePieces?.map(p => <SelectItem key={p.id} value={p.id}>{p.codigo}</SelectItem>)}
                                                </SelectContent>
                                            </Select>
                                             <Input 
                                                type="number" 
                                                placeholder="Cantidad" 
                                                value={item.qty || ''} 
                                                onChange={(e) => updateExportItem(index, 'qty', Number(e.target.value))}
                                            />
                                            <Select value={item.origenStock} onValueChange={(v) => updateExportItem(index, 'origenStock', v)}>
                                                <SelectTrigger><SelectValue /></SelectTrigger>
                                                <SelectContent>
                                                    {selectedInv?.stockListo && <SelectItem value="stockListo">Listo ({selectedInv.stockListo})</SelectItem>}
                                                    {selectedInv?.stockEnsamblado && <SelectItem value="stockEnsamblado">Ensamblado ({selectedInv.stockEnsamblado})</SelectItem>}
                                                </SelectContent>
                                            </Select>
                                            <Button type="button" variant="ghost" size="icon" onClick={() => removeExportItem(index)}><Trash2 className="h-4 w-4 text-destructive"/></Button>
                                        </div>
                                    )})}
                                     <Button type="button" variant="outline" size="sm" onClick={addExportItem} className="w-full">
                                        <Plus className="mr-2 h-4 w-4" /> Añadir Ítem
                                    </Button>
                                </div>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsExportDialogOpen(false)}>Cancelar</Button>
                            <Button type="submit" disabled={isSaving}>
                                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
                                Confirmar Exportación
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

    