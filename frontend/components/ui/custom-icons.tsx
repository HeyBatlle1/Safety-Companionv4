'use client';

import { cn } from '@/lib/utils';

interface IconProps {
  size?: number;
  className?: string;
  weight?: 'regular' | 'fill';
}

// ════════════════════════════════════════════════════════════════════════════════
// HARDHAT HOME - Hardhat silhouette with house integrated
// ════════════════════════════════════════════════════════════════════════════════
export function HardhatHomeIcon({ size = 24, className, weight = 'regular' }: IconProps) {
  const filled = weight === 'fill';
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={cn('transition-all duration-200', className)}
    >
      {/* Hardhat dome */}
      <path
        d="M4 14C4 9.58172 7.58172 6 12 6C16.4183 6 20 9.58172 20 14"
        stroke="currentColor"
        strokeWidth={filled ? 0 : 2}
        strokeLinecap="round"
        fill={filled ? 'currentColor' : 'none'}
      />
      {/* Hardhat brim */}
      <path
        d="M2 14H22V16C22 16.5523 21.5523 17 21 17H3C2.44772 17 2 16.5523 2 16V14Z"
        stroke="currentColor"
        strokeWidth={filled ? 0 : 2}
        fill={filled ? 'currentColor' : 'none'}
      />
      {/* House inside hardhat */}
      <path
        d="M12 9L8 12V15H10V13H14V15H16V12L12 9Z"
        stroke={filled ? 'var(--background)' : 'currentColor'}
        strokeWidth={filled ? 0 : 1.5}
        strokeLinejoin="round"
        fill={filled ? 'var(--background)' : 'none'}
      />
      {/* Safety stripe */}
      <path
        d="M6 11L8 9M10 11L12 9M14 11L16 9M18 11L19 10"
        stroke={filled ? 'var(--background)' : 'currentColor'}
        strokeWidth={0.75}
        strokeLinecap="round"
        opacity={0.4}
      />
    </svg>
  );
}

// ════════════════════════════════════════════════════════════════════════════════
// HAZARD CLIPBOARD - Clipboard with caution triangle
// ════════════════════════════════════════════════════════════════════════════════
export function HazardClipboardIcon({ size = 24, className, weight = 'regular' }: IconProps) {
  const filled = weight === 'fill';
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={cn('transition-all duration-200', className)}
    >
      {/* Clipboard body */}
      <path
        d="M8 4H6C4.89543 4 4 4.89543 4 6V20C4 21.1046 4.89543 22 6 22H18C19.1046 22 20 21.1046 20 20V6C20 4.89543 19.1046 4 18 4H16"
        stroke="currentColor"
        strokeWidth={filled ? 0 : 2}
        fill={filled ? 'currentColor' : 'none'}
      />
      {/* Clipboard clip */}
      <path
        d="M8 4C8 2.89543 8.89543 2 10 2H14C15.1046 2 16 2.89543 16 4V5C16 5.55228 15.5523 6 15 6H9C8.44772 6 8 5.55228 8 5V4Z"
        stroke="currentColor"
        strokeWidth={filled ? 0 : 2}
        fill={filled ? 'currentColor' : 'none'}
      />
      {/* Hazard triangle */}
      <path
        d="M12 9L16 16H8L12 9Z"
        stroke={filled ? 'var(--background)' : 'currentColor'}
        strokeWidth={filled ? 0 : 1.5}
        strokeLinejoin="round"
        fill={filled ? 'var(--warning)' : 'none'}
      />
      {/* Exclamation mark */}
      <path
        d="M12 11.5V13.5M12 15V15.01"
        stroke={filled ? 'var(--background)' : 'currentColor'}
        strokeWidth={1.5}
        strokeLinecap="round"
      />
    </svg>
  );
}

// ════════════════════════════════════════════════════════════════════════════════
// AI VISION EYE - Eye with scanning beams
// ════════════════════════════════════════════════════════════════════════════════
export function AIVisionIcon({ size = 24, className, weight = 'regular' }: IconProps) {
  const filled = weight === 'fill';
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={cn('transition-all duration-200', className)}
    >
      {/* Eye outline */}
      <path
        d="M2 12C2 12 5 5 12 5C19 5 22 12 22 12C22 12 19 19 12 19C5 19 2 12 2 12Z"
        stroke="currentColor"
        strokeWidth={filled ? 0 : 2}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill={filled ? 'currentColor' : 'none'}
      />
      {/* Iris */}
      <circle
        cx="12"
        cy="12"
        r="3"
        stroke={filled ? 'var(--background)' : 'currentColor'}
        strokeWidth={filled ? 0 : 2}
        fill={filled ? 'var(--primary)' : 'none'}
      />
      {/* Pupil */}
      <circle
        cx="12"
        cy="12"
        r="1"
        fill={filled ? 'var(--background)' : 'currentColor'}
      />
      {/* Scan lines */}
      <path
        d="M12 2V4M12 20V22M4 12H2M22 12H20"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        opacity={0.6}
      />
      {/* Corner brackets */}
      <path
        d="M5 7V5H7M17 5H19V7M19 17V19H17M7 19H5V17"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={0.6}
      />
    </svg>
  );
}

