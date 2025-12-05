import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface FunnelData {
  label: string;
  value: number;
  color: string;
}

interface FunnelChartProps {
  data: FunnelData[];
  title?: string;
}

export const FunnelChart = ({ data, title = "Funil de Análise" }: FunnelChartProps) => {
  const maxValue = useMemo(() => Math.max(...data.map(d => d.value), 1), [data]);
  
  // Inverted funnel - smallest at top, largest at bottom
  const sortedData = useMemo(() => [...data].sort((a, b) => a.value - b.value), [data]);

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center space-y-1">
          {sortedData.map((item, index) => {
            // For inverted funnel: smallest width at top, largest at bottom
            const widthPercent = 30 + (index / (sortedData.length - 1 || 1)) * 70;
            
            return (
              <div
                key={item.label}
                className="relative flex items-center justify-center transition-all duration-300 hover:scale-105"
                style={{
                  width: `${widthPercent}%`,
                  minWidth: "100px"
                }}
              >
                <div
                  className="w-full py-3 px-4 rounded-lg text-center text-sm font-medium transition-all"
                  style={{
                    backgroundColor: item.color,
                    color: "white"
                  }}
                >
                  <div className="flex items-center justify-between">
                    <span className="truncate">{item.label}</span>
                    <span className="ml-2 font-bold">{item.value}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        
        {/* Legend */}
        <div className="mt-6 flex flex-wrap justify-center gap-4">
          {data.map((item) => (
            <div key={item.label} className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: item.color }}
              />
              <span className="text-xs text-muted-foreground">{item.label}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};