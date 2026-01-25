import { cn } from '@/lib/utils';

// =====================================================
// VU METER
// Visual audio level indicator
// =====================================================

interface VUMeterProps {
  level: number; // 0-100
  variant?: 'horizontal' | 'vertical' | 'circular';
  showLabel?: boolean;
  className?: string;
}

export default function VUMeter({
  level,
  variant = 'horizontal',
  showLabel = false,
  className,
}: VUMeterProps) {
  const normalizedLevel = Math.min(100, Math.max(0, level));

  if (variant === 'circular') {
    return <CircularMeter level={normalizedLevel} className={className} />;
  }

  if (variant === 'vertical') {
    return <VerticalMeter level={normalizedLevel} showLabel={showLabel} className={className} />;
  }

  return <HorizontalMeter level={normalizedLevel} showLabel={showLabel} className={className} />;
}

// =====================================================
// HORIZONTAL METER
// =====================================================

function HorizontalMeter({
  level,
  showLabel,
  className,
}: {
  level: number;
  showLabel: boolean;
  className?: string;
}) {
  const bars = 20;
  const activeBars = Math.round((level / 100) * bars);

  return (
    <div className={cn('space-y-2', className)}>
      {showLabel && (
        <div className="flex justify-between text-xs text-white/60">
          <span>-∞</span>
          <span>0dB</span>
        </div>
      )}

      <div className="flex gap-1 h-8">
        {Array.from({ length: bars }).map((_, index) => {
          const isActive = index < activeBars;
          const intensity = index / bars;

          return (
            <div
              key={index}
              className={cn(
                'flex-1 rounded-sm transition-all duration-75',
                isActive ? getBarColor(intensity) : 'bg-white/10'
              )}
            />
          );
        })}
      </div>

      {showLabel && (
        <div className="text-center">
          <span className="text-lg font-mono text-white">
            {level > 0 ? `-${Math.round(40 - (level / 100) * 40)}` : '-∞'} dB
          </span>
        </div>
      )}
    </div>
  );
}

// =====================================================
// VERTICAL METER
// =====================================================

function VerticalMeter({
  level,
  showLabel,
  className,
}: {
  level: number;
  showLabel: boolean;
  className?: string;
}) {
  const bars = 15;
  const activeBars = Math.round((level / 100) * bars);

  return (
    <div className={cn('flex flex-col items-center gap-2', className)}>
      <div className="flex flex-col-reverse gap-1 h-40 w-8">
        {Array.from({ length: bars }).map((_, index) => {
          const isActive = index < activeBars;
          const intensity = index / bars;

          return (
            <div
              key={index}
              className={cn(
                'w-full h-2 rounded-sm transition-all duration-75',
                isActive ? getBarColor(intensity) : 'bg-white/10'
              )}
            />
          );
        })}
      </div>

      {showLabel && (
        <span className="text-sm font-mono text-white/80">
          {Math.round(level)}%
        </span>
      )}
    </div>
  );
}

// =====================================================
// CIRCULAR METER
// =====================================================

function CircularMeter({
  level,
  className,
}: {
  level: number;
  className?: string;
}) {
  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (level / 100) * circumference;

  return (
    <div className={cn('relative inline-flex items-center justify-center', className)}>
      <svg
        width="160"
        height="160"
        viewBox="0 0 160 160"
        className="transform -rotate-90"
      >
        {/* Background circle */}
        <circle
          cx="80"
          cy="80"
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.1)"
          strokeWidth="12"
        />

        {/* Progress circle */}
        <circle
          cx="80"
          cy="80"
          r={radius}
          fill="none"
          stroke={getCircularColor(level)}
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className="transition-all duration-100"
        />
      </svg>

      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold text-white">
          {Math.round(level)}
        </span>
        <span className="text-sm text-white/60">%</span>
      </div>

      {/* Glow effect when high */}
      {level > 80 && (
        <div
          className="absolute inset-0 rounded-full animate-pulse"
          style={{
            background: `radial-gradient(circle, ${getCircularColor(level)}20 0%, transparent 70%)`,
          }}
        />
      )}
    </div>
  );
}

// =====================================================
// SIMPLE BAR METER (for inline use)
// =====================================================

export function SimpleMeter({
  level,
  className,
}: {
  level: number;
  className?: string;
}) {
  return (
    <div className={cn('h-2 bg-white/10 rounded-full overflow-hidden', className)}>
      <div
        className={cn(
          'h-full transition-all duration-100 rounded-full',
          level > 80 ? 'bg-red-500' :
          level > 60 ? 'bg-yellow-500' :
          level > 30 ? 'bg-green-500' :
          'bg-green-400'
        )}
        style={{ width: `${level}%` }}
      />
    </div>
  );
}

// =====================================================
// HELPERS
// =====================================================

function getBarColor(intensity: number): string {
  if (intensity > 0.85) return 'bg-red-500';
  if (intensity > 0.7) return 'bg-orange-500';
  if (intensity > 0.5) return 'bg-yellow-500';
  return 'bg-green-500';
}

function getCircularColor(level: number): string {
  if (level > 85) return '#ef4444'; // red
  if (level > 70) return '#f97316'; // orange
  if (level > 50) return '#eab308'; // yellow
  return '#22c55e'; // green
}
