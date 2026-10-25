import "./globals.css";

export const metadata = { title: "Sarvam Class Agent" };

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <header>
          <a href="/">Sarvam Class Agent</a>
        </header>
        <main>{children}</main>
      </body>
    </html>
  );
}
