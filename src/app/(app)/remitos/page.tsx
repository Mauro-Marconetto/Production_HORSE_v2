
'use client';

import { useMemo, useState } from "react";
import { collection, query, orderBy, where } from "firebase/firestore";
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MoreHorizontal, Loader2, Calendar as CalendarIcon } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import type { Remito, Piece, Supplier } from "@/lib/types";
import { addDays, format } from "date-fns";
import type { DateRange } from "react-day-picker";

export default function RemitosPage() {
    const firestore = useFirestore();
    const router = useRouter();
    
    const [date, setDate] = useState<DateRange | undefined>();

    const remitosQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        let q = query(collection(firestore, "remitos"), orderBy("fecha", "desc"));

        if (date?.from && date?.to) {
            q = query(q, where("fecha", ">=", date.from.toISOString()), where("fecha", "<=", addDays(date.to, 1).toISOString()));
        } else {
             // If no date range, limit to last 10
             q = query(collection(firestore, "remitos"), orderBy("fecha", "desc"));
        }
        return q;
    }, [firestore, date]);
    
    const { data: remitos, isLoading: isLoadingRemitos } = useCollection<Remito>(remitosQuery);

    const suppliersQuery = useMemoFirebase(() => firestore ? collection(firestore, "suppliers") : null, [firestore]);
    const { data: suppliers, isLoading: isLoadingSuppliers } = useCollection<Supplier>(suppliersQuery);
    
    const piecesQuery = useMemoFirebase(() => firestore ? collection(firestore, "pieces") : null, [firestore]);
    const { data: pieces, isLoading: isLoadingPieces } = useCollection<Piece>(piecesQuery);

    const isLoading = isLoadingRemitos || isLoadingSuppliers || isLoadingPieces;
    
    const displayedRemitos = useMemo(() => {
        if (!remitos) return [];
        if (date?.from && date?.to) {
            return remitos;
        }
        return remitos.slice(0, 10);
    }, [remitos, date]);

  return (
    <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-headline font-bold">Seguimiento de Remitos</h1>
          <p className="text-muted-foreground">Trazabilidad de piezas en proveedores externos (mecanizado, etc.).</p>
        </div>
      </div>
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle>Historial de Remitos</CardTitle>
              <CardDescription>
                Envíos a procesos externos registrados. Por defecto, se muestran los últimos 10.
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
                    <span>Filtrar por fecha</span>
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
                <TableHead>Remito ID</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Proveedor</TableHead>
                <TableHead>Transportista</TableHead>
                <TableHead>Piezas</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
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
              {!isLoading && displayedRemitos.map((remito) => {
                const supplier = suppliers?.find(s => s.id === remito.supplierId);
                return (
                  <TableRow key={remito.id}>
                    <TableCell className="font-mono text-xs">{remito.numero ? `0008-${String(remito.numero).padStart(8, '0')}` : remito.id.slice(-6)}</TableCell>
                    <TableCell>{new Date(remito.fecha).toLocaleDateString()}</TableCell>
                    <TableCell>{supplier?.nombre}</TableCell>
                    <TableCell>{remito.transportista}</TableCell>
                    <TableCell>
                        <div className="flex flex-col">
                            {remito.items.map(item => {
                                const piece = pieces?.find(p => p.id === item.pieceId);
                                return <span key={item.pieceId}>{piece?.codigo || 'N/A'}: {item.qty.toLocaleString()} u.</span>
                            })}
                        </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuItem onClick={() => router.push(`/remito/${remito.id}`)}>Imprimir Remito</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
              {!isLoading && (!displayedRemitos || displayedRemitos.length === 0) && (
                <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                        No se encontraron remitos para el filtro seleccionado.
                    </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </main>
  );
}
