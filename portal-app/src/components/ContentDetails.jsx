import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import { app as firebaseApp } from '../firebase/firebaseConfig';

const ContentDetails = () => {
    const { id } = useParams();
    const [content, setContent] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchContent = async () => {
            try {
                const db = getFirestore(firebaseApp);
                const contentDoc = await getDoc(doc(db, 'content', id));

                if (contentDoc.exists()) {
                    setContent({ id: contentDoc.id, ...contentDoc.data() });
                } else {
                    console.log('No such content!');
                }
            } catch (error) {
                console.error('Error fetching content:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchContent();
    }, [id]);

    if (loading) return <div>Loading...</div>;
    if (!content) return <div>Content not found</div>;

    return (
        <div style={{ padding: '40px' }}>
            <h1>{content.title}</h1>
            <p>{content.description}</p>
        </div>
    );
};

export default ContentDetails;