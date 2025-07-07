import React from "react";

export default function SignupSuccess({ name, type, onLogin }) {
    return (
        <div
            className="signup-success"
            style={{
                minHeight: "100vh",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                background: "#232a3d",
            }}
        >
            <h1
                style={{
                    color: "#fff",
                    fontWeight: "bold",
                    fontSize: "3.2rem",
                    marginBottom: "24px",
                    textAlign: "center",
                }}
            >
                Welcome, <span style={{ color: "#ffc940" }}>{name}</span>
            </h1>
            <p
                style={{
                    color: "#fff",
                    fontSize: "1.45rem",
                    marginBottom: "36px",
                    textAlign: "center",
                    maxWidth: 520,
                    lineHeight: 1.5,
                }}
            >
                Thank you for creating a {type} Account with DIYA Education Portal!
                <br />
                Click below to get started!
            </p>
            <button
                style={{
                    background: "#ffc940",
                    color: "#222",
                    border: "none",
                    borderRadius: "10px",
                    padding: "10px 0",
                    width: "180px",
                    fontWeight: "bold",
                    fontSize: "1.2rem",
                    boxShadow: "0 4px 0 #bfa12e",
                    cursor: "pointer",
                    marginTop: "18px",
                    transition: "background 0.2s, color 0.2s",
                }}
                onClick={onLogin}
            >
                Log in here!
            </button>
        </div>
    );
}