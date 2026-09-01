import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import * as authApi from '../api/authApi';
import './LoginPage.css';

export const LoginPage = () => {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSubmitting(true);
        try {
            const { token, user } = await authApi.login(email, password);
            localStorage.setItem('moonpulse.auth.token', token);
            localStorage.setItem('moonpulse.auth.user', JSON.stringify(user));
            navigate('/');
        } catch (err) {
            setError(err?.response?.data?.error || 'Could not sign in. Check your email and password.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="login-screen">
            <div className="login-panel-brand">
                <div className="login-brand-mark">
                    <svg viewBox="0 0 48 48" className="login-pulse-icon" aria-hidden="true">
                        <path
                            className="login-pulse-path"
                            d="M2 24 H14 L18 10 L26 38 L30 24 H46"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                    </svg>
                    <span className="login-brand-name">Moon Pulse</span>
                </div>
                <p className="login-brand-copy">
                    Tracks every product post across your Facebook pages, and shows you how it's performing.
                </p>
                <div className="login-brand-footer">Internal tool — access by invitation only</div>
            </div>

            <div className="login-panel-form">
                <form className="login-form" onSubmit={handleSubmit}>
                    <h1 className="login-title">Sign in</h1>
                    <p className="login-subtitle">Use the account your team set up for you.</p>

                    <label className="login-label" htmlFor="email">Email</label>
                    <input
                        id="email"
                        type="email"
                        className="login-input"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@moonpulse.local"
                        autoComplete="email"
                        required
                    />

                    <label className="login-label" htmlFor="password">Password</label>
                    <input
                        id="password"
                        type="password"
                        className="login-input"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        autoComplete="current-password"
                        required
                    />

                    {error && <p className="login-error" role="alert">{error}</p>}

                    <button type="submit" className="login-submit" disabled={submitting}>
                        {submitting ? 'Signing in…' : 'Sign in'}
                    </button>
                </form>
            </div>
        </div>
    );
};