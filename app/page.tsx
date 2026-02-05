"use client";

import { useState, useEffect, useCallback, useRef } from "react";

const POMODORO_DURATION = 25 * 60;

interface SessionData {
  date: string;
  sessions: number;
  totalMinutes: number;
}

function HalftoneCircle({ isActive }: { isActive: boolean }) {
  const [dots, setDots] = useState<{ x: number; y: number; r: number; o: number }[]>([]);

  useEffect(() => {
    const newDots: { x: number; y: number; r: number; o: number }[] = [];
    const size = 400;
    const center = size / 2;
    const coreRadius = 90;
    const maxRadius = 185;
    const gridSize = 6.5;

    for (let x = 0; x < size; x += gridSize) {
      for (let y = 0; y < size; y += gridSize) {
        const dx = x - center;
        const dy = y - center;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance > maxRadius) continue;

        let dotRadius;
        if (distance < coreRadius) {
          dotRadius = 4.5;
        } else {
          const edgeProgress = (distance - coreRadius) / (maxRadius - coreRadius);
          dotRadius = Math.max(1.2, 4.5 - edgeProgress * 4);
        }

        let opacity = 1;
        if (distance > coreRadius) {
          const fadeStart = coreRadius;
          const fadeEnd = maxRadius;
          opacity = Math.max(0.06, 1 - ((distance - fadeStart) / (fadeEnd - fadeStart)) * 1.15);
        }

        if (opacity > 0.04) {
          newDots.push({ x, y, r: dotRadius, o: opacity });
        }
      }
    }
    setDots(newDots);
  }, []);

  return (
    <svg viewBox="0 0 400 400" className="w-full h-full">
      <g
        className="transition-colors duration-500"
        style={{ fill: isActive ? '#f97316' : '#2d2d2d' }}
      >
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
      <main className="h-[100dvh] w-screen flex items-center justify-center bg-[#e8e8e8]">
        <div className="w-[70vw] h-[70vw] max-w-[50dvh] max-h-[50dvh]" />
      </main>
    );
  }

  return (
    <main
      className="fixed inset-0 flex flex-col bg-[#e8e8e8] select-none overflow-hidden"
      style={{ height: '100dvh' }}
    >
      {/* Top Section - 15% */}
      <header
        className="flex-shrink-0 flex flex-col items-center justify-end px-6 pb-2 relative"
        style={{ height: '15dvh' }}
      >
        <h1
          className="font-semibold tracking-[0.2em] text-neutral-800 uppercase"
          style={{ fontSize: 'clamp(1.5rem, 4dvh, 2rem)' }}
        >
          {isRunning ? "Now" : "Today"}
        </h1>
        <p
          className="text-neutral-400 mt-1 tracking-wide"
          style={{ fontSize: 'clamp(0.9rem, 2dvh, 1.1rem)' }}
        >
          {isRunning
            ? "session in progress"
            : `${sessions} session${sessions !== 1 ? "s" : ""} \u2022 ${totalMinutes} min`}
        </p>

        {!isRunning && (
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="absolute right-6 bottom-2 p-3 text-neutral-400 hover:text-neutral-600 transition-colors"
            aria-label="Menu"
          >
            <svg
              viewBox="0 0 24 24"
              fill="currentColor"
              style={{ width: 'clamp(20px, 3dvh, 28px)', height: 'clamp(20px, 3dvh, 28px)' }}
            >
              <circle cx="12" cy="5" r="2" />
              <circle cx="12" cy="12" r="2" />
              <circle cx="12" cy="19" r="2" />
            </svg>
          </button>
        )}

        {showMenu && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
            <div className="absolute right-6 bottom-[-60px] bg-white rounded-xl shadow-lg py-2 min-w-[200px] z-20">
              <button
                onClick={handleReset}
                className="w-full px-5 py-3 text-left text-neutral-600 hover:bg-neutral-50 transition-colors"
                style={{ fontSize: 'clamp(0.9rem, 2dvh, 1.1rem)' }}
              >
                Reset today&apos;s sessions
              </button>
            </div>
          </>
        )}
      </header>

      {/* Middle Section - 55% (Timer Circle + Status) */}
      <div
        className="flex-shrink-0 flex flex-col items-center justify-center px-6"
        style={{ height: '55dvh' }}
      >
        <div
          className="relative flex items-center justify-center"
          style={{
            width: 'min(80vw, 45dvh)',
            height: 'min(80vw, 45dvh)',
          }}
        >
          <HalftoneCircle isActive={isRunning} />
          <div className="absolute inset-0 flex items-center justify-center">
            <span
              className={`font-mono font-light tracking-tight transition-colors duration-500 ${
                isRunning ? "text-white" : "text-neutral-800"
              }`}
              style={{
                fontSize: 'clamp(2.5rem, 10dvh, 5rem)',
                fontVariantNumeric: 'tabular-nums'
              }}
            >
              {formatTime(timeLeft)}
            </span>
          </div>
        </div>

        {/* Status Text */}
        <p
          className="text-neutral-400 tracking-wide mt-6"
          style={{ fontSize: 'clamp(1rem, 2.5dvh, 1.25rem)' }}
        >
          {isRunning ? "focus on one thing" : "ready when you are"}
        </p>
      </div>

      {/* Bottom Section - 30% (Button) */}
      <div
        className="flex-shrink-0 flex flex-col items-center justify-end px-6"
        style={{ height: '30dvh', paddingBottom: 'max(2rem, 5dvh)' }}
      >
        <button
          onClick={isRunning ? handleStop : handleStart}
          className={`w-full max-w-lg rounded-2xl font-semibold tracking-[0.2em] uppercase transition-all duration-300 ${
            isRunning
              ? "bg-transparent border-2 border-neutral-400 text-neutral-700"
              : "bg-neutral-900 text-white"
          }`}
          style={{
            padding: 'clamp(1rem, 2.5dvh, 1.5rem) 0',
            fontSize: 'clamp(1rem, 2.5dvh, 1.25rem)'
          }}
        >
          {isRunning ? "Stop" : "Start"}
        </button>
      </div>
    </main>
  );
}
