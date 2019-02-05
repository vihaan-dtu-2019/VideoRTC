var PORT = 3000; //Set port for the app

fs = require("fs-extra");
var Serberries = require('serberries');
var express = require('express');
const path = require('path');
const http = require('http');
// const bodyParser = require('body-parser');
const {isRealString} = require('./server/utils/validation')
const {Users} = require('./server/utils/users');

var formidable = require('formidable'); //form upload processing
var s_whiteboard = require("./s_whiteboard.js");

var app = express();
app.use(express.static(__dirname + '/public'));
var server = require('http').Server(app);
var users = new Users();
server.listen(PORT);
var io = require('socket.io')(server);
var SocketIO = require('socket.io');

var myserver = new Serberries({
    path:__dirname+'/logic'
});


myserver.on('error', function(errcode, msg, trace){
    console.error("Error code: "+errcode+' ('+msg+')');
    if(trace){
        console.error(trace.message);
        for (var i = 0; i < trace.stack.length; i++) {
            console.error("   at "+trace.stack[i]);
        }
    }
    console.error("");
});

myserver.on('loaded', function(urlpath, type){
    console.log('URL to '+urlpath+' was '+type);
});

myserver.on('navigation', function(data){
    console.log("Navigation to '"+data.path+"'");
    console.log('  - '+data.headers['user-agent']);
});



const { generateMessage ,generateLocationMessage} = require('./server/utils/message')

console.log("Webserver & socketserver running on port:" + PORT);

app.get('/loadwhiteboard', function (req, res) {
    var wid = req["query"]["wid"];
    var ret = s_whiteboard.loadStoredData(wid);
    res.send(ret);
    res.end();
});

app.post('/upload', function (req, res) { //File upload
    var form = new formidable.IncomingForm(); //Receive form
    var formData = {
        files: {},
        fields: {}
    }

    form.on('file', function (name, file) {
        formData["files"][file.name] = file;
    });

    form.on('field', function (name, value) {
        formData["fields"][name] = value;
    });

    form.on('error', function (err) {
        console.log('File uplaod Error!');
        console.log(err);
    });

    form.on('end', function () {
        progressUploadFormData(formData);
        res.send("done");
        //End file upload
    });
    form.parse(req);
});

function progressUploadFormData(formData) {
    console.log("Progress new Form Data");
    var fields = formData.fields;
    var files = formData.files;
    var whiteboardId = fields["whiteboardId"];

    var name = fields["name"] || "";
    var date = fields["date"] || (+new Date());
    var filename = whiteboardId + "_" + date + ".png";

    fs.ensureDir("./public/uploads", function (err) {
        var imagedata = fields["imagedata"];
        if (imagedata && imagedata != "") { //Save from base64
            imagedata = imagedata.replace(/^data:image\/png;base64,/, "").replace(/^data:image\/jpeg;base64,/, "");
            console.log(filename, "uploaded");
            fs.writeFile('./public/uploads/' + filename, imagedata, 'base64', function (err) {
                if (err) {
                    console.log("error", err);
                }
            });
        }
    });
}

// io = SocketIO({
//     perMessageDeflate: false // Disable compression
//   }).listen(myserver.server);

var allUsers = {};
io.on('connection', function (socket) {
    socket.on('join', (params,callback) => {
        if(!isRealString(params.name) || !isRealString(params.room)){
         return callback('Name and room name are required ');
        }

        socket.on('bufferHeader', function(packet){
            // Buffer header can be saved on server so it can be passed to new user
            bufferHeader = packet;
            socket.broadcast.emit('bufferHeader', packet);
            console.log('working')
        });
    
        // Broadcast the received buffer
        socket.on('stream', function(packet){
            socket.broadcast.emit('stream', packet);
        });
    
        // Send buffer header to new user
        socket.on('requestBufferHeader', function(){
            socket.emit('bufferHeader', bufferHeader);
        });
        //joining particular room
        socket.join(params.room);
        users.removeUser(socket.id);
          users.addUser(socket.id, params.name, params.room);
        //io.emit -> io.to(room name here)
        //socket.broadcast -> socket.broadcast.to(room name).emit
        io.to(params.room).emit('updateUserList', users.getUserList(params.room));
        socket.emit('newMessage',generateMessage('Admin', 'welcome to chat room'));
      socket.broadcast.to(params.room).emit('newMessage', generateMessage( 'Admin', `${params.name} has joined`));
        callback();
      });
      socket.on('createMessage', (message, callback) => {
        var user = users.getUser(socket.id);
      
        if (user && isRealString(message.text)) {
          io.to(user.room).emit('newMessage', generateMessage(user.name, message.text));
        }
      
        callback();
      });
      
       // ### io emits the event to all the user including the one who sends it  ###
       socket.on('createLocationMessage', (coords) => {
        var user = users.getUser(socket.id);
      
          if (user) {
            io.to(user.room).emit('newLocationMessage', generateLocationMessage(user.name, coords.latitude, coords.longitude));  
          }
        });
      
    socket.on('disconnect', function () {
        var user = users.removeUser(socket.id);

        if (user) {
          io.to(user.room).emit('updateUserList', users.getUserList(user.room));
          io.to(user.room).emit('newMessage', generateMessage('Admin', `${user.name} has left.`));
        }
        delete allUsers[socket.id];
        socket.broadcast.emit('refreshUserBadges', null);
    });

    socket.on('drawToWhiteboard', function (content) {
        content = escapeAllContentStrings(content);
        sendToAllUsersOfWhiteboard(content["wid"], socket.id, content)
        s_whiteboard.handleEventsAndData(content); //save whiteboardchanges on the server
    });

    socket.on('joinWhiteboard', function (wid) {
        allUsers[socket.id] = {
            "socket": socket,
            "wid": wid
        };
    });
});

function sendToAllUsersOfWhiteboard(wid, ownSocketId, content) {
    for (var i in allUsers) {
        if (allUsers[i]["wid"] === wid && allUsers[i]["socket"].id !== ownSocketId) {
            allUsers[i]["socket"].emit('drawToWhiteboard', content);
        }
    }
}

//Prevent cross site scripting
function escapeAllContentStrings(content, cnt) {
    if (!cnt)
        cnt = 0;

    if (typeof (content) == "string") {
        return content.replace(/<\/?[^>]+(>|$)/g, "");
    }
    for (var i in content) {
        if (typeof (content[i]) == "string") {
            content[i] = content[i].replace(/<\/?[^>]+(>|$)/g, "");
        } if (typeof (content[i]) == "object" && cnt < 10) {
            content[i] = escapeAllContentStrings(content[i], ++cnt);
        }
    }
    return content;
}