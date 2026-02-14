import React, { useState, useEffect, createContext, useContext } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import axios from 'axios';
import './App.css';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;
const LOGO_URL = 'https://customer-assets.emergentagent.com/job_math-decoder/artifacts/l8340fyy_Logo.png';
const BANNER_URL = 'https://customer-assets.emergentagent.com/job_math-decoder/artifacts/cz2vzotd_youtube_banner_centered_bg.png';

// Create Auth Context
const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

// Auth Provider Component
const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      fetchUser();
    } else {
      setLoading(false);
    }
  }, []);

  const fetchUser = async () => {
    try {
      const response = await axios.get(`${API}/auth/me`);
      setUser(response.data);
    } catch (error) {
      localStorage.removeItem('token');
      delete axios.defaults.headers.common['Authorization'];
    } finally {
      setLoading(false);
    }
  };

  const login = async (username, password) => {
    const response = await axios.post(`${API}/auth/login`, { username, password });
    localStorage.setItem('token', response.data.token);
    axios.defaults.headers.common['Authorization'] = `Bearer ${response.data.token}`;
    setUser(response.data.user);
    return response.data;
  };

  const register = async (userData) => {
    const response = await axios.post(`${API}/auth/register`, userData);
    localStorage.setItem('token', response.data.token);
    axios.defaults.headers.common['Authorization'] = `Bearer ${response.data.token}`;
    setUser(response.data.user);
    return response.data;
  };

  const logout = () => {
    localStorage.removeItem('token');
    delete axios.defaults.headers.common['Authorization'];
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

// Protected Route Component
const ProtectedRoute = ({ children, adminOnly = false }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  if (adminOnly && !user.is_admin) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

// Navbar Component
const Navbar = ({ onAuthClick }) => {
  const { user, logout } = useAuth();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav
      className={`fixed w-full top-0 z-50 transition-all duration-300 ${
        isScrolled ? 'bg-white shadow-xl' : 'bg-white/95 backdrop-blur-sm shadow-md'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          <a href="/" className="flex items-center space-x-3">
            <img src={LOGO_URL} alt="Arpit Sir Maths" className="h-14 w-auto" />
            <div className="hidden sm:block">
              <div className="text-xl font-bold text-primary">ARPIT SIR</div>
              <div className="text-sm font-semibold text-accent">MATHS</div>
            </div>
          </a>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center space-x-8">
            <a href="/" className="text-gray-700 hover:text-primary font-semibold transition">
              Home
            </a>
            <a href="/about" className="text-gray-700 hover:text-primary font-semibold transition">
              About
            </a>
            <a href="/contact" className="text-gray-700 hover:text-primary font-semibold transition">
              Contact
            </a>
            {user && (
              <>
                <a href="/dashboard" className="text-gray-700 hover:text-primary font-semibold transition">
                  Dashboard
                </a>
                <a href="/practice" className="text-gray-700 hover:text-primary font-semibold transition">
                  Practice
                </a>
                {user?.is_admin && (
                  <a href="/admin" className="text-gray-700 hover:text-primary font-semibold transition">
                    Admin
                  </a>
                )}
              </>
            )}
          </div>

          {/* Auth Buttons */}
          <div className="hidden md:flex items-center space-x-4">
            {user ? (
              <>
                <span className="text-gray-700 font-semibold">Hi, {user.username}!</span>
                <button
                  onClick={logout}
                  className="px-5 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition font-semibold"
                  data-testid="logout-button"
                >
                  Logout
                </button>
              </>
            ) : (
              <button
                onClick={onAuthClick}
                className="px-6 py-2 bg-gradient-to-r from-primary to-primary-dark text-white rounded-lg hover:shadow-lg transition transform hover:scale-105 font-semibold"
                data-testid="login-button"
              >
                Login / Sign Up
              </button>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden text-gray-700"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            <svg className="h-6 w-6" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
              {isMobileMenuOpen ? (
                <path d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-gray-200">
            <div className="flex flex-col space-y-3">
              <a href="/" className="text-gray-700 hover:text-primary font-semibold transition px-4 py-2">
                Home
              </a>
              <a href="/about" className="text-gray-700 hover:text-primary font-semibold transition px-4 py-2">
                About
              </a>
              <a href="/contact" className="text-gray-700 hover:text-primary font-semibold transition px-4 py-2">
                Contact
              </a>
              {user && (
                <>
                  <a href="/dashboard" className="text-gray-700 hover:text-primary font-semibold transition px-4 py-2">
                    Dashboard
                  </a>
                  <a href="/practice" className="text-gray-700 hover:text-primary font-semibold transition px-4 py-2">
                    Practice
                  </a>
                </>
              )}
              {user ? (
                <button
                  onClick={logout}
                  className="mx-4 px-5 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition font-semibold"
                >
                  Logout
                </button>
              ) : (
                <button
                  onClick={onAuthClick}
                  className="mx-4 px-6 py-2 bg-gradient-to-r from-primary to-primary-dark text-white rounded-lg font-semibold"
                >
                  Login / Sign Up
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

// Landing Page
const LandingPage = ({ onAuthClick }) => {
  return (
    <div className="min-h-screen">
      {/* Hero Section with Banner Style */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-primary">
        <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary-dark to-primary-darker opacity-95"></div>
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iZ3JpZCIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIj48cGF0aCBkPSJNIDQwIDAgTCAwIDAgMCA0MCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLW9wYWNpdHk9IjAuMDUiIHN0cm9rZS13aWR0aD0iMSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNncmlkKSIvPjwvc3ZnPg==')] opacity-20"></div>
        
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="mb-8 animate-fade-in">
            <img src={LOGO_URL} alt="Arpit Sir Maths" className="h-32 w-auto mx-auto mb-6" />
          </div>
          <h1 className="text-5xl md:text-7xl font-bold text-white mb-4 animate-fade-in">
            DECODE MATHS
          </h1>
          <div className="text-2xl md:text-3xl text-accent font-bold mb-6 animate-fade-in" style={{animationDelay: '0.1s'}}>
            — WITH ARPIT SIR —
          </div>
          <p className="text-xl md:text-2xl text-white mb-4 max-w-3xl mx-auto animate-fade-in" style={{animationDelay: '0.2s'}}>
            Class 10 | 11 | 12 | JEE | CA Foundation
          </p>
          <p className="text-lg md:text-xl text-white/90 mb-8 max-w-3xl mx-auto animate-fade-in" style={{animationDelay: '0.3s'}}>
            Learn • Practice • Master Maths
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in" style={{animationDelay: '0.4s'}}>
            <button
              onClick={onAuthClick}
              className="px-8 py-4 bg-accent text-white rounded-lg font-bold text-lg hover:shadow-2xl transition transform hover:scale-105"
              data-testid="get-started-button"
            >
              Start Learning Free
            </button>
            <a
              href="#features"
              className="px-8 py-4 bg-transparent border-2 border-white text-white rounded-lg font-bold text-lg hover:bg-white hover:text-primary transition"
            >
              Explore Features
            </a>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl font-bold text-center mb-4 text-primary">
            Why Choose Arpit Sir Maths?
          </h2>
          <p className="text-center text-gray-600 mb-12 text-lg">Master CBSE Mathematics with Expert Guidance</p>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white p-8 rounded-xl shadow-lg hover:shadow-2xl transition transform hover:-translate-y-2 border-t-4 border-accent">
              <div className="text-5xl mb-4">📚</div>
              <h3 className="text-2xl font-bold mb-3 text-primary">Chapter-wise Practice</h3>
              <p className="text-gray-600">
                Organized questions by chapters for Class 10, 11, and 12 following CBSE pattern
              </p>
            </div>
            <div className="bg-white p-8 rounded-xl shadow-lg hover:shadow-2xl transition transform hover:-translate-y-2 border-t-4 border-accent">
              <div className="text-5xl mb-4">🎥</div>
              <h3 className="text-2xl font-bold mb-3 text-primary">Video Solutions</h3>
              <p className="text-gray-600">
                YouTube video solutions for every question to understand concepts better
              </p>
            </div>
            <div className="bg-white p-8 rounded-xl shadow-lg hover:shadow-2xl transition transform hover:-translate-y-2 border-t-4 border-accent">
              <div className="text-5xl mb-4">📊</div>
              <h3 className="text-2xl font-bold mb-3 text-primary">Track Progress</h3>
              <p className="text-gray-600">
                Monitor your performance with detailed analytics and improvement insights
              </p>
            </div>
            <div className="bg-white p-8 rounded-xl shadow-lg hover:shadow-2xl transition transform hover:-translate-y-2 border-t-4 border-accent">
              <div className="text-5xl mb-4">✅</div>
              <h3 className="text-2xl font-bold mb-3 text-primary">All Question Types</h3>
              <p className="text-gray-600">
                MCQ, 2 Marks, 3 Marks, 5 Marks, and Case Study questions
              </p>
            </div>
            <div className="bg-white p-8 rounded-xl shadow-lg hover:shadow-2xl transition transform hover:-translate-y-2 border-t-4 border-accent">
              <div className="text-5xl mb-4">🎯</div>
              <h3 className="text-2xl font-bold mb-3 text-primary">CBSE Pattern</h3>
              <p className="text-gray-600">
                Questions designed exactly as per CBSE exam pattern and marking scheme
              </p>
            </div>
            <div className="bg-white p-8 rounded-xl shadow-lg hover:shadow-2xl transition transform hover:-translate-y-2 border-t-4 border-accent">
              <div className="text-5xl mb-4">⚡</div>
              <h3 className="text-2xl font-bold mb-3 text-primary">Instant Results</h3>
              <p className="text-gray-600">
                Get immediate feedback on your answers with detailed explanations
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-primary to-primary-dark">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold text-white mb-6">
            Ready to Excel in Mathematics?
          </h2>
          <p className="text-xl text-white mb-8">
            Join thousands of students mastering CBSE Mathematics with Arpit Sir
          </p>
          <button
            onClick={onAuthClick}
            className="px-8 py-4 bg-accent text-white rounded-lg font-bold text-lg hover:shadow-2xl transition transform hover:scale-105"
            data-testid="cta-signup-button"
          >
            Start Practicing Now
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-primary-darker text-white py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <img src={LOGO_URL} alt="Arpit Sir Maths" className="h-16 w-auto mx-auto mb-4" />
          <p className="text-gray-300 mb-4">
            Decode Maths Now - Master CBSE Mathematics with Expert Guidance
          </p>
          <div className="flex justify-center space-x-6 mb-4">
            <a href="/about" className="text-gray-300 hover:text-accent transition">About</a>
            <a href="/contact" className="text-gray-300 hover:text-accent transition">Contact</a>
          </div>
          <p className="text-gray-400 text-sm">
            © 2024 Arpit Sir Maths. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};

// About Page
const AboutPage = () => {
  return (
    <div className="min-h-screen bg-gray-50 pt-24 pb-12">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <img src={LOGO_URL} alt="Arpit Sir Maths" className="h-24 w-auto mx-auto mb-6" />
          <h1 className="text-5xl font-bold mb-4 text-primary">About Arpit Sir Maths</h1>
          <div className="w-24 h-1 bg-accent mx-auto mb-6"></div>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8 md:p-12 mb-8">
          <h2 className="text-3xl font-bold mb-6 text-primary">Our Mission</h2>
          <p className="text-gray-700 text-lg leading-relaxed mb-6">
            At <span className="font-bold text-primary">Decode Maths Now</span>, our mission is to make mathematics accessible, 
            understandable, and enjoyable for every student. We believe that with the right guidance and practice, 
            any student can master mathematics and achieve excellence in their academic journey.
          </p>
          <p className="text-gray-700 text-lg leading-relaxed">
            Led by <span className="font-bold text-accent">Arpit Sir</span>, an experienced mathematics educator, we provide comprehensive 
            learning resources for CBSE students from Class 10 to 12, along with preparation for competitive exams like JEE and CA Foundation.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 mb-8">
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="text-4xl mb-4">🎓</div>
            <h3 className="text-2xl font-bold mb-4 text-primary">Expert Teaching</h3>
            <p className="text-gray-700 leading-relaxed">
              Years of teaching experience with a proven track record of helping students achieve top scores in board exams and competitive tests.
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="text-4xl mb-4">📱</div>
            <h3 className="text-2xl font-bold mb-4 text-primary">Modern Approach</h3>
            <p className="text-gray-700 leading-relaxed">
              Combining traditional teaching methods with modern technology to provide an engaging and effective learning experience.
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="text-4xl mb-4">🎯</div>
            <h3 className="text-2xl font-bold mb-4 text-primary">Focused Curriculum</h3>
            <p className="text-gray-700 leading-relaxed">
              Chapter-wise practice aligned with CBSE syllabus, ensuring comprehensive coverage of all topics and exam patterns.
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="text-4xl mb-4">💪</div>
            <h3 className="text-2xl font-bold mb-4 text-primary">Student Success</h3>
            <p className="text-gray-700 leading-relaxed">
              Dedicated to student success with personalized guidance, regular assessments, and continuous support throughout their learning journey.
            </p>
          </div>
        </div>

        <div className="bg-gradient-to-r from-primary to-primary-dark rounded-2xl shadow-xl p-8 md:p-12 text-white text-center">
          <h2 className="text-3xl font-bold mb-4">Why Students Choose Us</h2>
          <div className="grid md:grid-cols-3 gap-6 mt-8">
            <div>
              <div className="text-4xl font-bold text-accent mb-2">5000+</div>
              <p className="text-white/90">Happy Students</p>
            </div>
            <div>
              <div className="text-4xl font-bold text-accent mb-2">95%</div>
              <p className="text-white/90">Success Rate</p>
            </div>
            <div>
              <div className="text-4xl font-bold text-accent mb-2">1000+</div>
              <p className="text-white/90">Video Solutions</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Contact Page
const ContactPage = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    message: ''
  });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    // Here you would typically send the form data to your backend
    console.log('Form submitted:', formData);
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      setFormData({ name: '', email: '', phone: '', message: '' });
    }, 3000);
  };

  return (
    <div className="min-h-screen bg-gray-50 pt-24 pb-12">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold mb-4 text-primary">Contact Us</h1>
          <div className="w-24 h-1 bg-accent mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">We'd love to hear from you! Get in touch with us.</p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Contact Form */}
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <h2 className="text-2xl font-bold mb-6 text-primary">Send us a Message</h2>
            {submitted && (
              <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
                Thank you! We'll get back to you soon.
              </div>
            )}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-gray-700 font-semibold mb-2">Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                  data-testid="contact-name-input"
                />
              </div>
              <div>
                <label className="block text-gray-700 font-semibold mb-2">Email *</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                  data-testid="contact-email-input"
                />
              </div>
              <div>
                <label className="block text-gray-700 font-semibold mb-2">Phone</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  data-testid="contact-phone-input"
                />
              </div>
              <div>
                <label className="block text-gray-700 font-semibold mb-2">Message *</label>
                <textarea
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  rows="5"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                  data-testid="contact-message-input"
                ></textarea>
              </div>
              <button
                type="submit"
                className="w-full py-3 bg-gradient-to-r from-primary to-primary-dark text-white rounded-lg font-bold hover:shadow-lg transition"
                data-testid="contact-submit-button"
              >
                Send Message
              </button>
            </form>
          </div>

          {/* Contact Info */}
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-xl p-8">
              <div className="flex items-start space-x-4">
                <div className="text-4xl">📧</div>
                <div>
                  <h3 className="text-xl font-bold mb-2 text-primary">Email</h3>
                  <p className="text-gray-600">contact@arpitsirmaths.com</p>
                  <p className="text-gray-600">support@decodemathsnow.com</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-xl p-8">
              <div className="flex items-start space-x-4">
                <div className="text-4xl">📱</div>
                <div>
                  <h3 className="text-xl font-bold mb-2 text-primary">Phone</h3>
                  <p className="text-gray-600">+91 98765 43210</p>
                  <p className="text-gray-600">Mon-Sat: 9:00 AM - 8:00 PM</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-xl p-8">
              <div className="flex items-start space-x-4">
                <div className="text-4xl">📍</div>
                <div>
                  <h3 className="text-xl font-bold mb-2 text-primary">Location</h3>
                  <p className="text-gray-600">New Delhi, India</p>
                  <p className="text-gray-600">Serving students nationwide</p>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-r from-primary to-primary-dark rounded-2xl shadow-xl p-8 text-white">
              <h3 className="text-2xl font-bold mb-4">Follow Us</h3>
              <div className="flex space-x-4">
                <a href="#" className="w-12 h-12 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center transition">
                  <span className="text-2xl">📘</span>
                </a>
                <a href="#" className="w-12 h-12 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center transition">
                  <span className="text-2xl">📺</span>
                </a>
                <a href="#" className="w-12 h-12 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center transition">
                  <span className="text-2xl">📸</span>
                </a>
                <a href="#" className="w-12 h-12 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center transition">
                  <span className="text-2xl">🐦</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function App() {
  const [showAuthModal, setShowAuthModal] = useState(false);

  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="App">
          <Navbar onAuthClick={() => setShowAuthModal(true)} />
          <Routes>
            <Route path="/" element={<LandingPage onAuthClick={() => setShowAuthModal(true)} />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/practice"
              element={
                <ProtectedRoute>
                  <PracticePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin"
              element={
                <ProtectedRoute adminOnly>
                  <AdminPanel />
                </ProtectedRoute>
              }
            />
          </Routes>
          {showAuthModal && <AuthModal onClose={() => setShowAuthModal(false)} />}
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}

// Auth Modal Component
const AuthModal = ({ onClose }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    email: '',
    class_level: '10',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, register } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        await login(formData.username, formData.password);
      } else {
        await register(formData);
      }
      onClose();
      window.location.href = '/dashboard';
    } catch (err) {
      setError(err.response?.data?.detail || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-2xl"
          data-testid="close-auth-modal"
        >
          ×
        </button>

        <div className="text-center mb-6">
          <img src={LOGO_URL} alt="Arpit Sir Maths" className="h-16 w-auto mx-auto mb-4" />
          <h2 className="text-3xl font-bold text-primary">
            {isLogin ? 'Welcome Back!' : 'Join Us Today!'}
          </h2>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-gray-700 font-semibold mb-2">Username</label>
            <input
              type="text"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              required
              data-testid="username-input"
            />
          </div>

          {!isLogin && (
            <div>
              <label className="block text-gray-700 font-semibold mb-2">Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                required
                data-testid="email-input"
              />
            </div>
          )}

          <div>
            <label className="block text-gray-700 font-semibold mb-2">Password</label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              required
              data-testid="password-input"
            />
          </div>

          {!isLogin && (
            <div>
              <label className="block text-gray-700 font-semibold mb-2">Class</label>
              <select
                value={formData.class_level}
                onChange={(e) => setFormData({ ...formData, class_level: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                data-testid="class-select"
              >
                <option value="10">Class 10</option>
                <option value="11">Class 11</option>
                <option value="12">Class 12</option>
              </select>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-gradient-to-r from-primary to-primary-dark text-white rounded-lg font-bold hover:shadow-lg transition disabled:opacity-50"
            data-testid="submit-auth-button"
          >
            {loading ? 'Please wait...' : isLogin ? 'Login' : 'Sign Up'}
          </button>
        </form>

        <p className="text-center mt-4 text-gray-600">
          {isLogin ? "Don't have an account? " : 'Already have an account? '}
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="text-primary font-semibold hover:underline"
            data-testid="toggle-auth-mode"
          >
            {isLogin ? 'Sign Up' : 'Login'}
          </button>
        </p>
      </div>
    </div>
  );
};

// Dashboard Component
const Dashboard = () => {
  const { user } = useAuth();
  const [progress, setProgress] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProgress();
  }, []);

  const fetchProgress = async () => {
    try {
      const response = await axios.get(`${API}/progress`);
      setProgress(response.data);
    } catch (error) {
      console.error('Error fetching progress:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-24 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 text-primary">
            Welcome back, {user.username}!
          </h1>
          <p className="text-gray-600">Continue your mathematics journey</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-xl shadow-lg border-t-4 border-primary">
            <div className="text-3xl mb-2">📝</div>
            <div className="text-3xl font-bold text-primary">{progress?.total_attempts || 0}</div>
            <div className="text-gray-600 font-semibold">Total Attempts</div>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-lg border-t-4 border-accent">
            <div className="text-3xl mb-2">⭐</div>
            <div className="text-3xl font-bold text-accent">{progress?.average_score || 0}%</div>
            <div className="text-gray-600 font-semibold">Average Score</div>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-lg border-t-4 border-green-500">
            <div className="text-3xl mb-2">❓</div>
            <div className="text-3xl font-bold text-green-600">{progress?.total_questions_attempted || 0}</div>
            <div className="text-gray-600 font-semibold">Questions Attempted</div>
          </div>
        </div>

        <div className="bg-white p-8 rounded-xl shadow-lg mb-8">
          <h2 className="text-2xl font-bold mb-4 text-primary">Chapter-wise Progress</h2>
          {progress?.chapter_wise_progress?.length > 0 ? (
            <div className="space-y-4">
              {progress.chapter_wise_progress.map((chapter) => (
                <div key={chapter.chapter_id} className="flex justify-between items-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition">
                  <div>
                    <div className="font-bold text-gray-800">{chapter.chapter_name}</div>
                    <div className="text-sm text-gray-600">{chapter.attempts} attempts</div>
                  </div>
                  <div className="text-2xl font-bold text-primary">{chapter.average_score}%</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-600 mb-4">No practice history yet. Start practicing!</p>
              <a
                href="/practice"
                className="inline-block px-6 py-3 bg-accent text-white rounded-lg font-semibold hover:shadow-lg transition"
              >
                Start Now
              </a>
            </div>
          )}
        </div>

        <a
          href="/practice"
          className="inline-block px-8 py-4 bg-gradient-to-r from-primary to-primary-dark text-white rounded-lg font-bold hover:shadow-lg transition transform hover:scale-105"
        >
          Continue Practicing
        </a>
      </div>
    </div>
  );
};

// Practice Page Component (Placeholder)
const PracticePage = () => {
  return (
    <div className="min-h-screen bg-gray-50 pt-24 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-4xl font-bold mb-8 text-primary">Practice Page - Coming Soon</h1>
        <p className="text-gray-600">Select your class and start practicing!</p>
      </div>
    </div>
  );
};

// Admin Panel Component (Placeholder)
const AdminPanel = () => {
  return (
    <div className="min-h-screen bg-gray-50 pt-24 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-4xl font-bold mb-8 text-primary">Admin Panel - Coming Soon</h1>
        <p className="text-gray-600">Manage questions, chapters, and users.</p>
      </div>
    </div>
  );
};
