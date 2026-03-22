import { useMemo, useState } from 'react';
import type { Task, ProjectWithTasks } from '@mycelio/shared';

interface GanttItem {
  id: string;
  label: string;
  start: Date;
  end: Date;
  color: string;
  status: string;
  isProject?: boolean;
  dependencies?: string[];
}

interface GanttChartProps {
  projects: ProjectWithTasks[];
  onTaskClick?: (taskId: string) => void;
  onProjectClick?: (projectId: string) => void;
}

const STATUS_OPACITY: Record<string, number> = {
  done: 0.4,
  completed: 0.4,
  archived: 0.3,
  blocked: 0.6,
  todo: 0.8,
  in_progress: 1,
  active: 1,
  on_hold: 0.5,
};

const ROW_HEIGHT = 32;
const HEADER_HEIGHT = 48;
const LABEL_WIDTH = 220;
const DAY_WIDTH = 24;
const MIN_BAR_WIDTH = 8;

function daysBetween(a: Date, b: Date) {
  return Math.ceil((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}

function formatDate(d: Date) {
  return d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' });
}

export default function GanttChart({ projects, onTaskClick, onProjectClick }: GanttChartProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const { items, timelineStart, timelineEnd, totalDays, months } = useMemo(() => {
    const now = new Date();
    const items: GanttItem[] = [];
    let earliest = new Date(now);
    let latest = new Date(now);

    // Add buffer: 7 days before earliest, 14 after latest
    for (const project of projects) {
      const pStart = project.startDate ? new Date(project.startDate) : now;
      const pEnd = project.endDate ? new Date(project.endDate) : new Date(now.getTime() + 30 * 86400000);

      if (pStart < earliest) earliest = new Date(pStart);
      if (pEnd > latest) latest = new Date(pEnd);

      items.push({
        id: project.id,
        label: project.name,
        start: pStart,
        end: pEnd,
        color: project.color || '#00f0ff',
        status: project.status,
        isProject: true,
      });

      for (const task of project.tasks || []) {
        const tStart = task.startDate ? new Date(task.startDate) : pStart;
        const tEnd = task.dueDate ? new Date(task.dueDate) : new Date(tStart.getTime() + 7 * 86400000);

        if (tStart < earliest) earliest = new Date(tStart);
        if (tEnd > latest) latest = new Date(tEnd);

        items.push({
          id: task.id,
          label: task.title,
          start: tStart,
          end: tEnd,
          color: project.color || '#00f0ff',
          status: task.status,
          dependencies: task.dependencies,
        });
      }
    }

    // Pad timeline
    const timelineStart = new Date(earliest);
    timelineStart.setDate(timelineStart.getDate() - 7);
    const timelineEnd = new Date(latest);
    timelineEnd.setDate(timelineEnd.getDate() + 14);

    const totalDays = daysBetween(timelineStart, timelineEnd);

    // Generate month labels
    const months: { label: string; x: number; width: number }[] = [];
    const cursor = new Date(timelineStart);
    cursor.setDate(1);
    if (cursor < timelineStart) cursor.setMonth(cursor.getMonth() + 1);

    while (cursor <= timelineEnd) {
      const nextMonth = new Date(cursor);
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      const x = Math.max(0, daysBetween(timelineStart, cursor)) * DAY_WIDTH;
      const endX = Math.min(totalDays, daysBetween(timelineStart, nextMonth)) * DAY_WIDTH;
      months.push({
        label: cursor.toLocaleDateString('en-AU', { month: 'short', year: '2-digit' }),
        x,
        width: endX - x,
      });
      cursor.setMonth(cursor.getMonth() + 1);
    }

    return { items, timelineStart, timelineEnd, totalDays, months };
  }, [projects]);

  if (items.length === 0) {
    return (
      <div className="text-white/20 text-center py-12">
        No projects or tasks with dates to display.
      </div>
    );
  }

  const svgWidth = LABEL_WIDTH + totalDays * DAY_WIDTH;
  const svgHeight = HEADER_HEIGHT + items.length * ROW_HEIGHT + 8;
  const todayX = LABEL_WIDTH + daysBetween(timelineStart, new Date()) * DAY_WIDTH;

  return (
    <div className="overflow-x-auto overflow-y-auto glass rounded-xl" style={{ maxHeight: '70vh' }}>
      <svg width={svgWidth} height={svgHeight} className="select-none">
        {/* Header background */}
        <rect x={0} y={0} width={svgWidth} height={HEADER_HEIGHT} fill="rgba(255,255,255,0.03)" />

        {/* Month labels */}
        {months.map((m, i) => (
          <g key={i}>
            <line x1={LABEL_WIDTH + m.x} y1={0} x2={LABEL_WIDTH + m.x} y2={svgHeight} stroke="rgba(255,255,255,0.05)" strokeWidth={1} />
            <text x={LABEL_WIDTH + m.x + m.width / 2} y={20} textAnchor="middle" fill="rgba(255,255,255,0.3)" fontSize={10} fontFamily="monospace">
              {m.label}
            </text>
          </g>
        ))}

        {/* Today line */}
        <line x1={todayX} y1={HEADER_HEIGHT} x2={todayX} y2={svgHeight} stroke="#ff00e5" strokeWidth={1.5} strokeDasharray="4,4" opacity={0.6} />
        <text x={todayX} y={HEADER_HEIGHT - 4} textAnchor="middle" fill="#ff00e5" fontSize={9} fontFamily="monospace" opacity={0.8}>
          TODAY
        </text>

        {/* Label column divider */}
        <line x1={LABEL_WIDTH} y1={0} x2={LABEL_WIDTH} y2={svgHeight} stroke="rgba(255,255,255,0.08)" strokeWidth={1} />

        {/* Rows */}
        {items.map((item, idx) => {
          const y = HEADER_HEIGHT + idx * ROW_HEIGHT;
          const barStart = daysBetween(timelineStart, item.start) * DAY_WIDTH;
          const barWidth = Math.max(MIN_BAR_WIDTH, daysBetween(item.start, item.end) * DAY_WIDTH);
          const opacity = STATUS_OPACITY[item.status] ?? 0.8;
          const isHovered = hoveredId === item.id;

          return (
            <g
              key={item.id}
              onMouseEnter={() => setHoveredId(item.id)}
              onMouseLeave={() => setHoveredId(null)}
              onClick={() => {
                if (item.isProject) onProjectClick?.(item.id);
                else onTaskClick?.(item.id);
              }}
              style={{ cursor: 'pointer' }}
            >
              {/* Row background */}
              <rect
                x={0}
                y={y}
                width={svgWidth}
                height={ROW_HEIGHT}
                fill={isHovered ? 'rgba(255,255,255,0.05)' : idx % 2 === 0 ? 'rgba(255,255,255,0.01)' : 'transparent'}
              />

              {/* Row divider */}
              <line x1={0} y1={y + ROW_HEIGHT} x2={svgWidth} y2={y + ROW_HEIGHT} stroke="rgba(255,255,255,0.03)" />

              {/* Label */}
              <text
                x={item.isProject ? 12 : 24}
                y={y + ROW_HEIGHT / 2 + 4}
                fill={item.isProject ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.4)'}
                fontSize={item.isProject ? 12 : 11}
                fontWeight={item.isProject ? 600 : 400}
                fontFamily="system-ui"
              >
                {item.label.length > 26 ? item.label.slice(0, 24) + '...' : item.label}
              </text>

              {/* Bar */}
              <rect
                x={LABEL_WIDTH + barStart}
                y={y + 6}
                width={barWidth}
                height={ROW_HEIGHT - 12}
                rx={item.isProject ? 3 : 2}
                fill={item.color}
                opacity={opacity}
                stroke={isHovered ? '#fff' : 'none'}
                strokeWidth={isHovered ? 1 : 0}
              />

              {/* Status indicator for tasks */}
              {!item.isProject && item.status === 'done' && (
                <text x={LABEL_WIDTH + barStart + barWidth / 2} y={y + ROW_HEIGHT / 2 + 3} textAnchor="middle" fill="#000" fontSize={9} fontWeight={700}>
                  ✓
                </text>
              )}
              {!item.isProject && item.status === 'blocked' && (
                <text x={LABEL_WIDTH + barStart + barWidth / 2} y={y + ROW_HEIGHT / 2 + 3} textAnchor="middle" fill="#000" fontSize={9} fontWeight={700}>
                  ✕
                </text>
              )}

              {/* Tooltip on hover */}
              {isHovered && (
                <g>
                  <rect
                    x={LABEL_WIDTH + barStart + barWidth + 4}
                    y={y + 2}
                    width={160}
                    height={ROW_HEIGHT - 4}
                    rx={4}
                    fill="rgba(0,0,0,0.85)"
                    stroke="rgba(255,255,255,0.15)"
                  />
                  <text
                    x={LABEL_WIDTH + barStart + barWidth + 12}
                    y={y + ROW_HEIGHT / 2 + 4}
                    fill="rgba(255,255,255,0.7)"
                    fontSize={10}
                    fontFamily="monospace"
                  >
                    {formatDate(item.start)} → {formatDate(item.end)}
                  </text>
                </g>
              )}
            </g>
          );
        })}

        {/* Dependency arrows */}
        {items.map((item) => {
          if (!item.dependencies || item.dependencies.length === 0) return null;
          const toIdx = items.findIndex((i) => i.id === item.id);
          if (toIdx < 0) return null;

          return item.dependencies.map((depId) => {
            const fromIdx = items.findIndex((i) => i.id === depId);
            if (fromIdx < 0) return null;

            const fromItem = items[fromIdx];
            const fromY = HEADER_HEIGHT + fromIdx * ROW_HEIGHT + ROW_HEIGHT / 2;
            const fromX = LABEL_WIDTH + daysBetween(timelineStart, fromItem.end) * DAY_WIDTH;
            const toY = HEADER_HEIGHT + toIdx * ROW_HEIGHT + ROW_HEIGHT / 2;
            const toX = LABEL_WIDTH + daysBetween(timelineStart, item.start) * DAY_WIDTH;

            return (
              <g key={`${depId}-${item.id}`}>
                <path
                  d={`M${fromX},${fromY} C${fromX + 20},${fromY} ${toX - 20},${toY} ${toX},${toY}`}
                  fill="none"
                  stroke="rgba(255,255,255,0.15)"
                  strokeWidth={1}
                  markerEnd="url(#arrow)"
                />
              </g>
            );
          });
        })}

        {/* Arrow marker */}
        <defs>
          <marker id="arrow" viewBox="0 0 10 10" refX={10} refY={5} markerWidth={6} markerHeight={6} orient="auto">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="rgba(255,255,255,0.2)" />
          </marker>
        </defs>
      </svg>
    </div>
  );
}
