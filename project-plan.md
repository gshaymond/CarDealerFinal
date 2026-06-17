# Used Car Dealership Project Plan

## Goal
Build a used car dealership website in six weeks with public browsing, authenticated customer actions, employee moderation tools, and owner-level administration.

## Scope Summary
- Public pages for browsing inventory and contacting the dealership.
- Logged-in user features for reviews and service requests.
- Employee dashboard for inventory updates, review moderation, and service request handling.
- Owner dashboard for full administration and reporting.
- Relational database design with users, vehicles, categories, reviews, service requests, contact messages, and vehicle images.

## Week 1: Requirements, Setup, and Database Foundation
### Objectives
- Confirm the full feature list and role permissions.
- Set up the application structure, database connection, and authentication approach.
- Design the database tables and relationships before building pages.

### Specific Steps
1. Write out the user roles and what each role can do.
   - Guest
   - Logged-in customer
   - Employee
   - Owner
2. Sketch the page list and navigation.
   - Home
   - Browse vehicles by category
   - Vehicle detail page
   - Contact form
   - Login/register
   - Customer dashboard pages
   - Employee dashboard pages
   - Owner dashboard pages
3. Create the database schema.
   - Users table with role field
   - Categories table
   - Vehicles table linked to categories
   - Vehicle images table linked to vehicles
   - Reviews table linked to users and vehicles
   - Service requests table linked to users and vehicles
   - Contact messages table
4. Decide which fields each table needs.
   - Users: name, email, password hash, role, timestamps
   - Categories: name, description, timestamps
   - Vehicles: title, year, make, model, mileage, price, description, availability, category_id, timestamps
   - Vehicle images: vehicle_id, image_url, alt_text, sort_order
   - Reviews: user_id, vehicle_id, rating, comment, moderation status, timestamps
   - Service requests: user_id, vehicle_id, service type, notes, status, employee notes, timestamps
   - Contact messages: name, email, phone, subject, message, timestamps
5. Set up seed data for categories, vehicles, and images so the app has content early.
6. Build authentication and role-based access control.
7. Verify the database can support one-to-many and many-to-one relationships cleanly.

### End-of-Week Deliverable
- Working project skeleton with authentication started and database structure ready.

## Week 2: Public Pages and Inventory Browsing
### Objectives
- Build the customer-facing pages first so the site feels real early.
- Make sure visitors can browse inventory without logging in.

### Specific Steps
1. Build the home page.
   - Show featured vehicles
   - Add a simple hero section and call-to-action buttons
   - Include category shortcuts for Trucks, Vans, Cars, and SUVs
2. Build category browsing pages.
   - Show vehicles filtered by category
   - Add sorting or filtering if time allows
   - Display availability clearly
3. Build vehicle detail pages.
   - Show multiple vehicle images
   - Display specs such as year, make, model, mileage, price, and description
   - Show category and availability status
   - Add a visible contact or inquiry action
4. Build the contact form.
   - Create the form UI
   - Validate required fields
   - Save submissions to the database
   - Show a confirmation message after submission
5. Add navigation and shared layout elements.
   - Header
   - Footer
   - Consistent buttons and card styles
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
   - Show any employee notes that are appropriate for customers to see
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

## Week 4: Employee Dashboard
### Objectives
- Build the operational tools employees need to manage inventory and requests.
- Add moderation and status updates.

### Specific Steps
1. Create the employee dashboard layout.
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
   - Update status from Submitted to In Progress to Completed
   - Add internal notes to the request
5. Add contact message review.
   - Show all contact form submissions
   - Allow employees to review and track them
6. Protect all employee routes.
   - Restrict dashboard access to employee and owner roles only
   - Make sure customers cannot reach employee tools
7. Test employee workflows.
   - Update a vehicle price
   - Remove an inappropriate review
   - Move a service request through all statuses
   - Add a note and confirm it is saved

### End-of-Week Deliverable
- Employees can manage vehicles, reviews, service requests, and contact messages.

## Week 5: Owner Dashboard and Administration
### Objectives
- Add full administrative tools for the owner role.
- Finish the highest-privilege functionality.

### Specific Steps
1. Create the owner dashboard layout.
   - Distinct admin navigation
   - Overview of system activity and counts
2. Add category management.
   - Create categories
   - Edit categories
   - Delete categories safely
   - Prevent deleting categories still in use unless handled by your design
3. Add vehicle inventory management.
   - Create new vehicles
   - Edit all vehicle details
   - Delete vehicles from inventory
   - Manage related vehicle images
4. Add optional employee account management.
   - Create employee accounts if time allows
   - Edit roles if supported
   - Deactivate accounts if needed
   - If time is tight, keep employee accounts hardcoded as allowed by the requirement
5. Add system visibility pages.
   - View all users
   - View all reviews
   - View all service requests
   - View contact messages
   - View basic activity or audit records if implemented
6. Verify owner permissions.
   - Owner can do everything employees can do
   - Owner can also manage categories and inventory
   - Owner-only pages should not be accessible to employees
7. Test admin workflows end to end.
   - Add a category
   - Add a vehicle
   - Attach images
   - Remove a vehicle
   - Confirm records update correctly

### End-of-Week Deliverable
- Owner-level administration is complete and permissions are working correctly.

## Week 6: Testing, Cleanup, and Final Delivery
### Objectives
- Stabilize the app, polish the UI, and prepare for submission or deployment.

### Specific Steps
1. Run a full feature test pass.
   - Public browsing
   - Login and role checks
   - Reviews
   - Service requests
   - Employee tools
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
   - Login roles and demo accounts if needed
   - Feature summary
   - Database overview
7. Prepare the final demo.
   - Walk through the public site
   - Show a customer action
   - Show an employee action
   - Show an owner action

### End-of-Week Deliverable
- The project is polished, tested, documented, and ready to submit.

## Suggested Priority Order
1. Database and authentication
2. Public pages
3. Customer review and service features
4. Employee dashboard
5. Owner dashboard
6. Testing and cleanup

## Success Criteria
- Public users can browse inventory and submit contact messages.
- Logged-in users can leave reviews, manage their own reviews, and submit service requests.
- Employees can manage vehicles, reviews, service requests, and contact submissions.
- Owners can manage the full system, including categories and inventory.
- All major database relationships work correctly.
- The application is ready at the end of six weeks.
