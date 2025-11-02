import React, { useState, useEffect, useCallback, createContext, useContext } from 'react';
import './styles.css';
import myLogo from './assets/pq_logo.jpg';

// ==================== TYPES ====================
interface User {
  id: string;
  name: string;
  phone: string;
  employerId: string;
  email: string;
  hourlyRate: number;
  startDate: string;
  isFullTime: boolean;
  biometricEnabled: boolean;
  preferredPaymentMethod: 'instant' | 'eft' | 'ewallet';
  wellnessScore?: number;
}

interface Employer {
  id: string;
  code: string;
  name: string;
  payrollDay: number;
  advanceCap: number;
  feeStructure: {
    flat: number;
    percentage: number;
    max: number;
  };
  logo?: string;
}

interface Transaction {
  id: string;
  userId: string;
  amount: number;
  fee: number;
  type: 'advance' | 'repayment' | 'voucher';
  status: 'pending' | 'approved' | 'completed' | 'failed';
  date: string;
  paymentMethod: string;
  voucherDetails?: VoucherPurchase;
}

interface Voucher {
  id: string;
  category: 'mobile' | 'utility' | 'retail';
  provider: string;
  name: string;
  amount: number;
  price: number;
  discount: number;
  image?: string;
  stock: number;
}

interface VoucherPurchase {
  voucherId: string;
  code: string;
  expiryDate: string;
}

interface Notification {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
  timestamp: number;
  read: boolean;
}

// ==================== CONTEXTS ====================
interface ThemeContextType {
  isDark: boolean;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
  isDark: false,
  toggleTheme: () => {}
});

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  login: async () => false,
  logout: () => {},
  isAdmin: false
});

// ==================== TOAST NOTIFICATION SYSTEM ====================
const Toast: React.FC<{ notifications: Notification[], removeNotification: (id: string) => void }> = ({ 
  notifications, 
  removeNotification 
}) => {
  return (
    <div className="toast-container">
      {notifications.map((notif) => (
        <div
          key={notif.id}
          className={`toast toast-${notif.type} toast-enter`}
          onClick={() => removeNotification(notif.id)}
        >
          <div className="toast-icon">
            {notif.type === 'success' && '✅'}
            {notif.type === 'error' && '❌'}
            {notif.type === 'info' && 'ℹ️'}
            {notif.type === 'warning' && '⚠️'}
          </div>
          <div className="toast-message">{notif.message}</div>
        </div>
      ))}
    </div>
  );
};

// ==================== BIOMETRIC AUTH COMPONENT ====================
const BiometricAuth: React.FC<{ onSuccess: () => void, onCancel: () => void }> = ({ onSuccess, onCancel }) => {
  const [scanning, setScanning] = useState(false);

  const handleBiometric = () => {
    setScanning(true);
    // Simulate biometric scan
    setTimeout(() => {
      setScanning(false);
      onSuccess();
    }, 2000);
  };

  return (
    <div className="biometric-modal">
      <div className="biometric-content">
        <h3>Biometric Authentication</h3>
        <div className={`fingerprint-scanner ${scanning ? 'scanning' : ''}`}>
          <div className="fingerprint-icon">👆</div>
          {scanning && <div className="scan-line"></div>}
        </div>
        <p>{scanning ? 'Scanning...' : 'Place your finger on the sensor'}</p>
        <div className="biometric-actions">
          <button onClick={handleBiometric} disabled={scanning} className="btn btn-primary">
            {scanning ? 'Authenticating...' : 'Scan Fingerprint'}
          </button>
          <button onClick={onCancel} className="btn btn-secondary">Cancel</button>
        </div>
      </div>
    </div>
  );
};

// ==================== API SERVICE ====================
class ApiService {
  private baseUrl = '/api';
  private token: string | null = null;

  setToken(token: string | null) {
    this.token = token;
  }

