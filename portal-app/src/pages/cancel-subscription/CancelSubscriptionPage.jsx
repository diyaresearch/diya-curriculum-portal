import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useUserData from '@/hooks/useUserData';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/firebase/firebaseConfig';
import { COLLECTIONS } from '@/firebase/collectionNames';
import { useToast } from "@/components/ui/ToastProvider";
import { toUserMessage } from "@/utils/errorMessage";
import Loading from "@/components/ui/Loading";
import { ROLES } from "@/constants/roles";

const CancelSubscriptionPage = () => {
  const toast = useToast();
    const navigate = useNavigate();
    const { user, loading } = useUserData();
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);

    const handleCancelSubscription = async () => {
        setIsProcessing(true);

        try {
            // Update user role directly in Firestore
            const userDocRef = doc(db, COLLECTIONS.users, user.uid);

            await updateDoc(userDocRef, {
                role: ROLES.TEACHER_DEFAULT,
                subscriptionType: 'basic',
                subscriptionStatus: 'cancelled',
                cancelledAt: new Date().toISOString()
            });

            setShowConfirmModal(true);
        } catch (error) {
            console.error('Error cancelling subscription:', error);
            toast.error(toUserMessage(error, 'Error cancelling subscription. Please try again.'));
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
        return <Loading variant="page" />;
    }

    return (
        <div className="min-h-screen bg-navy-soft flex flex-col items-center justify-center py-10 px-5 text-white">
            <div className="bg-surface rounded-xl p-15 max-w-150 w-[90%] text-center text-[#333] shadow-[0_4px_24px_rgba(0,0,0,0.18)]">
                <h1 className="text-[2rem] font-bold text-navy-soft mb-7.5">
                    We're sorry to see you go!
                </h1>

                <p className="text-[1.1rem] text-ink-muted mb-7.5 leading-[1.6]">
                    Before you confirm, please note that by cancelling your Teacher Premium account, you will lose access to:
                </p>

                <ul className="text-left max-w-100 mt-0 mr-auto mb-10 ml-auto text-ink-muted leading-[1.8]">
                    <li>The ability to create your own modules, lessons, and nuggets</li>
                    <li>The full library of locked and unlocked teaching content</li>
                    <li>Exclusive premium teaching tools and resources</li>
                    <li>Priority customer support</li>
                    <li>Advanced classroom management features</li>
                </ul>

                <div className="flex gap-5 justify-center mt-10">
                    <button
                        onClick={() => navigate('/')}
                        className="bg-surface text-navy-soft border-2 border-navy-soft rounded-md py-3 px-8 text-[1rem] font-semibold cursor-pointer [transition:all_0.2s]"
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
                <div className="fixed top-0 left-0 right-0 bottom-0 [background:rgba(0,0,0,0.5)] flex items-center justify-center z-[2000]">
                    <div className="bg-surface rounded-xl p-10 max-w-100 w-[90%] text-center text-[#333]">
                        <div className="w-15 h-15 bg-success rounded-full flex items-center justify-center mt-0 mr-auto mb-5 ml-auto">
                            <svg width="30" height="30" viewBox="0 0 24 24" fill="none">
                                <path d="M20 6L9 17l-5-5" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </div>

                        <h3 className="text-[1.5rem] font-bold text-navy-soft mb-[15px]">
                            Subscription Cancelled
                        </h3>

                        <p className="text-ink-muted mb-7.5 leading-[1.6]">
                            Your subscription has been successfully cancelled. You now have access to the basic teacher features.
                        </p>

                        <button
                            onClick={handleModalOk}
                            className="bg-navy-soft text-white border-0 rounded-md py-3 px-8 text-[1rem] font-semibold cursor-pointer w-full"
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