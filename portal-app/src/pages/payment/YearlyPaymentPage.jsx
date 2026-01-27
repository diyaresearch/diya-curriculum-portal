import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import useUserData from '../../hooks/useUserData';

// Initialize Stripe with your publishable key
const stripePromise = loadStripe(process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY || 'pk_test_51PYERERqWgqDVRD3kSuQgmgKNIWup77t7Rxsh2mqIsnDDRbCtjuiYh8DCvSO84i5R9FTOgBEzvvr21qHjMGTjvWn00Dwdt2QDv');

const PaymentForm = () => {
    const navigate = useNavigate();
    const { user, userData, loading } = useUserData();
    const stripe = useStripe();
    const elements = useElements();
    const [isProcessing, setIsProcessing] = useState(false);
    const [paymentError, setPaymentError] = useState(null);
    const [paymentSuccess, setPaymentSuccess] = useState(false);

    // Redirect if user is not authenticated
    useEffect(() => {
        if (!loading && !user) {
            navigate('/');
        }
    }, [user, loading, navigate]);

    const handlePayment = async (e) => {
        e.preventDefault();

        if (!stripe || !elements) {
            console.error('Stripe not loaded');
            return;
        }

        setIsProcessing(true);
        setPaymentError(null);

        try {
            const cardElement = elements.getElement(CardElement);

            // Get server URL from environment
            const serverUrl = process.env.REACT_APP_SERVER_ORIGIN_URL || 'http://localhost:3001';
            const token = await user.getIdToken();

            // Step 1: Create payment intent
            const paymentIntentResponse = await fetch(`${serverUrl}/api/payment/create-payment-intent`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    planType: 'premiumYearly'
                })
            });

            const { clientSecret } = await paymentIntentResponse.json();

            if (!paymentIntentResponse.ok) {
                throw new Error('Failed to create payment intent');
            }

            // Step 2: Confirm payment with Stripe
            const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
                payment_method: {
                    card: cardElement,
                    billing_details: {
                        name: userData?.displayName || userData?.email || 'Customer',
                        email: userData?.email || user?.email
                    }
                }
            });

            if (error) {
                console.error('Payment failed:', error);
                setPaymentError(error.message);
                return;
            }

            if (paymentIntent.status === 'succeeded') {
                // Step 3: Confirm payment on backend
                const confirmResponse = await fetch(`${serverUrl}/api/payment/confirm-payment`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        paymentIntentId: paymentIntent.id
                    })
                });

                const confirmResult = await confirmResponse.json();

                if (confirmResponse.ok) {
                    setPaymentSuccess(true);

                    // Navigate based on user role after payment
                    setTimeout(() => {
                        if (userData?.role === 'teacher' || confirmResult.subscriptionType?.includes('premium')) {
                            navigate('/teacherPlus');
                        } else {
                            navigate('/');
                        }
                        // Force reload to update user data
                        setTimeout(() => {
                            window.location.reload();
                        }, 100);
                    }, 2000);
                } else {
                    setPaymentError(confirmResult.message || 'Failed to confirm payment');
                }
            }

        } catch (error) {
            console.error('Error processing payment:', error);
            setPaymentError(error.message || 'Error processing payment. Please try again.');
        } finally {
            setIsProcessing(false);
        }
    };

    if (loading) {
        return (
            <div style={{
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.2rem'
            }}>
                Loading...
            </div>
        );
    }

    if (paymentSuccess) {
        return (
            <div style={{
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: '#F6F8FA'
            }}>
                <div style={{
                    background: '#fff',
                    borderRadius: '12px',
                    padding: '40px',
                    textAlign: 'center',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                    maxWidth: '500px'
                }}>
                    <div style={{
                        fontSize: '3rem',
                        marginBottom: '20px'
                    }}>🎉</div>
                    <h2 style={{
                        color: '#28a745',
                        fontSize: '1.8rem',
                        fontWeight: '700',
                        marginBottom: '15px'
                    }}>
                        Payment Successful!
                    </h2>
                    <p style={{
                        color: '#666',
                        fontSize: '1.1rem',
                        marginBottom: '20px'
                    }}>
                        Welcome to Yearly Premium! You now have access to all premium features.
                    </p>
                    <p style={{
                        color: '#888',
                        fontSize: '0.9rem'
                    }}>
                        Redirecting to your dashboard...
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div style={{
            minHeight: '100vh',
            background: '#F6F8FA',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '40px 20px'
        }}>
            <div style={{
                maxWidth: '900px',
                width: '100%',
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '40px',
                alignItems: 'stretch'
            }}>
                {/* Left Side - Plan Info */}
                <div style={{
                    background: '#242B42',
                    borderRadius: '12px',
                    padding: '40px',
                    color: 'white',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column'
                }}>
                    <h2 style={{
                        fontSize: '1.8rem',
                        fontWeight: '700',
                        marginBottom: '20px',
                        color: 'white'
                    }}>
                        Upgrade to Yearly Premium
                    </h2>

                    <p style={{
                        color: '#B8C5D6',
                        marginBottom: '30px',
                        lineHeight: 1.6
                    }}>
                        Join our premium platform to access enhanced AI and Data Science resources for your classrooms. Save $20 per year!
                    </p>

                    <button
                        onClick={() => navigate('/upgrade')}
                        style={{
                            background: 'transparent',
                            color: '#F9C74F',
                            border: '2px solid #F9C74F',
                            borderRadius: '6px',
                            padding: '10px 20px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            marginBottom: '30px',
                            transition: 'all 0.2s'
                        }}
                        onMouseOver={(e) => {
                            e.target.style.background = '#F9C74F';
                            e.target.style.color = '#242B42';
                        }}
                        onMouseOut={(e) => {
                            e.target.style.background = 'transparent';
                            e.target.style.color = '#F9C74F';
                        }}
                    >
                        ← Back to Plans
                    </button>

                    <div style={{
                        background: 'rgba(255,255,255,0.1)',
                        borderRadius: '8px',
                        padding: '20px',
                        flex: 1
                    }}>
                        <h3 style={{
                            fontSize: '1.2rem',
                            fontWeight: '600',
                            marginBottom: '15px',
                            color: 'white'
                        }}>
                            Yearly Premium Benefits
                        </h3>
                        <ul style={{
                            color: '#B8C5D6',
                            lineHeight: 1.8,
                            paddingLeft: '20px'
                        }}>
                            <li>Comprehensive lesson module creation</li>
                            <li>Advanced AI lesson generator</li>
                            <li>Community sharing and collaboration</li>
                            <li>Access to premium templates</li>
                            <li>Unlimited lesson generation</li>
                            <li>Priority customer support</li>
                            <li style={{ color: '#F9C74F', fontWeight: '600' }}>
                                Save $20 per year compared to monthly billing
                            </li>
                        </ul>
                    </div>
                </div>

                {/* Right Side - Payment Form */}
                <div style={{
                    background: '#fff',
                    borderRadius: '12px',
                    padding: '40px',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column'
                }}>
                    <div style={{
                        background: '#242B42',
                        borderRadius: '8px',
                        padding: '20px',
                        marginBottom: '30px',
                        textAlign: 'center'
                    }}>
                        <h3 style={{
                            color: 'white',
                            fontSize: '1.3rem',
                            fontWeight: '600',
                            marginBottom: '10px'
                        }}>
                            Yearly Premium
                        </h3>
                        <div style={{
                            color: '#F9C74F',
                            fontSize: '2rem',
                            fontWeight: '700'
                        }}>
                            $100.00
                            <span style={{
                                fontSize: '1rem',
                                color: '#B8C5D6',
                                fontWeight: '400'
                            }}>
                                /year
                            </span>
                        </div>
                        <div style={{
                            color: '#28a745',
                            fontSize: '0.9rem',
                            fontWeight: '600',
                            marginTop: '5px'
                        }}>
                            ($8.33/month - Save 17%)
                        </div>
                    </div>

                    <form onSubmit={handlePayment}>
                        <div style={{ marginBottom: '20px' }}>
                            <label style={{
                                display: 'block',
                                fontWeight: '600',
                                marginBottom: '8px',
                                color: '#333'
                            }}>
                                Card Information
                            </label>
                            <div style={{
                                border: '2px solid #e1e5e9',
                                borderRadius: '6px',
                                padding: '12px',
                                background: '#fff'
                            }}>
                                <CardElement
                                    options={{
                                        style: {
                                            base: {
                                                fontSize: '16px',
                                                color: '#424770',
                                                '::placeholder': {
                                                    color: '#aab7c4',
                                                },
                                            },
                                            invalid: {
                                                color: '#9e2146',
                                            },
                                        },
                                    }}
                                />
                            </div>
                        </div>

                        {paymentError && (
                            <div style={{
                                background: '#f8d7da',
                                color: '#721c24',
                                padding: '12px',
                                borderRadius: '6px',
                                marginBottom: '20px',
                                border: '1px solid #f5c6cb'
                            }}>
                                {paymentError}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={isProcessing || !stripe || !elements}
                            style={{
                                width: '100%',
                                background: '#242B42',
                                color: '#fff',
                                border: 'none',
                                borderRadius: '6px',
                                padding: '15px',
                                fontSize: '1.1rem',
                                fontWeight: '600',
                                cursor: (isProcessing || !stripe || !elements) ? 'not-allowed' : 'pointer',
                                opacity: (isProcessing || !stripe || !elements) ? 0.7 : 1,
                                transition: 'all 0.2s'
                            }}
                            onMouseOver={(e) => {
                                if (!isProcessing && stripe && elements) {
                                    e.target.style.background = '#1a1f35';
                                }
                            }}
                            onMouseOut={(e) => {
                                if (!isProcessing && stripe && elements) {
                                    e.target.style.background = '#242B42';
                                }
                            }}
                        >
                            {isProcessing ? 'Processing...' : 'Complete Payment - $100.00'}
                        </button>

                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '10px',
                            marginTop: '20px',
                            color: '#666',
                            fontSize: '0.9rem'
                        }}>
                            <span>🔒</span>
                            <span>SSL Secured</span>
                            <span>🔒</span>
                            <span>Stripe Secured</span>
                        </div>

                        <p style={{
                            textAlign: 'center',
                            color: '#888',
                            fontSize: '0.85rem',
                            marginTop: '15px',
                            lineHeight: 1.4
                        }}>
                            Your payment information is secure and encrypted by Stripe. You can cancel anytime from your account settings.
                        </p>

                        <div style={{
                            background: '#f8f9fa',
                            borderRadius: '6px',
                            padding: '15px',
                            marginTop: '20px',
                            fontSize: '0.85rem',
                            color: '#666'
                        }}>
                            <strong>Test Card Numbers:</strong>
                            <br />
                            • 4242 4242 4242 4242 (Visa)
                            <br />
                            • Use any future expiry date
                            <br />
                            • Use any 3-digit CVC
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

const YearlyPaymentPage = () => {
    return (
        <Elements stripe={stripePromise}>
            <PaymentForm />
        </Elements>
    );
};

export default YearlyPaymentPage;
