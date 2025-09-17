import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { molds } from "@/lib/data";
import { PlusCircle } from "lucide-react";

export default function AdminMoldsPage() {
  return (
    <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-headline font-bold">Mold Catalog</h1>
          <p className="text-muted-foreground">Manage production molds.</p>
        </div>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" /> Add Mold
        </Button>
      </div>
      <Card>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Pieces</TableHead>
                <TableHead>Cavities</TableHead>
                <TableHead>Cycle (s)</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {molds.map((mold) => (
                <TableRow key={mold.id}>
                  <TableCell className="font-medium">{mold.nombre}</TableCell>
                  <TableCell>{mold.pieces.join(', ')}</TableCell>
                  <TableCell>{mold.cavidades}</TableCell>
                  <TableCell>{mold.cicloBase_s}</TableCell>
                  <TableCell>
                    <Badge variant={mold.status === 'ok' ? 'secondary' : 'destructive'}>
                      {mold.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm">Edit</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </main>
  );
}
