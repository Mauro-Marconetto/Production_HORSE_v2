
'use client';

import { useMemo } from "react";
import { collection } from "firebase/firestore";
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MoreHorizontal, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Remito, Piece, Supplier } from "@/lib/types";

const statusConfig: { [key: string]: { label: string, color: string } } = {
    enviado: { label: "Enviado", color: "bg-yellow-500" },
    en_proceso: { label: "En Proceso", color: "bg-blue-500" },
    retornado_parcial: { label: "Retornado Parcial", color: "bg-purple-500" },
    retornado_completo: { label: "Retornado Completo", color: "bg-green-500" },
};

export default function SubprocessesPage() {
    const firestore = useFirestore();

    const remitosQuery = useMemoFirebase(() => firestore ? collection(firestore, "remitos") : null, [firestore]);
    const { data: remitos, isLoading: isLoadingRemitos } = useCollection<Remito>(remitosQuery);

    const suppliersQuery = useMemoFirebase(() => firestore ? collection(firestore, "suppliers") : null, [firestore]);
    const { data: suppliers, isLoading: isLoadingSuppliers } = useCollection<Supplier>(suppliersQuery);
    
    const piecesQuery = useMemoFirebase(() => firestore ? collection(firestore, "pieces") : null, [firestore]);
    const { data: pieces, isLoading: isLoadingPieces } = useCollection<Piece>(piecesQuery);

    const isLoading = isLoadingRemitos || isLoadingSuppliers || isLoadingPieces;

  return (
    <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-headline font-bold">Seguimiento de Mecanizado</h1>
          <p className="text-muted-foreground">Trazabilidad de piezas en proveedores externos (mecanizado, etc.).</p>
        </div>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Remitos Enviados</CardTitle>
          <CardDescription>
            Envíos a procesos externos registrados en el sistema.
          </CardDescription>
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
                <TableHead className="text-center">Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
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
              {!isLoading && remitos?.map((remito) => {
                const supplier = suppliers?.find(s => s.id === remito.supplierId);
                const { label, color } = statusConfig[remito.status] || { label: 'Desconocido', color: 'bg-gray-500' };
                return (
                  <TableRow key={remito.id}>
                    <TableCell className="font-mono text-xs">{remito.id.slice(-6)}</TableCell>
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
                    <TableCell className="text-center">
                        <Badge className={cn("text-white", color)}>
                            {label}
                        </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuItem>Ver Detalles</DropdownMenuItem>
                          <DropdownMenuItem>Imprimir Remito</DropdownMenuItem>
                          <DropdownMenuItem>Registrar Retorno</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
              {!isLoading && (!remitos || remitos.length === 0) && (
                <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                        No se encontraron remitos.
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

    