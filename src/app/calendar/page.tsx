
"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
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
  Camera, 
  Languages, 
  Loader2, 
  CalendarDays, 
  Briefcase, 
  Globe,
  Plus,
  Calendar as CalendarIcon,
  Info,
  CheckCircle2
} from "lucide-react";
import { scanCalendar } from "@/ai/flows/scan-calendar-flow";
import { useToast } from "@/hooks/use-toast";
import { format, startOfYear, endOfYear, isSameDay } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// Static Japan Public Holidays 2024/2025
const JAPAN_PUBLIC_HOLIDAYS = [
  { date: "2024-01-01", title: "New Year's Day", title_jp: "元日" },
  { date: "2024-01-08", title: "Coming of Age Day", title_jp: "成人の日" },
  { date: "2024-02-11", title: "Foundation Day", title_jp: "建国記念の日" },
  { date: "2024-02-23", title: "Emperor's Birthday", title_jp: "天皇誕生日" },
  { date: "2024-03-20", title: "Vernal Equinox Day", title_jp: "春分の日" },
  { date: "2024-04-29", title: "Showa Day", title_jp: "昭和の日" },
  { date: "2024-05-03", title: "Constitution Memorial Day", title_jp: "憲法記念日" },
  { date: "2024-05-04", title: "Greenery Day", title_jp: "みどりの日" },
  { date: "2024-05-05", title: "Children's Day", title_jp: "こどもの日" },
  { date: "2024-07-15", title: "Marine Day", title_jp: "海の日" },
  { date: "2024-08-11", title: "Mountain Day", title_jp: "山の日" },
  { date: "2024-09-16", title: "Respect for the Aged Day", title_jp: "敬老の日" },
  { date: "2024-09-22", title: "Autumnal Equinox Day", title_jp: "秋分の日" },
  { date: "2024-10-14", title: "Health and Sports Day", title_jp: "スポーツの日" },
  { date: "2024-11-03", title: "Culture Day", title_jp: "文化の日" },
  { date: "2024-11-23", title: "Labor Thanksgiving Day", title_jp: "勤労感謝の日" },
  { date: "2025-01-01", title: "New Year's Day", title_jp: "元日" },
];

