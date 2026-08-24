import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";

const inter = Inter({
    subsets: ["latin"],
    variable: "--font-inter",
});

export const metadata: Metadata = {
    title: "KickTracker - Suivi de Babyfoot",
    description: "Trackez et gérez vos parties de babyfoot avec KickTracker. Statistiques, classements et parties multijoueurs.",
    manifest: "/manifest.json",
    appleWebApp: {
        capable: true,
        statusBarStyle: "black-translucent",
        title: "KickTracker",
    },
};

export const viewport: Viewport = {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
    // Couleur littérale obligatoire : c'est une méta-donnée PWA lue par le
    // système d'exploitation, pas du CSS — une variable n'y serait pas résolue.
    // Doit rester alignée sur --field-dark dans styles/variables.css.
    themeColor: "#1D5A20",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="fr">
            <body className={inter.variable}>
                {children}
                <Analytics />
                <SpeedInsights />
            </body>
        </html>
    );
}

