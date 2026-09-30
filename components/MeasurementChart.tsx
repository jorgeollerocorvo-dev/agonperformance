"use client";

import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";

type Row = {
  date: string;
  weightKg: number | null;
  waistCm: number | null;
  bodyFatPct: number | null;
};

/**
 * Compact multi-line chart for weight / waist / body-fat over time. Only
 * renders the series that actually have data — a fresh athlete with just
 * weight logged doesn't get 3 empty lines.
 */
export default function MeasurementChart({ data }: { data: Row[] }) {
  const hasWeight = data.some((d) => d.weightKg != null);
  const hasWaist = data.some((d) => d.waistCm != null);
  const hasBf = data.some((d) => d.bodyFatPct != null);
  if (!hasWeight && !hasWaist && !hasBf) return null;

  return (
    <div className="h-56 -mx-2">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
          <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(d: string) => d.slice(5)} />
          <YAxis tick={{ fontSize: 10 }} />
          <Tooltip />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          {hasWeight && <Line type="monotone" dataKey="weightKg" name="Peso" stroke="#4f46e5" strokeWidth={2} dot={false} connectNulls />}
          {hasWaist && <Line type="monotone" dataKey="waistCm" name="Cintura" stroke="#059669" strokeWidth={2} dot={false} connectNulls />}
          {hasBf && <Line type="monotone" dataKey="bodyFatPct" name="% Grasa" stroke="#dc2626" strokeWidth={2} dot={false} connectNulls />}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
