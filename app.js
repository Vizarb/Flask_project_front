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
const getToken = () => {
    const token = localStorage.getItem('jwtToken');
    console.log("Retrieved token:", token); // Log the retrieved token
    return token;
};

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
    console.log("cleared access token");
    
    delete axios.defaults.headers.common['Authorization'];
};

// Function to clear refresh token
const clearRefreshToken = () => localStorage.removeItem('refreshToken');


// need to implement before prod
// const setupEventListeners = () => {

    
// };

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
const handleFormSubmission = (formId, endpoint, data) => {
    const form = document.getElementById(formId);
    
    // Check if the form exists
    if (!form) {
        console.error(`Form with ID "${formId}" not found.`);
        return;
    }

    // Clear any existing event listeners to avoid duplicates
    const existingListener = (event) => event.preventDefault();
    form.removeEventListener('submit', existingListener); // Remove previous listener, if any
    form.addEventListener('submit', async (e) => {
        e.preventDefault(); // Prevent the default form submission
        try {
            showLoading(); // Show loading indicator
            const formData = data(); // Call the data function to get current form data
            const response = await apiCall('POST', endpoint, formData); // Make the API call
            displayMessage(response.msg || 'Operation successful.'); // Display success message
        } catch (error) {
            displayMessage(error); // Handle error and display message
        } finally {
            hideLoading(); // Ensure loading indicator is hidden
        }
    });
};

// Function to toggle visibility based on login status
const updateUI = async () => {
    const loginForm = document.getElementById('loginForm');
    const logoutBtn = document.getElementById('logoutBtn');

    setAuthHeader(); // Ensure headers are set based on current login status

    const loggedIn = await isLoggedIn(); // Check login status


    if (loggedIn) {
        loginForm.classList.add('d-none'); // Hide login form
        logoutBtn.classList.remove('d-none'); // Show logout button
    } else {
        loginForm.classList.remove('d-none'); // Show login form
        logoutBtn.classList.add('d-none'); // Hide logout button
    }
};




// User registration
const handleRegisterSubmission = () => {
    handleFormSubmission('registerForm', 'register', () => ({
        username: document.getElementById('registerUsername').value.trim(),
        password: document.getElementById('registerPassword').value.trim(),
    }));
};


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
        try {
            console.log("Token found, checking login status...");
            const response = await apiCall('POST', 'check_login', null, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            console.log('Login check response:', response);
            return response ? true : false; // User is logged in
        } catch (error) {
            console.log("Got an error in isLoggedIn");
            console.error('Error checking login status:', error);
            return false; // Treat any error (including expired token) as not logged in
        }
    }

    // If no access token, check for refresh token
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) {
        console.log("No refresh token found. User is not logged in.");
        return false; // No tokens means user is not logged in
    }

    // Attempt to refresh the token if no access token
    console.log("No access token found, attempting to refresh...");
    const refreshSuccess = await refreshAccessToken();
    return refreshSuccess; // Returns true if refresh was successful, otherwise false
};




// Function to redirect to the login page
const redirectToLogin = () => {
    window.location.href = "index.html"; // Redirects to the login page
};

// Check login status and redirect if necessary
const checkLoginAndRedirect = async () => {
    const loggedIn = await isLoggedIn();
    if (!loggedIn) {
        redirectToLogin();
    }
};


// Logout function
const logout = async () => {
    try {
        console.log("Logging out...");
        await apiCall('POST', 'logout'); // Notify server of logout
        clearToken(); // Clear the access token
        clearRefreshToken(); // Clear the refresh token
        setAuthHeader(); // Update headers after logout

        displayMessage('Logged out successfully.'); // Feedback to the user
        
        updateUI(); // Update the UI after logout

    } catch (error) {
        console.error("Logout error:", error); // Log the error for debugging
        displayMessage(error.response?.data?.msg || 'Logout failed.'); // Inform the user
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
const searchForm = document.getElementById('searchCustomerForm');
if (searchForm) {
    searchForm.addEventListener('submit', async (e) => {
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
}


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
// Arrow function to set up the event listener
const setupGetBooksButton = () => {
    const getBooksBtn = document.getElementById('getBooksBtn');
    
    // Only add the event listener if the button exists
    if (getBooksBtn) {
        getBooksBtn.addEventListener('click', async () => {
            const bookType = document.getElementById('bookTypeSelect').value;
            try {
                const response = await apiCall('GET', `books?status=${bookType}`);
                displayPayload(response, formatBook, 'booksList');
            } catch (error) {
                displayMessage(error);
            }
        });
    }
};

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
// Search book
const searchBook = () => {
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
};


// Return loan
const returnLoan = () => {
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
};


// Initialize Bootstrap toasts on page load
const toastWrap = () => {
    const toastElList = [].slice.call(document.querySelectorAll('.toast'));
    const toastList = toastElList.map((toastEl) => {
        return new bootstrap.Toast(toastEl);
    });
};



document.addEventListener('DOMContentLoaded', async () => {
    console.log("DOM fully loaded and parsed");
    try {
        setAuthHeader();
        toastWrap(); // Initialize Bootstrap toasts
        await updateUI(); // Update UI based on login status
        setupGetBooksButton();
        returnLoan(); // Handle loan returns
        searchBook(); // Initialize book search
        handleRegisterSubmission(); // Handle registration submission
        // Check login status only if on clerk.html
        const currentPage = window.location.pathname.split('/').pop(); // Get the current page name
        if (currentPage === "clerk.html") {
            console.log("the link is clerk");
            checkLoginAndRedirect();
        }
    } catch (error) {
        console.error('Error during DOMContentLoaded:', error);
        displayMessage('An error occurred while loading the page.'); // Display a user-friendly message
    }
});
