import httpStatus from "http-status";
import { User } from "../models/user.model.js";
import bcrypt, { hash } from "bcrypt";
import crypto from "crypto";

const login = async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ message: "Please provide" });
  }

  try {
    const user = await User.findOne({ username });
    if (!user) {
      // agar user nhi mila
      return res
        .status(httpStatus.NOT_FOUND)
        .json({ message: "User not found" });
    }
    let isPasswordCorrect = await bcrypt.compare(password, user.password);
    if (isPasswordCorrect) {
      // password compare kr raha hai jo  user ne diya form se
      let token = crypto.randomBytes(20).toString("hex"); // tokken generate kr raha hai

      user.token = token; // database me new field (token) add ki
      await user.save(); // user me update kiya
      return res.status(httpStatus.OK).json({ token: token }); // agar user hai to status OK(200) or token res me return krega
    } else {
      return res
        .status(httpStatus.UNAUTHORIZED)
        .json({ message: "Invalid username or password" });
    }
  } catch (e) {
    return res.status(500).json({ message: `Something went wrong ${e}` }); // return error
  }
};

const register = async (req, res) => {
  const { name, username, password } = req.body; // data access kr raha hai req.body se

  try {
    const existingUser = await User.findOne({ username }); // data base me check kr raha ki kya use exist krta hai
    if (existingUser) {
      // aga han to chlega
      return res
        .status(httpStatus.FOUND)
        .json({ message: "User already exists" });
    }
    const hashedPassword = await bcrypt.hash(password, 10); // password hash form me convert kiya

    const newUser = new User({
      name: name,
      username: username,
      password: hashedPassword,
    });

    await newUser.save(); // new user ko data base me store kiya

    res.status(httpStatus.CREATED).json({ message: "User Registered" }); // if new user registered
  } catch (e) {
    res.json({ message: `Somthing went wrong ${e}` }); // agar kuch error aya
  }
};

export { login, register };
