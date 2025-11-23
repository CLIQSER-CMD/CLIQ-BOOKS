document.addEventListener('DOMContentLoaded', () => {
    const App = {
        books: [],
        users: [],
        categories: [],
        activities: [],

        async init() {
            const user = JSON.parse(localStorage.getItem('cliqbook_user'));
            if (!user || !user.isAdmin) {
                window.location.href = 'login.html?redirect=admin';
                return;
            }
            this.mockUsers();
            await this.loadData();
            this.activities = JSON.parse(localStorage.getItem('cliqbook_activities') || '[]');
            this.setupEventListeners();
            this.handleRouting();
            this.renderDashboard();
        },

        mockUsers() {
            // Create mock users if not present in localStorage
            if (!localStorage.getItem('cliqbook_users')) {
                const mockUsers = [
                    { id: 'u001', name: 'John Doe', email: 'john@example.com', membership: 'premium', createdAt: '2023-01-15', password: 'password', isAdmin: true },
                    { id: 'u002', name: 'Jane Smith', email: 'jane@example.com', membership: 'free', createdAt: '2023-02-20', password: 'password', isAdmin: false },
                    { id: 'u003', name: 'Peter Jones', email: 'peter@example.com', membership: 'premium', createdAt: '2023-03-10', password: 'password', isAdmin: false },
                ];
                localStorage.setItem('cliqbook_users', JSON.stringify(mockUsers));
            }
            this.users = JSON.parse(localStorage.getItem('cliqbook_users'));
        },

        async loadData() {
            try {
                const categoriesRes = await fetch('data/categories.json');
                this.categories = await categoriesRes.json();

                const localBooks = localStorage.getItem('cliqbook_books');
                if (localBooks) {
                    this.books = JSON.parse(localBooks);
                } else {
                    const booksRes = await fetch('data/books.json');
                    this.books = await booksRes.json();
                    localStorage.setItem('cliqbook_books', JSON.stringify(this.books));
                }
            } catch (error) {
                console.error('Error loading data:', error);
            }
        },

        setupEventListeners() {
            // Navigation
            document.querySelectorAll('.nav-link').forEach(link => {
                link.addEventListener('click', (e) => {
                    e.preventDefault();
                    const targetId = e.currentTarget.getAttribute('href').substring(1);
                    if (targetId !== 'back-to-site') {
                         window.location.hash = targetId;
                    } else {
                        window.location.href = 'index.html';
                    }
                });
            });

            window.addEventListener('hashchange', () => this.handleRouting());

            // Book Modal
            document.getElementById('addBookBtn').addEventListener('click', () => this.showBookModal());
            document.getElementById('closeModalBtn').addEventListener('click', () => this.hideBookModal());
            document.getElementById('bookModal').addEventListener('click', (e) => {
                if (e.target.id === 'bookModal') {
                    this.hideBookModal();
                }
            });

            // User Modal
            document.getElementById('addUserBtn').addEventListener('click', () => this.showUserModal());
            document.getElementById('closeUserModalBtn').addEventListener('click', () => this.hideUserModal());
            document.getElementById('userModal').addEventListener('click', (e) => {
                if (e.target.id === 'userModal') {
                    this.hideUserModal();
                }
            });

            // Form submission
            document.getElementById('bookForm').addEventListener('submit', (e) => this.handleBookFormSubmit(e));
            document.getElementById('userForm').addEventListener('submit', (e) => this.handleUserFormSubmit(e));
            document.getElementById('settingsForm').addEventListener('submit', (e) => this.handleSettingsFormSubmit(e));
        
            // Search
            document.getElementById('bookSearch').addEventListener('input', (e) => this.renderBooksTable(e.target.value));
            document.getElementById('userSearch').addEventListener('input', (e) => this.renderUsersTable(e.target.value));

            // Export
            document.getElementById('exportBooksBtn').addEventListener('click', () => this.exportToCSV(this.books, 'books.csv'));
            document.getElementById('exportUsersBtn').addEventListener('click', () => this.exportToCSV(this.users, 'users.csv'));
        },

        handleRouting() {
            const hash = window.location.hash.substring(1) || 'dashboard';
            document.querySelectorAll('.page-section').forEach(section => {
                section.classList.add('hidden');
            });
            document.querySelectorAll('.nav-link').forEach(link => {
                link.classList.remove('active');
            });

            const activeSection = document.getElementById(hash);
            if (activeSection) {
                activeSection.classList.remove('hidden');
                document.querySelector(`.nav-link[href="#${hash}"]`).classList.add('active');
            }

            switch (hash) {
                case 'dashboard':
                    this.renderDashboard();
                    break;
                case 'ebooks':
                    this.renderBooksTable();
                    break;
                case 'users':
                    this.renderUsersTable();
                    break;
                case 'membership':
                    this.renderMembership();
                    break;
                case 'settings':
                    this.renderSettings();
                    break;
            }
        },

        renderDashboard() {
            // Stats
            document.getElementById('totalBooks').textContent = this.books.length;
            document.getElementById('totalUsers').textContent = this.users.length;
            document.getElementById('premiumMembers').textContent = this.users.filter(u => u.membership === 'premium').length;
            document.getElementById('booksRead').textContent = '1,254'; // Mock data

            // Charts
            this.renderCategoryChart();
            this.renderUserChart();
            this.renderActivityFeed();
        },

        logActivity(message) {
            const newActivity = {
                message: message,
                timestamp: new Date().toISOString()
            };
            this.activities.unshift(newActivity);
            if (this.activities.length > 20) {
                this.activities.pop();
            }
            localStorage.setItem('cliqbook_activities', JSON.stringify(this.activities));
            this.renderActivityFeed();
        },

        renderActivityFeed() {
            const feedContainer = document.getElementById('activityFeed');
            if (!feedContainer) return;

            if (this.activities.length === 0) {
                feedContainer.innerHTML = '<p class="text-gray-500">No recent activity.</p>';
                return;
            }

            feedContainer.innerHTML = this.activities.map(activity => {
                const timeAgo = Math.round((new Date() - new Date(activity.timestamp)) / 60000); // in minutes
                return `
                    <div class="p-2 border-b border-gray-200">
                        <p class="text-sm">${activity.message}</p>
                        <p class="text-xs text-gray-500">${timeAgo} minutes ago</p>
                    </div>
                `;
            }).join('');
        },

        exportToCSV(data, filename) {
            if (data.length === 0) {
                showToast('No data to export.', 'info');
                return;
            }

            const replacer = (key, value) => value === null ? '' : value;
            const header = Object.keys(data[0]);
            let csv = data.map(row => header.map(fieldName => JSON.stringify(row[fieldName], replacer)).join(','));
            csv.unshift(header.join(','));
            csv = csv.join('\r\n');

            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            if (link.download !== undefined) {
                const url = URL.createObjectURL(blob);
                link.setAttribute('href', url);
                link.setAttribute('download', filename);
                link.style.visibility = 'hidden';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            }
        },


        renderCategoryChart() {
            const chartDom = document.getElementById('categoryChart');
            const myChart = echarts.init(chartDom);
            const data = this.categories.map(cat => ({
                value: this.books.filter(b => b.category === cat.name).length,
                name: cat.name
            }));

            const option = {
                tooltip: { trigger: 'item' },
                legend: { top: '5%', left: 'center' },
                series: [{
                    name: 'Books by Category',
                    type: 'pie',
                    radius: ['40%', '70%'],
                    avoidLabelOverlap: false,
                    itemStyle: {
                        borderRadius: 10,
                        borderColor: '#fff',
                        borderWidth: 2
                    },
                    label: { show: false, position: 'center' },
                    emphasis: {
                        label: { show: true, fontSize: '20', fontWeight: 'bold' }
                    },
                    labelLine: { show: false },
                    data: data
                }]
            };
            myChart.setOption(option);
        },

        renderUserChart() {
            const chartDom = document.getElementById('userChart');
            const myChart = echarts.init(chartDom);
            const option = {
                xAxis: {
                    type: 'category',
                    data: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul']
                },
                yAxis: { type: 'value' },
                series: [{
                    data: [10, 25, 40, 50, 80, 110, 150], // Mock data
                    type: 'line',
                    smooth: true
                }]
            };
            myChart.setOption(option);
        },

        renderBooksTable(searchTerm = '') {
            const tbody = document.getElementById('booksTable').querySelector('tbody');
            const filteredBooks = this.books.filter(book => {
                const term = searchTerm.toLowerCase();
                return book.title.toLowerCase().includes(term) ||
                       book.author.toLowerCase().includes(term) ||
                       book.category.toLowerCase().includes(term);
            });

            tbody.innerHTML = filteredBooks.map(book => `
                <tr>
                    <td>${book.title}</td>
                    <td>${book.author}</td>
                    <td>${book.category}</td>
                    <td>${book.rating}</td>
                    <td>${book.accessLevel}</td>
                    <td>
                        <button class="btn btn-secondary" onclick="App.editBook('${book.id}')">Edit</button>
                    </td>
                </tr>
            `).join('');
        },

        renderUsersTable(searchTerm = '') {
            const tbody = document.getElementById('usersTable').querySelector('tbody');
            const filteredUsers = this.users.filter(user => {
                const term = searchTerm.toLowerCase();
                return user.name.toLowerCase().includes(term) ||
                       user.email.toLowerCase().includes(term);
            });
            tbody.innerHTML = filteredUsers.map(user => `
                <tr>
                    <td>${user.name}</td>
                    <td>${user.email}</td>
                    <td><span class="${user.membership === 'premium' ? 'text-green-600' : 'text-gray-600'}">${user.membership}</span></td>
                    <td>${new Date(user.createdAt).toLocaleDateString()}</td>
                    <td>
                        <button class="btn btn-secondary" onclick="App.editUser('${user.id}')">Edit</button>
                    </td>
                </tr>
            `).join('');
        },

        renderMembership() {
            const premiumUsers = this.users.filter(u => u.membership === 'premium');
            document.getElementById('premiumMembersCount').textContent = premiumUsers.length;
            document.getElementById('mrr').textContent = `$${premiumUsers.length * 9.99}`; // Assuming $9.99/month
            document.getElementById('arr').textContent = `$${premiumUsers.length * 9.99 * 12}`;

            const tbody = document.getElementById('premiumMembersTable').querySelector('tbody');
            tbody.innerHTML = premiumUsers.map(user => `
                <tr>
                    <td>${user.name}</td>
                    <td>${user.email}</td>
                    <td>${new Date(user.createdAt).toLocaleDateString()}</td>
                </tr>
            `).join('');
        },

        showUserModal() {
            document.getElementById('userModalTitle').textContent = 'Add New User';
            document.getElementById('userForm').reset();
            document.getElementById('userId').value = '';
            document.getElementById('deleteUserBtn').classList.add('hidden');
            document.getElementById('userModal').classList.remove('hidden');
        },

        hideUserModal() {
            document.getElementById('userModal').classList.add('hidden');
        },

        editUser(id) {
            const user = this.users.find(u => u.id === id);
            if(user) {
                document.getElementById('userModalTitle').textContent = 'Edit User';
                document.getElementById('userForm').reset();
                document.getElementById('userId').value = user.id;
                document.getElementById('name').value = user.name;
                document.getElementById('email').value = user.email;
                document.getElementById('membershipStatus').value = user.membership;
                document.getElementById('isAdmin').checked = user.isAdmin;

                document.getElementById('deleteUserBtn').classList.remove('hidden');
                document.getElementById('deleteUserBtn').onclick = () => this.deleteUser(id);
                document.getElementById('userModal').classList.remove('hidden');
            }
        },

        deleteUser(id) {
            if (confirm('Are you sure you want to delete this user?')) {
                const user = this.users.find(u => u.id === id);
                this.users = this.users.filter(u => u.id !== id);
                localStorage.setItem('cliqbook_users', JSON.stringify(this.users));
                this.renderUsersTable();
                this.hideUserModal();
                this.renderDashboard(); // Update dashboard stats
                showToast('User deleted successfully!', 'success');
                if (user) {
                    this.logActivity(`User deleted: ${user.name} (${user.email})`);
                }
            }
        },

        handleUserFormSubmit(e) {
            e.preventDefault();
            const form = e.target;
            const name = form.name.value;
            const email = form.email.value;

            if (!name || !email) {
                showToast('Please fill out all required fields.', 'error');
                return;
            }

            const userId = form.userId.value;

            const userData = {
                id: userId,
                name: form.name.value,
                email: form.email.value,
                membership: form.membershipStatus.value,
                isAdmin: form.isAdmin.checked
            };

            if (userId) {
                // Update existing user
                const index = this.users.findIndex(u => u.id === userId);
                this.users[index] = { ...this.users[index], ...userData };
                this.logActivity(`User updated: ${userData.name}`);
            } else {
                // Add new user
                const newUser = {
                    id: 'u' + (this.users.length + 1).toString().padStart(3, '0'),
                    createdAt: new Date().toISOString(),
                    password: 'password', // mock password
                    ...userData
                };
                this.users.push(newUser);
                this.logActivity(`New user registered: ${newUser.name}`);
            }

            localStorage.setItem('cliqbook_users', JSON.stringify(this.users));
            
            this.renderUsersTable();
            this.hideUserModal();
            this.renderDashboard(); // Update dashboard stats
            showToast('User saved successfully!');
        },
        
        showBookModal() {
            document.getElementById('modalTitle').textContent = 'Add New Book';
            document.getElementById('bookForm').reset();
            document.getElementById('bookId').value = '';
            document.getElementById('currentFile').textContent = '';
            
            const coverPreview = document.getElementById('coverPreview');
            coverPreview.src = '';
            coverPreview.style.display = 'none';
            
            const categorySelect = document.getElementById('category');
            
            const populateCategories = (categoriesToUse) => {
                categorySelect.innerHTML = categoriesToUse.map(cat => `<option value="${cat.name}">${cat.name}</option>`).join('');
                if (categoriesToUse.length === 0) {
                    categorySelect.innerHTML = '<option value="">No categories available</option>';
                    showToast('No categories loaded. Please check data/categories.json or ensure internet connection.', 'error');
                }
            };

            // Attempt to use already loaded categories
            if (this.categories && this.categories.length > 0) {
                populateCategories(this.categories);
                console.log('Categories loaded for book modal from App.categories:', this.categories.length);
            } else {
                console.warn('App.categories is empty, attempting to re-fetch or use fallback.');
                // Attempt to re-fetch categories if they are somehow missing
                fetch('data/categories.json')
                    .then(res => res.json())
                    .then(data => {
                        this.categories = data; // Update App.categories with fetched data
                        if (this.categories.length > 0) {
                            populateCategories(this.categories);
                            console.log('Categories re-fetched and loaded:', this.categories.length);
                        } else {
                            // Fallback to hardcoded categories if fetch still returns empty
                            const fallbackCategories = [
                                { name: 'Self Help' }, { name: 'Money' }, { name: 'Fiction' },
                                { name: 'Technology' }, { name: 'Motivation' }, { name: 'Trading' }
                            ];
                            populateCategories(fallbackCategories);
                            showToast('Categories could not be loaded, using fallback list.', 'info');
                            console.warn('Using fallback categories.');
                        }
                    })
                    .catch(error => {
                        console.error('Error re-fetching categories, using fallback:', error);
                        const fallbackCategories = [
                            { name: 'Self Help' }, { name: 'Money' }, { name: 'Fiction' },
                            { name: 'Technology' }, { name: 'Motivation' }, { name: 'Trading' }
                        ];
                        populateCategories(fallbackCategories);
                        showToast('Error loading categories, using fallback list. See console for details.', 'error');
                    });
            }

            document.getElementById('deleteBookBtn').classList.add('hidden');
            document.getElementById('bookModal').classList.remove('hidden');
        },

        hideBookModal() {
            document.getElementById('bookModal').classList.add('hidden');
        },
        
        editBook(id) {
            const book = this.books.find(b => b.id === id);
            if(book) {
                this.showBookModal(); // Use showBookModal to reset the form and populate categories
                document.getElementById('modalTitle').textContent = 'Edit Book';
                document.getElementById('bookId').value = book.id;
                document.getElementById('title').value = book.title;
                document.getElementById('author').value = book.author;
                document.getElementById('category').value = book.category;
                document.getElementById('description').value = book.description;
                document.getElementById('price').value = book.price;
                document.getElementById('accessLevel').value = book.accessLevel || 'free';

                const coverPreview = document.getElementById('coverPreview');
                if (book.cover) {
                    coverPreview.src = book.cover;
                    coverPreview.style.display = 'block';
                } else {
                    coverPreview.style.display = 'none';
                }

                if (book.fileUrl) {
                    document.getElementById('currentFile').textContent = 'A file is currently associated with this book.';
                } else {
                    document.getElementById('currentFile').textContent = '';
                }

                document.getElementById('deleteBookBtn').classList.remove('hidden');
                document.getElementById('deleteBookBtn').onclick = () => this.deleteBook(id);
                // No need to show modal again, showBookModal already did it.
            }
        },

        deleteBook(id) {
            if (confirm('Are you sure you want to delete this book?')) {
                const book = this.books.find(b => b.id === id);
                this.books = this.books.filter(b => b.id !== id);
                localStorage.setItem('cliqbook_books', JSON.stringify(this.books));
                // Here you would also make an API call to update the server
                this.renderBooksTable();
                this.hideBookModal();
                this.renderDashboard(); // Update dashboard stats
                showToast('Book deleted successfully!', 'success');
                if (book) {
                    this.logActivity(`Book deleted: ${book.title}`);
                }
            }
        },

        readFileAsDataURL(file) {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result);
                reader.onerror = reject;
                reader.readAsDataURL(file);
            });
        },

        async handleBookFormSubmit(e) {
            e.preventDefault();
            showToast('Saving book... Please wait.', 'info');
            const form = e.target;
            const title = form.title.value;
            const author = form.author.value;

            if (!title || !author) {
                showToast('Please fill out all required fields.', 'error');
                return;
            }

            const bookId = form.bookId.value;
            const bookFile = form.bookFile.files[0];
            const coverFile = form.coverFile.files[0];

            let fileUrl = null;
            if (bookFile) {
                 if (bookFile.size > 5 * 1024 * 1024) { // 5MB size limit
                    showToast('PDF file is too large. Please select a file smaller than 5MB.', 'error');
                    return;
                }
                try {
                    fileUrl = await this.readFileAsDataURL(bookFile);
                } catch (error) {
                    showToast('Error reading PDF file. Please try again.', 'error');
                    return;
                }
            } else if (bookId) {
                const existingBook = this.books.find(b => b.id === bookId);
                fileUrl = existingBook ? existingBook.fileUrl : null;
            }

            let coverUrl = null;
            if (coverFile) {
                if (coverFile.size > 2 * 1024 * 1024) { // 2MB size limit for images
                    showToast('Cover image is too large. Please select a file smaller than 2MB.', 'error');
                    return;
                }
                try {
                    coverUrl = await this.readFileAsDataURL(coverFile);
                } catch (error) {
                    showToast('Error reading cover image. Please try again.', 'error');
                    return;
                }
            } else if (bookId) {
                const existingBook = this.books.find(b => b.id === bookId);
                coverUrl = existingBook ? existingBook.cover : null;
            }


            let newId = bookId;
            if (!newId) {
                const highestId = this.books.reduce((max, book) => {
                    const idNum = parseInt(book.id.replace('b', ''), 10);
                    return idNum > max ? idNum : max;
                }, 0);
                newId = 'b' + (highestId + 1).toString().padStart(3, '0');
            }

            const bookData = {
                id: newId,
                title: form.title.value,
                author: form.author.value,
                category: form.category.value,
                description: form.description.value,
                cover: coverUrl,
                fileUrl: fileUrl,
                price: parseFloat(form.price.value),
                accessLevel: form.accessLevel.value,
                rating: bookId ? this.books.find(b=>b.id === bookId).rating : 0,
                reviews: bookId ? this.books.find(b=>b.id === bookId).reviews : 0,
                publishDate: new Date().toISOString().split('T')[0],
                tags: [],
                keyLessons: [],
                summary: form.description.value,
                previewPages: 15
            };

            if (bookId) {
                // Update existing book
                const index = this.books.findIndex(b => b.id === bookId);
                this.books[index] = { ...this.books[index], ...bookData };
                this.logActivity(`Book updated: ${bookData.title}`);
            } else {
                // Add new book
                this.books.push(bookData);
                this.logActivity(`New book added: ${bookData.title}`);
            }

            localStorage.setItem('cliqbook_books', JSON.stringify(this.books));
            
            this.renderBooksTable();
            this.hideBookModal();
            this.renderDashboard(); // Update dashboard stats
            showToast('Book saved successfully!', 'success');
        },


        renderSettings() {
            const settings = JSON.parse(localStorage.getItem('cliqbook_settings')) || { booksPerPage: 20 };
            document.getElementById('booksPerPage').value = settings.booksPerPage;
        },

        handleSettingsFormSubmit(e) {
            e.preventDefault();
            const booksPerPage = document.getElementById('booksPerPage').value;
            const settings = { booksPerPage: parseInt(booksPerPage, 10) };
            localStorage.setItem('cliqbook_settings', JSON.stringify(settings));
            // In a real app, you would probably need to reload the app or parts of it
            // to see the effect of the new settings.
            showToast('Settings saved!');
            this.logActivity(`Settings updated. Books per page: ${settings.booksPerPage}`);
        }
    };

    App.init();
    window.App = App; // For inline event handlers
});

function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast show ${type}`;
    setTimeout(() => {
        toast.className = 'toast hidden';
    }, 3000);
}
