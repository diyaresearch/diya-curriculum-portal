import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useUserData from '@/hooks/useUserData';
import { api } from '@/utils/apiClient';
import { useToast } from "@/components/ui/ToastProvider";
import { ROLES } from "@/constants/roles";

const UpgradePage = () => {
  const toast = useToast();
    const navigate = useNavigate();
    const { user, userData } = useUserData();
    const [showContactModal, setShowContactModal] = useState(false);

    // Determine current plan based on user data
    const currentPlan = userData?.subscriptionType || 'basic';

    const handleUpgradeClick = (planType = 'premium') => {
        // Check if user is authenticated
        if (!user || !userData) {
            toast.error('Please log in to upgrade your account');
            return;
        }

        // Navigate directly to the appropriate payment page. There is no
        // fallback branch: the only two callers pass these two values, and the
        // `/payment/${planType}` fallback that used to be here matched no route (#442).
        navigate(planType === 'premiumYearly' ? '/payment/yearly' : '/payment/premium');
    };

    const handleContactSales = async () => {
        try {
            await api.post('/api/subscription/enterprise-contact', {
                message: 'Enterprise plan inquiry',
                contactPreference: 'email'
            });
            toast.success('Enterprise contact request submitted successfully! Our team will reach out to you soon.');
        } catch (error) {
            // A non-2xx now throws, so the old response.ok branch and the
            // catch collapse into one path.
            console.error('Error submitting contact request:', error);
        }

        setShowContactModal(true);
    };

    const closeContactModal = () => {
        setShowContactModal(false);
    };

    return (
        <div className="min-h-screen bg-surface-subtle flex flex-col items-center py-10 px-5">
            {/* Header Section */}
            <div className="text-center mb-15 max-w-150">
                <h1 className="text-page-title font-bold text-ink-strong font-sans mt-0 mr-0 mb-5 ml-0 tracking-[1px]">
                    Choose Your Plan
                </h1>
                <p className="text-[1.15rem] text-ink leading-[1.6] mb-7.5">
                    The Teacher Default account offers access to core teaching resources and standard features for effective lesson delivery. The Teacher Premium account adds the ability to create custom modules, lessons, and nuggets, plus full access to all locked and unlocked content. This makes it ideal for educators seeking maximum flexibility and creative control in their teaching.
                </p>
            </div>

            {/* Subscription Plans Section */}
            <div className="w-full max-w-350 mb-10">
                <h2 className="text-[2rem] font-bold text-ink-strong text-center mb-10 font-sans">
                    Subscription Plans
                </h2>

                <div className="grid [grid-template-columns:repeat(auto-fit,_minmax(280px,_1fr))] gap-[25px] py-0 px-5 items-stretch">
                    {/* Basic Plan */}
                    <div style={{
                        background: '#fff',
                        borderRadius: '12px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                        padding: '30px',
                        textAlign: 'center',
                        position: 'relative',
                        border: currentPlan === 'basic' ? '3px solid #F9C74F' : '2px solid transparent',
                        display: 'flex',
                        flexDirection: 'column'
                    }}>
                        {currentPlan === 'basic' && (
                            <div className="absolute top-[-10px] left-[50%] [transform:translateX(-50%)] bg-accent text-black py-[5px] px-5 rounded-[20px] text-[0.9rem] font-semibold">
                                CURRENT PLAN
                            </div>
                        )}
                        <div className="flex-[1] flex flex-col">
                            <div className="bg-[#f0f0f0] rounded-lg p-5 mb-5 min-h-30 flex items-center justify-center">
                                <img
                                    src="https://cdn-icons-png.flaticon.com/512/167/167707.png"
                                    alt="Basic Plan"
                                    className="w-12 h-12 opacity-70"
                                />
                            </div>
                            <h3 className="text-[1.5rem] font-bold text-navy mb-[15px]">
                                Basic
                            </h3>
                            <ul className="text-ink-muted leading-[1.6] mb-5 min-h-35 text-left pl-5 flex-[1]">
                                <li>Access to selected free modules</li>
                                <li>Basic lesson viewing</li>
                                <li>Community access</li>
                                <li>Basic support</li>
                            </ul>
                            <div className="text-[1.2rem] font-semibold text-navy mb-5">
                                Free
                            </div>
                        </div>
                        <button
                            disabled={currentPlan === 'basic'}
                            style={{
                                width: '100%',
                                background: currentPlan === 'basic' ? '#F9C74F' : '#fff',
                                color: currentPlan === 'basic' ? '#000' : '#162040',
                                border: currentPlan === 'basic' ? 'none' : '2px solid #162040',
                                borderRadius: '6px',
                                padding: '12px 24px',
                                fontWeight: '600',
                                cursor: currentPlan === 'basic' ? 'not-allowed' : 'pointer',
                                transition: 'all 0.2s',
                                opacity: currentPlan === 'basic' ? 1 : 0.8
                            }}
                        >
                            {currentPlan === 'basic' ? 'Current Plan' : 'Select Basic'}
                        </button>
                    </div>

                    {/* Monthly Premium Plan */}
                    <div style={{
                        background: '#fff',
                        borderRadius: '12px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                        padding: '30px',
                        textAlign: 'center',
                        position: 'relative',
                        border: currentPlan === 'premium' ? '3px solid #F9C74F' : '2px solid #162040',
                        display: 'flex',
                        flexDirection: 'column'
                    }}>
                        {currentPlan === 'premium' ? (
                            <div className="absolute top-[-10px] left-[50%] [transform:translateX(-50%)] bg-accent text-black py-[5px] px-5 rounded-[20px] text-[0.9rem] font-semibold">
                                CURRENT PLAN
                            </div>
                        ) : (
                            <div className="absolute top-[-10px] left-[50%] [transform:translateX(-50%)] bg-navy text-white py-[5px] px-5 rounded-[20px] text-[0.9rem] font-semibold">
                                POPULAR
                            </div>
                        )}
                        <div className="flex-[1] flex flex-col">
                            <div className="bg-[#f0f0f0] rounded-lg p-5 mb-5 min-h-30 flex items-center justify-center">
                                <img
                                    src="https://cdn-icons-png.flaticon.com/512/1828/1828884.png"
                                    alt="Monthly Premium Plan"
                                    className="w-12 h-12 opacity-70"
                                />
                            </div>
                            <h3 className="text-[1.5rem] font-bold text-navy mb-[15px]">
                                Monthly Premium
                            </h3>
                            <ul className="text-ink-muted leading-[1.6] mb-5 min-h-35 text-left pl-5 flex-[1]">
                                <li>All Free features</li>
                                <li>Comprehensive lesson module creation</li>
                                <li>Community sharing</li>
                                <li>Advanced lesson generator</li>
                                <li>Priority support</li>
                            </ul>
                            <div className="text-[1.2rem] font-semibold text-navy mb-5">
                                $9.99/month
                            </div>
                        </div>
                        <button
                            onClick={() => handleUpgradeClick('premium')}
                            disabled={(() => {
                                const userRole = userData?.role;
                                const isTeacherDefault = userRole === ROLES.TEACHER_DEFAULT;
                                const isPremium = currentPlan === 'premium';
                                return isPremium && !isTeacherDefault;
                            })()}
                            style={{
                                width: '100%',
                                background: (() => {
                                    const userRole = userData?.role;
                                    const isTeacherDefault = userRole === ROLES.TEACHER_DEFAULT;
                                    const isPremium = currentPlan === 'premium';
                                    if (isPremium && !isTeacherDefault) {
                                        return '#F9C74F';
                                    }
                                    return '#162040';
                                })(),
                                color: (() => {
                                    const userRole = userData?.role;
                                    const isTeacherDefault = userRole === ROLES.TEACHER_DEFAULT;
                                    const isPremium = currentPlan === 'premium';
                                    if (isPremium && !isTeacherDefault) {
                                        return '#000';
                                    }
                                    return '#fff';
                                })(),
                                border: 'none',
                                borderRadius: '6px',
                                padding: '12px 24px',
                                fontWeight: '600',
                                cursor: (() => {
                                    const userRole = userData?.role;
                                    const isTeacherDefault = userRole === ROLES.TEACHER_DEFAULT;
                                    const isPremium = currentPlan === 'premium';
                                    if (isPremium && !isTeacherDefault) {
                                        return 'not-allowed';
                                    }
                                    return 'pointer';
                                })(),
                                transition: 'all 0.2s',
                                opacity: 1
                            }}
                            onMouseOver={(e) => {
                                if (currentPlan !== 'premium') {
                                    e.target.style.background = '#fff';
                                    e.target.style.border = '2px solid #162040';
                                    e.target.style.color = '#162040';
                                }
                            }}
                            onMouseOut={(e) => {
                                if (currentPlan !== 'premium') {
                                    e.target.style.background = '#162040';
                                    e.target.style.border = 'none';
                                    e.target.style.color = '#fff';
                                }
                            }}
                        >
                            {(() => {
                                const userRole = userData?.role;
                                const isTeacherDefault = userRole === ROLES.TEACHER_DEFAULT;
                                const isPremium = currentPlan === 'premium';
                                if (isTeacherDefault) {
                                    return 'Upgrade Now';
                                } else if (isPremium) {
                                    return 'Current Plan';
                                } else {
                                    return 'Upgrade Now';
                                }
                            })()}
                        </button>
                    </div>

                    {/* Yearly Premium Plan */}
                    <div style={{
                        background: '#fff',
                        borderRadius: '12px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                        padding: '30px',
                        textAlign: 'center',
                        position: 'relative',
                        border: currentPlan === 'premiumYearly' ? '3px solid #F9C74F' : '2px solid #28a745',
                        display: 'flex',
                        flexDirection: 'column'
                    }}>
                        {currentPlan === 'premiumYearly' ? (
                            <div className="absolute top-[-10px] left-[50%] [transform:translateX(-50%)] bg-accent text-black py-[5px] px-5 rounded-[20px] text-[0.9rem] font-semibold">
                                CURRENT PLAN
                            </div>
                        ) : (
                            <div className="absolute top-[-10px] left-[50%] [transform:translateX(-50%)] bg-success text-white py-[5px] px-5 rounded-[20px] text-[0.9rem] font-semibold">
                                SAVE 17%
                            </div>
                        )}
                        <div className="flex-[1] flex flex-col">
                            <div className="bg-[#f0f0f0] rounded-lg p-5 mb-5 min-h-30 flex items-center justify-center">
                                <img
                                    src="https://cdn-icons-png.flaticon.com/512/3039/3039393.png"
                                    alt="Yearly Premium Plan"
                                    className="w-12 h-12 opacity-70"
                                />
                            </div>
                            <h3 className="text-[1.5rem] font-bold text-navy mb-[15px]">
                                Yearly Premium
                            </h3>
                            <ul className="text-ink-muted leading-[1.6] mb-5 min-h-35 text-left pl-5 flex-[1]">
                                <li>All Premium features</li>
                                <li>Comprehensive lesson module creation</li>
                                <li>Community sharing</li>
                                <li>Advanced lesson generator</li>
                                <li>Priority support</li>
                                <li className="text-success font-semibold">Save $20 per year</li>
                            </ul>
                            <div className="text-[1.2rem] font-semibold text-navy mb-[5px]">
                                $100.00/year
                            </div>
                            <div className="text-[0.9rem] text-success font-semibold mb-5">
                                ($8.33/month)
                            </div>
                        </div>
                        <button
                            onClick={() => handleUpgradeClick('premiumYearly')}
                            disabled={(() => {
                                const userRole = userData?.role;
                                const isTeacherDefault = userRole === ROLES.TEACHER_DEFAULT;
                                const isPremiumYearly = currentPlan === 'premiumYearly';
                                return isPremiumYearly && !isTeacherDefault;
                            })()}
                            style={{
                                width: '100%',
                                background: (() => {
                                    const userRole = userData?.role;
                                    const isTeacherDefault = userRole === ROLES.TEACHER_DEFAULT;
                                    const isPremiumYearly = currentPlan === 'premiumYearly';
                                    if (isPremiumYearly && !isTeacherDefault) {
                                        return '#F9C74F';
                                    }
                                    return '#28a745';
                                })(),
                                color: '#fff',
                                border: 'none',
                                borderRadius: '6px',
                                padding: '12px 24px',
                                fontWeight: '600',
                                cursor: (() => {
                                    const userRole = userData?.role;
                                    const isTeacherDefault = userRole === ROLES.TEACHER_DEFAULT;
                                    const isPremiumYearly = currentPlan === 'premiumYearly';
                                    if (isPremiumYearly && !isTeacherDefault) {
                                        return 'not-allowed';
                                    }
                                    return 'pointer';
                                })(),
                                transition: 'all 0.2s',
                                opacity: 1
                            }}
                            onMouseOver={(e) => {
                                if (currentPlan !== 'premiumYearly') {
                                    e.target.style.background = '#fff';
                                    e.target.style.border = '2px solid #28a745';
                                    e.target.style.color = '#28a745';
                                }
                            }}
                            onMouseOut={(e) => {
                                if (currentPlan !== 'premiumYearly') {
                                    e.target.style.background = '#28a745';
                                    e.target.style.border = 'none';
                                    e.target.style.color = '#fff';
                                }
                            }}
                        >
                            {(() => {
                                const userRole = userData?.role;
                                const isTeacherDefault = userRole === ROLES.TEACHER_DEFAULT;
                                const isPremiumYearly = currentPlan === 'premiumYearly';
                                if (isTeacherDefault) {
                                    return 'Upgrade Now';
                                } else if (isPremiumYearly) {
                                    return 'Current Plan';
                                } else {
                                    return 'Upgrade Now';
                                }
                            })()}
                        </button>
                    </div>

                    {/* Enterprise Plan */}
                    <div style={{
                        background: '#fff',
                        borderRadius: '12px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                        padding: '30px',
                        textAlign: 'center',
                        position: 'relative',
                        border: currentPlan === 'enterprise' ? '3px solid #F9C74F' : '2px solid transparent',
                        display: 'flex',
                        flexDirection: 'column'
                    }}>
                        {currentPlan === 'enterprise' && (
                            <div className="absolute top-[-10px] left-[50%] [transform:translateX(-50%)] bg-accent text-black py-[5px] px-5 rounded-[20px] text-[0.9rem] font-semibold">
                                CURRENT PLAN
                            </div>
                        )}
                        <div className="flex-[1] flex flex-col">
                            <div className="bg-[#f0f0f0] rounded-lg p-5 mb-5 min-h-30 flex items-center justify-center">
                                <img
                                    src="https://cdn-icons-png.flaticon.com/512/684/684809.png"
                                    alt="Enterprise Plan"
                                    className="w-12 h-12 opacity-70"
                                />
                            </div>
                            <h3 className="text-[1.5rem] font-bold text-navy mb-[15px]">
                                Enterprise
                            </h3>
                            <ul className="text-ink-muted leading-[1.6] mb-5 min-h-35 text-left pl-5 flex-[1]">
                                <li>All Premium features</li>
                                <li>Tailored pricing</li>
                                <li>Dedicated onboarding</li>
                                <li>Custom integrations</li>
                                <li>24/7 dedicated support</li>
                            </ul>
                            <div className="text-[1.2rem] font-semibold text-navy mb-5">
                                Contact Us
                            </div>
                        </div>
                        <button
                            onClick={currentPlan === 'enterprise' ? null : handleContactSales}
                            disabled={currentPlan === 'enterprise'}
                            style={{
                                width: '100%',
                                background: currentPlan === 'enterprise' ? '#F9C74F' : '#fff',
                                color: currentPlan === 'enterprise' ? '#000' : '#162040',
                                border: currentPlan === 'enterprise' ? 'none' : '2px solid #162040',
                                borderRadius: '6px',
                                padding: '12px 24px',
                                fontWeight: '600',
                                cursor: currentPlan === 'enterprise' ? 'not-allowed' : 'pointer',
                                transition: 'all 0.2s'
                            }}
                            onMouseOver={(e) => {
                                if (currentPlan !== 'enterprise') {
                                    e.target.style.background = '#162040';
                                    e.target.style.color = '#fff';
                                }
                            }}
                            onMouseOut={(e) => {
                                if (currentPlan !== 'enterprise') {
                                    e.target.style.background = '#fff';
                                    e.target.style.color = '#162040';
                                }
                            }}
                        >
                            {currentPlan === 'enterprise' ? 'Current Plan' : 'Contact Sales'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Contact Sales Modal */}
            {showContactModal && (
                <div className="fixed top-0 left-0 right-0 bottom-0 [background:rgba(0,0,0,0.5)] flex items-center justify-center z-[1000]">
                    <div className="bg-surface rounded-xl p-10 max-w-125 w-[90%] text-center relative">
                        <button
                            onClick={closeContactModal}
                            className="absolute top-[15px] right-5 bg-none border-0 text-[1.5rem] cursor-pointer text-ink-muted"
                        >
                            ×
                        </button>
                        <h3 className="text-[1.8rem] font-bold text-navy mb-5">
                            Contact Sales
                        </h3>
                        <p className="text-ink-muted mb-7.5 leading-[1.6]">
                            Ready to transform your educational experience? Our sales team is here to help you find the perfect Enterprise solution.
                        </p>
                        <div className="flex justify-center">
                            <a
                                href="mailto:sales@diya.education?subject=Enterprise%20Plan%20Inquiry"
                                className="bg-navy text-white py-3 px-6 rounded-md no-underline font-semibold [transition:background_0.2s] inline-flex items-center gap-2"
                                onMouseOver={(e) => e.target.style.background = '#0f1530'}
                                onMouseOut={(e) => e.target.style.background = '#162040'}
                            >
                                Send Email
                            </a>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UpgradePage;