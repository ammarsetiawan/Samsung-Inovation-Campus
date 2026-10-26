"use client";

import { styles } from "@/lib/styles";

interface FooterProps {
  activeTopic: string;
}

export function Footer({ activeTopic }: FooterProps) {
  return (
    <footer className={styles.dashFooter}>
      <div className={styles.footerGroup}>
        <span className={styles.footerTag}>SIC IOT PLATFORM v2.4.2</span>
        <span className={styles.footerSep}>|</span>
        <span className={styles.footerTag}>TACTICAL MONITORING</span>
      </div>
      <div className={styles.footerGroup}>
        <span className={styles.footerTag}>CONSUMER MODE</span>
        <span className={styles.footerSep}>|</span>
        <span className={styles.footerTag}>TOPIC: {activeTopic}</span>
      </div>
      <div className={styles.footerGroup}>
        <span className={styles.footerTag}>EMQX WSS</span>
        <span className={styles.footerSep}>|</span>
        <span className={styles.footerTag}>ACTIVE LINK</span>
      </div>
    </footer>
  );
}
