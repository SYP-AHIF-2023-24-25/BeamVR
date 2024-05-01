const fs = require("fs");
const path = require("path");
const jwt = require("jsonwebtoken");
const jwksClient = require('jwks-rsa');

let trustedUsers = [];

// create log file with starting date and time as filename in the logs folder
const logFileName = `logs/${new Date()
  .toISOString()
  .split("T")[0]
  .split("-")
  .reverse()
  .join("-")}_${new Date()
  .toISOString()
  .split("T")[1]
  .split(".")[0]
  .replace(/:/g, "-")}.log`;

const JWTsecret = "AkIRaaboJ23Q64jSjtN9gkmfMumUybD8";

// log absolute path of the log file
let absolutePathLogFile = path.join(__dirname, logFileName);
console.log(`Log file created at ${absolutePathLogFile}`);

function logToFile(message) {
  if (!fs.existsSync("logs")) {
    fs.mkdirSync("logs");
  }
  fs.appendFileSync(logFileName, getDateTime() + ": " + message + "\n");
}

// function to verify JWT token
function jwtVerify (token, getKey) {
  return new Promise((resolve, reject) => {
      jwt.verify(token, getKey, (err, decoded) => {
          if (err) {
              reject(err);
          } else {
              resolve(decoded);
          }
      });
  });
}

// function to get JWKs client
function getJwksClient(baseUrl, realm) {
  return jwksClient({
      jwksUri: `${baseUrl}/realms/${realm}/protocol/openid-connect/certs`
  });
}

// function to get signing key
function getKey(client, header, callback) {
  client.getSigningKey(header.kid, (err, key) => {
      const signingKey = key.publicKey || key.rsaPublicKey;
      callback(null, signingKey);
  });
}

// function to verify JWT token
function decodeJWT(req, res, next) {
  let token = req.headers["authorization"];
  if (!token) {
    return res.status(401).send("Access denied. No token provided.");
  }

  try {
    // Remove Bearer from string before decoding
    token = token.replace("Bearer ", "");
    // decode token and get userData
    const decoded = jwt.decode(token);
    return decoded;
  } catch (ex) {
    console.log(ex);
    return null;
  }
}

// function to get DateTime as dd.mm.yyyy hh:mm:ss
function getDateTime() {
  let currentdate = new Date();
  let day = String(currentdate.getDate()).padStart(2, "0");
  let month = String(currentdate.getMonth() + 1).padStart(2, "0");

  let datetime =
    day +
    "." +
    month +
    "." +
    currentdate.getFullYear() +
    " " +
    String(currentdate.getHours()).padStart(2, "0") +
    ":" +
    String(currentdate.getMinutes()).padStart(2, "0") +
    ":" +
    String(currentdate.getSeconds()).padStart(2, "0");
  return datetime;
}

function removeIPv6Prefix(ipAddress) {
  // Check if the input is an IPv4-mapped IPv6 address
  if (ipAddress.startsWith("::ffff:")) {
    // Remove the "::ffff:" prefix
    return ipAddress.slice(7);
  } else {
    // Return the original input if it's not in the expected format
    return ipAddress;
  }
}

// generate Unique Playername if none was sent
function generateUniquePlayerCode() {
  const uniqueDigits = new Set();

  while (uniqueDigits.size < 4) {
    const randomDigit = Math.floor(Math.random() * 10);
    uniqueDigits.add(randomDigit);
  }

  const uniqueCode = Array.from(uniqueDigits).join("");
  return `Player ${uniqueCode}`;
}

// Function to check if the file exists
async function checkFileExists(url) {
  try {
    const response = await axios.head(url);
    return response.status === 200;
  } catch (error) {
    return false;
  }
}

// Function to broadcast messages to all clients
function broadcastMessage(ws, message) {
  ws.clients.forEach(function each(client) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

// Function to load trusted users from trustedUsers.csv
function loadTrustedUsers() {
  const trustedUsersFile = fs.readFileSync("trustedUsers.csv", "utf8");
  const trustedUsersLines = trustedUsersFile.split("\n");

  let count = 0;
  for (const line of trustedUsersLines) {
    // check if empty line
    if (line.trim() === "") {
      continue;
    }
    trustedUsers.push(line);
    count++;
  }
  if(count > 0) {
  console.log("Loaded " + count + " trusted users from file!");
  logToFile("Loaded " + count + " trusted users from file!");
  }else{
    console.log("No trusted users found in file! Please define at least one trusted user in trustedUsers.csv");
    logToFile("No trusted users found in file! Please define at least one trusted user in trustedUsers.csv");
    console.log("Exiting...");
    logToFile("Exiting...");
    process.exit(1);
  }
}

loadTrustedUsers(); // Load trusted users on startup (will be used for admin access)

// Function to check if user is trusted
function isTrustedUser(studentID) {
  for (const user of trustedUsers) {
    if (user === studentID) {
      return true;
    }
  }
  return false;
}

function checkJWT(req, res) {
  if (!req.headers.authorization) {
    return res.status(401).json({ message: "No token provided" }); // check if Auth Bearer is set, if not return 401 - Unauthorized
  }

  const decodedData = decodeJWT(req, res); // decode JWT token

  if(!decodedData) {
    return res.status(401).json({ message: "Invalid token" }); // if not decodeable return 401 - Unauthorized
  }

  // check "exp" for expiration time
  if (decodedData.exp < Date.now() / 1000) {
    return res.status(401).json({ message: "Token expired" }); // if token expired return 401 - Unauthorized
  }

  const studentID = decodedData.preferred_username; // get studentID from JWT
  const name = decodedData.name; // get name of person from JWT

  // check if user is trusted
  const status = isTrustedUser(studentID) ? 200 : 401; // Check if user is trusted (admin)

  // add message to json depending on status
  if (status === 200) {
    res.status(status).json({name, status, message: "trusted" });
  } else {
    res.status(status).json({name, status, message: "not trusted" });
  }
}

module.exports = {
  logToFile,
  getDateTime,
  removeIPv6Prefix,
  generateUniquePlayerCode,
  checkFileExists,
  broadcastMessage,
  checkJWT,
};
