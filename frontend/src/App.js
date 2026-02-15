import React, { useState, useEffect, createContext, useContext } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom';
import axios from 'axios';
import './App.css';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "https://decodemathsnow.onrender.com";
const API = `${BACKEND_URL}/api`;
const LOGO_URL = 'https://customer-assets.emergentagent.com/job_math-decoder/artifacts/l8340fyy_Logo.png';

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
  const [subscriptionStatus, setSubscriptionStatus] = useState(null);

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
      // Fetch subscription status
      fetchSubscriptionStatus();
    } catch (error) {
      localStorage.removeItem('token');
      delete axios.defaults.headers.common['Authorization'];
    } finally {
      setLoading(false);
    }
  };

  const fetchSubscriptionStatus = async () => {
    try {
      const response = await axios.get(`${API}/subscription/status`);
      setSubscriptionStatus(response.data);
    } catch (error) {
      console.error('Error fetching subscription status:', error);
    }
  };

  const login = async (mobile_number, password) => {
    const response = await axios.post(`${API}/auth/login`, { mobile_number, password });
    localStorage.setItem('token', response.data.token);
    axios.defaults.headers.common['Authorization'] = `Bearer ${response.data.token}`;
    setUser(response.data.user);
    // Fetch subscription status after login
    setTimeout(fetchSubscriptionStatus, 100);
    return response.data;
  };

  const register = async (userData) => {
    const response = await axios.post(`${API}/auth/register`, userData);
    localStorage.setItem('token', response.data.token);
    axios.defaults.headers.common['Authorization'] = `Bearer ${response.data.token}`;
    setUser(response.data.user);
    // New users start with free tier
    setSubscriptionStatus({
      subscription_status: 'free',
      free_chapters_remaining: 2,
      is_premium: false
    });
    return response.data;
  };

  const updateClass = async (class_level) => {
    const response = await axios.put(`${API}/auth/update-class`, { class_level });
    setUser(response.data.user);
    return response.data;
  };

  const logout = () => {
    localStorage.removeItem('token');
    delete axios.defaults.headers.common['Authorization'];
    setUser(null);
    setSubscriptionStatus(null);
  };

  const refreshSubscription = () => {
    fetchSubscriptionStatus();
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      login, 
      register, 
      logout, 
      loading, 
      updateClass,
      subscriptionStatus,
      refreshSubscription 
    }}>
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
          <Link to="/" className="flex items-center space-x-3">
            <img src={LOGO_URL} alt="Decode Maths Logo" className="h-14 w-auto" />
          </Link>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center space-x-8">
            <Link to="/" className="text-gray-700 hover:text-primary font-semibold transition">
              Home
            </Link>
            <Link to="/sample-test" className="text-gray-700 hover:text-primary font-semibold transition">
              Free Sample Test
            </Link>
            <Link to="/pricing" className="text-gray-700 hover:text-primary font-semibold transition">
              Pricing
            </Link>
            <Link to="/about" className="text-gray-700 hover:text-primary font-semibold transition">
              About
            </Link>
            <Link to="/contact" className="text-gray-700 hover:text-primary font-semibold transition">
              Contact
            </Link>
            {user && (
              <>
                <Link to="/dashboard" className="text-gray-700 hover:text-primary font-semibold transition">
                  Dashboard
                </Link>
                <Link to="/practice" className="text-gray-700 hover:text-primary font-semibold transition">
                  Practice
                </Link>
                {user?.is_admin && (
                  <Link to="/admin" className="text-gray-700 hover:text-primary font-semibold transition">
                    Admin
                  </Link>
                )}
              </>
            )}
          </div>

          {/* Auth Buttons */}
          <div className="hidden md:flex items-center space-x-4">
            {user ? (
              <>
                <span className="text-gray-700 font-semibold">Hi, {user.name}!</span>
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
              <Link to="/" onClick={() => setMobileMenuOpen(false)} className="text-gray-700 hover:text-primary font-semibold transition px-4 py-2">
                Home
              </Link>
              <Link to="/sample-test" onClick={() => setMobileMenuOpen(false)} className="text-gray-700 hover:text-primary font-semibold transition px-4 py-2">
                Free Sample Test
              </Link>
              <Link to="/pricing" onClick={() => setMobileMenuOpen(false)} className="text-gray-700 hover:text-primary font-semibold transition px-4 py-2">
                Pricing
              </Link>
              <Link to="/about" onClick={() => setMobileMenuOpen(false)} className="text-gray-700 hover:text-primary font-semibold transition px-4 py-2">
                About
              </Link>
              <Link to="/contact" onClick={() => setMobileMenuOpen(false)} className="text-gray-700 hover:text-primary font-semibold transition px-4 py-2">
                Contact
              </Link>
              {user && (
                <>
                  <Link to="/dashboard" onClick={() => setMobileMenuOpen(false)} className="text-gray-700 hover:text-primary font-semibold transition px-4 py-2">
                    Dashboard
                  </Link>
                  <Link to="/practice" onClick={() => setMobileMenuOpen(false)} className="text-gray-700 hover:text-primary font-semibold transition px-4 py-2">
                    Practice
                  </Link>
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
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-primary">
        <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary-dark to-primary-darker opacity-95"></div>
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iZ3JpZCIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIj48cGF0aCBkPSJNIDQwIDAgTCAwIDAgMCA0MCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLW9wYWNpdHk9IjAuMDUiIHN0cm9rZS13aWR0aD0iMSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNncmlkKSIvPjwvc3ZnPg==')] opacity-20"></div>
        
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="mb-8 animate-fade-in">
            <img src={LOGO_URL} alt="Logo" className="h-32 w-auto mx-auto mb-6" />
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
            <a href="/sample-test"
              className="px-8 py-4 bg-transparent border-2 border-white text-white rounded-lg font-bold text-lg hover:bg-white hover:text-primary transition"
            >
              Try Sample Test
            </a>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl font-bold text-center mb-4 text-primary">
            Why Choose Decode Maths?
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
            Join thousands of students mastering CBSE Mathematics
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
          <img src={LOGO_URL} alt="Logo" className="h-16 w-auto mx-auto mb-4" />
          <p className="text-gray-300 mb-4">
            Decode Maths - Master CBSE Mathematics with Expert Guidance
          </p>
          <div className="flex justify-center space-x-6 mb-4">
            <Link to="/about" className="text-gray-300 hover:text-accent transition">About</Link>
            <Link to="/contact" className="text-gray-300 hover:text-accent transition">Contact</Link>
            <Link to="/sample-test" className="text-gray-300 hover:text-accent transition">Sample Test</Link>
          </div>
          <p className="text-gray-400 text-sm">
            © 2024 Decode Maths. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};

// Sample Test Page (No login required)
const SampleTestPage = () => {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedClass, setSelectedClass] = useState('10');
  const [chapters, setChapters] = useState([]);
  const [selectedChapter, setSelectedChapter] = useState('');
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);

  useEffect(() => {
    fetchChapters();
  }, [selectedClass]);

  useEffect(() => {
    if (selectedChapter) {
      fetchSampleQuestions();
    }
  }, [selectedChapter]);

  const fetchChapters = async () => {
    try {
      const response = await axios.get(`${API}/public/chapters?class_level=${selectedClass}`);
      setChapters(response.data);
      setSelectedChapter('');
      setQuestions([]);
      setAnswers({});
      setSubmitted(false);
    } catch (error) {
      console.error('Error fetching chapters:', error);
    }
  };

  const fetchSampleQuestions = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/sample-questions?chapter_id=${selectedChapter}`);
      setQuestions(response.data);
      setAnswers({});
      setSubmitted(false);
    } catch (error) {
      console.error('Error fetching sample questions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = () => {
    let correct = 0;
    questions.forEach(q => {
      if (answers[q.question_id] === q.correct_answer) {
        correct++;
      }
    });
    setScore(correct);
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-gray-50 pt-28 pb-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4 text-primary">Free Sample Test</h1>
          <p className="text-gray-600 mb-2">Try 10 MCQ questions without signing up!</p>
          <p className="text-sm text-gray-500 mb-6">📝 Only MCQ questions for quick analysis</p>
          
          {/* Class and Chapter Selection */}
          <div className="bg-white p-6 rounded-xl shadow-lg mb-6 max-w-2xl mx-auto">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-left text-gray-700 font-semibold mb-2">Select Class</label>
                <select
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary font-semibold"
                >
                  <option value="10">Class 10</option>
                  <option value="11">Class 11</option>
                  <option value="12">Class 12</option>
                  <option value="JEE">JEE</option>
                  <option value="CA Foundation">CA Foundation</option>
                </select>
              </div>
              <div>
                <label className="block text-left text-gray-700 font-semibold mb-2">Select Chapter</label>
                <select
                  value={selectedChapter}
                  onChange={(e) => setSelectedChapter(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary font-semibold"
                  disabled={chapters.length === 0}
                >
                  <option value="">Choose a chapter...</option>
                  {chapters.map((chapter, index) => (
                    <option key={chapter.chapter_id} value={chapter.chapter_id}>
                      Chapter {index + 1}: {chapter.chapter_name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            {!selectedChapter && (
              <p className="text-sm text-gray-500 mt-4">👆 Please select a chapter to start the test</p>
            )}
          </div>

          {/* Login CTA */}
          <div className="bg-gradient-to-r from-accent to-orange-600 text-white p-4 rounded-lg mb-6 max-w-2xl mx-auto">
            <p className="font-bold text-lg mb-2">🎓 Want More Practice Questions?</p>
            <p className="text-sm mb-3">Login or Sign up to access complete chapter-wise practice with video solutions!</p>
            <Link to="/" className="inline-block px-6 py-2 bg-white text-accent rounded-lg font-bold hover:shadow-lg transition">
              Login / Sign Up Now
            </Link>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        ) : (
          <>
            {submitted && (
              <div className="bg-green-100 border-2 border-green-500 text-green-800 p-6 rounded-xl mb-6 text-center">
                <div className="text-3xl font-bold mb-2">Score: {score} / {questions.length}</div>
                <p className="text-lg">Great job! Sign up to access more questions and track your progress.</p>
                <Link to="/" className="inline-block mt-4 px-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700">
                  Sign Up Now
                </Link>
              </div>
            )}

            <div className="space-y-6">
              {questions.map((q, index) => (
                <div key={q.question_id} className="bg-white p-6 rounded-xl shadow-lg">
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-lg font-bold text-primary">
                      Question {index + 1} ({q.question_type} - {q.marks} mark{q.marks > 1 ? 's' : ''})
                    </h3>
                  </div>
                  <p className="text-gray-800 mb-4 whitespace-pre-line">{q.question_text}</p>
                  
                  {q.options && (
                    <div className="space-y-2">
                      {q.options.map((option, idx) => (
                        <label
                          key={idx}
                          className={`flex items-center p-3 border-2 rounded-lg cursor-pointer transition ${
                            answers[q.question_id] === option
                              ? 'border-primary bg-primary/10'
                              : 'border-gray-300 hover:border-primary'
                          } ${
                            submitted && option === q.correct_answer
                              ? 'bg-green-100 border-green-500'
                              : submitted && answers[q.question_id] === option && option !== q.correct_answer
                              ? 'bg-red-100 border-red-500'
                              : ''
                          }`}
                        >
                          <input
                            type="radio"
                            name={q.question_id}
                            value={option}
                            checked={answers[q.question_id] === option}
                            onChange={(e) => setAnswers({ ...answers, [q.question_id]: e.target.value })}
                            disabled={submitted}
                            className="mr-3"
                          />
                          <span className="font-medium">{option}</span>
                        </label>
                      ))}
                    </div>
                  )}

                  {!q.options && (
                    <textarea
                      value={answers[q.question_id] || ''}
                      onChange={(e) => setAnswers({ ...answers, [q.question_id]: e.target.value })}
                      disabled={submitted}
                      className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-primary focus:outline-none"
                      rows="4"
                      placeholder="Write your answer here..."
                    />
                  )}

                  {submitted && q.explanation && (
                    <div className="mt-4 p-4 bg-blue-50 border-l-4 border-blue-500 rounded">
                      <p className="text-sm font-semibold text-blue-900 mb-1">Explanation:</p>
                      <p className="text-sm text-blue-800">{q.explanation}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {!submitted && questions.length > 0 && (
              <div className="mt-8 text-center">
                <button
                  onClick={handleSubmit}
                  className="px-8 py-4 bg-gradient-to-r from-primary to-primary-dark text-white rounded-lg font-bold text-lg hover:shadow-lg transition"
                  data-testid="submit-sample-test"
                >
                  Submit Test
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

// About Page
const AboutPage = () => {
  return (
    <div className="min-h-screen bg-gray-50 pt-28 pb-12">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <img src={LOGO_URL} alt="Logo" className="h-24 w-auto mx-auto mb-6" />
          <h1 className="text-5xl font-bold mb-4 text-primary">About Decode Maths</h1>
          <div className="w-24 h-1 bg-accent mx-auto mb-6"></div>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8 md:p-12 mb-8">
          <h2 className="text-3xl font-bold mb-6 text-primary">Our Mission</h2>
          <p className="text-gray-700 text-lg leading-relaxed mb-6">
            At <span className="font-bold text-primary">Decode Maths</span>, our mission is to make mathematics accessible, 
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
    console.log('Form submitted:', formData);
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      setFormData({ name: '', email: '', phone: '', message: '' });
    }, 3000);
  };

  return (
    <div className="min-h-screen bg-gray-50 pt-28 pb-12">
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
                  <p className="text-gray-600">support@decodemathsnow.com</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-xl p-8">
              <div className="flex items-start space-x-4">
                <div className="text-4xl">💬</div>
                <div>
                  <h3 className="text-xl font-bold mb-2 text-primary">WhatsApp</h3>
                  <a href="https://wa.me/918770012626" target="_blank" rel="noopener noreferrer" className="text-green-600 hover:text-green-700 font-semibold">
                    +91 8770012626
                  </a>
                  <p className="text-gray-600 text-sm mt-1">Mon-Sat: 9:00 AM - 8:00 PM</p>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-r from-primary to-primary-dark rounded-2xl shadow-xl p-8 text-white">
              <h3 className="text-2xl font-bold mb-4">Follow Us on YouTube</h3>
              <a 
                href="https://www.youtube.com/@decodemathsnow" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center space-x-3 bg-white/20 hover:bg-white/30 rounded-lg p-4 transition group"
              >
                <div className="w-12 h-12 bg-red-600 rounded-full flex items-center justify-center">
                  <span className="text-2xl">▶️</span>
                </div>
                <div className="text-left">
                  <div className="font-bold text-lg group-hover:text-accent transition">Decode Maths Now</div>
                  <div className="text-sm text-white/80">@decodemathsnow</div>
                </div>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Pricing Page with Mock Payment Flow
const PricingPage = () => {
  const { user, subscriptionStatus, refreshSubscription } = useAuth();
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [couponCode, setCouponCode] = useState('');
  const [couponStatus, setCouponStatus] = useState(null);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      const response = await axios.get(`${API}/subscription/plans`);
      setPlans(response.data);
    } catch (error) {
      console.error('Error fetching plans:', error);
    } finally {
      setLoading(false);
    }
  };

  const validateCoupon = async () => {
    if (!couponCode.trim()) return;
    
    try {
      const response = await axios.post(`${API}/subscription/validate-coupon?coupon_code=${couponCode}`);
      setCouponStatus({ valid: true, discount: response.data.discount_percent });
    } catch (error) {
      setCouponStatus({ valid: false, message: error.response?.data?.detail || 'Invalid coupon' });
    }
  };

  const handlePayment = async (plan) => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }

    setSelectedPlan(plan);
  };

  const processPayment = async () => {
    if (!selectedPlan) return;
    
    setProcessingPayment(true);
    
    try {
      // Initiate payment
      const initResponse = await axios.post(`${API}/subscription/initiate-payment`, {
        plan_id: selectedPlan.plan_id,
        coupon_code: couponStatus?.valid ? couponCode : null
      });
      
      // Simulate payment processing delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Complete payment (mock)
      const completeResponse = await axios.post(`${API}/subscription/complete-payment/${initResponse.data.payment_id}`);
      
      setPaymentSuccess(true);
      refreshSubscription();
    } catch (error) {
      alert('Payment failed: ' + (error.response?.data?.detail || 'Please try again'));
    } finally {
      setProcessingPayment(false);
    }
  };

  const calculatePrice = (plan) => {
    if (couponStatus?.valid) {
      const discount = Math.round(plan.price * couponStatus.discount / 100);
      return plan.price - discount;
    }
    return plan.price;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 pt-28 pb-12 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Payment Success Screen
  if (paymentSuccess) {
    return (
      <div className="min-h-screen bg-gray-50 pt-28 pb-12">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white p-8 rounded-2xl shadow-lg text-center">
            <div className="text-6xl mb-4">🎉</div>
            <h2 className="text-3xl font-bold mb-4 text-primary">Payment Successful!</h2>
            <p className="text-gray-600 mb-6">
              Congratulations! Your premium subscription is now active. You have unlimited access to all chapters.
            </p>
            <div className="bg-green-50 border border-green-200 p-4 rounded-lg mb-6">
              <p className="text-green-800 font-semibold">✅ {selectedPlan?.name} - ₹{calculatePrice(selectedPlan)}</p>
            </div>
            <a 
              href="/practice" 
              className="inline-block px-8 py-4 bg-gradient-to-r from-primary to-primary-dark text-white rounded-lg font-bold hover:shadow-lg transition"
            >
              Start Learning Now
            </a>
          </div>
        </div>
      </div>
    );
  }

  // Mock Payment Checkout Modal
  if (selectedPlan && !paymentSuccess) {
    return (
      <div className="min-h-screen bg-gray-50 pt-28 pb-12">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <button 
            onClick={() => setSelectedPlan(null)}
            className="mb-6 text-primary font-semibold hover:underline flex items-center"
          >
            ← Back to Plans
          </button>
          
          <div className="bg-white p-8 rounded-2xl shadow-lg">
            <h2 className="text-2xl font-bold mb-6 text-primary">Complete Your Purchase</h2>
            
            {/* Plan Summary */}
            <div className="bg-gray-50 p-4 rounded-lg mb-6">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-bold text-lg">{selectedPlan.name}</h3>
                  <p className="text-gray-600 text-sm">{selectedPlan.duration_days} days access</p>
                </div>
                <div className="text-right">
                  {couponStatus?.valid && (
                    <p className="text-sm text-gray-500 line-through">₹{selectedPlan.price}</p>
                  )}
                  <p className="text-2xl font-bold text-primary">₹{calculatePrice(selectedPlan)}</p>
                </div>
              </div>
            </div>

            {/* Coupon Input */}
            <div className="mb-6">
              <label className="block text-gray-700 font-semibold mb-2">Have a coupon code?</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                  placeholder="Enter coupon code"
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  data-testid="coupon-input"
                />
                <button
                  onClick={validateCoupon}
                  className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition"
                >
                  Apply
                </button>
              </div>
              {couponStatus && (
                <p className={`mt-2 text-sm ${couponStatus.valid ? 'text-green-600' : 'text-red-600'}`}>
                  {couponStatus.valid ? `✓ ${couponStatus.discount}% discount applied!` : `✗ ${couponStatus.message}`}
                </p>
              )}
            </div>

            {/* Mock Payment Form */}
            <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg mb-6">
              <p className="text-blue-800 text-sm font-semibold mb-2">🔒 DEMO MODE - Mock Payment</p>
              <p className="text-blue-700 text-sm">
                This is a demonstration. Click "Pay Now" to simulate a successful payment.
              </p>
            </div>

            {/* Payment Details (Mock) */}
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-gray-700 font-semibold mb-2">Card Number</label>
                <input
                  type="text"
                  value="4242 4242 4242 4242"
                  disabled
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-100"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-700 font-semibold mb-2">Expiry</label>
                  <input
                    type="text"
                    value="12/28"
                    disabled
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 font-semibold mb-2">CVV</label>
                  <input
                    type="text"
                    value="123"
                    disabled
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-100"
                  />
                </div>
              </div>
            </div>

            <button
              onClick={processPayment}
              disabled={processingPayment}
              className="w-full py-4 bg-gradient-to-r from-accent to-orange-600 text-white rounded-lg font-bold text-lg hover:shadow-lg transition disabled:opacity-50"
              data-testid="pay-now-btn"
            >
              {processingPayment ? (
                <span className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Processing Payment...
                </span>
              ) : (
                `Pay ₹${calculatePrice(selectedPlan)} Now`
              )}
            </button>

            <p className="text-center text-gray-500 text-sm mt-4">
              Secure payment powered by Decode Maths (Demo)
            </p>
          </div>
        </div>
        
        {showAuthModal && <AuthModal onClose={() => setShowAuthModal(false)} />}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-28 pb-12">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold mb-4 text-primary">Choose Your Plan</h1>
          <div className="w-24 h-1 bg-accent mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Unlock unlimited access to all chapters and features</p>
          
          {/* Current Subscription Status */}
          {user && subscriptionStatus && (
            <div className={`mt-6 inline-flex items-center px-6 py-3 rounded-full text-sm font-bold ${
              subscriptionStatus.is_premium 
                ? 'bg-green-100 text-green-800' 
                : 'bg-yellow-100 text-yellow-800'
            }`}>
              {subscriptionStatus.is_premium ? (
                <>✅ You are a Premium Member! Subscription active until {new Date(subscriptionStatus.subscription_end_date).toLocaleDateString()}</>
              ) : (
                <>📚 Free Plan - {subscriptionStatus.free_chapters_remaining} free chapters remaining</>
              )}
            </div>
          )}
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-8">
          {plans.map((plan, index) => {
            const isPopular = index === 1; // Quarterly is most popular
            return (
              <div 
                key={plan.plan_id}
                className={`bg-white rounded-2xl shadow-xl overflow-hidden transform transition hover:-translate-y-2 ${
                  isPopular ? 'ring-4 ring-accent scale-105' : ''
                }`}
              >
                {isPopular && (
                  <div className="bg-accent text-white text-center py-2 font-bold">
                    MOST POPULAR
                  </div>
                )}
                <div className="p-8">
                  <h3 className="text-2xl font-bold mb-2 text-primary">{plan.name}</h3>
                  <div className="mb-6">
                    <span className="text-4xl font-bold text-accent">₹{plan.price}</span>
                    <span className="text-gray-600">/{plan.duration_days} days</span>
                  </div>
                  
                  <ul className="space-y-3 mb-8">
                    {plan.features.map((feature, idx) => (
                      <li key={idx} className="flex items-center text-gray-700">
                        <span className="text-green-500 mr-2">✓</span>
                        {feature}
                      </li>
                    ))}
                  </ul>
                  
                  <button
                    onClick={() => handlePayment(plan)}
                    disabled={subscriptionStatus?.is_premium}
                    className={`w-full py-4 rounded-lg font-bold text-lg transition ${
                      subscriptionStatus?.is_premium
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : isPopular
                        ? 'bg-gradient-to-r from-accent to-orange-600 text-white hover:shadow-lg'
                        : 'bg-gradient-to-r from-primary to-primary-dark text-white hover:shadow-lg'
                    }`}
                    data-testid={`select-plan-${plan.plan_id}`}
                  >
                    {subscriptionStatus?.is_premium ? 'Already Premium' : 'Choose Plan'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Free Tier Info */}
        <div className="mt-12 bg-white p-8 rounded-2xl shadow-lg">
          <h3 className="text-2xl font-bold mb-4 text-primary text-center">Free Plan Features</h3>
          <div className="grid md:grid-cols-3 gap-6 text-center">
            <div className="p-4">
              <div className="text-4xl mb-2">📚</div>
              <h4 className="font-bold text-lg mb-2">2 Free Chapters</h4>
              <p className="text-gray-600">Access any 2 chapters of your choice completely free</p>
            </div>
            <div className="p-4">
              <div className="text-4xl mb-2">📝</div>
              <h4 className="font-bold text-lg mb-2">Sample Tests</h4>
              <p className="text-gray-600">Unlimited access to free sample tests with 10 MCQs</p>
            </div>
            <div className="p-4">
              <div className="text-4xl mb-2">📊</div>
              <h4 className="font-bold text-lg mb-2">Progress Tracking</h4>
              <p className="text-gray-600">Track your learning progress and test scores</p>
            </div>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="mt-12">
          <h3 className="text-2xl font-bold mb-6 text-primary text-center">Frequently Asked Questions</h3>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-xl shadow-lg">
              <h4 className="font-bold text-lg mb-2 text-primary">How does the free plan work?</h4>
              <p className="text-gray-600">After signing up, you can access any 2 chapters completely free. Once you've used your free chapters, you'll need to subscribe for unlimited access.</p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-lg">
              <h4 className="font-bold text-lg mb-2 text-primary">Can I cancel my subscription?</h4>
              <p className="text-gray-600">Yes, you can cancel anytime. Your access will continue until the end of your billing period.</p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-lg">
              <h4 className="font-bold text-lg mb-2 text-primary">What payment methods do you accept?</h4>
              <p className="text-gray-600">We accept all major credit/debit cards, UPI, and net banking through our secure payment gateway.</p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-lg">
              <h4 className="font-bold text-lg mb-2 text-primary">Do you offer refunds?</h4>
              <p className="text-gray-600">If you're not satisfied within 7 days of purchase, contact us for a full refund.</p>
            </div>
          </div>
        </div>
      </div>
      
      {showAuthModal && <AuthModal onClose={() => setShowAuthModal(false)} />}
    </div>
  );
};

export default function App() {
  const [showAuthModal, setShowAuthModal] = useState(false);

  return (
    <AuthProvider>
      <BrowserRouter basename="/app">
        <div className="App">
          <Navbar onAuthClick={() => setShowAuthModal(true)} />
          <Routes>
            <Route path="/" element={<LandingPage onAuthClick={() => setShowAuthModal(true)} />} />
            <Route path="/sample-test" element={<SampleTestPage />} />
            <Route path="/pricing" element={<PricingPage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/practice" element={<PracticePage />} />
            <Route path="/admin" element={<AdminPanel />} />
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
    name: '',
    mobile_number: '',
    email: '',
    password: '',
    class_level: '10',
    school_name: '',
    city: ''
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
        await login(formData.mobile_number, formData.password);
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 relative my-8">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-2xl"
          data-testid="close-auth-modal"
        >
          ×
        </button>

        <div className="text-center mb-6">
          <img src={LOGO_URL} alt="Logo" className="h-16 w-auto mx-auto mb-4" />
          <h2 className="text-3xl font-bold text-primary">
            {isLogin ? 'Welcome Back!' : 'Join Decode Maths!'}
          </h2>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div>
              <label className="block text-gray-700 font-semibold mb-2">Full Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                required
                data-testid="name-input"
              />
            </div>
          )}

          <div>
            <label className="block text-gray-700 font-semibold mb-2">Mobile Number *</label>
            <input
              type="tel"
              value={formData.mobile_number}
              onChange={(e) => setFormData({ ...formData, mobile_number: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              required
              placeholder="10-digit mobile number"
              pattern="[0-9]{10}"
              data-testid="mobile-input"
            />
          </div>

          {!isLogin && (
            <>
              <div>
                <label className="block text-gray-700 font-semibold mb-2">Email *</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                  data-testid="email-input"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-semibold mb-2">Class *</label>
                <select
                  value={formData.class_level}
                  onChange={(e) => setFormData({ ...formData, class_level: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  data-testid="class-select"
                >
                  <option value="10">Class 10</option>
                  <option value="11">Class 11</option>
                  <option value="12">Class 12</option>
                  <option value="JEE">JEE</option>
                  <option value="CA Foundation">CA Foundation</option>
                </select>
              </div>

              <div>
                <label className="block text-gray-700 font-semibold mb-2">School Name *</label>
                <input
                  type="text"
                  value={formData.school_name}
                  onChange={(e) => setFormData({ ...formData, school_name: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                  data-testid="school-input"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-semibold mb-2">City *</label>
                <input
                  type="text"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                  data-testid="city-input"
                />
              </div>
            </>
          )}

          <div>
            <label className="block text-gray-700 font-semibold mb-2">Password *</label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              required
              minLength="6"
              data-testid="password-input"
            />
          </div>

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
    <div className="min-h-screen bg-gray-50 pt-28 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 text-primary">
            Welcome back, {user.name}!
          </h1>
          <p className="text-gray-600">Class {user.class_level} • {user.school_name}</p>
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

// Practice Page Component with Practice vs Test selection
const PracticePage = () => {
  const { user, subscriptionStatus, refreshSubscription } = useAuth();
  const [mode, setMode] = useState(null); // 'practice' or 'test'
  const [chapters, setChapters] = useState([]);
  const [selectedChapter, setSelectedChapter] = useState('');
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(null);
  const [loading, setLoading] = useState(false);
  const [accessDenied, setAccessDenied] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

  useEffect(() => {
    if (user?.class_level) {
      fetchChapters();
    }
  }, [user?.class_level]);

  const fetchChapters = async () => {
    try {
      const response = await axios.get(`${API}/chapters?class_level=${user.class_level}`);
      setChapters(response.data);
    } catch (error) {
      console.error('Error fetching chapters:', error);
    }
  };

  const checkAccessAndFetchQuestions = async () => {
    if (!selectedChapter) return;
    
    setLoading(true);
    setAccessDenied(false);
    
    try {
      // Check access first
      const accessResponse = await axios.post(`${API}/subscription/check-access/${selectedChapter}`);
      
      if (!accessResponse.data.has_access) {
        setAccessDenied(true);
        setLoading(false);
        return;
      }
      
      // Refresh subscription status
      refreshSubscription();
      
      // Fetch questions based on mode
      const endpoint = mode === 'test' 
        ? `${API}/chapter-test/${selectedChapter}`
        : `${API}/chapter-practice/${selectedChapter}`;
      
      const response = await axios.get(endpoint);
      setQuestions(response.data);
      setAnswers({});
      setSubmitted(false);
      setScore(null);
      setCurrentQuestionIndex(0);
    } catch (error) {
      console.error('Error fetching questions:', error);
      if (error.response?.status === 403 || error.response?.status === 401) {
        setAccessDenied(true);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    // Calculate score
    let correctCount = 0;
    let totalMarks = 0;
    let scoredMarks = 0;
    
    questions.forEach(q => {
      totalMarks += q.marks;
      if (answers[q.question_id] === q.correct_answer) {
        correctCount++;
        scoredMarks += q.marks;
      }
    });
    
    const percentage = totalMarks > 0 ? Math.round((scoredMarks / totalMarks) * 100) : 0;
    
    setScore({
      correct: correctCount,
      total: questions.length,
      percentage,
      totalMarks,
      scoredMarks
    });
    setSubmitted(true);
    
    // Save attempt
    try {
      await axios.post(`${API}/test-attempts`, {
        chapter_id: selectedChapter,
        questions_answered: questions.map(q => ({
          question_id: q.question_id,
          user_answer: answers[q.question_id] || ''
        }))
      });
    } catch (error) {
      console.error('Error saving attempt:', error);
    }
  };

  const resetPractice = () => {
    setMode(null);
    setSelectedChapter('');
    setQuestions([]);
    setAnswers({});
    setSubmitted(false);
    setScore(null);
    setAccessDenied(false);
  };

  // Mode Selection Screen
  if (!mode) {
    return (
      <div className="min-h-screen bg-gray-50 pt-28 pb-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold mb-4 text-primary">Choose Your Mode</h1>
            <p className="text-gray-600">Class {user?.class_level} - {user?.name}</p>
            
            {/* Subscription Status Banner */}
            {subscriptionStatus && (
              <div className={`mt-4 inline-flex items-center px-4 py-2 rounded-full text-sm font-semibold ${
                subscriptionStatus.is_premium 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-yellow-100 text-yellow-800'
              }`}>
                {subscriptionStatus.is_premium ? (
                  <>✅ Premium Active</>
                ) : (
                  <>📚 Free Plan - {subscriptionStatus.free_chapters_remaining} chapters remaining</>
                )}
              </div>
            )}
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Practice Mode */}
            <div 
              onClick={() => setMode('practice')}
              className="bg-white p-8 rounded-2xl shadow-lg hover:shadow-2xl transition cursor-pointer transform hover:-translate-y-2 border-t-4 border-blue-500"
              data-testid="practice-mode-card"
            >
              <div className="text-6xl mb-4 text-center">📖</div>
              <h2 className="text-2xl font-bold mb-4 text-primary text-center">Chapter Practice</h2>
              <p className="text-gray-600 text-center mb-4">
                Practice all questions from a chapter at your own pace. Perfect for learning and revision.
              </p>
              <ul className="text-sm text-gray-600 space-y-2">
                <li className="flex items-center"><span className="text-green-500 mr-2">✓</span> All question types</li>
                <li className="flex items-center"><span className="text-green-500 mr-2">✓</span> No time limit</li>
                <li className="flex items-center"><span className="text-green-500 mr-2">✓</span> Detailed explanations</li>
                <li className="flex items-center"><span className="text-green-500 mr-2">✓</span> Video solutions</li>
              </ul>
            </div>

            {/* Test Mode */}
            <div 
              onClick={() => setMode('test')}
              className="bg-white p-8 rounded-2xl shadow-lg hover:shadow-2xl transition cursor-pointer transform hover:-translate-y-2 border-t-4 border-accent"
              data-testid="test-mode-card"
            >
              <div className="text-6xl mb-4 text-center">📝</div>
              <h2 className="text-2xl font-bold mb-4 text-primary text-center">Chapter Test</h2>
              <p className="text-gray-600 text-center mb-4">
                Take a structured test with CBSE exam pattern. Test your understanding!
              </p>
              <ul className="text-sm text-gray-600 space-y-2">
                <li className="flex items-center"><span className="text-accent mr-2">✓</span> 5 MCQ Questions</li>
                <li className="flex items-center"><span className="text-accent mr-2">✓</span> 3 × 2 Marks Questions</li>
                <li className="flex items-center"><span className="text-accent mr-2">✓</span> 3 × 3 Marks Questions</li>
                <li className="flex items-center"><span className="text-accent mr-2">✓</span> 2 × 5 Marks Questions</li>
              </ul>
            </div>
          </div>

          {!subscriptionStatus?.is_premium && (
            <div className="mt-8 bg-gradient-to-r from-accent to-orange-600 text-white p-6 rounded-xl text-center">
              <h3 className="text-xl font-bold mb-2">Upgrade to Premium!</h3>
              <p className="mb-4">Get unlimited access to all chapters for just ₹499/month</p>
              <a 
                href="/pricing" 
                className="inline-block px-6 py-3 bg-white text-accent rounded-lg font-bold hover:shadow-lg transition"
              >
                View Plans
              </a>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Chapter Selection Screen
  if (!questions.length && !loading && !accessDenied) {
    return (
      <div className="min-h-screen bg-gray-50 pt-28 pb-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <button 
            onClick={resetPractice}
            className="mb-6 text-primary font-semibold hover:underline flex items-center"
          >
            ← Back to Mode Selection
          </button>
          
          <div className="bg-white p-8 rounded-2xl shadow-lg">
            <h2 className="text-3xl font-bold mb-6 text-primary">
              {mode === 'test' ? '📝 Chapter Test' : '📖 Chapter Practice'}
            </h2>
            
            <div className="mb-6">
              <label className="block text-gray-700 font-semibold mb-2">Select Chapter</label>
              <select
                value={selectedChapter}
                onChange={(e) => setSelectedChapter(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-lg"
                data-testid="chapter-select"
              >
                <option value="">Choose a chapter...</option>
                {chapters.map((chapter, index) => (
                  <option key={chapter.chapter_id} value={chapter.chapter_id}>
                    Chapter {index + 1}: {chapter.chapter_name}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={checkAccessAndFetchQuestions}
              disabled={!selectedChapter}
              className="w-full py-4 bg-gradient-to-r from-primary to-primary-dark text-white rounded-lg font-bold text-lg hover:shadow-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
              data-testid="start-practice-btn"
            >
              {mode === 'test' ? 'Start Test' : 'Start Practice'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Access Denied Screen
  if (accessDenied) {
    return (
      <div className="min-h-screen bg-gray-50 pt-28 pb-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white p-8 rounded-2xl shadow-lg text-center">
            <div className="text-6xl mb-4">🔒</div>
            <h2 className="text-3xl font-bold mb-4 text-primary">Subscription Required</h2>
            <p className="text-gray-600 mb-6">
              You've used all your free chapters. Subscribe to unlock unlimited access to all chapters!
            </p>
            <div className="flex justify-center gap-4">
              <a 
                href="/pricing" 
                className="px-8 py-4 bg-gradient-to-r from-accent to-orange-600 text-white rounded-lg font-bold hover:shadow-lg transition"
              >
                View Subscription Plans
              </a>
              <button
                onClick={resetPractice}
                className="px-8 py-4 bg-gray-300 text-gray-700 rounded-lg font-bold hover:bg-gray-400 transition"
              >
                Go Back
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Loading Screen
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 pt-28 pb-12 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600 font-semibold">Loading questions...</p>
        </div>
      </div>
    );
  }

  // Results Screen
  if (submitted && score) {
    return (
      <div className="min-h-screen bg-gray-50 pt-28 pb-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white p-8 rounded-2xl shadow-lg text-center">
            <div className="text-6xl mb-4">{score.percentage >= 70 ? '🎉' : score.percentage >= 40 ? '👍' : '📚'}</div>
            <h2 className="text-3xl font-bold mb-4 text-primary">
              {score.percentage >= 70 ? 'Excellent!' : score.percentage >= 40 ? 'Good Job!' : 'Keep Practicing!'}
            </h2>
            
            <div className="grid md:grid-cols-3 gap-4 mb-8">
              <div className="bg-blue-50 p-4 rounded-xl">
                <div className="text-3xl font-bold text-blue-600">{score.percentage}%</div>
                <div className="text-gray-600">Score</div>
              </div>
              <div className="bg-green-50 p-4 rounded-xl">
                <div className="text-3xl font-bold text-green-600">{score.correct}/{score.total}</div>
                <div className="text-gray-600">Correct Answers</div>
              </div>
              <div className="bg-purple-50 p-4 rounded-xl">
                <div className="text-3xl font-bold text-purple-600">{score.scoredMarks}/{score.totalMarks}</div>
                <div className="text-gray-600">Marks</div>
              </div>
            </div>

            <div className="flex justify-center gap-4">
              <button
                onClick={() => {
                  setSubmitted(false);
                  setAnswers({});
                  setCurrentQuestionIndex(0);
                }}
                className="px-6 py-3 bg-primary text-white rounded-lg font-bold hover:shadow-lg transition"
              >
                Review Answers
              </button>
              <button
                onClick={resetPractice}
                className="px-6 py-3 bg-accent text-white rounded-lg font-bold hover:shadow-lg transition"
              >
                Practice More
              </button>
            </div>
          </div>

          {/* Question Review */}
          <div className="mt-8 space-y-6">
            <h3 className="text-2xl font-bold text-primary">Answer Review</h3>
            {questions.map((q, index) => {
              const isCorrect = answers[q.question_id] === q.correct_answer;
              return (
                <div key={q.question_id} className={`bg-white p-6 rounded-xl shadow-lg border-l-4 ${isCorrect ? 'border-green-500' : 'border-red-500'}`}>
                  <div className="flex justify-between items-start mb-4">
                    <h4 className="text-lg font-bold text-primary">
                      Q{index + 1}. {q.question_type} ({q.marks} marks)
                    </h4>
                    <span className={`px-3 py-1 rounded-full text-sm font-bold ${isCorrect ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {isCorrect ? '✓ Correct' : '✗ Incorrect'}
                    </span>
                  </div>
                  <p className="text-gray-800 mb-4 whitespace-pre-line">{q.question_text}</p>
                  
                  {q.options && (
                    <div className="space-y-2 mb-4">
                      {q.options.map((opt, idx) => (
                        <div 
                          key={idx}
                          className={`p-3 rounded-lg ${
                            opt === q.correct_answer ? 'bg-green-100 border border-green-500' :
                            opt === answers[q.question_id] && opt !== q.correct_answer ? 'bg-red-100 border border-red-500' :
                            'bg-gray-50'
                          }`}
                        >
                          {opt}
                          {opt === q.correct_answer && <span className="ml-2 text-green-600 font-bold">(Correct)</span>}
                          {opt === answers[q.question_id] && opt !== q.correct_answer && <span className="ml-2 text-red-600 font-bold">(Your answer)</span>}
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {!isCorrect && !q.options && (
                    <div className="bg-green-50 p-4 rounded-lg mb-4">
                      <p className="font-semibold text-green-800">Correct Answer:</p>
                      <p className="text-green-700">{q.correct_answer}</p>
                    </div>
                  )}

                  {q.explanation && (
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <p className="font-semibold text-blue-800 mb-1">Explanation:</p>
                      <p className="text-blue-700">{q.explanation}</p>
                    </div>
                  )}

                  {q.youtube_solution_url && (
                    <a 
                      href={q.youtube_solution_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="inline-flex items-center mt-3 text-red-600 hover:text-red-700 font-semibold"
                    >
                      ▶️ Watch Video Solution
                    </a>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // Practice/Test Screen
  const currentQuestion = questions[currentQuestionIndex];
  
  return (
    <div className="min-h-screen bg-gray-50 pt-28 pb-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="bg-white p-4 rounded-xl shadow-lg mb-6 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-primary">
              {mode === 'test' ? 'Chapter Test' : 'Chapter Practice'}
            </h2>
            <p className="text-gray-600 text-sm">
              Question {currentQuestionIndex + 1} of {questions.length}
            </p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-accent">
              {Object.keys(answers).length}/{questions.length}
            </div>
            <div className="text-gray-600 text-sm">Answered</div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="bg-gray-200 rounded-full h-2 mb-6">
          <div 
            className="bg-primary h-2 rounded-full transition-all duration-300"
            style={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }}
          ></div>
        </div>

        {/* Question Card */}
        <div className="bg-white p-6 rounded-xl shadow-lg mb-6">
          <div className="flex justify-between items-start mb-4">
            <span className="px-3 py-1 bg-primary text-white rounded-full text-sm font-bold">
              {currentQuestion.question_type}
            </span>
            <span className="px-3 py-1 bg-accent text-white rounded-full text-sm font-bold">
              {currentQuestion.marks} marks
            </span>
          </div>
          
          <p className="text-gray-800 text-lg mb-6 whitespace-pre-line">{currentQuestion.question_text}</p>
          
          {currentQuestion.options ? (
            <div className="space-y-3">
              {currentQuestion.options.map((option, idx) => (
                <label
                  key={idx}
                  className={`flex items-center p-4 border-2 rounded-lg cursor-pointer transition ${
                    answers[currentQuestion.question_id] === option
                      ? 'border-primary bg-primary/10'
                      : 'border-gray-300 hover:border-primary'
                  }`}
                >
                  <input
                    type="radio"
                    name={currentQuestion.question_id}
                    value={option}
                    checked={answers[currentQuestion.question_id] === option}
                    onChange={(e) => setAnswers({ ...answers, [currentQuestion.question_id]: e.target.value })}
                    className="mr-3 w-5 h-5"
                  />
                  <span className="font-medium">{option}</span>
                </label>
              ))}
            </div>
          ) : (
            <textarea
              value={answers[currentQuestion.question_id] || ''}
              onChange={(e) => setAnswers({ ...answers, [currentQuestion.question_id]: e.target.value })}
              className="w-full p-4 border-2 border-gray-300 rounded-lg focus:border-primary focus:outline-none"
              rows="6"
              placeholder="Write your answer here..."
            />
          )}

          {currentQuestion.special_note && (
            <div className="mt-4 p-3 bg-yellow-50 border-l-4 border-yellow-400 rounded">
              <p className="text-sm text-yellow-800">📌 {currentQuestion.special_note}</p>
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex justify-between items-center">
          <button
            onClick={() => setCurrentQuestionIndex(Math.max(0, currentQuestionIndex - 1))}
            disabled={currentQuestionIndex === 0}
            className="px-6 py-3 bg-gray-300 text-gray-700 rounded-lg font-bold hover:bg-gray-400 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            ← Previous
          </button>

          {currentQuestionIndex < questions.length - 1 ? (
            <button
              onClick={() => setCurrentQuestionIndex(currentQuestionIndex + 1)}
              className="px-6 py-3 bg-primary text-white rounded-lg font-bold hover:shadow-lg transition"
            >
              Next →
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              className="px-8 py-3 bg-gradient-to-r from-accent to-orange-600 text-white rounded-lg font-bold hover:shadow-lg transition"
              data-testid="submit-test-btn"
            >
              Submit {mode === 'test' ? 'Test' : 'Practice'}
            </button>
          )}
        </div>

        {/* Question Navigator */}
        <div className="mt-6 bg-white p-4 rounded-xl shadow-lg">
          <h4 className="font-bold text-gray-700 mb-3">Question Navigator</h4>
          <div className="flex flex-wrap gap-2">
            {questions.map((q, idx) => (
              <button
                key={q.question_id}
                onClick={() => setCurrentQuestionIndex(idx)}
                className={`w-10 h-10 rounded-lg font-bold transition ${
                  idx === currentQuestionIndex
                    ? 'bg-primary text-white'
                    : answers[q.question_id]
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {idx + 1}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// Admin Panel Component
const AdminPanel = () => {
  const [activeTab, setActiveTab] = useState('questions');
  const [questions, setQuestions] = useState([]);
  const [chapters, setChapters] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [formData, setFormData] = useState({
    chapter_id: '',
    question_type: 'MCQ',
    question_text: '',
    options: ['', '', '', ''],
    correct_answer: '',
    marks: 1,
    youtube_solution_url: '',
    explanation: '',
    special_note: ''
  });

  useEffect(() => {
    fetchQuestions();
    fetchChapters();
  }, []);

  const fetchQuestions = async () => {
    try {
      const response = await axios.get(`${API}/questions`);
      setQuestions(response.data);
    } catch (error) {
      console.error('Error fetching questions:', error);
    }
  };

  const fetchChapters = async () => {
    try {
      const response = await axios.get(`${API}/chapters`);
      setChapters(response.data);
    } catch (error) {
      console.error('Error fetching chapters:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = { ...formData };
      // Clean options for non-MCQ questions
      if (formData.question_type !== 'MCQ' && formData.question_type !== 'Assertion-Reason') {
        payload.options = null;
      }
      
      if (editingQuestion) {
        await axios.put(`${API}/questions/${editingQuestion.question_id}`, payload);
        alert('Question updated successfully!');
      } else {
        await axios.post(`${API}/questions`, payload);
        alert('Question added successfully!');
      }
      
      resetForm();
      fetchQuestions();
    } catch (error) {
      alert('Error: ' + (error.response?.data?.detail || 'Failed to save question'));
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (question) => {
    setEditingQuestion(question);
    setFormData({
      chapter_id: question.chapter_id,
      question_type: question.question_type,
      question_text: question.question_text,
      options: question.options || ['', '', '', ''],
      correct_answer: question.correct_answer,
      marks: question.marks,
      youtube_solution_url: question.youtube_solution_url || '',
      explanation: question.explanation || '',
      special_note: question.special_note || ''
    });
    setShowAddForm(true);
  };

  const handleDelete = async (questionId) => {
    if (!window.confirm('Are you sure you want to delete this question?')) return;
    
    try {
      await axios.delete(`${API}/questions/${questionId}`);
      alert('Question deleted successfully!');
      fetchQuestions();
    } catch (error) {
      alert('Error deleting question: ' + error.response?.data?.detail);
    }
  };

  const resetForm = () => {
    setFormData({
      chapter_id: '',
      question_type: 'MCQ',
      question_text: '',
      options: ['', '', '', ''],
      correct_answer: '',
      marks: 1,
      youtube_solution_url: '',
      explanation: '',
      special_note: ''
    });
    setEditingQuestion(null);
    setShowAddForm(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 pt-28 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-4xl font-bold mb-8 text-primary">Admin Panel</h1>
        
        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-lg mb-6">
          <div className="flex border-b">
            <button
              onClick={() => setActiveTab('questions')}
              className={`px-6 py-4 font-semibold transition ${
                activeTab === 'questions'
                  ? 'border-b-2 border-primary text-primary'
                  : 'text-gray-600 hover:text-primary'
              }`}
            >
              📝 Questions ({questions.length})
            </button>
          </div>
        </div>

        {activeTab === 'questions' && (
          <>
            {/* Add Question Button */}
            {!showAddForm && (
              <div className="mb-6">
                <button
                  onClick={() => setShowAddForm(true)}
                  className="px-6 py-3 bg-gradient-to-r from-primary to-primary-dark text-white rounded-lg font-bold hover:shadow-lg transition"
                >
                  + Add New Question
                </button>
              </div>
            )}

            {/* Add/Edit Question Form */}
            {showAddForm && (
              <div className="bg-white p-6 rounded-xl shadow-lg mb-6">
                <h2 className="text-2xl font-bold mb-6 text-primary">
                  {editingQuestion ? 'Edit Question' : 'Add New Question'}
                </h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Chapter Selection */}
                  <div>
                    <label className="block text-gray-700 font-semibold mb-2">Chapter *</label>
                    <select
                      value={formData.chapter_id}
                      onChange={(e) => setFormData({ ...formData, chapter_id: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      required
                    >
                      <option value="">Select Chapter</option>
                      {chapters.map((chapter) => (
                        <option key={chapter.chapter_id} value={chapter.chapter_id}>
                          Class {chapter.class_level} - {chapter.chapter_name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    {/* Question Type */}
                    <div>
                      <label className="block text-gray-700 font-semibold mb-2">Question Type *</label>
                      <select
                        value={formData.question_type}
                        onChange={(e) => setFormData({ ...formData, question_type: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      >
                        <option value="MCQ">MCQ</option>
                        <option value="Assertion-Reason">Assertion-Reason</option>
                        <option value="2M">2 Marks (Subjective)</option>
                        <option value="3M">3 Marks (Subjective)</option>
                        <option value="5M">5 Marks (Subjective)</option>
                        <option value="CaseStudy">Case Study</option>
                      </select>
                    </div>

                    {/* Marks */}
                    <div>
                      <label className="block text-gray-700 font-semibold mb-2">Marks *</label>
                      <input
                        type="number"
                        value={formData.marks}
                        onChange={(e) => setFormData({ ...formData, marks: parseInt(e.target.value) })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                        min="1"
                        required
                      />
                    </div>
                  </div>

                  {/* Question Text */}
                  <div>
                    <label className="block text-gray-700 font-semibold mb-2">Question Text *</label>
                    <textarea
                      value={formData.question_text}
                      onChange={(e) => setFormData({ ...formData, question_text: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      rows="4"
                      required
                    />
                  </div>

                  {/* Options (for MCQ and Assertion-Reason) */}
                  {(formData.question_type === 'MCQ' || formData.question_type === 'Assertion-Reason') && (
                    <div>
                      <label className="block text-gray-700 font-semibold mb-2">Options *</label>
                      {formData.options.map((option, index) => (
                        <input
                          key={index}
                          type="text"
                          value={option}
                          onChange={(e) => {
                            const newOptions = [...formData.options];
                            newOptions[index] = e.target.value;
                            setFormData({ ...formData, options: newOptions });
                          }}
                          placeholder={`Option ${index + 1}`}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary mb-2"
                          required
                        />
                      ))}
                    </div>
                  )}

                  {/* Correct Answer */}
                  <div>
                    <label className="block text-gray-700 font-semibold mb-2">Correct Answer *</label>
                    <input
                      type="text"
                      value={formData.correct_answer}
                      onChange={(e) => setFormData({ ...formData, correct_answer: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      required
                    />
                  </div>

                  {/* YouTube Solution URL */}
                  <div>
                    <label className="block text-gray-700 font-semibold mb-2">YouTube Solution Link (Optional)</label>
                    <input
                      type="url"
                      value={formData.youtube_solution_url}
                      onChange={(e) => setFormData({ ...formData, youtube_solution_url: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="https://youtube.com/..."
                    />
                  </div>

                  {/* Explanation */}
                  <div>
                    <label className="block text-gray-700 font-semibold mb-2">Explanation</label>
                    <textarea
                      value={formData.explanation}
                      onChange={(e) => setFormData({ ...formData, explanation: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      rows="3"
                    />
                  </div>

                  {/* Special Note */}
                  <div>
                    <label className="block text-gray-700 font-semibold mb-2">Special Note (Optional)</label>
                    <textarea
                      value={formData.special_note}
                      onChange={(e) => setFormData({ ...formData, special_note: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      rows="2"
                      placeholder="Any special instructions or notes for this question"
                    />
                  </div>

                  {/* Form Actions */}
                  <div className="flex gap-4">
                    <button
                      type="submit"
                      disabled={loading}
                      className="px-6 py-3 bg-gradient-to-r from-primary to-primary-dark text-white rounded-lg font-bold hover:shadow-lg transition disabled:opacity-50"
                    >
                      {loading ? 'Saving...' : editingQuestion ? 'Update Question' : 'Add Question'}
                    </button>
                    <button
                      type="button"
                      onClick={resetForm}
                      className="px-6 py-3 bg-gray-300 text-gray-700 rounded-lg font-bold hover:bg-gray-400 transition"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Questions List */}
            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
              <div className="px-6 py-4 bg-primary text-white">
                <h2 className="text-xl font-bold">All Questions</h2>
              </div>
              <div className="divide-y divide-gray-200">
                {questions.length === 0 ? (
                  <p className="p-6 text-gray-600 text-center">No questions yet. Add your first question!</p>
                ) : (
                  questions.map((question, index) => {
                    const chapter = chapters.find(c => c.chapter_id === question.chapter_id);
                    return (
                      <div key={question.question_id} className="p-6 hover:bg-gray-50 transition">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <span className="px-3 py-1 bg-primary text-white rounded-full text-sm font-bold">
                                #{index + 1}
                              </span>
                              <span className="px-3 py-1 bg-accent text-white rounded-full text-sm font-bold">
                                {question.question_type}
                              </span>
                              <span className="px-3 py-1 bg-green-500 text-white rounded-full text-sm font-bold">
                                {question.marks} marks
                              </span>
                              {chapter && (
                                <span className="text-sm text-gray-600">
                                  Class {chapter.class_level} - {chapter.chapter_name}
                                </span>
                              )}
                            </div>
                            <p className="text-gray-800 font-medium mb-2">{question.question_text.substring(0, 150)}...</p>
                            {question.special_note && (
                              <p className="text-sm text-blue-600 mb-2">📌 {question.special_note}</p>
                            )}
                            <p className="text-sm text-gray-600">
                              <span className="font-semibold">Answer:</span> {question.correct_answer}
                            </p>
                            {question.youtube_solution_url && (
                              <a
                                href={question.youtube_solution_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm text-red-600 hover:underline mt-1 inline-block"
                              >
                                🎥 View Solution
                              </a>
                            )}
                          </div>
                          <div className="flex gap-2 ml-4">
                            <button
                              onClick={() => handleEdit(question)}
                              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition font-semibold"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDelete(question.question_id)}
                              className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition font-semibold"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
