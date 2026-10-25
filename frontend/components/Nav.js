"use client";
import { usePathname } from "next/navigation";

export default function Nav() {
  const path = usePathname();
  const student = path.startsWith("/learn");
  return (
    <header className="nav">
      <div className="nav-inner">
        <a href="/" className="brand">
          <span className="brand-logo">MAS</span>
          <span>Sarvam <span className="accent">Class Agent</span></span>
        </a>
        <nav className="nav-links">
          <a href="/" className={!student ? "active" : ""}>Teacher Studio</a>
          <a href="/learn" className={student ? "active" : ""}>Student</a>
        </nav>
      </div>
    </header>
  );
}
