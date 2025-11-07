'use client';

import React, { useState, useMemo, useEffect } from "react";
import { collection, doc, addDoc, updateDoc, serverTimestamp, Timestamp, query, orderBy, where, getDoc, writeBatch, Firestore, increment } from 'firebase/firestore';
import { useFirestore, useCollection, useMemoFirebase, errorEmitter, FirestorePermissionError, useUser } from '@/firebase';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle, PlusCircle, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Production, Machine, Mold, Piece } from "@/lib/types";
import { isToday, isWithinInterval } from "date-fns";

type ProductionStep = 'selection' | 'declaration' | 'summary';
type DeclarationField = 'qtyFinalizada' | 'qtySinPrensar' | 'qtyScrap' | 'qtyArranque';
type PressingStep = 'list' | 'declaration';
type PressingDeclarationField = 'pressedQty' | 'scrapQty';


const allDeclarationFields: { key: DeclarationField, label: string }[] = [
    { key: 'qtyFinalizada', label: 'Finalizada' },
    { key: 'qtySinPrensar', label: 'Sin Prensar' },
    { key: 'qtyScrap', label: 'Scrap' },
    { key: 'qtyArranque', label: 'Pieza de arranque' },
];

async function findExistingProduction(
    firestore: Firestore,
    allProduction: Production[] | null,
    machineId: string,
    turno: string
): Promise<Production | null> {
    if (!allProduction) return null;

    const todayProduction = allProduction.filter(p => isToday(new Date(p.fechaISO)));

    const existing = todayProduction.find(
        p => p.machineId === machineId && p.turno === turno
    );
    
    return existing || null;
}


