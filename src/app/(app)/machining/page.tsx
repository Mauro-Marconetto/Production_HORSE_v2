
'use client';

import { useMemo, useState, useEffect } from "react";
import { collection, writeBatch, query, where, getDocs, orderBy, doc, increment } from "firebase/firestore";
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MoreHorizontal, Loader2, PlusCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Remito, Piece, Supplier, MachiningProcess, Production } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";


const statusConfig: { [key: string]: { label: string, color: string } } = {
    enviado: { label: "Enviado", color: "bg-yellow-500" },
    en_proceso: { label: "En Proceso", color: "bg-blue-500" },
    retornado_parcial: { label: "Retornado Parcial", color: "bg-purple-500" },
    retornado_completo: { label: "Retornado Completo", color: "bg-green-500" },
};

type DeclarationField = 'qtyMecanizada' | 'qtyEnsamblada' | 'qtySegregada' | 'qtyScrap' | 'qtyScrapMecanizado' | 'qtyScrapEnsamblado';
type MachiningDeclarationStep = 'selection' | 'declaration' | 'summary';

const declarationFieldsConfig: { key: DeclarationField, label: string }[] = [
    { key: 'qtyMecanizada', label: 'Piezas Mecanizadas' },
    { key: 'qtyEnsamblada', label: 'Piezas Ensambladas' },
    { key: 'qtySegregada', label: 'Piezas Segregadas' },
    { key: 'qtyScrap', label: 'Scrap' },
    { key: 'qtyScrapMecanizado', label: 'Scrap (Mecanizado)' },
    { key: 'qtyScrapEnsamblado', label: 'Scrap (Ensamblado)' },
];


