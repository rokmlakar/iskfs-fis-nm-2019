var http = require("http").createServer(handler); // "on req" - "handler"
var io = require("socket.io").listen(http); // socket knji�nica
var fs = require("fs"); // spremenljivka za "file system" za posredovanje html
var firmata = require("firmata");

var gori=0;

var board = new firmata.Board("/dev/ttyACM0", function(){
    console.log("Priklop na Arduino");
    console.log("Omogocimo Pin 0");
    board.pinMode(2, board.MODES.ANALOG); // analogna no�ica 0
    board.pinMode(7, board.MODES.OUTPUT);
});

function handler(req, res) {
    fs.readFile(__dirname + "/naloga8.html",
    function (err, data) {
        if (err) {
            res.writeHead(500, {"Content-Type": "text/plain"});
            return res.end("Napaka pri nalaganju strani.");
        }
    res.writeHead(200);
    res.end(data);
    })
}

var �elenaVrednost = 0; 

http.listen(8080); 

board.on("ready", function() {
    
    board.analogRead(2, function(value){
        �elenaVrednost = value; // zvezno branje analogne no�ice 0
    });
    
    io.sockets.on("connection", function(socket) {
        socket.emit("messageToClient", "Stre�nik prikljucen, plo�ca pripravljena.");
        setInterval(sendValues, 40, socket); // na 40ms po�ljemo sporocilo klientu
        socket.on("ukazArduinu", function(�tUkaza) {
        if (�tUkaza == "1") {
            board.digitalWrite(7, board.HIGH); // zapi�emo +5V na p. 13
            //io.sockets.emit("po�ljiStaticnoSporocilo", "LED GORI");
            gori=1;
        }
        if (�tUkaza == "0") {
            board.digitalWrite(7, board.LOW); // zapi�emo 0V na pin13
            //io.sockets.emit("po�ljiStaticnoSporocilo", "LED NE GORI");
            gori=0;
        }
        
    });
        
        
        
    }); // konec "sockets.on connection"

}); // konec "board.on(ready)""

function sendValues (socket) {
    socket.emit("klientBeriVrednosti",
    {
    "�elenaVrednost": �elenaVrednost
    });
    if(�elenaVrednost > 980 && gori == 1) {
        io.sockets.emit("po�ljiStaticnoSporocilo", "LED gori");
    }
    if(�elenaVrednost <= 980 && gori == 1) {
        io.sockets.emit("po�ljiStaticnoSporocilo", "NAPAKA , LED ne gori");
    }
    if(�elenaVrednost <= 980 && gori == 0) {
        io.sockets.emit("po�ljiStaticnoSporocilo", "LED ne gori");
    }
    if(�elenaVrednost > 980 && gori == 0) {
        io.sockets.emit("po�ljiStaticnoSporocilo", "NAPAKA , LED gori");
    }
    
    
};