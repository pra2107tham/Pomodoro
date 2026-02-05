"use client";

import { useState, useEffect, useCallback, useRef } from "react";

const POMODORO_DURATION = 25 * 60; // 25 minutes in seconds

interface SessionData {
  date: string;
  sessions: number;
  totalMinutes: number;
}

function HalftoneCircle({ isActive, progress }: { isActive: boolean; progress: number }) {
  const rings = [];
  const centerX = 200;
  const centerY = 200;
  const maxRadius = 180;
  const minRadius = 60;

  // Create concentric rings of dots
  for (let ring = 0; ring < 20; ring++) {
    const ringRadius = minRadius + (ring / 19) * (maxRadius - minRadius);
    const circumference = 2 * Math.PI * ringRadius;
    const dotSize = Math.max(2, 8 - ring * 0.3);
    const numDots = Math.floor(circumference / (dotSize * 2.5));

    // Calculate opacity based on ring position (center is solid, edges fade)
    const distanceFromCenter = ring / 19;
    const baseOpacity = Math.max(0.1, 1 - distanceFromCenter * 1.2);

    for (let i = 0; i < numDots; i++) {
      const angle = (i / numDots) * 2 * Math.PI - Math.PI / 2;
      const x = centerX + ringRadius * Math.cos(angle);
      const y = centerY + ringRadius * Math.sin(angle);

      rings.push(
        <circle
          key={`${ring}-${i}`}
          cx={x}
          cy={y}
          r={dotSize}
          className={`transition-all duration-500 ${
            isActive ? "fill-orange-500" : "fill-neutral-700"
          }`}
          style={{
            opacity: baseOpacity,
          }}
        />
      );
    }
  }

  return (
    <svg
      viewBox="0 0 400 400"
      className="w-full h-full max-w-[320px] max-h-[320px] md:max-w-[400px] md:max-h-[400px]"
    >
      {rings}
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
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number | null>(null);

  // Load session data on mount
  useEffect(() => {
    const data = getSessionData();
    setSessions(data.sessions);
    setTotalMinutes(data.totalMinutes);
  }, []);

  // Timer effect
  useEffect(() => {
    if (isRunning && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            // Timer completed
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

            // Play notification sound
            if (typeof window !== "undefined" && "Notification" in window) {
              if (Notification.permission === "granted") {
                new Notification("Pomodoro Complete!", {
                  body: "Great job! Take a short break.",
                });
              }
            }

            return POMODORO_DURATION;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isRunning, timeLeft]);

  const handleStart = useCallback(() => {
    setIsRunning(true);
    startTimeRef.current = Date.now();

    // Request notification permission
    if (typeof window !== "undefined" && "Notification" in window) {
      if (Notification.permission === "default") {
        Notification.requestPermission();
      }
    }
  }, []);

  const handleStop = useCallback(() => {
    setIsRunning(false);
    setTimeLeft(POMODORO_DURATION);
    startTimeRef.current = null;
  }, []);

  const handleReset = useCallback(() => {
    const newData = { date: getTodayKey(), sessions: 0, totalMinutes: 0 };
    saveSessionData(newData);
    setSessions(0);
    setTotalMinutes(0);
    setShowMenu(false);
  }, []);

  const progress = 1 - timeLeft / POMODORO_DURATION;

  return (
    <main className="min-h-screen flex flex-col items-center justify-between p-6 md:p-12 select-none">
      {/* Header */}
      <header className="w-full max-w-md flex flex-col items-center relative">
        <div className="flex items-center justify-center w-full relative">
          <div className="text-center">
            <h1 className="text-2xl md:text-3xl font-bold tracking-wide text-neutral-800">
              {isRunning ? "NOW" : "TODAY"}
            </h1>
            <p className="text-sm md:text-base text-neutral-500 mt-1">
              {isRunning
                ? "session in progress"
                : `${sessions} session${sessions !== 1 ? "s" : ""} \u2022 ${totalMinutes} min`}
            </p>
          </div>

          {/* Menu button - only show when not running */}
          {!isRunning && (
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="absolute right-0 top-0 p-2 text-neutral-400 hover:text-neutral-600 transition-colors"
              aria-label="Menu"
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <circle cx="12" cy="6" r="2" />
                <circle cx="12" cy="12" r="2" />
                <circle cx="12" cy="18" r="2" />
              </svg>
            </button>
          )}

          {/* Dropdown menu */}
          {showMenu && (
            <div className="absolute right-0 top-10 bg-white rounded-lg shadow-lg py-2 min-w-[160px] z-10">
              <button
                onClick={handleReset}
                className="w-full px-4 py-2 text-left text-sm text-neutral-700 hover:bg-neutral-100 transition-colors"
              >
                Reset today&apos;s sessions
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Timer Circle */}
      <div className="flex-1 flex items-center justify-center w-full">
        <div className="relative w-[280px] h-[280px] md:w-[400px] md:h-[400px] flex items-center justify-center">
          <HalftoneCircle isActive={isRunning} progress={progress} />
          <div className="absolute inset-0 flex items-center justify-center">
            <span
              className={`timer-font text-4xl md:text-6xl font-light tracking-tight transition-colors duration-500 ${
                isRunning ? "text-white" : "text-neutral-800"
              }`}
            >
              {formatTime(timeLeft)}
            </span>
          </div>
        </div>
      </div>

      {/* Status Text */}
      <p className="text-neutral-500 text-base md:text-lg mb-8">
        {isRunning ? "focus on one thing" : "ready when you are"}
      </p>

      {/* Action Button */}
      <button
        onClick={isRunning ? handleStop : handleStart}
        className={`w-full max-w-md py-4 rounded-xl text-lg font-medium tracking-wide transition-all duration-300 ${
          isRunning
            ? "bg-transparent border-2 border-neutral-300 text-neutral-700 hover:border-neutral-400"
            : "bg-neutral-800 text-white hover:bg-neutral-700"
        }`}
      >
        {isRunning ? "STOP" : "START"}
      </button>

      {/* Click outside to close menu */}
      {showMenu && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => setShowMenu(false)}
        />
      )}
    </main>
  );
}
