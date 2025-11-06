

'use client';

import { useState, useMemo, useEffect } from "react";
import { collection, doc, updateDoc, query, orderBy, addDoc, writeBatch, setDoc, increment } from 'firebase/firestore';
import { useFirestore, useCollection, useMemoFirebase, errorEmitter, FirestorePermissionError, useUser } from '@/firebase';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Check, Edit, Loader2, Calendar as CalendarIcon, PlusCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Production, Machine, Mold, Piece, Inventory } from "@/lib/types";
import { addDays, format, isWithinInterval } from "date-fns";
import type { DateRange } from "react-day-picker";
import { cn } from "@/lib/utils";

type QualityInspectionField = 'qtyAptaCalidad' | 'qtyAptaSinPrensarCalidad' | 'qtyScrapCalidad';

const allInspectionFields: { key: QualityInspectionField, label: string }[] = [
    { key: 'qtyAptaCalidad', label: 'Apta (OK)' },
    { key: 'qtyAptaSinPrensarCalidad', label: 'Apta - Sin Prensar (OK)'},
    { key: 'qtyScrapCalidad', label: 'Scrap' },
];

const defectOptions = [
    "Zona fria",
    "Mal llenado",
    "Colada chica",
    "Fuga material",
    "Fisura",
    "Rotura",
    "Pieza pegada",
    "Corte colada",
    "Noyo cortado",
    "Falla squezze pin",
    "Pieza caida ABB",
    "Arrastre",
    "Pieza descartada",
    "Ampolla",
    "Manchada",
    "Deformación",
    "Pliegue",
    "Otros",
];
const controlTypeOptions = ["RX", "Dimensional", "Visual", "Composición Química"];


