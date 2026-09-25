"use client";

import {
	Bar,
	BarChart,
	Cell,
	ResponsiveContainer,
	Text,
	XAxis,
	YAxis,
} from "recharts";

interface StatChartProps {
	data: Array<{ label: string; value: number; color?: string }>;
	height?: number;
}

export function StatChart({ data, height = 200 }: StatChartProps) {
	return (
		<ResponsiveContainer width="100%" height={height}>
			<BarChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
				<XAxis
					dataKey="label"
					tickLine={false}
					axisLine={false}
					tick={<Text fontSize={11} fill="#888" />}
				/>
				<YAxis hide />
				<Bar dataKey="value" radius={[4, 4, 0, 0]} barSize={32}>
					{data.map((entry, index) => (
						<Cell
							key={`cell-${entry.label}-${index}`}
							fill={entry.color || "#3b82f6"}
						/>
					))}
				</Bar>
			</BarChart>
		</ResponsiveContainer>
	);
}

interface DonutChartProps {
	segments: Array<{ label: string; value: number; color: string }>;
	size?: number;
	centerLabel?: string;
	centerValue?: string | number;
}

export function DonutChart({
	segments,
	size = 160,
	centerLabel,
	centerValue,
}: DonutChartProps) {
	const total = segments.reduce((sum, s) => sum + s.value, 0);
	const radius = size / 2;
	const strokeWidth = 20;
	const circumference = 2 * Math.PI * (radius - strokeWidth / 2);

	let accumulated = 0;

	return (
		<div className="relative flex items-center justify-center">
			{/* Decorative progress ring: the value is already in the adjacent text. */}
			<svg width={size} height={size} className="-rotate-90" aria-hidden="true">
				{segments.map((segment) => {
					const percentage = total > 0 ? (segment.value / total) * 100 : 0;
					const dashLength = (percentage / 100) * circumference;
					const dashOffset = (accumulated / 100) * circumference;
					accumulated += percentage;

					return (
						<circle
							key={segment.label}
							cx={radius}
							cy={radius}
							r={radius - strokeWidth / 2}
							fill="none"
							stroke={segment.color}
							strokeWidth={strokeWidth}
							strokeDasharray={`${dashLength} ${circumference - dashLength}`}
							strokeDashoffset={-dashOffset}
							strokeLinecap="round"
						/>
					);
				})}
			</svg>
			{(centerLabel || centerValue) && (
				<div className="absolute inset-0 flex flex-col items-center justify-center">
					{centerValue !== undefined && (
						<span className="font-semibold text-lg">{centerValue}</span>
					)}
					{centerLabel && (
						<span className="text-muted-foreground text-xs">{centerLabel}</span>
					)}
				</div>
			)}
		</div>
	);
}

interface ProgressDonutProps {
	value: number;
	max: number;
	color?: string;
	backgroundColor?: string;
	size?: number;
	centerLabel?: string;
}

export function ProgressDonut({
	value,
	max,
	color = "#3b82f6",
	backgroundColor = "#e5e7eb",
	size = 120,
	centerLabel,
}: ProgressDonutProps) {
	const percentage = max > 0 ? Math.min((value / max) * 100, 100) : 0;
	const radius = size / 2;
	const strokeWidth = 12;
	const circumference = 2 * Math.PI * (radius - strokeWidth / 2);
	const filledLength = (percentage / 100) * circumference;

	return (
		<div className="relative flex items-center justify-center">
			{/* Decorative progress ring: the value is already in the adjacent text. */}
			<svg width={size} height={size} className="-rotate-90" aria-hidden="true">
				<circle
					cx={radius}
					cy={radius}
					r={radius - strokeWidth / 2}
					fill="none"
					stroke={backgroundColor}
					strokeWidth={strokeWidth}
				/>
				<circle
					cx={radius}
					cy={radius}
					r={radius - strokeWidth / 2}
					fill="none"
					stroke={color}
					strokeWidth={strokeWidth}
					strokeDasharray={`${filledLength} ${circumference - filledLength}`}
					strokeDashoffset={0}
					strokeLinecap="round"
				/>
			</svg>
			<div className="absolute inset-0 flex flex-col items-center justify-center">
				<span className="font-semibold text-sm">{Math.round(percentage)}%</span>
				{centerLabel && (
					<span className="text-muted-foreground text-xs">{centerLabel}</span>
				)}
			</div>
		</div>
	);
}

interface ChartLegendProps {
	items: Array<{ label: string; color: string; value?: string | number }>;
}

export function ChartLegend({ items }: ChartLegendProps) {
	return (
		<div className="flex flex-wrap gap-3">
			{items.map((item) => (
				<div key={item.label} className="flex items-center gap-1.5">
					<div
						className="h-2.5 w-2.5 rounded-full"
						style={{ backgroundColor: item.color }}
					/>
					<span className="text-muted-foreground text-xs">{item.label}</span>
					{item.value !== undefined && (
						<span className="font-medium text-xs">{item.value}</span>
					)}
				</div>
			))}
		</div>
	);
}
