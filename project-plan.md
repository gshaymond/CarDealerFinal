# Used Car Dealership Project Plan

## Goal
Build a used car dealership website in six weeks that demonstrates a complete server-rendered Node.js application with authentication, role-based access, relational database design, and a deployable production setup.

## Required Technology Stack
- Backend: Node.js with Express.js
- Views: EJS or Liquid.js
- Modules: ESM only, no CommonJS or require
- Database: PostgreSQL
- Hosting: Render with a connected PostgreSQL database
- Sessions: express-session for authentication state
- Password hashing: bcrypt or similar

## Core Application Requirements
- Use normalized database tables with clear relationships and foreign keys.
- Demonstrate multiple user roles with different permissions.
- Render all pages server-side.
- Organize the code with MVC-style separation of concerns.
- Protect routes with authentication and authorization middleware.
- Include a multi-stage workflow with status history.
- Support user-generated content tied to accounts.
- Include an admin dashboard for site management.
- Validate and sanitize all user input.
- Prevent SQL injection with parameterized queries.
- Deploy the finished app on Render with production environment variables.

## Scope Summary
- Public pages for browsing inventory and contacting the dealership.
- Logged-in customer features for reviews and service requests.
- Employee dashboard for inventory updates, moderation, and request handling.
- Owner dashboard for full administration and reporting.
- PostgreSQL schema with users, roles, vehicles, categories, vehicle images, reviews, service requests, contact messages, and workflow history.

## Data Model and Relationship Plan
1. Design multiple related tables instead of storing everything in one table.
   - Users
   - Roles or a role field on users, depending on final design
   - Categories
   - Vehicles
   - Vehicle images
   - Reviews
   - Service requests
   - Service request history or status log
   - Contact messages
2. Choose sensible data types for each column.
   - IDs as integers or UUIDs
   - Text fields for names and descriptions
   - Numeric fields for price, mileage, and ratings
   - Timestamps for created and updated dates
   - Boolean or enum-like values for availability and moderation flags
3. Define foreign keys and delete behavior.
   - Use CASCADE where child records should disappear with the parent
   - Use SET NULL where history or authored content should remain without the parent
   - Protect relationships that should not be deleted casually
4. Normalize the schema.
   - Keep repeated values in lookup or related tables
   - Avoid duplicate text blobs across tables
   - Store workflow state separately if status history is required
5. Document the relationship decisions.
   - Explain why each table exists
   - Explain how each foreign key supports the application workflow

## User Roles and Permissions
1. Admin or Owner
   - Full access to the system
   - Manage users and roles
   - Add, edit, and delete core content
   - Review operational data and user submissions
2. Secondary Role
   - Limited permissions for operational work
   - Moderate reviews or content
   - Update workflow statuses
   - Edit selected business data, but not global permissions
3. Standard User
   - Create an account and log in
   - Submit reviews, comments, or requests
   - View, edit, and delete their own submissions
   - View their own workflow history and account-related pages
4. Guest
   - Browse public content
   - Access login and registration pages
   - Submit only public-facing contact forms if allowed by the design

## Routing, Rendering, and Architecture Plan
- Render every page on the server with EJS or Liquid.js.
- Use layouts and partials for shared page structure.
- Use clean resource-based routes such as `/vehicle/:id` or `/service-requests/:id`.
- Add query parameters for sorting, filtering, or pagination where useful.
- Keep controllers, route handlers, views, and database access separated.
- Add middleware for authentication, authorization, validation, and error handling.
- Include one global error handler instead of handling every failure inline.
- Use try/catch only where the design intentionally returns controlled fallback results.
- Keep all imports and exports in ESM format.

## Security Plan
- Use express-session with secure session settings.
- Hash passwords before storing them.
- Validate required fields and data ranges on every form.
- Sanitize user input before saving or rendering it.
- Use parameterized SQL queries everywhere.
- Return friendly error messages without exposing system details.
- Restrict admin and employee pages with role-aware checks.

## Documentation and Submission Requirements
- Include a root README.md.
- Add a project description that explains what the site does and who it is for.
- Include an ERD image exported from pgAdmin that shows the database schema and relationships.
- Explain each user role and what it can do.
- Include test account usernames or emails for one account of each role.
- Do not include passwords in the README; use P@$$w0rd! for all test users.
- List any known limitations or unfinished features.
- Keep the repository organized and readable.
- Aim for at least 15 substantial commits.

