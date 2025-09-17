import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { demands, pieces } from "@/lib/data";
import { FileUp, CheckCircle } from "lucide-react";

export default function DemandPage() {
  return (
    <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-headline font-bold">Demand Management</h1>
          <p className="text-muted-foreground">Import and view customer demand.</p>
        </div>
        <Button>
          <FileUp className="mr-2 h-4 w-4" /> Import CSV
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Weekly Demand</CardTitle>
          <CardDescription>Forecasted units per piece for the upcoming weeks.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Week</TableHead>
                <TableHead>Piece Code</TableHead>
                <TableHead>Client</TableHead>
                <TableHead className="text-right">Quantity</TableHead>
                <TableHead className="text-center">Priority</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {demands.map((demand) => {
                const piece = pieces.find(p => p.id === demand.pieceId);
                return (
                  <TableRow key={demand.id}>
                    <TableCell>2024-W{demand.periodoYYYYWW.slice(4)}</TableCell>
                    <TableCell className="font-medium">{piece?.codigo}</TableCell>
                    <TableCell>{piece?.cliente}</TableCell>
                    <TableCell className="text-right">{demand.qty.toLocaleString()}</TableCell>
                    <TableCell className="text-center">{demand.prioridad}</TableCell>
                    <TableCell className="text-center">
                      {demand.congelado ? (
                        <span className="flex items-center justify-center text-green-600"><CheckCircle className="h-4 w-4 mr-1"/> Frozen</span>
                      ) : (
                        "Draft"
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm">Edit</Button>
                      <Button variant="ghost" size="sm" className="text-green-600 hover:text-green-700">Freeze</Button>
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
