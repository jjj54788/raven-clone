'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import type { GameState, GameAction } from '@/game/types';
import { GameRenderer, type Viewport } from '@/game/renderer';
import { GRID_SIZE, CELL_SIZE_PX } from '@/game/constants';
import { getAudio } from '@/game/audio';

interface GameCanvasProps {
  state: GameState;
  dispatch: React.Dispatch<GameAction>;
}

export default function GameCanvas({ state, dispatch }: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<GameRenderer | null>(null);
  const [hoverCell, setHoverCell] = useState<{ x: number; y: number } | null>(null);
  const [viewport, setViewport] = useState<Viewport>({ offsetX: 0, offsetY: 0, scale: 1 });
  const rafRef = useRef<number | null>(null);

  // Initialize renderer and center viewport
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const renderer = new GameRenderer(canvas);
    rendererRef.current = renderer;

    // Center the grid
    const rect = container.getBoundingClientRect();
    const gridTotal = GRID_SIZE * CELL_SIZE_PX;
    const scale = Math.min(rect.width / (gridTotal + 40), rect.height / (gridTotal + 40), 1.2);
    const offsetX = (rect.width - gridTotal * scale) / 2;
    const offsetY = (rect.height - gridTotal * scale) / 2;
    setViewport({ offsetX, offsetY, scale });

    // Handle resize
    const resizeObserver = new ResizeObserver(() => {
      renderer.resize();
      const r = container.getBoundingClientRect();
      const s = Math.min(r.width / (gridTotal + 40), r.height / (gridTotal + 40), 1.2);
      const ox = (r.width - gridTotal * s) / 2;
      const oy = (r.height - gridTotal * s) / 2;
      setViewport({ offsetX: ox, offsetY: oy, scale: s });
    });
    resizeObserver.observe(container);

    return () => {
      renderer.dispose();
      resizeObserver.disconnect();
    };
  }, []);

  // Animation loop for snow + render
  useEffect(() => {
    const renderer = rendererRef.current;
    if (!renderer) return;

    const animate = () => {
      renderer.updateSnow();
      renderer.render(state, viewport, hoverCell);
      rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [state, viewport, hoverCell]);

  const getGridCoord = useCallback(
    (e: React.MouseEvent) => {
      const canvas = canvasRef.current;
      if (!canvas || !rendererRef.current) return null;
      const rect = canvas.getBoundingClientRect();
      return rendererRef.current.screenToGrid(
        e.clientX - rect.left,
        e.clientY - rect.top,
        viewport,
      );
    },
    [viewport],
  );

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      const coord = getGridCoord(e);
      if (!coord) return;

      // If a building type is selected, try to place it
      if (state.selectedBuildingType) {
        getAudio().playSfx('build');
        dispatch({
          type: 'PLACE_BUILDING',
          buildingType: state.selectedBuildingType,
          x: coord.x,
          y: coord.y,
        });
        return;
      }

      // Otherwise select the cell
      getAudio().playSfx('click');
      dispatch({ type: 'SELECT_CELL', x: coord.x, y: coord.y });
    },
    [state.selectedBuildingType, dispatch, getGridCoord],
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      const coord = getGridCoord(e);
      setHoverCell(coord);
    },
    [getGridCoord],
  );

  const handleMouseLeave = useCallback(() => {
    setHoverCell(null);
  }, []);

  return (
    <div ref={containerRef} className="relative h-full w-full overflow-hidden">
      <canvas
        ref={canvasRef}
        onClick={handleClick}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className="h-full w-full"
        style={{ cursor: state.selectedBuildingType ? 'crosshair' : 'pointer' }}
      />
    </div>
  );
}
