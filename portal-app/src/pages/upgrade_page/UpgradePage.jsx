import React from 'react';
import { useNavigate } from 'react-router-dom';

const UpgradePage = () => {
    const navigate = useNavigate();

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
                    Select the perfect subscription plan that meets your needs for teaching and learning.
                </p>
                <button
                    onClick={() => navigate('/dashboard')}
                    style={{
                        background: '#162040',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '12px 32px',
                        fontWeight: '600',
                        fontSize: '1rem',
                        cursor: 'pointer',
                        transition: 'background 0.2s'
                    }}
                    onMouseOver={(e) => e.target.style.background = '#0f1530'}
                    onMouseOut={(e) => e.target.style.background = '#162040'}
                >
                    Start Learning Today
                </button>
            </div>

            {/* Subscription Plans Section */}
            <div style={{
                width: '100%',
                maxWidth: '1200px',
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
                    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                    gap: '30px',
                    padding: '0 20px'
                }}>
                    {/* Basic Plan */}
                    <div style={{
                        background: '#fff',
                        borderRadius: '12px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                        padding: '30px',
                        textAlign: 'center',
                        position: 'relative',
                        border: '2px solid transparent'
                    }}>
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
                            <span style={{ color: '#999', fontSize: '1.2rem' }}>Basic Plan Image</span>
                        </div>
                        <h3 style={{
                            fontSize: '1.5rem',
                            fontWeight: '700',
                            color: '#162040',
                            marginBottom: '15px'
                        }}>
                            Basic
                        </h3>
                        <p style={{
                            color: '#666',
                            lineHeight: 1.6,
                            marginBottom: '20px',
                            minHeight: '60px'
                        }}>
                            Access selected free modules and basic functionalities.
                        </p>
                        <div style={{
                            fontSize: '1.2rem',
                            fontWeight: '600',
                            color: '#162040',
                            marginBottom: '20px'
                        }}>
                            Free
                        </div>
                        <button
                            style={{
                                width: '100%',
                                background: '#fff',
                                color: '#162040',
                                border: '2px solid #162040',
                                borderRadius: '6px',
                                padding: '12px 24px',
                                fontWeight: '600',
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                            }}
                            onMouseOver={(e) => {
                                e.target.style.background = '#162040';
                                e.target.style.color = '#fff';
                            }}
                            onMouseOut={(e) => {
                                e.target.style.background = '#fff';
                                e.target.style.color = '#162040';
                            }}
                        >
                            Current Plan
                        </button>
                    </div>

                    {/* Premium Plan */}
                    <div style={{
                        background: '#fff',
                        borderRadius: '12px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                        padding: '30px',
                        textAlign: 'center',
                        position: 'relative',
                        border: '2px solid #162040'
                    }}>
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
                            <span style={{ color: '#999', fontSize: '1.2rem' }}>Premium Plan Image</span>
                        </div>
                        <h3 style={{
                            fontSize: '1.5rem',
                            fontWeight: '700',
                            color: '#162040',
                            marginBottom: '15px'
                        }}>
                            Premium
                        </h3>
                        <p style={{
                            color: '#666',
                            lineHeight: 1.6,
                            marginBottom: '20px',
                            minHeight: '60px'
                        }}>
                            All Free features + comprehensive lesson modules creation, and community sharing.
                        </p>
                        <div style={{
                            fontSize: '1.2rem',
                            fontWeight: '600',
                            color: '#162040',
                            marginBottom: '20px'
                        }}>
                            $9.99/month
                        </div>
                        <button
                            style={{
                                width: '100%',
                                background: '#162040',
                                color: '#fff',
                                border: 'none',
                                borderRadius: '6px',
                                padding: '12px 24px',
                                fontWeight: '600',
                                cursor: 'pointer',
                                transition: 'background 0.2s'
                            }}
                            onMouseOver={(e) => e.target.style.background = '#0f1530'}
                            onMouseOut={(e) => e.target.style.background = '#162040'}
                        >
                            Upgrade Now
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
                        border: '2px solid transparent'
                    }}>
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
                            <span style={{ color: '#999', fontSize: '1.2rem' }}>Enterprise Plan Image</span>
                        </div>
                        <h3 style={{
                            fontSize: '1.5rem',
                            fontWeight: '700',
                            color: '#162040',
                            marginBottom: '15px'
                        }}>
                            Enterprise
                        </h3>
                        <p style={{
                            color: '#666',
                            lineHeight: 1.6,
                            marginBottom: '20px',
                            minHeight: '60px'
                        }}>
                            All Premium features + tailored pricing and dedicated onboarding.
                        </p>
                        <div style={{
                            fontSize: '1.2rem',
                            fontWeight: '600',
                            color: '#162040',
                            marginBottom: '20px'
                        }}>
                            Contact Us
                        </div>
                        <button
                            style={{
                                width: '100%',
                                background: '#fff',
                                color: '#162040',
                                border: '2px solid #162040',
                                borderRadius: '6px',
                                padding: '12px 24px',
                                fontWeight: '600',
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                            }}
                            onMouseOver={(e) => {
                                e.target.style.background = '#162040';
                                e.target.style.color = '#fff';
                            }}
                            onMouseOut={(e) => {
                                e.target.style.background = '#fff';
                                e.target.style.color = '#162040';
                            }}
                        >
                            Contact Sales
                        </button>
                    </div>
                </div>
            </div>

            {/* Footer Links */}
            <div style={{
                display: 'flex',
                gap: '30px',
                marginTop: '40px',
                flexWrap: 'wrap',
                justifyContent: 'center'
            }}>
                <a href="/privacy" style={{
                    color: '#666',
                    textDecoration: 'none',
                    fontSize: '0.9rem'
                }}>
                    Privacy Policy
                </a>
                <a href="/terms" style={{
                    color: '#666',
                    textDecoration: 'none',
                    fontSize: '0.9rem'
                }}>
                    Terms of Service
                </a>
                <a href="/contact" style={{
                    color: '#666',
                    textDecoration: 'none',
                    fontSize: '0.9rem'
                }}>
                    Contact Us
                </a>
            </div>
        </div>
    );
};

export default UpgradePage;