## Week 1: Requirements, Setup, and Database Foundation
### Objectives
- Confirm the full feature list, role permissions, and submission requirements.
- Set up the Express app, PostgreSQL connection, and ESM project structure.
- Design the database before building pages.

### Specific Steps
1. Write out the final role matrix and route access rules.
   - Guest
   - Standard user
   - Secondary role
   - Owner
2. Choose the server-rendering stack and project conventions.
   - EJS or Liquid.js
   - ESM modules
   - MVC-style organization
   - Express session strategy
3. Design the PostgreSQL schema.
   - Users and roles
   - Categories
   - Vehicles
   - Vehicle images
   - Reviews
   - Service requests
   - Service request history
   - Contact messages
4. Define the field list for each table.
   - Include proper types, timestamps, and foreign keys
   - Decide where CASCADE or SET NULL should apply
5. Create seed data for early development.
   - Users for each role
   - Categories
   - Vehicles and images
   - A few sample reviews and requests
6. Establish authentication and authorization flow.
   - Register
   - Login
   - Logout
   - Protected routes by role
7. Verify the schema supports the required workflows.
   - One-to-many relationships
   - Account ownership checks
   - Status history tracking

### End-of-Week Deliverable
- Working project skeleton with the stack decided, database schema planned, and authentication foundation started.

## Week 2: Public Pages and Inventory Browsing
### Objectives
- Build the customer-facing pages first so the site feels real early.
- Make sure visitors can browse inventory without logging in.

### Specific Steps
1. Build the home page.
   - Show featured vehicles
   - Add a hero section and call-to-action buttons
   - Include category shortcuts
2. Build category browsing pages.
   - Show vehicles filtered by category
   - Add sorting or filtering with query parameters if time allows
   - Display availability clearly
3. Build vehicle detail pages.
   - Show multiple vehicle images
   - Display specs such as year, make, model, mileage, price, and description
   - Show category and availability status
   - Add a visible inquiry or contact action
4. Build the contact form.
   - Create the form UI
   - Validate required fields
   - Save submissions to the database
   - Show a confirmation message after submission
5. Add navigation and shared layout elements.
   - Header
   - Footer
   - Partials for repeated UI
6. Test the public experience using seeded data.
   - Open each category page
   - Open several vehicle detail pages
   - Submit a contact form and verify the record saves correctly

### End-of-Week Deliverable
- Visitors can browse inventory, view vehicle details, and send contact messages.

## Week 3: Customer Account Features
### Objectives
- Add the logged-in features that depend on user identity.
- Focus on reviews and service request workflows.

### Specific Steps
1. Build the review system.
   - Allow logged-in users to leave reviews on vehicles
   - Save rating and comment text
   - Prevent guests from posting reviews
2. Add review ownership rules.
   - Let users edit only their own reviews
   - Let users delete only their own reviews
   - Block access to other users’ review actions
3. Add review display on vehicle pages.
   - Show reviewer name and date
   - Show rating visually
   - Show moderation status if needed
4. Build the service request submission form.
   - Allow logged-in users to submit requests for a specific vehicle
   - Include service type options such as oil change and inspection
   - Include notes or problem description
   - Save the request to the database with initial status set to Submitted
5. Build service request history for customers.
   - Show each request submitted by the logged-in user
   - Display request date, vehicle, service type, and current status
   - Show status history or timeline entries if implemented
6. Add validation and error handling.
   - Required fields
   - Rating limits
   - Ownership checks
   - Friendly messages when something fails
7. Test the complete user flow.
   - Register or log in
   - Leave a review
   - Edit the review
   - Delete the review
   - Submit a service request
   - Confirm the request appears in history

### End-of-Week Deliverable
- Logged-in users can review vehicles and submit service requests with history tracking.

## Week 4: Secondary Role Dashboard
### Objectives
- Build the operational tools the secondary role needs to manage inventory and requests.
- Add moderation and status updates.

### Specific Steps
1. Create the secondary role dashboard layout.
   - Sidebar or navigation links
   - Summary cards for pending work
2. Add vehicle editing tools.
   - Edit price
   - Edit description
   - Update availability
   - Save changes back to the database
3. Add review moderation tools.
   - View all reviews
   - Flag or remove inappropriate reviews
   - Keep a record of moderation actions if possible
