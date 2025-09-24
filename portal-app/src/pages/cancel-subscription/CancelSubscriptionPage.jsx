import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useUserData from '../../hooks/useUserData';
import { getFirestore, doc, updateDoc } from 'firebase/firestore';
import { app as firebaseApp } from '../../firebase/firebaseConfig';

const CancelSubscriptionPage = () => {
    const navigate = useNavigate();
    const { user, userData, loading } = useUserData();
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);

    // Redirect if not authenticated or not teacherPlus
    useEffect(() => {
        if (!loading && (!user || userData?.role !== 'teacherPlus')) {
            navigate('/');
        }
    }, [user, userData, loading, navigate]);

    const handleCancelSubscription = async () => {
        setIsProcessing(true);

        try {
            // Update user role directly in Firestore
            const db = getFirestore(firebaseApp);
            const userDocRef = doc(db, 'teachers', user.uid);

            await updateDoc(userDocRef, {
                role: 'teacherDefault',
                subscriptionType: 'basic',
                subscriptionStatus: 'cancelled',
                cancelledAt: new Date().toISOString()
            });

            setShowConfirmModal(true);
        } catch (error) {
            console.error('Error cancelling subscription:', error);
            alert('Error cancelling subscription. Please try again.');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleModalOk = () => {
        setShowConfirmModal(false);
        // Navigate to home page and force reload to update user data
        navigate('/');
        // Force page reload to refresh user data and navigation
        setTimeout(() => {
            window.location.reload();
        }, 100);
    };

    if (loading) {
        return <div>Loading...</div>;
    }

    return (
        <div style={{
            minHeight: '100vh',
            background: '#242B42',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '40px 20px',
            color: 'white'
        }}>
            <div style={{
                background: '#fff',
                borderRadius: '12px',
                padding: '60px',
                maxWidth: '600px',
                width: '90%',
                textAlign: 'center',
                color: '#333',
                boxShadow: '0 4px 24px rgba(0,0,0,0.18)'
            }}>
                <h1 style={{
                    fontSize: '2rem',
                    fontWeight: '700',
                    color: '#242B42',
                    marginBottom: '30px'
                }}>
                    We're sorry to see you go!
                </h1>

                <p style={{
                    fontSize: '1.1rem',
                    color: '#666',
                    marginBottom: '30px',
                    lineHeight: 1.6
                }}>
                    Before you confirm, please note that by cancelling your Teacher Premium account, you will lose access to:
                </p>

                <ul style={{
                    textAlign: 'left',
                    maxWidth: '400px',
                    margin: '0 auto 40px auto',
                    color: '#666',
                    lineHeight: 1.8
                }}>
                    <li>The ability to create your own modules, lessons, and nuggets</li>
                    <li>The full library of locked and unlocked teaching content</li>
                    <li>Exclusive premium teaching tools and resources</li>
                    <li>Priority customer support</li>
                    <li>Advanced classroom management features</li>
                </ul>

                <div style={{
                    display: 'flex',
                    gap: '20px',
                    justifyContent: 'center',
                    marginTop: '40px'
                }}>
                    <button
                        onClick={() => navigate('/')}
                        style={{
                            background: '#fff',
                            color: '#242B42',
                            border: '2px solid #242B42',
                            borderRadius: '6px',
                            padding: '12px 32px',
                            fontSize: '1rem',
                            fontWeight: '600',
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                        }}
                        onMouseOver={(e) => {
                            e.target.style.background = '#f8f9fa';
                        }}
                        onMouseOut={(e) => {
                            e.target.style.background = '#fff';
                        }}
                    >
                        Keep My Subscription
                    </button>

                    <button
                        onClick={handleCancelSubscription}
                        disabled={isProcessing}
                        style={{
                            background: '#dc3545',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '6px',
                            padding: '12px 32px',
                            fontSize: '1rem',
                            fontWeight: '600',
                            cursor: isProcessing ? 'not-allowed' : 'pointer',
                            opacity: isProcessing ? 0.7 : 1,
                            transition: 'all 0.2s'
                        }}
                        onMouseOver={(e) => {
                            if (!isProcessing) {
                                e.target.style.background = '#c82333';
                            }
                        }}
                        onMouseOut={(e) => {
                            if (!isProcessing) {
                                e.target.style.background = '#dc3545';
                            }
                        }}
                    >
                        {isProcessing ? 'Processing...' : 'Cancel Subscription'}
                    </button>
                </div>
            </div>

            {/* Confirmation Modal */}
            {showConfirmModal && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(0,0,0,0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 2000
                }}>
                    <div style={{
                        background: '#fff',
                        borderRadius: '12px',
                        padding: '40px',
                        maxWidth: '400px',
                        width: '90%',
                        textAlign: 'center',
                        color: '#333'
                    }}>
                        <div style={{
                            width: '60px',
                            height: '60px',
                            background: '#28a745',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            margin: '0 auto 20px auto'
                        }}>
                            <svg width="30" height="30" viewBox="0 0 24 24" fill="none">
                                <path d="M20 6L9 17l-5-5" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </div>

                        <h3 style={{
                            fontSize: '1.5rem',
                            fontWeight: '700',
                            color: '#242B42',
                            marginBottom: '15px'
                        }}>
                            Subscription Cancelled
                        </h3>

                        <p style={{
                            color: '#666',
                            marginBottom: '30px',
                            lineHeight: 1.6
                        }}>
                            Your subscription has been successfully cancelled. You now have access to the basic teacher features.
                        </p>

                        <button
                            onClick={handleModalOk}
                            style={{
                                background: '#242B42',
                                color: '#fff',
                                border: 'none',
                                borderRadius: '6px',
                                padding: '12px 32px',
                                fontSize: '1rem',
                                fontWeight: '600',
                                cursor: 'pointer',
                                width: '100%'
                            }}
                        >
                            Continue
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CancelSubscriptionPage;