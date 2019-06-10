var http = require("http").createServer(handler); // ob zahtevi req -> handler
var firmata = require("firmata");
var fs = require("fs"); // knji�njica za delo z datotekami (File System fs)
var io = require("socket.io").listen(http); // knji�. za komunik. prek socket-a 

console.log("Priklop Arduina");

var board = new firmata.Board("/dev/ttyACM0", function(){
    console.log("Aktiviramo analogni pin 0");
    board.pinMode(0, board.MODES.ANALOG);
    console.log("Aktiviramo analogni pin 1");
    board.pinMode(1, board.MODES.ANALOG);
    console.log("Aktiviramo pin 2");
    board.pinMode(2, board.MODES.OUTPUT); // pin za smer na H-mostu
    console.log("Aktiviramo pin 3");
    board.pinMode(3, board.MODES.PWM); // Pulse Width Modulation - hitrost
    console.log("Aktiviramo pin 8");
    board.pinMode(8, board.MODES.INPUT); // pin za HW gumb
});

function handler(req, res) {
    fs.readFile(__dirname + "/naloga12.html",
    function(err, data) {
        if (err) {
            res.writeHead(500, {"Content-Type": "text/plain"});
            return res.end("Napaka pri nalaganju html strani!");
        }
        res.writeHead(200);
        res.end(data);
    });
}

http.listen(8080); // stre�nik bo poslu�al na vratih 8080

var �elenaVrednost = 0; // �eleno vrednost postavimo na 0
var dejanskaVrednost = 0; // dejansko vrednost postavimo na 0
var faktor =0.4; // faktor, ki doloca hitrost doseganja �elenega stanja
var pwm = 0;

// Spremenljivke PID algoritma
var Kp = 0.8; // proporcionalni faktor
var Ki = 0.008; // integralni faktor
var Kd = 0.15; // diferencialni faktor

var err = 0; // error
var errVsota = 0; // vsota napak
var dErr = 0; // diferenca napak
var zadnjiErr = 0; // da obdr�imo vrednost prej�nje napake



var kontrolniAlgoritemVkljucen = 0; // spremenljivka, ki doloca ali je ctrl. alg. vkljucen
var intervalCtrl; // spremenljivka za setInterval v globalnem prostoru

console.log("Zagon sistema"); // izpis sporocila o zagonu

var po�ljiVrednostPrekoVticnika = function(){}; // spr. za po�iljanje sporocil
var po�ljiStaticnoSporociloPrekoVticnika = function() {}; // funkcija za po�iljanje staticnega sporocila

board.on("ready", function(){
    console.log("Plo�ca pripravljena");

    board.analogRead(0, function(value){
        �elenaVrednost = value; // neprekinjeno branje pina A0
    });
    board.analogRead(1, function(value){
        dejanskaVrednost = value; // neprekinjeno branje pina A1
    });
    
    //startKontrolniAlgoritem(); // po�enemo kontrolni algoritem
    
    io.sockets.on("connection", function(socket){
        
        socket.emit("po�ljiStaticnoSporociloPrekoVticnika", "Stre??nik povezan, plo�ca pripravljena.")

        setInterval(po�ljiVrednosti, 40, socket); // na 40ms po�lj. vred.
        
        socket.on("startKontrolniAlgoritem", function(�tKontrolnegaAlg){
           startKontrolniAlgoritem(�tKontrolnegaAlg); 
        });
        
        socket.on("stopKontrolniAlgoritem", function(){
           stopKontrolniAlgoritem(); 
        });   
        
    po�ljiVrednostPrekoVticnika = function (value) {
        io.sockets.emit("sporociloKlientu", value);
    } 
    
    po�ljiStaticnoSporociloPrekoVticnika = function (value) {
        io.sockets.emit("staticnoSporociloKlientu", value);
    }
    
    
        
    }); // konec socket.on("connection")
 
}); // konec board.on("ready")

