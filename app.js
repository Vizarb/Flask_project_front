const apiUrl = 'https://flask-project-a035.onrender.com'; // Replace with your API URL
let isRefreshing = false;

// should add if needed
// const validateFormData = (data) => {
//     // Check for required fields
//     const requiredFields = ['username', 'password', 'email', 'full_name']; // Add required fields as necessary
//     for (const field of requiredFields) {
//         if (!data[field] || data[field].trim() === '') {
//             displayMessage(`${field} is required.`);
//             return false;
//         }
//     }

//     // Email format validation (basic regex check)
//     if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
//         displayMessage('Please enter a valid email address.');
//         return false;
//     }

//     // Numeric field validation (if applicable)
//     if (data.age && (isNaN(data.age) || data.age <= 0)) {
//         displayMessage('Age must be a positive number.');
//         return false;
//     }

//     // Check if specific fields meet criteria (e.g., password strength)
//     if (data.password && (data.password.length < 6)) {
//         displayMessage('Password must be at least 6 characters long.');
//         return false;
//     }

//     // Add more specific validation checks as needed for your application

//     // All checks passed
//     return true;
// };


// Function to store access token in local storage
const storeToken = (token) => localStorage.setItem('jwtToken', token);

// Function to store refresh token in local storage
const storeRefreshToken = (token) => localStorage.setItem('refreshToken', token);

// Function to get access token from local storage
const getToken = () => localStorage.getItem('jwtToken');

// Function to set token in axios headers
const setAuthHeader = () => {
    const token = getToken();
    if (token) {
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
        delete axios.defaults.headers.common['Authorization']; // Remove header if no token
    }
};

// Function to clear the token from local storage and axios headers
const clearToken = () => {
    localStorage.removeItem('jwtToken');
    delete axios.defaults.headers.common['Authorization'];
};

// Function to clear refresh token
const clearRefreshToken = () => localStorage.removeItem('refreshToken');


// need to implement before prod
// const setupEventListeners = () => {

    
// };

// Call setAuthHeader once at the top of your script
setAuthHeader(); // This sets the header for all subsequent requests

// Function to refresh the access token
const refreshAccessToken = async () => {
    const refreshToken = localStorage.getItem('refreshToken');
    if (refreshToken) {
        try {
            const response = await apiCall('POST', 'refresh', { refresh_token: refreshToken });
            storeToken(response.access_token); // Update the access token
            setAuthHeader(); // Update the Authorization header
            return true; // Refresh successful
        } catch (error) {
            clearToken();
            clearRefreshToken();
            return false; // Refresh failed
        }
    }
    return false; // No refresh token available
};
// Display loading indicator
const showLoading = () => {
    document.getElementById('loadingIndicator').style.display = 'block';
};

const hideLoading = () => {
    document.getElementById('loadingIndicator').style.display = 'none';
};

// Display a message in the toast
const displayMessage = (msg) => {
    const toastBody = document.getElementById('toastBody');
    const messageToast = new bootstrap.Toast(document.getElementById('messageToast'), {
        delay: 5000, // Display for 5 seconds
        autohide: true // Auto-hide after the delay
    });
    toastBody.innerText = msg;
    messageToast.show(); // Show the toast
};

const apiCall = async (method, endpoint, data = null) => {
    try {
        showLoading();

        const config = {
            method,
            url: `${apiUrl}/${endpoint}`,
            headers: {
                'Content-Type': 'application/json',
            },
            data: data ? JSON.stringify(data) : null,
        };

        const response = await axios(config);
        return response.data;
    } catch (error) {
        if (error.response?.status === 401) {
            // Check if a refresh is already in progress
            if (!isRefreshing) {
                isRefreshing = true; // Set flag to indicate refresh in progress
                const refreshSuccess = await refreshAccessToken();
                isRefreshing = false; // Reset the flag after refresh attempt

                if (refreshSuccess) {
                    // Retry the original request
                    const retryResponse = await axios({
                        ...config,
                        headers: {
                            ...config.headers,
                            'Authorization': `Bearer ${getToken()}`,
                        },
                    });
                    return retryResponse.data;
                } else {
                    displayMessage('Session expired. Please log in again.');
                    window.location.href = 'index.html';
                }
            }
        }
        throw error.response?.data?.msg || 'An error occurred.';
    } finally {
        hideLoading();
    }
};


// Function to check if a user exists
const checkUserExists = async (username) => {
    try {
        const response = await axios.get(`${apiUrl}/check_user/${username}`);
        return response.data.exists; // Adjust based on your API response structure
    } catch (error) {
        console.error('Error checking if user exists:', error);
        return false; // Assume user does not exist in case of an error
    }
};

