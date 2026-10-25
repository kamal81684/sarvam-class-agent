import "./globals.css";
import Nav from "@/components/Nav";

export const metadata = { title: "Sarvam Class Agent" };

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body>
        <Nav />
        <main className="container">{children}</main>
      </body>
    </html>
  );
}
