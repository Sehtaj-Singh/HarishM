//core module
const path = require(`path`);

//external module
const express = require(`express`);

//local modules
const rootDir = require("./utils/pathUtil");
const {adminRouter} = require("./routes/adminRouter");
const userRouter = require("./routes/userRouter");
// Static files serve (to access images in browser)


//express functions
const server = express();
server.use(express.urlencoded());
server.use(express.static(path.join(rootDir,`public`)));
server.use('/uploads', express.static('public/uploads'));
// const {mongoConnect} = require(`./utils/databaseUtil`);
const { default: mongoose } = require("mongoose");

//routers
server.use(userRouter);
server.use(adminRouter);

server.set(`view engine`, `ejs`);
server.set(`views`, `views`);



const PORT = 3000;


const DB_PATH = "mongodb+srv://hrmobile837:HRmobile123@hr-mobile.y8u6xm4.mongodb.net/HrMobile?retryWrites=true&w=majority&appName=HR-Mobile"

mongoose.connect(DB_PATH).then(() => {
  server.listen(PORT , () => {
    console.log(`Server is running at http://localhost:${PORT}`);
   });
}).catch(err => {
  console.log(`Error while connecting to mongo:` , err);
});