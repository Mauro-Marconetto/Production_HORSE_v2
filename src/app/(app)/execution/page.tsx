import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { machines, pieces } from "@/lib/data";

export default function ExecutionPage() {
  return (
    <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-headline font-bold">Production Execution</h1>
          <p className="text-muted-foreground">Log real production data from the shop floor.</p>
        </div>
      </div>
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Log Production Data</CardTitle>
          <CardDescription>Enter the data for a completed production shift or order.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="machine">Machine</Label>
                <Select>
                  <SelectTrigger id="machine">
                    <SelectValue placeholder="Select a machine" />
                  </SelectTrigger>
                  <SelectContent>
                    {machines.map(m => <SelectItem key={m.id} value={m.id}>{m.nombre}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="piece">Piece</Label>
                <Select>
                  <SelectTrigger id="piece">
                    <SelectValue placeholder="Select a piece" />
                  </SelectTrigger>
                  <SelectContent>
                    {pieces.map(p => <SelectItem key={p.id} value={p.id}>{p.codigo}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
                <div className="grid gap-2">
                    <Label htmlFor="hours">Hours Worked</Label>
                    <Input id="hours" type="number" placeholder="8" />
                </div>
                <div className="grid gap-2">
                    <Label htmlFor="units">Units Produced</Label>
                    <Input id="units" type="number" placeholder="1250" />
                </div>
                <div className="grid gap-2">
                    <Label htmlFor="scrap">Scrap Percentage</Label>
                    <Input id="scrap" type="number" placeholder="3.5" />
                </div>
            </div>
            <div className="flex justify-end">
                <Button type="submit">Submit Production Log</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