  private async request(endpoint: string, options: RequestInit = {}) {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...(this.token && { Authorization: `Bearer ${this.token}` })
    };

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        ...options,
        headers: { ...headers, ...options.headers }
      });

      if (!response.ok) throw new Error(`API Error: ${response.statusText}`);
      return await response.json();
    } catch (error) {
      console.error('API Request failed:', error);
      // Mock response for demo
      return this.getMockResponse(endpoint, options);
    }
  }

  private getMockResponse(endpoint: string, _options: RequestInit) {
    // Mock responses for demo purposes
    if (endpoint.includes('/auth/login')) {
      return { 
        token: 'mock-jwt-token', 
        user: mockUsers[0],
        success: true 
      };
    }
    if (endpoint.includes('/vouchers')) {
      return mockVouchers;
    }
    if (endpoint.includes('/transactions')) {
      return mockTransactions;
    }
    if (endpoint.includes('/wellness-score')) {
      return { score: 750, maxScore: 850 };
    }
    return { success: true };
  }

  // Auth endpoints
  login(email: string, password: string) {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
  }

  // Transaction endpoints
  getTransactions(userId: string) {
    return this.request(`/transactions/${userId}`);
  }

  requestAdvance(data: any) {
    return this.request('/transactions/advance', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  // Voucher endpoints
  getVouchers(category?: string) {
    const query = category ? `?category=${category}` : '';
    return this.request(`/vouchers${query}`);
  }

  purchaseVoucher(voucherId: string, userId: string) {
    return this.request('/vouchers/purchase', {
      method: 'POST',
      body: JSON.stringify({ voucherId, userId })
    });
  }

  // Wellness endpoints
  getWellnessScore(userId: string) {
    return this.request(`/wellness/${userId}`);
  }
}

const apiService = new ApiService();

// ==================== MOCK DATA ====================
const mockEmployers: Employer[] = [
  {
    id: '1',
    code: 'TECH001',
    name: 'TechCorp SA',
    payrollDay: 25,
    advanceCap: 0.25,
    feeStructure: { flat: 25, percentage: 0.01, max: 60 },
    logo: '🏢'
  },
  {
    id: '2',
    code: 'RETAIL99',
    name: 'RetailHub',
    payrollDay: 30,
    advanceCap: 0.30,
    feeStructure: { flat: 20, percentage: 0.015, max: 50 },
    logo: '🛍️'
  },
  {
    id: '3',
    code: 'HEALTH01',
    name: 'HealthCare Plus',
    payrollDay: 15,
    advanceCap: 0.20,
    feeStructure: { flat: 30, percentage: 0.005, max: 70 },
    logo: '🏥'
  }
];

const mockUsers: User[] = [
  {
    id: '1',
    name: 'Thabo Mbeki',
    phone: '0821234567',
    email: 'thabo@example.com',
    employerId: '1',
    hourlyRate: 150,
    startDate: '2023-01-15',
    isFullTime: true,
    biometricEnabled: true,
    preferredPaymentMethod: 'instant',
    wellnessScore: 750
  },
  {
    id: '2',
    name: 'Sarah van der Merwe',
    phone: '0827654321',
    email: 'sarah@example.com',
    employerId: '2',
    hourlyRate: 120,
    startDate: '2023-03-01',
    isFullTime: true,
    biometricEnabled: false,
    preferredPaymentMethod: 'eft',
    wellnessScore: 680
  }
];

const mockTransactions: Transaction[] = [
  {
    id: '1',
    userId: '1',
    amount: 500,
    fee: 30,
    type: 'advance',
    status: 'completed',
    date: '2024-01-15',
    paymentMethod: 'instant'
  },
  {
    id: '2',
    userId: '1',
    amount: 50,
    fee: 0,
    type: 'voucher',
    status: 'completed',
    date: '2024-01-20',
    paymentMethod: 'instant',
    voucherDetails: {
      voucherId: '1',
      code: 'VOD-123-456',
      expiryDate: '2024-12-31'
    }
  }
];

const mockVouchers: Voucher[] = [
  // Mobile Vouchers
  {
    id: '1',
    category: 'mobile',
    provider: 'Vodacom',
    name: 'R50 Airtime',
    amount: 50,
    price: 48,
    discount: 4,
    image: '📱',
    stock: 100
  },
  {
    id: '2',
    category: 'mobile',
    provider: 'MTN',
    name: '1GB Data Bundle',
    amount: 100,
    price: 95,
    discount: 5,
    image: '📶',
    stock: 50
  },
  {
    id: '3',
    category: 'mobile',
    provider: 'Telkom',
    name: 'R100 Airtime',
    amount: 100,
    price: 96,
    discount: 4,
    image: '📞',
    stock: 75
  },
  // Utility Vouchers
  {
    id: '4',
    category: 'utility',
    provider: 'Eskom',
    name: 'R250 Electricity',
    amount: 250,
    price: 250,
    discount: 0,
    image: '⚡',
    stock: 200
  },
  {
    id: '5',
    category: 'utility',
    provider: 'City Power',
    name: 'R500 Prepaid',
    amount: 500,
    price: 500,
    discount: 0,
    image: '💡',
    stock: 150
  },
  // Retail Vouchers
  {
    id: '6',
    category: 'retail',
    provider: 'Checkers',
    name: 'R200 Grocery Voucher',
    amount: 200,
    price: 190,
    discount: 5,
    image: '🛒',
    stock: 80
  },
  {
    id: '7',
    category: 'retail',
    provider: 'Pick n Pay',
    name: 'R300 Shopping Voucher',
    amount: 300,
    price: 285,
    discount: 5,
    image: '🛍️',
    stock: 60
  },
  {
    id: '8',
    category: 'retail',
    provider: 'Woolworths',
    name: 'R500 Gift Card',
    amount: 500,
    price: 475,
    discount: 5,
    image: '🎁',
    stock: 40
  }
];

// ==================== MAIN APP COMPONENT ====================
const App: React.FC = () => {
  const [isDark, setIsDark] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showBiometric, setShowBiometric] = useState(false);
  const [, setLoading] = useState(false);

  // Theme toggle
  const toggleTheme = useCallback(() => {
    setIsDark(prev => !prev);
  }, []);

  useEffect(() => {
    document.body.className = isDark ? 'dark-theme' : 'light-theme';
  }, [isDark]);

  // Toast notifications
  const addNotification = useCallback((type: Notification['type'], message: string) => {
    const notif: Notification = {
      id: Date.now().toString(),
      type,
      message,
      timestamp: Date.now(),
      read: false
    };
    setNotifications(prev => [...prev, notif]);
    setTimeout(() => {
      removeNotification(notif.id);
    }, 5000);
  }, []);

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  // Auth functions
  const login = useCallback(async (email: string, password: string) => {
    setLoading(true);
    try {
      const response = await apiService.login(email, password);
      if (response.success) {
        setUser(response.user);
        setToken(response.token);
        apiService.setToken(response.token);
        setIsAdmin(email.includes('admin'));
        addNotification('success', 'Login successful!');
        return true;
      }
    } catch (error) {
      addNotification('error', 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
    return false;
  }, [addNotification]);

  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
    setIsAdmin(false);
    apiService.setToken(null);
    setActiveTab('dashboard');
    addNotification('info', 'Logged out successfully');
  }, [addNotification]);

  // Render login screen
  if (!user) {
    return (
      <ThemeContext.Provider value={{ isDark, toggleTheme }}>
        <AuthContext.Provider value={{ user, token, login, logout, isAdmin }}>
          <div className="app-container">
            <LoginScreen />
            <Toast notifications={notifications} removeNotification={removeNotification} />
          </div>
        </AuthContext.Provider>
      </ThemeContext.Provider>
    );
  }

  // Render admin dashboard
  if (isAdmin) {
    return (
      <ThemeContext.Provider value={{ isDark, toggleTheme }}>
        <AuthContext.Provider value={{ user, token, login, logout, isAdmin }}>
          <div className="app-container">
            <AdminDashboard />
            <Toast notifications={notifications} removeNotification={removeNotification} />
          </div>
        </AuthContext.Provider>
      </ThemeContext.Provider>
    );
  }

  // Render user dashboard
  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme }}>
      <AuthContext.Provider value={{ user, token, login, logout, isAdmin }}>
        <div className="app-container">
          <Header />
          <Navigation activeTab={activeTab} setActiveTab={setActiveTab} />
          <main className="main-content">
            {activeTab === 'dashboard' && <Dashboard />}
            {activeTab === 'advance' && <AdvanceRequest addNotification={addNotification} />}
            {activeTab === 'vouchers' && <VoucherMarketplace addNotification={addNotification} />}
            {activeTab === 'history' && <TransactionHistory />}
            {activeTab === 'wellness' && <WellnessHub />}
            {activeTab === 'settings' && <Settings />}
          </main>
          {showBiometric && (
            <BiometricAuth
              onSuccess={() => {
                setShowBiometric(false);
                addNotification('success', 'Biometric authentication successful!');
              }}
              onCancel={() => setShowBiometric(false)}
            />
          )}
          <Toast notifications={notifications} removeNotification={removeNotification} />
        </div>
      </AuthContext.Provider>
    </ThemeContext.Provider>
  );
};

