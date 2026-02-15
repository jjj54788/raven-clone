'use client';

import { useEffect, useMemo, useRef, useState, type PointerEvent } from 'react';
import { CheckCircle2, Crown } from 'lucide-react';
import {
  buildTeamCanvas,
  type Team,
  type TeamCanvas,
  type TeamCanvasEdge,
  type TeamCanvasNode,
} from '@/lib/teams';

function edgeStroke(edge: TeamCanvasEdge): string {
  if (edge.status === 'done') return '#22C55E';
  if (edge.status === 'active') return '#7C3AED';
  return '#CBD5F5';
}

function nodeRing(node: TeamCanvasNode): string {
  if (node.kind === 'leader') return 'ring-4 ring-emerald-100';
  return 'ring-2 ring-white';
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

const NODE_SIZE_PX = {
  leader: 80,
  assistant: 64,
};

function nodeSizePx(node: TeamCanvasNode, width: number) {
  const base = node.kind === 'leader' ? NODE_SIZE_PX.leader : NODE_SIZE_PX.assistant;
  if (!width) return base;
  const scale = clamp(width / 920, 0.75, 1);
  return Math.round(base * scale);
}

function nodeRadiusY(node: TeamCanvasNode, height: number, width: number) {
  const sizePx = nodeSizePx(node, width);
  if (!height) {
    return node.kind === 'leader' ? 7.5 : 6.2;
  }
  return (sizePx / height) * 50;
}

function edgeEndpoints(from: TeamCanvasNode, to: TeamCanvasNode, height: number, width: number) {
  const fromRadius = nodeRadiusY(from, height, width);
  const toRadius = nodeRadiusY(to, height, width);
  const fromBelow = from.y <= to.y;
  return {
    x1: from.x,
    y1: from.y + (fromBelow ? fromRadius : -fromRadius),
    x2: to.x,
    y2: to.y + (fromBelow ? -toRadius : toRadius),
  };
}

function curveControlPoint(x1: number, y1: number, x2: number, y2: number) {
  const dx = Math.abs(x2 - x1);
  const dy = Math.abs(y2 - y1);
  const lift = clamp(4 + dx * 0.12 + dy * 0.08, 4, 14);
  const isDownward = y2 >= y1;
  const controlY = isDownward ? Math.min(y1, y2) - lift : Math.max(y1, y2) + lift;
  const controlX = (x1 + x2) / 2;
  return { cx: controlX, cy: controlY };
}

interface TeamCanvasProps {
  team: Team;
  editable?: boolean;
  onUpdate?: (canvas: TeamCanvas) => void;
}

export default function TeamCanvas({ team, editable = true, onUpdate }: TeamCanvasProps) {
  const baseCanvas = useMemo(() => {
    return team.canvas && team.canvas.nodes.length > 0
      ? team.canvas
      : buildTeamCanvas(team.assistants, team.leaderId);
  }, [team]);

  const [canvas, setCanvas] = useState<TeamCanvas>(baseCanvas);
  const canvasRef = useRef<TeamCanvas>(baseCanvas);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const dragRef = useRef<{
    id: string;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
  } | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  useEffect(() => {
    setCanvas(baseCanvas);
    canvasRef.current = baseCanvas;
  }, [baseCanvas]);

  useEffect(() => {
    canvasRef.current = canvas;
  }, [canvas]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => setContainerSize({ width: el.clientWidth || 0, height: el.clientHeight || 0 });
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const nodeById = useMemo(() => new Map(canvas.nodes.map((node) => [node.id, node])), [canvas.nodes]);

  const updateNode = (id: string, x: number, y: number) => {
    setCanvas((prev) => {
      const next: TeamCanvas = {
        ...prev,
        nodes: prev.nodes.map((node) => (node.id === id ? { ...node, x, y } : node)),
      };
      return next;
    });
  };

  const handlePointerDown = (node: TeamCanvasNode, event: PointerEvent<HTMLDivElement>) => {
    if (!editable) return;
    event.preventDefault();
    containerRef.current?.setPointerCapture(event.pointerId);
    dragRef.current = {
      id: node.id,
      startX: event.clientX,
      startY: event.clientY,
      originX: node.x,
      originY: node.y,
    };
    setDraggingId(node.id);
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!editable) return;
    const drag = dragRef.current;
    const container = containerRef.current;
    if (!drag || !container) return;
    const rect = container.getBoundingClientRect();
    const dx = ((event.clientX - drag.startX) / rect.width) * 100;
    const dy = ((event.clientY - drag.startY) / rect.height) * 100;
    const nextX = clamp(drag.originX + dx, 6, 94);
    const nextY = clamp(drag.originY + dy, 8, 92);
    updateNode(drag.id, nextX, nextY);
  };

  const finishDrag = () => {
    if (!editable) return;
    if (dragRef.current && onUpdate) {
      onUpdate(canvasRef.current);
    }
    dragRef.current = null;
    setDraggingId(null);
  };

  return (
    <div
      ref={containerRef}
      className={[
        'relative w-full overflow-hidden rounded-2xl border border-gray-200 bg-white',
        editable ? 'touch-none' : '',
      ].join(' ')}
      onPointerMove={handlePointerMove}
      onPointerUp={finishDrag}
      onPointerCancel={finishDrag}
      onPointerLeave={finishDrag}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(124,58,237,0.08),_transparent_55%)]" />
      <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full">
        {canvas.edges.map((edge) => {
          const from = nodeById.get(edge.from);
          const to = nodeById.get(edge.to);
          if (!from || !to) return null;
          const { x1, y1, x2, y2 } = edgeEndpoints(from, to, containerSize.height, containerSize.width);
          const { cx, cy } = curveControlPoint(x1, y1, x2, y2);
          return (
            <path
              key={edge.id}
              d={`M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`}
              stroke={edgeStroke(edge)}
              strokeWidth={0.6}
              strokeLinecap="round"
              fill="none"
            />
          );
        })}
      </svg>

      <div
        className="relative w-full"
        style={{ height: clamp(containerSize.width * 0.58, 360, 620) || 520 }}
      >
        {canvas.nodes.map((node) => {
          const accent = node.accent || 'from-gray-500 to-gray-600';
          const sizePx = nodeSizePx(node, containerSize.width);
          const iconText = node.iconText || node.label;
          const iconLabel = iconText.length <= 3 ? iconText : iconText.slice(0, 2);
          return (
            <div
              key={node.id}
              className="absolute flex flex-col items-center text-center"
              style={{ left: `${node.x}%`, top: `${node.y}%`, transform: 'translate(-50%, -50%)' }}
            >
              <div className="relative">
                <div
                  className={[
                    'flex items-center justify-center rounded-full text-white shadow-lg',
                    'bg-gradient-to-br',
                    accent,
                    nodeRing(node),
                    editable ? 'cursor-grab active:cursor-grabbing' : 'cursor-default',
                  ].join(' ')}
                  style={{ width: sizePx, height: sizePx }}
                  onPointerDown={(event) => handlePointerDown(node, event)}
                >
                  <span className="text-sm font-semibold tracking-wide">{iconLabel}</span>
                </div>
                {node.kind === 'leader' && (
                  <div className="absolute -top-4 left-1/2 flex h-6 w-6 -translate-x-1/2 items-center justify-center rounded-full bg-amber-400 text-white shadow">
                    <Crown size={14} />
                  </div>
                )}
                {node.progress && (
                  <div className="absolute -right-3 -top-2 rounded-full border border-white bg-emerald-500 px-2 py-0.5 text-[10px] font-semibold text-white shadow">
                    {node.progress.done}/{node.progress.total}
                  </div>
                )}
              </div>
              <div className="mt-2 flex flex-col items-center gap-0.5">
                <span className="text-xs font-semibold text-gray-900">{node.label}</span>
                {node.subtitle && <span className="text-[11px] text-gray-500">({node.subtitle})</span>}
                {node.role && <span className="text-[11px] text-gray-400">{node.role}</span>}
                {node.status === 'done' && (
                  <span className="mt-0.5 inline-flex items-center gap-1 rounded-full border border-emerald-100 bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
                    <CheckCircle2 size={12} />
                    {'\u5df2\u5b8c\u6210'}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
