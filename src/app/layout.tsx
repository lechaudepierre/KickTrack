import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
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
    icons: {
        icon: "/icons/kicktracker_logo.png",
        apple: "/icons/kicktracker_logo.png",
    },
};

export const viewport: Viewport = {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
    themeColor: "#1B5E20",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="fr">
            <body className={`${inter.variable} font-sans antialiased`}>
                {children}
            </body>
        </html>
    );
}

