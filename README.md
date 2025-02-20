# PeriTech - Computer Peripherals Store

PeriTech is a full-stack web application for a computer peripherals store. It offers a modern e-commerce experience with features such as user authentication, product catalog with filtering and sorting, a shopping cart with persistent storage in MongoDB, and an admin dashboard for managing products, orders, and users. The admin dashboard also includes detailed sales trends reporting.

## Features

### User Features

- **User Authentication:**
  - Register, log in, log out, and update profile.
- **Product Catalog:**
  - View products in a responsive list.
  - Filter products by category, price range, and search term.
  - Sort products by price or name.
- **Shopping Cart:**
  - Add products to a cart stored persistently in MongoDB.
  - Update or remove items in the cart.
  - Cart dynamically reflects current product details (e.g., price).
- **Order Processing:**
  - Checkout to create an order.
  - Orders record product details (name, price, quantity) for historical data.
  - Users can view their orders along with order status.

### Admin Features

- **Admin Dashboard Hub:**
  - A central hub with subsections for:
    - **Sales Trends:** View detailed sales trends by date or by product. Customize date range and whether to include best-selling product details.
    - **Manage Products:** Filter, sort, add, edit, and delete products.
    - **View All Orders:** View orders from all users, update order statuses (pending, approved, declined), and delete orders.
    - **Manage Users:** Change users’ roles (admin vs. normal user).

## Technology Stack

- **Backend:** Node.js, Express, MongoDB, Mongoose
- **Frontend:** EJS templating engine, HTML, CSS
- **Authentication:** Sessions via `express-session` and bcrypt for password hashing
- **Styling:** Custom CSS with a responsive layout

## Installation

1. **Clone the Repository:**
   ```
   git clone https://github.com/adiletbol02/peritech.git
   cd peritech
   ```

2. **Install Dependencies:**
   ```
   npm install
   ```

4. **Set Up Environment Variables:**
   Create a .env file in the project root:
   ```
   PORT=3000
   MONGODB_URI=mongodb://localhost/periTech
   SESSION_SECRET=yourSecretKey
   ```

5. **Populate the Database:**
   Import the products.json file (provided in the repository) into your MongoDB to seed the product catalog:
   ```
   mongoimport --db periTech --collection products --file products.json --jsonArray
   ```

## Running the Application

**Start the server with:**
```
npm start
```

The application will be available at http://localhost:3000.

## Project Structure
```
project/
├── models/
│ ├── User.js       # User schema & authentication logic
│ ├── Product.js # Product schema
│ ├── Cart.js # Shopping cart schema (persistent in MongoDB)
│ └── Order.js # Order schema (includes order status and product details)
├── routes/
│ ├── auth.js # Authentication routes (login, register, profile)
│ ├── products.js # Public product catalog routes with filtering & sorting
│ ├── cart.js # Shopping cart routes
│ ├── orders.js # User orders routes
│ └── admin.js # Admin dashboard routes (sales trends, manage products, orders, users)
├── middleware/
│ └── auth.js # Middleware for authentication & admin authorization
├── public/
│ └── style.css # Custom CSS styles
├── views/
│ ├── partials/
│ │ ├── header.ejs # Common header with stylesheet link
│ │ ├── navbar.ejs # Navigation bar (includes link to admin dashboard if admin)
│ │ └── footer.ejs # Common footer
│ ├── login.ejs # Login page
│ ├── register.ejs # Registration page
│ ├── profile.ejs # User profile page
│ ├── products.ejs # Public products listing (with filters & sorting)
│ ├── cart.ejs # Shopping cart page (with AJAX updating)
│ ├── orders.ejs                # User orders page
│ ├── admin_dashboard_hub.ejs   # Main admin dashboard hub with links to subsections
│ ├── admin_sales.ejs           # Detailed sales trends view (customizable)
│ ├── admin_products.ejs        # Admin product management view (list/table format with filtering/sorting)
│ ├── admin_orders.ejs          # Admin orders management view (with status update and deletion)
│ └── admin_users.ejs           # Admin user management view (change user roles)
├── products.json               # JSON file with sample product catalog
├── .env                        # Environment configuration file
├── package.json                # Project dependencies and scripts
└── server.js                   # Main application server setup
```
## Usage

**Users:**
Navigate to the main page to browse products.
Use the filters and sorting options to refine your search.
Add products to your cart and proceed to checkout to place an order.
View your past orders and their current statuses in your profile.

**Admins:**
Log in with the admin credentials (the first admin is seeded automatically; default credentials: admin@example.com / admin123).
Access the Admin Dashboard Hub via the link in the navbar.
From the hub, view detailed sales trends, manage the product catalog (add, edit, delete), view and delete all orders, and manage user roles.

## Additional Notes

**Security:**
Passwords are hashed with bcrypt. For production use, ensure you use secure session management and HTTPS.

**Order Integrity:**
Orders store a snapshot of product details (name, price) to ensure historical accuracy even if products are later deleted.

**Customization:**
The sales trends dashboard is highly customizable via query parameters (e.g., date range, view type, best-selling product inclusion).
