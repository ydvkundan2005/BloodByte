BloodByte 🩸 - Emergency Donor Network
BloodByte is a real-time, location-aware single-page application (SPA) designed to bridge the gap between blood donors and recipients during emergencies. Built with vanilla web technologies and powered by Firebase, it features a glassmorphism UI, real-time geographic request filtering, and instant messaging.

🚀 Key Features
Real-Time Geolocation Tracking: Utilizes the HTML5 Geolocation API with continuous background watch (watchPosition) to keep user coordinates updated.

Proximity-Based Feed: Implements the Haversine formula to calculate the exact distance between the user and active blood requests, strictly filtering and displaying requests within a 20km radius.

Instant Messaging & Chat: Integrated 1-on-1 real-time chat between donors and requesters using Firebase Realtime Database.

Live Push Notifications: Browser-native push notifications alert users instantly when a relevant blood request is posted nearby or when a request is accepted.

Custom SPA Routing: Uses the native Browser History API (pushState and onpopstate) to manage views and sliding panels without page reloads, ensuring smooth mobile-like back-button navigation.

Glassmorphism UI: A highly responsive, mobile-first dark theme featuring backdrop blurs, CSS animations (scanning pulses, modal blasts), and customized alert modals that replace native browser prompts.

🛠 Tech Stack
Frontend

HTML5 / CSS3: Semantic markup with custom CSS variables, flexbox/grid layouts, and keyframe animations.

Vanilla JavaScript (ES6+): Modular JS utilizing async/await, DOM manipulation, and native web APIs.

Icons & Typography: FontAwesome 6, Plus Jakarta Sans, and Playfair Display.

Backend & BaaS (Firebase v9 Modular SDK)

Firebase Authentication: Secure Email/Password registration, login, and password reset workflows.

Cloud Firestore: Stores static user profiles, dynamic coordinates, and live blood requests via onSnapshot listeners for real-time feed updates.

Realtime Database (RTDB): Handles highly volatile data like chat messages, chat room indexing, and live notification triggers.

🧠 System Architecture & Deep Dive
1. The Haversine Distance Logic

To ensure users only see relevant emergencies, the app processes spatial data client-side. When Firestore emits a new request, the app runs the coordinates through a geographic distance calculator:

JavaScript
function getDist(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in km
    // ... Spherical law of cosines / Haversine implementation
    return distanceInKm;
}
Requests outside the 20km threshold are silently ignored, reducing UI clutter and focusing on actionable emergencies.

2. View & Panel State Management

Instead of a heavy framework like React or Vue, BloodByte uses a lightweight, custom DOM-toggling system coupled with the History API.

Views (landing-view, login-view): Represent base pages.

Panels (panel-req, panel-room): Slide up over the base view using CSS transform: translateY(). Pushing the panel ID to the History API allows users to swipe back or press the hardware back button to dismiss modals seamlessly.

3. Database Schema

Firestore/users/{uid}: { name, email, bloodGroup, dob, location: {lat, lng} }

Firestore/requests/{reqId}: { patient, bloodGroup, hospital, location: {lat, lng}, time }

RTDB/chats/{chat_id}: Stream of message objects uid_uid: { sid, txt }

RTDB/userChats/{uid}: Directory of open chat rooms for a specific user.

💻 Installation & Setup
Because BloodByte uses ES6 modules (<script type="module">), it must be served via a local web server to avoid CORS issues. It cannot be run by simply double-clicking the index.html file.

Clone the repository:

Bash
git clone https://github.com/yourusername/bloodbyte.git
cd bloodbyte
Serve the application:

If using VS Code, install the "Live Server" extension and click "Go Live".

Alternatively, use Python:

Bash
python -m http.server 8000
Or Node.js:

Bash
npx serve .
Open your browser: Navigate to http://localhost:8000.

Note on Firebase Configuration

The index.html file contains a Firebase configuration block. For production deployment, it is highly recommended to restrict your Firebase API keys to your specific production domain via the Google Cloud Console to prevent unauthorized quota usage.

📱 Usage Flow
Onboarding: Create an account providing your Blood Group and Date of Birth (must be 18+).

Dashboard: Grant location and notification permissions. The app will begin pulsating to scan your coordinates.

Broadcasting a Request: Click the + Request button in the dock, fill out the patient and hospital details, set the specific location for the emergency, and broadcast.

Accepting & Chatting: Nearby donors receive a push notification. They can tap the request, view the distance and benefits, and hit "I Accept", which instantly opens a real-time chat room with the requester.

Developed by Kundan Prasad Yadav
