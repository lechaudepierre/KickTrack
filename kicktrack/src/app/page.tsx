import Link from 'next/link';
import { FieldBackground } from '@/components/FieldDecorations';
import styles from './page.module.css';

export default function HomePage() {
    return (
        <div className="min-h-screen bg-[#0F172A] relative flex flex-col items-center justify-center p-6">
            <FieldBackground />

            <div className={styles.container}>
                {/* Logo - Minimalist football icon */}
                <div className={styles.logoSection}>
                    <div className={styles.logoIcon}>
                        <div className={styles.footballIcon}>
                            <div className={styles.footballOuter} />
                            <div className={styles.footballInner} />
                            <div className={styles.footballCenter}>
                                <div className={styles.footballCenterCircle} />
                            </div>
                            <div className={styles.footballPentagon} />
                        </div>
                    </div>

                    <h1 className={styles.title}>
                        KICK<span className={styles.titleAccent}>TRACK</span>
                    </h1>
                    <div className={styles.titleUnderline} />
                    <p className={styles.subtitle}>
                        Tracker de baby-foot
                    </p>
                </div>

                {/* Stats Preview - Minimalist cards */}
                <div className={styles.statsGrid}>
                    <div className={styles.statCard}>
                        <div className={styles.statCardAccent} />
                        <div className={styles.statIcon}>∞</div>
                        <div className={styles.statLabel}>Parties</div>
                    </div>
                    <div className={styles.statCard}>
                        <div className={styles.statCardAccent} />
                        <div className={styles.statIcon}>⚡</div>
                        <div className={styles.statLabel}>Live</div>
                    </div>
                    <div className={styles.statCard}>
                        <div className={styles.statCardAccent} />
                        <div className={styles.statIcon}>🏆</div>
                        <div className={styles.statLabel}>Classement</div>
                    </div>
                </div>

                {/* CTA Buttons */}
                <div className={styles.ctaButtons}>
                    <Link href="/login" className="block group">
                        <div className="btn-primary">
                            <div className="btn-primary-shadow" />
                            <div className="btn-primary-content">
                                SE CONNECTER
                            </div>
                        </div>
                    </Link>

                    <Link href="/register" className="block group">
                        <div className="btn-secondary">
                            <div className="btn-secondary-shadow" />
                            <div className="btn-secondary-content">
                                CRÉER UN COMPTE
                            </div>
                        </div>
                    </Link>
                </div>

                {/* Footer tagline */}
                <div className={styles.footer}>
                    <div className={styles.footerDivider} />
                    <p className={styles.footerText}>
                        Track • Play • Win
                    </p>
                    <div className={styles.footerDivider} />
                </div>
            </div>
        </div>
    );
}
