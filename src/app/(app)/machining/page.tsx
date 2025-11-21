

'use client';

import { useMemo, useState, useEffect } from "react";
import { collection, writeBatch, query, where, getDocs, orderBy, doc, increment, addDoc } from "firebase/firestore";
import { useFirestore, useCollection, useMemoFirebase, useUser } from "@/firebase";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, PlusCircle, Calendar as CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Remito, Piece, Supplier, MachiningProcess, QualityLot } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { addDays, format } from "date-fns";
import type { DateRange } from "react-day-picker";

type DeclarationField = 'qtyMecanizada' | 'qtyEnsamblada' | 'qtySegregada' | 'qtyScrapMecanizado' | 'qtyScrapEnsamblado';
type MachiningDeclarationStep = 'selection' | 'declaration' | 'summary';

const declarationFieldsConfig: { key: DeclarationField, label: string }[] = [
    { key: 'qtyMecanizada', label: 'Piezas Mecanizadas' },
    { key: 'qtyEnsamblada', label: 'Piezas Ensambladas' },
    { key: 'qtySegregada', label: 'Piezas Segregadas' },
    { key: 'qtyScrapMecanizado', label: 'MMU (Mecanizado)' },
    { key: 'qtyScrapEnsamblado', label: 'MMU (Ensamblado)' },
];

