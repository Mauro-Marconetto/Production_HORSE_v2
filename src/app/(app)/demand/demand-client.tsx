
"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileUp, CheckCircle, FileDown, X } from "lucide-react";
import type { Demand, Piece, Client } from "@/lib/types";

interface DemandClientPageProps {
    initialDemands: Demand[];
    pieces: Piece[];
    clients: Client[];
}

export default function DemandClientPage({ initialDemands, pieces, clients }: DemandClientPageProps) {
  const [demands, setDemands] = useState<Demand[]>(initialDemands);
  const [filterWeek, setFilterWeek] = useState<string>("");
  const [filterPiece, setFilterPiece] = useState<string>("");
  const [filterClient, setFilterClient] = useState<string>("");

  const weeks = useMemo(() => {
    const uniqueWeeks = [...new Set(demands.map(d => d.periodoYYYYWW))];
    return uniqueWeeks.sort();
  }, [demands]);

  const pieceOptions = useMemo(() => pieces.map(p => ({ value: p.id, label: p.codigo })).sort((a,b) => a.label.localeCompare(b.label)), [pieces]);
  const clientOptions = useMemo(() => clients.map(c => ({ value: c.id, label: c.nombre })).sort((a,b) => a.label.localeCompare(b.label)), [clients]);


  const filteredDemands = useMemo(() => {
    return demands.filter(demand => {
      const piece = pieces.find(p => p.id === demand.pieceId);
      const clientMatch = !filterClient || (piece && piece.clienteId === filterClient);
      const weekMatch = !filterWeek || demand.periodoYYYYWW === filterWeek;
      const pieceMatch = !filterPiece || demand.pieceId === filterPiece;
      return clientMatch && weekMatch && pieceMatch;
    });
  }, [demands, filterWeek, filterPiece, filterClient, pieces]);
  
  const clearFilters = () => {
    setFilterWeek("");
    setFilterPiece("");
    setFilterClient("");
  }

  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-headline font-bold">Gestión de Demanda</h1>
          <p className="text-muted-foreground">Importar, ver y filtrar la demanda de los clientes.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <FileDown className="mr-2 h-4 w-4" /> Descargar Plantilla
          </Button>
          <Button>
            <FileUp className="mr-2 h-4 w-4" /> Importar CSV
          </Button>
        </div>
      </div>
      <Card>
        <CardHeader>
            <div className="flex items-center justify-between">
                <div>
                    <CardTitle>Demanda Semanal</CardTitle>
                    <CardDescription>Unidades previstas por pieza para las próximas semanas.</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                    <Select value={filterWeek} onValueChange={setFilterWeek}>
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Filtrar por Semana" />
                        </SelectTrigger>
                        <SelectContent>
                            {weeks.map(week => (
                                <SelectItem key={week} value={week}>2024-W{week.slice(4)}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                     <Select value={filterPiece} onValueChange={setFilterPiece}>
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Filtrar por Pieza" />
                        </SelectTrigger>
                        <SelectContent>
                            {pieceOptions.map(option => (
                                <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                     <Select value={filterClient} onValueChange={setFilterClient}>
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Filtrar por Cliente" />
                        </SelectTrigger>
                        <SelectContent>
                            {clientOptions.map(option => (
                                <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    {(filterWeek || filterPiece || filterClient) && (
                        <Button variant="ghost" onClick={clearFilters} size="icon">
                            <X className="h-4 w-4" />
                        </Button>
                    )}
                </div>
            </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Semana</TableHead>
                <TableHead>Código de Pieza</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead className="text-right">Cantidad</TableHead>
                <TableHead className="text-center">Prioridad</TableHead>
                <TableHead className="text-center">Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDemands.map((demand) => {
                const piece = pieces.find(p => p.id === demand.pieceId);
                const client = clients.find(c => c.id === piece?.clienteId);
                return (
                  <TableRow key={demand.id}>
                    <TableCell>2024-W{demand.periodoYYYYWW.slice(4)}</TableCell>
                    <TableCell className="font-medium">{piece?.codigo}</TableCell>
                    <TableCell>{client?.nombre}</TableCell>
                    <TableCell className="text-right">{demand.qty.toLocaleString('es-ES')}</TableCell>
                    <TableCell className="text-center">{demand.prioridad}</TableCell>
                    <TableCell className="text-center">
                      {demand.congelado ? (
                        <span className="flex items-center justify-center text-green-600"><CheckCircle className="h-4 w-4 mr-1"/> Congelado</span>
                      ) : (
                        "Borrador"
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm">Editar</Button>
                      <Button variant="ghost" size="sm" className="text-green-600 hover:text-green-700">Congelar</Button>
                    </TableCell>
                  </TableRow>
                );
              })}
              {filteredDemands.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center">
                    No se encontraron resultados.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}
