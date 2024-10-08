const apiUrl = 'https://flask-project-a035.onrender.com'; // Replace with your API URL
let isRefreshing = false;

// should add

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
    delete axios.defaults.headers.common['Authorization'];
};

// Function to clear refresh token
const clearRefreshToken = () => localStorage.removeItem('refreshToken');


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

// Function to set up all event listeners
const setupEventListeners = () => {
    const logoutBtn = document.getElementById('logoutBtn');
    const getBooksBtn = document.getElementById('getBooksBtn');
    const returnLoanForm = document.getElementById('returnLoanForm');
    const searchBookForm = document.getElementById('searchBookForm');
    const getLoansBtn = document.getElementById('getLoansBtn'); // Declare constant for Get Loans button
    const createLoanForm = document.getElementById('createLoanForm'); // Declare constant for Create Loan form
    const getCustomersBtn = document.getElementById('getCustomersBtn'); // Declare constant for Get Customers button

    // Attach event listener for logout
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logout);
    }

    // Attach event listener for getting books
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

    // Function to return loan
    const returnLoan = () => {
        returnLoanForm.addEventListener('submit', async (e) => {
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

    // Call the returnLoan function
    if (returnLoanForm) {
        returnLoan();
    }

    // Function to search book
    const searchBook = () => {
        searchBookForm.addEventListener('submit', async (e) => {
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

    // Call the searchBook function
    if (searchBookForm) {
        searchBook();
    }

    // Attach event listener for getting customers
    if (getCustomersBtn) {
        getCustomersBtn.addEventListener('click', async () => {
            const customerType = document.getElementById('customerTypeSelect').value;
            try {
                const response = await apiCall('GET', `customers?status=${customerType}`);
                displayPayload(response, formatCustomer, 'customersList');
            } catch (error) {
                displayMessage(error);
            }
        });
    }

    // User registration
    if (document.getElementById('registerForm')) {
        handleFormSubmission('registerForm', 'register', () => ({
            username: document.getElementById('registerUsername').value.trim(),
            password: document.getElementById('registerPassword').value.trim(),
        }));
    }

    // Create book
    if (document.getElementById('createBookForm')) {
        handleFormSubmission('createBookForm', 'book', () => ({
            name: document.getElementById('bookName').value.trim(),
            author: document.getElementById('bookAuthor').value.trim(),
            year_published: document.getElementById('yearPublished').value.trim(),
            loan_time_type: document.getElementById('loanTimeType').value.trim(),
            category: document.getElementById('bookCategory').value.trim(),
        }));
    }

    // Toggle book status
    if (document.getElementById('toggleBookStatusForm')) {
        handleFormSubmission('toggleBookStatusForm', 'book/status', () => ({
            name: document.getElementById('toggleBookName').value.trim(),
        }));
    }

    // Register customer
    if (document.getElementById('registerCustomerForm')) {
        handleFormSubmission('registerCustomerForm', 'customer', () => ({
            full_name: document.getElementById('customerName').value.trim(),
            email: document.getElementById('customerEmail').value.trim(),
            city: document.getElementById('customerCity').value.trim(),
            age: parseInt(document.getElementById('customerAge').value.trim()),
        }));
    }

    // Toggle customer status
    if (document.getElementById('toggleCustomerStatusForm')) {
        handleFormSubmission('toggleCustomerStatusForm', 'customer/status', () => ({
            email: document.getElementById('toggleCustomerEmail').value.trim(),
        }));
    }

    // Create loan
    if (createLoanForm) {
        createLoanForm.addEventListener('submit', async (e) => {
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
    }

    // Get all loans based on selected type
    if (getLoansBtn) {
        getLoansBtn.addEventListener('click', async () => {
            const loanType = document.getElementById('loanTypeSelect').value;
            try {
                const response = await apiCall('GET', `loans?status=${loanType}`);
                displayPayload(response, formatLoan, 'loansList');
            } catch (error) {
                displayMessage(error);
            }
        });
    }
};




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
    <div class="card mb-4" style="border-radius: 10px;">
        <div class="card-body">
            <h5 class="card-title">${book.name} by ${book.author}</h5>
            <p class="card-text"><strong>Published:</strong> ${book.year_published}</p>
            <p class="card-text"><strong>Status:</strong> <span class="badge ${book.is_active ? 'bg-success' : 'bg-danger'}">${book.is_active ? 'Active' : 'Inactive'}</span></p>
            <p class="card-text"><strong>Loan Time:</strong> ${book.loan_time_type.replace('_', ' ').toLowerCase()}</p>
            <p class="card-text"><strong>Category:</strong> ${book.category.replace('_', ' ').toLowerCase()}</p>
            <p class="card-text"><strong>Loaned:</strong> <span class="badge ${book.is_loaned ? 'bg-success' : 'bg-danger'}">${book.is_loaned ? 'Yes' : 'No'}</span></p>
        </div>
    </div>
`;

const formatLoan = (loan) => `
    <div class="alert ${loan.is_active ? 'alert-success' : 'alert-danger'} mb-2" role="alert">
        <strong>Loan ID:</strong> ${loan.id}, <strong>Book:</strong> ${loan.book.name}, <strong>Customer:</strong> ${loan.customer.full_name}, <strong>Due Date:</strong> ${loan.return_date}, <strong>Status:</strong> ${loan.is_active ? 'Active' : 'Inactive'}
    </div>
`;

const formatCustomer = (customer) => `
    <div class="card mb-2" style="border-radius: 10px;">
        <div class="card-body">
            <h6 class="card-title">${customer.full_name}</h6>
            <p class="card-text"><strong>Email:</strong> ${customer.email}</p>
            <p class="card-text"><strong>City:</strong> ${customer.city}</p>
            <p class="card-text"><strong>Age:</strong> ${customer.age}</p>
        </div>
    </div>
`;



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
            const response = await apiCall('POST', 'check_login', null, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            return response ? true : false; // User is logged in
        } catch (error) {
            console.error('Error checking login status:', error);
            return false; // Treat any error (including expired token) as not logged in
        }
    }

    // If no access token, check for refresh token
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) {
        return false; // No tokens means user is not logged in
    }

    // Attempt to refresh the token if no access token
    const refreshSuccess = await refreshAccessToken();
    return refreshSuccess; // Returns true if refresh was successful, otherwise false
};




// Function to redirect to the login page with a delay
const redirectToLogin = (delay = 1000) => { // Default delay of 1000ms (1 second)
    setTimeout(() => {
        window.location.href = "index.html"; // Redirects to the login page
    }, delay);
};

// Check login status and redirect if necessary
const checkLoginAndRedirect = async () => {
    const loggedIn = await isLoggedIn();
    if (!loggedIn) {
        // Only redirect if not in the process of logging out
        if (window.location.pathname !== "/index.html") {
            redirectToLogin();
        }
    }
};


// Logout function
const logout = async () => {
    try {
        const response = await apiCall('POST', 'logout'); // Notify server of logout
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

// Initialize Bootstrap toasts on page load
const toastWrap = () => {
    const toastElList = [].slice.call(document.querySelectorAll('.toast'));
    const toastList = toastElList.map((toastEl) => {
        return new bootstrap.Toast(toastEl);
    });
};



document.addEventListener('DOMContentLoaded', async () => {
    try {
        setAuthHeader();
        toastWrap(); // Initialize Bootstrap toasts
        await updateUI(); // Update UI based on login status    
        setupEventListeners();// Attach all event listeners


        // Check login status only if on clerk.html
        const currentPage = window.location.pathname.split('/').pop(); // Get the current page name
        if (currentPage === "clerk.html") {
            checkLoginAndRedirect();
        }
    } catch (error) {
        console.error('Error during DOMContentLoaded:', error);
        displayMessage('An error occurred while loading the page.'); // Display a user-friendly message
    }
});
