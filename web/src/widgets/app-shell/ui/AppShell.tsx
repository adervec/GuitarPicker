"use client";

// The persistent left sidebar + topbar chrome, matching the vanilla app's
// own #app grid (styles/main.css: a 248px sidebar + topbar over the active
// view) — the pilot previously had no app shell at all, just a small pill
// nav (widgets/pilot-nav, now retired) each page rendered inline at its own
// top, unlike the original. Mounted once in app/layout.tsx around every
// page, since Next's root layout is exactly the vanilla #app's job.
//
// Play's and Karaoke's stage are fullscreen game-engine views (see their
// header comments) that already assume the whole viewport, same as the
// vanilla app's `#view.no-pad` + `#app:has(#view.no-pad)` CSS — done here
// with a route check instead, since that :has() trick needs a same-DOM
// sibling relationship this tree doesn't have.
import { usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useSyncExternalStore, type ReactNode } from "react";
import { audioEngine, DEFAULT_CURRENT_DEVICES } from "@/shared/lib/audio-engine";
import styles from "./AppShell.module.css";

function useCurrentDevices() {
  return useSyncExternalStore(audioEngine.onChange, audioEngine.currentDevices, () => DEFAULT_CURRENT_DEVICES);
}

interface NavItem {
  href: string;
  icon: string;
  label: string;
}
interface NavGroup {
  label: string;
  items: NavItem[];
}

const NAV: NavGroup[] = [
  {
    label: "Play",
    items: [
      { href: "/", icon: "🏠", label: "Home" },
      { href: "/library", icon: "🎵", label: "Songs" },
      { href: "/karaoke", icon: "🎤", label: "Karaoke" },
      { href: "/tuner", icon: "🎚️", label: "Tuner" },
    ],
  },
  {
    label: "Create",
    items: [
      { href: "/editor", icon: "✏️", label: "Song Editor" },
      { href: "/listen", icon: "🎙️", label: "Listen & Make" },
    ],
  },
  {
    label: "Grow",
    items: [
      { href: "/training", icon: "🏋️", label: "Training" },
      { href: "/theory-games", icon: "🎯", label: "Theory Games" },
      { href: "/glossary", icon: "📖", label: "Glossary" },
      { href: "/instruments", icon: "🎻", label: "Instruments" },
      { href: "/history", icon: "📈", label: "Progress" },
    ],
  },
  // No "You" group — the vanilla nav's Locker entry lives there, and
  // Locker/cosmetics/coin economy isn't part of this pilot.
  {
    label: "System",
    items: [
      { href: "/settings", icon: "⚙️", label: "Settings" },
    ],
  },
];

const CRUMB_TITLES: Record<string, string> = {
  "/": "Home",
  "/library": "Songs",
  "/karaoke": "Karaoke",
  "/tuner": "Tuner",
  "/editor": "Song Editor",
  "/listen": "Listen & Make",
  "/training": "Training",
  "/theory-games": "Theory Games",
  "/glossary": "Glossary",
  "/instruments": "Instruments",
  "/history": "Progress",
  "/settings": "Settings",
};

function isActive(pathname: string, href: string): boolean {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

function crumbFor(pathname: string): string {
  if (CRUMB_TITLES[pathname]) return CRUMB_TITLES[pathname];
  // Dynamic sub-routes (e.g. /editor/[id], /theory-games/[id]) fall back to
  // their section's title by matching the longest known prefix.
  const match = Object.keys(CRUMB_TITLES)
    .filter((p) => p !== "/" && pathname.startsWith(p))
    .sort((a, b) => b.length - a.length)[0];
  return match ? CRUMB_TITLES[match] : "GuitarPicker";
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const io = useCurrentDevices();
  const isFullscreen = pathname.startsWith("/play/") || (pathname.startsWith("/karaoke/") && pathname !== "/karaoke");

  if (isFullscreen) return <>{children}</>;

  return (
    <div className={styles.app}>
      <aside className={styles.sidebar}>
        <Link href="/" className={styles.brand}>
          <Image src="/logo.svg" alt="" width={28} height={28} className={styles.brandMark} />
          <span className={styles.brandText}>
            <strong>GuitarPicker</strong>
            <span>learn · play · grow</span>
          </span>
        </Link>
        <nav className={styles.nav}>
          {NAV.map((group) => (
            <div key={group.label}>
              <div className={styles.navSep}>{group.label}</div>
              {group.items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`${styles.navItem} ${isActive(pathname, item.href) ? styles.active : ""}`}
                >
                  <span className={styles.ico}>{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              ))}
            </div>
          ))}
        </nav>
        <div className={styles.sidebarFoot}>
          <div className={styles.ioIndicator} title="Input / output devices">
            <span className={styles.ioRow}>
              <span className={`${styles.ioDot} ${styles.ioDotIn} ${io.micLive ? styles.ioLive : ""}`} />
              <span>{io.input || "no mic"}</span>
            </span>
            <span className={styles.ioRow}>
              <span className={`${styles.ioDot} ${styles.ioDotOut}`} />
              <span>{io.output}</span>
            </span>
          </div>
          <span className={styles.pilotBadge}>FSD/Next/RQ/TS pilot</span>
        </div>
      </aside>

      <main className={styles.main}>
        <header className={styles.topbar}>
          <div className={styles.crumb}>{crumbFor(pathname)}</div>
        </header>
        <section className={styles.view}>{children}</section>
      </main>
    </div>
  );
}
