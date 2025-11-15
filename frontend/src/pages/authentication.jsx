// import React from "react";

// export default function authentication() {
//   return <div>Authentication</div>;
// }

//yaha React + Material UI ke UI components import ho rahe hain

//Material UI ek UI library hai jo ready components deti hai
import * as React from "react";
import Avatar from "@mui/material/Avatar";
import Button from "@mui/material/Button";
import CssBaseline from "@mui/material/CssBaseline";
import TextField from "@mui/material/TextField";
import FormControlLabel from "@mui/material/FormControlLabel";
import Checkbox from "@mui/material/Checkbox";
import Link from "@mui/material/Link";
import Paper from "@mui/material/Paper";
import Box from "@mui/material/Box";
import Grid from "@mui/material/Grid";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import Typography from "@mui/material/Typography";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import { AuthContext } from "../context/AuthContext"; //AuthContext import kiya jisse login/register ke functions milenge
import Snackbar from "@mui/material/Snackbar";

const defaultTheme = createTheme(); // Material UI ka default theme banaya taaki pura component me same styling rules apply ho.

// ye ek React component hai jisko hum pages me render karenge.
export default function Authentication() {
  // ye sab front end me input ke values aur message store karne ke liye states hain:
  // formState => 0 means Sign In , 1 means Sign Up mode
  // open => snackbar open/close
  // message/error => register ka response show karne ke liye

  const [username, setUsername] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [name, setName] = React.useState("");
  const [error, setError] = React.useState();
  const [message, setMessage] = React.useState();

  const [formState, setFormState] = React.useState(1);

  const [open, setOpen] = React.useState(0);

  const handleClose = () => {
    setOpen(false);
  };

  const { handleRegister, handleLogin } = React.useContext(AuthContext); //AuthContext se backend functions access kiye (jo tumne provider me bheje the)
  let handleAuth = async () => {
    try {
      if (formState === 0) {
        let result = await handleLogin(username, password);
        console.log(result);
      }
      //  agar formState = 1 => SIGN UP wale mode me hai to handleRegister call kar diya
      if (formState === 1) {
        let result = await handleRegister(name, username, password);
        console.log(result);
        setUsername("");
        setMessage(result); // jo response aaye message me store kar diya taaki snackbar me show ho sake
        setOpen(true); // openState ko true kr rhe hai taki snackbar show ho ske
        setError("");
        setFormState(0);
        setName("");
        setPassword("");
      }
    } catch (err) {
      const message =
        err?.response?.data?.message || err?.message || "Something went wrong";
      setError(message);
    }
  };
  return (
    <ThemeProvider theme={defaultTheme}>
      <Grid
        container
        component="main"
        sx={{
          height: "100vh",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "#f5f5f5",
        }}
      >
        <CssBaseline />
        <Grid item xs={12} sm={8} md={5} component={Paper} elevation={6} square>
          <Box
            sx={{
              my: 8,
              mx: 4,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              padding: 4,
            }}
          >
            <Avatar sx={{ m: 1, bgcolor: "secondary.main" }}>
              <LockOutlinedIcon />
            </Avatar>

            <div>
              <Button
                variant={formState === 0 ? "contained" : ""}
                onClick={() => {
                  // click karne pe formState change ho jata hai
                  setFormState(0);
                }}
              >
                Sign In
              </Button>
              <Button
                variant={formState === 1 ? "contained" : ""}
                // click karne pe formState change ho jata hai
                onClick={() => {
                  setFormState(1);
                }}
              >
                Sign Up
              </Button>
              {/* UI accordingly sign up ka extra name input field show karta hai */}
            </div>

            <Box component="form" noValidate sx={{ mt: 1, width: "100%" }}>
              {/* condition — sirf Sign Up pe Full Name show karega */}
              {formState === 1 ? (
                <TextField
                  margin="normal"
                  required
                  fullWidth
                  id="fullname"
                  label="Full Name"
                  name="Fullname"
                  value={name}
                  autoFocus
                  onChange={(e) => setName(e.target.value)}
                />
              ) : (
                <></>
              )}
              <TextField
                margin="normal"
                required
                fullWidth
                id="username"
                label="Username"
                name="Username"
                value={username}
                autoFocus
                onChange={(e) => setUsername(e.target.value)}
              />
              <TextField
                margin="normal"
                required
                fullWidth
                name="password"
                label="Password"
                type="password"
                value={password}
                id="password"
                onChange={(e) => setPassword(e.target.value)} // change hone pr password State ki value change hogi
              />
              <p style={{ color: "red" }}>{error}</p>{" "}
              {/*Agar error state me ki error hua to show ho jayega */}
              <Button
                type="button"
                fullWidth
                variant="contained"
                sx={{ mt: 3, mb: 2 }}
                onClick={handleAuth}
              >
                {/* Agar formState 0 hai to button text "Login" and if 1 then "Register" */}
                {formState === 0 ? "Login" : "Register"}
              </Button>
            </Box>
          </Box>
        </Grid>
      </Grid>

      <Snackbar
        open={open}
        autoHideDuration={4000}
        onClose={handleClose}
        message={message}
      />
    </ThemeProvider>
  );
}
