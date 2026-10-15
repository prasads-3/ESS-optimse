import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Cell } from "recharts";
import {
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
    type ChartConfig,
} from "@/components/ui/chart";

const chartConfig = {
    count: {
        label: "Approved Leaves",
        color: "hsl(var(--primary))",
    },
} satisfies ChartConfig;

export default function LeaveAnalyticsChart({ data }: { data: any[] }) {
    return (
        <ChartContainer config={chartConfig} className="h-full w-full">
            <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
                <XAxis
                    dataKey="month"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10, fontWeight: 500 }}
                    dy={10}
                />
                <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                />
                <ChartTooltip
                    cursor={{ fill: "rgba(0,0,0,0.02)" }}
                    content={<ChartTooltipContent hideLabel />}
                />
                <Bar dataKey="count" fill="var(--color-count)" radius={[4, 4, 0, 0]} barSize={32} isAnimationActive={false}>
                    {data.map((entry: any, index: number) => (
                        <Cell
                            key={`cell-${index}`}
                            fill={entry.count > 0 ? "var(--color-count)" : "hsl(var(--muted))"}
                            fillOpacity={0.8}
                        />
                    ))}
                </Bar>
            </BarChart>
        </ChartContainer>
    );
}
