var http = require("http").createServer(handler); // "on req" - "handler"
var io = require("socket.io").listen(http); // socket knjižnica
var fs = require("fs"); // spremenljivka za "file system" za posredovanje html
var firmata = require("firmata");

console.log("Starting the code");

var board = new firmata.Board("/dev/ttyACM0", function(){
	    console.log("Priklop na Arduino");
	    console.log("Omogocimo Pin 0");
	    board.pinMode(0, board.MODES.ANALOG); // analogna nožica 0
	    console.log("Omogocimo Pin 1");
	    board.pinMode(1, board.MODES.ANALOG); // analogna nožica 1
});

function handler(req, res) {
	    fs.readFile(__dirname + "/Naloga04.html",
		        function (err, data) {
				        if (err) {
						            res.writeHead(500, {"Content-Type": "text/plain"});
						            return res.end("Napaka pri nalaganju strani.");
						        }
				    res.writeHead(200);
				    res.end(data);
				    })
}

var želenaVrednost = 0; // želena vrednost nastavljena s pot.
var dejanskaVrednost = 0; // dejanska vrednost nastavljena s pot.

http.listen(8080); // strežnik bo poslušal na vratih 8080

board.on("ready", function() {
	    
	    board.analogRead(0, function(value){
		            želenaVrednost = value; // zvezno branje analogne nožice 0
		        });
	    
	    board.analogRead(1, function(value){
		            dejanskaVrednost = value; // zvezno branje analogne nožice 1
		        });
	    
	    io.sockets.on("connection", function(socket) {
		            socket.emit("messageToClient", "Strežnik prikljucen, plošca pripravljena.");
		            setInterval(sendValues, 40, socket); // na 40ms pošljemo sporocilo klientu
		        }); // konec "sockets.on connection"

}); // konec "board.on(ready)""

function sendValues (socket) {
	    socket.emit("klientBeriVrednosti",
		        {
				    "želenaVrednost": želenaVrednost,
				    "dejanskaVrednost": dejanskaVrednost
				    });
				    
      if(želenaVrednost+20 >dejanskaVrednost)
			            {
					                board.digitalWrite(13, board.LOW)
					                board.digitalWrite(8, board.LOW)
					                board.digitalWrite(2, board.HIGH)
					            }
		            
 if(želenaVrednost-20 < dejanskaVrednost)
			            {
					                 board.digitalWrite(13, board.HIGH)
					                board.digitalWrite(8, board.LOW)
					                board.digitalWrite(2, board.LOW)
					            }
					            
  if(želenaVrednost-20 > dejanskaVrednost && želenaVrednost+20 <dejanskaVrednost )
			            {
					                board.digitalWrite(13, board.LOW)
					                board.digitalWrite(8, board.HIGH)
					                board.digitalWrite(2, board.LOW)
					            }
	
};