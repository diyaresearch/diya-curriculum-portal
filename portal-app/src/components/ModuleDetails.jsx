import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import { app as firebaseApp } from '../firebase/firebaseConfig';

const ModuleDetails = () => {
    const { id } = useParams();
    const [module, setModule] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchModule = async () => {
            try {
                const db = getFirestore(firebaseApp);
                const moduleDoc = await getDoc(doc(db, 'module', id));

                if (moduleDoc.exists()) {
                    setModule({ id: moduleDoc.id, ...moduleDoc.data() });
                } else {
                    console.log('No such module!');
                }
            } catch (error) {
                console.error('Error fetching module:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchModule();
    }, [id]);

    if (loading) return <div>Loading...</div>;
    if (!module) return <div>Module not found</div>;

    return (
        <div style={{ padding: '40px' }}>
            <h1>{module.title}</h1>
            <p>{module.description}</p>
            <img src={module.image} alt={module.title} style={{ maxWidth: '100%' }} />
        </div>
    );
};

export default ModuleDetails;