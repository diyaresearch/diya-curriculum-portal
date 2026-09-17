import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import useUserData from '@/hooks/useUserData';
import BackButton from '@/components/ui/BackButton';
import { fetchPayments } from '@/utils/paymentsApi';

// Monthly upgrade, migrated from a hand-rolled card form to Stripe Elements
// (#423). Card details are entered inside Stripe's iframe and never reach this
// application or its API, which keeps the portal out of PCI scope. The flow
// mirrors YearlyPaymentPage: create a PaymentIntent server-side, confirm it
// with Stripe, then have the server verify it before granting anything (#422).
const STRIPE_PUBLISHABLE_KEY = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '';
const stripePromise = STRIPE_PUBLISHABLE_KEY ? loadStripe(STRIPE_PUBLISHABLE_KEY) : null;

if (!STRIPE_PUBLISHABLE_KEY) {
    // Deliberately no hard-coded fallback key. A pk_test fallback would let the
    // page look functional in production while quietly taking no real money.
    console.error('VITE_STRIPE_PUBLISHABLE_KEY is not set; the payment form cannot load.');
}

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
            setPaymentError('Payment form is still loading. Please try again in a moment.');
            return;
        }

        setIsProcessing(true);
        setPaymentError(null);

        try {
            const cardElement = elements.getElement(CardElement);
            const token = await user.getIdToken();

            // Step 1: create the PaymentIntent. The amount is set server-side
            // from planType, never sent from here.
            const paymentIntentResponse = await fetchPayments('/create-payment-intent', {
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
            const confirmResponse = await fetchPayments('/confirm-payment', {
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
                        Welcome to Monthly Premium! You now have access to all premium features.
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
                        Upgrade to Monthly Premium
                    </h2>

                    <p className="text-[#b8c5d6] mb-7.5 leading-[1.6]">
                        Join our premium platform to access enhanced AI and Data Science resources for your classrooms.
                    </p>

                    <BackButton to="/upgrade" label="Back to Plans" className="mb-6" />

                    <div className="[background:rgba(255,255,255,0.1)] rounded-lg p-5 flex-[1]">
                        <h3 className="text-[1.2rem] font-semibold mb-[15px] text-white">
                            Monthly Premium Benefits
                        </h3>
                        <ul className="text-[#b8c5d6] leading-[1.8] pl-5">
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
                <div className="bg-surface rounded-xl p-10 shadow-[0_4px_20px_rgba(0,0,0,0.1)] h-full flex flex-col">
                    <div className="bg-navy-soft rounded-lg p-5 mb-7.5 text-center">
                        <h3 className="text-white text-[1.3rem] font-semibold mb-2.5">
                            Monthly Premium
                        </h3>
                        <div className="text-accent text-[2rem] font-bold">
                            $9.99
                            <span className="text-[1rem] text-[#b8c5d6] font-normal">
                                /month
                            </span>
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
                                                '::placeholder': { color: '#aab7c4' },
                                            },
                                            invalid: { color: '#9e2146' },
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
                        >
                            {isProcessing ? 'Processing...' : 'Complete Payment - $9.99'}
                        </button>

                        <div className="flex items-center justify-center gap-2.5 mt-5 text-ink-muted text-[0.9rem]">
                            <span>🔒</span>
                            <span>SSL Secured</span>
                            <span>🔒</span>
                            <span>Stripe Secured</span>
                        </div>

                        <p className="text-center text-ink-faint text-[0.85rem] mt-[15px] leading-[1.4]">
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
            <div className="min-h-[60vh] flex items-center justify-center py-12 px-6 text-center">
                <div className="max-w-120">
                    <h2 className="text-[1.5rem] font-bold mb-3">
                        Payments are temporarily unavailable
                    </h2>
                    <p className="text-ink-muted leading-[1.6]">
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
