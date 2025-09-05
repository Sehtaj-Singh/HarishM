//core module
const path = require(`path`);
const express = require(`express`);
const cookieParser = require('cookie-parser');
const { default: mongoose } = require("mongoose");

// Load environment variables
const dotenv = require('dotenv');
const result = dotenv.config({ quiet: true });
if (result.error) {
  console.error('❌ Failed to load .env:', result.error);
  process.exit(1);
}
else{console.log(`.env file loaded`)
};

// env variables
const PORT = process.env.PORT;
const DB_PATH = process.env.DB_PATH;

//local modules
const {adminRegister} = require("./routes/adminRegister"); // temp
const rootDir = require("./utils/pathUtil");
const {adminRouter} = require("./routes/adminRouter");
const userRouter = require("./routes/userRouter");
const loginRouter = require("./routes/loginRouter");
const resendOtpRouter = require("./routes/resendOTP");



//express functions
const server = express();
server.use(express.urlencoded());
server.use(express.static(path.join(rootDir,`public`)));
server.use('/uploads', express.static('public/uploads'));
server.use(express.json()); //for jwt id
server.use(cookieParser()); // ✅ must come before routes for cookies



//routers
const { v4: uuidv4 } = require('uuid');
server.use((req, res, next) => {
  req.requestId = uuidv4();
  console.log(`[${new Date().toISOString()}] ID:${req.requestId} ${req.method} ${req.url}`);
  next();
});

server.use(adminRegister);// temp

server.use(loginRouter);
server.use(resendOtpRouter);
server.use(userRouter);
server.use(`/admin` , adminRouter);

server.set(`view engine`, `ejs`);
server.set(`views`, `views`);





mongoose.connect(DB_PATH).then(() => {
  server.listen(PORT , () => {
    console.log(`Server is running at http://localhost:${PORT}`);
   });
}).catch(err => {
  console.log(`Error while connecting to mongo:` , err);
});