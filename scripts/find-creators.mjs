import { initializeApp } from 'firebase/app';
import { getFirestore, collection, query, where, getDocs } from 'firebase/firestore';

const app = initializeApp({
  apiKey: 'AIzaSyAhgMW_rNOrKZiFkOW7SmhClsBET6l_Qrk',
  authDomain: 'kicktrack-ccd89.firebaseapp.com',
  projectId: 'kicktrack-ccd89',
});
const db = getFirestore(app);

const usernames = ['Astroboy', 'Pigeon opu BAGARRE', 'lechauvepierre'];
const q = query(collection(db, 'users'), where('username', 'in', usernames));
const snap = await getDocs(q);
snap.forEach(d => {
  const data = d.data();
  console.log(`${data.username} -> ${data.userId}`);
});
process.exit(0);