// Display payload in the specified container
const displayPayload = (data, formatFunction, containerId) => {
    const container = document.getElementById(containerId);
    container.innerHTML = ''; // Clear existing content

    // Check if data is an array and has items
    if (Array.isArray(data) && data.length > 0) {
        container.innerHTML = data.map(formatFunction).join('');
    } else {
        container.innerHTML = `<div>No items found.</div>`;
        displayMessage('No results found.'); // Notify user when no results are found
    }
};


// Format functions for different data types
const formatBook = (book) => `
    <div class="border p-3 mb-3">
        <h3>${book.name} by ${book.author}</h3>
        <p>Published: ${book.year_published}</p>
        <p>Status: ${book.is_active ? 'Active' : 'Inactive'}</p>
        <p>Loan Time: ${book.loan_time_type.replace('_', ' ').toLowerCase()}</p>
        <p>Category: ${book.category.replace('_', ' ').toLowerCase()}</p>
        <p>Loaned: ${book.is_loaned ? 'Yes' : 'No'}</p>
    </div>
`;

const formatLoan = (loan) => `
    <div class="border p-2 mb-2">
        Loan ID: ${loan.id}, Book: ${loan.book.name}, Customer: ${loan.customer.full_name}, Due Date: ${loan.return_date}, Status: (${loan.is_active ? 'active' : 'inactive'})
    </div>
`;

const formatCustomer = (customer) => `
    <div class="border p-2 mb-2">
        Name: ${customer.full_name}, Email: ${customer.email}, City: ${customer.city}, Age: ${customer.age}
    </div>
`;

// Generic form submission handler
const handleFormSubmission = async (formId, endpoint, data) => {
    const form = document.getElementById(formId);
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
            showLoading();
            const response = await apiCall('POST', endpoint, data());
            displayMessage(response.msg || 'Operation successful.');
        } catch (error) {
            displayMessage(error);
        }
    });
};

// Function to toggle visibility based on login status
const updateUI = async () => {
    const loginForm = document.getElementById('loginForm');
    const logoutBtn = document.getElementById('logoutBtn');

    const loggedIn = await isLoggedIn(); // Wait for the login status check

    if (loggedIn) {
        loginForm.classList.add('d-none'); // Hide the login form
        logoutBtn.classList.remove('d-none'); // Show the logout button
    } else {
        loginForm.classList.remove('d-none'); // Show the login form
        logoutBtn.classList.add('d-none'); // Hide the logout button
    }
};



// User registration
handleFormSubmission('registerForm', 'register', () => ({
    username: document.getElementById('registerUsername').value.trim(),
    password: document.getElementById('registerPassword').value.trim(),
}));


// User login
document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault(); // Prevent default form submission

    const username = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPassword').value.trim();

    try {
        const response = await apiCall('POST', 'login', { username, password });
        storeToken(response.access_token); // Store the access token
        storeRefreshToken(response.refresh_token); // Store the refresh token
        setAuthHeader(); // Set the authorization header
        displayMessage(response.msg || 'Login successful.');
        updateUI(); // Update the UI after successful login
    } catch (error) {
        displayMessage(error);
    }
});

// Function to check if a user is logged in and refresh the token if necessary
const isLoggedIn = async () => {
    const token = getToken();

    // If there is a valid access token, the user is logged in
    if (token) {
        return true;
    }

    // Attempt to refresh the token if no access token
    const refreshSuccess = await refreshAccessToken();
    return refreshSuccess; // Returns true if refresh was successful, otherwise false
};

// Redirect to login if not logged in
const redirectToLoginIfNotLoggedIn = async () => {
    const loggedIn = await isLoggedIn(); // Wait for the login status check
    if (!loggedIn) {
        window.location.href = 'index.html'; // Change to your login page URL
    }
};


// Logout function
const logout = async () => {
    try {
        await apiCall('POST', 'logout');
        clearToken(); // Clear the access token
        clearRefreshToken(); // Clear the refresh token
        displayMessage('Logged out successfully.');
        updateUI(); // Update the UI after logout
        window.location.href = 'index.html'; // Redirect to login after logout
    } catch (error) {
        displayMessage(error.response?.data?.msg || 'Logout failed.');
    }
};



// Attach logout event listener
document.getElementById('logoutBtn').addEventListener('click', logout);



// Create book
handleFormSubmission('createBookForm', 'book', () => ({
    name: document.getElementById('bookName').value.trim(),
    author: document.getElementById('bookAuthor').value.trim(),
    year_published: document.getElementById('yearPublished').value.trim(),
    loan_time_type: document.getElementById('loanTimeType').value.trim(),
    category: document.getElementById('bookCategory').value.trim(),
}));

// Search book
document.getElementById('searchBookForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('searchBookName').value.trim();
    if (!name) {
        displayMessage('Please provide a book name to search.');
        return;
    }

    try {
        const response = await apiCall('POST', 'book/search', { name });

        // Check if the response is an array
        if (!Array.isArray(response)) {
            throw new Error('Invalid response format.');
        }

        displayPayload(response, formatBook, 'booksList');
    } catch (error) {
        displayMessage(error.message || 'An error occurred while searching for books.');
    }
});


