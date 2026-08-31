import "./globals.css";
import { Providers } from "./providers";
 
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it" className="dark">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}