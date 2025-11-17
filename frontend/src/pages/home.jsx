import React, { useContext, useState } from "react";
import withAuth from "../utils/withAuth";
import { useNavigate } from "react-router-dom";
import "../App.css";
import IconButton from "@mui/material/IconButton";
import RestoreIcon from "@mui/icons-material/Restore";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import { AuthContext } from "../context/AuthContext";

function HomeComponent() {
  let navigate = useNavigate();
  const [meetingCode, setMeetingCode] = useState("");

  const { addToUserHistory } = useContext(AuthContext);
  let handleJoinVideoCall = async () => {
    await addToUserHistory(meetingCode);
    navigate(`/${meetingCode}`);
  };
  return (
    <>
      <div className="navbar">
        <div style={{ display: "flex", alignItems: "center" }}>
          <h2>Orion Video Call</h2>
        </div>

        <div style={{ display: "flex", alignItems: "center" }}>
          <IconButton>
            <RestoreIcon />
          </IconButton>
          <p>History</p>
          <Button
            onClick={() => {
              localStorage.removeItem("token");
              navigate("/auth");
            }}
            variant="contained"
            sx={{ ml: 2 }}
          >
            Logout
          </Button>
        </div>
      </div>

      <div className="meetContainer">
        <div className="leftPannel">
          <div>
            <h2 className="heading">
              Providing Quality Video Call Just like Quality Education
            </h2>

            <div
              style={{
                display: "flex",
                gap: "10px",
                justifyContent: "center",
              }}
            >
              <TextField
                onChange={(e) => setMeetingCode(e.target.value)}
                id="outlined-basic"
                variant="outlined"
                label="Meeting Code"
                sx={{ width: "300px" }}
              ></TextField>
              <Button onClick={handleJoinVideoCall} variant="contained">
                Join
              </Button>
            </div>
          </div>
        </div>
        <div className="rightPannel">
          <img src="/logo3.png" alt="" />
        </div>
      </div>
    </>
  );
}

export default withAuth(HomeComponent);
