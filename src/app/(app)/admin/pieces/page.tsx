import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { pieces } from "@/lib/data";
import { PlusCircle } from "lucide-react";

export default function AdminPiecesPage() {
  return (
    <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-headline font-bold">Piece Catalog</h1>
          <p className="text-muted-foreground">Manage all manufactured pieces.</p>
        </div>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" /> Add Piece
        </Button>
      </div>
       <Card>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Family</TableHead>
                <TableHead className="text-right">Stock Min</TableHead>
                <TableHead className="text-right">Stock Max</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pieces.map((piece) => (
                <TableRow key={piece.id}>
                  <TableCell className="font-medium">{piece.codigo}</TableCell>
                  <TableCell>{piece.cliente}</TableCell>
                  <TableCell>{piece.familia}</TableCell>
                  <TableCell className="text-right">{piece.stockMin.toLocaleString()}</TableCell>
                  <TableCell className="text-right">{piece.stockMax.toLocaleString()}</TableCell>
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