// ==================== LOGIN SCREEN ====================
const LoginScreen: React.FC = () => {
  const { login } = useContext(AuthContext);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await login(email, password);
    setLoading(false);
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="logo-section">
          <img src={myLogo} alt="PayQuick Logo" className="logo-image" />
          <h1>PayQuick</h1>
          <p>Your Earned Wages, Instantly</p>
        </div>
        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              required
            />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
            />
          </div>
          <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>
        <div className="demo-accounts">
          <h4>Demo Accounts:</h4>
          <div className="demo-account" onClick={() => {
            setEmail('thabo@example.com');
            setPassword('password');
          }}>
            <strong>User:</strong> thabo@example.com / password
          </div>
          <div className="demo-account" onClick={() => {
            setEmail('admin@payquick.com');
            setPassword('admin');
          }}>
            <strong>Admin:</strong> admin@payquick.com / admin
          </div>
        </div>
      </div>
    </div>
  );
};

// ==================== HEADER COMPONENT ====================
const Header: React.FC = () => {
  const { user, logout } = useContext(AuthContext);
  const { isDark, toggleTheme } = useContext(ThemeContext);

  return (
    <header className="app-header">
      <div className="header-content">
        <div className="brand">
          <img src={myLogo} alt="PayQuick Logo" className="logo-image" />
          <span className="brand-name">PayQuick</span>
        </div>
        <div className="header-actions">
          <button className="theme-toggle" onClick={toggleTheme}>
            {isDark ? '☀️' : '🌙'}
          </button>
          <div className="user-info">
            <span className="user-name">{user?.name}</span>
            <button className="btn-logout" onClick={logout}>Logout</button>
          </div>
        </div>
      </div>
    </header>
  );
};

// ==================== NAVIGATION COMPONENT ====================
const Navigation: React.FC<{ activeTab: string, setActiveTab: (tab: string) => void }> = ({ 
  activeTab, 
  setActiveTab 
}) => {
  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: '🏠' },
    { id: 'advance', label: 'Get Advance', icon: '💵' },
    { id: 'vouchers', label: 'Vouchers', icon: '🎫' },
    { id: 'history', label: 'History', icon: '📜' },
    { id: 'wellness', label: 'Wellness', icon: '❤️' },
    { id: 'settings', label: 'Settings', icon: '⚙️' }
  ];

  return (
    <nav className="main-nav">
      {tabs.map(tab => (
        <button
          key={tab.id}
          className={`nav-item ${activeTab === tab.id ? 'active' : ''}`}
          onClick={() => setActiveTab(tab.id)}
        >
          <span className="nav-icon">{tab.icon}</span>
          <span className="nav-label">{tab.label}</span>
        </button>
      ))}
    </nav>
  );
};

