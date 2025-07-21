import { useEffect, useState } from "react";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";

export default function useUserData() {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoading(true);
      if (firebaseUser) {
        setUser(firebaseUser);
        // Check teachers first
        const teacherDoc = await getDoc(doc(db, "teachers", firebaseUser.uid));
        if (teacherDoc.exists()) {
          setUserData(teacherDoc.data());
          setLoading(false);
          return;
        }
        // Then check students
        const studentDoc = await getDoc(doc(db, "students", firebaseUser.uid));
        if (studentDoc.exists()) {
          setUserData(studentDoc.data());
          setLoading(false);
          return;
        }
        setUserData(null);
        setLoading(false);
      } else {
        setUser(null);
        setUserData(null);
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  return { user, userData, loading };
}
