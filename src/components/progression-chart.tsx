import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

type DataPoint = {
  date: string;
  maxWeight: number | null;
  totalReps: number;
  totalVolume: number;
};

type Metric = "maxWeight" | "totalReps" | "totalVolume";

export function ProgressionChart({ data, metric }: { data: DataPoint[]; metric: Metric }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" />
        <YAxis />
        <Tooltip />
        <Line type="monotone" dataKey={metric} dot={true} />
      </LineChart>
    </ResponsiveContainer>
  );
}