// ==================== DASHBOARD COMPONENT ====================
const Dashboard: React.FC = () => {
  const { user } = useContext(AuthContext);
  const employer = mockEmployers.find(e => e.id === user?.employerId);
  
  const calculateEarnedToDate = () => {
    if (!user) return 0;
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const workingDays = Math.floor((today.getTime() - startOfMonth.getTime()) / (1000 * 60 * 60 * 24));
    return workingDays * 8 * user.hourlyRate;
  };

  const earned = calculateEarnedToDate();
  const available = earned * (employer?.advanceCap || 0.25);

  return (
    <div className="dashboard">
      <div className="welcome-section">
        <h2>Welcome back, {user?.name}!</h2>
        <p>Your financial wellness score: {user?.wellnessScore || 0} / 850</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">💼</div>
          <div className="stat-content">
            <h3>Employer</h3>
            <p className="stat-value">{employer?.name}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">💰</div>
          <div className="stat-content">
            <h3>Earned to Date</h3>
            <p className="stat-value">R{earned.toFixed(2)}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">✅</div>
          <div className="stat-content">
            <h3>Available</h3>
            <p className="stat-value">R{available.toFixed(2)}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">📅</div>
          <div className="stat-content">
            <h3>Next Payday</h3>
            <p className="stat-value">Day {employer?.payrollDay}</p>
          </div>
        </div>
      </div>

      <div className="quick-actions">
        <h3>Quick Actions</h3>
        <div className="action-buttons">
          <button className="action-btn">
            <span className="action-icon">💵</span>
            <span>Get Advance</span>
          </button>
          <button className="action-btn">
            <span className="action-icon">📱</span>
            <span>Buy Airtime</span>
          </button>
          <button className="action-btn">
            <span className="action-icon">⚡</span>
            <span>Buy Electricity</span>
          </button>
          <button className="action-btn">
            <span className="action-icon">🛒</span>
            <span>Shop Vouchers</span>
          </button>
        </div>
      </div>

      <div className="recent-activity">
        <h3>Recent Activity</h3>
        {mockTransactions.slice(0, 3).map(tx => (
          <div key={tx.id} className="activity-item">
            <div className="activity-icon">
              {tx.type === 'advance' ? '💵' : '🎫'}
            </div>
            <div className="activity-details">
              <span className="activity-type">{tx.type}</span>
              <span className="activity-date">{tx.date}</span>
            </div>
            <div className="activity-amount">
              -R{tx.amount.toFixed(2)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ==================== ADVANCE REQUEST COMPONENT ====================
const AdvanceRequest: React.FC<{ addNotification: (type: Notification['type'], message: string) => void }> = ({ 
  addNotification 
}) => {
  const { user } = useContext(AuthContext);
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'instant' | 'eft' | 'ewallet'>('instant');
  const [showBiometric, setShowBiometric] = useState(false);
  const employer = mockEmployers.find(e => e.id === user?.employerId);

  const calculateFee = (amt: number) => {
    if (!employer) return 0;
    const { flat, percentage, max } = employer.feeStructure;
    const calculated = flat + (amt * percentage);
    return Math.min(calculated, max);
  };

  const handlePresetAmount = (preset: number) => {
    setAmount(preset.toString());
  };

  const handleSubmit = () => {
    if (user?.biometricEnabled) {
      setShowBiometric(true);
    } else {
      processAdvance();
    }
  };

  const processAdvance = () => {
    const amt = parseFloat(amount);
    const fee = calculateFee(amt);
    addNotification('success', `Advance of R${amt} approved! Fee: R${fee.toFixed(2)}`);
    setAmount('');
  };

  return (
    <div className="advance-request">
      <h2>Request an Advance</h2>
      
      <div className="advance-form">
        <div className="preset-amounts">
          <h3>Quick Select</h3>
          <div className="preset-buttons">
            <button 
              className="preset-btn" 
              onClick={() => handlePresetAmount(100)}
            >
              R100
            </button>
            <button 
              className="preset-btn" 
              onClick={() => handlePresetAmount(250)}
            >
              R250
            </button>
            <button 
              className="preset-btn" 
              onClick={() => handlePresetAmount(500)}
            >
              R500
            </button>
            <button 
              className="preset-btn" 
              onClick={() => handlePresetAmount(1000)}
            >
              R1000
            </button>
          </div>
        </div>

        <div className="form-group">
          <label>Custom Amount</label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Enter amount"
            className="amount-input"
          />
        </div>

        <div className="form-group">
          <label>Payment Method</label>
          <div className="payment-methods">
            <label className="payment-option">
              <input
                type="radio"
                value="instant"
                checked={paymentMethod === 'instant'}
                onChange={(e) => setPaymentMethod(e.target.value as any)}
              />
              <span>Instant Transfer</span>
            </label>
            <label className="payment-option">
              <input
                type="radio"
                value="eft"
                checked={paymentMethod === 'eft'}
                onChange={(e) => setPaymentMethod(e.target.value as any)}
              />
              <span>EFT (1-2 days)</span>
            </label>
            <label className="payment-option">
              <input
                type="radio"
                value="ewallet"
                checked={paymentMethod === 'ewallet'}
                onChange={(e) => setPaymentMethod(e.target.value as any)}
              />
              <span>E-Wallet</span>
            </label>
          </div>
        </div>

        {amount && (
          <div className="fee-preview">
            <h4>Fee Breakdown</h4>
            <div className="fee-details">
              <span>Amount: R{amount}</span>
              <span>Fee: R{calculateFee(parseFloat(amount)).toFixed(2)}</span>
              <span className="total">Total to Repay: R{(parseFloat(amount) + calculateFee(parseFloat(amount))).toFixed(2)}</span>
            </div>
          </div>
        )}

        <button 
          className="btn btn-primary btn-block"
          onClick={handleSubmit}
          disabled={!amount || parseFloat(amount) <= 0}
        >
          Request Advance
        </button>
      </div>

      {showBiometric && (
        <BiometricAuth
          onSuccess={() => {
            setShowBiometric(false);
            processAdvance();
          }}
          onCancel={() => setShowBiometric(false)}
        />
      )}
    </div>
  );
};

// ==================== VOUCHER MARKETPLACE ====================
const VoucherMarketplace: React.FC<{ addNotification: (type: Notification['type'], message: string) => void }> = ({ 
  addNotification 
}) => {
  const [category, setCategory] = useState<'all' | 'mobile' | 'utility' | 'retail'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredVouchers = mockVouchers.filter(v => {
    const matchesCategory = category === 'all' || v.category === category;
    const matchesSearch = v.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          v.provider.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handlePurchase = (voucher: Voucher) => {
    addNotification('success', `${voucher.name} purchased successfully! Check your email for the voucher code.`);
  };

  return (
    <div className="voucher-marketplace">
      <h2>Voucher Marketplace</h2>

      <div className="marketplace-controls">
        <input
          type="text"
          placeholder="Search vouchers..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />

        <div className="category-tabs">
          <button 
            className={`tab ${category === 'all' ? 'active' : ''}`}
            onClick={() => setCategory('all')}
          >
            All
          </button>
          <button 
            className={`tab ${category === 'mobile' ? 'active' : ''}`}
            onClick={() => setCategory('mobile')}
          >
            Mobile
          </button>
          <button 
            className={`tab ${category === 'utility' ? 'active' : ''}`}
            onClick={() => setCategory('utility')}
          >
            Utilities
          </button>
          <button 
            className={`tab ${category === 'retail' ? 'active' : ''}`}
            onClick={() => setCategory('retail')}
          >
            Retail
          </button>
        </div>
      </div>

      <div className="voucher-grid">
        {filteredVouchers.map(voucher => (
          <div key={voucher.id} className="voucher-card">
            <div className="voucher-image">{voucher.image}</div>
            <div className="voucher-details">
              <h4>{voucher.name}</h4>
              <p className="voucher-provider">{voucher.provider}</p>
              <div className="voucher-pricing">
                <span className="voucher-price">R{voucher.price}</span>
                {voucher.discount > 0 && (
                  <span className="voucher-discount">Save {voucher.discount}%</span>
                )}
              </div>
              <p className="voucher-stock">Stock: {voucher.stock}</p>
              <button 
                className="btn btn-primary btn-sm"
                onClick={() => handlePurchase(voucher)}
              >
                Buy Now
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ==================== TRANSACTION HISTORY ====================
const TransactionHistory: React.FC = () => {
  const { user } = useContext(AuthContext);
  const userTransactions = mockTransactions.filter(t => t.userId === user?.id);

  return (
    <div className="transaction-history">
      <h2>Transaction History</h2>
      
      <div className="transactions-list">
        {userTransactions.map(transaction => (
          <div key={transaction.id} className="transaction-item">
            <div className="transaction-icon">
              {transaction.type === 'advance' ? '💵' : 
               transaction.type === 'repayment' ? '💳' : '🎫'}
            </div>
            <div className="transaction-details">
              <h4>{transaction.type.charAt(0).toUpperCase() + transaction.type.slice(1)}</h4>
              <p>{transaction.date}</p>
              <span className={`status status-${transaction.status}`}>
                {transaction.status}
              </span>
            </div>
            <div className="transaction-amount">
              <p className="amount">R{transaction.amount.toFixed(2)}</p>
              {transaction.fee > 0 && (
                <p className="fee">Fee: R{transaction.fee.toFixed(2)}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ==================== WELLNESS HUB ====================
const WellnessHub: React.FC = () => {
  const { user } = useContext(AuthContext);
  const score = user?.wellnessScore || 0;
  const maxScore = 850;
  const percentage = (score / maxScore) * 100;

  return (
    <div className="wellness-hub">
      <h2>Financial Wellness Hub</h2>

      <div className="wellness-score-card">
        <h3>Your Wellness Score</h3>
        <div className="score-display">
          <div className="score-circle">
            <svg className="progress-ring" width="200" height="200">
              <circle
                className="progress-ring-circle"
                stroke="url(#gradient)"
                strokeWidth="20"
                fill="transparent"
                r="80"
                cx="100"
                cy="100"
                style={{
                  strokeDasharray: `${2 * Math.PI * 80}`,
                  strokeDashoffset: `${2 * Math.PI * 80 * (1 - percentage / 100)}`
                }}
              />
              <defs>
                <linearGradient id="gradient">
                  <stop offset="0%" stopColor="#4CAF50" />
                  <stop offset="100%" stopColor="#2196F3" />
                </linearGradient>
              </defs>
            </svg>
            <div className="score-text">
              <span className="score-number">{score}</span>
              <span className="score-label">of {maxScore}</span>
            </div>
          </div>
        </div>
        <div className="score-insights">
          <h4>Score Breakdown</h4>
          <div className="insight-item">
            <span>Payment History</span>
            <div className="progress-bar">
              <div className="progress" style={{ width: '85%' }}></div>
            </div>
          </div>
          <div className="insight-item">
            <span>Advance Usage</span>
            <div className="progress-bar">
              <div className="progress" style={{ width: '70%' }}></div>
            </div>
          </div>
          <div className="insight-item">
            <span>Financial Education</span>
            <div className="progress-bar">
              <div className="progress" style={{ width: '60%' }}></div>
            </div>
          </div>
        </div>
      </div>

      <div className="education-section">
        <h3>Financial Education</h3>
        <div className="education-cards">
          <div className="education-card">
            <h4>💡 Budgeting Basics</h4>
            <p>Learn how to create and stick to a monthly budget</p>
            <button className="btn btn-secondary">Start Course</button>
          </div>
          <div className="education-card">
            <h4>📈 Building Credit</h4>
            <p>Understanding credit scores and how to improve yours</p>
            <button className="btn btn-secondary">Start Course</button>
          </div>
          <div className="education-card">
            <h4>🎯 Saving Strategies</h4>
            <p>Tips and tricks for saving money effectively</p>
            <button className="btn btn-secondary">Start Course</button>
          </div>
        </div>
      </div>

      <div className="tips-section">
        <h3>Quick Tips</h3>
        <ul className="tips-list">
          <li>💰 Try to limit advances to 20% of your earnings</li>
          <li>📊 Review your spending weekly to stay on track</li>
          <li>🎯 Set aside 10% of each paycheck for emergencies</li>
          <li>📱 Use vouchers for discounts on regular purchases</li>
        </ul>
      </div>
    </div>
  );
};

// ==================== SETTINGS ====================
const Settings: React.FC = () => {
  const { user } = useContext(AuthContext);
  const { isDark, toggleTheme } = useContext(ThemeContext);
  const [biometricEnabled, setBiometricEnabled] = useState(user?.biometricEnabled || false);
  const [paymentMethod, setPaymentMethod] = useState(user?.preferredPaymentMethod || 'instant');

  return (
    <div className="settings">
      <h2>Settings</h2>

      <div className="settings-section">
        <h3>Appearance</h3>
        <div className="setting-item">
          <span>Dark Mode</span>
          <label className="switch">
            <input type="checkbox" checked={isDark} onChange={toggleTheme} />
            <span className="slider"></span>
          </label>
        </div>
      </div>

      <div className="settings-section">
        <h3>Security</h3>
        <div className="setting-item">
          <span>Biometric Authentication</span>
          <label className="switch">
            <input 
              type="checkbox" 
              checked={biometricEnabled} 
              onChange={(e) => setBiometricEnabled(e.target.checked)} 
            />
            <span className="slider"></span>
          </label>
        </div>
        <div className="setting-item">
          <span>Change Password</span>
          <button className="btn btn-secondary">Update</button>
        </div>
      </div>

      <div className="settings-section">
        <h3>Payment Preferences</h3>
        <div className="setting-item">
          <label>Default Payment Method</label>
          <select 
            value={paymentMethod} 
            onChange={(e) => setPaymentMethod(e.target.value as any)}
            className="select-input"
          >
            <option value="instant">Instant Transfer</option>
            <option value="eft">EFT</option>
            <option value="ewallet">E-Wallet</option>
          </select>
        </div>
      </div>

      <div className="settings-section">
        <h3>Notifications</h3>
        <div className="setting-item">
          <span>Push Notifications</span>
          <label className="switch">
            <input type="checkbox" defaultChecked />
            <span className="slider"></span>
          </label>
        </div>
        <div className="setting-item">
          <span>Email Notifications</span>
          <label className="switch">
            <input type="checkbox" defaultChecked />
            <span className="slider"></span>
          </label>
        </div>
        <div className="setting-item">
          <span>SMS Notifications</span>
          <label className="switch">
            <input type="checkbox" />
            <span className="slider"></span>
          </label>
        </div>
      </div>

      <div className="settings-section">
        <h3>Account Information</h3>
        <div className="info-item">
          <span>Name:</span> {user?.name}
        </div>
        <div className="info-item">
          <span>Email:</span> {user?.email}
        </div>
        <div className="info-item">
          <span>Phone:</span> {user?.phone}
        </div>
        <div className="info-item">
          <span>Employee ID:</span> {user?.id}
        </div>
      </div>

      <div className="settings-actions">
        <button className="btn btn-danger">Delete Account</button>
      </div>
    </div>
  );
};

// ==================== ADMIN DASHBOARD ====================
const AdminDashboard: React.FC = () => {
  const { logout } = useContext(AuthContext);
  const { isDark, toggleTheme } = useContext(ThemeContext);
  const [activeSection, setActiveSection] = useState('overview');

  return (
    <div className="admin-dashboard">
      <header className="admin-header">
        <div className="admin-brand">
          <img src={myLogo} alt="PayQuick Admin Logo" className="logo-image" />
          <span>PayQuick Admin</span>
        </div>
        <div className="admin-actions">
          <button onClick={toggleTheme}>{isDark ? '☀️' : '🌙'}</button>
          <button className="btn-logout" onClick={logout}>Logout</button>
        </div>
      </header>

      <div className="admin-container">
        <aside className="admin-sidebar">
          <nav className="admin-nav">
            <button 
              className={`admin-nav-item ${activeSection === 'overview' ? 'active' : ''}`}
              onClick={() => setActiveSection('overview')}
            >
              📊 Overview
            </button>
            <button 
              className={`admin-nav-item ${activeSection === 'employers' ? 'active' : ''}`}
              onClick={() => setActiveSection('employers')}
            >
              🏢 Employers
            </button>
            <button 
              className={`admin-nav-item ${activeSection === 'users' ? 'active' : ''}`}
              onClick={() => setActiveSection('users')}
            >
              👥 Users
            </button>
            <button 
              className={`admin-nav-item ${activeSection === 'transactions' ? 'active' : ''}`}
              onClick={() => setActiveSection('transactions')}
            >
              💳 Transactions
            </button>
            <button 
              className={`admin-nav-item ${activeSection === 'vouchers' ? 'active' : ''}`}
              onClick={() => setActiveSection('vouchers')}
            >
              🎫 Vouchers
            </button>
            <button 
              className={`admin-nav-item ${activeSection === 'reports' ? 'active' : ''}`}
              onClick={() => setActiveSection('reports')}
            >
              📈 Reports
            </button>
          </nav>
        </aside>

        <main className="admin-main">
          {activeSection === 'overview' && <AdminOverview />}
          {activeSection === 'employers' && <AdminEmployers />}
          {activeSection === 'users' && <AdminUsers />}
          {activeSection === 'transactions' && <AdminTransactions />}
          {activeSection === 'vouchers' && <AdminVouchers />}
          {activeSection === 'reports' && <AdminReports />}
        </main>
      </div>
    </div>
  );
};

// Admin Overview Component
const AdminOverview: React.FC = () => {
  return (
    <div className="admin-overview">
      <h2>Dashboard Overview</h2>
      
      <div className="admin-stats-grid">
        <div className="admin-stat-card">
          <h3>Total Users</h3>
          <p className="stat-number">1,234</p>
          <span className="stat-change positive">+12.5%</span>
        </div>
        <div className="admin-stat-card">
          <h3>Active Employers</h3>
          <p className="stat-number">45</p>
          <span className="stat-change positive">+3</span>
        </div>
        <div className="admin-stat-card">
          <h3>Total Advances</h3>
          <p className="stat-number">R2.5M</p>
          <span className="stat-change positive">+18.2%</span>
        </div>
        <div className="admin-stat-card">
          <h3>Vouchers Sold</h3>
          <p className="stat-number">892</p>
          <span className="stat-change negative">-5.3%</span>
        </div>
      </div>

      <div className="admin-charts">
        <div className="chart-card">
          <h3>Transaction Volume</h3>
          <div className="chart-placeholder">📈 Chart would go here</div>
        </div>
        <div className="chart-card">
          <h3>User Growth</h3>
          <div className="chart-placeholder">📊 Chart would go here</div>
        </div>
      </div>
    </div>
  );
};

// Admin Employers Component
const AdminEmployers: React.FC = () => {
  const [showAddModal, setShowAddModal] = useState(false);

  return (
    <div className="admin-employers">
      <div className="section-header">
        <h2>Manage Employers</h2>
        <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
          + Add Employer
        </button>
      </div>

      <div className="employers-table">
        <table>
          <thead>
            <tr>
              <th>Company</th>
              <th>Code</th>
              <th>Employees</th>
              <th>Advance Cap</th>
              <th>Fee Structure</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {mockEmployers.map(employer => (
              <tr key={employer.id}>
                <td>
                  <div className="company-info">
                    <span className="company-logo">{employer.logo}</span>
                    {employer.name}
                  </div>
                </td>
                <td>{employer.code}</td>
                <td>125</td>
                <td>{(employer.advanceCap * 100).toFixed(0)}%</td>
                <td>R{employer.feeStructure.flat} + {employer.feeStructure.percentage * 100}%</td>
                <td>
                  <button className="btn btn-sm">Edit</button>
                  <button className="btn btn-sm btn-danger">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3>Add New Employer</h3>
            <form className="employer-form">
              <input type="text" placeholder="Company Name" />
              <input type="text" placeholder="Company Code" />
              <input type="number" placeholder="Payroll Day (1-31)" />
              <input type="number" placeholder="Advance Cap (%)" />
              <h4>Fee Structure</h4>
              <input type="number" placeholder="Flat Fee (R)" />
              <input type="number" placeholder="Percentage (%)" />
              <input type="number" placeholder="Max Fee (R)" />
              <div className="modal-actions">
                <button className="btn btn-primary">Add Employer</button>
                <button className="btn btn-secondary" onClick={() => setShowAddModal(false)}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// Admin Users Component
const AdminUsers: React.FC = () => {
  return (
    <div className="admin-users">
      <h2>User Management</h2>
      
      <div className="users-filters">
        <input type="text" placeholder="Search users..." className="search-input" />
        <select className="filter-select">
          <option>All Employers</option>
          {mockEmployers.map(e => (
            <option key={e.id} value={e.id}>{e.name}</option>
          ))}
        </select>
      </div>

      <div className="users-table">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Employer</th>
              <th>Wellness Score</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {mockUsers.map(user => (
              <tr key={user.id}>
                <td>{user.name}</td>
                <td>{user.email}</td>
                <td>{mockEmployers.find(e => e.id === user.employerId)?.name}</td>
                <td>{user.wellnessScore}/850</td>
                <td><span className="badge badge-active">Active</span></td>
                <td>
                  <button className="btn btn-sm">View</button>
                  <button className="btn btn-sm">Edit</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// Admin Transactions Component
const AdminTransactions: React.FC = () => {
  return (
    <div className="admin-transactions">
      <h2>Transaction Management</h2>
      
      <div className="transactions-stats">
        <div className="mini-stat">
          <span>Today's Volume</span>
          <strong>R125,000</strong>
        </div>
        <div className="mini-stat">
          <span>Pending Approval</span>
          <strong>12</strong>
        </div>
        <div className="mini-stat">
          <span>Failed</span>
          <strong>3</strong>
        </div>
      </div>

      <div className="transactions-table">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>User</th>
              <th>Type</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {mockTransactions.map(tx => (
              <tr key={tx.id}>
                <td>#{tx.id}</td>
                <td>{mockUsers.find(u => u.id === tx.userId)?.name}</td>
                <td>{tx.type}</td>
                <td>R{tx.amount.toFixed(2)}</td>
                <td>
                  <span className={`badge badge-${tx.status}`}>{tx.status}</span>
                </td>
                <td>{tx.date}</td>
                <td>
                  <button className="btn btn-sm">Details</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// Admin Vouchers Component
const AdminVouchers: React.FC = () => {
  const [showAddVoucherModal, setShowAddVoucherModal] = useState(false);

  return (
    <div className="admin-vouchers">
      <div className="section-header">
        <h2>Voucher Management</h2>
        <button className="btn btn-primary" onClick={() => setShowAddVoucherModal(true)}>
          + Add Voucher
        </button>
      </div>

      <div className="vouchers-grid">
        {mockVouchers.map(voucher => (
          <div key={voucher.id} className="admin-voucher-card">
            <div className="voucher-header">
              <span className="voucher-icon">{voucher.image}</span>
              <span className={`badge badge-${voucher.category}`}>{voucher.category}</span>
            </div>
            <h4>{voucher.name}</h4>
            <p>{voucher.provider}</p>
            <div className="voucher-stats">
              <span>Price: R{voucher.price}</span>
              <span>Stock: {voucher.stock}</span>
            </div>
            <div className="voucher-actions">
              <button className="btn btn-sm">Edit</button>
              <button className="btn btn-sm">Restock</button>
              <button className="btn btn-sm btn-danger">Remove</button>
            </div>
          </div>
        ))}
      </div>

      {showAddVoucherModal && (
        <div className="modal-overlay" onClick={() => setShowAddVoucherModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3>Add New Voucher</h3>
            <form className="voucher-form">
              <select>
                <option>Select Category</option>
                <option value="mobile">Mobile</option>
                <option value="utility">Utility</option>
                <option value="retail">Retail</option>
              </select>
              <input type="text" placeholder="Provider Name" />
              <input type="text" placeholder="Voucher Name" />
              <input type="number" placeholder="Face Value (R)" />
              <input type="number" placeholder="Selling Price (R)" />
              <input type="number" placeholder="Initial Stock" />
              <div className="modal-actions">
                <button className="btn btn-primary">Add Voucher</button>
                <button className="btn btn-secondary" onClick={() => setShowAddVoucherModal(false)}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// Admin Reports Component
const AdminReports: React.FC = () => {
  return (
    <div className="admin-reports">
      <h2>Reports & Analytics</h2>
      
      <div className="report-cards">
        <div className="report-card">
          <h3>Financial Report</h3>
          <p>Monthly financial summary and projections</p>
          <button className="btn btn-primary">Generate Report</button>
        </div>
        <div className="report-card">
          <h3>User Analytics</h3>
          <p>User behavior and engagement metrics</p>
          <button className="btn btn-primary">View Analytics</button>
        </div>
        <div className="report-card">
          <h3>Employer Report</h3>
          <p>Employer-specific usage and statistics</p>
          <button className="btn btn-primary">Download Report</button>
        </div>
        <div className="report-card">
          <h3>Compliance Report</h3>
          <p>Regulatory compliance and audit trails</p>
          <button className="btn btn-primary">View Compliance</button>
        </div>
      </div>

      <div className="quick-stats">
        <h3>Quick Statistics</h3>
        <div className="stat-grid">
          <div className="stat-item">
            <label>Average Advance Amount</label>
            <strong>R450</strong>
          </div>
          <div className="stat-item">
            <label>Repayment Rate</label>
            <strong>98.5%</strong>
          </div>
          <div className="stat-item">
            <label>Average Wellness Score</label>
            <strong>720</strong>
          </div>
          <div className="stat-item">
            <label>Monthly Active Users</label>
            <strong>892</strong>
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;