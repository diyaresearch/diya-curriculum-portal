import { useState, useEffect } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { COLLECTIONS } from "../firebase/collectionNames";

// Tracks the signed-in user and their role via a realtime listener on their
// users/{uid} document, so role changes (e.g. an admin upgrade) are picked
// up without a page reload. This was previously duplicated verbatim across
// ForTeachersSection.jsx, ForStudentsSection.jsx, TestimonialsSection.jsx,
// and ExploreModulesSection.jsx (#409) - it's intentionally distinct from
// hooks/useUserData.js, which does a one-time fetch and also exposes
// `logout`/`loading` for the many pages that already depend on that shape.
function useUserRole() {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);

  useEffect(() => {
    const auth = getAuth();
    let unsubUser = null;

    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setRole(null);
      if (firebaseUser) {
        unsubUser = onSnapshot(doc(db, COLLECTIONS.users, firebaseUser.uid), (userDoc) => {
          setRole(userDoc.exists() ? userDoc.data().role : null);
        });
      }
    });

    return () => {
      if (typeof unsubscribe === "function") unsubscribe();
      if (typeof unsubUser === "function") unsubUser();
    };
  }, []);

  return { user, role };
}

export default useUserRole;
