// CLIQ BOOK - Main JavaScript File
// Core functionality for the eBook Library & Membership Website

// Global state management
const AppState = {
    currentUser: null,
    books: [],
    users: [],
    categories: [],
    currentPage: 1,
    booksPerPage: 20,
    filters: {
        category: 'all',
        rating: 0,
        search: '',
        accessLevel: 'all'
    },
    cart: [],
    bookmarks: []
};

// Utility functions
const Utils = {
    // Format rating stars
    formatRating: (rating) => {
        const fullStars = Math.floor(rating);
        const hasHalfStar = rating % 1 !== 0;
        let stars = '★'.repeat(fullStars);
        if (hasHalfStar) stars += '☆';
        return stars;
    },

    // Format price
    formatPrice: (price) => {
        return `${price.toFixed(2)}`;
    },

    // Truncate text
    truncateText: (text, maxLength) => {
        if (text.length <= maxLength) return text;
        return text.substr(0, maxLength) + '...';
    },

    // Generate unique ID
    generateId: () => {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    },

    // Debounce function
    debounce: (func, wait) => {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    // Show notification
    showNotification: (message, type = 'info') => {
        const notification = document.createElement('div');
        notification.className = `fixed top-4 right-4 p-4 rounded-lg shadow-lg z-50 ${
            type === 'success' ? 'bg-green-500' : 
            type === 'error' ? 'bg-red-500' : 
            'bg-blue-500'
        } text-white`;
        notification.textContent = message;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }
};

// User Management System
const UserManager = {
    init: () => {
        let users = JSON.parse(localStorage.getItem('cliqbook_users') || '[]');
        const adminExists = users.some(user => user.isAdmin);

        if (!adminExists) {
            const adminUser = { id: 'u001', name: 'John Doe', email: 'john@example.com', membership: 'premium', createdAt: '2023-01-15', password: 'password', isAdmin: true };
            users.unshift(adminUser);

            if (users.length === 1) { // Only add other users if the list was totally empty
                 users.push({ id: 'u002', name: 'Jane Smith', email: 'jane@example.com', membership: 'free', createdAt: '2023-02-20', password: 'password', isAdmin: false });
                 users.push({ id: 'u003', name: 'Peter Jones', email: 'peter@example.com', membership: 'premium', createdAt: '2023-03-10', password: 'password', isAdmin: false });
            }
            localStorage.setItem('cliqbook_users', JSON.stringify(users));
        }
        AppState.users = users;
    },

    saveUsers: () => {
        localStorage.setItem('cliqbook_users', JSON.stringify(AppState.users));
    }
};


// Authentication system
const Auth = {
    // Initialize auth system
    init: () => {
        const user = localStorage.getItem('cliqbook_user');
        if (user) {
            AppState.currentUser = JSON.parse(user);
            Auth.updateUI();
        }
    },

    // Login user
    login: (email, password) => {
        const user = AppState.users.find(u => u.email === email && u.password === password);
        
        if (user) {
            // Remove password from stored user data
            const { password: _, ...userData } = user;
            AppState.currentUser = userData;
            localStorage.setItem('cliqbook_user', JSON.stringify(userData));
            Auth.updateUI();
            Utils.showNotification('Login successful!', 'success');
            return true;
        } else {
            Utils.showNotification('Invalid email or password', 'error');
            return false;
        }
    },

    // Register user
    register: (userData) => {
        // Check if user already exists
        if (AppState.users.find(u => u.email === userData.email)) {
            Utils.showNotification('User already exists', 'error');
            return false;
        }
        
        // Create new user
        const newUser = {
            id: Utils.generateId(),
            ...userData,
            membership: 'free',
            createdAt: new Date().toISOString(),
            bookmarks: [],
            readingHistory: [],
            isAdmin: false
        };
        
        AppState.users.push(newUser);
        UserManager.saveUsers();
        
        // Auto login after registration
        const { password: _, ...userDataNoPassword } = newUser;
        AppState.currentUser = userDataNoPassword;
        localStorage.setItem('cliqbook_user', JSON.stringify(userDataNoPassword));
        
        Auth.updateUI();
        Utils.showNotification('Registration successful!', 'success');
        return true;
    },

    // Logout user
    logout: () => {
        AppState.currentUser = null;
        localStorage.removeItem('cliqbook_user');
        Auth.updateUI();
        Utils.showNotification('Logged out successfully', 'info');
        // Redirect to home page
        window.location.href = 'index.html';
    },

    // Update UI based on auth state
    updateUI: () => {
        const userMenu = document.getElementById('userMenu');
        const loginBtn = document.getElementById('loginBtn');
        const userName = document.getElementById('userName');
        const userAvatar = document.getElementById('userAvatar');
        
        // Remove existing admin link if it exists
        const existingAdminLink = document.getElementById('adminLink');
        if (existingAdminLink) {
            existingAdminLink.remove();
        }

        if (AppState.currentUser) {
            if (loginBtn) loginBtn.style.display = 'none';
            if (userMenu) userMenu.style.display = 'flex';
            if (userName) userName.textContent = AppState.currentUser.name;
            if (userAvatar) {
                userAvatar.src = AppState.currentUser.avatar || 'https://via.placeholder.com/150';
                userAvatar.alt = AppState.currentUser.name;
            }

            // Add admin link if user is admin
            if (AppState.currentUser.isAdmin) {
                const adminLink = document.createElement('a');
                adminLink.id = 'adminLink';
                adminLink.href = 'admin.html';
                adminLink.textContent = 'Admin';
                adminLink.className = 'text-red-500 hover:text-red-700 px-3 py-2 rounded-md text-sm font-medium transition-colors';
                
                // Find a good place to insert the admin link
                const navLinks = document.querySelector('.ml-10.flex.items-baseline.space-x-4');
                if (navLinks) {
                    navLinks.appendChild(adminLink);
                } else {
                    // Fallback for mobile or other structures
                    userMenu.parentElement.appendChild(adminLink);
                }
            }
        } else {
            if (loginBtn) loginBtn.style.display = 'block';
            if (userMenu) userMenu.style.display = 'none';
        }
    }
};

// Book management system
const BookManager = {
    // Initialize book data
    init: async () => {
        try {
            // Load books data
            const booksResponse = await fetch('data/books.json');
            AppState.books = await booksResponse.json();
            
            // Load categories data
            const categoriesResponse = await fetch('data/categories.json');
            AppState.categories = await categoriesResponse.json();
            
            // Load user bookmarks
            if (AppState.currentUser) {
                AppState.bookmarks = AppState.currentUser.bookmarks || [];
            }
        } catch (error) {
            console.error('Error loading data:', error);
            Utils.showNotification('Error loading book data', 'error');
        }
    },

    // Get filtered books
    getFilteredBooks: () => {
        let filtered = [...AppState.books];
        
        // Apply category filter
        if (AppState.filters.category !== 'all') {
            const selectedCategory = AppState.categories.find(
                cat => cat.id === AppState.filters.category
            );
            if (selectedCategory) {
                filtered = filtered.filter(book => 
                    book.category.toLowerCase() === selectedCategory.name.toLowerCase()
                );
            } else {
                console.warn(`Invalid category ID in filter: ${AppState.filters.category}. Skipping category filter.`);
            }
        }
        
        // Apply rating filter
        if (AppState.filters.rating > 0) {
            filtered = filtered.filter(book => book.rating >= AppState.filters.rating);
        }
        
        // Apply search filter
        if (AppState.filters.search) {
            const searchTerm = AppState.filters.search.toLowerCase();
            filtered = filtered.filter(book => 
                book.title.toLowerCase().includes(searchTerm) ||
                book.author.toLowerCase().includes(searchTerm) ||
                book.tags.some(tag => tag.toLowerCase().includes(searchTerm))
            );
        }
        
        // Apply access level filter
        if (AppState.filters.accessLevel && AppState.filters.accessLevel !== 'all') {
            filtered = filtered.filter(book => book.accessLevel === AppState.filters.accessLevel);
        }
        
        return filtered;
    },

    // Get books by category
    getBooksByCategory: (category, limit = null) => {
        const filtered = AppState.books.filter(book => 
            book.category.toLowerCase() === category.toLowerCase()
        );
        return limit ? filtered.slice(0, limit) : filtered;
    },

    // Get trending books
    getTrendingBooks: (limit = 10) => {
        return [...AppState.books]
            .sort((a, b) => b.reviews - a.reviews)
            .slice(0, limit);
    },

    // Get featured books
    getFeaturedBooks: (limit = 8) => {
        return [...AppState.books]
            .filter(book => book.rating >= 4.5)
            .sort((a, b) => b.rating - a.rating)
            .slice(0, limit);
    },

    // Search books
    searchBooks: (query) => {
        const searchTerm = query.toLowerCase();
        return AppState.books.filter(book => 
            book.title.toLowerCase().includes(searchTerm) ||
            book.author.toLowerCase().includes(searchTerm) ||
            book.description.toLowerCase().includes(searchTerm) ||
            book.tags.some(tag => tag.toLowerCase().includes(searchTerm))
        );
    },

    // Toggle bookmark
    toggleBookmark: (bookId) => {
        if (!AppState.currentUser) {
            Utils.showNotification('Please login to bookmark books', 'error');
            return false;
        }
        
        const index = AppState.bookmarks.indexOf(bookId);
        if (index > -1) {
            AppState.bookmarks.splice(index, 1);
            Utils.showNotification('Book removed from bookmarks', 'info');
        } else {
            AppState.bookmarks.push(bookId);
            Utils.showNotification('Book added to bookmarks', 'success');
        }
        
        // Update user data
        AppState.currentUser.bookmarks = AppState.bookmarks;
        localStorage.setItem('cliqbook_user', JSON.stringify(AppState.currentUser));
        
        // Update UI
        BookManager.updateBookmarkUI(bookId);
        return true;
    },

    // Update bookmark UI
    updateBookmarkUI: (bookId) => {
        const bookmarkBtns = document.querySelectorAll(`[data-book-id="${bookId}"].bookmark-btn`);
        const isBookmarked = AppState.bookmarks.includes(bookId);
        
        bookmarkBtns.forEach(btn => {
            btn.classList.toggle('bookmarked', isBookmarked);
            btn.innerHTML = isBookmarked ? '❤️' : '🤍';
        });
    },

    // Check if book is bookmarked
    isBookmarked: (bookId) => {
        return AppState.bookmarks.includes(bookId);
    }
};

// Membership system
const Membership = {
    // Check if user has premium access
    hasPremiumAccess: () => {
        if (!AppState.currentUser) return false;
        return AppState.currentUser.membership === 'premium';
    },

    // Check if user can access book
    canAccessBook: (book) => {
        if (book.accessLevel === 'premium') {
            return Membership.hasPremiumAccess();
        }
        return true; // Free and Standard books are accessible to all
    },

    // Show premium prompt
    showPremiumPrompt: (book = null) => {
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4';
        modal.innerHTML = `
            <div class="bg-white rounded-lg max-w-md w-full p-6">
                <div class="text-center mb-6">
                    <div class="text-6xl mb-4">👑</div>
                    <h3 class="text-2xl font-bold text-gray-800 mb-2">Premium Access Required</h3>
                    <p class="text-gray-600">
                        ${book ? `To read "${book.title}"` : 'To access this content'}, 
                        you need a premium membership.
                    </p>
                </div>
                
                <div class="space-y-4 mb-6">
                    <div class="flex items-center space-x-3">
                        <span class="text-green-500 text-xl">✓</span>
                        <span>Access to all premium books</span>
                    </div>
                    <div class="flex items-center space-x-3">
                        <span class="text-green-500 text-xl">✓</span>
                        <span>Offline reading capability</span>
                    </div>
                    <div class="flex items-center space-x-3">
                        <span class="text-green-500 text-xl">✓</span>
                        <span>No advertisements</span>
                    </div>
                    <div class="flex items-center space-x-3">
                        <span class="text-green-500 text-xl">✓</span>
                        <span>Priority customer support</span>
                    </div>
                </div>
                
                <div class="flex space-x-3">
                    <button onclick="Membership.redirectToMembership()" 
                            class="flex-1 bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors">
                        Upgrade to Premium
                    </button>
                    <button onclick="this.closest('.fixed').remove()" 
                            class="flex-1 bg-gray-300 text-gray-700 py-3 px-4 rounded-lg hover:bg-gray-400 transition-colors">
                        Maybe Later
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Close on backdrop click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    },

    // Redirect to membership page
    redirectToMembership: () => {
        window.location.href = 'membership.html';
    }
};

// Search functionality
const Search = {
    // Initialize search
    init: () => {
        const searchInput = document.getElementById('searchInput');
        const searchBtn = document.getElementById('searchBtn');
        
        if (searchInput) {
            // Debounced search on input
            searchInput.addEventListener('input', Utils.debounce((e) => {
                AppState.filters.search = e.target.value;
                if (typeof renderBooks === 'function') {
                    renderBooks();
                }
            }, 300));
        }
        
        if (searchBtn) {
            searchBtn.addEventListener('click', () => {
                const query = searchInput.value;
                if (query) {
                    window.location.href = `library.html?search=${encodeURIComponent(query)}`;
                }
            });
        }
    },

    // Get search query from URL
    getQueryFromURL: () => {
        const params = new URLSearchParams(window.location.search);
        return params.get('search') || '';
    }
};

// UI Components
const UI = {
    // Create book card
    createBookCard: (book) => {
        const isBookmarked = BookManager.isBookmarked(book.id);
        const canAccess = Membership.canAccessBook(book);
        
        return `
            <div class="book-card bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
                <div class="relative">
                    <img src="${book.cover}" alt="${book.title}" 
                         class="w-full h-64 object-cover" 
                         onerror="this.src='https://via.placeholder.com/256x384.png?text=No+Cover'">
                    <button onclick="BookManager.toggleBookmark('${book.id}')" 
                            class="bookmark-btn absolute top-2 right-2 p-2 rounded-full bg-white bg-opacity-80 hover:bg-opacity-100 transition-all ${isBookmarked ? 'bookmarked' : ''}"
                            data-book-id="${book.id}">
                        ${isBookmarked ? '❤️' : '🤍'}
                    </button>
                    ${(() => {
                        if (book.accessLevel === 'premium') {
                            return '<div class="absolute top-2 left-2 bg-yellow-500 text-black px-2 py-1 rounded text-xs font-bold">PREMIUM</div>';
                        }
                        if (book.accessLevel === 'standard') {
                            return '<div class="absolute top-2 left-2 bg-blue-500 text-white px-2 py-1 rounded text-xs font-bold">STANDARD</div>';
                        }
                        return '';
                    })()}
                </div>
                
                <div class="p-4">
                    <h3 class="font-bold text-lg mb-1 text-gray-800 line-clamp-2">${book.title}</h3>
                    <p class="text-gray-600 mb-2">by ${book.author}</p>
                    
                    <div class="flex items-center mb-2">
                        <span class="text-yellow-400 mr-1">${Utils.formatRating(book.rating)}</span>
                        <span class="text-sm text-gray-500">(${book.reviews.toLocaleString()} reviews)</span>
                    </div>
                    
                    <p class="text-sm text-gray-600 mb-3 line-clamp-3">${Utils.truncateText(book.description, 100)}</p>
                    
                    <div class="flex items-center justify-between">
                        <span class="text-lg font-bold text-blue-600">${Utils.formatPrice(book.price)}</span>
                        <div class="flex space-x-2">
                            ${canAccess ? 
                                `<button onclick="window.location.href='reader.html?book=${book.id}'" 
                                        class="bg-green-600 text-white px-3 py-2 rounded hover:bg-green-700 transition-colors text-sm">
                                    Read Now
                                </button>` :
                                `<button onclick="Membership.showPremiumPrompt(${JSON.stringify(book).replace(/"/g, '&quot;')})" 
                                        class="bg-blue-600 text-white px-3 py-2 rounded hover:bg-blue-700 transition-colors text-sm">
                                    Preview
                                </button>`
                            }
                            <button onclick="window.location.href='book.html?id=${book.id}'" 
                                    class="bg-gray-600 text-white px-3 py-2 rounded hover:bg-gray-700 transition-colors text-sm">
                                Details
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    // Create category card
    createCategoryCard: (category) => {
        return `
            <div class="category-card bg-white rounded-lg shadow-md p-6 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 cursor-pointer"
                 onclick="window.location.href='library.html?category=${category.id}'">
                <div class="text-center">
                    <div class="text-4xl mb-3">${category.icon}</div>
                    <h3 class="text-xl font-bold text-gray-800 mb-2">${category.name}</h3>
                    <p class="text-gray-600 mb-3">${category.description}</p>
                    <div class="flex items-center justify-center space-x-2">
                        <span class="text-sm text-gray-500">${category.bookCount} books</span>
                        ${category.popular ? '<span class="bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full">Popular</span>' : ''}
                    </div>
                </div>
            </div>
        `;
    },


};

// Initialize application
document.addEventListener('DOMContentLoaded', async () => {
    // Initialize core systems in correct order
    Auth.init();             // 1. Initialize Auth first to load currentUser from localStorage
    UserManager.init();      // 2. Load all users into AppState, creating mocks if needed
    await BookManager.init(); // 3. Then initialize BookManager which might depend on currentUser
    Search.init();           // 4. Then initialize Search functionality
    Auth.updateUI(); // 5. Finally, update the UI based on auth state (user menu, login button)

    // Setup common UI event listeners (logout, mobile menu toggle)
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', Auth.logout);
    }
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const mobileMenu = document.getElementById('mobileMenu');
    if (mobileMenuBtn && mobileMenu) {
        mobileMenuBtn.addEventListener('click', () => {
            mobileMenu.classList.toggle('hidden');
        });
    }
    
    // Load page-specific functionality
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    
    switch (currentPage) {
        case 'index.html':
        case '':
            if (typeof initHomePage === 'function') initHomePage();
            break;
        case 'library.html':
            if (typeof initLibraryPage === 'function') initLibraryPage();
            break;
        case 'book.html':
            if (typeof initBookPage === 'function') initBookPage();
            break;
        case 'membership.html':
            if (typeof initMembershipPage === 'function') initMembershipPage();
            break;
        case 'login.html':
            if (typeof initLoginPage === 'function') initLoginPage();
            break;
        case 'reader.html':
            if (typeof initReaderPage === 'function') initReaderPage();
            break;
        case 'profile.html':
            if (typeof initProfilePage === 'function') initProfilePage();
            break;
    }
});

// Export for global access
window.AppState = AppState;
window.Utils = Utils;
window.Auth = Auth;
window.BookManager = BookManager;
window.Membership = Membership;
window.Search = Search;
window.UI = UI;
window.UserManager = UserManager;