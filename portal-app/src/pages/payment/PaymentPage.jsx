import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { loadStripe } from '@stripe/stripe-js';
import {
    Elements,
    CardElement,
    useStripe,
    useElements
} from '@stripe/react-stripe-js';

// Replace with your actual Stripe publishable key
const stripePromise = loadStripe(process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY || 'pk_test_your_stripe_publishable_key_here');

const PaymentForm = () => {
    const stripe = useStripe();
    const elements = useElements();
    const navigate = useNavigate();
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState(null);

    const handleSubmit = async (event) => {
        event.preventDefault();
        setIsProcessing(true);
        setError(null);

        if (!stripe || !elements) {
            setIsProcessing(false);
            return;
        }

        const cardElement = elements.getElement(CardElement);

        try {
            // Create payment method
            const { error, paymentMethod } = await stripe.createPaymentMethod({
                type: 'card',
                card: cardElement,
            });

            if (error) {
                setError(error.message);
                setIsProcessing(false);
                return;
            }

            // Here you would typically send the paymentMethod.id to your backend
            // For now, we'll simulate a successful payment
            console.log('Payment Method:', paymentMethod);

            // Simulate API call
            setTimeout(() => {
                setIsProcessing(false);
                alert('Payment successful! Redirecting to dashboard...');
                navigate('/');
            }, 2000);

        } catch (err) {
            setError('An unexpected error occurred.');
            setIsProcessing(false);
        }
    };

    return (
        <div style={{
            minHeight: '100vh',
            background: '#ffffff', // Changed to white background
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
        }}>
            <div style={{
                background: '#162040', // Changed to dark navy blue
                borderRadius: '12px',
                boxShadow: '0 20px 40px rgba(22, 32, 64, 0.15)', // Updated shadow to match navy color
                maxWidth: '800px',
                width: '100%',
                minWidth: '600px',
                overflow: 'hidden'
            }}>
                {/* Header Section */}
                <div style={{
                    background: '#162040', // Dark navy blue header
                    color: '#fff',
                    padding: '40px 50px 30px',
                    textAlign: 'center'
                }}>
                    <h1 style={{
                        fontSize: '2.2rem',
                        fontWeight: '700',
                        margin: '0 0 10px 0',
                        fontFamily: 'Open Sans, sans-serif'
                    }}>
                        Upgrade to Premium
                    </h1>
                    <p style={{
                        fontSize: '1.1rem',
                        margin: '0',
                        opacity: '0.9',
                        lineHeight: '1.5'
                    }}>
                        Join our premium platform to access enhanced AI and Data Science resources for your classrooms.
                    </p>

                    <button
                        onClick={() => navigate('/upgrade')}
                        style={{
                            background: '#F9C74F',
                            color: '#162040',
                            border: 'none',
                            borderRadius: '6px',
                            padding: '10px 20px',
                            fontSize: '14px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            marginTop: '15px',
                            transition: 'background 0.2s'
                        }}
                        onMouseOver={(e) => e.target.style.background = '#e6b347'}
                        onMouseOut={(e) => e.target.style.background = '#F9C74F'}
                    >
                        Back to Plans
                    </button>
                </div>

                {/* Payment Form Section */}
                <div style={{
                    padding: '50px',
                    background: '#fff', // White inner content area
                    margin: '0' // Remove any default margins
                }}>
                    <div style={{
                        background: '#f8f9fa',
                        borderRadius: '8px',
                        padding: '25px',
                        marginBottom: '30px',
                        border: '1px solid #e9ecef'
                    }}>
                        <h3 style={{
                            fontSize: '1.3rem',
                            fontWeight: '600',
                            color: '#162040', // Navy blue text
                            margin: '0 0 15px 0'
                        }}>
                            Premium Plan Benefits
                        </h3>
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr 1fr',
                            gap: '10px',
                            margin: '0'
                        }}>
                            <div style={{ color: '#6c757d', lineHeight: '1.6' }}>
                                • Comprehensive lesson module creation<br />
                                • Advanced AI lesson generator<br />
                                • Community sharing and collaboration
                            </div>
                            <div style={{ color: '#6c757d', lineHeight: '1.6' }}>
                                • Priority customer support<br />
                                • Access to premium templates<br />
                                • Unlimited lesson generation
                            </div>
                        </div>
                    </div>

                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '30px',
                        padding: '20px 0',
                        borderBottom: '2px solid #e9ecef'
                    }}>
                        <span style={{
                            fontSize: '1.2rem',
                            fontWeight: '600',
                            color: '#162040' // Navy blue text
                        }}>
                            Monthly Subscription
                        </span>
                        <span style={{
                            fontSize: '1.5rem',
                            fontWeight: '700',
                            color: '#162040' // Navy blue text
                        }}>
                            $9.99/month
                        </span>
                    </div>

                    <form onSubmit={handleSubmit} style={{ width: '100%' }}>
                        <div style={{
                            background: '#fff',
                            padding: '25px',
                            borderRadius: '8px',
                            border: '2px solid #162040', // Navy blue border
                            marginBottom: '25px'
                        }}>
                            <label style={{
                                display: 'block',
                                marginBottom: '12px',
                                fontWeight: '600',
                                color: '#162040', // Navy blue text
                                fontSize: '1.1rem'
                            }}>
                                Card Information
                            </label>
                            <div style={{
                                padding: '16px',
                                border: '1px solid #ddd',
                                borderRadius: '6px',
                                fontSize: '16px',
                                boxSizing: 'border-box',
                                minHeight: '50px'
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
                                        },
                                    }}
                                />
                            </div>
                        </div>

                        {error && (
                            <div style={{
                                color: '#dc3545',
                                background: '#f8d7da',
                                border: '1px solid #f5c6cb',
                                borderRadius: '6px',
                                padding: '15px',
                                marginBottom: '25px',
                                fontSize: '14px'
                            }}>
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={!stripe || isProcessing}
                            style={{
                                width: '100%',
                                background: isProcessing ? '#94a3b8' : '#162040', // Navy blue button
                                color: '#fff',
                                border: 'none',
                                borderRadius: '8px',
                                padding: '18px',
                                fontSize: '16px',
                                fontWeight: '600',
                                cursor: isProcessing ? 'not-allowed' : 'pointer',
                                transition: 'all 0.2s',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px',
                                boxShadow: '0 4px 8px rgba(22, 32, 64, 0.1)' // Navy blue shadow
                            }}
                            onMouseOver={(e) => !isProcessing && (e.target.style.background = '#0f1530')}
                            onMouseOut={(e) => !isProcessing && (e.target.style.background = '#162040')}
                        >
                            {isProcessing ? (
                                <>
                                    <div style={{
                                        width: '16px',
                                        height: '16px',
                                        border: '2px solid #fff',
                                        borderTop: '2px solid transparent',
                                        borderRadius: '50%',
                                        animation: 'spin 1s linear infinite'
                                    }} />
                                    Processing...
                                </>
                            ) : (
                                'Complete Payment - $9.99/month'
                            )}
                        </button>

                        <style>
                            {`
                                @keyframes spin {
                                    0% { transform: rotate(0deg); }
                                    100% { transform: rotate(360deg); }
                                }
                            `}
                        </style>
                    </form>

                    {/* Security badges */}
                    <div style={{
                        textAlign: 'center',
                        marginTop: '30px',
                        padding: '25px 0',
                        borderTop: '1px solid #e9ecef'
                    }}>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '20px',
                            marginBottom: '15px'
                        }}>
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '5px',
                                color: '#28a745',
                                fontSize: '14px'
                            }}>
                                <span>🔒</span>
                                <span>SSL Secured</span>
                            </div>
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '5px',
                                color: '#28a745',
                                fontSize: '14px'
                            }}>
                                <span>💳</span>
                                <span>Secure Payment</span>
                            </div>
                        </div>
                        <p style={{
                            fontSize: '12px',
                            color: '#6c757d',
                            margin: '0',
                            lineHeight: '1.4'
                        }}>
                            Your payment information is secure and encrypted. You can cancel anytime from your account settings.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

const PaymentPage = () => {
    console.log('=== PaymentPage Debug ===');
    console.log('PaymentPage component is rendering!');
    console.log('========================');

    return (
        <Elements stripe={stripePromise}>
            <PaymentForm />
        </Elements>
    );
};

export default PaymentPage;