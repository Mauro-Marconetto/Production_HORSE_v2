'use client';

import { useState, useMemo, useEffect } from "react";
import { collection, doc, updateDoc, query, orderBy, addDoc } from 'firebase/firestore';
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
import type { Production, Machine, Mold, Piece } from "@/lib/types";
import { addDays, format } from "date-fns";
import type { DateRange } from "react-day-picker";
import { cn } from "@/lib/utils";

type QualityInspectionField = 'qtyAptaCalidad' | 'qtyScrapCalidad';

const inspectionFields: { key: QualityInspectionField, label: string }[] = [
    { key: 'qtyAptaCalidad', label: 'Apta (OK)' },
    { key: 'qtyScrapCalidad', label: 'Scrap' },
];

const defectOptions = ["Porosidad", "Rebaba", "Falta de material", "Golpe", "Marca de expulsor"];
const controlTypeOptions = ["Visual", "Dimensional", "Estanqueidad"];

export default function QualityPage() {
    const firestore = useFirestore();
    const { user } = useUser();
    const { toast } = useToast();

    const productionQuery = useMemoFirebase(() => 
        firestore 
            ? query(collection(firestore, 'production'), orderBy('fechaISO', 'desc'))
            : null, 
    [firestore]);
    
    const { data: allProduction, isLoading: isLoadingProd } = useCollection<Production>(productionQuery);

    const { data: machines, isLoading: isLoadingMachines } = useCollection<Machine>(useMemoFirebase(() => firestore ? collection(firestore, 'machines') : null, [firestore]));
    const { data: molds, isLoading: isLoadingMolds } = useCollection<Mold>(useMemoFirebase(() => firestore ? collection(firestore, 'molds') : null, [firestore]));
    const { data: pieces, isLoading: isLoadingPieces } = useCollection<Piece>(useMemoFirebase(() => firestore ? collection(firestore, 'pieces') : null, [firestore]));

    const [isInspectionDialogOpen, setIsInspectionDialogOpen] = useState(false);
    const [isSegregateDialogOpen, setIsSegregateDialogOpen] = useState(false);
    const [selectedProduction, setSelectedProduction] = useState<Production | null>(null);
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
    const [quantities, setQuantities] = useState<{qtyAptaCalidad: number, qtyScrapCalidad: number}>({ qtyAptaCalidad: 0, qtyScrapCalidad: 0 });
    const [currentInput, setCurrentInput] = useState('');
    
    // Segregation Dialog State
    const [segregateForm, setSegregateForm] = useState({
        turno: '',
        machineId: '',
        moldId: '',
        nroRack: '',
        defecto: '',
        tipoControl: '',
        qtySegregada: ''
    });

    useEffect(() => {
        if (selectedProduction) {
            setQuantities({ qtyAptaCalidad: 0, qtyScrapCalidad: 0 });
            setCurrentInput('');
            setActiveField('qtyAptaCalidad');
            setIsInspectionDialogOpen(true);
        }
    }, [selectedProduction]);
    
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


    const handleCloseInspectionDialog = () => {
        setIsInspectionDialogOpen(false);
    }
    
    const handleNumericButton = (value: string) => setCurrentInput(prev => prev + value);
    const handleBackspace = () => setCurrentInput(prev => prev.slice(0, -1));
    const handleClear = () => setCurrentInput('');

    const totalInspectedInSession = quantities.qtyAptaCalidad + quantities.qtyScrapCalidad;
    const isInspectionAmountValid = totalInspectedInSession <= (selectedProduction?.qtySegregada || 0);

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
            toast({ title: "Error de validación", description: "La cantidad inspeccionada no puede ser mayor a la cantidad segregada.", variant: "destructive" });
            return;
        }

        setIsSaving(true);
        const prodDocRef = doc(firestore, 'production', selectedProduction.id);
        const currentApta = selectedProduction.qtyAptaCalidad || 0;
        const currentScrap = selectedProduction.qtyScrapCalidad || 0;
        const remainingSegregada = (selectedProduction.qtySegregada || 0) - totalInspectedInSession;
        
        const updatedData = {
            qtyAptaCalidad: currentApta + quantities.qtyAptaCalidad,
            qtyScrapCalidad: currentScrap + quantities.qtyScrapCalidad,
            qtySegregada: remainingSegregada,
            inspectedBy: user.uid,
            inspectionDate: new Date().toISOString(),
            inspeccionadoCalidad: remainingSegregada === 0,
        };

        updateDoc(prodDocRef, updatedData)
            .then(() => {
                toast({ title: "Éxito", description: "Inspección de calidad guardada correctamente." });
                handleCloseInspectionDialog();
            })
            .catch((error) => {
                const contextualError = new FirestorePermissionError({ path: prodDocRef.path, operation: 'update', requestResourceData: updatedData });
                errorEmitter.emit('permission-error', contextualError);
            })
            .finally(() => { setIsSaving(false); });
    };

    const handleSaveSegregation = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!firestore || !user) return;
        
        const pieceId = molds?.find(m => m.id === segregateForm.moldId)?.pieces[0];
        if (!pieceId) {
            toast({ title: "Error", description: "El molde seleccionado no tiene una pieza asociada.", variant: "destructive" });
            return;
        }

        setIsSaving(true);
        const segregationData: Omit<Production, 'id' > = {
            ...segregateForm,
            qtySegregada: Number(segregateForm.qtySegregada),
            pieceId: pieceId,
            qtyFinalizada: 0,
            qtySinPrensar: 0,
            qtyScrap: 0,
            createdBy: user.uid,
            inspeccionadoCalidad: false,
            fechaISO: new Date().toISOString(),
        };

        addDoc(collection(firestore, "production"), segregationData)
            .then(() => {
                toast({ title: "Éxito", description: "Lote segregado correctamente." });
                setIsSegregateDialogOpen(false);
                setSegregateForm({ turno: '', machineId: '', moldId: '', nroRack: '', defecto: '', tipoControl: '', qtySegregada: '' });
            })
            .catch((error) => {
                const contextualError = new FirestorePermissionError({ path: 'production', operation: 'create', requestResourceData: segregationData });
                errorEmitter.emit('permission-error', contextualError);
            })
            .finally(() => { setIsSaving(false); });
    };

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
                      <Button onClick={() => setSelectedProduction(p)}>
                        <Check className="mr-2 h-4 w-4" /> Inspeccionar
                      </Button>
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
                        <TableHead className="text-right">Total Segregado</TableHead>
                        <TableHead className="text-right text-green-600">Cantidad Apta</TableHead>
                        <TableHead className="text-right text-destructive">Cantidad Scrap</TableHead>
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
                    {!isLoading && inspectedHistory.map((p) => (
                        <TableRow key={p.id}>
                            <TableCell>{new Date(p.inspectionDate || p.fechaISO).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' })}</TableCell>
                            <TableCell className="font-medium">{getMachineName(p.machineId)}</TableCell>
                            <TableCell>{getPieceCode(p.pieceId)} / {getMoldName(p.moldId)}</TableCell>
                            <TableCell className="text-right font-medium">{(p.qtyAptaCalidad || 0) + (p.qtyScrapCalidad || 0)}</TableCell>
                            <TableCell className="text-right text-green-600 font-bold">{(p.qtyAptaCalidad || 0).toLocaleString()}</TableCell>
                            <TableCell className="text-right text-destructive font-bold">{(p.qtyScrapCalidad || 0).toLocaleString()}</TableCell>
                        </TableRow>
                    ))}
                    {!isLoading && inspectedHistory.length === 0 && (
                        <TableRow>
                            <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
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
                                    La suma excede la cantidad segregada.
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
                    <Button type="button" className="w-48 h-12 text-lg" onClick={handleSaveInspection} disabled={isSaving || totalInspectedInSession === 0 || !isInspectionAmountValid}>
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
              Crea un nuevo lote de piezas que requieren inspección de calidad.
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
                <Select required value={segregateForm.moldId} onValueChange={(v) => setSegregateForm(s => ({...s, moldId: v}))}>
                    <SelectTrigger id="seg-mold"><SelectValue placeholder="Selecciona molde..." /></SelectTrigger>
                    <SelectContent>{molds?.map(m => <SelectItem key={m.id} value={m.id}>{m.nombre} ({getPieceCode(m.pieces[0])})</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-2">
                    <Label htmlFor="seg-defecto">Defecto</Label>
                    <Select required value={segregateForm.defecto} onValueChange={(v) => setSegregateForm(s => ({...s, defecto: v}))}>
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

    </main>
  );
}