export default function JapanCalendarPage() {
  const { country } = useCountry();
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const [language, setLanguage] = useState<"JP" | "MM">("JP");
  const [isScanning, setIsScanning] = useState(false);
  const [isAddingEvent, setIsAddingEvent] = useState(false);
  const [selectedDateForEdit, setSelectedDateForEdit] = useState<Date | null>(null);
  const [eventTitle, setEventTitle] = useState("");
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hasCameraPermission, setHasCameraPermission] = useState(false);
  const [showCamera, setShowCamera] = useState(false);

  // Firestore query for company calendar events
  const calendarQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(
      collection(firestore, "companyCalendars"),
      where("companyId", "==", user.uid)
    );
  }, [firestore, user]);

  const { data: companyEvents, isLoading: eventsLoading } = useCollection(calendarQuery);

  const holidaysMap = useMemo(() => {
    const map: Record<string, string> = {};
    JAPAN_PUBLIC_HOLIDAYS.forEach(h => {
      map[h.date] = language === "JP" ? h.title_jp : h.title;
    });
    return map;
  }, [language]);

  const companyEventsMap = useMemo(() => {
    const map: Record<string, any> = {};
    (companyEvents || []).forEach(e => {
      map[e.date] = e;
    });
    return map;
  }, [companyEvents]);

  const yearlySummary = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const companyHolidays = (companyEvents || []).filter(e => 
      e.date.startsWith(currentYear.toString()) && !e.isWorkday
    );
    return companyHolidays.length;
  }, [companyEvents]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setHasCameraPermission(true);
        setShowCamera(true);
      }
    } catch (error) {
      console.error("Camera access error:", error);
      toast({
        variant: "destructive",
        title: "Camera Access Denied",
        description: "Please allow camera access to scan your calendar.",
      });
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setShowCamera(false);
  };

  const captureAndScan = async () => {
    if (!videoRef.current || !firestore || !user) return;

    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(videoRef.current, 0, 0);
    const dataUri = canvas.toDataURL("image/jpeg");

    stopCamera();
    setIsScanning(true);

    try {
      const result = await scanCalendar({ photoDataUri: dataUri });
      if (result && result.events) {
        const companyCalRef = collection(firestore, "companyCalendars");
        for (const event of result.events) {
          const eventId = `${user.uid}_${event.date}`;
          await setDoc(doc(companyCalRef, eventId), {
            companyId: user.uid,
            date: event.date,
            title: event.title,
            isWorkday: event.isWorkday,
            updatedAt: serverTimestamp(),
          });
        }
        toast({
          title: "Calendar Scanned",
          description: `Successfully added ${result.events.length} events.`,
        });
      }
    } catch (error) {
      console.error("Scan error:", error);
      toast({
        variant: "destructive",
        title: "Scan Failed",
        description: "Could not process the image.",
      });
    } finally {
      setIsScanning(false);
    }
  };

  const handleDayClick = (date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    const existing = companyEventsMap[dateStr];
    
    if (existing) {
      // If exists, open dialog to delete or edit
      setSelectedDateForEdit(date);
      setEventTitle(existing.title);
      setIsAddingEvent(true);
    } else {
      // If doesn't exist, open dialog to add
      setSelectedDateForEdit(date);
      setEventTitle("");
      setIsAddingEvent(true);
    }
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
        publicHolidays: "日本の祝日",
        companyCalendar: "会社カレンダー",
        scanButton: "会社カレンダーをスキャン",
        addEvent: "イベントを追加",
        scanning: "スキャン中...",
        holiday: "祝日",
        workday: "平日",
        yearlySummary: "年間の会社休日合計",
        days: "日",
        clickToMark: "日付をクリックして休日に設定"
      },
      MM: {
        title: "ပြက္ခဒိန်",
        publicHolidays: "ဂျပန် အစိုးရရုံးပိတ်ရက်များ",
        companyCalendar: "ကုမ္ပဏီ ပိတ်ရက်များ",
        scanButton: "ကုမ္ပဏီပြက္ခဒိန် Scan ဖတ်မည်",
        addEvent: "ပိတ်ရက်ထည့်ရန်",
        scanning: "ဖတ်နေဆဲ...",
        holiday: "ရုံးပိတ်ရက်",
        workday: "ရုံးဖွင့်ရက်",
        yearlySummary: "ယခုနှစ် စုစုပေါင်း ကုမ္ပဏီပိတ်ရက်",
        days: "ရက်",
        clickToMark: "ပိတ်ရက်သတ်မှတ်ရန် ရက်စွဲကို နှိပ်ပါ"
      }
    };
    return dict[language][key] || key;
  };

  if (country !== "Japan") {
    return (
      <div className="md:pl-64 pt-16 md:pt-0 min-h-screen flex items-center justify-center p-8">
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
            <p className="text-muted-foreground">Manage your working days and public holidays in Japan</p>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => setLanguage(language === "JP" ? "MM" : "JP")}
              className="gap-2 border-primary/20 bg-card hover:bg-muted"
            >
              <Languages size={16} /> {language === "JP" ? "မြန်မာ" : "日本語"}
            </Button>
            <Button onClick={startCamera} className="gap-2 bg-primary shadow-lg" disabled={isScanning}>
              {isScanning ? <Loader2 className="animate-spin" size={18} /> : <Camera size={18} />}
              {isScanning ? translate("scanning") : translate("scanButton")}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Calendar View */}
          <Card className="lg:col-span-2 shadow-lg border-primary/10 overflow-hidden bg-card">
            <CardHeader className="bg-muted/30 border-b flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
                <Globe size={16} className="text-primary" /> {translate("publicHolidays")}
              </CardTitle>
              <span className="text-[10px] text-muted-foreground italic flex items-center gap-1">
                <Info size={12} /> {translate("clickToMark")}
              </span>
            </CardHeader>
            <CardContent className="p-6">
              <div className="flex flex-col items-center">
                <Calendar
                  mode="single"
                  onDayClick={handleDayClick}
                  className="rounded-md border shadow-sm bg-background w-full flex justify-center p-8"
                  modifiers={{
                    publicHoliday: JAPAN_PUBLIC_HOLIDAYS.map(h => new Date(h.date)),
                    companyHoliday: (companyEvents || []).filter(e => !e.isWorkday).map(e => new Date(e.date))
                  }}
                  modifiersClassNames={{
                    publicHoliday: "bg-destructive/10 text-destructive font-bold",
                    companyHoliday: "border-2 border-destructive rounded-full text-destructive font-black scale-110 shadow-sm"
                  }}
                />
              </div>
            </CardContent>
          </Card>

          {/* Sidebar Info */}
          <div className="space-y-6">
            <Card className="shadow-lg border-primary/20 bg-primary/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-bold text-muted-foreground uppercase">{translate("yearlySummary")}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline gap-2">
                  <span className="text-5xl font-black text-primary">{yearlySummary}</span>
                  <span className="text-lg font-bold text-muted-foreground">{translate("days")}</span>
                </div>
                <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
                  <CheckCircle2 size={14} className="text-green-500" />
                  Synced with monthly payroll
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-lg border-orange-500/10 bg-card overflow-hidden">
              <CardHeader className="bg-orange-500/5 border-b">
                <CardTitle className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
                  <Briefcase size={16} className="text-orange-600" /> {translate("companyCalendar")}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y max-h-[400px] overflow-y-auto">
                  {(companyEvents || []).length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <CalendarDays className="mx-auto h-8 w-8 opacity-20 mb-2" />
                      <p className="text-xs">No company specific holidays found.</p>
                    </div>
                  ) : (
                    (companyEvents || []).sort((a,b) => a.date.localeCompare(b.date)).map((ev: any) => (
                      <div key={ev.id} className="flex items-center gap-4 p-4 hover:bg-muted/30 transition-colors">
                        <div className="h-10 w-10 rounded-lg bg-orange-500/10 flex flex-col items-center justify-center text-orange-600 shrink-0">
                          <span className="text-[10px] font-bold uppercase">{new Date(ev.date).toLocaleString('default', { month: 'short' })}</span>
                          <span className="text-lg font-black leading-none">{new Date(ev.date).getDate()}</span>
                        </div>
                        <div className="flex-1 overflow-hidden">
                          <p className="text-sm font-bold truncate">{ev.title}</p>
                          <p className="text-[10px] text-muted-foreground">{ev.isWorkday ? translate("workday") : translate("holiday")}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Edit/Add Dialog */}
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
                <Label>Holiday/Event Name</Label>
                <Input 
                  placeholder="e.g. Summer Vacation" 
                  value={eventTitle} 
                  onChange={e => setEventTitle(e.target.value)} 
                />
              </div>
              <p className="text-[10px] text-muted-foreground italic">
                * Marking this as a holiday will adjust payroll working days.
              </p>
            </div>
            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button variant="outline" onClick={deleteManualEvent} className="text-destructive hover:bg-destructive/5 flex-1">
                Remove Event
              </Button>
              <Button onClick={saveManualEvent} className="bg-primary flex-1">Save Holiday</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Camera Modal */}
        <Dialog open={showCamera} onOpenChange={setShowCamera}>
          <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden bg-black border-none">
            <div className="relative aspect-video">
              <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
              <div className="absolute inset-0 border-2 border-white/30 border-dashed pointer-events-none m-8 rounded-lg" />
              <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-4">
                <Button onClick={stopCamera} variant="outline" className="bg-white/10 border-white/20 text-white hover:bg-white/20">Cancel</Button>
                <Button onClick={captureAndScan} className="bg-white text-black hover:bg-white/90 font-bold px-8">Capture Calendar</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}

