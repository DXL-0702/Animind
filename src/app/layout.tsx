import type { Metadata } from "next";
import "@/styles/globals.css";
import AppInitializer from "./AppInitializer";

export const metadata: Metadata = {
  title: "Animind - 动漫二创AI工坊",
  description: "100%原创合规的二次元AI二创工具+OC仿生人陪伴平台",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" data-theme="animind" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#D4845C" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Animind" />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var stored = JSON.parse(localStorage.getItem('animind-app-store') || '{}');
                  var state = stored.state || {};
                  if (state.theme) document.documentElement.setAttribute('data-theme', state.theme);
                  if (state.locale) document.documentElement.setAttribute('lang', state.locale);
                } catch(e) {}
              })();
            `,
          }}
        />
      </head>
      <body className="antialiased">
        <AppInitializer />
        {children}
      </body>
    </html>
  );
}
