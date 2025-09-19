
import {
  Activity,
  ArrowUpRight,
  CircleDollarSign,
  CreditCard,
  DollarSign,
  Users,
  Package,
  Hourglass,
  Factory,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  TrendingDown
} from "lucide-react";
import Link from "next/link";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { pieces, inventory, machines, demands, planAssignments, clients } from "@/lib/data";
import { DashboardCharts } from "@/components/dashboard-charts";
import { Badge } from "@/components/ui/badge";
import { DemandCoverageChart } from "@/components/demand-coverage-chart";

export default function DashboardPage() {
  const criticalStockItems = inventory.filter(item => {
      const piece = pieces.find(p => p.id === item.pieceId);
      return piece && item.stock < piece.stockMin * 1.1;
  }).length;


  return (
    <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
      <div className="grid gap-4 md:grid-cols-2 md:gap-8 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Cobertura de Stock
            </CardTitle>
            <Hourglass className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">~21 Días</div>
            <p className="text-xs text-muted-foreground">
              Promedio de todas las piezas
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Utilización de Máquina
            </CardTitle>
            <Factory className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">80.5%</div>
            <p className="text-xs text-muted-foreground">
              vs 82.5% objetivo
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cambios de Molde</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">3</div>
            <p className="text-xs text-muted-foreground">
              Programados esta semana
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Riesgo de Rotura de Stock
            </CardTitle>
            <AlertCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{criticalStockItems} Piezas</div>
            <p className="text-xs text-muted-foreground">
              Dentro del 10% del stock mín.
            </p>
          </CardContent>
        </Card>
      </div>
      <div className="grid gap-4 md:gap-8 lg:grid-cols-2 xl:grid-cols-3">
        <DemandCoverageChart 
          demands={demands}
          inventory={inventory}
          pieces={pieces}
          planAssignments={planAssignments}
        />
        <DashboardCharts />
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Estado de Inventario</CardTitle>
          <CardDescription>
            Resumen de los niveles de stock actuales frente a los objetivos mín/máx.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Pieza</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead className="text-right">Stock Actual</TableHead>
                <TableHead className="text-right">Stock Mín.</TableHead>
                <TableHead className="text-right">Stock Máx.</TableHead>
                <TableHead className="text-center">Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pieces.map(piece => {
                  const inv = inventory.find(i => i.pieceId === piece.id);
                  if (!inv) return null;
                  const client = clients.find(c => c.id === piece.clienteId);
                  const stockPercentage = (inv.stock - piece.stockMin) / (piece.stockMax - piece.stockMin);
                  const status = stockPercentage < 0.1 ? 'critical' : stockPercentage > 0.9 ? 'high' : 'ok';
                  const statusText = status === 'critical' ? 'Crítico' : status === 'high' ? 'Alto' : 'Ok';
                  
                  return (
                    <TableRow key={piece.id}>
                      <TableCell>
                        <div className="font-medium">{piece.codigo}</div>
                        <div className="hidden text-sm text-muted-foreground md:inline">
                          {piece.familia}
                        </div>
                      </TableCell>
                      <TableCell>{client?.nombre}</TableCell>
                      <TableCell className="text-right">{inv.stock.toLocaleString()}</TableCell>
                      <TableCell className="text-right">{piece.stockMin.toLocaleString()}</TableCell>
                      <TableCell className="text-right">{piece.stockMax.toLocaleString()}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant={status === 'critical' ? 'destructive' : 'secondary'}>
                            {status === 'critical' && <AlertCircle className="mr-1 h-3 w-3"/>}
                            {status === 'ok' && <CheckCircle className="mr-1 h-3 w-3 text-green-500"/>}
                            {status === 'high' && <TrendingUp className="mr-1 h-3 w-3 text-amber-500"/>}
                            {statusText}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  )
              })}
            </Body>
          </Table>
        </CardContent>
      </Card>
    </main>
  );
}
