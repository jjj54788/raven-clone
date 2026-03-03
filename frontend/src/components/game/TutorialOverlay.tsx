'use client';

import { useState } from 'react';
import {
  Snowflake,
  Flame,
  Hammer,
  Users,
  SkipForward,
  Heart,
  ChevronRight,
  ChevronLeft,
  X,
} from 'lucide-react';

interface TutorialOverlayProps {
  locale: string;
  onClose: () => void;
}

const STEPS_EN = [
  {
    icon: Snowflake, color: 'text-blue-300/80', bg: 'bg-blue-500/10 ring-1 ring-blue-500/20',
    title: 'Welcome to Frostland',
    body: 'You lead survivors in a frozen wasteland. The Generator is the heart of your city — keep it running, build around it, and survive the endless winter.',
  },
  {
    icon: Flame, color: 'text-orange-300/80', bg: 'bg-orange-500/10 ring-1 ring-orange-500/20',
    title: 'Temperature & Heat',
    body: 'Each day the temperature drops. The Generator and some buildings produce heat. People outside heat zones get sick. Build near the Generator!',
  },
  {
    icon: Hammer, color: 'text-[#c8956b]/80', bg: 'bg-[#c8956b]/10 ring-1 ring-[#c8956b]/20',
    title: 'Building & Resources',
    body: 'Select a building from the right panel, then click the grid to place it. Buildings cost resources (wood, steel, coal). Workers are auto-assigned when you build.',
  },
  {
    icon: Users, color: 'text-sky-300/80', bg: 'bg-sky-500/10 ring-1 ring-sky-500/20',
    title: 'Workers & Engineers',
    body: 'Buildings need staff to operate. Click a placed building to adjust staffing. Understaffed buildings produce less. Engineers are needed for specialized structures.',
  },
  {
    icon: SkipForward, color: 'text-emerald-300/80', bg: 'bg-emerald-500/10 ring-1 ring-emerald-500/20',
    title: 'Advancing Days',
    body: 'Press Enter or click "End Day" to advance. Each turn: resources are produced & consumed, temperature drops, and random events may occur.',
  },
  {
    icon: Heart, color: 'text-red-300/80', bg: 'bg-red-500/10 ring-1 ring-red-500/20',
    title: 'Morale & Victory',
    body: 'Keep Hope high and Discontent low. Feed your people, provide shelter and heat. Survive to the target day to win! If hope hits 0 or discontent hits 100 — you lose.',
  },
];

const STEPS_ZH = [
  {
    icon: Snowflake, color: 'text-blue-300/80', bg: 'bg-blue-500/10 ring-1 ring-blue-500/20',
    title: '欢迎来到无尽冬日',
    body: '你带领幸存者在冰封荒原中求生。蒸汽核心是城市的心脏——保持运转，围绕建设，在无尽严寒中存活。',
  },
  {
    icon: Flame, color: 'text-orange-300/80', bg: 'bg-orange-500/10 ring-1 ring-orange-500/20',
    title: '温度与热量',
    body: '每天温度会下降。蒸汽核心和部分建筑产生热量。热量范围外的人会生病。尽量在蒸汽核心附近建设！',
  },
  {
    icon: Hammer, color: 'text-[#c8956b]/80', bg: 'bg-[#c8956b]/10 ring-1 ring-[#c8956b]/20',
    title: '建造与资源',
    body: '从右侧面板选择建筑，点击网格放置。建筑需要消耗资源（木材、钢铁、煤炭）。建造时会自动分配工人。',
  },
  {
    icon: Users, color: 'text-sky-300/80', bg: 'bg-sky-500/10 ring-1 ring-sky-500/20',
    title: '工人与工程师',
    body: '建筑需要人员才能运作。点击已建建筑可调整人员分配。人手不足的建筑产出降低。部分高级建筑需要工程师。',
  },
  {
    icon: SkipForward, color: 'text-emerald-300/80', bg: 'bg-emerald-500/10 ring-1 ring-emerald-500/20',
    title: '推进时间',
    body: '按回车键或点击"结束今天"来推进一天。每回合：资源产出与消耗、温度下降、可能发生随机事件。',
  },
  {
    icon: Heart, color: 'text-red-300/80', bg: 'bg-red-500/10 ring-1 ring-red-500/20',
    title: '士气与胜利',
    body: '保持高希望值、低不满度。给人们食物、住所和温暖。存活到目标天数即可获胜！希望归零或不满度达到100则失败。',
  },
];

export default function TutorialOverlay({ locale, onClose }: TutorialOverlayProps) {
  const [step, setStep] = useState(0);
  const zh = locale === 'zh';
  const steps = zh ? STEPS_ZH : STEPS_EN;
  const current = steps[step];
  const Icon = current.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm">
      <div className="frostpunk-panel relative mx-4 w-full max-w-sm animate-[modal-in_0.25s_ease-out] p-6">
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute right-3 top-3 rounded p-1 text-slate-600 hover:bg-slate-700/40 hover:text-slate-400"
        >
          <X size={13} />
        </button>

        {/* Step dots */}
        <div className="mb-5 flex justify-center gap-1.5">
          {steps.map((_, i) => (
            <div
              key={i}
              className={`h-1 rounded-full transition-all ${
                i === step ? 'w-5 bg-[#c8956b]' : 'w-1.5 bg-slate-700'
              }`}
            />
          ))}
        </div>

        {/* Icon */}
        <div className="mb-4 flex justify-center">
          <div className={`flex h-12 w-12 items-center justify-center rounded-lg ${current.bg}`}>
            <Icon size={24} className={current.color} />
          </div>
        </div>

        {/* Content */}
        <h3 className="mb-2 text-center text-base font-bold tracking-wide text-slate-100">
          {current.title}
        </h3>
        <p className="mb-6 text-center text-sm leading-relaxed text-slate-500">
          {current.body}
        </p>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0}
            className="flex items-center gap-1 rounded-md px-3 py-1.5 text-[11px] text-slate-500 hover:bg-slate-700/30 disabled:invisible"
          >
            <ChevronLeft size={13} />
            {zh ? '上一步' : 'Back'}
          </button>

          <span className="font-mono text-[10px] text-slate-600">
            {step + 1}/{steps.length}
          </span>

          {step < steps.length - 1 ? (
            <button
              onClick={() => setStep((s) => s + 1)}
              className="flex items-center gap-1 rounded-md bg-[#1e3a5f] px-3 py-1.5 text-[11px] text-blue-200 ring-1 ring-blue-400/20 hover:bg-[#254a75]"
            >
              {zh ? '下一步' : 'Next'}
              <ChevronRight size={13} />
            </button>
          ) : (
            <button
              onClick={onClose}
              className="rounded-md bg-[#1e3a5f] px-4 py-1.5 text-[11px] text-blue-200 ring-1 ring-blue-400/20 hover:bg-[#254a75]"
            >
              {zh ? '开始游戏' : 'Start Playing'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