export default function SubprocessesPage() {
    const firestore = useFirestore();
    const router = useRouter();
    const { user } = useUser();
    const { toast } = useToast();

    // Data Hooks
    const machiningQuery = useMemoFirebase(() => firestore ? query(collection(firestore, "machining")) : null, [firestore]);
    const { data: machiningProcesses, isLoading: isLoadingMachining, forceRefresh: refreshMachining } = useCollection<MachiningProcess>(machiningQuery);

    const suppliersQuery = useMemoFirebase(() => firestore ? collection(firestore, "suppliers") : null, [firestore]);
    const { data: suppliers, isLoading: isLoadingSuppliers } = useCollection<Supplier>(suppliersQuery);
    
    const piecesQuery = useMemoFirebase(() => firestore ? collection(firestore, "pieces") : null, [firestore]);
    const { data: pieces, isLoading: isLoadingPieces } = useCollection<Piece>(piecesQuery);

    const [date, setDate] = useState<DateRange | undefined>();
    const [historyDate, setHistoryDate] = useState<DateRange | undefined>();
    
    const remitosQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        let q = query(collection(firestore, "remitos"), orderBy("fecha", "desc"));
        if (date?.from && date?.to) {
            const endDate = addDays(date.to, 1);
            q = query(q, where("fecha", ">=", date.from.toISOString()), where("fecha", "<=", endDate.toISOString()));
        }
        return q;
    }, [firestore, date]);
    const { data: remitos, isLoading: isLoadingRemitos } = useCollection<Remito>(remitosQuery);
    
    const qualityQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        let baseQuery = query(collection(firestore, 'quality'), orderBy('createdAt', 'desc'));
        if (historyDate?.from) {
             baseQuery = query(baseQuery, where('createdAt', '>=', historyDate.from.toISOString()));
        }
        if (historyDate?.to) {
             baseQuery = query(baseQuery, where('createdAt', '<=', addDays(historyDate.to, 1).toISOString()));
        }
        return baseQuery;
    }, [firestore, historyDate]);
    const { data: qualityLots, isLoading: isLoadingQuality } = useCollection<QualityLot>(qualityQuery);


    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [step, setStep] = useState<MachiningDeclarationStep>('selection');
    const [selectedPieceId, setSelectedPieceId] = useState('');
    const [quantities, setQuantities] = useState<Record<DeclarationField, number>>({
        qtyMecanizada: 0, qtyEnsamblada: 0, qtySegregada: 0, qtyScrapMecanizado: 0, qtyScrapEnsamblado: 0,
    });
    const [activeField, setActiveField] = useState<DeclarationField>('qtyMecanizada');
    const [currentInput, setCurrentInput] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    
    const displayedRemitos = useMemo(() => {
        if (!remitos) return [];
        if (date?.from && date?.to) return remitos;
        return remitos.slice(0, 5);
    }, [remitos, date]);

    const supplierStock = useMemo(() => {
        if (!pieces || !machiningProcesses) return [];
        const stockMap = new Map<string, { stockBruto: number; enProceso: number; mecanizadoOK: number; ensambladoOK: number; enCalidad: number }>();

        pieces.forEach(piece => {
            if (piece.requiereMecanizado || piece.requiereEnsamblado) {
                 stockMap.set(piece.id, { stockBruto: 0, enProceso: 0, mecanizadoOK: 0, ensambladoOK: 0, enCalidad: 0 });
            }
        });
        
        machiningProcesses.forEach(proc => {
            const current = stockMap.get(proc.pieceId);
            if (current) {
                current.stockBruto += proc.qtyEnviada;
                current.enProceso += proc.qtyEnProcesoEnsamblado || 0;
                current.mecanizadoOK += proc.qtyMecanizada || 0;
                current.ensambladoOK += proc.qtyEnsamblada || 0;
            }
        });
        
        if (qualityLots) {
             qualityLots.forEach(lot => {
                const current = stockMap.get(lot.pieceId);
                if (current && lot.status === 'pending' && lot.machineId === 'mecanizado-externo') {
                    current.enCalidad += lot.qtySegregada;
                }
             });
        }
        
        return Array.from(stockMap.entries()).map(([pieceId, data]) => ({
            pieceId, ...data
        }));

    }, [pieces, machiningProcesses, qualityLots]);
    
    const machiningHistory = useMemo(() => {
        if (!machiningProcesses) return [];
        
        let filteredProcesses = machiningProcesses.filter(p => 
            p.qtyMecanizada || p.qtyEnsamblada || p.qtySegregada || p.qtyScrapMecanizado || p.qtyScrapEnsamblado
        );

        return filteredProcesses;

    }, [machiningProcesses, qualityLots, historyDate]);


    const isLoading = isLoadingMachining || isLoadingSuppliers || isLoadingPieces || isLoadingRemitos || isLoadingQuality;
    const getPieceCode = (pieceId: string) => pieces?.find(p => p.id === pieceId)?.codigo || 'N/A';
    
    const piecesInMachining = useMemo(() => {
        if (!machiningProcesses || !pieces) return [];
        const pieceIds = [...new Set(machiningProcesses.filter(p => p.qtyEnviada > 0 || p.qtyEnProcesoEnsamblado > 0).map(p => p.pieceId))];
        return pieces.filter(p => pieceIds.includes(p.id) && (p.requiereMecanizado || p.requiereEnsamblado));
    }, [machiningProcesses, pieces]);


    useEffect(() => {
        if (isDialogOpen) {
            setStep('selection');
            setSelectedPieceId('');
            setQuantities({ qtyMecanizada: 0, qtyEnsamblada: 0, qtySegregada: 0, qtyScrapMecanizado: 0, qtyScrapEnsamblado: 0 });
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
            if (e.key >= '0' && e.key <= '9') { handleNumericButton(e.key); } 
            else if (e.key === 'Backspace') { handleBackspace(); } 
            else if (e.key === 'Escape') { setIsDialogOpen(false); }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isDialogOpen, step, currentInput]);

    const handleNumericButton = (value: string) => setCurrentInput(prev => prev + value);
    const handleBackspace = () => setCurrentInput(prev => prev.slice(0, -1));
    const handleClear = () => setCurrentInput('');
    const totalDeclared = Object.values(quantities).reduce((sum, qty) => sum + qty, 0);

    const handleSaveProduction = async () => {
        if (!firestore || !selectedPieceId || totalDeclared <= 0 || !user || !pieces) {
            toast({ title: "Error", description: "Selecciona una pieza y declara al menos una cantidad.", variant: "destructive" });
            return;
        }
    
        setIsSaving(true);
        const piece = pieces.find(p => p.id === selectedPieceId);
        if (!piece) {
            toast({ title: "Error", description: "Pieza seleccionada no válida.", variant: "destructive" });
            setIsSaving(false);
            return;
        }
        
        try {
            const batch = writeBatch(firestore);
            
            const lotsForPiece = (machiningProcesses || [])
                .filter(p => p.pieceId === selectedPieceId && (p.qtyEnviada > 0 || (p.qtyEnProcesoEnsamblado || 0) > 0))
                .map(lot => ({ ...lot, remitoDate: remitos?.find(r => r.id === lot.remitoId)?.fecha || '9999' }))
                .sort((a, b) => a.remitoDate.localeCompare(b.remitoDate));

            let { qtyMecanizada, qtyEnsamblada, qtySegregada, qtyScrapMecanizado, qtyScrapEnsamblado } = quantities;

            // --- Logic for pieces requiring assembly ---
            if (piece.requiereEnsamblado) {
                // Fulfilling qtyMecanizada: Moves from Bruto to EnProceso
                let remainingToMachine = qtyMecanizada;
                for (const lot of lotsForPiece) {
                    if (remainingToMachine <= 0) break;
                    const availableInLot = lot.qtyEnviada;
                    const amountToProcess = Math.min(remainingToMachine, availableInLot);
                    if (amountToProcess > 0) {
                        const lotDocRef = doc(firestore, 'machining', lot.id);
                        batch.update(lotDocRef, {
                            qtyEnviada: increment(-amountToProcess),
                            qtyEnProcesoEnsamblado: increment(amountToProcess)
                        });
                        remainingToMachine -= amountToProcess;
                        lot.qtyEnviada -= amountToProcess; // Update local state for next loop
                    }
                }
                
                // Fulfilling qtyEnsamblada: Consumes first from EnProceso, then from Bruto
                let remainingToAssemble = qtyEnsamblada;
                // 1. Consume from EnProceso
                for (const lot of lotsForPiece) {
                    if (remainingToAssemble <= 0) break;
                    const availableInLot = lot.qtyEnProcesoEnsamblado || 0;
                    const amountToProcess = Math.min(remainingToAssemble, availableInLot);
                    if (amountToProcess > 0) {
                        const lotDocRef = doc(firestore, 'machining', lot.id);
                        batch.update(lotDocRef, {
                            qtyEnProcesoEnsamblado: increment(-amountToProcess),
                            qtyEnsamblada: increment(amountToProcess)
                        });
                        remainingToAssemble -= amountToProcess;
                        lot.qtyEnProcesoEnsamblado = (lot.qtyEnProcesoEnsamblado || 0) - amountToProcess;
                    }
                }
                // 2. Consume from Bruto if still needed
                for (const lot of lotsForPiece) {
                     if (remainingToAssemble <= 0) break;
                     const availableInLot = lot.qtyEnviada;
                     const amountToProcess = Math.min(remainingToAssemble, availableInLot);
                     if (amountToProcess > 0) {
                         const lotDocRef = doc(firestore, 'machining', lot.id);
                         batch.update(lotDocRef, {
                             qtyEnviada: increment(-amountToProcess),
                             qtyEnsamblada: increment(amountToProcess)
                         });
                         remainingToAssemble -= amountToProcess;
                         lot.qtyEnviada -= amountToProcess;
                     }
                }

            } else { // --- Logic for pieces NOT requiring assembly ---
                // Fulfilling qtyMecanizada: Moves from Bruto to MecanizadoOK
                 let remainingToMachine = qtyMecanizada;
                 for (const lot of lotsForPiece) {
                    if (remainingToMachine <= 0) break;
                    const availableInLot = lot.qtyEnviada;
                    const amountToProcess = Math.min(remainingToMachine, availableInLot);
                    if (amountToProcess > 0) {
                        const lotDocRef = doc(firestore, 'machining', lot.id);
                        batch.update(lotDocRef, {
                            qtyEnviada: increment(-amountToProcess),
                            qtyMecanizada: increment(amountToProcess)
                        });
                        remainingToMachine -= amountToProcess;
                        lot.qtyEnviada -= amountToProcess;
                    }
                 }
            }

            // --- Common logic for Segregation and Scrap ---
            let remainingToSegregate = qtySegregada + qtyScrapMecanizado + qtyScrapEnsamblado;
             for (const lot of lotsForPiece) {
                if (remainingToSegregate <= 0) break;
                 const availableInLot = lot.qtyEnviada;
                 const amountToProcess = Math.min(remainingToSegregate, availableInLot);
                 if (amountToProcess > 0) {
                     const lotDocRef = doc(firestore, 'machining', lot.id);
                     batch.update(lotDocRef, { qtyEnviada: increment(-amountToProcess) });
                     remainingToSegregate -= amountToProcess;
                 }
             }

             if (qtySegregada > 0) {
                const qualityLotData: Omit<QualityLot, 'id'> = {
                    createdAt: new Date().toISOString(), createdBy: user.uid, pieceId: selectedPieceId,
                    machineId: 'mecanizado-externo', turno: '', nroRack: 'N/A', defecto: 'Segregado en Proveedor',
                    tipoControl: 'Dimensional/Visual', qtySegregada: qtySegregada, status: 'pending',
                };
                const qualityLotRef = doc(collection(firestore, 'quality'));
                batch.set(qualityLotRef, qualityLotData);
            }

            // Create a single machining process record for the declared scrap quantities
            if (qtyScrapMecanizado > 0 || qtyScrapEnsamblado > 0) {
                const scrapDeclarationId = `scrap-${Date.now()}-${selectedPieceId}`;
                 const scrapDocRef = doc(firestore, 'machining', scrapDeclarationId);
                 batch.set(scrapDocRef, {
                    id: scrapDeclarationId,
                    remitoId: 'N/A', // No specific remito for this scrap record
                    pieceId: selectedPieceId,
                    qtyEnviada: 0,
                    status: 'Finalizado',
                    qtyScrapMecanizado: qtyScrapMecanizado,
                    qtyScrapEnsamblado: qtyScrapEnsamblado
                 }, { merge: true });
            }
    
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
          <h1 className="text-3xl font-headline font-bold">Gestión de Mecanizado</h1>
          <p className="text-muted-foreground">Declara la producción y el scrap de los lotes enviados a proveedores.</p>
        </div>
         <Button onClick={() => setIsDialogOpen(true)}>
            <PlusCircle className="mr-2 h-4 w-4" /> Declarar Producción
        </Button>
      </div>
      
       <Card>
        <CardHeader>
          <CardTitle>Estado de Lotes en Proveedor</CardTitle>
          <CardDescription>
            Visión en tiempo real de las cantidades de piezas en cada etapa del proceso externo.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Pieza</TableHead>
                <TableHead className="text-right">Stock en Bruto</TableHead>
                <TableHead className="text-right">En Proceso</TableHead>
                <TableHead className="text-right">Mecanizado OK</TableHead>
                <TableHead className="text-right">Ensamblado OK</TableHead>
                <TableHead className="text-right">En Calidad</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
               {isLoading && (<TableRow><TableCell colSpan={6} className="h-24 text-center"><Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground" /></TableCell></TableRow>)}
               {!isLoading && supplierStock.map((item) => (
                  <TableRow key={item.pieceId}>
                    <TableCell className="font-medium">{getPieceCode(item.pieceId)}</TableCell>
                    <TableCell className="text-right font-semibold">{item.stockBruto.toLocaleString()}</TableCell>
                    <TableCell className="text-right font-semibold">{item.enProceso.toLocaleString()}</TableCell>
                    <TableCell className="text-right font-bold text-green-600">{item.mecanizadoOK.toLocaleString()}</TableCell>
                    <TableCell className="text-right font-bold text-green-600">{item.ensambladoOK.toLocaleString()}</TableCell>
                    <TableCell className="text-right font-semibold text-destructive">{item.enCalidad.toLocaleString()}</TableCell>
                  </TableRow>
                ))}
                {!isLoading && supplierStock.length === 0 && (<TableRow><TableCell colSpan={6} className="h-24 text-center text-muted-foreground">No hay piezas en proceso de mecanizado.</TableCell></TableRow>)}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
             <div className="flex items-start justify-between">
                <div>
                    <CardTitle>Historial de Declaraciones de Mecanizado</CardTitle>
                    <CardDescription>
                        Producción y scrap declarado en proveedores externos.
                    </CardDescription>
                </div>
                 <Popover>
                    <PopoverTrigger asChild>
                        <Button id="history-date" variant={"outline"} className={cn("w-[260px] justify-start text-left font-normal",!historyDate && "text-muted-foreground")}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {historyDate?.from ? (historyDate.to ? (<> {format(historyDate.from, "LLL dd, y")} - {format(historyDate.to, "LLL dd, y")} </>) : (format(historyDate.from, "LLL dd, y"))) : (<span>Filtrar por fecha</span>)}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="end">
                        <Calendar initialFocus mode="range" defaultMonth={historyDate?.from} selected={historyDate} onSelect={setHistoryDate} numberOfMonths={2}/>
                    </PopoverContent>
                </Popover>
            </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Pieza</TableHead>
                    <TableHead className="text-right">Mecanizado OK</TableHead>
                    <TableHead className="text-right">Ensamblado OK</TableHead>
                    <TableHead className="text-right">Segregado</TableHead>
                    <TableHead className="text-right text-destructive">MMU (Mecanizado)</TableHead>
                    <TableHead className="text-right text-destructive">MMU (Ensamblado)</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {isLoading && <TableRow><TableCell colSpan={6} className="h-24 text-center"><Loader2 className="mx-auto h-8 w-8 animate-spin" /></TableCell></TableRow>}
                {!isLoading && machiningHistory.map((item) => {
                    return (
                        <TableRow key={item.id}>
                            <TableCell className="font-medium">{getPieceCode(item.pieceId)}</TableCell>
                            <TableCell className="text-right">{(item.qtyMecanizada || 0).toLocaleString()}</TableCell>
                            <TableCell className="text-right">{(item.qtyEnsamblada || 0).toLocaleString()}</TableCell>
                            <TableCell className="text-right">{(item.qtySegregada || 0).toLocaleString()}</TableCell>
                            <TableCell className="text-right text-destructive">{(item.qtyScrapMecanizado || 0).toLocaleString()}</TableCell>
                            <TableCell className="text-right text-destructive">{(item.qtyScrapEnsamblado || 0).toLocaleString()}</TableCell>
                        </TableRow>
                    );
                })}
                {!isLoading && machiningHistory.length === 0 && <TableRow><TableCell colSpan={6} className="h-24 text-center text-muted-foreground">No hay declaraciones de mecanizado.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

       <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle>Historial de Envíos a Proveedor</CardTitle>
              <CardDescription>
                Muestra los últimos 5 remitos de envío. Usa el filtro para buscar en un rango de fechas.
              </CardDescription>
            </div>
            <Popover>
              <PopoverTrigger asChild>
                <Button id="date" variant={"outline"} className={cn("w-[260px] justify-start text-left font-normal",!date && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date?.from ? (date.to ? (<> {format(date.from, "LLL dd, y")} - {format(date.to, "LLL dd, y")} </>) : (format(date.from, "LLL dd, y"))) : (<span>Filtrar por fecha</span>)}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar initialFocus mode="range" defaultMonth={date?.from} selected={date} onSelect={setDate} numberOfMonths={2}/>
              </PopoverContent>
            </Popover>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Remito</TableHead>
                <TableHead>Fecha de Envío</TableHead>
                <TableHead>Proveedor</TableHead>
                <TableHead>Pieza</TableHead>
                <TableHead className="text-right">Cantidad Enviada</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (<TableRow><TableCell colSpan={5} className="h-24 text-center"><Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground" /></TableCell></TableRow>)}
              {!isLoading && displayedRemitos.map((remito) => {
                const supplier = suppliers?.find(s => s.id === remito.supplierId);
                return remito.items.map((item, index) => (
                    <TableRow key={`${remito.id}-${index}`}>
                        <TableCell className="font-mono text-xs">{remito.numero ? `0008-${String(remito.numero).padStart(8, '0')}` : 'N/A'}</TableCell>
                        <TableCell>{new Date(remito.fecha).toLocaleDateString()}</TableCell>
                        <TableCell>{supplier?.nombre}</TableCell>
                        <TableCell>{getPieceCode(item.pieceId)}</TableCell>
                        <TableCell className="text-right font-bold">{item.qty.toLocaleString()}</TableCell>
                    </TableRow>
                ))
              })}
              {!isLoading && displayedRemitos.length === 0 && (<TableRow><TableCell colSpan={5} className="h-24 text-center text-muted-foreground">No se encontraron remitos en el rango seleccionado.</TableCell></TableRow>)}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-2xl flex flex-col p-0">
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
                                <Button key={key} variant={activeField === key ? (key.includes('Scrap') ? 'destructive' : 'default') : "secondary"} className="h-14 text-sm justify-between"
                                    onClick={() => { setActiveField(key); setCurrentInput(String(quantities[key] || '')); }}>
                                    <span>{label}</span>
                                    <span className="font-bold text-lg">{quantities[key].toLocaleString()}</span>
                                </Button>
                            ))}
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                             {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(n => ( <Button key={n} variant="outline" className="h-full text-xl font-bold" onClick={() => handleNumericButton(n)}>{n}</Button>))}
                            <Button variant="outline" className="h-full text-xl font-bold" onClick={handleClear}>C</Button>
                            <Button variant="outline" className="h-full text-xl font-bold" onClick={() => handleNumericButton('0')}>0</Button>
                            <Button variant="outline" className="h-full text-xl font-bold" onClick={handleBackspace}>←</Button>
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
                               {declarationFieldsConfig.map(({key, label}) => (<div key={key} className="flex justify-between items-center"><span>{label}:</span><span className="font-bold">{quantities[key].toLocaleString()}</span></div>))}
                                <hr className="my-2"/>
                                <div className="flex justify-between items-center font-bold text-xl"><span>Total Declarado:</span><span>{totalDeclared.toLocaleString()}</span></div>
                            </CardContent>
                        </Card>
                    </div>
                )}
                <DialogFooter className="p-6 pt-2 bg-muted border-t">
                    {step === 'selection' && (<Button type="button" className="w-48 h-12 text-lg" onClick={() => setStep('declaration')} disabled={!selectedPieceId}>Siguiente</Button>)}
                    {step === 'declaration' && (<><Button type="button" variant="outline" className="w-48 h-12 text-lg" onClick={() => setStep('selection')}>Anterior</Button><Button type="button" className="w-48 h-12 text-lg" onClick={() => setStep('summary')}>Revisar</Button></>)}
                    {step === 'summary' && (<><Button type="button" variant="outline" className="w-48 h-12 text-lg" onClick={() => setStep('declaration')}>Anterior</Button>
                        <Button type="button" className="w-48 h-12 text-lg" onClick={handleSaveProduction} disabled={isSaving || totalDeclared <= 0}>
                            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            {isSaving ? "Guardando..." : "Confirmar y Guardar"}
                        </Button></>)}
                </DialogFooter>
          </DialogContent>
      </Dialog>
    </main>
  );
}




