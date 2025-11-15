import React, { useEffect } from "react";
import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import { io } from "socket.io-client";
import styles from "../styles/videoComponent.module.css";
import IconButton from "@mui/material/IconButton";
import VideocamIcon from "@mui/icons-material/Videocam";
import VideocamOffIcon from "@mui/icons-material/VideocamOff";
import CallEndIcon from "@mui/icons-material/CallEnd";
import MicIcon from "@mui/icons-material/Mic";
import MicOff from "@mui/icons-material/MicOff";
import ScreenShareIcon from "@mui/icons-material/ScreenShare";
import StopScreenShareIcon from "@mui/icons-material/StopScreenShare";
import Badge from "@mui/material/Badge";
import ChatIcon from "@mui/icons-material/Chat";

const server_url = "http://localhost:8000";

var connections = {};

const peerConfigConnections = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};

export default function VideoMeetComponent() {
  var socketRef = useRef(); // isme ham socket.io client instance store krenge (Becouse ye re-render pe reset nhi hota)
  let socketIdRef = useRef();

  let localVideoref = useRef();

  let [videoAvailable, setVideoAvailable] = useState(true);

  let [audioAvailable, setAudioAvailable] = useState(true);

  let [video, setVideo] = useState();

  let [audio, setAudio] = useState();

  let [screen, setScreen] = useState();

  let [showModal, setModal] = useState(true);

  let [screenAvailable, setScreenAvailable] = useState();

  let [messages, setMessages] = useState([]);

  let [message, setMessage] = useState("");

  let [newMessages, setNewMessages] = useState(3);

  let [askForUsername, setAskForUsername] = useState(true);

  let [username, setUsername] = useState("");

  const videoRef = useRef([]);

  let [videos, setVideos] = useState([]);

  let routeTo = useNavigate();

  //   if(isChrome()===false){

  //   }

  const getPermissions = async () => {
    try {
      //user se video ki permission mang rhe hain
      const videoPermission = await navigator.mediaDevices.getUserMedia({
        // navigator ek built in js object hota hai jo hme browser ki info deta hai
        video: true,
      });
      // agar stream object return hua to videoAvailable ko true set kiya
      if (videoPermission) {
        setVideoAvailable(true);
      } else {
        // nahi to false
        setVideoAvailable(false);
      }

      //user se audio ki permission mang rhe hain
      const audioPermission = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });
      // agar stream object return hua to audioAvailable ko true set kiya
      if (audioPermission) {
        setAudioAvailable(true);
      } else {
        setAudioAvailable(false);
      }

      if (navigator.mediaDevices.getDisplayMedia) {
        setScreenAvailable(true);
      } else {
        setScreenAvailable(false);
      }

      if (videoAvailable || audioAvailable) {
        // ye hame ek pointer return krega jo stream object ko point krega or vo userMediaStream me store hoga
        const userMediaStream = await navigator.mediaDevices.getUserMedia({
          // browser se video or audio access mang rahe hai
          video: videoAvailable,
          audio: audioAvailable,
        });
        //  agar userMediaStrem me pointer hai to
        if (userMediaStream) {
          // stream ko window object(localStrem =>custom variable) me store kiya taki kisi bhi function me bina pass kiye access kr ske
          window.localStream = userMediaStream; // jo camera + mic ka stream object mil raha hai use global window me store kar raha hai
          if (localVideoref.current) {
            localVideoref.current.srcObject = userMediaStream; //ye react me jo <video> tag hai uska reference (useRef() se mila) usko hum set kar rahe hain aur us video tag ka srcObject me live media stream daal rahe hain
          }
        }
      }
    } catch (err) {
      console.log(err);
    }
  };

  useEffect(() => {
    getPermissions();
  }, []);

  let getUserMediaSuccess = (stream) => {
    // stream jo hme browser se mila promiss resolve hone ke bad
    try {
      window.localStream.getTracks().forEach((track) => track.stop()); // agar pichle track hain to unhe stop kr rhe hain
    } catch (e) {
      console.log(e);
    }

    window.localStream = stream; // window.localStream me ab naya camera + mic stream store kar diya.
    // localVideoref.current ek <video> element ka reference hai jo apne browser me local video dikhata hai.
    localVideoref.current.srcObject = stream; //srcObject = stream ka matlab, live camera output video element me show ho jayega.

    for (let id in connections) {
      // connections pe loop lgaya
      if (id === socketIdRef.current) continue; // agar id khud ki hai to skip hme khud ko offer nhi bhejna

      connections[id].addStream(window.localStream); // us peerConnection me hmari localStream add kr rhe hain

      // WebRTC se offer bna rhe hai -(yeh ek SDP object hai) jo btata hai mere pass ye track hain app inhe recive kro
      connections[id].createOffer().then((description) => {
        // createOffer() promise return krta hai (resolve hone pe descriptio dega)
        connections[id]
          .setLocalDescription(description) // offer ko apne peerConnection ki local description set kr rhe hain (matlab mne apne end pe offer fix krr liya)
          .then(() => {
            // server ko mes bhej rhe hain taki us peer(id) tak ye offer pahunche
            socketRef.current.emit(
              "signal",
              id,
              JSON.stringify({ sdp: connections[id].localDescription }) // server pe pahunchne ke bad gotMessageFromServer chalega (id) ke page pe
            );
          })
          .catch((e) => console.log(e)); // agar koi error aya to catch kar lo
      });
    }
    // setting event listner on stream for future
    stream.getTracks().forEach(
      // browser ko bol rhe hai agar future me ye track band ho jaye to mujhe ye function run kar dena
      (track) =>
        (track.onended = () => {
          setVideo(false); // setting video state false
          setAudio(false); // setting audio state false

          try {
            let tracks = localVideoref.current.srcObject.getTracks();
            tracks.forEach((track) => track.stop()); // purani stream ko puri tarah stop kr rhe hai user ki
          } catch (e) {
            console.log(e);
          }

          //TODO BlackSilence

          let blackSilence = (silence = (...args) =>
            // ek nai MediaStream bnate hai jisme do tracks honge
            new MediaStream([black(...args), silence()])); // black(...args) → black video track (dummy video)  silence() → silent audio track (dummy mic)
          window.localStream = blackSilence(); // blackSilence() function call karke dummy stream ko window.localStream me store krr deta hai
          localVideoref.current.srcObject = window.localStream; // video tag me di stream

          for (let id in connections) {
            connections[id].addStream(window.localStream); // har connection peer ko local stream bheja
            connections[id].createOffer().then((description) => {
              // har peer ke liye offer bnaya
              connections[id].setLocalDescription(description).then(() => {
                socketRef.current.emit(
                  "signal",
                  JSON.stringify({ sdp: connections[id].localDescription })
                );
              });
            });
          }
        })
    );
  };

  // silent audio bnayega
  let silence = () => {
    let ctx = new AudioContext(); // AudioContext ek api hai jo audio bnane or process krne deta hai
    let oscillator = ctx.createOscillator(); // ye avaj bnata hai(default 440 Hz)

    let dst = oscillator.connect(ctx.createMediaStreamDestination()); // ctx.createMediaStreamDestination()  ek aisa object deta hai jisme haam audio nodes jod skte hai or vo unhe ek media stream me badal deta hai
    //ab hmare bass ek stream hai jo bajne ke liye tayar hai
    oscillator.start(); // start kiya oscillator ko
    ctx.resume(); // kuch browswer like chrome me AudioContext ko start krne ke liye resume() jaruri hota hai
    return Object.assign(dst.stream.getAudioTracks()[0], { enabled: false }); // dst.stream.getAudioTracks()[0] hme audio track deta hai us media stream se jo hamne bnaya tha
    // Object.assign(..., { enabled: false }) se ham track disable kiya (audio track technically mojud hai pr mute silent hai)
  };

  // black video bnayega
  let black = ({ width = 640, height = 480 } = {}) => {
    let canvas = Object.assign(document.createElement("canvas"), {
      // <canvas> element bnaya
      width,
      height,
    }); // ek khali drawing board aa gya
    canvas.getContext("2d").fillRect(0, 0, width, height); // ek rectangle bnaya (w or h set ki) by default black color
    let stream = canvas.captureStream(); // canvas.captureStream() canvas ko ek live video stream me badal deta hai

    return Object.assign(stream.getVideoTracks()[0], { enabled: false }); // track liya or fir use assign false kiya
    // video track technically mojud hai prr active nhi hai
  };

  let getUserMedia = () => {
    // Check ho raha hai ki video ya audio dono me se koi available hai aur user ne permission de di hai.
    if ((video && videoAvailable) || (audio && audioAvailable)) {
      navigator.mediaDevices
        .getUserMedia({ video: video, audio: audio }) // browser se stream le rhe hain dono me se ( video ya audio) me se jo bhi available ho
        .then(getUserMediaSuccess) // stream milne pe getUserMediaSuccess function run hua
        .then((stream) => {})
        .catch((e) => console.log(e));
    } else {
      try {
        let tracks = localVideoref.current.srcObject.getTracks();
        tracks.forEach((track) => track.stop());
      } catch {}
    }
  };

  useEffect(() => {
    if (video !== undefined && audio !== undefined) {
      // agar video or audio state undefine nhi hai to chlega
      getUserMedia();
    }
  }, [audio, video]);

  let gotMessageFromServer = (fromId, message) => {
    var signal = JSON.parse(message); // server se jo ICE ya SDP string ho kar aayi thi, usko normal JS object banao

    // agar message khud ka nahi tha, dusre user ne bheja hai, tab hi process karo
    if (fromId !== socketIdRef.current) {
      if (signal.sdp) {
        // check kar rahe ho kya message ke andar SDP info hai?
        connections[fromId]
          // Remote Description -> dusre peer ne kya offer/answer bheja
          .setRemoteDescription(new RTCSessionDescription(signal.sdp)) // setRemoteDescription(bolta hai ye jo remote ne bheja hai use accept kar lo) => dusre  peer ka SDP hum apne peerConnection me "remote" description ke form me set kar rahe hain
          // RTCSessionDescription ek JS WebRTC built-in class hai but WebRTC pe use karne ke liye usko proper WebRTC session object format me convert karna padta hai. RTCSessionDescription constructor exactly wahi karta hai.
          .then(() => {
            // remote description set ho gayi, ab next step karo
            if (signal.sdp.type === "offer") {
              // remote peer ne hame offer bheja tha to humko answer generate karna padega.
              // ek peer Offer bhejta dusra peer Answer return karta ye WebRTC ka standard handshake hai.
              connections[fromId]
                .createAnswer() // createAnswer() WebRTC ke andar built-in function hai jo ek SDP answer generate karta ha aur return me ye Promise deta hai jiske andar "description" object hota hai.
                .then((description) => {
                  connections[fromId]
                    // setLocalDescription(){peerConnection ka fn}=>iske through hum apne peer object ko batate hain ki humne apna SDP (offer/answer) fix kar liya ro isko peerConnection memory me store kar leta hai.
                    // localDescription pehle A ke liye or fir B ke liye dobara ye change nhi hota (to infinite loop nhi hai ye)
                    .setLocalDescription(description) // description basically ek SDP answer jo ham local me set kar rhe hain.
                    .then(() => {
                      socketRef.current.emit(
                        "signal",
                        fromId,
                        JSON.stringify({
                          sdp: connections[fromId].localDescription,
                        })
                      );
                    })
                    .catch((e) => console.log(e)); // error ayi to catch kro
                })
                .catch((e) => console.log(e)); // error ayi to catch kro
            }
          })
          .catch((e) => console.log(e)); // error ayi to catch kro
      }

      if (signal.ice) {
        connections[fromId]
          .addIceCandidate(new RTCIceCandidate(signal.ice))
          .catch((e) => console.log(e));
      }
    }
  };

  //Todo
  let addMessage = (data, sender, socketIdSender) => {
    setMessages((prevMessages) => {
      return [...prevMessages, { sender: sender, data: data }];
    });

    if (socketIdSender !== socketIdRef.current) {
      setNewMessages((prevMessages) => prevMessages + 1);
    }
  };

  let connectToSocketServer = () => {
    //ye socket.io client ko backend (http://localhost:8000) se connect kr raha hai
    socketRef.current = io.connect(server_url, { secure: false }); //hum socketRef ke andar actual socket-client object store kar diye.

    socketRef.current.on("signal", gotMessageFromServer); //server jab "signal" naam ka event emit karega tab gotMessageFromServer function run hoga. Ye WebRTC signalling messages handle krne ke liye.

    //ye event tab fire hota hai jab connection successfully server se create ho jaye.

    socketRef.current.on("connect", () => {
      // (window.location.href) ye current browser ki exact full URL return karta hai
      socketRef.current.emit("join-call", window.location.href); // matlab server ko bataya ja raha hai ki “ye user ab is call/room me join kr rha hai”.

      socketIdRef.current = socketRef.current.id; // current user ka socket id save kar liya future use ke liye

      socketRef.current.on("chat-message", addMessage);

      socketRef.current.on("user-left", (id) => {
        // agar server bole koi user room se nikal gaya to us user ka video remove kar do.
        setVideos((videos) => videos.filter((video) => video.socketId !== id));
        delete connections[id];
      });

      // jab server batata hai ek new user join hua, to sari existing clients ki list milti hai unke liye peerConnection create kar ke connections object me store kar diya jata hai.
      socketRef.current.on("user-joined", (id, clients) => {
        clients.forEach((socketListId) => {
          // har existing user ke liye ek new RTCPeerConnection ban raha hai taaki new user direct unke sath video/audio share kar sake
          connections[socketListId] = new RTCPeerConnection(
            peerConfigConnections
          );

          // onicecandidate ek function(event handled) hai RTCPeerConnection ka jo tab trigger hota hai jab browser ek new network (ice candidate=>2 divices ko connect krne ka possible network path) find krta hai
          connections[socketListId].onicecandidate = (event) => {
            if (event.candidate !== null) {
              // jab browser koi ice candidate(Network path) dhundta hai yeh event ayega
              socketRef.current.emit(
                // ham us candidate(Network path) ko server ke jariye target peer(socketListId) ko bhej rahe hain taki dono peers network path nagotiate krr ske
                "signal",
                socketListId, // us ki id jis se current user connection bnana chah raha hai
                JSON.stringify({ ice: event.candidate }) // ice server ko string form me bhej rahe hain
              );
            }
          };
          //jab ek user se actual video/audio stream aa jati hai peer ke through to ye event trigger hota hai.
          connections[socketListId].onaddstream = (event) => {
            setVideos((videos) => {
              // Pehle check karo — already hai kya?
              const alreadyExists = videos.some(
                (v) => v.socketId === socketListId
              );

              if (alreadyExists) {
                // Agar hai, to sirf stream update karo
                const updatedVideos = videos.map((v) =>
                  v.socketId === socketListId
                    ? { ...v, stream: event.stream }
                    : v
                );
                videoRef.current = updatedVideos;
                return updatedVideos;
              }

              // Agar nahi hai, to add karo
              const newVideo = {
                socketId: socketListId,
                stream: event.stream,
                autoPlay: true,
                playsinline: true,
              };

              const updatedVideos = [...videos, newVideo];
              videoRef.current = updatedVideos;
              return updatedVideos;
            });
          };

          // jab koi user connect hua hai, hum apna local camera stream usko bhi bhej dete hain
          if (window.localStream !== undefined && window.localStream !== null) {
            // agar user ke pass camera stream ready hai
            // to wo real video stream add kardo peerConnection me
            connections[socketListId].addStream(window.localStream);
          } else {
            // agar user ke pass camera OFF hai / permissions deny / etc to ek fake stream (black video + silent audio) bna ke add kardo taki WebRTC connection connect ho sake
            let blackSilence = (silence = (...args) =>
              new MediaStream([black(...args), silence()]));
            window.localStream = blackSilence();
            connections[socketListId].addStream(window.localStream);
          }
        });

        if (id === socketIdRef.current) {
          for (let id2 in connections) {
            if (id2 === socketIdRef.current) continue;

            try {
              connections[id2].addStream(window.localStream);
            } catch (e) {
              // manually WebRTC Offer create kar rahe hain, fir apna SDP peer ko bhej rahe hain
              connections[id2].createOffer().then((description) => {
                connections[id2]
                  .setLocalDescription(description) // jo offer humne banaya vo hum apne peer connection ke andar store kar de rahe hain as LocalDescription
                  .then(() => {
                    socketRef.current.emit(
                      "signal",
                      id2,
                      JSON.stringify({ sdp: connections[id2].localDescription }) // JSON.stringify({sdp: ...}) matlab offer ko string bana kar send kar rahe hain kyunki socket binary object direct nahi bhejta
                    );
                  })
                  .catch((e) => console.log(e));
              });
            }
          }
        }
      });
    });
  };

  let getMedia = () => {
    setVideo(videoAvailable); // video state change ki
    setAudio(audioAvailable); // video state change ki
    // ab in state change ke bad dependencies vala useEffect fire hoga
    connectToSocketServer();
  };

  let connect = () => {
    setAskForUsername(false);
    getMedia();
  };

  let handleVideo = () => {
    setVideo(!video);
  };

  let handleAudio = () => {
    setAudio(!audio);
  };

  let getDisplayMediaSuccess = (stream) => {
    try {
      window.localStream.getTracks().forEach((track) => track.stop()); // camera/mic stream band kr diya
    } catch (e) {
      console.log(e);
    }

    window.localStream = stream; // nai stream ko window.localStream me store kiya(global access ke liye)
    localVideoref.current.srcObject = stream; // or yahan video element me dikha rhe hain

    for (let id in connections) {
      if (id === socketIdRef.current) continue;

      // connections[id].onaddstream(window.localStream);
      connections[id].createOffer().then((description) => {
        // har connection ke liye offer bnaya ja raha hai
        connections[id]
          .setLocalDescription(description)
          .then(() => {
            socketRef.current.emit(
              "signal",
              id,
              JSON.stringify({ sdp: connections[id].localDescription })
            );
          })
          .catch((e) => console.log(e));
      });
    }

    // future me screen share band hone pr ye hoga
    stream.getTracks().forEach(
      // browser ko bol rhe hai agar future me ye track band ho jaye to mujhe ye function run kar dena
      (track) =>
        (track.onended = () => {
          setScreen(false);

          try {
            let tracks = localVideoref.current.srcObject.getTracks();
            tracks.forEach((track) => track.stop()); // purani stream ko puri tarah stop kr rhe hai user ki
          } catch (e) {
            console.log(e);
          }

          //TODO BlackSilence

          let blackSilence = (silence = (...args) =>
            // ek nai MediaStream bnate hai jisme do tracks honge
            new MediaStream([black(...args), silence()])); // black(...args) → black video track (dummy video)  silence() → silent audio track (dummy mic)
          window.localStream = blackSilence(); // blackSilence() function call karke dummy stream ko window.localStream me store krr deta hai
          localVideoref.current.srcObject = window.localStream; // video tag me di stream

          getUserMedia();
        })
    );
  };

  let getDisplayMedia = () => {
    if (screen) {
      // navigator.mediaDevices.getDisplayMedia() ye browser ka built in function hai jo user se screen share permission magnta hai
      if (navigator.mediaDevices.getDisplayMedia) {
        // browser puchega “Which screen or tab you want to share?”
        navigator.mediaDevices
          .getDisplayMedia({ video: true, audio: true }) // agar user ne allow kr diya to screen ka audio + video stream return krega
          .then(getDisplayMediaSuccess) // ye stream getDisplayMediaSuccess ko bhej dega
          .then((stream) => {})
          .catch((e) => console.log(e));
      }
    }
  };
  useEffect(() => {
    if (screen !== undefined) {
      getDisplayMedia();
    }
  }, [screen]);

  let handleScreeen = async () => {
    if (screen) {
      // अभी screen share चल रहा है — हम उसे बंद कर रहे हैं
      try {
        // stop all tracks of current localStream (this stops screen sharing)
        window.localStream.getTracks().forEach((track) => track.stop());
      } catch (e) {
        console.log("Error stopping screen tracks:", e);
      }

      // set state to false (UI update)
      setScreen(false);

      // अब camera + mic वापस माँगो और getUserMediaSuccess के जरिए peers को notify करो
      // सुनिश्चित करो कि video/audio states पहले से ठीक set हों (videoAvailable/audioAvailable)
      try {
        const cameraStream = await navigator.mediaDevices.getUserMedia({
          video: videoAvailable ? true : false,
          audio: audioAvailable ? true : false,
        });
        // reuse existing success handler to attach stream and create offers
        getUserMediaSuccess(cameraStream);
      } catch (e) {
        console.log("Error restoring camera stream:", e);
      }
    } else {
      // अगर अभी screen share बंद है, तो शुरू करो
      setScreen(true);
      // useEffect के द्वारा getDisplayMedia() ही call होगा जब screen true हो जाएगा
    }
  };

  let sendMessage = () => {
    socketRef.current.emit("chat-message", message, username);
    setMessage("");
  };

  let handleEndCall = () => {
    try {
      let tracks = localVideoref.current.srcObject.getTracks();
      tracks.forEach((track) => track.stop());
    } catch (e) {} 

    routeTo("/home"); 
  };

  return (
    <div>
      {askForUsername == true ? (
        <div>
          <h2>Enter into Lobby</h2>
          <TextField
            id="outlined-basic"
            label="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            variant="outlined"
          />
          <Button variant="contained" onClick={connect}>
            Connect
          </Button>
          <div>
            <video ref={localVideoref} autoPlay muted></video>
          </div>
        </div>
      ) : (
        <div className={styles.meetVideoContainer}>
          {showModal ? (
            <div className={styles.chatRoom}>
              <div className={styles.chatContainer}>
                <h1>Chat</h1>

                <div className={styles.chatingDisplay}>
                  {console.log("TYPE OF messages:", typeof messages, messages)}
                  {messages.length !== 0 ? (
                    messages.map((item, index) => {
                      console.log(messages);
                      return (
                        <div style={{ marginBottom: "20px" }} key={index}>
                          <p style={{ fontWeight: "bold" }}>{item.sender}</p>
                          <p>{item.data}</p>
                        </div>
                      );
                    })
                  ) : (
                    <p>No Messages Yet</p>
                  )}
                </div>
                <div className={styles.chattingArea}>
                  <TextField
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    id="standard-basic"
                    label="Enter your message"
                    variant="standard"
                  />
                  <Button variant="contained" onClick={sendMessage}>
                    Send
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <></>
          )}

          <div className={styles.buttonContainer}>
            <IconButton onClick={handleVideo} style={{ color: "white" }}>
              {video === true ? <VideocamIcon /> : <VideocamOffIcon />}
            </IconButton>
            <IconButton onClick={handleEndCall} style={{ color: "red" }}>
              <CallEndIcon />
            </IconButton>
            <IconButton onClick={handleAudio} style={{ color: "white" }}>
              {audio === true ? <MicIcon /> : <MicOff />}
            </IconButton>
            {screenAvailable == true ? (
              <IconButton onClick={handleScreeen} style={{ color: "white" }}>
                {screen == true ? <ScreenShareIcon /> : <StopScreenShareIcon />}
              </IconButton>
            ) : (
              <></>
            )}

            <Badge badgeContent={newMessages} max={999} color="secondary">
              <IconButton
                onClick={() => setModal(!showModal)}
                style={{ color: "white" }}
              >
                <ChatIcon />
              </IconButton>
            </Badge>
          </div>
          <video
            className={styles.meetUserVideo}
            ref={localVideoref}
            autoPlay
            muted
          ></video>
          <div className={styles.conferenceView}>
            {videos.map((video) => (
              <div key={video.socketId}>
                <video
                  data-socket={video.socketId}
                  ref={(ref) => {
                    if (ref && video.stream) {
                      ref.srcObject = video.stream;
                    }
                  }}
                  autoPlay
                ></video>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
