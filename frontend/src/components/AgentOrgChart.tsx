'use client';

import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { DebateAgent } from '@/lib/api';

export type AgentStatusMap = Record<string, string>;

type AgentNode = {
  id: string;
  x: number;
  y: number;
  agent: DebateAgent;
  kind: 'leader' | 'member';
};

type AgentEdge = {
  id: string;
  from: string;
  to: string;
};

type LayoutMetrics = {
  width: number;
  height: number;
  leaderWidth: number;
  leaderHeight: number;
  memberWidth: number;
  memberHeight: number;
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function layoutAgents(agents: DebateAgent[], leaderId?: string) {
  if (!agents.length) return { nodes: [] as AgentNode[], edges: [] as AgentEdge[] };
  const leader = agents.find((a) => a.id === leaderId) ?? agents[0];
  const followers = agents.filter((a) => a.id !== leader.id);

  const nodes: AgentNode[] = [
    {
      id: `node_${leader.id}`,
      x: 50,
      y: 22,
      agent: leader,
      kind: 'leader',
    },
  ];

  const count = followers.length;
  const maxPerRow = 5;
  const rowCount = Math.max(1, Math.ceil(count / maxPerRow));
  const baseRowSize = Math.floor(count / rowCount);
  const remainder = count % rowCount;
  const rowYs = rowCount === 1
    ? [68]
    : Array.from({ length: rowCount }, (_, index) => {
      const top = 56;
      const bottom = 86;
      return top + (index * (bottom - top)) / (rowCount - 1);
    });

  let cursor = 0;
  rowYs.forEach((y, rowIndex) => {
    const rowSize = baseRowSize + (rowIndex < remainder ? 1 : 0);
    if (rowSize <= 0) return;
    const span = rowSize === 1 ? 0 : clamp(28 + (rowSize - 1) * 12, 28, 72);
    const xStart = rowSize === 1 ? 50 : 50 - span / 2;
    const xEnd = rowSize === 1 ? 50 : 50 + span / 2;
    for (let i = 0; i < rowSize; i += 1) {
      const agent = followers[cursor + i];
      if (!agent) continue;
      const x = rowSize === 1 ? 50 : xStart + (i * (xEnd - xStart)) / (rowSize - 1);
      nodes.push({
        id: `node_${agent.id}`,
        x,
        y,
        agent,
        kind: 'member',
      });
    }
    cursor += rowSize;
  });

  const edges: AgentEdge[] = followers.map((agent) => ({
    id: `edge_${leader.id}_${agent.id}`,
    from: `node_${leader.id}`,
    to: `node_${agent.id}`,
  }));

  return { nodes, edges };
}

function rectIntersectionScale(dx: number, dy: number, halfWidth: number, halfHeight: number) {
  const absDx = Math.abs(dx);
  const absDy = Math.abs(dy);
  if (absDx === 0 && absDy === 0) return 0;
  const scaleX = absDx === 0 ? Number.POSITIVE_INFINITY : halfWidth / absDx;
  const scaleY = absDy === 0 ? Number.POSITIVE_INFINITY : halfHeight / absDy;
  return Math.min(scaleX, scaleY);
}

function edgeEndpoints(from: AgentNode, to: AgentNode, metrics: LayoutMetrics) {
  const width = metrics.width || 1;
  const height = metrics.height || 1;
  const fromHalfWidth = (from.kind === 'leader' ? metrics.leaderWidth : metrics.memberWidth) / 2;
  const fromHalfHeight = (from.kind === 'leader' ? metrics.leaderHeight : metrics.memberHeight) / 2;
  const toHalfWidth = (to.kind === 'leader' ? metrics.leaderWidth : metrics.memberWidth) / 2;
  const toHalfHeight = (to.kind === 'leader' ? metrics.leaderHeight : metrics.memberHeight) / 2;
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const dxPx = (dx * width) / 100;
  const dyPx = (dy * height) / 100;
  const fromScale = rectIntersectionScale(dxPx, dyPx, fromHalfWidth, fromHalfHeight);
  const toScale = rectIntersectionScale(dxPx, dyPx, toHalfWidth, toHalfHeight);
  const fromOffsetX = ((dxPx * fromScale) * 100) / width;
  const fromOffsetY = ((dyPx * fromScale) * 100) / height;
  const toOffsetX = ((dxPx * toScale) * 100) / width;
  const toOffsetY = ((dyPx * toScale) * 100) / height;
  return {
    x1: from.x + fromOffsetX,
    y1: from.y + fromOffsetY,
    x2: to.x - toOffsetX,
    y2: to.y - toOffsetY,
  };
}

function curveControlPoint(x1: number, y1: number, x2: number, y2: number) {
  const dx = Math.abs(x2 - x1);
  const dy = Math.abs(y2 - y1);
  const lift = clamp(6 + dx * 0.12 + dy * 0.08, 6, 16);
  const isDownward = y2 >= y1;
  const baseY = isDownward ? Math.min(y1, y2) : Math.max(y1, y2);
  const controlY = clamp(baseY + (isDownward ? -lift : lift), 2, 98);
  const controlX = (x1 + x2) / 2;
  return { cx: controlX, cy: controlY };
}

function statusColor(status?: string) {
  if (status === 'speaking') return '#22C55E';
  if (status === 'thinking') return '#8B5CF6';
  if (status === 'waiting') return '#F59E0B';
  return '#CBD5F5';
}

export default function AgentOrgChart({
  agents,
  leaderId,
  statuses,
  height,
}: {
  agents: DebateAgent[];
  leaderId?: string;
  statuses?: AgentStatusMap;
  height?: number;
}) {
  const chartHeight = height ?? 360;
  const { nodes, edges } = useMemo(() => layoutAgents(agents, leaderId), [agents, leaderId]);
  const nodeMap = useMemo(() => new Map(nodes.map((node) => [node.id, node])), [nodes]);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const leaderNodeRef = useRef<HTMLDivElement | null>(null);
  const memberNodeRef = useRef<HTMLDivElement | null>(null);
  const [metrics, setMetrics] = useState<LayoutMetrics>({
    width: 1,
    height: 1,
    leaderWidth: 72,
    leaderHeight: 48,
    memberWidth: 64,
    memberHeight: 44,
  });

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const update = () => {
      const rect = container.getBoundingClientRect();
      const leaderRect = leaderNodeRef.current?.getBoundingClientRect();
      const memberRect = memberNodeRef.current?.getBoundingClientRect();
      setMetrics({
        width: rect.width || 1,
        height: rect.height || 1,
        leaderWidth: leaderRect?.width ?? 72,
        leaderHeight: leaderRect?.height ?? 48,
        memberWidth: memberRect?.width ?? 64,
        memberHeight: memberRect?.height ?? 44,
      });
    };

    update();
    const ro = new ResizeObserver(update);
    ro.observe(container);
    if (leaderNodeRef.current) ro.observe(leaderNodeRef.current);
    if (memberNodeRef.current) ro.observe(memberNodeRef.current);
    return () => ro.disconnect();
  }, [nodes.length]);

  if (!agents.length) {
    return (
      <div
        className="flex w-full items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-white text-sm text-gray-400"
        style={{ height: chartHeight }}
      >
        No agents selected
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative w-full overflow-hidden rounded-2xl border border-gray-200 bg-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(99,102,241,0.08),_transparent_55%)]" />
      <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full">
        {edges.map((edge) => {
          const from = nodeMap.get(edge.from);
          const to = nodeMap.get(edge.to);
          if (!from || !to) return null;
          const { x1, y1, x2, y2 } = edgeEndpoints(from, to, metrics);
          const { cx, cy } = curveControlPoint(x1, y1, x2, y2);
          return (
            <path
              key={edge.id}
              d={`M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`}
              stroke="#C7D2FE"
              strokeWidth={0.6}
              strokeLinecap="round"
              fill="none"
            />
          );
        })}
      </svg>

      <div className="relative w-full" style={{ height: chartHeight }}>
        {nodes.map((node) => {
          const color = node.agent.color || (node.kind === 'leader' ? '#6366F1' : '#8B5CF6');
          const status = statuses?.[node.agent.id];
          return (
            <div
              key={node.id}
              className="absolute flex flex-col items-center text-center"
              style={{ left: `${node.x}%`, top: `${node.y}%`, transform: 'translate(-50%, -50%)' }}
            >
              <div className="relative">
                <div
                  ref={node.kind === 'leader' ? leaderNodeRef : memberNodeRef}
                  className={`flex items-center justify-center rounded-2xl text-white shadow-md ${
                    node.kind === 'leader' ? 'h-12 w-20' : 'h-11 w-16'
                  }`}
                  style={{ backgroundColor: color }}
                >
                  <span className="text-xs font-semibold">
                    {node.agent.name.length > 4 ? node.agent.name.slice(0, 4) : node.agent.name}
                  </span>
                </div>
                <span
                  className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full border border-white"
                  style={{ backgroundColor: statusColor(status) }}
                  title={status || 'idle'}
                />
              </div>
              <div className="mt-2 flex flex-col items-center gap-0.5">
                <span className="text-xs font-semibold text-gray-900">{node.agent.name}</span>
                <span className="text-[11px] text-gray-500">{node.agent.profile}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
