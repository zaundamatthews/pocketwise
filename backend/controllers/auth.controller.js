const bcrypt = require("bcrypt");
const User = require("../models/User");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { sendResetPasswordEmail } = require("../services/email.service");

async function registerUser(req, res) {
  try {
    const { fullName, email, password } = req.body;

    if (!fullName || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }
    const normalizedEmail = email.toLowerCase().trim();

    const existingUser = await User.findOne({
      email: normalizedEmail,
    });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "User already exists",
      });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      fullName,
      email: normalizedEmail,
      password: hashedPassword,
    });
    return res.status(201).json({
      success: true,
      message: "User registered successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}
async function loginUser(req, res) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }
    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({
      email: normalizedEmail,
    });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
        user: {
          id: user._id,
          fullName: user.fullName,
          email: user.email,
        },
      });
    }

    const passwordMatches = await bcrypt.compare(password, user.password);
    if (!passwordMatches) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }
    const token = jwt.sign(
      {
        userId: user._id,
        email: user.email,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: process.env.JWT_EXPIRES_IN || "2d",
      },
    );
    return res.status(200).json({
      success: true,
      message: "Login successful",
      token: token,
      user:{
        id: user._id,
        fullName: user.fullName,
        email: user.email
      }

    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}

async function forgotPassword(req, res) {
  let user;
  let resetLink = "";
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }
    const normalizedEmail = email.toLowerCase().trim();

    user = await User.findOne({
      email: normalizedEmail,
    });
    if (!user) {
      return res.status(200).json({
        success: true,
        message:
          "If a user with that email exists, a password reset link has been sent",
      });
    }
    const resetToken = crypto.randomBytes(32).toString("hex");
    //   hash the token before saving it to the database
    const hashedToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");

    user.passwordResetToken = hashedToken;
    user.passwordResetExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
    await user.save();
    // for test purposes

    resetLink = `${process.env.FRONTEND_URL}/components/reset-password.html?token=${resetToken}`;

    await sendResetPasswordEmail(user.email, resetLink);

    return res.status(200).json({
      success: true,
      message:
        "If a user with that email exists, a password reset link has been sent",
    });
  } catch (error) {
    console.error("Forgot password error:", error.message);

    if (user) {
      user.passwordResetToken = undefined;
      user.passwordResetExpires = undefined;
      await user.save();
    }
    return res.status(500).json({
      success: false,
      message: "Unable to process password reset request. please try again",
    });
  }
}
async function resetPassword(req, res) {
  try {
    const token = req.params.token || req.body.token;
    const { password, confirmPassword } = req.body;
    if (!password || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "Both fields are missing",
      });
    }
    if (password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "Passwords do not match!",
      });
    }
    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Password must contain at least 8 characters",
      });
    }

    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() },
    });
    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Reset token is invalid or it has expired",
      });
    }
    user.password = await bcrypt.hash(password, 10);
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;

    await user.save();

    console.log(`Received raw token: ${token}`);
    console.log(`Hashed token: ${hashedToken}`);
    console.log(`Current time: ${new Date()}`);

    return res.status(200).json({
      success: true,
      message: "Password reset successfully",
    });
  } catch (error) {
    console.error("Error reseting password:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to reset password",
    });
  }
}
// was meant for test purposes to see if the protectRoutes middleware is working correctly
async function getProfile(req, res) {
  return res.status(200).json({
    success: true,
    user: req.user,
  });
}
module.exports = {
  registerUser,
  loginUser,
  getProfile,
  forgotPassword,
  resetPassword,
};
