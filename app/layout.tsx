import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { AuthProvider } from "@/lib/auth-context";
import { QueryProvider } from "@/components/query-provider";
import { ThemeMeta } from "@/components/theme-meta";
import { Toaster } from "sonner";

export const metadata: Metadata = {
  title: "Notes App",
  description: "A simple notes app with auto-save functionality",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" type="image/png" href="/notes.png" />
        <meta name="theme-color" content="#fafafa" />
        <meta name="theme-color" media="(prefers-color-scheme: dark)" content="#34363f" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Notes" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                // Immediate cursor fix before any rendering
                try {
                  const style = document.createElement('style');
                  style.innerHTML = \`
                    textarea, input[type="text"], input[type="email"], input[type="password"] {
                      caret-color: #000000 !important;
                      -webkit-text-fill-color: inherit !important;
                    }
                    .dark textarea, .dark input { caret-color: #ffffff !important; }
                    .frappe textarea, .frappe input { caret-color: #c6d0f5 !important; }
                  \`;
                  document.head.appendChild(style);
                } catch(e) {}
              })();
            `,
          }}
        />
      </head>
      <body className="antialiased">
        <QueryProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
            themes={["light", "dark", "frappe", "system"]}
          >
            <AuthProvider>
              <ThemeMeta />
              {children}
              <Toaster position="top-right" />
            </AuthProvider>
          </ThemeProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
