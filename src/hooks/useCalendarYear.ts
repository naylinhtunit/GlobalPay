"use client";
import { useEffect, useRef, useState } from "react";
import { nextYearCheckDelay } from "@/lib/annual-leave";

/** Handles a device kept open across New Year, foreground resume and clock changes. */
export function useCalendarYear() {
  const [year, setYear] = useState(() => new Date().getFullYear());
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const refresh = () => {
      clearTimeout(timer);
      const now = new Date(); setYear(now.getFullYear());
      timer = setTimeout(refresh, nextYearCheckDelay(now));
    };
    refresh();
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => { clearTimeout(timer); window.removeEventListener("focus", refresh); document.removeEventListener("visibilitychange", refresh); };
  }, []);
  return year;
}

export function useReportingYear(): [number, React.Dispatch<React.SetStateAction<number>>, number] {
  const currentYear = useCalendarYear();
  const [year, setYear] = useState(currentYear);
  const previous = useRef(currentYear);
  useEffect(() => {
    const old = previous.current; previous.current = currentYear;
    setYear(selected => selected === old ? currentYear : selected);
  }, [currentYear]);
  return [year, setYear, currentYear];
}
