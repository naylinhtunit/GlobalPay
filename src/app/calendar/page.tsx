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
  Trash2,
  Plus,
  Calendar as CalendarIcon
} from "lucide-react";
import { scanCalendar } from "@/ai/flows/scan-calendar-flow";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
  const [newEvent, setNewEvent] = useState({ date: "", title: "" });
  
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
    const map: Record<string, string> = {};
    (companyEvents || []).forEach(e => {
      map[e.date] = e.title;
    });
    return map;
  }, [companyEvents]);

  const allHolidays = useMemo(() => {
    const dates = Object.keys(holidaysMap).map(d => new Date(d));
    const companyDates = Object.keys(companyEventsMap).map(d => new Date(d));
    return [...dates, ...companyDates];
  }, [holidaysMap, companyEventsMap]);

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
        // Save events to Firestore
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
          description: `Successfully added ${result.events.length} events for ${result.detectedMonth || "the calendar"}.`,
        });
      }
    } catch (error) {
      console.error("Scan error:", error);
      toast({
        variant: "destructive",
        title: "Scan Failed",
        description: "Could not process the image. Please try again with a clearer photo.",
      });
    } finally {
      setIsScanning(false);
    }
  };

  const handleAddManualEvent = async () => {
    if (!newEvent.date || !newEvent.title || !firestore || !user) return;
    
    const eventId = `${user.uid}_${newEvent.date}`;
    await setDoc(doc(firestore, "companyCalendars", eventId), {
      companyId: user.uid,
      date: newEvent.date,
      title: newEvent.title,
      isWorkday: false,
      updatedAt: serverTimestamp(),
    });

    setNewEvent({ date: "", title: "" });
    setIsAddingEvent(false);
    toast({ title: "Event Added", description: "Holiday has been saved to your company calendar." });
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
        workday: "平日"
      },
      MM: {
        title: "ပြက္ခဒိန်",
        publicHolidays: "ဂျပန် အစိုးရရုံးပိတ်ရက်များ",
        companyCalendar: "ကုမ္ပဏီ ပိတ်ရက်များ",
        scanButton: "ကုမ္ပဏီပြက္ခဒိန် Scan ဖတ်မည်",
        addEvent: "ပိတ်ရက်ထည့်ရန်",
        scanning: "ဖတ်နေဆဲ...",
        holiday: "ရုံးပိတ်ရက်",
        workday: "ရုံးဖွင့်ရက်"
      }
    };
    return dict[language][key];
  };

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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card className="shadow-lg border-primary/10 overflow-hidden bg-card">
            <CardHeader className="bg-muted/30 border-b">
              <CardTitle className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
                <Globe size={16} className="text-primary" /> {translate("publicHolidays")}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 flex flex-col items-center">
              <Calendar
                mode="multiple"
                selected={allHolidays}
                className="rounded-md border shadow-sm bg-background"
                modifiers={{
                  holiday: JAPAN_PUBLIC_HOLIDAYS.map(h => new Date(h.date))
                }}
                modifiersClassNames={{
                  holiday: "bg-destructive/10 text-destructive font-bold"
                }}
              />
              <div className="mt-6 w-full space-y-2">
                <h4 className="text-xs font-bold text-muted-foreground uppercase mb-2">Upcoming Holidays</h4>
                {JAPAN_PUBLIC_HOLIDAYS.slice(0, 5).map((h, i) => (
                  <div key={i} className="flex justify-between items-center p-2 rounded-lg bg-muted/30 border border-primary/5 text-sm">
                    <span className="font-mono text-xs">{h.date}</span>
                    <span className="font-bold">{language === "JP" ? h.title_jp : h.title}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg border-orange-500/10 overflow-hidden bg-card">
            <CardHeader className="bg-orange-500/5 border-b">
              <div className="flex justify-between items-center">
                <CardTitle className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
                  <Briefcase size={16} className="text-orange-600" /> {translate("companyCalendar")}
                </CardTitle>
                <Dialog open={isAddingEvent} onOpenChange={setIsAddingEvent}>
                  <DialogTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 gap-1 text-orange-600 hover:bg-orange-500/10">
                      <Plus size={14} /> {translate("addEvent")}
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>{translate("addEvent")}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label>Date</Label>
                        <Input type="date" value={newEvent.date} onChange={e => setNewEvent({...newEvent, date: e.target.value})} className="bg-background" />
                      </div>
                      <div className="space-y-2">
                        <Label>Holiday/Event Name</Label>
                        <Input placeholder="e.g. Summer Vacation" value={newEvent.title} onChange={e => setNewEvent({...newEvent, title: e.target.value})} className="bg-background" />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button onClick={handleAddManualEvent} className="bg-primary hover:bg-primary/90">Save Event</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                {(companyEvents || []).length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground bg-muted/10 rounded-xl border border-dashed border-primary/10">
                    <CalendarDays className="mx-auto h-8 w-8 opacity-20 mb-2" />
                    <p className="text-sm">No company specific holidays found.</p>
                    <p className="text-[10px]">Scan a calendar paper to auto-fill this list.</p>
                  </div>
                ) : (
                  (companyEvents || []).map((ev: any) => (
                    <div key={ev.id} className="flex items-center gap-4 p-3 rounded-xl border border-primary/5 bg-background hover:shadow-md transition-shadow">
                      <div className="h-10 w-10 rounded-lg bg-orange-500/10 flex flex-col items-center justify-center text-orange-600 shrink-0">
                        <span className="text-[10px] font-bold uppercase">{new Date(ev.date).toLocaleString('default', { month: 'short' })}</span>
                        <span className="text-lg font-black leading-none">{new Date(ev.date).getDate()}</span>
                      </div>
                      <div className="flex-1 overflow-hidden">
                        <p className="font-bold truncate">{ev.title}</p>
                        <p className="text-[10px] text-muted-foreground">{ev.isWorkday ? translate("workday") : translate("holiday")}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

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