// ════════════════════════════════════════════════════════════════════════════════
// EMERGENCY BEACON - Pulsing siren/beacon
// ════════════════════════════════════════════════════════════════════════════════
export function EmergencyBeaconIcon({ size = 24, className, weight = 'regular' }: IconProps) {
  const filled = weight === 'fill';
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={cn('transition-all duration-200', className)}
    >
      {/* Beacon base */}
      <path
        d="M7 22H17V20C17 19.4477 16.5523 19 16 19H8C7.44772 19 7 19.4477 7 20V22Z"
        stroke="currentColor"
        strokeWidth={filled ? 0 : 2}
        fill={filled ? 'currentColor' : 'none'}
      />
      {/* Beacon body */}
      <path
        d="M8 19L9 12H15L16 19"
        stroke="currentColor"
        strokeWidth={filled ? 0 : 2}
        fill={filled ? 'currentColor' : 'none'}
      />
      {/* Beacon light dome */}
      <path
        d="M9 12C9 9 10.5 7 12 7C13.5 7 15 9 15 12H9Z"
        stroke="currentColor"
        strokeWidth={filled ? 0 : 2}
        fill={filled ? 'var(--destructive)' : 'none'}
      />
      {/* Light rays */}
      <path
        d="M12 4V2M7 5L5.5 3.5M17 5L18.5 3.5M4 10H2M22 10H20"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        opacity={filled ? 1 : 0.6}
      />
      {/* Pulse rings */}
      <path
        d="M6 8C4.5 9.5 4.5 12 6 13.5M18 8C19.5 9.5 19.5 12 18 13.5"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        opacity={0.4}
      />
    </svg>
  );
}

// ════════════════════════════════════════════════════════════════════════════════
// TREND DOCUMENT - Document with upward trend line
// ════════════════════════════════════════════════════════════════════════════════
export function TrendDocumentIcon({ size = 24, className, weight = 'regular' }: IconProps) {
  const filled = weight === 'fill';
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={cn('transition-all duration-200', className)}
    >
      {/* Document body */}
      <path
        d="M14 2H6C4.89543 2 4 2.89543 4 4V20C4 21.1046 4.89543 22 6 22H18C19.1046 22 20 21.1046 20 20V8L14 2Z"
        stroke="currentColor"
        strokeWidth={filled ? 0 : 2}
        strokeLinejoin="round"
        fill={filled ? 'currentColor' : 'none'}
      />
      {/* Folded corner */}
      <path
        d="M14 2V8H20"
        stroke={filled ? 'var(--background)' : 'currentColor'}
        strokeWidth={filled ? 0 : 2}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill={filled ? 'var(--background)' : 'none'}
      />
      {/* Trend line chart */}
      <path
        d="M8 17L10 14L13 16L16 11"
        stroke={filled ? 'var(--background)' : 'currentColor'}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Arrow head */}
      <path
        d="M14 11H16V13"
        stroke={filled ? 'var(--background)' : 'currentColor'}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ════════════════════════════════════════════════════════════════════════════════
// WORKER PROFILE - Worker silhouette with hardhat
// ════════════════════════════════════════════════════════════════════════════════
export function WorkerProfileIcon({ size = 24, className, weight = 'regular' }: IconProps) {
  const filled = weight === 'fill';
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={cn('transition-all duration-200', className)}
    >
      {/* Hardhat */}
      <path
        d="M7 9C7 6.23858 9.23858 4 12 4C14.7614 4 17 6.23858 17 9"
        stroke="currentColor"
        strokeWidth={filled ? 0 : 2}
        strokeLinecap="round"
        fill={filled ? 'currentColor' : 'none'}
      />
      {/* Hardhat brim */}
      <path
        d="M5 9H19V10.5C19 11.0523 18.5523 11.5 18 11.5H6C5.44772 11.5 5 11.0523 5 10.5V9Z"
        stroke="currentColor"
        strokeWidth={filled ? 0 : 2}
        fill={filled ? 'currentColor' : 'none'}
      />
      {/* Face */}
      <circle
        cx="12"
        cy="14"
        r="2.5"
        stroke="currentColor"
        strokeWidth={filled ? 0 : 2}
        fill={filled ? 'currentColor' : 'none'}
      />
      {/* Body/shoulders */}
      <path
        d="M6 22C6 19.2386 8.68629 17 12 17C15.3137 17 18 19.2386 18 22"
        stroke="currentColor"
        strokeWidth={filled ? 0 : 2}
        strokeLinecap="round"
        fill={filled ? 'currentColor' : 'none'}
      />
      {/* Safety vest stripes */}
      <path
        d="M9 19L10 22M15 19L14 22"
        stroke={filled ? 'var(--warning)' : 'currentColor'}
        strokeWidth={1.5}
        strokeLinecap="round"
        opacity={filled ? 1 : 0.5}
      />
    </svg>
  );
}

