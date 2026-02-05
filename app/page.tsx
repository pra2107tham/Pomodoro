"use client";

import { useState, useEffect, useCallback, useRef } from "react";

const POMODORO_DURATION = 25 * 60;

interface SessionData {
  date: string;
  sessions: number;
  totalMinutes: number;
}

function HalftoneCircle({ isActive }: { isActive: boolean }) {
  const dots: React.ReactElement[] = [];
  const size = 300;
  const center = size / 2;
  const maxRadius = 140;

  // Create a grid-based halftone pattern
  const gridSize = 6;

  for (let x = 0; x < size; x += gridSize) {
    for (let y = 0; y < size; y += gridSize) {
      const dx = x - center;
      const dy = y - center;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance > maxRadius + 20) continue;

      // Calculate dot size and opacity based on distance from center
      const normalizedDistance = distance / maxRadius;

      // Dots get smaller toward the edge
      let dotRadius = Math.max(0.5, 3.5 - normalizedDistance * 3);

      // Opacity fades toward the edge
      let opacity = 1;
      if (normalizedDistance > 0.6) {
        opacity = Math.max(0, 1 - (normalizedDistance - 0.6) / 0.5);
      }

      // Add some randomness for organic feel
      const jitterX = (Math.random() - 0.5) * 1;
      const jitterY = (Math.random() - 0.5) * 1;

      if (opacity > 0.05 && dotRadius > 0.3) {
        dots.push(
          <circle
            key={`${x}-${y}`}
            cx={x + jitterX}
            cy={y + jitterY}
            r={dotRadius}
            style={{ opacity }}
          />
        );
      }
    }
  }

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      className="w-full h-full"
      style={{ maxWidth: '280px', maxHeight: '280px' }}
    >
      <g className={`transition-colors duration-500 ${isActive ? 'fill-orange-500' : 'fill-neutral-600'}`}>
        {dots}
      </g>
    </svg>
  );
}

// Memoized halftone to prevent re-renders
function StaticHalftoneCircle({ isActive }: { isActive: boolean }) {
  const [dots, setDots] = useState<{ x: number; y: number; r: number; o: number }[]>([]);

  useEffect(() => {
    const newDots: { x: number; y: number; r: number; o: number }[] = [];
    const size = 300;
    const center = size / 2;
    const maxRadius = 130;
    const gridSize = 5.5;

    for (let x = 0; x < size; x += gridSize) {
      for (let y = 0; y < size; y += gridSize) {
        const dx = x - center;
        const dy = y - center;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance > maxRadius + 25) continue;

        const normalizedDistance = distance / maxRadius;

        let dotRadius = Math.max(0.3, 3.2 - normalizedDistance * 2.8);

        let opacity = 1;
        if (normalizedDistance > 0.5) {
          opacity = Math.max(0, 1 - (normalizedDistance - 0.5) / 0.6);
        }

        if (opacity > 0.03 && dotRadius > 0.2) {
          newDots.push({ x, y, r: dotRadius, o: opacity });
        }
      }
    }
    setDots(newDots);
  }, []);

  return (
    <svg
      viewBox="0 0 300 300"
      className="w-full h-full"
    >
      <g className={`transition-colors duration-700 ${isActive ? 'fill-orange-500' : 'fill-neutral-700'}`}>
        {dots.map((dot, i) => (
          <circle
            key={i}
            cx={dot.x}
            cy={dot.y}
            r={dot.r}
            style={{ opacity: dot.o }}
          />
        ))}
      </g>
    </svg>
  );
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

function getTodayKey(): string {
  return new Date().toISOString().split("T")[0];
}

function getSessionData(): SessionData {
  if (typeof window === "undefined") {
    return { date: getTodayKey(), sessions: 0, totalMinutes: 0 };
  }
  const stored = localStorage.getItem("pomodoro-sessions");
  if (stored) {
    const data = JSON.parse(stored) as SessionData;
    if (data.date === getTodayKey()) {
      return data;
    }
  }
  return { date: getTodayKey(), sessions: 0, totalMinutes: 0 };
}

function saveSessionData(data: SessionData): void {
  if (typeof window !== "undefined") {
    localStorage.setItem("pomodoro-sessions", JSON.stringify(data));
  }
}

