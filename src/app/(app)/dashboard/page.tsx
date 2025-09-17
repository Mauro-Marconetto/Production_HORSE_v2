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
  AreaChart,
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { pieces, inventory, machines } from "@/lib/data";

const coverageData = inventory.map(inv => {
    const piece = pieces.find(p => p.id === inv.pieceId);
    const coverageDays = piece ? Math.floor(inv.stock / (piece.stockMin / 30)) : 0; // Simplified logic
    return { name: piece?.codigo, coverage: coverageDays, fill: 'hsl(var(--primary))' };
});

const utilizationData = machines.map(m => ({
    name: m.nombre,
    utilization: m.OEE_hist ? m.OEE_hist * 100 : 0,
    goal: m.OEE_obj * 100,
}));


export default function DashboardPage() {
  const totalStockValue = inventory.reduce((acc, item) => acc + item.stock, 0);
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
              Stock Coverage
            </CardTitle>
            <Hourglass className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">~21 Days</div>
            <p className="text-xs text-muted-foreground">
              Average across all pieces
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Machine Utilization
            </CardTitle>
            <Factory className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">80.5%</div>
            <p className="text-xs text-muted-foreground">
              vs 82.5% goal
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Mold Changes</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">3</div>
            <p className="text-xs text-muted-foreground">
              Scheduled this week
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Stockout Risk
            </CardTitle>
            <AlertCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{criticalStockItems} Pieces</div>
            <p className="text-xs text-muted-foreground">
              Within 10% of min. stock
            </p>
          </CardContent>
        </Card>
      </div>
      <div className="grid gap-4 md:gap-8 lg:grid-cols-2 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Machine Utilization (OEE)</CardTitle>
          </CardHeader>
          <CardContent className="pl-2">
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={utilizationData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="name"
                  stroke="#888888"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="#888888"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `${value}%`}
                />
                <Tooltip
                  cursor={{ fill: 'hsla(var(--muted))' }}
                  contentStyle={{
                    background: 'hsl(var(--background))',
                    borderColor: 'hsl(var(--border))',
                  }}
                />
                <Bar dataKey="utilization" name="Actual" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="goal" name="Goal" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Stock Coverage by Piece (Days)</CardTitle>
            <CardDescription>
              Estimated days of supply based on current demand.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
                <AreaChart
                    data={coverageData}
                    margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                >
                    <defs>
                        <linearGradient id="colorCoverage" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                        </linearGradient>
                    </defs>
                    <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false}/>
                    <Tooltip
                        cursor={{ fill: 'hsla(var(--muted))' }}
                        contentStyle={{
                        background: 'hsl(var(--background))',
                        borderColor: 'hsl(var(--border))',
                        }}
                    />
                    <Area type="monotone" dataKey="coverage" stroke="hsl(var(--primary))" fill="url(#colorCoverage)" />
                </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Inventory Status</CardTitle>
          <CardDescription>
            Overview of current stock levels against min/max targets.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Piece</TableHead>
                <TableHead>Client</TableHead>
                <TableHead className="text-right">Current Stock</TableHead>
                <TableHead className="text-right">Min Stock</TableHead>
                <TableHead className="text-right">Max Stock</TableHead>
                <TableHead className="text-center">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pieces.map(piece => {
                  const inv = inventory.find(i => i.pieceId === piece.id);
                  if (!inv) return null;
                  const stockPercentage = (inv.stock - piece.stockMin) / (piece.stockMax - piece.stockMin);
                  const status = stockPercentage < 0.1 ? 'critical' : stockPercentage > 0.9 ? 'high' : 'ok';
                  
                  return (
                    <TableRow key={piece.id}>
                      <TableCell>
                        <div className="font-medium">{piece.codigo}</div>
                        <div className="hidden text-sm text-muted-foreground md:inline">
                          {piece.familia}
                        </div>
                      </TableCell>
                      <TableCell>{piece.cliente}</TableCell>
                      <TableCell className="text-right">{inv.stock.toLocaleString()}</TableCell>
                      <TableCell className="text-right">{piece.stockMin.toLocaleString()}</TableCell>
                      <TableCell className="text-right">{piece.stockMax.toLocaleString()}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant={status === 'critical' ? 'destructive' : 'secondary'}>
                            {status === 'critical' && <AlertCircle className="mr-1 h-3 w-3"/>}
                            {status === 'ok' && <CheckCircle className="mr-1 h-3 w-3 text-green-500"/>}
                            {status === 'high' && <TrendingUp className="mr-1 h-3 w-3 text-amber-500"/>}
                            {status.charAt(0).toUpperCase() + status.slice(1)}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </main>
  );
}
