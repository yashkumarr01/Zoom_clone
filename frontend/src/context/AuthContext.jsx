import { createContext, useContext, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import httpStatus from "http-status";

export const AuthContext = createContext({}); // ham ek global store bna rhe hai (stores data) and provider bad me pure app ko supply krega without props drilling

const client = axios.create({
  //ye axios ka ek instance bnaya .. taki hame bar bar full URL na likhna pade
  baseURL: "http://localhost:8000/api/v1/users", //  /register /login me baseURL fix kr diya
});

export const AuthProvider = ({ children }) => {
  // ye provider component bna ... jo pure app ko wrap krega isko App.js me use krte hai.

  const authContext = useContext(AuthContext); //current context value agar already exist ho to wo le lega (rare case nested provider).

  const [userData, setUserData] = useState(authContext); // ye react state bnaya jisme user data store hoga (global).

  const router = useNavigate(); //react-router ka hook hai isse tum programmatically navigate kar sakte ho jaise login successful ke baad: router("/home")

  const handleRegister = async (name, username, password) => {
    //register API call send karega /register route pe successful status agar 201 (CREATED) hai to message return krdega.error aaye to throw kr diya.
    try {
      let request = await client.post("/register", {
        name: name,
        username: username,
        password: password,
      });
      if (request.status === httpStatus.CREATED) {
        return request.data.message;
      }
    } catch (error) {
      throw error;
    }
  };

  const handleLogin = async (username, password) => {
    try {
      let request = await client.post("/login", {
        // API call send krega /login ko
        username: username,
        password: password,
      });

      if (request.status === httpStatus.OK) {
        // Agar status OK(200) aya to
        localStorage.setItem("token", request.data.token); //token ko localStorage(BROWSER) me save kar rahe ho browser ke andar permanently store ho jata hai refresh karne se bhi nahi jata
        router("/home");
      }
    } catch (error) {
      throw error;
    }
  };

  const getHistoryOfUser = async () => {
    try {
      let request = await client.get("/get_all_activity", {
        params: {
          token: localStorage.getItem("token"),
        },
      });
      return request.data;
    } catch (err) {
      throw err;
    }
  };

  const addToUserHistory = async (meetingCode) => {
    try {
      let request = await client.post("/add_to_activity", {
        token: localStorage.getItem("token"),
        meeting_code: meetingCode,
      });
      return request;
    } catch (err) {
      throw err;
    }
  };

  const data = {
    // data object bnaya
    // context ke through ye 3 cheeze sab components ko accessible hongi:
    userData,
    setUserData,
    handleRegister,
    handleLogin,
    getHistoryOfUser,
    addToUserHistory,
  };

  return <AuthContext.Provider value={data}>{children}</AuthContext.Provider>; // Provider ke andar jo value dete ho (data object) wo sare components me available ho jata hai jo AuthProvider ke inside hai
  // <AuthProvider> ke opening aur closing ke beech jo bhi component hoga… wo sab children ke naam se iss AuthProvider ke andar aa jayega.
};
