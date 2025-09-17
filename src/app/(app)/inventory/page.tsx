import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { inventory, pieces } from "@/lib/data";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle, TrendingUp, PlusCircle } from "lucide-react";


export default function InventoryPage() {
  return (
    <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-headline font-bold">Inventory</h1>
          <p className="text-muted-foreground">Monitor and manage stock levels.</p>
        </div>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" /> New Stock Entry
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Current Stock Levels</CardTitle>
          <CardDescription>Overview of all pieces in inventory.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[400px]">Piece</TableHead>
                <TableHead>Client</TableHead>
                <TableHead className="text-right">Current Stock</TableHead>
                <TableHead className="text-right">Min/Max</TableHead>
                <TableHead className="w-[200px] text-center">Capacity</TableHead>
                <TableHead className="text-center">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {inventory.map((inv) => {
                const piece = pieces.find(p => p.id === inv.pieceId);
                if (!piece) return null;

                const stockPercentage = Math.round(((inv.stock - piece.stockMin) / (piece.stockMax - piece.stockMin)) * 100);
                const status = stockPercentage < 10 ? 'critical' : stockPercentage > 90 ? 'high' : 'ok';

                return (
                  <TableRow key={inv.pieceId}>
                    <TableCell className="font-medium">{piece.codigo}</TableCell>
                    <TableCell>{piece.cliente}</TableCell>
                    <TableCell className="text-right">{inv.stock.toLocaleString()}</TableCell>
                    <TableCell className="text-right">{piece.stockMin.toLocaleString()} / {piece.stockMax.toLocaleString()}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                         <Progress value={stockPercentage} className="h-2" />
                         <span>{stockPercentage}%</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={status === 'critical' ? 'destructive' : status === 'high' ? 'outline' : 'secondary'} className="border-primary/50">
                        {status === 'critical' && <AlertCircle className="mr-1 h-3 w-3" />}
                        {status === 'ok' && <CheckCircle className="mr-1 h-3 w-3 text-green-500" />}
                        {status === 'high' && <TrendingUp className="mr-1 h-3 w-3 text-amber-500" />}
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </main>
  );
}
