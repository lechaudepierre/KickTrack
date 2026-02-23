import { initializeApp } from 'firebase/app';
import { getFirestore, collection, query, where, getDocs } from 'firebase/firestore';
import { getAuth, signInAnonymously } from 'firebase/auth';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const app = initializeApp({
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
});
const db = getFirestore(app);
const auth = getAuth(app);

async function main() {
    await signInAnonymously(auth);
    const usernames = ['Astroboy', 'Pigeon opu BAGARRE', 'lechauvepierre'];
    const q = query(collection(db, 'users'), where('username', 'in', usernames));
    const snap = await getDocs(q);
    snap.forEach(d => {
        const data = d.data() as { username: string; userId: string };
        console.log(`${data.username} -> ${data.userId}`);
    });
    process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });
