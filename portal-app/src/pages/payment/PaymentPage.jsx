import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import useUserData from '../../hooks/useUserData';
import BackButton from '../../components/BackButton';

// Monthly upgrade, migrated from a hand-rolled card form to Stripe Elements
// (#423). Card details are entered inside Stripe's iframe and never reach this
// application or its API, which keeps the portal out of PCI scope. The flow
// mirrors YearlyPaymentPage: create a PaymentIntent server-side, confirm it
// with Stripe, then have the server verify it before granting anything (#422).
const STRIPE_PUBLISHABLE_KEY = process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY || '';
const stripePromise = STRIPE_PUBLISHABLE_KEY ? loadStripe(STRIPE_PUBLISHABLE_KEY) : null;

if (!STRIPE_PUBLISHABLE_KEY) {
    // Deliberately no hard-coded fallback key. A pk_test fallback would let the
    // page look functional in production while quietly taking no real money.
    console.error('REACT_APP_STRIPE_PUBLISHABLE_KEY is not set; the payment form cannot load.');
}

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
            setPaymentError('Payment form is still loading. Please try again in a moment.');
            return;
        }

        setIsProcessing(true);
        setPaymentError(null);

        try {
            const cardElement = elements.getElement(CardElement);
            const serverUrl = process.env.REACT_APP_SERVER_ORIGIN_URL || 'http://localhost:3001';
            const token = await user.getIdToken();

            // Step 1: create the PaymentIntent. The amount is set server-side
            // from planType, never sent from here.
            const paymentIntentResponse = await fetch(`${serverUrl}/api/payment/create-payment-intent`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ planType: 'premium' })
            });

            const intentResult = await paymentIntentResponse.json();

            if (!paymentIntentResponse.ok || !intentResult.clientSecret) {
                throw new Error(intentResult.message || 'Failed to start payment');
            }

            // Step 2: confirm with Stripe. The card element is passed straight
            // to Stripe; its contents are never readable by this code.
            const { error, paymentIntent } = await stripe.confirmCardPayment(intentResult.clientSecret, {
                payment_method: {
                    card: cardElement,
                    billing_details: {
                        name: userData?.displayName || userData?.fullName || userData?.email || 'Customer',
                        email: userData?.email || user?.email
                    }
                }
            });

            if (error) {
                setPaymentError(error.message);
                return;
            }

            if (paymentIntent.status !== 'succeeded') {
                setPaymentError(`Payment was not completed (status: ${paymentIntent.status}).`);
                return;
            }

            // Step 3: the server retrieves the intent from Stripe and grants
            // the subscription only if it really succeeded for this user.
            const confirmResponse = await fetch(`${serverUrl}/api/payment/confirm-payment`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ paymentIntentId: paymentIntent.id })
            });

            const confirmResult = await confirmResponse.json();

            if (!confirmResponse.ok) {
                setPaymentError(confirmResult.message || 'Failed to confirm payment');
                return;
            }

            setPaymentSuccess(true);
            setTimeout(() => {
                navigate('/teacherPlus');
                setTimeout(() => window.location.reload(), 100);
            }, 2000);

        } catch (err) {
            setPaymentError(err.message || 'Error processing payment. Please try again.');
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
                    <div style={{ fontSize: '3rem', marginBottom: '20px' }}>🎉</div>
                    <h2 style={{
                        color: '#28a745',
                        fontSize: '1.8rem',
                        fontWeight: '700',
                        marginBottom: '15px'
                    }}>
                        Payment Successful!
                    </h2>
                    <p style={{ color: '#666', fontSize: '1.1rem', marginBottom: '20px' }}>
                        Welcome to Monthly Premium! You now have access to all premium features.
                    </p>
                    <p style={{ color: '#888', fontSize: '0.9rem' }}>
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
                        Upgrade to Monthly Premium
                    </h2>

                    <p style={{ color: '#B8C5D6', marginBottom: '30px', lineHeight: 1.6 }}>
                        Join our premium platform to access enhanced AI and Data Science resources for your classrooms.
                    </p>

                    <BackButton to="/upgrade" label="Back to Plans" className="mb-6" />

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
                            Monthly Premium Benefits
                        </h3>
                        <ul style={{ color: '#B8C5D6', lineHeight: 1.8, paddingLeft: '20px' }}>
                            <li>Comprehensive lesson module creation</li>
                            <li>Advanced AI lesson generator</li>
                            <li>Community sharing and collaboration</li>
                            <li>Access to premium templates</li>
                            <li>Unlimited lesson generation</li>
                            <li>Priority customer support</li>
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
                            Monthly Premium
                        </h3>
                        <div style={{ color: '#F9C74F', fontSize: '2rem', fontWeight: '700' }}>
                            $9.99
                            <span style={{ fontSize: '1rem', color: '#B8C5D6', fontWeight: '400' }}>
                                /month
                            </span>
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
                                                '::placeholder': { color: '#aab7c4' },
                                            },
                                            invalid: { color: '#9e2146' },
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
                        >
                            {isProcessing ? 'Processing...' : 'Complete Payment - $9.99'}
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
                            Your payment information is entered directly into Stripe and never reaches our servers. You can cancel anytime from your account settings.
                        </p>
                    </form>
                </div>
            </div>
        </div>
    );
};

const PaymentPage = () => {
    if (!stripePromise) {
        return (
            <div style={{
                minHeight: '60vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '48px 24px',
                textAlign: 'center'
            }}>
                <div style={{ maxWidth: '480px' }}>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '12px' }}>
                        Payments are temporarily unavailable
                    </h2>
                    <p style={{ color: '#666', lineHeight: 1.6 }}>
                        We can't take payments right now. Nothing has been charged. Please try
                        again later or contact support.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <Elements stripe={stripePromise}>
            <PaymentForm />
        </Elements>
    );
};

export default PaymentPage;
