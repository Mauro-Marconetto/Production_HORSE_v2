
'use client';

import { useState, useMemo, useEffect } from "react";
import { collection, doc, addDoc, serverTimestamp, Timestamp, query, orderBy } from 'firebase/firestore';
import { useFirestore, useCollection, useMemoFirebase, errorEmitter, FirestorePermissionError } from '@/firebase';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle, PlusCircle, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Production, Machine, Mold, Piece } from "@/lib/types";

type ProductionStep = 'selection' | 'declaration' | 'summary';
type DeclarationField = 'qtyFinalizada' | 'qtySinPrensar' | 'qtyScrap' | 'qtySegregada';

const declarationFields: { key: DeclarationField, label: string }[] = [
    { key: 'qtyFinalizada', label: 'Finalizada' },
    { key: 'qtySinPrensar', label: 'Sin Prensar' },
    { key: 'qtyScrap', label: 'Scrap' },
    { key: 'qtySegregada', label: 'Segregada (Calidad)' },
];

export default function ProductionPage() {
    const firestore = useFirestore();
    const { toast } = useToast();

    const prodQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'production'), orderBy('fechaISO', 'desc')) : null, [firestore]);
    const { data: production, isLoading: isLoadingProd } = useCollection<Production>(prodQuery);

    const machinesCollection = useMemoFirebase(() => firestore ? collection(firestore, 'machines') : null, [firestore]);
    const { data: machines, isLoading: isLoadingMachines } = useCollection<Machine>(machinesCollection);

    const moldsCollection = useMemoFirebase(() => firestore ? collection(firestore, 'molds') : null, [firestore]);
    const { data: molds, isLoading: isLoadingMolds } = useCollection<Mold>(moldsCollection);
    
    const piecesCollection = useMemoFirebase(() => firestore ? collection(firestore, 'pieces') : null, [firestore]);
    const { data: pieces, isLoading: isLoadingPieces } = useCollection<Piece>(piecesCollection);

    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [step, setStep] = useState<ProductionStep>('selection');
    const [isSaving, setIsSaving] = useState(false);

    // Step 1 State
    const [turno, setTurno] = useState<'mañana' | 'tarde' | 'noche' | ''>('');
    const [machineId, setMachineId] = useState('');
    const [moldId, setMoldId] = useState('');

    // Step 2 State
    const [activeField, setActiveField] = useState<DeclarationField>('qtyFinalizada');
    const [quantities, setQuantities] = useState({
        qtyFinalizada: 0,
        qtySinPrensar: 0,
        qtyScrap: 0,
        qtySegregada: 0,
    });
    const [currentInput, setCurrentInput] = useState('');
    
    useEffect(() => {
        if(isDialogOpen) {
            // Reset state when dialog opens
            setStep('selection');
            setTurno('');
            setMachineId('');
            setMoldId('');
            setQuantities({ qtyFinalizada: 0, qtySinPrensar: 0, qtyScrap: 0, qtySegregada: 0 });
            setCurrentInput('');
            setActiveField('qtyFinalizada');
        }
    }, [isDialogOpen])

    useEffect(() => {
        // Update quantity for active field when currentInput changes
        setQuantities(q => ({ ...q, [activeField]: Number(currentInput) || 0 }));
    }, [currentInput, activeField]);

    const handleNumericButton = (value: string) => setCurrentInput(prev => prev + value);
    const handleBackspace = () => setCurrentInput(prev => prev.slice(0, -1));
    const handleClear = () => setCurrentInput('');

    const handleSaveProduction = async () => {
        if (!firestore) return;
        
        const pieceId = molds?.find(m => m.id === moldId)?.pieces[0];
        if (!pieceId) {
            toast({ title: "Error", description: "El molde seleccionado no tiene una pieza asociada.", variant: "destructive" });
            return;
        }

        setIsSaving(true);
        const productionData: Omit<Production, 'id'> = {
            turno,
            machineId,
            moldId,
            pieceId,
            ...quantities,
            inspeccionadoCalidad: false,
            fechaISO: new Date().toISOString(),
        };

        addDoc(collection(firestore, "production"), productionData)
            .then(() => {
                toast({ title: "Éxito", description: "Producción declarada correctamente." });
                setIsDialogOpen(false);
            })
            .catch((error) => {
                const contextualError = new FirestorePermissionError({
                    path: 'production',
                    operation: 'create',
                    requestResourceData: productionData,
                });
                errorEmitter.emit('permission-error', contextualError);
            })
            .finally(() => {
                setIsSaving(false);
            });
    };
    
    const isStep1Valid = turno && machineId && moldId;
    const totalDeclared = Object.values(quantities).reduce((sum, qty) => sum + qty, 0);

    const getPieceCode = (pieceId: string) => pieces?.find(p => p.id === pieceId)?.codigo || 'N/A';
    const getMachineName = (id: string) => machines?.find(m => m.id === id)?.nombre || 'N/A';
    const getMoldName = (id: string) => molds?.find(m => m.id === id)?.nombre || 'N/A';

  return (
    <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-headline font-bold">Producción</h1>
          <p className="text-muted-foreground">Monitoriza y declara el progreso de la producción real.</p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)} className="h-10 px-6 text-base">
            <PlusCircle className="mr-2 h-5 w-5" /> Declarar Producción
        </Button>
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
                <TableHead className="text-right">Unidades Producidas</TableHead>
                <TableHead className="text-right">Scrap (%)</TableHead>
                <TableHead className="text-center">Calidad</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(isLoadingProd || isLoadingMachines || isLoadingMolds || isLoadingPieces) && (
                <TableRow>
                    <TableCell colSpan={8} className="h-24 text-center">
                        <Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground" />
                    </TableCell>
                </TableRow>
              )}
              {production?.map((p) => {
                const totalUnits = p.qtyFinalizada + p.qtySinPrensar + p.qtyScrap + p.qtySegregada;
                const scrapPct = totalUnits > 0 ? p.qtyScrap / totalUnits : 0;
                const isScrapHigh = scrapPct > 0.05;

                return (
                  <TableRow key={p.id}>
                    <TableCell>{new Date(p.fechaISO).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' })}</TableCell>
                    <TableCell className="font-medium">{getMachineName(p.machineId)}</TableCell>
                    <TableCell>{getPieceCode(p.pieceId)}</TableCell>
                    <TableCell>{getMoldName(p.moldId)}</TableCell>
                    <TableCell className="capitalize">{p.turno}</TableCell>
                    <TableCell className="text-right">{(p.qtyFinalizada + p.qtySinPrensar).toLocaleString()}</TableCell>
                    <TableCell className={`text-right ${isScrapHigh ? 'text-destructive' : ''}`}>
                      {(scrapPct * 100).toFixed(1)}%
                    </TableCell>
                    <TableCell className="text-center">
                      {p.qtySegregada > 0 ? (
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
                    <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                        No hay registros de producción.
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
                    <DialogTitle className="text-3xl font-bold">Declarar Producción</DialogTitle>
                </DialogHeader>

                {step === 'selection' && (
                    <div className="flex-grow p-6 grid grid-cols-1 md:grid-cols-3 gap-8">
                        <div className="flex flex-col gap-4">
                            <h3 className="text-xl font-semibold text-center">1. Selecciona Turno</h3>
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
                            <h3 className="text-xl font-semibold text-center">2. Selecciona Máquina</h3>
                             <Select onValueChange={setMachineId} value={machineId}>
                                <SelectTrigger className="h-16 text-lg"><SelectValue placeholder="Elige una máquina..." /></SelectTrigger>
                                <SelectContent>
                                    {machines?.map(m => <SelectItem key={m.id} value={m.id} className="text-lg h-12">{m.nombre}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                         <div className="flex flex-col gap-4">
                            <h3 className="text-xl font-semibold text-center">3. Selecciona Molde</h3>
                             <Select onValueChange={setMoldId} value={moldId}>
                                <SelectTrigger className="h-16 text-lg"><SelectValue placeholder="Elige un molde..." /></SelectTrigger>
                                <SelectContent>
                                    {molds?.map(m => <SelectItem key={m.id} value={m.id} className="text-lg h-12">{m.nombre} ({getPieceCode(m.pieces[0])})</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                )}
                
                {step === 'declaration' && (
                    <div className="flex-grow p-6 grid grid-cols-2 gap-8">
                        <div className="flex flex-col gap-4">
                            {declarationFields.map(({key, label}) => (
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
                        <Card className="w-full max-w-2xl">
                            <CardHeader>
                                <CardTitle className="text-2xl">Resumen de la Declaración</CardTitle>
                                <CardDescription>Confirma los datos antes de guardar.</CardDescription>
                            </CardHeader>
                            <CardContent className="text-lg space-y-4">
                               <p><strong>Turno:</strong> <span className="capitalize">{turno}</span></p>
                               <p><strong>Máquina:</strong> {getMachineName(machineId)}</p>
                               <p><strong>Molde:</strong> {getMoldName(moldId)} ({getPieceCode(molds?.find(m=>m.id === moldId)?.pieces[0] || '')})</p>
                               <hr/>
                               <div className="grid grid-cols-2 gap-x-8 gap-y-2">
                                {declarationFields.map(({key, label}) => (
                                    <div key={key} className="flex justify-between">
                                        <span>{label}:</span>
                                        <span className="font-bold">{quantities[key].toLocaleString()}</span>
                                    </div>
                                ))}
                                <hr className="col-span-2"/>
                                 <div className="flex justify-between col-span-2 font-bold text-xl">
                                    <span>Total Declarado:</span>
                                    <span>{totalDeclared.toLocaleString()}</span>
                                </div>
                               </div>
                            </CardContent>
                        </Card>
                    </div>
                )}


                <DialogFooter className="p-6 pt-2 bg-muted border-t">
                    {step === 'selection' && (
                        <Button type="button" className="w-48 h-12 text-lg" onClick={() => setStep('declaration')} disabled={!isStep1Valid}>Siguiente</Button>
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
                            <Button type="button" className="w-48 h-12 text-lg" onClick={handleSaveProduction} disabled={isSaving}>
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
