const admin = require("firebase-admin");
// const serviceAccount = require(process.env.GOOGLE_APPLICATION_CREDENTIALS);
const serviceAccount = require("./../rentalauthdemo-firebase-adminsdk-xl7fo-323f07ff43.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL:
    " https://rentalauthdemo-default-rtdb.asia-southeast1.firebasedatabase.app",
});

module.exports = admin;