// ════════════════════════════════════════════════════════════════════════════════
// CONSTRUCTION CRANE - For open jobs
// ════════════════════════════════════════════════════════════════════════════════
export function ConstructionCraneIcon({ size = 24, className, weight = 'regular' }: IconProps) {
  const filled = weight === 'fill';
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={cn('transition-all duration-200', className)}
    >
      {/* Crane tower */}
      <path
        d="M8 22V6L12 2L16 6V22"
        stroke="currentColor"
        strokeWidth={filled ? 0 : 2}
        strokeLinejoin="round"
        fill={filled ? 'currentColor' : 'none'}
      />
      {/* Crane arm */}
      <path
        d="M4 6H20"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
      />
      {/* Crane cable */}
      <path
        d="M18 6V12"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
      />
      {/* Hook */}
      <path
        d="M16 12H20C20 14 18 15 18 15C18 15 16 14 16 12Z"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinejoin="round"
        fill={filled ? 'var(--warning)' : 'none'}
      />
      {/* Base */}
      <path
        d="M5 22H19"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
      />
      {/* Cross bracing */}
      <path
        d="M8 10L12 14L16 10M8 14L12 10L16 14"
        stroke={filled ? 'var(--background)' : 'currentColor'}
        strokeWidth={1}
        opacity={0.5}
      />
    </svg>
  );
}

// ════════════════════════════════════════════════════════════════════════════════
// DAILY CHECKLIST - For JHAs today
// ════════════════════════════════════════════════════════════════════════════════
export function DailyChecklistIcon({ size = 24, className, weight = 'regular' }: IconProps) {
  const filled = weight === 'fill';
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={cn('transition-all duration-200', className)}
    >
      {/* Calendar base */}
      <rect
        x="3"
        y="4"
        width="18"
        height="18"
        rx="2"
        stroke="currentColor"
        strokeWidth={filled ? 0 : 2}
        fill={filled ? 'currentColor' : 'none'}
      />
      {/* Calendar hangers */}
      <path
        d="M8 2V6M16 2V6"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
      />
      {/* Header line */}
      <path
        d="M3 10H21"
        stroke={filled ? 'var(--background)' : 'currentColor'}
        strokeWidth={filled ? 0 : 2}
      />
      {/* Check marks */}
      <path
        d="M7 14L9 16L12 12"
        stroke={filled ? 'var(--success)' : 'currentColor'}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M7 18L9 20L12 16"
        stroke={filled ? 'var(--success)' : 'currentColor'}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={0.6}
      />
      {/* Lines */}
      <path
        d="M14 14H18M14 18H17"
        stroke={filled ? 'var(--background)' : 'currentColor'}
        strokeWidth={1.5}
        strokeLinecap="round"
        opacity={0.6}
      />
    </svg>
  );
}

// ════════════════════════════════════════════════════════════════════════════════
// SPEED SQUARE CURSOR - Construction measuring tool
// ════════════════════════════════════════════════════════════════════════════════
export const speedSquareCursor = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none'%3E%3Cpath d='M2 2L22 2L2 22L2 2Z' fill='%2338BDF8' fill-opacity='0.9' stroke='%23ffffff' stroke-width='1.5'/%3E%3Cpath d='M4 4L4 18L18 4' stroke='%23ffffff' stroke-width='0.5' opacity='0.6'/%3E%3Cpath d='M6 6L6 14L14 6' stroke='%23ffffff' stroke-width='0.5' opacity='0.4'/%3E%3Ccircle cx='2' cy='2' r='1.5' fill='%23ffffff'/%3E%3C/svg%3E") 2 2, auto`;

// Export for CSS usage
export const customCursorCSS = `
  cursor: ${speedSquareCursor};
`;