export default function QualityPage() {
    const firestore = useFirestore();
    const { user } = useUser();
    const { toast } = useToast();

    const productionQuery = useMemoFirebase(() => 
        firestore 
            ? query(collection(firestore, 'production'), orderBy('fechaISO', 'desc'))
            : null, 
    [firestore]);
    
    const { data: allProduction, isLoading: isLoadingProd, forceRefresh } = useCollection<Production>(productionQuery);

    const { data: machines, isLoading: isLoadingMachines } = useCollection<Machine>(useMemoFirebase(() => firestore ? collection(firestore, 'machines') : null, [firestore]));
    const { data: molds, isLoading: isLoadingMolds } = useCollection<Mold>(useMemoFirebase(() => firestore ? collection(firestore, 'molds') : null, [firestore]));
    const { data: pieces, isLoading: isLoadingPieces } = useCollection<Piece>(useMemoFirebase(() => firestore ? collection(firestore, 'pieces') : null, [firestore]));

    const [isInspectionDialogOpen, setIsInspectionDialogOpen] = useState(false);
    const [isSegregateDialogOpen, setIsSegregateDialogOpen] = useState(false);
    const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
    
    const [selectedProduction, setSelectedProduction] = useState<Production | null>(null);
    const [lotToEdit, setLotToEdit] = useState<Production | null>(null);

    const [isSaving, setIsSaving] = useState(false);
    
    const [date, setDate] = useState<DateRange | undefined>({
        from: addDays(new Date(), -7),
        to: new Date(),
    });

    // Client-side filtering for pending inspections
    const pendingInspection = useMemo(() => {
        if (!allProduction) return [];
        return allProduction.filter(p => (p.qtySegregada || 0) > 0 && !p.inspeccionadoCalidad);
    }, [allProduction]);

    // Client-side filtering for history
    const inspectedHistory = useMemo(() => {
        if (!allProduction) return [];
        return allProduction.filter(p => {
            const isInspected = p.inspectionDate;
            if (!isInspected || !date?.from) return false;
            
            const inspectionDate = new Date(p.inspectionDate);
            const fromDate = date.from;
            const toDate = date.to ? addDays(date.to, 1) : addDays(fromDate, 1);

            return inspectionDate >= fromDate && inspectionDate < toDate;
        });
    }, [allProduction, date]);

    // Inspection Dialog State
    const [activeField, setActiveField] = useState<QualityInspectionField>('qtyAptaCalidad');
    const [quantities, setQuantities] = useState({ 
        qtyAptaCalidad: 0, 
        qtyAptaSinPrensarCalidad: 0,
        qtyScrapCalidad: 0,
    });
    const [currentInput, setCurrentInput] = useState('');
    
    // Segregation Dialog State
    const [segregateForm, setSegregateForm] = useState({
        turno: '',
        machineId: '',
        moldId: '',
        nroRack: '',
        defecto: '',
        defectoOtro: '',
        tipoControl: '',
        qtySegregada: '',
    });

    const getMachineForProduction = (prod: Production | null) => {
        if (!prod || !machines) return null;
        return machines.find(m => m.id === prod.machineId) || null;
    }

    const inspectionFields = useMemo(() => {
        const machine = getMachineForProduction(selectedProduction);
        if (machine?.type === 'granalladora' || selectedProduction?.origenSegregado !== 'stockInyectado') {
            return allInspectionFields.filter(field => field.key !== 'qtyAptaSinPrensarCalidad');
        }
        return allInspectionFields;
    }, [selectedProduction, machines]);

    useEffect(() => {
        if (selectedProduction) {
            let initialQuantities = { qtyAptaCalidad: 0, qtyAptaSinPrensarCalidad: 0, qtyScrapCalidad: 0 };
            initialQuantities.qtyAptaCalidad = selectedProduction.qtySegregada;

            setQuantities(initialQuantities);
            setCurrentInput(String(selectedProduction.qtySegregada));
            setActiveField('qtyAptaCalidad');
            setIsInspectionDialogOpen(true);
        }
    }, [selectedProduction]);

    useEffect(() => {
        if(lotToEdit) {
            setIsDetailDialogOpen(true);
        }
    }, [lotToEdit])
    
    useEffect(() => {
        if (!isInspectionDialogOpen) {
            setSelectedProduction(null);
        }
    }, [isInspectionDialogOpen]);
    
    useEffect(() => {
        if (activeField && isInspectionDialogOpen) {
            setCurrentInput(String(quantities[activeField] || ''));
        }
    }, [activeField, isInspectionDialogOpen]);

    useEffect(() => {
        const parsedInput = Number(currentInput) || 0;
        setQuantities(q => ({ ...q, [activeField]: parsedInput }));
    }, [currentInput, activeField]);

    useEffect(() => {
        const machine = machines?.find(m => m.id === segregateForm.machineId);
        if (machine?.assignments) {
            const today = new Date();
            const currentAssignment = machine.assignments.find(a => 
                isWithinInterval(today, { start: new Date(a.startDate), end: new Date(a.endDate) })
            );
            if (currentAssignment?.moldId) {
                setSegregateForm(s => ({ ...s, moldId: currentAssignment.moldId! }));
            }
        }
    }, [segregateForm.machineId, machines]);


    const handleCloseInspectionDialog = () => {
        setIsInspectionDialogOpen(false);
    }
    
    const handleNumericButton = (value: string) => setCurrentInput(prev => prev + value);
    const handleBackspace = () => setCurrentInput(prev => prev.slice(0, -1));
    const handleClear = () => setCurrentInput('');

    const totalInspectedInSession = quantities.qtyAptaCalidad + quantities.qtyAptaSinPrensarCalidad + quantities.qtyScrapCalidad;
    const isInspectionAmountValid = totalInspectedInSession === (selectedProduction?.qtySegregada || 0);

    const handleSaveInspection = async () => {
        if (!firestore || !selectedProduction || !user) {
            toast({ title: "Error", description: "No se puede guardar. Falta información de usuario o de base de datos.", variant: "destructive" });
            return;
        }
        if (totalInspectedInSession <= 0) {
            toast({ title: "Información", description: "Debes clasificar al menos una pieza.", variant: "default" });
            return;
        }
        if (!isInspectionAmountValid) {
            toast({ title: "Error de validación", description: `La cantidad inspeccionada (${totalInspectedInSession}) debe ser igual a la cantidad segregada (${selectedProduction.qtySegregada}).`, variant: "destructive" });
            return;
        }

        setIsSaving(true);
        const batch = writeBatch(firestore);
        
        // 1. Update Production Document
        const prodDocRef = doc(firestore, 'production', selectedProduction.id);
        const updatedProdData = {
            qtyAptaCalidad: increment(quantities.qtyAptaCalidad),
            qtyAptaSinPrensarCalidad: increment(quantities.qtyAptaSinPrensarCalidad),
            qtyScrapCalidad: increment(quantities.qtyScrapCalidad),
            qtySegregada: 0, // All have been inspected
            inspectedBy: user.uid,
            inspectionDate: new Date().toISOString(),
            inspeccionadoCalidad: true,
        };
        batch.update(prodDocRef, updatedProdData);

        // 2. Update Inventory Document
        const inventoryDocRef = doc(firestore, 'inventory', selectedProduction.pieceId);
        const inventoryUpdateData = {
            stockListo: increment(quantities.qtyAptaCalidad),
            stockInyectado: increment(quantities.qtyAptaSinPrensarCalidad)
        };
        // Use set with merge to create the document if it doesn't exist
        batch.set(inventoryDocRef, inventoryUpdateData, { merge: true });
        
        try {
            await batch.commit();
            toast({ title: "Éxito", description: "Inspección de calidad guardada y stock actualizado." });
            handleCloseInspectionDialog();
            forceRefresh(); // Force refresh of collections
        } catch (error) {
             const contextualError = new FirestorePermissionError({ path: prodDocRef.path, operation: 'update', requestResourceData: updatedProdData });
             errorEmitter.emit('permission-error', contextualError);
        } finally {
            setIsSaving(false);
        }
    };

    const handleSaveSegregation = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!firestore || !user) return;
        
        const pieceId = molds?.find(m => m.id === segregateForm.moldId)?.pieces[0];
        if (!pieceId) {
            toast({ title: "Error", description: "El molde seleccionado no tiene una pieza asociada.", variant: "destructive" });
            return;
        }
        
        const qtyToSegregate = Number(segregateForm.qtySegregada);
        if (qtyToSegregate <= 0) {
            toast({ title: "Error", description: "La cantidad a segregar debe ser mayor a cero.", variant: "destructive" });
            return;
        }

        setIsSaving(true);
        const batch = writeBatch(firestore);
        
        try {
            // Create the segregation production record. This DOES NOT affect inventory.
            const segregationData: Omit<Production, 'id' > = {
                ...segregateForm,
                qtySegregada: qtyToSegregate,
                pieceId: pieceId,
                qtyFinalizada: 0,
                qtySinPrensar: 0,
                qtyScrap: 0,
                qtyArranque: 0,
                createdBy: user.uid,
                inspeccionadoCalidad: false,
                fechaISO: new Date().toISOString(),
            };
            const newProdDocRef = doc(collection(firestore, "production"));
            batch.set(newProdDocRef, segregationData);

            await batch.commit();

            toast({ title: "Éxito", description: "Lote segregado creado y pendiente de inspección." });
            setIsSegregateDialogOpen(false);
            setSegregateForm({ turno: '', machineId: '', moldId: '', nroRack: '', defecto: '', defectoOtro: '', tipoControl: '', qtySegregada: '' });
            forceRefresh();

        } catch(error) {
            const contextualError = new FirestorePermissionError({ path: 'production', operation: 'create', requestResourceData: segregateForm });
            errorEmitter.emit('permission-error', contextualError);
        } finally {
            setIsSaving(false);
        }
    };

    const handleUpdateSegregation = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!firestore || !user || !lotToEdit) return;

        const formData = new FormData(e.currentTarget);
        
        const pieceId = molds?.find(m => m.id === (formData.get('moldId') as string))?.pieces[0];
        if (!pieceId) {
            toast({ title: "Error", description: "El molde seleccionado no tiene una pieza asociada.", variant: "destructive" });
            return;
        }
        
        setIsSaving(true);
        const updatedData = {
            turno: formData.get('turno') as string,
            machineId: formData.get('machineId') as string,
            moldId: formData.get('moldId') as string,
            nroRack: formData.get('nroRack') as string,
            defecto: formData.get('defecto') as string,
            defectoOtro: formData.get('defecto') === 'Otros' ? formData.get('defectoOtro') as string : '',
            tipoControl: formData.get('tipoControl') as string,
            qtySegregada: Number(formData.get('qtySegregada')),
            pieceId: pieceId,
        };

        const lotDocRef = doc(firestore, 'production', lotToEdit.id);
        
        updateDoc(lotDocRef, updatedData)
            .then(() => {
                toast({ title: "Éxito", description: "Lote segregado actualizado correctamente." });
                setIsDetailDialogOpen(false);
                setLotToEdit(null);
            })
            .catch((error) => {
                const contextualError = new FirestorePermissionError({ path: lotDocRef.path, operation: 'update', requestResourceData: updatedData });
                errorEmitter.emit('permission-error', contextualError);
            })
            .finally(() => { setIsSaving(false); });
    }

    const isLoading = isLoadingProd || isLoadingMachines || isLoadingMolds || isLoadingPieces;
    const getPieceCode = (pieceId: string) => pieces?.find(p => p.id === pieceId)?.codigo || 'N/A';
    const getMachineName = (id: string) => machines?.find(m => m.id === id)?.nombre || 'N/A';
    const getMoldName = (id: string) => molds?.find(m => m.id === id)?.nombre || 'N/A';
  return (
    <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-headline font-bold">Gestión de Calidad</h1>
          <p className="text-muted-foreground">Inspecciona las piezas segregadas durante la producción.</p>
        </div>
         <Button onClick={() => setIsSegregateDialogOpen(true)}>
            <PlusCircle className="mr-2 h-4 w-4" /> Segregar Lote
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Lotes Pendientes de Inspección</CardTitle>
          <CardDescription>
            Estos lotes contienen piezas marcadas como "Segregadas" y requieren una inspección de calidad.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Máquina</TableHead>
                <TableHead>Pieza / Molde</TableHead>
                <TableHead>Turno</TableHead>
                <TableHead>Nro. Rack</TableHead>
                <TableHead className="text-right">Cantidad Pendiente</TableHead>
                <TableHead className="text-center">Acciones</TableHead>
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
              {!isLoading && pendingInspection.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>{new Date(p.fechaISO).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' })}</TableCell>
                    <TableCell className="font-medium">{getMachineName(p.machineId)}</TableCell>
                    <TableCell>{getPieceCode(p.pieceId)} / {getMoldName(p.moldId)}</TableCell>
                    <TableCell className="capitalize">{p.turno}</TableCell>
                    <TableCell>{p.nroRack}</TableCell>
                    <TableCell className="text-right font-bold text-lg">{p.qtySegregada.toLocaleString()}</TableCell>
                    <TableCell className="text-center">
                        <div className="flex flex-col md:flex-row gap-2 justify-center items-center">
                            <Button variant="outline" size="sm" onClick={() => setLotToEdit(p)}>
                                <Edit className="mr-2 h-4 w-4" /> Detalles
                            </Button>
                            <Button onClick={() => setSelectedProduction(p)}>
                                <Check className="mr-2 h-4 w-4" /> Inspeccionar
                            </Button>
                        </div>
                    </TableCell>
                  </TableRow>
              ))}
               {!isLoading && pendingInspection.length === 0 && (
                <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                        No hay lotes pendientes de inspección.
                    </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
            <div className="flex items-center justify-between">
                <div>
                    <CardTitle>Historial de Inspecciones</CardTitle>
                    <CardDescription>
                        Lotes que ya han sido inspeccionados por el equipo de calidad.
                    </CardDescription>
                </div>
                <Popover>
                    <PopoverTrigger asChild>
                    <Button
                        id="date"
                        variant={"outline"}
                        className={cn(
                        "w-[260px] justify-start text-left font-normal",
                        !date && "text-muted-foreground"
                        )}
                    >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {date?.from ? (
                        date.to ? (
                            <>
                            {format(date.from, "LLL dd, y")} -{" "}
                            {format(date.to, "LLL dd, y")}
                            </>
                        ) : (
                            format(date.from, "LLL dd, y")
                        )
                        ) : (
                        <span>Selecciona un rango</span>
                        )}
                    </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="end">
                    <Calendar
                        initialFocus
                        mode="range"
                        defaultMonth={date?.from}
                        selected={date}
                        onSelect={setDate}
                        numberOfMonths={2}
                    />
                    </PopoverContent>
                </Popover>
            </div>
        </CardHeader>
        <CardContent>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Fecha Inspección</TableHead>
                        <TableHead>Máquina</TableHead>
                        <TableHead>Pieza / Molde</TableHead>
                        <TableHead>Nro. Rack</TableHead>
                        <TableHead className="text-right">Total Segregado</TableHead>
                        <TableHead className="text-right text-green-600">Cantidad Apta</TableHead>
                        <TableHead className="text-right text-destructive">Cantidad Scrap</TableHead>
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
                    {!isLoading && inspectedHistory.map((p) => {
                        const aptaTotal = (p.qtyAptaCalidad || 0) + (p.qtyAptaSinPrensarCalidad || 0);
                        return (
                        <TableRow key={p.id}>
                            <TableCell>{new Date(p.inspectionDate || p.fechaISO).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' })}</TableCell>
                            <TableCell className="font-medium">{getMachineName(p.machineId)}</TableCell>
                            <TableCell>{getPieceCode(p.pieceId)} / {getMoldName(p.moldId)}</TableCell>
                            <TableCell>{p.nroRack}</TableCell>
                            <TableCell className="text-right font-medium">{(aptaTotal) + (p.qtyScrapCalidad || 0)}</TableCell>
                            <TableCell className="text-right text-green-600 font-bold">{aptaTotal.toLocaleString()}</TableCell>
                            <TableCell className="text-right text-destructive font-bold">{(p.qtyScrapCalidad || 0).toLocaleString()}</TableCell>
                        </TableRow>
                    )})}
                    {!isLoading && inspectedHistory.length === 0 && (
                        <TableRow>
                            <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                                No hay inspecciones en el rango de fechas seleccionado.
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </CardContent>
      </Card>


      <Dialog open={isInspectionDialogOpen} onOpenChange={setIsInspectionDialogOpen}>
          <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0">
                <DialogHeader className="p-6 pb-2">
                    <DialogTitle className="text-3xl font-bold">Inspección de Calidad</DialogTitle>
                    {selectedProduction && (
                         <DialogDescription className="text-base">
                            Lote del {new Date(selectedProduction.fechaISO).toLocaleDateString('es-ES')} | Pieza: {getPieceCode(selectedProduction.pieceId)} | Total a inspeccionar: <strong>{selectedProduction.qtySegregada.toLocaleString()}</strong>
                        </DialogDescription>
                    )}
                </DialogHeader>

                <div className="flex-grow p-6 grid grid-cols-2 gap-8">
                    <div className="flex flex-col gap-4">
                        <div className={`p-4 rounded-lg text-center ${isInspectionAmountValid ? 'bg-yellow-100 dark:bg-yellow-900/50' : 'bg-destructive/20'}`}>
                            <p className="text-lg">Clasificadas en esta sesión</p>
                            <p className="text-5xl font-bold">{totalInspectedInSession.toLocaleString()}</p>
                            {!isInspectionAmountValid && (
                                <p className="text-sm text-destructive font-semibold mt-1">
                                    La suma debe ser igual a la cantidad segregada.
                                </p>
                            )}
                        </div>
                        {inspectionFields.map(({key, label}) => (
                            <Button
                                key={key}
                                variant={activeField === key ? "default" : "secondary"}
                                className="h-24 text-2xl justify-between"
                                onClick={() => setActiveField(key)}
                            >
                                <span>{label}</span>
                                <span className="font-bold text-3xl">{quantities[key].toLocaleString()}</span>
                            </Button>
                        ))}
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                         {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(n => (
                            <Button key={n} variant="outline" className="h-full text-4xl font-bold" onClick={() => handleNumericButton(n)}>{n}</Button>
                        ))}
                        <Button variant="outline" className="h-full text-4xl font-bold" onClick={handleClear}>C</Button>
                        <Button variant="outline" className="h-full text-4xl font-bold" onClick={() => handleNumericButton('0')}>0</Button>
                        <Button variant="outline" className="h-full text-4xl font-bold" onClick={handleBackspace}>←</Button>
                    </div>
                </div>

                <DialogFooter className="p-6 pt-2 bg-muted border-t">
                    <Button type="button" variant="outline" className="w-48 h-12 text-lg" onClick={handleCloseInspectionDialog}>Cancelar</Button>
                    <Button type="button" className="w-48 h-12 text-lg" onClick={handleSaveInspection} disabled={isSaving || !isInspectionAmountValid}>
                        {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        {isSaving ? "Guardando..." : "Confirmar"}
                    </Button>
                </DialogFooter>
          </DialogContent>
      </Dialog>
      
       <Dialog open={isSegregateDialogOpen} onOpenChange={setIsSegregateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Segregar Lote para Inspección</DialogTitle>
            <DialogDescription>
              Crea un nuevo lote de piezas que requieren inspección de calidad. Este lote no se descuenta del stock existente.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveSegregation} className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="seg-turno">Turno</Label>
                    <Select required value={segregateForm.turno} onValueChange={(v) => setSegregateForm(s => ({...s, turno: v}))}>
                        <SelectTrigger id="seg-turno"><SelectValue placeholder="Selecciona turno..." /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="mañana">Mañana</SelectItem>
                            <SelectItem value="tarde">Tarde</SelectItem>
                            <SelectItem value="noche">Noche</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="seg-rack">Número de Rack</Label>
                    <Input id="seg-rack" required value={segregateForm.nroRack} onChange={(e) => setSegregateForm(s => ({...s, nroRack: e.target.value}))} />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="seg-machine">Máquina</Label>
                <Select required value={segregateForm.machineId} onValueChange={(v) => setSegregateForm(s => ({...s, machineId: v}))}>
                    <SelectTrigger id="seg-machine"><SelectValue placeholder="Selecciona máquina..." /></SelectTrigger>
                    <SelectContent>{machines?.map(m => <SelectItem key={m.id} value={m.id}>{m.nombre}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="seg-mold">Molde</Label>
                <Select required value={segregateForm.moldId} onValueChange={(v) => setSegregateForm(s => ({...s, moldId: v}))} disabled={!!machines?.find(m=>m.id === segregateForm.machineId)?.assignments?.some(a => isWithinInterval(new Date(), { start: new Date(a.startDate), end: new Date(a.endDate) }))}>
                    <SelectTrigger id="seg-mold"><SelectValue placeholder="Selecciona molde..." /></SelectTrigger>
                    <SelectContent>{molds?.map(m => <SelectItem key={m.id} value={m.id}>{m.nombre} ({getPieceCode(m.pieces[0])})</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-2">
                    <Label htmlFor="seg-defecto">Defecto</Label>
                    <Select required value={segregateForm.defecto} onValueChange={(v) => setSegregateForm(s => ({...s, defecto: v, defectoOtro: ''}))}>
                        <SelectTrigger id="seg-defecto"><SelectValue placeholder="Selecciona defecto..." /></SelectTrigger>
                        <SelectContent>{defectOptions.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                    </Select>
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="seg-control">Tipo de Control</Label>
                    <Select required value={segregateForm.tipoControl} onValueChange={(v) => setSegregateForm(s => ({...s, tipoControl: v}))}>
                        <SelectTrigger id="seg-control"><SelectValue placeholder="Selecciona control..." /></SelectTrigger>
                        <SelectContent>{controlTypeOptions.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                    </Select>
                </div>
              </div>
              {segregateForm.defecto === 'Otros' && (
                <div className="space-y-2">
                    <Label htmlFor="seg-defecto-otro">Defecto (Otros)</Label>
                    <Input id="seg-defecto-otro" required value={segregateForm.defectoOtro} onChange={(e) => setSegregateForm(s => ({...s, defectoOtro: e.target.value}))} />
                </div>
              )}
             <div className="space-y-2">
                <Label htmlFor="seg-qty">Cantidad a Segregar</Label>
                <Input id="seg-qty" type="number" required value={segregateForm.qtySegregada} onChange={(e) => setSegregateForm(s => ({...s, qtySegregada: e.target.value}))} />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsSegregateDialogOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Guardar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isDetailDialogOpen} onOpenChange={(isOpen) => { if(!isOpen) { setLotToEdit(null); setIsDetailDialogOpen(false); }}}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Detalles del Lote Segregado</DialogTitle>
            <DialogDescription>
              Edita la información del lote que fue enviado a inspección.
            </DialogDescription>
          </DialogHeader>
          {lotToEdit && (
            <form onSubmit={handleUpdateSegregation} className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="edit-turno">Turno</Label>
                        <Select required name="turno" defaultValue={lotToEdit.turno}>
                            <SelectTrigger id="edit-turno"><SelectValue placeholder="Selecciona turno..." /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="mañana">Mañana</SelectItem>
                                <SelectItem value="tarde">Tarde</SelectItem>
                                <SelectItem value="noche">Noche</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="edit-rack">Número de Rack</Label>
                        <Input id="edit-rack" name="nroRack" required defaultValue={lotToEdit.nroRack} />
                    </div>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="edit-machine">Máquina</Label>
                    <Select required name="machineId" defaultValue={lotToEdit.machineId}>
                        <SelectTrigger id="edit-machine"><SelectValue placeholder="Selecciona máquina..." /></SelectTrigger>
                        <SelectContent>{machines?.map(m => <SelectItem key={m.id} value={m.id}>{m.nombre}</SelectItem>)}</SelectContent>
                    </Select>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="edit-mold">Molde</Label>
                    <Select required name="moldId" defaultValue={lotToEdit.moldId}>
                        <SelectTrigger id="edit-mold"><SelectValue placeholder="Selecciona molde..." /></SelectTrigger>
                        <SelectContent>{molds?.map(m => <SelectItem key={m.id} value={m.id}>{m.nombre} ({getPieceCode(m.pieces[0])})</SelectItem>)}</SelectContent>
                    </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="edit-defecto">Defecto</Label>
                        <Select required name="defecto" defaultValue={lotToEdit.defecto} onValueChange={(v) => setLotToEdit(p => p ? {...p, defecto: v, defectoOtro: ''} : null)}>
                            <SelectTrigger id="edit-defecto"><SelectValue placeholder="Selecciona defecto..." /></SelectTrigger>
                            <SelectContent>{defectOptions.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="edit-control">Tipo de Control</Label>
                        <Select required name="tipoControl" defaultValue={lotToEdit.tipoControl}>
                            <SelectTrigger id="edit-control"><SelectValue placeholder="Selecciona control..." /></SelectTrigger>
                            <SelectContent>{controlTypeOptions.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                        </Select>
                    </div>
                </div>
                 {lotToEdit.defecto === 'Otros' && (
                    <div className="space-y-2">
                        <Label htmlFor="edit-defecto-otro">Defecto (Otros)</Label>
                        <Input id="edit-defecto-otro" name="defectoOtro" required defaultValue={lotToEdit.defectoOtro} />
                    </div>
                )}
                <div className="space-y-2">
                    <Label htmlFor="edit-qty">Cantidad Segregada</Label>
                    <Input id="edit-qty" name="qtySegregada" type="number" required defaultValue={lotToEdit.qtySegregada} />
                </div>
                <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => { setIsDetailDialogOpen(false); setLotToEdit(null); }}>Cancelar</Button>
                    <Button type="submit" disabled={isSaving}>
                        {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        Guardar Cambios
                    </Button>
                </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </main>
  );
}
