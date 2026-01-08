// Generate a random PIN code in format ABC-123
export function generatePinCode(): string {
    const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // Removed I and O to avoid confusion
    const numbers = '0123456789';

    let pin = '';

    // Generate 3 letters
    for (let i = 0; i < 3; i++) {
        pin += letters.charAt(Math.floor(Math.random() * letters.length));
    }

    pin += '-';

    // Generate 3 numbers
    for (let i = 0; i < 3; i++) {
        pin += numbers.charAt(Math.floor(Math.random() * numbers.length));
    }

    return pin;
}

// Validate PIN code format
export function validatePinCode(code: string): boolean {
    const pattern = /^[A-Z]{3}-[0-9]{3}$/;
    return pattern.test(code.toUpperCase());
}

// Check if session is expired (5 minutes)
export function isExpired(createdAt: Date, expirationMinutes: number = 5): boolean {
    const now = new Date();
    const expiration = new Date(createdAt);
    expiration.setMinutes(expiration.getMinutes() + expirationMinutes);
    return now > expiration;
}

// Format code for display (ensure uppercase and proper format)
export function formatPinCode(code: string): string {
    const cleaned = code.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    if (cleaned.length >= 6) {
        return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 6)}`;
    }
    return cleaned;
}

// Generate QR code data URL (contains the PIN code and session info)
export function generateQRData(sessionId: string, pinCode: string): string {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    return `${baseUrl}/game/join?code=${pinCode}&session=${sessionId}`;
}

// Calculate remaining time in seconds
export function getRemainingTime(createdAt: Date, expirationMinutes: number = 5): number {
    const now = new Date();
    const expiration = new Date(createdAt);
    expiration.setMinutes(expiration.getMinutes() + expirationMinutes);

    const remaining = Math.floor((expiration.getTime() - now.getTime()) / 1000);
    return Math.max(0, remaining);
}

// Format seconds to mm:ss
export function formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}
