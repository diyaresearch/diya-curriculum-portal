import { useEffect, useState } from "react";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";

export default function useUserData() {
  const [userData, setUserData] = useState(null);

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Check teachers first
        const teacherDoc = await getDoc(doc(db, "teachers", firebaseUser.uid));
        if (teacherDoc.exists()) {
          setUserData(teacherDoc.data());
          return;
        }
        // Then check students
        const studentDoc = await getDoc(doc(db, "students", firebaseUser.uid));
        if (studentDoc.exists()) {
          setUserData(studentDoc.data());
          return;
        }
        setUserData(null);
      } else {
        setUserData(null);
      }
    });
    return () => unsubscribe();
  }, []);

  return { userData };
}
