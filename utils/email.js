const nodemailer = require("nodemailer");
const htmlToText = require("html-to-text");
const pug = require("pug");
const AppError = require("./appError");

module.exports = class Email {
  constructor(user, url) {
    this.to = user.email;
    this.name = user.firstName;
    this.url = url;
    this.from = `RentalApp <${process.env.EMAIL_FROM}>`;
  }

  newTransport() {
    if (process.env.NODE_ENV == "production") {
      // SendGrid
      return nodemailer.createTransport({
        service: "SendGrid",
        auth: {
          user: process.env.SENDGRID_USERNAME,
          pass: process.env.SENDGRID_PASSWORD,
        },
      });
    }
    return nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT,
      auth: {
        user: process.env.EMAIL_USERNAME,
        pass: process.env.EMAIL_PASSWORD,
      },
    });
  }

  // Send the actual email
  async send(template, subject) {
    // 1) Render HTML
    const html = pug.renderFile(`${__dirname}/../views/email/${template}.pug`, {
      firstName: this.firstName,
      url: this.url,
      subject,
      //...other variables you want to pass to the template
    });

    // 2) Define email options
    const mailOptions = {
      from: `Rental App <${process.env.EMAIL_USERNAME}>`,
      to: this.to,
      subject,
      html,
      text: htmlToText.fromString(html), // convert HTML to plain text
    };

    // 3) create Transport and send Email
    await this.newTransport().sendMail(mailOptions);
  }

  async sendWelcome() {
    this.send("Welcome", "Welcome to the Rentals Family!");
  }
};

// module.exports = async (options) => {
//   // 1) Create a transporter
//   const transporter = nodemailer.createTransport({
//     // service: "Gmail",
//     // auth: {
//     //   user: process.env.EMAIL_USERNAME,
//     //   pass: process.env.EMAIL_PASSWORD,
//     // },
//     //Activate in gmail 'less secure app' option for gmail

//     host: process.env.EMAIL_HOST,
//     port: process.env.EMAIL_PORT,
//     auth: {
//       user: process.env.EMAIL_USERNAME,
//       pass: process.env.EMAIL_PASSWORD,
//     },
//   });

//   //define mail options
//   const mailOptions = {
//     from: `Rental App <${process.env.EMAIL_USERNAME}>`,
//     to: options.email,
//     subject: options.subject,
//     html: options.message,
//   };

//   // send mail
//   await transporter.sendMail(mailOptions);
// };

module.exports = async (options) => {
  // Create a transporter
  const transporter = nodemailer.createTransport({
    // // service: "gmail", // Use Gmail as the service
    // host: process.env.EMAIL_HOST,
    // port: process.env.EMAIL_PORT,
    // auth: {
    //   user: process.env.EMAIL_USERNAME, // Your Gmail address
    //   pass: process.env.EMAIL_PASSWORD, // Your Gmail password or App Password
    // },
    service: "gmail",
    auth: {
      user: "getsetbuild@gmail.com",
      pass: "lgdy nrpo tykf bbut",
    },
    tls: {
      rejectUnauthorized: false,
    },
  });

  // Verify connection configuration (can be removed in production)
  transporter.verify((error, success) => {
    if (error) {
      console.error("Email server connection error:", error);
    } else {
      console.log("Server is ready to take our messages:", success);
    }
  });

  // Define email options
  const mailOptions = {
    from: `Rental App <${process.env.EMAIL_FROM}>`,
    to: options.email,
    subject: options.subject,
    html: options.message,
  };

  // Send email with error logging
  try {
    await transporter.sendMail(mailOptions);
    console.log(`Email sent successfully to ${options.email}`);
  } catch (error) {
    console.error("Error sending email:", error.message);
    throw new AppError(
      "There was an error sending the email. Try again later.",
      500
    );
  }
};
