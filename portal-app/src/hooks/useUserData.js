import { useState, useEffect } from 'react';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase/firebaseConfig';

// Define the users collection
const SCHEMA_QUALIFIER = `${process.env.REACT_APP_DATABASE_SCHEMA_QUALIFIER}`;
const TABLE_USERS =  SCHEMA_QUALIFIER + "users"; 

console.log('useUserData table users is', TABLE_USERS)

const useUserData = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const userDoc = doc(getFirestore(), TABLE_USERS, user.uid);
        const userSnapshot = await getDoc(userDoc);
        if (userSnapshot.exists()) {
          setUser({ ...userSnapshot.data(), email: user.email });
        } else {
          console.error('User does not exist in Firestore');
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return { user, loading };
};

export default useUserData;