export default function Home() {
  const [timeLeft, setTimeLeft] = useState(POMODORO_DURATION);
  const [isRunning, setIsRunning] = useState(false);
  const [sessions, setSessions] = useState(0);
  const [totalMinutes, setTotalMinutes] = useState(0);
  const [showMenu, setShowMenu] = useState(false);
  const [mounted, setMounted] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setMounted(true);
    const data = getSessionData();
    setSessions(data.sessions);
    setTotalMinutes(data.totalMinutes);
  }, []);

  useEffect(() => {
    if (isRunning && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            setIsRunning(false);
            const sessionData = getSessionData();
            const newSessions = sessionData.sessions + 1;
            const newMinutes = sessionData.totalMinutes + 25;
            const newData = {
              date: getTodayKey(),
              sessions: newSessions,
              totalMinutes: newMinutes,
            };
            saveSessionData(newData);
            setSessions(newSessions);
            setTotalMinutes(newMinutes);

            if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
              new Notification("Pomodoro Complete!", { body: "Great job! Take a short break." });
            }
            return POMODORO_DURATION;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRunning, timeLeft]);

  const handleStart = useCallback(() => {
    setIsRunning(true);
    if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  const handleStop = useCallback(() => {
    setIsRunning(false);
    setTimeLeft(POMODORO_DURATION);
  }, []);

  const handleReset = useCallback(() => {
    const newData = { date: getTodayKey(), sessions: 0, totalMinutes: 0 };
    saveSessionData(newData);
    setSessions(0);
    setTotalMinutes(0);
    setShowMenu(false);
  }, []);

  if (!mounted) {
    return (
      <main className="h-screen w-screen flex items-center justify-center bg-[#e8e8e8]">
        <div className="w-[260px] h-[260px]" />
      </main>
    );
  }

  return (
    <>
      <main className="fixed inset-0 flex flex-col bg-[#e8e8e8] select-none overflow-hidden">
        {/* Header */}
        <header className="pt-12 pb-4 px-6 text-center relative">
          <h1 className="text-[22px] font-semibold tracking-[0.15em] text-neutral-800 uppercase">
            {isRunning ? "Now" : "Today"}
          </h1>
          <p className="text-[14px] text-neutral-400 mt-1 tracking-wide">
            {isRunning
              ? "session in progress"
              : `${sessions} session${sessions !== 1 ? "s" : ""} \u2022 ${totalMinutes} min`}
          </p>

          {!isRunning && (
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="absolute right-6 top-12 p-2 text-neutral-300 hover:text-neutral-500 transition-colors"
              aria-label="Menu"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                <circle cx="10" cy="4" r="1.5" />
                <circle cx="10" cy="10" r="1.5" />
                <circle cx="10" cy="16" r="1.5" />
              </svg>
            </button>
          )}

          {showMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
              <div className="absolute right-6 top-20 bg-white rounded-xl shadow-lg py-2 min-w-[180px] z-20">
                <button
                  onClick={handleReset}
                  className="w-full px-4 py-3 text-left text-sm text-neutral-600 hover:bg-neutral-50 transition-colors"
                >
                  Reset today&apos;s sessions
                </button>
              </div>
            </>
          )}
        </header>

        {/* Timer Circle - Centered */}
        <div className="flex-1 flex flex-col items-center justify-center px-6">
          <div className="relative w-[260px] h-[260px] flex items-center justify-center">
            <StaticHalftoneCircle isActive={isRunning} />
            <div className="absolute inset-0 flex items-center justify-center">
              <span
                className={`font-mono text-[42px] font-normal tracking-tight transition-colors duration-700 ${
                  isRunning ? "text-white" : "text-neutral-800"
                }`}
                style={{ fontVariantNumeric: 'tabular-nums' }}
              >
                {formatTime(timeLeft)}
              </span>
            </div>
          </div>

          {/* Status Text */}
          <p className="text-neutral-400 text-[15px] mt-8 tracking-wide">
            {isRunning ? "focus on one thing" : "ready when you are"}
          </p>
        </div>

        {/* Action Button */}
        <div className="px-6 pb-10">
          <button
            onClick={isRunning ? handleStop : handleStart}
            className={`w-full py-4 rounded-2xl text-[15px] font-medium tracking-[0.2em] uppercase transition-all duration-300 ${
              isRunning
                ? "bg-transparent border border-neutral-300 text-neutral-600"
                : "bg-neutral-800 text-white"
            }`}
          >
            {isRunning ? "Stop" : "Start"}
          </button>
        </div>
      </main>
    </>
  );
}
