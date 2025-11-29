let IS_PROD = true;
const server = IS_PROD
  ? "https://zoom-clonebackend-r1r4.onrender.com"
  : "http://localhost:8000";

export default server;
