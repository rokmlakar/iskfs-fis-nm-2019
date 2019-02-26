var http = require("http");
var firmata = require("firmata");

var board = new firmata.Board("/dev/ttyACM0", function(){// ACM (Abstract Control Model)
                                                         // za serijsko komunikacijo z Arduinom (lahko je USB)
    console.log("Priklop na Arduino");
    board.pinMode(8, board.MODES.OUTPUT); // Posamezni pin konfiguriramo, da deluje kot vhod ali izhod
    board.pinMode(13, board.MODES.OUTPUT); // Posamezni pin konfiguriramo, da deluje kot vhod ali izhod
  
});
console.log("Zagon aplikacije");

http.createServer(function(req, res){ // http.createServer([requestListener])
                                      // "requestListener" je funkcija, ki se avtomatsko doda
                                      // k dogodku 'request'.
    var deli = req.url.split("/"), // razdelimo url glede na znak "/"
    operator = parseInt(deli[1],10); // 10 osnova številskega sistema, dacimalno (od 2 do 36)
        
    if (operator == 0) {
        console.log("Izključevanje LED1");
        board.digitalWrite(13, board.LOW);
    }
    if (operator == 1) {
        console.log("Vključevanje LED1");
        board.digitalWrite(13, board.HIGH);
    }
    
    if (operator == 2) {
        console.log("Izključevanje LED2");
        board.digitalWrite(8, board.LOW);
    }

    if (operator == 3) {
        console.log("Vključevanje LED2");
        board.digitalWrite(8, board.HIGH);
    }                
    res.writeHead(200, {"Content-Type": "text/html; charset=utf-8"});
    res.write("Za test vpišite v brskalnikovo vrstico z naslovom: http://192.168.1.205:8080/1 <br>");
    res.write("ali: http://192.168.1.205:8080/0<br>");
    res.end("Vrednost operatorja: " + operator);
}).listen(8080, "192.168.1.205");