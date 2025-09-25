# 🚌 SmartBus - Full Stack Transportation App

A comprehensive bus transportation management system built with React Native for mobile app and Node.js/Express for the backend API.

## 📱 Features

### **Mobile App (React Native)**
- 🔐 **User Authentication** - Login/Signup with JWT tokens
- 🗺️ **Interactive Maps** - Real-time bus tracking with Google Maps
- 🚌 **Bus Search** - Find buses by source and destination
- 📍 **Live Location** - Real-time bus location tracking
- ⏰ **Route Timeline** - Detailed stop-by-stop journey timeline
- 🔔 **Push Notifications** - Real-time updates and alerts
- 💬 **Chat Support** - In-app chatbot assistance
- 📝 **Report Issues** - Report bus delays, issues, or feedback
- 👤 **User Profile** - Manage account settings and preferences

### **Backend API (Node.js/Express)**
- 🛡️ **Secure Authentication** - JWT-based authentication system
- 🚌 **Bus Management** - CRUD operations for buses and routes
- 📊 **Real-time Data** - Socket.IO for live updates
- 📧 **Notification System** - Priority-based notifications
- 🗄️ **MySQL Database** - Robust data storage with proper relations
- 📱 **REST API** - 34+ endpoints for comprehensive functionality
- 🔒 **Security** - Input validation, SQL injection prevention
- 📈 **Scalable Architecture** - Modular design for easy maintenance

## 🛠️ Tech Stack

### **Frontend (Mobile App)**
- **React Native** 0.81.4
- **React** 19.1.0
- **React Navigation** 7.x
- **React Native Maps** - Google Maps integration
- **Socket.IO Client** - Real-time communication
- **Axios** - HTTP client
- **React Native Vector Icons** - Icon library
- **AsyncStorage** - Local data storage

### **Backend (Server)**
- **Node.js** with **Express.js** 5.x
- **MySQL2** - MySQL database driver
- **Socket.IO** - Real-time communication
- **JWT** - Authentication tokens
- **bcryptjs** - Password hashing
- **Zod** - Input validation
- **Multer** - File upload handling
- **CORS** - Cross-origin resource sharing

### **Database**
- **MySQL** - Primary database
- **Aiven Cloud MySQL** - Cloud database hosting

## 📋 Prerequisites

Before you begin, ensure you have the following installed:
- **Node.js** (v18 or higher)
- **npm** or **yarn**
- **React Native CLI** or **Expo CLI**
- **Android Studio** (for Android development)
- **Xcode** (for iOS development - macOS only)
- **MySQL** (local or cloud instance)

## 🚀 Installation & Setup

### **1. Clone the Repository**
```bash
git clone https://github.com/yourusername/smartbus-fullstack.git
cd smartbus-fullstack
```

### **2. Backend Setup**
```bash
# Navigate to server directory
cd Server

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env file with your database credentials

# Start the server
npm run dev
```

### **3. Frontend Setup**
```bash
# Navigate to app directory
cd App

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env file with your API keys and server URL

# For iOS (macOS only)
cd ios && pod install && cd ..

# Start Metro bundler
npm start

# Run on Android
npm run android

# Run on iOS (macOS only)
npm run ios
```

## ⚙️ Configuration

### **Environment Variables**

#### **Backend (.env)**
```env
PORT=3001
DB_HOST=your_database_host
DB_PORT=3306
DB_USER=your_database_user
DB_PASSWORD=your_database_password
DB_NAME=your_database_name
JWT_SECRET=your_jwt_secret_key
```

#### **Frontend (.env)**
```env
GOOGLE_MAPS_API_KEY=your_google_maps_api_key
GOOGLE_PLACES_API_KEY=your_google_places_api_key
API_BASE_URL=http://your_server_ip:3001/
```

### **Google Maps Setup**
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable Maps SDK for Android/iOS and Places API
4. Create API credentials
5. Add the API keys to your `.env` file

## 📊 Database Schema

The app uses a MySQL database with the following main tables:
- `users` - User authentication and profiles
- `buses` - Bus information and status
- `routes` - Route definitions and stops
- `notifications` - User notifications with priority levels
- `reports` - User-submitted reports and feedback
- `location_updates` - Real-time bus location data

## 📡 API Endpoints

The backend provides 34+ REST API endpoints:

### **Authentication**
- `POST /api/auth/signup` - User registration
- `POST /api/auth/login` - User login

### **Buses**
- `GET /api/buses` - Get all buses
- `GET /api/buses/search` - Search buses by route
- `GET /api/buses/:id/details` - Get bus details
- `GET /api/buses/:id/route-stops` - Get route timeline

### **Notifications**
- `GET /api/notifications` - Get user notifications
- `POST /api/notifications` - Create notification
- `PATCH /api/notifications/:id/read` - Mark as read

### **Routes & More**
- `GET /api/routes` - Get all routes
- `GET /api/routes/bus/:id/timeline` - Get bus timeline
- `POST /api/reports` - Submit report
- And many more...

Full API documentation is available in `SmartBus_API_Endpoints.txt`

## 🔄 Real-time Features

The app uses **Socket.IO** for real-time features:
- **Live bus tracking** - Bus locations update every 20 seconds
- **Push notifications** - Instant notifications for users
- **Route updates** - Real-time route and schedule changes

## 📱 Mobile App Structure

```
App/
├── src/
│   ├── Components/          # Reusable UI components
│   │   ├── Buses/          # Bus-related components
│   │   ├── Map/            # Map components
│   │   └── Notifications/  # Notification components
│   ├── Screens/            # App screens
│   │   ├── Home/           # Home and search
│   │   ├── Login_Signup/   # Authentication
│   │   ├── Notifications/  # Notifications screen
│   │   └── Profile/        # User profile
│   ├── Navigation/         # React Navigation setup
│   ├── api/               # API client configuration
│   └── Utils/             # Utility functions
├── android/               # Android-specific code
├── ios/                   # iOS-specific code
└── package.json
```

## 🖥️ Server Structure

```
Server/
├── src/
│   ├── controllers/       # Request handlers
│   ├── routes/           # API route definitions
│   ├── middleware/       # Custom middleware
│   ├── config/           # Database configuration
│   └── validation/       # Input validation schemas
├── index.js              # Server entry point
└── package.json
```

## 🚀 Deployment

### **Backend Deployment**
The backend can be deployed to:
- **Heroku** - Easy deployment with Git
- **DigitalOcean** - VPS hosting
- **AWS EC2** - Scalable cloud hosting
- **Railway** - Modern deployment platform

### **Mobile App Deployment**
- **Android**: Build APK/AAB and publish to Google Play Store
- **iOS**: Build IPA and publish to App Store Connect

### **Database**
- **Aiven** - Managed MySQL hosting (currently used)
- **PlanetScale** - Serverless MySQL platform
- **AWS RDS** - Amazon managed database
- **DigitalOcean Databases** - Managed database hosting

## 🧪 Testing

```bash
# Backend tests
cd Server
npm test

# Frontend tests
cd App
npm test
```

## 📝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👨‍💻 Author

**Aman Kumar**
- GitHub: [@yourusername](https://github.com/yourusername)
- Email: your.email@example.com

## 🆘 Support

If you encounter any issues or have questions:
1. Check the [Issues](https://github.com/yourusername/smartbus-fullstack/issues) page
2. Create a new issue with detailed description
3. Join our [Discord community](link-to-discord) for real-time help

## 🙏 Acknowledgments

- React Native community for excellent documentation
- Google Maps Platform for mapping services
- Aiven for reliable database hosting
- Open source contributors and libraries used in this project

---

⭐ **Star this repository if you found it helpful!**