// Toggle book status
handleFormSubmission('toggleBookStatusForm', 'book/status', () => ({
    name: document.getElementById('toggleBookName').value.trim(),
}));

// Register customer
handleFormSubmission('registerCustomerForm', 'customer', () => ({
    full_name: document.getElementById('customerName').value.trim(),
    email: document.getElementById('customerEmail').value.trim(),
    city: document.getElementById('customerCity').value.trim(),
    age: parseInt(document.getElementById('customerAge').value.trim()),
}));

// Toggle customer status
handleFormSubmission('toggleCustomerStatusForm', 'customer/status', () => ({
    email: document.getElementById('toggleCustomerEmail').value.trim(),
}));

// Search customer
document.getElementById('searchCustomerForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fullName = document.getElementById('searchCustomerName').value.trim();
    const email = document.getElementById('searchCustomerEmail').value.trim() || null;

    if (!fullName && !email) {
        displayMessage('Please provide a customer name or email to search.');
        return;
    }

    try {
        const response = await apiCall('POST', 'customer/search', { email: email, full_name: fullName });
        // Check if the response is an array
        if (!Array.isArray(response)) {
            throw new Error('Invalid response format.');
        }

        displayPayload(response, formatCustomer, 'customersList');
    } catch (error) {
        displayMessage(error.message || 'An error occurred while searching for customers.');
    }
});

// Create loan
document.getElementById('createLoanForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const bookName = document.getElementById('loanBookName').value.trim();
    const customerFullName = document.getElementById('loanCustomerFullName').value.trim();
    const customerEmail = document.getElementById('loanCustomerEmail').value.trim();
    const duration = document.getElementById('loanDuration').value.trim();

    if (!bookName || !customerFullName || !customerEmail || !duration) {
        displayMessage('All fields are required to create a loan.');
        return;
    }

    try {
        const bookResponse = await apiCall('POST', 'book/search', { name: bookName });
        if (bookResponse.length === 0) throw new Error("Book not found.");
        const bookId = bookResponse[0].id;

        const customerResponse = await apiCall('POST', 'customer/search', {
            full_name: customerFullName,
            email: customerEmail
        });
        if (customerResponse.length === 0) throw new Error("Customer not found.");
        const customerId = customerResponse[0].id;

        const loanResponse = await apiCall('POST', 'loan', {
            customer_id: customerId,
            book_id: bookId,
            loan_time_type: duration
        });

        displayMessage(loanResponse.msg || `Loan Created: ${JSON.stringify(loanResponse)}`);
    } catch (error) {
        displayMessage(error);
    }
});

// Get all books based on selected type
document.getElementById('getBooksBtn').addEventListener('click', async () => {
    const bookType = document.getElementById('bookTypeSelect').value;
    try {
        const response = await apiCall('GET', `books?status=${bookType}`);
        displayPayload(response, formatBook, 'booksList');
    } catch (error) {
        displayMessage(error);
    }
});

// Get all loans based on selected type
document.getElementById('getLoansBtn').addEventListener('click', async () => {
    const loanType = document.getElementById('loanTypeSelect').value;
    try {
        const response = await apiCall('GET', `loans?status=${loanType}`);
        displayPayload(response, formatLoan, 'loansList');
    } catch (error) {
        displayMessage(error);
    }
});

// Get all customers based on selected type
document.getElementById('getCustomersBtn').addEventListener('click', async () => {
    const customerType = document.getElementById('customerTypeSelect').value;
    try {
        const response = await apiCall('GET', `customers?status=${customerType}`);
        displayPayload(response, formatCustomer, 'customersList');
    } catch (error) {
        displayMessage(error);
    }
});

// Return loan
function returnLoan() {
    document.getElementById('returnLoanForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const loanId = document.getElementById('returnLoanId').value.trim();

        if (!loanId) {
            displayMessage('Loan ID is required to return a loan.');
            return;
        }

        try {
            const response = await apiCall('POST', `return/${loanId}`);
            displayMessage(response.message || 'Loan returned successfully.');
        } catch (error) {
            displayMessage(error);
        }
    });
}

// Initialize Bootstrap toasts on page load
const toastWrap = () => {
    const toastElList = [].slice.call(document.querySelectorAll('.toast'));
    const toastList = toastElList.map((toastEl) => {
        return new bootstrap.Toast(toastEl);
    });
};



document.addEventListener('DOMContentLoaded', () => {
    // Call functions on page load
    toastWrap(); // Initialize Bootstrap toasts on page load
    updateUI(); // Update the UI based on login status
    returnLoan();
    // Call this function only on the clerk page
    if (window.location.pathname.endsWith('/clerk.html')) {
        redirectToLoginIfNotLoggedIn();
    }    
});