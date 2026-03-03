'use client';

import { useState } from 'react';
import { Snowflake, Play, BookOpen, Trophy, ChevronLeft } from 'lucide-react';
import type { Difficulty } from '@/game/types';

interface GameMenuProps {
  locale: string;
  onNewGame: (difficulty: Difficulty) => void;
  onLeaderboard: () => void;
}

export default function GameMenu({ locale, onNewGame, onLeaderboard }: GameMenuProps) {
  const zh = locale === 'zh';
  const [showDifficulty, setShowDifficulty] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  return (
    <div className="relative flex h-full flex-col items-center justify-center overflow-hidden bg-[#0a1628]">
      {/* Atmospheric gradient layers */}
      <div className="pointer-events-none absolute inset-0">
        {/* Bottom cold glow */}
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-[#0d2040]/80 to-transparent" />
        {/* Top dark */}
        <div className="absolute inset-x-0 top-0 h-1/3 bg-gradient-to-b from-[#050d1a] to-transparent" />
        {/* Central warm glow hint (generator in distance) */}
        <div
          className="absolute left-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full opacity-20"
          style={{
            background: 'radial-gradient(circle, rgba(255,120,30,0.4) 0%, transparent 70%)',
          }}
        />
      </div>

      {/* Snow particles */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {Array.from({ length: 50 }).map((_, i) => (
          <div
            key={i}
            className="absolute animate-[fall_linear_infinite] rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              width: `${Math.random() * 3 + 1}px`,
              height: `${Math.random() * 3 + 1}px`,
              backgroundColor: `rgba(180, 200, 225, ${Math.random() * 0.3 + 0.1})`,
              animationDuration: `${Math.random() * 10 + 5}s`,
              animationDelay: `${Math.random() * 6}s`,
            }}
          />
        ))}
      </div>

      {/* City silhouette hint */}
      <div className="pointer-events-none absolute bottom-[35%] left-1/2 -translate-x-1/2">
        <div className="flex items-end gap-1 opacity-[0.06]">
          {[20, 35, 50, 70, 90, 70, 55, 40, 25, 15].map((h, i) => (
            <div
              key={i}
              className="bg-slate-300"
              style={{ width: `${6 + Math.random() * 4}px`, height: `${h}px` }}
            />
          ))}
        </div>
      </div>

      {/* Title Group */}
      <div className="relative z-10 mb-14 text-center">
        <div className="mb-5 flex justify-center">
          <div
            className="flex h-20 w-20 items-center justify-center rounded-2xl shadow-2xl"
            style={{
              background: 'linear-gradient(135deg, #1e3a5f 0%, #2d5a8c 50%, #1a2f4a 100%)',
              boxShadow: '0 0 40px rgba(100, 150, 220, 0.15), inset 0 1px 0 rgba(255,255,255,0.08)',
            }}
          >
            <Snowflake size={38} className="text-blue-200/80" />
          </div>
        </div>
        <h1
          className="mb-2 text-4xl font-bold tracking-wider"
          style={{
            color: '#c8d8e8',
            textShadow: '0 0 30px rgba(100, 150, 220, 0.3)',
          }}
        >
          {zh ? '无尽冬日' : 'FROSTLAND'}
        </h1>
        <p className="text-sm tracking-widest text-slate-500">
          {zh ? '在无尽严寒中求生' : 'SURVIVE THE ENDLESS WINTER'}
        </p>
        {/* Decorative line */}
        <div className="mx-auto mt-4 flex items-center gap-2">
          <div className="h-px w-16 bg-gradient-to-r from-transparent to-slate-600" />
          <div className="h-1 w-1 rounded-full bg-slate-500" />
          <div className="h-px w-16 bg-gradient-to-l from-transparent to-slate-600" />
        </div>
      </div>

      {/* Menu Buttons */}
      <div className="relative z-10 w-72">
        {!showDifficulty ? (
          <div className="flex flex-col gap-2.5">
            <MenuButton
              icon={<Play size={16} />}
              label={zh ? '新游戏' : 'NEW GAME'}
              primary
              onClick={() => setShowDifficulty(true)}
            />
            <MenuButton
              icon={<Trophy size={16} />}
              label={zh ? '排行榜' : 'LEADERBOARD'}
              onClick={onLeaderboard}
            />
            <MenuButton
              icon={<BookOpen size={16} />}
              label={zh ? '游戏说明' : 'HOW TO PLAY'}
              onClick={() => setShowHelp(true)}
            />
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            <p className="mb-1 text-center text-xs font-medium uppercase tracking-widest text-slate-500">
              {zh ? '选择难度' : 'Select Difficulty'}
            </p>
            <DifficultyButton
              label={zh ? '简单 — 20天' : 'EASY — 20 DAYS'}
              desc={zh ? '资源丰富，温度下降缓慢' : 'Abundant resources, gentle cold'}
              color="emerald"
              onClick={() => onNewGame('easy')}
            />
            <DifficultyButton
              label={zh ? '普通 — 30天' : 'NORMAL — 30 DAYS'}
              desc={zh ? '标准挑战' : 'Standard challenge'}
              color="amber"
              onClick={() => onNewGame('normal')}
            />
            <DifficultyButton
              label={zh ? '困难 — 45天' : 'HARD — 45 DAYS'}
              desc={zh ? '严酷环境，事件频发' : 'Harsh conditions, frequent events'}
              color="red"
              onClick={() => onNewGame('hard')}
            />
            <button
              onClick={() => setShowDifficulty(false)}
              className="mt-1 flex items-center justify-center gap-1 text-xs text-slate-600 transition hover:text-slate-400"
            >
              <ChevronLeft size={12} />
              {zh ? '返回' : 'Back'}
            </button>
          </div>
        )}
      </div>

      {/* How to Play Modal */}
      {showHelp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="frostpunk-panel mx-4 max-h-[80vh] w-full max-w-lg overflow-y-auto p-6">
            <h2 className="mb-4 text-lg font-bold tracking-wide text-slate-200">
              {zh ? '游戏说明' : 'HOW TO PLAY'}
            </h2>
            <div className="space-y-3 text-sm leading-relaxed text-slate-400">
              {zh ? (
                <>
                  <p>你是一个末日定居点的领袖。蒸汽核心是城市的心脏——保护它、供给煤炭、在它周围建设。</p>
                  <p className="font-medium text-slate-300">核心机制：</p>
                  <ul className="ml-4 list-disc space-y-1 text-slate-400/90">
                    <li>每一天（回合）温度会持续下降</li>
                    <li>建造建筑来生产资源和庇护人口</li>
                    <li>分配工人和工程师到建筑中</li>
                    <li>保持食物供给避免饥荒</li>
                    <li>保持煤炭供给维持蒸汽核心运转</li>
                    <li>管理希望值和不满度</li>
                  </ul>
                  <p><span className="font-medium text-emerald-400/80">胜利：</span>存活到目标天数</p>
                  <p><span className="font-medium text-red-400/80">失败：</span>所有人死亡、希望归零、或不满度达到100</p>
                  <p className="font-medium text-slate-300">操作：</p>
                  <p className="text-slate-400/90">从右侧面板选择建筑 → 点击网格放置 → 点击已有建筑分配人员 → 按 Enter 或点击"结束今天"推进回合</p>
                </>
              ) : (
                <>
                  <p>You lead a post-apocalyptic settlement. The Generator is your city&apos;s heart — protect it, fuel it, and build around it.</p>
                  <p className="font-medium text-slate-300">Core Mechanics:</p>
                  <ul className="ml-4 list-disc space-y-1 text-slate-400/90">
                    <li>Each day (turn), the temperature drops further</li>
                    <li>Build structures to produce resources and shelter people</li>
                    <li>Assign workers and engineers to buildings</li>
                    <li>Keep food supplied to avoid starvation</li>
                    <li>Keep coal flowing to the Generator for heat</li>
                    <li>Manage Hope and Discontent levels</li>
                  </ul>
                  <p><span className="font-medium text-emerald-400/80">Victory:</span> Survive to the target day count</p>
                  <p><span className="font-medium text-red-400/80">Defeat:</span> Everyone dies, Hope hits 0, or Discontent hits 100</p>
                  <p className="font-medium text-slate-300">Controls:</p>
                  <p className="text-slate-400/90">Select a building from the right panel → Click the grid to place → Click placed buildings to assign staff → Press Enter or &quot;End Day&quot; to advance</p>
                </>
              )}
            </div>
            <button
              onClick={() => setShowHelp(false)}
              className="mt-5 w-full rounded-lg bg-slate-700/50 py-2 text-sm text-slate-300 ring-1 ring-slate-600/50 transition hover:bg-slate-600/50"
            >
              {zh ? '知道了' : 'Got it'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function MenuButton({
  icon,
  label,
  primary = false,
  onClick,
}: {
  icon?: React.ReactNode;
  label: string;
  primary?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center justify-center gap-2.5 rounded-lg px-4 py-3 text-sm font-medium tracking-wider transition-all ${
        primary
          ? 'bg-[#1e3a5f] text-blue-200 shadow-lg shadow-blue-900/20 ring-1 ring-blue-400/20 hover:bg-[#254a75] hover:ring-blue-400/30'
          : 'bg-slate-800/40 text-slate-400 ring-1 ring-slate-700/50 hover:bg-slate-700/40 hover:text-slate-300'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function DifficultyButton({
  label,
  desc,
  color,
  onClick,
}: {
  label: string;
  desc: string;
  color: 'emerald' | 'amber' | 'red';
  onClick: () => void;
}) {
  const styles = {
    emerald: 'ring-emerald-500/20 hover:ring-emerald-400/30 hover:bg-emerald-900/15',
    amber: 'ring-amber-500/20 hover:ring-amber-400/30 hover:bg-amber-900/15',
    red: 'ring-red-500/20 hover:ring-red-400/30 hover:bg-red-900/15',
  };
  const textColor = {
    emerald: 'text-emerald-300/80',
    amber: 'text-amber-300/80',
    red: 'text-red-300/80',
  };

  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-0.5 rounded-lg bg-slate-800/30 px-4 py-3 ring-1 transition-all ${styles[color]}`}
    >
      <span className={`text-sm font-medium tracking-wider ${textColor[color]}`}>{label}</span>
      <span className="text-[10px] text-slate-500">{desc}</span>
    </button>
  );
}