export default function ProductionPage() {
    const firestore = useFirestore();
    const { user } = useUser();
    const { toast } = useToast();

    const prodQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'production'), orderBy('fechaISO', 'desc')) : null, [firestore]);
    const { data: production, isLoading: isLoadingProd, forceRefresh } = useCollection<Production>(prodQuery);

    const machinesCollection = useMemoFirebase(() => firestore ? collection(firestore, 'machines') : null, [firestore]);
    const { data: machines, isLoading: isLoadingMachines } = useCollection<Machine>(machinesCollection);

    const moldsCollection = useMemoFirebase(() => firestore ? collection(firestore, 'molds') : null, [firestore]);
    const { data: molds, isLoading: isLoadingMolds } = useCollection<Mold>(moldsCollection);
    
    const piecesCollection = useMemoFirebase(() => firestore ? collection(firestore, 'pieces') : null, [firestore]);
    const { data: pieces, isLoading: isLoadingPieces } = useCollection<Piece>(piecesCollection);

    const inventoryCollection = useMemoFirebase(() => firestore ? collection(firestore, 'inventory') : null, [firestore]);
    const { data: inventory, isLoading: isLoadingInventory } = useCollection<any>(inventoryCollection);


    const [isProdDialogOpen, setIsProdDialogOpen] = useState(false);
    const [isPressingDialogOpen, setIsPressingDialogOpen] = useState(false);

    const [step, setStep] = useState<ProductionStep>('selection');
    const [isSaving, setIsSaving] = useState(false);

    // Production Declaration State
    const [turno, setTurno] = useState<'mañana' | 'tarde' | 'noche' | ''>('');
    const [machineId, setMachineId] = useState('');
    const [selectedMachine, setSelectedMachine] = useState<Machine | null>(null);
    const [moldId, setMoldId] = useState('');
    const [pieceId, setPieceId] = useState(''); // For granalladoras
    const [existingProduction, setExistingProduction] = useState<Production | null>(null);
    const [prodQuantities, setProdQuantities] = useState({ qtyFinalizada: 0, qtySinPrensar: 0, qtyScrap: 0, qtyArranque: 0 });
    const [prodCurrentInput, setProdCurrentInput] = useState('');
    const [prodActiveField, setProdActiveField] = useState<DeclarationField>('qtyFinalizada');

    // Pressing Declaration State
    const [pressingStep, setPressingStep] = useState<PressingStep>('list');
    const [selectedLotForPressing, setSelectedLotForPressing] = useState<any | null>(null);
    const [pressingQuantities, setPressingQuantities] = useState({ pressedQty: 0, scrapQty: 0 });
    const [pressingCurrentInput, setPressingCurrentInput] = useState('');
    const [pressingActiveField, setPressingActiveField] = useState<PressingDeclarationField>('pressedQty');


    const lotsToPress = useMemo(() => {
        if (!inventory) return [];
        return inventory.filter(item => (item.stockInyectado || 0) > 0);
    }, [inventory]);

    const declarationFields = useMemo(() => {
        if (selectedMachine?.type === 'granalladora') {
            return allDeclarationFields.filter(field => field.key !== 'qtySinPrensar' && field.key !== 'qtyArranque');
        }
        return allDeclarationFields;
    }, [selectedMachine]);


    const resetProdDialogState = () => {
        setStep('selection');
        setTurno('');
        setMachineId('');
        setSelectedMachine(null);
        setMoldId('');
        setPieceId('');
        setExistingProduction(null);
        setProdQuantities({ qtyFinalizada: 0, qtySinPrensar: 0, qtyScrap: 0, qtyArranque: 0 });
        setProdCurrentInput('');
        setProdActiveField('qtyFinalizada');
    }
    
    const resetPressingDialogState = () => {
        setPressingStep('list');
        setSelectedLotForPressing(null);
        setPressingQuantities({ pressedQty: 0, scrapQty: 0 });
        setPressingCurrentInput('');
        setPressingActiveField('pressedQty');
    }

    useEffect(() => {
        if(isProdDialogOpen) {
            resetProdDialogState();
        }
    }, [isProdDialogOpen]);
    
    useEffect(() => {
        if(isPressingDialogOpen) {
            resetPressingDialogState();
        }
    }, [isPressingDialogOpen]);
    
     useEffect(() => {
        const machine = machines?.find(m => m.id === machineId) || null;
        setSelectedMachine(machine);
    }, [machineId, machines]);
    
    useEffect(() => {
        async function checkForExisting() {
            if (turno && machineId && firestore && production) {
                const existing = await findExistingProduction(firestore, production, machineId, turno);
                setExistingProduction(existing);
                if (existing) {
                    setMoldId(existing.moldId || '');
                    setPieceId(existing.pieceId || '');
                    // For existing production, we only allow adding quantities, so inputs start at 0
                    setProdQuantities({ qtyFinalizada: 0, qtySinPrensar: 0, qtyScrap: 0, qtyArranque: 0 });
                } else {
                     setProdQuantities({ qtyFinalizada: 0, qtySinPrensar: 0, qtyScrap: 0, qtyArranque: 0 });
                    if (selectedMachine?.assignments) {
                        const today = new Date();
                        const currentAssignment = selectedMachine.assignments.find(a => 
                            isWithinInterval(today, { start: new Date(a.startDate), end: new Date(a.endDate) })
                        );
                        
                        if (selectedMachine.type === 'inyectora') {
                            setMoldId(currentAssignment?.moldId || '');
                            setPieceId('');
                        } else if (selectedMachine.type === 'granalladora') {
                            setPieceId(currentAssignment?.pieceId || '');
                            setMoldId('');
                        }
                    } else {
                       setMoldId('');
                       setPieceId('');
                    }
                }
            } else {
                setExistingProduction(null);
                setMoldId('');
                setPieceId('');
            }
        }
        checkForExisting();
    }, [turno, machineId, firestore, production, selectedMachine]);

    useEffect(() => {
        // Update quantity for active field when currentInput changes
        setProdQuantities(q => ({ ...q, [prodActiveField]: Number(prodCurrentInput) || 0 }));
    }, [prodCurrentInput, prodActiveField]);

    useEffect(() => {
        const parsedInput = Number(pressingCurrentInput) || 0;
        setPressingQuantities(q => ({ ...q, [pressingActiveField]: parsedInput }));
    }, [pressingCurrentInput, pressingActiveField]);


    const handleProdNumericButton = (value: string) => setProdCurrentInput(prev => prev + value);
    const handleProdBackspace = () => setProdCurrentInput(prev => prev.slice(0, -1));
    const handleProdClear = () => setProdCurrentInput('');

    // Keyboard support for production numeric pad
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!isProdDialogOpen || step !== 'declaration') return;

            if (e.key >= '0' && e.key <= '9') {
                handleProdNumericButton(e.key);
            } else if (e.key === 'Backspace') {
                handleProdBackspace();
            } else if (e.key === 'Escape') {
                setIsProdDialogOpen(false);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [isProdDialogOpen, step, prodCurrentInput]);

    // Keyboard support for pressing numeric pad
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!isPressingDialogOpen || pressingStep !== 'declaration') return;

            if (e.key >= '0' && e.key <= '9') {
                setPressingCurrentInput(prev => prev + e.key);
            } else if (e.key === 'Backspace') {
                setPressingCurrentInput(prev => prev.slice(0, -1));
            } else if (e.key === 'Escape') {
                setIsPressingDialogOpen(false);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [isPressingDialogOpen, pressingStep, pressingCurrentInput]);
    
    const handleGoToDeclaration = () => {
        setProdCurrentInput(''); // Reset keyboard input when moving to declaration step
        const defaultField = selectedMachine?.type === 'granalladora' ? 'qtyFinalizada' : 'qtyFinalizada';
        setProdActiveField(defaultField); 
        setStep('declaration');
    }

    const handleSaveProduction = async () => {
        if (!firestore || !user) {
            toast({ title: "Error", description: "No has iniciado sesión.", variant: "destructive" });
            return;
        }

        let finalPieceId = pieceId;
        if (selectedMachine?.type === 'inyectora') {
            finalPieceId = molds?.find(m => m.id === moldId)?.pieces[0] || '';
        }

        if (!finalPieceId) {
            toast({ title: "Error", description: "La pieza no está asociada al molde/referencia seleccionado.", variant: "destructive" });
            return;
        }

        setIsSaving(true);
        
        try {
            const batch = writeBatch(firestore);

            // 1. Create or update the Production document
            const productionData: Partial<Production> = {
                ...prodQuantities,
                turno: turno as Production['turno'],
                machineId,
                pieceId: finalPieceId,
                moldId: selectedMachine?.type === 'inyectora' ? moldId : '',
                createdBy: user.uid,
                fechaISO: new Date().toISOString(),
                inspeccionadoCalidad: false,
                qtySegregada: 0,
             };
             if (selectedMachine?.type === 'granalladora') {
                productionData.subproceso = 'granallado';
             }

            if (existingProduction) {
                const prodDocRef = doc(firestore, 'production', existingProduction.id);
                batch.update(prodDocRef, {
                    qtyFinalizada: increment(prodQuantities.qtyFinalizada),
                    qtySinPrensar: increment(prodQuantities.qtySinPrensar),
                    qtyScrap: increment(prodQuantities.qtyScrap),
                    qtyArranque: increment(prodQuantities.qtyArranque || 0),
                });
            } else {
                const prodDocRef = doc(collection(firestore, "production"));
                batch.set(prodDocRef, productionData);
            }

            // 2. Update the Inventory document
            const inventoryDocRef = doc(firestore, 'inventory', finalPieceId);
            let inventoryUpdateData: { [key: string]: any } = {};

            if (selectedMachine?.type === 'granalladora') {
                inventoryUpdateData = {
                    stockGranallado: increment(prodQuantities.qtyFinalizada),
                    stockInyectado: increment(-prodQuantities.qtyFinalizada),
                    // Scrap from granallado doesn't affect inventory directly, it's just a loss
                };
            } else { // Inyectora
                inventoryUpdateData = {
                    stockListo: increment(prodQuantities.qtyFinalizada),
                    stockInyectado: increment(prodQuantities.qtySinPrensar),
                };
            }
            
            batch.set(inventoryDocRef, inventoryUpdateData, { merge: true });

            await batch.commit();

            toast({ title: "Éxito", description: `Producción ${existingProduction ? 'actualizada' : 'declarada'} y stock actualizado.` });
            forceRefresh();
            setIsProdDialogOpen(false);

        } catch (error) {
             const contextualError = new FirestorePermissionError({
                path: 'production or inventory',
                operation: 'write',
                requestResourceData: prodQuantities,
            });
            errorEmitter.emit('permission-error', contextualError);
        } finally {
            setIsSaving(false);
        }
    };

    const handleSavePressing = async () => {
        if (!firestore || !selectedLotForPressing) return;

        const { pressedQty, scrapQty } = pressingQuantities;
        const totalProcessed = pressedQty + scrapQty;
        const totalAvailableToPress = selectedLotForPressing.stockInyectado || 0;
        
        if (totalProcessed > totalAvailableToPress) {
            toast({ title: "Error", description: "La cantidad procesada no puede superar la cantidad sin prensar disponible.", variant: "destructive" });
            return;
        }

        setIsSaving(true);
        const inventoryDocRef = doc(firestore, 'inventory', selectedLotForPressing.id);

        try {
            const batch = writeBatch(firestore);
            
            // Update inventory
            batch.update(inventoryDocRef, {
                stockInyectado: increment(-totalProcessed),
                stockListo: increment(pressedQty),
            });

            // Create a production record for the scrap from pressing
            if (scrapQty > 0) {
                const scrapProdRef = doc(collection(firestore, 'production'));
                const scrapData = {
                    fechaISO: new Date().toISOString(),
                    machineId: 'prensado-manual',
                    pieceId: selectedLotForPressing.id,
                    turno: '',
                    qtyScrap: scrapQty,
                    // set other fields to 0 or defaults
                    qtyFinalizada: 0,
                    qtySinPrensar: 0,
                    qtyArranque: 0,
                    qtySegregada: 0,
                    inspeccionadoCalidad: true,
                    createdBy: user?.uid,
                };
                batch.set(scrapProdRef, scrapData);
            }

            await batch.commit();
            toast({ title: "Éxito", description: "Declaración de prensado guardada correctamente." });
            setIsPressingDialogOpen(false);
            forceRefresh();
        } catch (error) {
             const contextualError = new FirestorePermissionError({ path: inventoryDocRef.path, operation: 'update', requestResourceData: pressingQuantities });
             errorEmitter.emit('permission-error', contextualError);
        } finally {
            setIsSaving(false);
        }
    };
    
    const isStep1Valid = turno && machineId && (selectedMachine?.type === 'inyectora' ? moldId : pieceId);
    const totalDeclaredInSession = prodQuantities.qtyFinalizada + prodQuantities.qtySinPrensar + prodQuantities.qtyScrap + (prodQuantities.qtyArranque || 0);
    
    const previousSegregatedQty = existingProduction?.qtySegregada || 0;

    const getPieceCode = (pieceId: string) => pieces?.find(p => p.id === pieceId)?.codigo || 'N/A';
    const getMachineName = (id: string) => machines?.find(m => m.id === id)?.nombre || 'N/A';
    const getMoldName = (id: string) => molds?.find(m => m.id === id)?.nombre || 'N/A';
    const isAssignmentActive = (machine: Machine | null) => machine?.assignments?.some(a => isWithinInterval(new Date(), { start: new Date(a.startDate), end: new Date(a.endDate) }));

  return (
    <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-headline font-bold">Producción</h1>
          <p className="text-muted-foreground">Monitoriza y declara el progreso de la producción real.</p>
        </div>
        <div className="flex items-center gap-2">
            <Button onClick={() => setIsPressingDialogOpen(true)} variant="outline" className="h-10 px-6 text-base">
                Declarar Prensado
            </Button>
            <Button onClick={() => setIsProdDialogOpen(true)} className="h-10 px-6 text-base">
                <PlusCircle className="mr-2 h-5 w-5" /> Declarar Producción
            </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Registros de Producción Recientes</CardTitle>
          <CardDescription>Datos de producción reportados desde la planta.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Máquina</TableHead>
                <TableHead>Pieza</TableHead>
                <TableHead>Molde</TableHead>
                <TableHead>Turno</TableHead>
                <TableHead className="text-right">Unidades OK</TableHead>
                <TableHead className="text-right">Unidades Sin Prensar</TableHead>
                <TableHead className="text-right text-destructive">Rechazo Interno</TableHead>
                <TableHead className="text-right">Unidades Producidas</TableHead>
                <TableHead className="text-right">Rechazo Interno (%)</TableHead>
                <TableHead className="text-center">Calidad </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(isLoadingProd || isLoadingMachines || isLoadingMolds || isLoadingPieces) && (
                <TableRow>
                    <TableCell colSpan={11} className="h-24 text-center">
                        <Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground" />
                    </TableCell>
                </TableRow>
              )}
              {production?.map((p) => {
                const unidadesOK = (p.qtyFinalizada || 0) + (p.qtyAptaCalidad || 0);
                const unidadesSinPrensar = (p.qtySinPrensar || 0) + (p.qtyAptaSinPrensarCalidad || 0);
                const scrapTotal = (p.qtyScrap || 0) + (p.qtyScrapCalidad || 0) + (p.qtyArranque || 0);
                const totalUnitsForScrapCalc = unidadesOK + unidadesSinPrensar + scrapTotal + (p.qtySegregada || 0);
                const totalUnits = totalUnitsForScrapCalc;
                const scrapPct = totalUnitsForScrapCalc > 0 ? scrapTotal / totalUnitsForScrapCalc : 0;
                const isScrapHigh = scrapPct > 0.05;

                return (
                  <TableRow key={p.id}>
                    <TableCell>{new Date(p.fechaISO).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' })}</TableCell>
                    <TableCell className="font-medium">{getMachineName(p.machineId)}</TableCell>
                    <TableCell>{getPieceCode(p.pieceId)}</TableCell>
                    <TableCell>{getMoldName(p.moldId)}</TableCell>
                    <TableCell className="capitalize">{p.turno}</TableCell>
                    <TableCell className="text-right font-semibold">{unidadesOK.toLocaleString()}</TableCell>
                    <TableCell className="text-right">{unidadesSinPrensar.toLocaleString()}</TableCell>
                    <TableCell className="text-right text-destructive">{scrapTotal.toLocaleString()}</TableCell>
                    <TableCell className="text-right font-bold">{totalUnits.toLocaleString()}</TableCell>
                    <TableCell className={`text-right ${isScrapHigh ? 'text-destructive' : ''}`}>
                      {(scrapPct * 100).toFixed(1)}%
                    </TableCell>
                    <TableCell className="text-center">
                      {(p.qtySegregada || 0) > 0 ? (
                        p.inspeccionadoCalidad ? (
                          <Badge variant="secondary">Inspeccionado</Badge>
                        ) : (
                          <Badge variant="destructive">Pendiente</Badge>
                        )
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
              {!isLoadingProd && (!production || production.length === 0) && (
                 <TableRow>
                    <TableCell colSpan={11} className="h-24 text-center text-muted-foreground">
                        No hay registros de producción.
                    </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isProdDialogOpen} onOpenChange={setIsProdDialogOpen}>
          <DialogContent className="max-w-3xl h-[80vh] flex flex-col p-0">
                <DialogHeader className="p-6 pb-2">
                    <DialogTitle className="text-3xl font-bold">Declarar Producción</DialogTitle>
                </DialogHeader>

                {step === 'selection' && (
                    <div className="flex-grow p-6 flex flex-col gap-8">
                         <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            <div className="flex flex-col gap-4">
                                <h3 className="text-xl font-semibold text-center">1. Turno</h3>
                                <Select onValueChange={(v) => setTurno(v as any)} value={turno}>
                                    <SelectTrigger className="h-16 text-lg"><SelectValue placeholder="Elige un turno..." /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="mañana" className="text-lg h-12">Mañana</SelectItem>
                                        <SelectItem value="tarde" className="text-lg h-12">Tarde</SelectItem>
                                        <SelectItem value="noche" className="text-lg h-12">Noche</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="flex flex-col gap-4">
                                <h3 className="text-xl font-semibold text-center">2. Máquina</h3>
                                <Select onValueChange={setMachineId} value={machineId}>
                                    <SelectTrigger className="h-16 text-lg"><SelectValue placeholder="Elige una máquina..." /></SelectTrigger>
                                    <SelectContent>
                                        {machines?.map(m => <SelectItem key={m.id} value={m.id} className="text-lg h-12">{m.nombre}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>

                            {selectedMachine?.type === 'inyectora' && (
                                <div className="flex flex-col gap-4">
                                    <h3 className="text-xl font-semibold text-center">3. Molde</h3>
                                    <Select onValueChange={setMoldId} value={moldId} disabled={!!existingProduction || isAssignmentActive(selectedMachine)}>
                                        <SelectTrigger className="h-16 text-lg"><SelectValue placeholder="Elige un molde..." /></SelectTrigger>
                                        <SelectContent>
                                            {molds?.map(m => <SelectItem key={m.id} value={m.id} className="text-lg h-12">{m.nombre} ({getPieceCode(m.pieces[0])})</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}

                             {selectedMachine?.type === 'granalladora' && (
                                <div className="flex flex-col gap-4">
                                    <h3 className="text-xl font-semibold text-center">3. Selecciona Referencia</h3>
                                    <Select onValueChange={setPieceId} value={pieceId} disabled={!!existingProduction || isAssignmentActive(selectedMachine)}>
                                        <SelectTrigger className="h-16 text-lg"><SelectValue placeholder="Elige una referencia..." /></SelectTrigger>
                                        <SelectContent>
                                            {pieces?.filter(p => p.requiereGranallado).map(p => <SelectItem key={p.id} value={p.id} className="text-lg h-12">{p.codigo}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}

                        </div>
                        {existingProduction && (
                            <div className="text-center bg-yellow-100 dark:bg-yellow-900/50 p-3 rounded-md text-yellow-800 dark:text-yellow-200">
                                <p>Ya existe una declaración para este turno. Se añadirán las nuevas cantidades a las existentes.</p>
                            </div>
                        )}
                    </div>
                )}
                
                {step === 'declaration' && (
                    <div className="flex-grow p-6 grid grid-cols-2 gap-8">
                        <div className="flex flex-col gap-4">
                            {declarationFields.map(({key, label}) => (
                                <Button
                                    key={key}
                                    variant={prodActiveField === key ? "default" : "secondary"}
                                    className="h-16 text-base justify-between"
                                    onClick={() => {
                                        setProdActiveField(key);
                                        setProdCurrentInput(String(prodQuantities[key] || ''));
                                    }}
                                >
                                    <span>{label}</span>
                                    <span className="font-bold text-lg">{prodQuantities[key].toLocaleString()}</span>
                                </Button>
                            ))}
                             <div className="h-16 text-base justify-between flex items-center px-4 py-2 ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground rounded-md opacity-50 cursor-not-allowed">
                                <span>Piezas Segregadas</span>
                                <span className="font-bold text-lg">{previousSegregatedQty.toLocaleString()}</span>
                             </div>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                             {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(n => (
                                <Button key={n} variant="outline" className="h-full text-xl font-bold" onClick={() => handleProdNumericButton(n)}>{n}</Button>
                            ))}
                            <Button variant="outline" className="h-full text-xl font-bold" onClick={handleProdClear}>C</Button>
                            <Button variant="outline" className="h-full text-xl font-bold" onClick={() => handleProdNumericButton('0')}>0</Button>
                            <Button variant="outline" className="h-full text-xl font-bold" onClick={handleProdBackspace}>←</Button>
                        </div>
                    </div>
                )}

                {step === 'summary' && (
                    <div className="flex-grow p-6 flex flex-col items-center justify-center gap-6">
                        <Card className="w-full max-w-3xl">
                            <CardHeader>
                                <CardTitle className="text-2xl">Resumen de la Declaración</CardTitle>
                                <CardDescription>Confirma los datos antes de guardar.</CardDescription>
                            </CardHeader>
                            <CardContent className="text-lg space-y-4">
                               <p><strong>Turno:</strong> <span className="capitalize">{turno}</span></p>
                               <p><strong>Máquina:</strong> {getMachineName(machineId)}</p>
                               {selectedMachine?.type === 'inyectora' ? (
                                    <p><strong>Molde:</strong> {getMoldName(moldId)} ({getPieceCode(molds?.find(m=>m.id === moldId)?.pieces[0] || '')})</p>
                               ) : (
                                    <p><strong>Referencia:</strong> {getPieceCode(pieceId)}</p>
                               )}
                               <hr/>
                               <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-base">
                                  <h4 className="font-semibold col-span-1">Categoría</h4>
                                  <h4 className="font-semibold col-span-1 text-right">Cantidad a Añadir</h4>
                                {declarationFields.map(({key, label}) => {
                                    const newQty = prodQuantities[key];
                                    return (
                                        <React.Fragment key={key}>
                                            <div className="col-span-1">{label}</div>
                                            <div className="col-span-1 text-right font-bold">{newQty.toLocaleString()}</div>
                                        </React.Fragment>
                                    );
                                })}
                                <hr className="col-span-2 my-2"/>
                                 <div className="col-span-1 font-bold text-lg">Total Declarado</div>
                                 <div className="col-span-1 text-right font-bold text-lg">{totalDeclaredInSession.toLocaleString()}</div>
                               </div>
                            </CardContent>
                        </Card>
                    </div>
                )}


                <DialogFooter className="p-6 pt-2 bg-muted border-t">
                    {step === 'selection' && (
                        <Button type="button" className="w-48 h-12 text-lg" onClick={handleGoToDeclaration} disabled={!isStep1Valid}>Siguiente</Button>
                    )}
                     {step === 'declaration' && (
                        <>
                            <Button type="button" variant="destructive" className="w-48 h-12 text-lg" onClick={() => setStep('selection')}>Cancelar</Button>
                            <Button type="button" className="w-48 h-12 text-lg bg-green-600 hover:bg-green-700" onClick={() => setStep('summary')}>Declarar</Button>
                        </>
                    )}
                     {step === 'summary' && (
                        <>
                            <Button type="button" variant="outline" className="w-48 h-12 text-lg" onClick={() => setStep('declaration')}>Anterior</Button>
                            <Button type="button" className="w-48 h-12 text-lg" onClick={handleSaveProduction} disabled={isSaving}>
                                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                {isSaving ? "Guardando..." : "Confirmar y Guardar"}
                            </Button>
                        </>
                    )}
                </DialogFooter>
          </DialogContent>
      </Dialog>

      <Dialog open={isPressingDialogOpen} onOpenChange={setIsPressingDialogOpen}>
          <DialogContent className="max-w-3xl h-[80vh] flex flex-col p-0">
                <DialogHeader className="p-6 pb-2">
                    <DialogTitle className="text-3xl font-bold">Declarar Prensado</DialogTitle>
                     <DialogDescription className="text-base">Procesa las piezas que están pendientes de prensado y muévelas a inventario finalizado.</DialogDescription>
                </DialogHeader>

                {pressingStep === 'list' && (
                    <div className="flex-grow p-6">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Pieza</TableHead>
                                    <TableHead className="text-right">Cantidad sin Prensar</TableHead>
                                    <TableHead className="text-center">Acción</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoadingInventory && <TableRow><TableCell colSpan={3} className="text-center h-24"><Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground"/></TableCell></TableRow>}
                                {!isLoadingInventory && lotsToPress.length === 0 && <TableRow><TableCell colSpan={3} className="text-center h-24">No hay lotes pendientes de prensado.</TableCell></TableRow>}
                                {!isLoadingInventory && lotsToPress.map(lot => (
                                    <TableRow key={lot.id}>
                                        <TableCell>{getPieceCode(lot.id)}</TableCell>
                                        <TableCell className="text-right font-bold">
                                            {(lot.stockInyectado || 0).toLocaleString()}
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <Button size="sm" onClick={() => {
                                                setSelectedLotForPressing(lot);
                                                setPressingStep('declaration');
                                            }}>
                                                Procesar
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                )}
                
                {pressingStep === 'declaration' && selectedLotForPressing && (
                    <div className="flex-grow p-6 grid grid-cols-2 gap-8">
                         <div className="flex flex-col gap-4">
                            <Card>
                                <CardHeader><CardTitle>Lote a Procesar</CardTitle></CardHeader>
                                <CardContent className="space-y-1">
                                    <p><strong>Pieza:</strong> {getPieceCode(selectedLotForPressing.id)}</p>
                                    <p><strong>Cantidad Disponible:</strong> <span className="font-bold text-lg">{(selectedLotForPressing.stockInyectado || 0).toLocaleString()}</span></p>
                                </CardContent>
                            </Card>
                            <Button
                                variant={pressingActiveField === 'pressedQty' ? "default" : "secondary"}
                                className="h-16 text-base justify-between"
                                onClick={() => {
                                    setPressingActiveField('pressedQty');
                                    setPressingCurrentInput(String(pressingQuantities.pressedQty || ''));
                                }}
                            >
                                <span>Piezas Prensadas (OK)</span>
                                <span className="font-bold text-lg">{pressingQuantities.pressedQty.toLocaleString()}</span>
                            </Button>
                             <Button
                                variant={pressingActiveField === 'scrapQty' ? "destructive" : "secondary"}
                                className={`h-16 text-base justify-between ${pressingActiveField === 'scrapQty' ? 'bg-destructive text-destructive-foreground' : ''}`}
                                onClick={() => {
                                    setPressingActiveField('scrapQty');
                                    setPressingCurrentInput(String(pressingQuantities.scrapQty || ''));
                                }}
                            >
                                <span>Scrap de Prensado</span>
                                <span className="font-bold text-lg">{pressingQuantities.scrapQty.toLocaleString()}</span>
                            </Button>
                         </div>
                         <div className="grid grid-cols-3 gap-2">
                            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(n => (
                                <Button key={n} variant="outline" className="h-full text-xl font-bold" onClick={(e) => setPressingCurrentInput(p => p + n)}>{n}</Button>
                            ))}
                            <Button variant="outline" className="h-full text-xl font-bold" onClick={() => setPressingCurrentInput('')}>C</Button>
                            <Button variant="outline" className="h-full text-xl font-bold" onClick={(e) => setPressingCurrentInput(p => p + '0')}>0</Button>
                            <Button variant="outline" className="h-full text-xl font-bold" onClick={() => setPressingCurrentInput(p => p.slice(0, -1))}>←</Button>
                        </div>
                    </div>
                )}


                <DialogFooter className="p-6 pt-2 bg-muted border-t">
                   {pressingStep === 'list' && (
                        <Button type="button" variant="outline" className="w-48 h-12 text-lg" onClick={() => setIsPressingDialogOpen(false)}>Cerrar</Button>
                   )}
                   {pressingStep === 'declaration' && (
                        <>
                            <Button type="button" variant="outline" className="w-48 h-12 text-lg" onClick={() => setPressingStep('list')}>Volver a la Lista</Button>
                             <Button type="button" className="w-48 h-12 text-lg" onClick={handleSavePressing} disabled={isSaving}>
                                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                {isSaving ? "Guardando..." : "Confirmar"}
                            </Button>
                        </>
                   )}
                </DialogFooter>
          </DialogContent>
      </Dialog>

    </main>
  );
}