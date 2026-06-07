# GlobalPay - နိုင်ငံတကာ လစာပေးစနစ် (International Payroll System)

GlobalPay သည် ဂျပန်နိုင်ငံနှင့် မြန်မာနိုင်ငံရှိ ကုမ္ပဏီများအတွက် အထူးရည်ရွယ်ထုတ်လုပ်ထားသော Professional International Payroll Management System တစ်ခု ဖြစ်ပါသည်။ ဤစနစ်သည် ဂျပန်ယန်း (JPY) နှင့် မြန်မာကျပ်ငွေ (MMK) တို့အတွက် လစာတွက်ချက်မှုများကို သက်ဆိုင်ရာနိုင်ငံ၏ အခွန်ဥပဒေများ၊ လူမှုဖူလုံရေး စည်းမျဉ်းများနှင့်အညီ တိကျစွာ လုပ်ဆောင်ပေးနိုင်ရန် တည်ဆောက်ထားပါသည်။

## အဓိက လုပ်ဆောင်ချက်များ (Key Features)

*   **Regional Compliance:** ဂျပန် (JPY) နှင့် မြန်မာ (MMK) နှစ်နိုင်ငံလုံးအတွက် သီးသန့်လစာတွက်ချက်မှုပုံစံများ ပါဝင်သည်။
*   **Employee Management:** ဝန်ထမ်းများ၏ အချက်အလက်များ၊ ရာထူးနှင့် လစာမှတ်တမ်းများကို စနစ်တကျ သိမ်းဆည်းနိုင်သည်။
*   **Automated Payroll:** အချိန်ပိုဆင်းခ (OT)၊ ခွင့်ရက်နှင့် အခြားခံစားခွင့်များကို အလိုအလျောက် တွက်ချက်ပေးသည်။
*   **Payslip Generation:** Professional ကျသော လစာပေးချေလွှာ (Payslip) များကို ကြည့်ရှုနိုင်ပြီး PDF အနေဖြင့် ထုတ်ယူနိုင်သည်။
*   **AI Integration:** ဂျပန်ကုမ္ပဏီ ပြက္ခဒိန်များကို AI အသုံးပြု၍ Scan ဖတ်ပြီး အလုပ်ပိတ်ရက်များကို အလိုအလျောက် သတ်မှတ်နိုင်သည်။
*   **Real-time Exchange Rates:** မြန်မာနိုင်ငံတော် ဗဟိုဘဏ် (CBM) ၏ နေ့စဉ် ငွေလဲလှယ်နှုန်းများကို တိုက်ရိုက် ကြည့်ရှုနိုင်သည်။
*   **Dark Mode Support:** အသုံးပြုသူများအတွက် မျက်စိအေးစေမည့် Dark Mode စနစ်ကို အပြည့်အဝ ထောက်ပံ့ပေးထားသည်။

## အသုံးပြုထားသော နည်းပညာများ (Tech Stack)

*   **Frontend:** Next.js (App Router), React, Tailwind CSS
*   **UI Components:** Shadcn UI, Lucide Icons
*   **Backend & Auth:** Firebase (Authentication, Firestore)
*   **AI:** Genkit (Gemini 2.5 Flash)
*   **Libraries:** Date-fns, Recharts, jsPDF, html2canvas

---

## Local တွင် Run ရန် လမ်းညွှန်ချက် (Setup Instructions)

ဤ Project ကို သင့်စက်ထဲတွင် run ရန်အတွက် အောက်ပါအဆင့်များအတိုင်း လုပ်ဆောင်ပါ။

### ၁။ လိုအပ်ချက်များ (Prerequisites)

*   **Node.js:** Version 18 သို့မဟုတ် ထို့ထက်မြင့်သော version ရှိရပါမည်။
*   **Git:** Project ကို clone လုပ်ရန် လိုအပ်သည်။
*   **Firebase Account:** Firebase console တွင် project တစ်ခု တည်ဆောက်ထားရန် လိုအပ်သည်။

### ၂။ Project ကို Clone လုပ်ခြင်း

Terminal တွင် အောက်ပါ command ကို အသုံးပြု၍ project ကို download ဆွဲပါ။
```bash
git clone <your-repository-url>
cd globalpay-app
```

### ၃။ Package များ Install လုပ်ခြင်း

လိုအပ်သော library များကို install လုပ်ရန် အောက်ပါ command ကို ရိုက်ပါ။
```bash
npm install
```

### ၄။ Environment Variables သတ်မှတ်ခြင်း

Project ရဲ့ root folder ထဲမှာ `.env` ဖိုင်တစ်ခု တည်ဆောက်ပြီး သင်၏ Firebase API keys များကို ထည့်သွင်းပါ။
```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

# Gemini AI အတွက် (လိုအပ်ပါက)
GOOGLE_GENAI_API_KEY=your_gemini_api_key
```

### ၅။ Development Server ကို Run ခြင်း

အောက်ပါ command ကို အသုံးပြု၍ project ကို စတင် run ပါ။
```bash
npm run dev
```
ယခုအခါ browser တွင် `http://localhost:9002` ကို ဖွင့်၍ စတင် အသုံးပြုနိုင်ပါပြီ။

### ၆။ AI Flow ကို Run ခြင်း (Optional)

AI scanning feature များ စမ်းသပ်ရန်အတွက် Genkit ကို run ထားရန် လိုအပ်သည်။
```bash
npm run genkit:dev
```

---

## Deployment

ဤ Project သည် Next.js ဖြစ်သောကြောင့် **Vercel** သို့မဟုတ် **Firebase App Hosting** တို့တွင် အလွယ်တကူ deploy တင်နိုင်ပါသည်။

## ဆက်သွယ်ရန်

GlobalPay Project နှင့် ပတ်သက်၍ အသေးစိတ် သိလိုပါက Developer အဖွဲ့ထံ ဆက်သွယ် စုံစမ်းနိုင်ပါသည်။