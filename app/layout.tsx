import type { Metadata } from "next";
import { Rajdhani, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const rajdhani = Rajdhani({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-rajdhani",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-jetbrains-mono",
});

export const metadata: Metadata = {
  title: "SMART ROOM MONITORING SYSTEM",
  description:
    "Real-time IoT sensor monitoring dashboard with tactical visualization. Track temperature, humidity, pressure, and environmental data across distributed sensor clusters.",
};

// Skrip dijalankan sebelum paint: jika intro sudah dilihat dalam sesi ini, pasang dataset.intro='seen'
const introGuard = `try{if(sessionStorage.getItem("sic-intro-seen"))document.documentElement.dataset.intro="seen"}catch(e){}`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`h-full antialiased ${rajdhani.variable} ${jetbrainsMono.variable}`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: introGuard }} />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