export default function SubprocessesPage() {
    const firestore = useFirestore();
    const router = useRouter();
    const { toast } = useToast();

    // Data Hooks
    const machiningQuery = useMemoFirebase(() => firestore ? query(collection(firestore, "machining"), orderBy("remitoId", "desc")) : null, [firestore]);
    const { data: machiningProcesses, isLoading: isLoadingMachining, forceRefresh: refreshMachining } = useCollection<MachiningProcess>(machiningQuery);

    const suppliersQuery = useMemoFirebase(() => firestore ? collection(firestore, "suppliers") : null, [firestore]);
    const { data: suppliers, isLoading: isLoadingSuppliers } = useCollection<Supplier>(suppliersQuery);
    
    const piecesQuery = useMemoFirebase(() => firestore ? collection(firestore, "pieces") : null, [firestore]);
    const { data: pieces, isLoading: isLoadingPieces } = useCollection<Piece>(piecesQuery);
    
    const remitosQuery = useMemoFirebase(() => firestore ? collection(firestore, "remitos") : null, [firestore]);
    const { data: remitos, isLoading: isLoadingRemitos } = useCollection<Remito>(remitosQuery);

    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [step, setStep] = useState<MachiningDeclarationStep>('selection');
    const [selectedPieceId, setSelectedPieceId] = useState('');
    const [quantities, setQuantities] = useState<Record<DeclarationField, number>>({
        qtyMecanizada: 0,
        qtyEnsamblada: 0,
        qtySegregada: 0,
        qtyScrap: 0,
        qtyScrapMecanizado: 0,
        qtyScrapEnsamblado: 0,
    });
    const [activeField, setActiveField] = useState<DeclarationField>('qtyMecanizada');
    const [currentInput, setCurrentInput] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    

    const isLoading = isLoadingMachining || isLoadingSuppliers || isLoadingPieces || isLoadingRemitos;
    const getPieceCode = (pieceId: string) => pieces?.find(p => p.id === pieceId)?.codigo || 'N/A';
    
    const activeLots = useMemo(() => {
        if (!machiningProcesses) return [];
        return machiningProcesses.filter(p => p.status === 'Enviado' || p.status === 'En Proceso');
    }, [machiningProcesses]);

    const completedLots = useMemo(() => {
        if (!machiningProcesses) return [];
        return machiningProcesses.filter(p => p.status === 'Finalizado');
    }, [machiningProcesses]);


    const piecesInMachining = useMemo(() => {
        if (!activeLots || !pieces) return [];
        const pieceIds = [...new Set(activeLots.map(p => p.pieceId))];
        return pieces.filter(p => pieceIds.includes(p.id));
    }, [activeLots, pieces]);


    useEffect(() => {
        if (isDialogOpen) {
            setStep('selection');
            setSelectedPieceId('');
            setQuantities({ qtyMecanizada: 0, qtyEnsamblada: 0, qtySegregada: 0, qtyScrap: 0, qtyScrapMecanizado: 0, qtyScrapEnsamblado: 0 });
            setActiveField('qtyMecanizada');
            setCurrentInput('');
        }
    }, [isDialogOpen]);

     useEffect(() => {
        setQuantities(q => ({ ...q, [activeField]: Number(currentInput) || 0 }));
    }, [currentInput, activeField]);

    // Keyboard support for numeric pad
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!isDialogOpen || step !== 'declaration') return;

            if (e.key >= '0' && e.key <= '9') {
                handleNumericButton(e.key);
            } else if (e.key === 'Backspace') {
                handleBackspace();
            } else if (e.key === 'Escape') {
                setIsDialogOpen(false);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [isDialogOpen, step]);

    const handleNumericButton = (value: string) => setCurrentInput(prev => prev + value);
    const handleBackspace = () => setCurrentInput(prev => prev.slice(0, -1));
    const handleClear = () => setCurrentInput('');
    const totalDeclared = Object.values(quantities).reduce((sum, qty) => sum + qty, 0);

    const handleSaveProduction = async () => {
        if (!firestore || !selectedPieceId || totalDeclared <= 0) {
            toast({ title: "Error", description: "Selecciona una pieza y declara al menos una cantidad.", variant: "destructive" });
            return;
        }
    
        setIsSaving(true);
        
        try {
            const batch = writeBatch(firestore);
    
            // 1. Find all pending machining lots for the selected piece
            const lotsForPiece = (machiningProcesses || []).filter(p => p.pieceId === selectedPieceId && (p.status === 'Enviado' || p.status === 'En Proceso'));
    
            // 2. Sort lots by remito date (oldest first) - FIFO
            const sortedLots = lotsForPiece
                .map(lot => ({ ...lot, remitoDate: remitos?.find(r => r.id === lot.remitoId)?.fecha || '9999' }))
                .sort((a, b) => a.remitoDate.localeCompare(b.remitoDate));
    
            // 3. Check if there's enough stock across all lots
            const totalStockEnMecanizado = sortedLots.reduce((sum, lot) => sum + (lot.qtyEnviada || 0), 0);
            if (totalDeclared > totalStockEnMecanizado) {
                throw new Error(`No hay suficiente stock en mecanizado para la pieza ${getPieceCode(selectedPieceId)}. Se intentan declarar ${totalDeclared} y solo hay ${totalStockEnMecanizado}.`);
            }
    
            // 4. Distribute declared quantities across lots
            let remainingQuantities = { ...quantities };
    
            for (const lot of sortedLots) {
                if (Object.values(remainingQuantities).every(q => q === 0)) break;
    
                const lotDocRef = doc(firestore, 'machining', lot.id);
                let lotDeductionTotal = 0;
                const updatePayload: Record<string, any> = {};
    
                // Iterate over each quantity type to deduct from the lot
                for (const key of Object.keys(remainingQuantities) as DeclarationField[]) {
                    if (remainingQuantities[key] > 0) {
                        const availableInLot = (lot.qtyEnviada || 0) - lotDeductionTotal;
                        const amountToProcessFromLot = Math.min(availableInLot, remainingQuantities[key]);
                        if (amountToProcessFromLot > 0) {
                            updatePayload[key] = increment(amountToProcessFromLot);
                            lotDeductionTotal += amountToProcessFromLot;
                            remainingQuantities[key] -= amountToProcessFromLot;
                        }
                    }
                }
    
                if (lotDeductionTotal > 0) {
                    const newQtyEnviada = (lot.qtyEnviada || 0) - lotDeductionTotal;
                    updatePayload['qtyEnviada'] = newQtyEnviada;
                    updatePayload['status'] = newQtyEnviada > 0 ? "En Proceso" : "Finalizado";
                    batch.update(lotDocRef, updatePayload);
                }
            }
    
            // 5. Update main inventory
            const inventoryDocRef = doc(firestore, 'inventory', selectedPieceId);
            batch.set(inventoryDocRef, {
                stockMecanizado: increment(quantities.qtyMecanizada),
                stockListo: increment(quantities.qtyEnsamblada),
                // Note: segregada/scrap are just for record-keeping in the machining process
                // and don't affect main inventory until a quality process decides so.
            }, { merge: true });
    
            await batch.commit();
            toast({ title: "Éxito", description: "Producción de mecanizado declarada y stock actualizado." });
            setIsDialogOpen(false);
            refreshMachining();
    
        } catch (error: any) {
            console.error("Error saving machining production:", error);
            toast({ title: "Error", description: error.message || "No se pudo guardar la declaración.", variant: "destructive" });
        } finally {
            setIsSaving(false);
        }
    };


  return (
    <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-headline font-bold">Producción en Mecanizado</h1>
          <p className="text-muted-foreground">Declara la producción y el scrap de los lotes enviados a proveedores.</p>
        </div>
         <Button onClick={() => setIsDialogOpen(true)}>
            <PlusCircle className="mr-2 h-4 w-4" /> Declarar Producción
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lotes en Proveedor</CardTitle>
          <CardDescription>
            Piezas actualmente en procesos externos. A medida que declares producción, se descontarán del remito más antiguo.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Remito ID</TableHead>
                <TableHead>Fecha de Envío</TableHead>
                <TableHead>Proveedor</TableHead>
                <TableHead>Pieza</TableHead>
                <TableHead className="text-right">Cantidad Pendiente</TableHead>
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
              {!isLoading && activeLots.map((process) => {
                const remito = remitos?.find(r => r.id === process.remitoId);
                const supplier = suppliers?.find(s => s.id === remito?.supplierId);
                return (
                  <TableRow key={process.id}>
                    <TableCell className="font-mono text-xs">{remito?.numero ? `0008-${String(remito.numero).padStart(8, '0')}` : remito?.id.slice(-6)}</TableCell>
                    <TableCell>{remito ? new Date(remito.fecha).toLocaleDateString() : 'N/A'}</TableCell>
                    <TableCell>{supplier?.nombre}</TableCell>
                    <TableCell>{getPieceCode(process.pieceId)}</TableCell>
                    <TableCell className="text-right font-bold">{process.qtyEnviada.toLocaleString()}</TableCell>
                  </TableRow>
                );
              })}
              {!isLoading && activeLots.length === 0 && (
                <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                        No hay lotes en proceso de mecanizado.
                    </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

       <Card>
        <CardHeader>
          <CardTitle>Historial de Declaraciones de Mecanizado</CardTitle>
          <CardDescription>
            Registros de producción y scrap declarados para procesos externos.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Pieza</TableHead>
                <TableHead className="text-right">Mecanizadas (OK)</TableHead>
                <TableHead className="text-right">Ensambladas (OK)</TableHead>
                <TableHead className="text-right text-destructive">Scrap Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
                {isLoading && (
                    <TableRow>
                        <TableCell colSpan={4} className="h-24 text-center">
                            <Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground" />
                        </TableCell>
                    </TableRow>
                )}
                {!isLoading && completedLots.map(prod => (
                    <TableRow key={prod.id}>
                        <TableCell>{getPieceCode(prod.pieceId)}</TableCell>
                        <TableCell className="text-right">{((prod.qtyMecanizada || 0)).toLocaleString()}</TableCell>
                        <TableCell className="text-right">{((prod.qtyEnsamblada || 0)).toLocaleString()}</TableCell>
                        <TableCell className="text-right text-destructive">{((prod.qtyScrapMecanizado || 0) + (prod.qtyScrapEnsamblado || 0) + (prod.qtyScrap || 0)).toLocaleString()}</TableCell>
                    </TableRow>
                ))}
                 {!isLoading && (!completedLots || completedLots.length === 0) && (
                    <TableRow>
                        <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                            No hay declaraciones de mecanizado finalizadas.
                        </TableCell>
                    </TableRow>
                )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0">
                <DialogHeader className="p-6 pb-2">
                    <DialogTitle className="text-3xl font-bold">Declarar Producción de Mecanizado</DialogTitle>
                </DialogHeader>

                {step === 'selection' && (
                    <div className="flex-grow p-6 flex flex-col justify-center items-center gap-8">
                        <div className="w-full max-w-sm flex flex-col gap-4">
                            <h3 className="text-xl font-semibold text-center">1. Selecciona la Pieza Producida</h3>
                            <Select onValueChange={setSelectedPieceId} value={selectedPieceId}>
                                <SelectTrigger className="h-16 text-lg"><SelectValue placeholder="Elige una pieza..." /></SelectTrigger>
                                <SelectContent>
                                    {piecesInMachining.map(p => <SelectItem key={p.id} value={p.id} className="text-lg h-12">{p.codigo}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                )}
                
                {step === 'declaration' && (
                    <div className="flex-grow p-6 grid grid-cols-2 gap-8">
                        <div className="flex flex-col gap-4">
                            {declarationFieldsConfig.map(({key, label}) => (
                                <Button
                                    key={key}
                                    variant={activeField === key ? "default" : "secondary"}
                                    className="h-20 text-xl justify-between"
                                    onClick={() => {
                                        setActiveField(key);
                                        setCurrentInput(String(quantities[key] || ''));
                                    }}
                                >
                                    <span>{label}</span>
                                    <span className="font-bold text-2xl">{quantities[key].toLocaleString()}</span>
                                </Button>
                            ))}
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                             {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(n => (
                                <Button key={n} variant="outline" className="h-full text-3xl font-bold" onClick={() => handleNumericButton(n)}>{n}</Button>
                            ))}
                            <Button variant="outline" className="h-full text-3xl font-bold" onClick={handleClear}>C</Button>
                            <Button variant="outline" className="h-full text-3xl font-bold" onClick={() => handleNumericButton('0')}>0</Button>
                            <Button variant="outline" className="h-full text-3xl font-bold" onClick={handleBackspace}>←</Button>
                        </div>
                    </div>
                )}
                
                {step === 'summary' && (
                     <div className="flex-grow p-6 flex flex-col items-center justify-center gap-6">
                        <Card className="w-full max-w-3xl">
                            <CardHeader>
                                <CardTitle className="text-2xl">Resumen de la Declaración</CardTitle>
                                <CardDescription>Confirma las cantidades para la pieza <span className="font-bold">{getPieceCode(selectedPieceId)}</span>.</CardDescription>
                            </CardHeader>
                            <CardContent className="text-lg space-y-2">
                               {declarationFieldsConfig.map(({key, label}) => (
                                    <div key={key} className="flex justify-between items-center">
                                        <span>{label}:</span>
                                        <span className="font-bold">{quantities[key].toLocaleString()}</span>
                                    </div>
                               ))}
                                <hr className="my-2"/>
                                <div className="flex justify-between items-center font-bold text-xl">
                                    <span>Total Declarado:</span>
                                    <span>{totalDeclared.toLocaleString()}</span>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}


                <DialogFooter className="p-6 pt-2 bg-muted border-t">
                    {step === 'selection' && (
                        <Button type="button" className="w-48 h-12 text-lg" onClick={() => setStep('declaration')} disabled={!selectedPieceId}>Siguiente</Button>
                    )}
                    {step === 'declaration' && (
                        <>
                            <Button type="button" variant="outline" className="w-48 h-12 text-lg" onClick={() => setStep('selection')}>Anterior</Button>
                            <Button type="button" className="w-48 h-12 text-lg" onClick={() => setStep('summary')}>Revisar</Button>
                        </>
                    )}
                    {step === 'summary' && (
                        <>
                            <Button type="button" variant="outline" className="w-48 h-12 text-lg" onClick={() => setStep('declaration')}>Anterior</Button>
                            <Button type="button" className="w-48 h-12 text-lg" onClick={handleSaveProduction} disabled={isSaving || totalDeclared <= 0}>
                                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                {isSaving ? "Guardando..." : "Confirmar y Guardar"}
                            </Button>
                        </>
                    )}
                </DialogFooter>
          </DialogContent>
      </Dialog>
    </main>
  );
}

