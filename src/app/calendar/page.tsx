"use client";

import React, { useState, useMemo } from "react";
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
  Info
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function JapanCalendarPage() {
  const { country } = useCountry();
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const [language, setLanguage] = useState<"JP" | "MM">("JP");
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [isAddingEvent, setIsAddingEvent] = useState(false);
  const [selectedDateForEdit, setSelectedDateForEdit] = useState<Date | null>(null);
  const [eventTitle, setEventTitle] = useState("");

  // Firestore query for company calendar events
  const calendarQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(
      collection(firestore, "companyCalendars"),
      where("companyId", "==", user.uid)
    );
  }, [firestore, user]);

  const { data: companyEvents } = useCollection(calendarQuery);

  const companyEventsMap = useMemo(() => {
    const map: Record<string, any> = {};
    (companyEvents || []).forEach(e => {
      map[e.date] = e;
    });
    return map;
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
    const eventId = `${user.uid}_${dateStr}`;
    
    await setDoc(doc(firestore, "companyCalendars", eventId), {
      companyId: user.uid,
      date: dateStr,
      title: eventTitle || "Company Holiday",
      isWorkday: false,
      updatedAt: serverTimestamp(),
    });

    setIsAddingEvent(false);
    toast({ title: "Saved", description: "Calendar updated." });
  };

  const deleteManualEvent = async () => {
    if (!selectedDateForEdit || !firestore || !user) return;
    const dateStr = format(selectedDateForEdit, "yyyy-MM-dd");
    const eventId = `${user.uid}_${dateStr}`;
    await deleteDoc(doc(firestore, "companyCalendars", eventId));
    setIsAddingEvent(false);
    toast({ title: "Removed", description: "Holiday removed." });
  };

  const translate = (key: string) => {
    const dict: any = {
      JP: {
        title: "カレンダー",
        companyCalendar: "会社カレンダー",
        holiday: "祝日",
        workday: "平日",
        yearlySummary: "年間の会社休日合計",
        days: "日",
        clickToMark: "日付をクリックして休日に設定",
        currentYear: `${currentYear}年`,
        removeEvent: "削除",
        saveEvent: "保存",
        placeholder: "イベント名 (例: 夏休み)"
      },
      MM: {
        title: "ပြက္ခဒိန်",
        companyCalendar: "ကုမ္ပဏီ ပိတ်ရက်များ",
        holiday: "ရုံးပိတ်ရက်",
        workday: "ရုံးဖွင့်ရက်",
        yearlySummary: "ယခုနှစ် စုစုပေါင်း ကုမ္ပဏီပိတ်ရက်",
        days: "ရက်",
        clickToMark: "ပိတ်ရက်သတ်မှတ်ရန် ရက်စွဲကို နှိပ်ပါ",
        currentYear: `${currentYear} ခုနှစ်`,
        removeEvent: "ဖယ်ရှားမည်",
        saveEvent: "သိမ်းဆည်းမည်",
        placeholder: "ပိတ်ရက်အမည် (ဥပမာ- သင်္ကြန်ပိတ်ရက်)"
      }
    };
    return dict[language][key] || key;
  };

  const months = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => new Date(currentYear, i, 1));
  }, [currentYear]);

  if (country !== "Japan") {
    return (
      <div className="md:pl-64 pt-16 md:pt-0 min-h-screen flex items-center justify-center p-8 bg-background">
        <Navbar />
        <Card className="max-w-md w-full text-center p-8 border-primary/20 bg-card">
          <Globe className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Calendar feature is only available for Japan region.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="md:pl-64 pt-16 md:pt-0 min-h-screen bg-background text-foreground">
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
            <Button 
              variant="outline" 
              onClick={() => setLanguage(language === "JP" ? "MM" : "JP")}
              className="gap-2 border-primary/20 bg-card hover:bg-muted"
            >
              <Globe size={16} /> {language === "JP" ? "မြန်မာ" : "日本語"}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <div className="lg:col-span-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
              {months.map((monthDate, idx) => (
                <Card key={idx} className="shadow-sm border-primary/10 overflow-hidden bg-card">
                  <CardHeader className="p-3 bg-muted/30 border-b">
                    <CardTitle className="text-xs font-bold text-center uppercase tracking-wider">
                      {monthDate.toLocaleString(language === "JP" ? "ja-JP" : "en-US", { month: "long" })}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 flex justify-center">
                    <Calendar
                      mode="single"
                      month={monthDate}
                      onDayClick={handleDayClick}
                      disableNavigation
                      modifiers={{
                        companyHoliday: (companyEvents || []).filter(e => !e.isWorkday).map(e => new Date(e.date))
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
                  Synced with monthly payroll
                </div>
                
                <div className="mt-6 space-y-4">
                  <h4 className="text-[10px] font-bold uppercase text-muted-foreground flex items-center gap-2 border-b pb-2">
                    <CalendarDays size={14} className="text-primary" /> {translate("companyCalendar")}
                  </h4>
                  <div className="max-h-[400px] overflow-y-auto space-y-2 pr-2">
                    {(companyEvents || []).filter(e => e.date.startsWith(currentYear.toString())).length === 0 ? (
                      <p className="text-[10px] text-muted-foreground italic text-center py-4">No holidays marked for this year.</p>
                    ) : (
                      (companyEvents || [])
                        .filter(e => e.date.startsWith(currentYear.toString()))
                        .sort((a,b) => a.date.localeCompare(b.date))
                        .map((ev: any) => (
                          <div key={ev.id} className="flex items-center gap-2 p-2 bg-background border rounded-lg text-[10px] font-medium shadow-sm">
                            <span className="text-destructive font-bold bg-destructive/5 px-1.5 py-0.5 rounded border border-destructive/10">{ev.date.substring(5)}</span>
                            <span className="truncate flex-1">{ev.title}</span>
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
                {selectedDateForEdit && format(selectedDateForEdit, "PPP")}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase text-muted-foreground">{language === "JP" ? "休日名" : "Holiday Name"}</Label>
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
