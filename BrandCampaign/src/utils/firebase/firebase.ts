import admin from "firebase-admin";
import path from "path";

// service account JSON ka path
const serviceAccount = require(path.join(__dirname, "../config.firebase.test.json"));

// initialize firebase
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

export default admin;
