import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useUserData from '../../hooks/useUserData';

const PaymentPage = () => {
    const navigate = useNavigate();
    const { user, userData, loading } = useUserData();
    const [cardInfo, setCardInfo] = useState({
        cardNumber: '',
        expiryDate: '',
        cvv: '',
        cardholderName: ''
    });
    const [isProcessing, setIsProcessing] = useState(false);

    // Redirect if user is not authenticated
    useEffect(() => {
        if (!loading && !user) {
            navigate('/');
        }
    }, [user, loading, navigate]);

    const handleCardInfoChange = (e) => {
        const { name, value } = e.target;
        setCardInfo(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handlePayment = async (e) => {
        e.preventDefault();
        setIsProcessing(true);

        try {
            // Get the server URL from environment
            const serverUrl = process.env.REACT_APP_SERVER_ORIGIN_URL || 'http://localhost:3001';
            const token = await user.getIdToken();

            // Process payment
            const response = await fetch(`${serverUrl}/api/subscription/process-payment`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    planType: 'premium',
                    amount: 9.99,
                    cardInfo: cardInfo,
                    planType: planType,
                    amount: amount,
                    cardInfo: cardInfo,
                    billingCycle: billingCycle
                })
            });

            const result = await response.json();

            if (response.ok) {
                // Payment successful
                alert('Payment successful! Welcome to Monthly Premium!');
                navigate('/');
                // Force page reload to update user data
                setTimeout(() => {
                    window.location.reload();
                }, 100);
            } else {
                console.error('Payment failed:', result.message);
                alert('Payment failed: ' + result.message);
            }
        } catch (error) {
            console.error('Error processing payment:', error);
            alert('Error processing payment. Please try again.');
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

    // ...existing code...

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
                alignItems: 'stretch' // Changed from 'start' to 'stretch'
            }}>
                {/* Left Side - Plan Info */}
                <div style={{
                    background: '#242B42',
                    borderRadius: '12px',
                    padding: '40px',
                    color: 'white',
                    height: '100%', // Changed from 'fit-content' to '100%'
                    display: 'flex',
                    flexDirection: 'column'
                }}>
                    {/* ...existing left side content... */}
                    <h2 style={{
                        fontSize: '1.8rem',
                        fontWeight: '700',
                        marginBottom: '20px',
                        color: 'white'
                    }}>
                        Upgrade to Monthly Premium
                    </h2>

                    <p style={{
                        color: '#B8C5D6',
                        marginBottom: '30px',
                        lineHeight: 1.6
                    }}>
                        Join our premium platform to access enhanced AI and Data Science resources for your classrooms.
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
                        flex: 1 // This will make the benefits section expand to fill remaining space
                    }}>
                        <h3 style={{
                            fontSize: '1.2rem',
                            fontWeight: '600',
                            marginBottom: '15px',
                            color: 'white'
                        }}>
                            Monthly Premium Benefits
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
                        </ul>
                    </div>
                </div>

                {/* Right Side - Payment Form */}
                <div style={{
                    background: '#fff',
                    borderRadius: '12px',
                    padding: '40px',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                    height: '100%', // Added to match left container
                    display: 'flex',
                    flexDirection: 'column'
                }}>
                    {/* ...existing right side content remains the same... */}
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
                        <div style={{
                            color: '#F9C74F',
                            fontSize: '2rem',
                            fontWeight: '700'
                        }}>
                            $9.99
                            <span style={{
                                fontSize: '1rem',
                                color: '#B8C5D6',
                                fontWeight: '400'
                            }}>
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
                            <input
                                type="text"
                                name="cardNumber"
                                placeholder="1234 1234 1234 1234"
                                value={cardInfo.cardNumber}
                                onChange={handleCardInfoChange}
                                required
                                style={{
                                    width: '100%',
                                    padding: '12px',
                                    border: '2px solid #e1e5e9',
                                    borderRadius: '6px',
                                    fontSize: '1rem',
                                    outline: 'none',
                                    transition: 'border-color 0.2s'
                                }}
                                onFocus={(e) => e.target.style.borderColor = '#242B42'}
                                onBlur={(e) => e.target.style.borderColor = '#e1e5e9'}
                            />
                        </div>

                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr 1fr',
                            gap: '15px',
                            marginBottom: '20px'
                        }}>
                            <div>
                                <label style={{
                                    display: 'block',
                                    fontWeight: '600',
                                    marginBottom: '8px',
                                    color: '#333'
                                }}>
                                    MM / YY
                                </label>
                                <input
                                    type="text"
                                    name="expiryDate"
                                    placeholder="MM / YY"
                                    value={cardInfo.expiryDate}
                                    onChange={handleCardInfoChange}
                                    required
                                    style={{
                                        width: '100%',
                                        padding: '12px',
                                        border: '2px solid #e1e5e9',
                                        borderRadius: '6px',
                                        fontSize: '1rem',
                                        outline: 'none',
                                        transition: 'border-color 0.2s'
                                    }}
                                    onFocus={(e) => e.target.style.borderColor = '#242B42'}
                                    onBlur={(e) => e.target.style.borderColor = '#e1e5e9'}
                                />
                            </div>
                            <div>
                                <label style={{
                                    display: 'block',
                                    fontWeight: '600',
                                    marginBottom: '8px',
                                    color: '#333'
                                }}>
                                    CVC
                                </label>
                                <input
                                    type="text"
                                    name="cvv"
                                    placeholder="CVC"
                                    value={cardInfo.cvv}
                                    onChange={handleCardInfoChange}
                                    required
                                    style={{
                                        width: '100%',
                                        padding: '12px',
                                        border: '2px solid #e1e5e9',
                                        borderRadius: '6px',
                                        fontSize: '1rem',
                                        outline: 'none',
                                        transition: 'border-color 0.2s'
                                    }}
                                    onFocus={(e) => e.target.style.borderColor = '#242B42'}
                                    onBlur={(e) => e.target.style.borderColor = '#e1e5e9'}
                                />
                            </div>
                        </div>

                        <div style={{ marginBottom: '30px' }}>
                            <label style={{
                                display: 'block',
                                fontWeight: '600',
                                marginBottom: '8px',
                                color: '#333'
                            }}>
                                Cardholder Name
                            </label>
                            <input
                                type="text"
                                name="cardholderName"
                                placeholder="Full name on card"
                                value={cardInfo.cardholderName}
                                onChange={handleCardInfoChange}
                                required
                                style={{
                                    width: '100%',
                                    padding: '12px',
                                    border: '2px solid #e1e5e9',
                                    borderRadius: '6px',
                                    fontSize: '1rem',
                                    outline: 'none',
                                    transition: 'border-color 0.2s'
                                }}
                                onFocus={(e) => e.target.style.borderColor = '#242B42'}
                                onBlur={(e) => e.target.style.borderColor = '#e1e5e9'}
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={isProcessing}
                            style={{
                                width: '100%',
                                background: '#242B42',
                                color: '#fff',
                                border: 'none',
                                borderRadius: '6px',
                                padding: '15px',
                                fontSize: '1.1rem',
                                fontWeight: '600',
                                cursor: isProcessing ? 'not-allowed' : 'pointer',
                                opacity: isProcessing ? 0.7 : 1,
                                transition: 'all 0.2s'
                            }}
                            onMouseOver={(e) => {
                                if (!isProcessing) {
                                    e.target.style.background = '#1a1f35';
                                }
                            }}
                            onMouseOut={(e) => {
                                if (!isProcessing) {
                                    e.target.style.background = '#242B42';
                                }
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
                            <span>Secure Payment</span>
                        </div>

                        <p style={{
                            textAlign: 'center',
                            color: '#888',
                            fontSize: '0.85rem',
                            marginTop: '15px',
                            lineHeight: 1.4
                        }}>
                            Your payment information is secure and encrypted. You can cancel anytime from your account settings.
                        </p>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default PaymentPage;