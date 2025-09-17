"use client";

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

import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
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

export function DashboardCharts() {
    return (
        <>
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
        </>
    )
}
