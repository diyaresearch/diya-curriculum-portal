import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import { app as firebaseApp } from '../firebase/firebaseConfig';

const LessonDetails = () => {
    const { id } = useParams();
    const [lesson, setLesson] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchLesson = async () => {
            try {
                const db = getFirestore(firebaseApp);
                const lessonDoc = await getDoc(doc(db, 'lesson', id));

                if (lessonDoc.exists()) {
                    setLesson({ id: lessonDoc.id, ...lessonDoc.data() });
                } else {
                    console.log('No such lesson!');
                }
            } catch (error) {
                console.error('Error fetching lesson:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchLesson();
    }, [id]);

    if (loading) return <div>Loading...</div>;
    if (!lesson) return <div>Lesson not found</div>;

    return (
        <div style={{ padding: '40px' }}>
            <h1>{lesson.title}</h1>
            <p>{lesson.description}</p>
        </div>
    );
};

export default LessonDetails;