4. Add service request management.
   - View submitted requests
   - Open a request detail page
   - Update status through multiple stages
   - Add internal notes to the request
   - Record status history changes
5. Add contact message review.
   - Show all contact form submissions
   - Allow the team to review and track them
6. Protect all secondary-role routes.
   - Restrict dashboard access to authorized roles only
   - Make sure standard users cannot reach operational tools
7. Test operational workflows.
   - Update a vehicle price
   - Remove an inappropriate review
   - Move a service request through all statuses
   - Add a note and confirm it is saved

### End-of-Week Deliverable
- Authorized staff can manage vehicles, reviews, service requests, and contact messages.

## Week 5: Owner Dashboard and Administration
### Objectives
- Add full administrative tools for the owner role.
- Finish the highest-privilege functionality.

### Specific Steps
1. Create the owner dashboard layout.
   - Distinct admin navigation
   - Overview of system activity and counts
2. Add user and role management.
   - View all users
   - Change roles if supported
   - Limit access by role
3. Add category management.
   - Create categories
   - Edit categories
   - Delete categories safely
   - Prevent deleting categories still in use unless handled by the schema design
4. Add vehicle inventory management.
   - Create new vehicles
   - Edit all vehicle details
   - Delete vehicles from inventory
   - Manage related vehicle images
5. Add system visibility pages.
   - View all users
   - View all reviews
   - View all service requests
   - View contact messages
   - View operational summaries
6. Verify owner permissions.
   - Owner can do everything the secondary role can do
   - Owner can also manage categories, users, and inventory
   - Owner-only pages should not be accessible to lower roles
7. Test admin workflows end to end.
   - Add a category
   - Add a vehicle
   - Attach images
   - Remove a vehicle
   - Confirm records update correctly

### End-of-Week Deliverable
- Owner-level administration is complete and permissions are working correctly.

## Week 6: Testing, Deployment, and Final Delivery
### Objectives
- Stabilize the app, polish the UI, and prepare for submission or deployment.
- Finish the production deployment on Render and confirm the PostgreSQL connection works live.

### Specific Steps
1. Run a full feature test pass.
   - Public browsing
   - Login and role checks
   - Reviews
   - Service requests
   - Secondary-role tools
   - Owner tools
2. Fix validation and permission issues.
   - Missing required fields
   - Broken links
   - Unauthorized access attempts
   - Database errors
3. Improve usability and presentation.
   - Make buttons and forms consistent
   - Clean up spacing and layout
   - Ensure pages are readable on desktop and mobile
4. Check data integrity.
   - Confirm foreign key relationships work
   - Confirm vehicle images are tied to the correct vehicle
   - Confirm review and service histories display properly
5. Add or refine seed data.
   - Featured vehicles
   - Several categories
   - Sample reviews
   - Sample service requests
   - Sample contact messages if useful for demos
6. Write final documentation.
   - Short setup instructions
   - Login roles and demo accounts
   - Feature summary
   - Database overview
   - ERD image in README.md
7. Prepare the final deployment.
   - Confirm Render environment variables are set
   - Confirm the production database connection works
   - Confirm no development-only code runs in production
   - Walk through the live app
8. Prepare the final demo.
   - Show a customer action
   - Show a secondary-role action
   - Show an owner action

### End-of-Week Deliverable
- The project is polished, tested, documented, deployed, and ready to submit.

## Suggested Priority Order
1. Database design and authentication
2. Public pages and server-side rendering
3. Customer review and service features
4. Secondary-role dashboard
5. Owner dashboard and management
6. Testing, documentation, and deployment

## Success Criteria
- Public users can browse inventory and submit contact messages.
- Logged-in users can leave reviews, manage their own reviews, and submit service requests.
- The site uses PostgreSQL with normalized related tables and explicit foreign key behavior.
- Authentication uses express-session with hashed passwords and protected routes.
- All pages render server-side with EJS or Liquid.js and shared layouts or partials.
- Employees or moderators can manage vehicles, reviews, service requests, and contact submissions.
- Owners can manage the full system, including users, categories, and inventory.
- The application is deployed on Render with a connected PostgreSQL database.
- The root README.md includes the required description, roles, ERD image, test accounts, and known limitations.
- The repository shows organized structure, clean code, and at least 15 substantial commits.
- The application is ready at the end of six weeks.
