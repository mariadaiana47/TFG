import User from "@/lib/models/User";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import dbConnection from "@/lib/dbConnection";


/*
  ADMIN ACCOUNT:
  email: admin@voluntariat.com
  password:admin123
----
  VOLUNTER ACC:
  email: mariadaiana1407@gmail.com
  password: Daiana123
----
*/

const JWT_SECRET = "super_secret_key";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res
      .status(405)
      .json({ success: false, message: "Method Not Allowed" });
  }

  const { email, password } = req.body;

  try {
    await dbConnection();

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({
        success: false,
        message: "User does not exist!",
        code: "USER_NOT_FOUND",
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Incorrect password!",
        code: "INCORRECT_PASSWORD",
      });
    }

    const token = jwt.sign(
      {
        id: user._id,
        email: user.email,
        nume: user.nume,
        prenume: user.prenume,
        role: user.role,
      },
      JWT_SECRET,
      { expiresIn: "1h" }
    );

    return res.status(200).json({
      success: true,
      message: "User logged in successfully!",
      token,
      user: {
        id: user._id,
        email: user.email,
        nume: user.nume,
        prenume: user.prenume,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Login Error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      code: "SERVER_ERROR",
      error: error.message,
    });
  }
}
