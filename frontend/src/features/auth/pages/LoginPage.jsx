import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import * as authApi from '../api/authApi';

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
            setError(err?.response?.data?.error || 'Login failed');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div style={{ maxWidth: '320px', margin: '80px auto' }}>
            <h2>Moon Pulse Login</h2>
            <form onSubmit={handleSubmit}>
                <input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    style={{ width: '100%', padding: '8px', marginBottom: '8px', boxSizing: 'border-box' }}
                    required
                />
                <input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    style={{ width: '100%', padding: '8px', marginBottom: '8px', boxSizing: 'border-box' }}
                    required
                />
                {error && <p style={{ color: '#b91c1c', fontSize: '13px' }}>{error}</p>}
                <button type="submit" disabled={submitting} style={{ width: '100%', padding: '8px' }}>
                    {submitting ? 'Logging in...' : 'Log in'}
                </button>
            </form>
        </div>
    );
};