function kontrolniAlgoritem (parametri) {
    if (parametri.�tKontrolnegaAlg == 1) {
        pwm = parametri.faktor*(�elenaVrednost-dejanskaVrednost);
        if (pwm > 255) {pwm = 255}; // omejimo vrednost pwm na 255
        if (pwm < -255) {pwm = -255}; // omejimo vrednost pwm na -255
        if (pwm > 0) {board.digitalWrite(2,0)}; // dolocimo smer ce je > 0
        if (pwm < 0) {board.digitalWrite(2,1)}; // dolocimo smer ce je < 0
        board.analogWrite(3, Math.abs(pwm)); // zapi�emo abs vrednost na pin 3
        if (dejanskaVrednost < 150 || dejanskaVrednost > 910) {
            stopKontrolniAlgoritem();
        }
    }
    if (parametri.�tKontrolnegaAlg == 2) {
        err = �elenaVrednost - dejanskaVrednost; // odstopanje ali error
        errVsota += err; // vsota napak (kot integral)
        dErr = err - zadnjiErr; // razlika odstopanj
        pwm = parametri.Kp1*err + parametri.Ki1*errVsota + parametri.Kd1*dErr; // izraz za PID kontroler (iz enacbe)
        zadnjiErr = err; // shranimo vrednost za naslednji cikel za oceno odvoda
    
        if (pwm > 255) {pwm = 255}; // omejimo vrednost pwm na 255
        if (pwm < -255) {pwm = -255}; // omejimo vrednost pwm na -255
        if (pwm > 0) {board.digitalWrite(2,0)}; // dolocimo smer ce je > 0
        if (pwm < 0) {board.digitalWrite(2,1)}; // dolocimo smer ce je < 0
        board.analogWrite(3, Math.abs(pwm)); // zapi�emo abs vrednost na pin 3
    
        if (dejanskaVrednost < 200 || dejanskaVrednost > 850) {
            stopKontrolniAlgoritem();
        }
    }    

}

function startKontrolniAlgoritem (parametri) {
    if (kontrolniAlgoritemVkljucen == 0) {
        kontrolniAlgoritemVkljucen = 1;
        intervalCtrl = setInterval(function(){kontrolniAlgoritem(parametri);}, 30); // klicemo alg. na 30ms
        console.log("Vkljucen kontrolni algoritem �t. " + parametri.�tKontrolnegaAlg)
        po�ljiStaticnoSporociloPrekoVticnika("Kontrolni algoritem �t. " + parametri.�tKontrolnegaAlg + " zagnan | " + json2txt(parametri));
    }
    
}

function stopKontrolniAlgoritem () {
    clearInterval(intervalCtrl); // bri�emo interval klica kontrolnega algoritma
    board.analogWrite(3, 0);
    kontrolniAlgoritemVkljucen = 0;
    var err = 0; // error
    var errVsota = 0; // vsota napak
    var dErr = 0; // diferenca napak
    var zadnjiErr = 0; // da obdr�imo vrednost prej�nje napake

    console.log("Kontrolni algoritem zaustavljen.");
    po�ljiStaticnoSporociloPrekoVticnika("Kontrolni algoritem zaustavljen.");
};

function po�ljiVrednosti(socket) {
    socket.emit("klientBeriVrednosti",
    {
        "�elenaVrednost": �elenaVrednost,
        "dejanskaVrednost": dejanskaVrednost,
        "pwm": pwm
    });
};

function json2txt(obj) // funkcija za izpis json imen in vrednosti
{
  var txt = '';
  var recurse = function(_obj) {
    if ('object' != typeof(_obj)) {
      txt += ' = ' + _obj + '\n';
    }
    else {
      for (var key in _obj) {
        if (_obj.hasOwnProperty(key)) {
          txt += '.' + key;
          recurse(_obj[key]);
        } 
      }
    }
  };
  recurse(obj);
  return txt;
}