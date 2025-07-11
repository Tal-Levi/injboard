import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import bcrypt from 'bcryptjs';
import { useNavigate } from 'react-router-dom';


function Admin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user is already logged in
    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
    if (isLoggedIn) {
      navigate('/dashboard');
    }
  }, [navigate]);

  const handleAuth = async (e) => {
    e.preventDefault();
    setMessage('');

    if (isRegistering) {
      try {
        // Require an admin code for registration
        // IMPORTANT: Replace 'your-secret-code' below with a strong, unique secret code known only to authorized administrators
        const adminCode = prompt('Enter admin registration code:');
        if (adminCode !== 'your-secret-code') { // Replace with your actual secret code
          setMessage('Registration failed: Invalid admin code');
          return;
        }
        
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const { error } = await supabase
          .from('users')
          .insert([{ email, hashed_password: hashedPassword, role: 'viewer' }]);

        if (error) {
          console.error('Supabase registration error:', error);
          setMessage('Registration failed: ' + (error.message || 'Unknown error'));
        } else {
          setMessage('Registration successful! Please login.');
          setEmail('');
          setPassword('');
          setIsRegistering(false);
        }
      } catch (e) {
        console.error('Client-side hashing or registration error:', e);
        setMessage('Registration failed due to an internal error.');
      }
    } else {
      // Handle login
      const { data: userEntry, error: fetchError } = await supabase
        .from('users')
        .select('hashed_password, role')
        .eq('email', email)
        .single();

      if (fetchError || !userEntry) {
        setMessage('Login failed: Invalid credentials.');
        return;
      }

      const match = await bcrypt.compare(password, userEntry.hashed_password);

      if (match) {
        setMessage('Login successful!');
        localStorage.setItem('isLoggedIn', 'true');
        localStorage.setItem('userRole', userEntry.role);
        navigate('/dashboard');
      } else {
        setMessage('Login failed: Invalid credentials.');
      }
    }
  };

  return (
    <div className="admin-container">
      <div className="login-box">
        <h2>{isRegistering ? 'Register Admin' : 'Admin Login'}</h2>
        <form onSubmit={handleAuth}>
          <div className="input-group">
            <label htmlFor="email">Email:</label>
            <input
              type="email"
              id="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="input-field"
            />
          </div>
          <div className="input-group">
            <label htmlFor="password">Password:</label>
            <input
              type="password"
              id="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="input-field"
            />
          </div>
          <button type="submit" className="login-button">
            {isRegistering ? 'Register' : 'Login'}
          </button>
        </form>
        <button
          onClick={() => setIsRegistering(!isRegistering)}
          className="toggle-button"
        >
          {isRegistering ? 'Already have an account? Login' : `Don't have an account? Register`}
        </button>
        {message && <p className="message">{message}</p>}
      </div>
    </div>
  );
}

export default Admin; 