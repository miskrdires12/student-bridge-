import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Student Bridge — Enterprise Student Management & ID Portal",
  description: "Next.js + TypeScript Enterprise Student Portal with live 3:4 studio capture, cohort data analytics, and 8-up A4 ID print engine.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('sb_theme');if(t==='dark'){document.documentElement.classList.add('dark')}else{document.documentElement.classList.remove('dark')}}catch(e){}})()`,
          }}
        />
      </head>
      <body className="min-h-screen bg-[#f7faf9] dark:bg-[#070908] text-[#080808] dark:text-[#f2f7f4] antialiased selection:bg-[#8fe617] selection:text-[#062404]">
        {children}
      </body>
    </html>
  );
}
