
"use client";

import React, { useState, useMemo, useEffect } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { useCountry } from "@/context/CountryContext";
import { 
  useFirestore, 
  useCollection, 
  useMemoFirebase,
  useUser 
} from "@/firebase";
import { 
  collection, 
  query, 
  where, 
  doc, 
  setDoc,
  deleteDoc,
  serverTimestamp 
} from "firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { 
  CalendarDays, 
  Globe,
  Calendar as CalendarIcon,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format, parseISO } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLanguage } from "@/context/LanguageContext";
import { LanguageSelector } from "@/components/LanguageSelector";
import { formatDisplayDate } from "@/lib/i18n";
import { ja, enUS } from "date-fns/locale";

export default function CalendarPage() {
  const { t, language } = useLanguage();
  const calendarLocale = language === "ja" ? ja : enUS;
  const { country } = useCountry();
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [isAddingEvent, setIsAddingEvent] = useState(false);
  const [selectedDateForEdit, setSelectedDateForEdit] = useState<Date | null>(null);
  const [eventTitle, setEventTitle] = useState("");


  // Firestore query for company calendar events, filtered by country
  const calendarQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(
      collection(firestore, "companyCalendars"),
      where("companyId", "==", user.uid),
      where("country", "==", country)
    );
  }, [firestore, user, country]);

  const { data: companyEvents } = useCollection(calendarQuery);

  const companyEventsMap = useMemo(() => {
    const map: Record<string, any> = {};
    (companyEvents || []).forEach(e => {
      map[e.date] = e;
    });
    return map;
  }, [companyEvents]);

  // Use parseISO to ensure dates are treated as local midnight to avoid timezone shifts
  const holidayDates = useMemo(() => {
    return (companyEvents || [])
      .filter(e => !e.isWorkday)
      .map(e => parseISO(e.date));
  }, [companyEvents]);

  const yearlySummary = useMemo(() => {
    const companyHolidays = (companyEvents || []).filter(e => 
      e.date.startsWith(currentYear.toString()) && !e.isWorkday
    );
    return companyHolidays.length;
  }, [companyEvents, currentYear]);

  const handleDayClick = (date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    const existing = companyEventsMap[dateStr];
    
    setSelectedDateForEdit(date);
    setEventTitle(existing ? existing.title : "");
    setIsAddingEvent(true);
  };

  const saveManualEvent = async () => {
    if (!selectedDateForEdit || !firestore || !user) return;
    
    const dateStr = format(selectedDateForEdit, "yyyy-MM-dd");
    const eventId = `${user.uid}_${country}_${dateStr}`;
    
    setDoc(doc(firestore, "companyCalendars", eventId), {
      companyId: user.uid,
      country,
      date: dateStr,
      title: eventTitle || "Company holiday",
      isWorkday: false,
      updatedAt: serverTimestamp(),
    }).catch(err => {
      console.error("Failed to save event:", err);
    });

    setIsAddingEvent(false);
    toast({ title: t("Calendar updated") });
  };

  const deleteManualEvent = async () => {
    if (!selectedDateForEdit || !firestore || !user) return;
    const dateStr = format(selectedDateForEdit, "yyyy-MM-dd");
    const eventId = `${user.uid}_${country}_${dateStr}`;
    deleteDoc(doc(firestore, "companyCalendars", eventId)).catch(err => {
      console.error("Failed to delete event:", err);
    });
    setIsAddingEvent(false);
    toast({ title: t("Holiday removed") });
  };

  const translate = (key: string) => {
    const keys: Record<string, string> = {
      title: "Calendar", companyCalendar: "Company calendar", yearlySummary: "Yearly company holidays",
      days: "days", clickToMark: "Click a date to mark a holiday", removeEvent: "Delete", saveEvent: "Save",
      placeholder: "Event name (e.g. summer holiday)",
    };
    return key === "currentYear" ? String(currentYear) : t(keys[key] || key);
  };

  const months = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => new Date(currentYear, i, 1));
  }, [currentYear]);

  return (
    <div className="mobile-app-content md:pl-64 min-h-screen bg-background text-foreground">
      <Navbar />
      <main className="p-4 md:p-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-primary flex items-center gap-3">
              <CalendarIcon className="text-primary" /> {translate("title")}
            </h2>
            <p className="text-muted-foreground text-sm">{translate("clickToMark")}</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-card border rounded-lg p-1 shadow-sm">
              <Button variant="ghost" size="icon" onClick={() => setCurrentYear(y => y - 1)} className="h-8 w-8">
                <ChevronLeft size={16} />
              </Button>
              <span className="text-sm font-bold min-w-[80px] text-center">{translate("currentYear")}</span>
              <Button variant="ghost" size="icon" onClick={() => setCurrentYear(y => y + 1)} className="h-8 w-8">
                <ChevronRight size={16} />
              </Button>
            </div>
            <LanguageSelector compact />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <div className="lg:col-span-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
              {months.map((monthDate, idx) => (
                <Card key={idx} className="shadow-sm border-primary/10 overflow-hidden bg-card">
                  <CardHeader className="p-3 bg-muted/30 border-b">
                    <CardTitle className="text-xs font-bold text-center uppercase tracking-wider">
                      {formatDisplayDate(monthDate, language, { month: "long" })}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 flex justify-center">
                    <Calendar
                      locale={calendarLocale}
                      formatters={{ formatWeekdayName: date => formatDisplayDate(date, language, { weekday: "short" }) }}
                      labels={{ labelDayButton: date => formatDisplayDate(date, language, { dateStyle: "full" }) }}
                      mode="single"
                      month={monthDate}
                      onDayClick={handleDayClick}
                      disableNavigation
                      showOutsideDays={false}
                      modifiers={{
                        companyHoliday: holidayDates
                      }}
                      modifiersClassNames={{
                        companyHoliday: "border-2 border-destructive rounded-full text-destructive font-black shadow-sm bg-destructive/10"
                      }}
                    />
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          <div className="space-y-6">
            <Card className="shadow-lg border-primary/20 bg-primary/5 sticky top-24">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-bold text-muted-foreground uppercase">{translate("yearlySummary")}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline gap-2">
                  <span className="text-5xl font-black text-primary">{yearlySummary}</span>
                  <span className="text-lg font-bold text-muted-foreground">{translate("days")}</span>
                </div>
                <div className="mt-4 flex items-center gap-2 text-[10px] text-muted-foreground border-t pt-4">
                  <CheckCircle2 size={12} className="text-green-500" />
                  {t("Synced with monthly payroll")}
                </div>
                
                <div className="mt-6 space-y-4">
                  <h4 className="text-[10px] font-bold uppercase text-muted-foreground flex items-center gap-2 border-b pb-2">
                    <CalendarDays size={14} className="text-primary" /> {translate("companyCalendar")}
                  </h4>
                  <div className="max-h-[400px] overflow-y-auto space-y-2 pr-2">
                    {(companyEvents || []).filter(e => e.date.startsWith(currentYear.toString())).length === 0 ? (
                      <p className="text-[10px] text-muted-foreground italic text-center py-4">
                        {t("No holidays registered.")}
                      </p>
                    ) : (
                      (companyEvents || [])
                        .filter(e => e.date.startsWith(currentYear.toString()))
                        .sort((a,b) => a.date.localeCompare(b.date))
                        .map((ev: any) => (
                          <div key={ev.id} className="flex items-center gap-2 p-2 bg-background border rounded-lg text-[10px] font-medium shadow-sm">
                            <span className="text-destructive font-bold bg-destructive/5 px-1.5 py-0.5 rounded border border-destructive/10">{ev.date.substring(5)}</span>
                            <span className="truncate flex-1">{["Company holiday", "会社休日", "ကုမ္ပဏီပိတ်ရက်"].includes(ev.title) ? t("Company holiday") : ev.title}</span>
                          </div>
                        ))
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <Dialog open={isAddingEvent} onOpenChange={setIsAddingEvent}>
          <DialogContent className="sm:max-w-[400px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CalendarIcon className="text-primary" />
                {selectedDateForEdit && formatDisplayDate(selectedDateForEdit, language, { dateStyle: "long" })}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase text-muted-foreground">{t("Holiday name")}</Label>
                <Input 
                  placeholder={translate("placeholder")} 
                  value={eventTitle} 
                  onChange={e => setEventTitle(e.target.value)} 
                  className="h-10"
                />
              </div>
            </div>
            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button variant="outline" onClick={deleteManualEvent} className="text-destructive hover:bg-destructive/5 flex-1 border-destructive/20">
                {translate("removeEvent")}
              </Button>
              <Button onClick={saveManualEvent} className="bg-primary flex-1">
                {translate("saveEvent")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
