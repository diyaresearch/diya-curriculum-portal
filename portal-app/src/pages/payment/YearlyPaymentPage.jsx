import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import useUserData from '@/hooks/useUserData';
import BackButton from '@/components/ui/BackButton';
import { fetchPayments } from '@/utils/paymentsApi';

// Initialize Stripe with your publishable key
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || 'pk_test_51PYERERqWgqDVRD3kSuQgmgKNIWup77t7Rxsh2mqIsnDDRbCtjuiYh8DCvSO84i5R9FTOgBEzvvr21qHjMGTjvWn00Dwdt2QDv');

const PaymentForm = () => {
    const navigate = useNavigate();
    const { user, userData, loading } = useUserData();
    const stripe = useStripe();
    const elements = useElements();
    const [isProcessing, setIsProcessing] = useState(false);
    const [paymentError, setPaymentError] = useState(null);
    const [paymentSuccess, setPaymentSuccess] = useState(false);

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
            const token = await user.getIdToken();

            // Step 1: Create payment intent
            const paymentIntentResponse = await fetchPayments('/create-payment-intent', {
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
                const confirmResponse = await fetchPayments('/confirm-payment', {
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
                            navigate('/teacherplus');
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
            <div className="min-h-screen flex items-center justify-center text-[1.2rem]">
                Loading...
            </div>
        );
    }

    if (paymentSuccess) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-surface-subtle">
                <div className="bg-surface rounded-xl p-10 text-center shadow-[0_4px_20px_rgba(0,0,0,0.1)] max-w-125">
                    <div className="text-[3rem] mb-5">🎉</div>
                    <h2 className="text-success text-[1.8rem] font-bold mb-[15px]">
                        Payment Successful!
                    </h2>
                    <p className="text-ink-muted text-[1.1rem] mb-5">
                        Welcome to Yearly Premium! You now have access to all premium features.
                    </p>
                    <p className="text-ink-faint text-[0.9rem]">
                        Redirecting to your dashboard...
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-surface-subtle flex items-center justify-center py-10 px-5">
            <div className="max-w-225 w-full grid [grid-template-columns:1fr_1fr] gap-10 items-stretch">
                {/* Left Side - Plan Info */}
                <div className="bg-navy-soft rounded-xl p-10 text-white h-full flex flex-col">
                    <h2 className="text-[1.8rem] font-bold mb-5 text-white">
                        Upgrade to Yearly Premium
                    </h2>

                    <p className="text-[#b8c5d6] mb-7.5 leading-[1.6]">
                        Join our premium platform to access enhanced AI and Data Science resources for your classrooms. Save $20 per year!
                    </p>

                    <BackButton to="/upgrade" label="Back to Plans" className="mb-6" />

                    <div className="[background:rgba(255,255,255,0.1)] rounded-lg p-5 flex-[1]">
                        <h3 className="text-[1.2rem] font-semibold mb-[15px] text-white">
                            Yearly Premium Benefits
                        </h3>
                        <ul className="text-[#b8c5d6] leading-[1.8] pl-5">
                            <li>Comprehensive lesson module creation</li>
                            <li>Advanced AI lesson generator</li>
                            <li>Community sharing and collaboration</li>
                            <li>Access to premium templates</li>
                            <li>Unlimited lesson generation</li>
                            <li>Priority customer support</li>
                            <li className="text-accent font-semibold">
                                Save $20 per year compared to monthly billing
                            </li>
                        </ul>
                    </div>
                </div>

                {/* Right Side - Payment Form */}
                <div className="bg-surface rounded-xl p-10 shadow-[0_4px_20px_rgba(0,0,0,0.1)] h-full flex flex-col">
                    <div className="bg-navy-soft rounded-lg p-5 mb-7.5 text-center">
                        <h3 className="text-white text-[1.3rem] font-semibold mb-2.5">
                            Yearly Premium
                        </h3>
                        <div className="text-accent text-[2rem] font-bold">
                            $100.00
                            <span className="text-[1rem] text-[#b8c5d6] font-normal">
                                /year
                            </span>
                        </div>
                        <div className="text-success text-[0.9rem] font-semibold mt-[5px]">
                            ($8.33/month - Save 17%)
                        </div>
                    </div>

                    <form onSubmit={handlePayment}>
                        <div className="mb-5">
                            <label className="block font-semibold mb-2 text-[#333]">
                                Card Information
                            </label>
                            <div className="border-2 border-[#e1e5e9] rounded-md p-3 bg-surface">
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
                            <div className="bg-[#f8d7da] text-[#721c24] p-3 rounded-md mb-5 border border-[#f5c6cb]">
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

                        <div className="flex items-center justify-center gap-2.5 mt-5 text-ink-muted text-[0.9rem]">
                            <span>🔒</span>
                            <span>SSL Secured</span>
                            <span>🔒</span>
                            <span>Stripe Secured</span>
                        </div>

                        <p className="text-center text-ink-faint text-[0.85rem] mt-[15px] leading-[1.4]">
                            Your payment information is secure and encrypted by Stripe. You can cancel anytime from your account settings.
                        </p>

                        <div className="bg-[#f8f9fa] rounded-md p-[15px] mt-5 text-[0.85rem] text-ink-muted">
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
