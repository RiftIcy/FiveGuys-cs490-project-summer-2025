---

## 🧑‍💻 Getting Started: Local Development Setup

Follow these steps to set up your local development environment for the project.

---

### **Step 1: Clone the Repository**

1. Open your terminal.

2. Clone the project repository using the GitHub URL provided by your instructor:

```bash
git clone https://github.com/your-instructor/repository-name.git
cd repository-name
```

---

### **Step 2: Install Dependencies**

Install all required Node packages:

```bash
npm install
```

---

### **Step 3: Set Up Firebase**

You’ll need to create your own Firebase project and configure Authentication.

Follow these steps:

1. Go to [https://console.firebase.google.com](https://console.firebase.google.com)

2. Create a new Firebase project (you can name it anything).

3. In the Firebase dashboard, click **\</> (Web)** to create a new web app.

4. Firebase will generate configuration values like `apiKey`, `authDomain`, etc.

5. Enable an **Authentication provider** (e.g., Email/Password) under **Build → Authentication → Sign-in method**.

---

### **Step 4: Create Your `.env.local` File**

Create a `.env.local` file in the root of the project and copy the following template:

```env
NEXT_PUBLIC_FIREBASE_API_KEY="your-api-key"
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="your-project-id.firebaseapp.com"
NEXT_PUBLIC_FIREBASE_PROJECT_ID="your-project-id"
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="your-project-id.appspot.com"
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="your-messaging-sender-id"
NEXT_PUBLIC_FIREBASE_APP_ID="your-app-id"
NEXT_PUBLIC_FIREBASE_CLIENT_EMAIL="firebase-adminsdk-xxx@your-project-id.iam.gserviceaccount.com"
NEXT_PUBLIC_FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY\n-----END PRIVATE KEY-----\n"

MONGO_URI="mongodb+srv://<USERNAME>:<PASSWORD>@<CLUSTER_URL>/<DATABASE_NAME>?retryWrites=true&w=majority&appName=<APP_NAME>"

OPENAI_API_KEY="your-openai-api-key-here"

FIREBASE_ADMINSDK_PATH=/absolute/path/to/your/<your-firebase-adminsdk-file>.json
```

> ⚠️ Be sure to replace each value with the actual config from your Firebase project. For the private key, escape each line break with `\n`.

---

### **Step 5: Run the Development Server**

Now that everything is configured, start the development server:

```bash
npm run dev
```

The app should be available at [http://localhost:3000](http://localhost:3000).
