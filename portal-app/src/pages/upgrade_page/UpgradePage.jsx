import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useUserData from '../../hooks/useUserData';

const UpgradePage = () => {
    const navigate = useNavigate();
    const { user, userData } = useUserData();
    const [showContactModal, setShowContactModal] = useState(false);

    // Determine current plan based on user data
    const currentPlan = userData?.subscriptionType || 'basic';

    // Debug logging to understand the issue
    console.log('=== UpgradePage Debug ===');
    console.log('userData:', userData);
    console.log('currentPlan:', currentPlan);
    console.log('userRole:', userData?.role);
    console.log('subscriptionType:', userData?.subscriptionType);
    console.log('========================');

    const handleUpgradeClick = (planType = 'premium') => {
        console.log('=== handleUpgradeClick Debug ===');
        console.log('Button clicked!');
        console.log('User role:', userData?.role);
        console.log('Current plan:', currentPlan);
        console.log('Target plan:', planType);
        console.log('================================');

        // Check if user is authenticated
        if (!user || !userData) {
            alert('Please log in to upgrade your account');
            return;
        }

        // Navigate directly to the appropriate payment page
        if (planType === 'premium') {
            console.log('Navigating to monthly premium payment page');
            navigate('/payment/premium');
        } else if (planType === 'premiumYearly') {
            console.log('Navigating to yearly premium payment page');
            navigate('/payment/yearly');
        } else {
            console.log('Fallback navigation for plan:', planType);
            // Fallback for any other plan types
            navigate(`/payment/${planType}`);
        }
    };

    const handleContactSales = async () => {
        try {
            // Get the server URL from environment
            const serverUrl = process.env.REACT_APP_SERVER_ORIGIN_URL || 'http://localhost:3001';

            const response = await fetch(`${serverUrl}/api/subscription/enterprise-contact`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${await user?.getIdToken()}`
                },
                body: JSON.stringify({
                    message: 'Enterprise plan inquiry',
                    contactPreference: 'email'
                })
            });

            const result = await response.json();

            if (response.ok) {
                alert('Enterprise contact request submitted successfully! Our team will reach out to you soon.');
            } else {
                console.error('Contact request failed:', result.message);
            }
        } catch (error) {
            console.error('Error submitting contact request:', error);
        }

        setShowContactModal(true);
    };

    const closeContactModal = () => {
        setShowContactModal(false);
    };

    return (
        <div style={{
            minHeight: '100vh',
            background: '#F6F8FA',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: '40px 20px'
        }}>
            {/* Header Section */}
            <div style={{
                textAlign: 'center',
                marginBottom: '60px',
                maxWidth: '600px'
            }}>
                <h1 style={{
                    fontSize: '2.5rem',
                    fontWeight: '700',
                    color: '#111',
                    fontFamily: 'Open Sans, sans-serif',
                    margin: '0 0 20px 0',
                    letterSpacing: '1px'
                }}>
                    Choose Your Plan
                </h1>
                <p style={{
                    fontSize: '1.15rem',
                    color: '#222',
                    lineHeight: 1.6,
                    marginBottom: '30px'
                }}>
                    The Teacher Default account offers access to core teaching resources and standard features for effective lesson delivery. The Teacher Premium account adds the ability to create custom modules, lessons, and nuggets, plus full access to all locked and unlocked content. This makes it ideal for educators seeking maximum flexibility and creative control in their teaching.
                </p>
            </div>

            {/* Subscription Plans Section */}
            <div style={{
                width: '100%',
                maxWidth: '1400px',
                marginBottom: '40px'
            }}>
                <h2 style={{
                    fontSize: '2rem',
                    fontWeight: '700',
                    color: '#111',
                    textAlign: 'center',
                    marginBottom: '40px',
                    fontFamily: 'Open Sans, sans-serif'
                }}>
                    Subscription Plans
                </h2>

                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                    gap: '25px',
                    padding: '0 20px',
                    alignItems: 'stretch'
                }}>
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
                            <div style={{
                                position: 'absolute',
                                top: '-10px',
                                left: '50%',
                                transform: 'translateX(-50%)',
                                background: '#F9C74F',
                                color: '#000',
                                padding: '5px 20px',
                                borderRadius: '20px',
                                fontSize: '0.9rem',
                                fontWeight: '600'
                            }}>
                                CURRENT PLAN
                            </div>
                        )}
                        <div style={{ flex: '1', display: 'flex', flexDirection: 'column' }}>
                            <div style={{
                                background: '#f0f0f0',
                                borderRadius: '8px',
                                padding: '20px',
                                marginBottom: '20px',
                                minHeight: '120px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}>
                                <img
                                    src="https://cdn-icons-png.flaticon.com/512/167/167707.png"
                                    alt="Basic Plan"
                                    style={{ width: '48px', height: '48px', opacity: 0.7 }}
                                />
                            </div>
                            <h3 style={{
                                fontSize: '1.5rem',
                                fontWeight: '700',
                                color: '#162040',
                                marginBottom: '15px'
                            }}>
                                Basic
                            </h3>
                            <ul style={{
                                color: '#666',
                                lineHeight: 1.6,
                                marginBottom: '20px',
                                minHeight: '140px',
                                textAlign: 'left',
                                paddingLeft: '20px',
                                flex: '1'
                            }}>
                                <li>Access to selected free modules</li>
                                <li>Basic lesson viewing</li>
                                <li>Community access</li>
                                <li>Basic support</li>
                            </ul>
                            <div style={{
                                fontSize: '1.2rem',
                                fontWeight: '600',
                                color: '#162040',
                                marginBottom: '20px'
                            }}>
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
                            <div style={{
                                position: 'absolute',
                                top: '-10px',
                                left: '50%',
                                transform: 'translateX(-50%)',
                                background: '#F9C74F',
                                color: '#000',
                                padding: '5px 20px',
                                borderRadius: '20px',
                                fontSize: '0.9rem',
                                fontWeight: '600'
                            }}>
                                CURRENT PLAN
                            </div>
                        ) : (
                            <div style={{
                                position: 'absolute',
                                top: '-10px',
                                left: '50%',
                                transform: 'translateX(-50%)',
                                background: '#162040',
                                color: '#fff',
                                padding: '5px 20px',
                                borderRadius: '20px',
                                fontSize: '0.9rem',
                                fontWeight: '600'
                            }}>
                                POPULAR
                            </div>
                        )}
                        <div style={{ flex: '1', display: 'flex', flexDirection: 'column' }}>
                            <div style={{
                                background: '#f0f0f0',
                                borderRadius: '8px',
                                padding: '20px',
                                marginBottom: '20px',
                                minHeight: '120px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}>
                                <img
                                    src="https://cdn-icons-png.flaticon.com/512/1828/1828884.png"
                                    alt="Monthly Premium Plan"
                                    style={{ width: '48px', height: '48px', opacity: 0.7 }}
                                />
                            </div>
                            <h3 style={{
                                fontSize: '1.5rem',
                                fontWeight: '700',
                                color: '#162040',
                                marginBottom: '15px'
                            }}>
                                Monthly Premium
                            </h3>
                            <ul style={{
                                color: '#666',
                                lineHeight: 1.6,
                                marginBottom: '20px',
                                minHeight: '140px',
                                textAlign: 'left',
                                paddingLeft: '20px',
                                flex: '1'
                            }}>
                                <li>All Free features</li>
                                <li>Comprehensive lesson module creation</li>
                                <li>Community sharing</li>
                                <li>Advanced lesson generator</li>
                                <li>Priority support</li>
                            </ul>
                            <div style={{
                                fontSize: '1.2rem',
                                fontWeight: '600',
                                color: '#162040',
                                marginBottom: '20px'
                            }}>
                                $9.99/month
                            </div>
                        </div>
                        <button
                            onClick={() => handleUpgradeClick('premium')}
                            disabled={(() => {
                                const userRole = userData?.role;
                                const isTeacherDefault = userRole === 'teacherDefault';
                                const isPremium = currentPlan === 'premium';
                                return isPremium && !isTeacherDefault;
                            })()}
                            style={{
                                width: '100%',
                                background: (() => {
                                    const userRole = userData?.role;
                                    const isTeacherDefault = userRole === 'teacherDefault';
                                    const isPremium = currentPlan === 'premium';
                                    if (isPremium && !isTeacherDefault) {
                                        return '#F9C74F';
                                    }
                                    return '#162040';
                                })(),
                                color: (() => {
                                    const userRole = userData?.role;
                                    const isTeacherDefault = userRole === 'teacherDefault';
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
                                    const isTeacherDefault = userRole === 'teacherDefault';
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
                                const isTeacherDefault = userRole === 'teacherDefault';
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
                            <div style={{
                                position: 'absolute',
                                top: '-10px',
                                left: '50%',
                                transform: 'translateX(-50%)',
                                background: '#F9C74F',
                                color: '#000',
                                padding: '5px 20px',
                                borderRadius: '20px',
                                fontSize: '0.9rem',
                                fontWeight: '600'
                            }}>
                                CURRENT PLAN
                            </div>
                        ) : (
                            <div style={{
                                position: 'absolute',
                                top: '-10px',
                                left: '50%',
                                transform: 'translateX(-50%)',
                                background: '#28a745',
                                color: '#fff',
                                padding: '5px 20px',
                                borderRadius: '20px',
                                fontSize: '0.9rem',
                                fontWeight: '600'
                            }}>
                                SAVE 17%
                            </div>
                        )}
                        <div style={{ flex: '1', display: 'flex', flexDirection: 'column' }}>
                            <div style={{
                                background: '#f0f0f0',
                                borderRadius: '8px',
                                padding: '20px',
                                marginBottom: '20px',
                                minHeight: '120px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}>
                                <img
                                    src="https://cdn-icons-png.flaticon.com/512/3039/3039393.png"
                                    alt="Yearly Premium Plan"
                                    style={{ width: '48px', height: '48px', opacity: 0.7 }}
                                />
                            </div>
                            <h3 style={{
                                fontSize: '1.5rem',
                                fontWeight: '700',
                                color: '#162040',
                                marginBottom: '15px'
                            }}>
                                Yearly Premium
                            </h3>
                            <ul style={{
                                color: '#666',
                                lineHeight: 1.6,
                                marginBottom: '20px',
                                minHeight: '140px',
                                textAlign: 'left',
                                paddingLeft: '20px',
                                flex: '1'
                            }}>
                                <li>All Premium features</li>
                                <li>Comprehensive lesson module creation</li>
                                <li>Community sharing</li>
                                <li>Advanced lesson generator</li>
                                <li>Priority support</li>
                                <li style={{ color: '#28a745', fontWeight: '600' }}>Save $20 per year</li>
                            </ul>
                            <div style={{
                                fontSize: '1.2rem',
                                fontWeight: '600',
                                color: '#162040',
                                marginBottom: '5px'
                            }}>
                                $100.00/year
                            </div>
                            <div style={{
                                fontSize: '0.9rem',
                                color: '#28a745',
                                fontWeight: '600',
                                marginBottom: '20px'
                            }}>
                                ($8.33/month)
                            </div>
                        </div>
                        <button
                            onClick={() => handleUpgradeClick('premiumYearly')}
                            disabled={(() => {
                                const userRole = userData?.role;
                                const isTeacherDefault = userRole === 'teacherDefault';
                                const isPremiumYearly = currentPlan === 'premiumYearly';
                                return isPremiumYearly && !isTeacherDefault;
                            })()}
                            style={{
                                width: '100%',
                                background: (() => {
                                    const userRole = userData?.role;
                                    const isTeacherDefault = userRole === 'teacherDefault';
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
                                    const isTeacherDefault = userRole === 'teacherDefault';
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
                                const isTeacherDefault = userRole === 'teacherDefault';
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
                            <div style={{
                                position: 'absolute',
                                top: '-10px',
                                left: '50%',
                                transform: 'translateX(-50%)',
                                background: '#F9C74F',
                                color: '#000',
                                padding: '5px 20px',
                                borderRadius: '20px',
                                fontSize: '0.9rem',
                                fontWeight: '600'
                            }}>
                                CURRENT PLAN
                            </div>
                        )}
                        <div style={{ flex: '1', display: 'flex', flexDirection: 'column' }}>
                            <div style={{
                                background: '#f0f0f0',
                                borderRadius: '8px',
                                padding: '20px',
                                marginBottom: '20px',
                                minHeight: '120px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}>
                                <img
                                    src="https://cdn-icons-png.flaticon.com/512/684/684809.png"
                                    alt="Enterprise Plan"
                                    style={{ width: '48px', height: '48px', opacity: 0.7 }}
                                />
                            </div>
                            <h3 style={{
                                fontSize: '1.5rem',
                                fontWeight: '700',
                                color: '#162040',
                                marginBottom: '15px'
                            }}>
                                Enterprise
                            </h3>
                            <ul style={{
                                color: '#666',
                                lineHeight: 1.6,
                                marginBottom: '20px',
                                minHeight: '140px',
                                textAlign: 'left',
                                paddingLeft: '20px',
                                flex: '1'
                            }}>
                                <li>All Premium features</li>
                                <li>Tailored pricing</li>
                                <li>Dedicated onboarding</li>
                                <li>Custom integrations</li>
                                <li>24/7 dedicated support</li>
                            </ul>
                            <div style={{
                                fontSize: '1.2rem',
                                fontWeight: '600',
                                color: '#162040',
                                marginBottom: '20px'
                            }}>
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
                    zIndex: 1000
                }}>
                    <div style={{
                        background: '#fff',
                        borderRadius: '12px',
                        padding: '40px',
                        maxWidth: '500px',
                        width: '90%',
                        textAlign: 'center',
                        position: 'relative'
                    }}>
                        <button
                            onClick={closeContactModal}
                            style={{
                                position: 'absolute',
                                top: '15px',
                                right: '20px',
                                background: 'none',
                                border: 'none',
                                fontSize: '1.5rem',
                                cursor: 'pointer',
                                color: '#666'
                            }}
                        >
                            ×
                        </button>
                        <h3 style={{
                            fontSize: '1.8rem',
                            fontWeight: '700',
                            color: '#162040',
                            marginBottom: '20px'
                        }}>
                            Contact Sales
                        </h3>
                        <p style={{
                            color: '#666',
                            marginBottom: '30px',
                            lineHeight: 1.6
                        }}>
                            Ready to transform your educational experience? Our sales team is here to help you find the perfect Enterprise solution.
                        </p>
                        <div style={{
                            display: 'flex',
                            justifyContent: 'center'
                        }}>
                            <a
                                href="mailto:sales@diya.education?subject=Enterprise%20Plan%20Inquiry"
                                style={{
                                    background: '#162040',
                                    color: '#fff',
                                    padding: '12px 24px',
                                    borderRadius: '6px',
                                    textDecoration: 'none',
                                    fontWeight: '600',
                                    transition: 'background 0.2s',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '8px'
                                }}
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