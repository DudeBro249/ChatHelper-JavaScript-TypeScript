"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports._sleep = exports.Group = exports.Client = exports.Server = void 0;
var express_1 = __importDefault(require("express"));
var xmlhttprequest = require("xmlhttprequest").XMLHttpRequest;
var queue_fifo_1 = __importDefault(require("queue-fifo"));
function _sleep(milliseconds) {
    var date = Date.now();
    var currentDate = null;
    do {
        currentDate = Date.now();
    } while (currentDate - date < milliseconds);
}
exports._sleep = _sleep;
var Server = /** @class */ (function () {
    function Server(hostname, connections) {
        this.app = express_1.default();
        this.host = (this.__parseHost(hostname)[0]).toString();
        this.port = parseInt(this.__parseHost(hostname)[1]);
        this.connections = connections;
        this.existingconnections = 0;
        this.clients = {}; // structure is {clientname: [clientPassword, Queue()]}
        this.groups = {}; // structure is {groupName: [clientList, Queue()]}
        this.__runServer();
    }
    Server.prototype.__parseHost = function (hostname) {
        var split_hostname = hostname.split(":");
        return split_hostname;
    };
    Server.prototype.__runServer = function () {
        var server = this;
        server.app.use(express_1.default.json());
        server.app.get("/", function (req, res) {
            console.info(req.method + " " + req.url);
            res.setHeader('Content-Type', 'application/json');
            return res.json("connected");
        });
        server.app.post('/checkClient', function (req, res) {
            console.info(req.method + " " + req.url);
            res.setHeader('Content-Type', 'application/json');
            var data = req.body;
            var clientname = data['clientname'].toString();
            return res.json(server.clients.hasOwnProperty(clientname));
        });
        server.app.post('/initializeGroup', function (req, res) {
            console.info(req.method + " " + req.url);
            res.setHeader('Content-Type', 'application/json');
            var data = req.body;
            var groupName = data['groupName'].toString();
            var clientList = data['clientList'];
            if (server.groups.hasOwnProperty(groupName) === false && server.existingconnections === server.connections) {
                server.groups[groupName] = [clientList, new queue_fifo_1.default()];
                return res.sendStatus(200);
            }
            else {
                return res.sendStatus(400);
            }
        });
        server.app.post('/initialize', function (req, res) {
            res.setHeader('Content-Type', 'application/json');
            var data = req.body;
            var clientname = data['clientname'].toString();
            var password = data['password'].toString();
            console.info(req.method + " " + req.url);
            console.info([clientname, password].toString());
            if (server.clients.hasOwnProperty(clientname) === false && server.existingconnections < server.connections) {
                server.clients[clientname] = [password, new queue_fifo_1.default()];
                server.existingconnections += 1;
                return res.json([
                    server.existingconnections, server.connections
                ]);
            }
            else if (server.clients.hasOwnProperty(clientname) === true && (server.clients[clientname])[0] !== password || (server.existingconnections === server.connections)) {
                return res.sendStatus(400);
            }
            else if (server.clients.hasOwnProperty(clientname) === true && (server.clients[clientname])[0] == password && server.existingconnections < server.connections) {
                return res.json([
                    server.existingconnections, server.connections
                ]);
            }
        });
        server.app.post('/sendmessage', function (req, res) {
            res.setHeader('Content-Type', 'application/json');
            var data = req.body;
            var recipient = data['recipient'].toString();
            var message = data['message'].toString();
            var sender = data['clientname'].toString();
            var clientPassword = data['password'].toString();
            console.info(req.method + " " + req.url);
            if (server.clients.hasOwnProperty(sender) === true && (server.clients[sender])[0] == clientPassword && server.clients.hasOwnProperty(recipient) === true && server.existingconnections === server.connections) {
                (server.clients[recipient])[1].enqueue([sender, message]);
                return res.sendStatus(200);
            }
            else {
                console.log('The message was not sent');
                return res.sendStatus(400);
            }
        });
        server.app.post('/sendGroupMessage', function (req, res) {
            res.setHeader('Content-Type', 'application/json');
            var data = req.body;
            var sender = data['clientname'].toString();
            var clientPassword = data['password'].toString();
            var message = data['message'].toString();
            var groupName = data['groupName'].toString();
            if (server.clients.hasOwnProperty(sender) === true && (server.clients[sender])[0] === clientPassword && server.existingconnections === server.connections) {
                var clientList = (server.groups[groupName])[0];
                console.log("The value of clientList is: ");
                console.log(clientList);
                if (server.groups.hasOwnProperty(groupName) === true && clientList.includes(sender) === true) {
                    server.groups[groupName][1].enqueue([sender, message]);
                    return res.sendStatus(200);
                }
                else {
                    return res.sendStatus(400);
                }
            }
        });
        server.app.post('/getmessage', function (req, res) {
            res.setHeader('Content-Type', 'application/json');
            var data = req.body;
            var clientname = data['clientname'].toString();
            var password = data['password'].toString();
            var number = data['number'].toString();
            console.info(req.method + " " + req.url);
            console.log('The number of messages is: ' + number.toString());
            var messages = new Array(parseInt(number));
            if (server.clients.hasOwnProperty(clientname) === true && (server.clients[clientname])[0] === password && server.existingconnections === server.connections) {
                for (var i = 0; i < parseInt(number); i++) {
                    console.log('Message queue value: ' + (server.clients[clientname])[1]);
                    messages[i] = (server.clients[clientname])[1].dequeue();
                    console.log(messages[i]);
                }
                console.log('The value of messages is: ');
                console.log(messages);
                if (messages != [null]) {
                    return res.json(messages);
                }
                else {
                    return res.sendStatus(400);
                }
            }
            else {
                return res.sendStatus(403);
            }
        });
        server.app.post('/getGroupMessage', function (req, res) {
            res.setHeader('Content-Type', 'application/json');
            var data = req.body;
            var clientname = data['clientname'].toString();
            var password = data['password'].toString();
            var groupName = data['groupName'].toString();
            var number = data['number'].toString();
            if (server.clients.hasOwnProperty(clientname) === true && (server.clients[clientname])[0] === password && server.existingconnections === server.connections) {
                if (server.groups.hasOwnProperty(groupName) === true && (server.groups[groupName])[0].includes(clientname)) {
                    var messages = new Array(parseInt(number));
                    for (var i = 0; i < parseInt(number); i++) {
                        messages[i] = server.groups[groupName][1].dequeue();
                    }
                    return res.json(messages);
                }
            }
            return res.sendStatus(403);
        });
        server.app.listen(server.port, server.host, function () {
            console.log('listening on http://127.0.0.1:' + server.port.toString() + "/");
        });
    };
    return Server;
}());
exports.Server = Server;
var Client = /** @class */ (function () {
    function Client(url, name, password) {
        this.url = url;
        this.name = name;
        this.password = password;
        this._checkInit();
    }
    Client.prototype._checkInit = function () {
        var check = this.initialize();
        if (check === 1) {
            console.error("Failure! Unable to initialize");
        }
    };
    Client.prototype.initialize = function () {
        var init_url = this.url + "initialize";
        var information = [];
        var initialized = 1;
        var waiting = 1;
        var num_requests_made = 0;
        while (true) {
            var postData = {
                "clientname": this.name.toString(),
                "password": this.password.toString()
            };
            var request = new xmlhttprequest();
            request.open('POST', init_url, false); // `false` makes the request synchronous
            request.setRequestHeader('Content-Type', 'application/json');
            request.send(JSON.stringify(postData));
            num_requests_made += 1;
            if (request.status === 200) {
                initialized = 0;
                waiting = 1;
                information = JSON.parse(request.responseText);
                if (information[0] < information[1]) {
                    waiting = 1;
                    _sleep(2000);
                }
                else if (information[0] === information[1]) {
                    waiting = 0;
                    break;
                }
            }
            else if (request.status === 400) {
                if (num_requests_made === 1) {
                    initialized = 1;
                    return initialized;
                }
                else if (num_requests_made > 1 && initialized === 0) {
                    waiting = 0;
                    break;
                }
            }
        }
        return initialized;
    };
    Client.prototype.sendMessage = function (recipient, message) {
        var send_url = this.url + "sendmessage";
        var postData = {
            "recipient": recipient.toString(),
            "message": message.toString(),
            "clientname": this.name.toString(),
            "password": this.password.toString()
        };
        var request = new xmlhttprequest();
        request.open('POST', send_url, false); // `false` makes the request synchronous
        request.setRequestHeader('Content-Type', 'application/json');
        request.send(JSON.stringify(postData));
        if (request.status === 400) {
            return 1;
        }
        else {
            return 0;
        }
    };
    Client.prototype.sendGroupMessage = function (groupName, message) {
        var send_url = this.url + "sendGroupMessage";
        var postData = {
            "clientname": this.name.toString(),
            "password": this.password.toString(),
            "message": message.toString(),
            "groupName": groupName.toString()
        };
        var request = new xmlhttprequest();
        request.open('POST', send_url, false); // `false` makes the request synchronous
        request.setRequestHeader('Content-Type', 'application/json');
        request.send(JSON.stringify(postData));
        if (request.status === 400) {
            return 1; // Error and exit
        }
        else {
            return 0; // Clean exit
        }
    };
    Client.prototype.getMessage = function (number) {
        var get_url = this.url + "getmessage";
        var postData = {
            "clientname": this.name.toString(),
            "password": this.password.toString(),
            "number": number.toString()
        };
        var request = new xmlhttprequest();
        request.open('POST', get_url, false); // `false` makes the request synchronous
        request.setRequestHeader('Content-Type', 'application/json');
        request.send(JSON.stringify(postData));
        if (request.status === 403 || request.status === 400) {
            return 1; // Error and exit
        }
        else {
            return JSON.parse(request.responseText);
        }
    };
    Client.prototype.getGroupMessage = function (groupName, number) {
        var get_url = this.url + "getGroupMessage";
        var postData = {
            "clientname": this.name.toString(),
            "password": this.password.toString(),
            "groupName": groupName.toString(),
            "number": number.toString()
        };
        var request = new xmlhttprequest();
        request.open('POST', get_url, false); // `false` makes the request synchronous
        request.setRequestHeader('Content-Type', 'application/json');
        request.send(JSON.stringify(postData));
        if (request.status === 403) {
            return 1;
        }
        else {
            return JSON.parse(request.responseText);
        }
    };
    return Client;
}());
exports.Client = Client;
var Group = /** @class */ (function () {
    function Group(url, name, clientnames) {
        this.url = url;
        this.name = name;
        this.clientnames = clientnames;
        this.__checkDuplicates();
        this.__checkClients();
        this.__initializeGroup();
    }
    Group.prototype.__checkDuplicates = function () {
        var _this = this;
        var repeated = [];
        var _loop_1 = function (i) {
            for (var j = i + 1; j < this_1.clientnames.length; j++) {
                if (this_1.clientnames[i] === this_1.clientnames[j] && (repeated.find(function (element) { return element === _this.clientnames[i]; })) == undefined) {
                    repeated[i] = this_1.clientnames[i];
                }
            }
        };
        var this_1 = this;
        for (var i = 0; i < this.clientnames.length; i++) {
            _loop_1(i);
        }
        if (repeated.length > 0) {
            var error_string = "1 or more clients have been repeated. They are: ";
            for (var i = 0; i < repeated.length; i++) {
                if (i === repeated.length - 1) {
                    error_string += ("and " + repeated[i] + ".");
                }
                else if (i !== (repeated.length - 1)) {
                    error_string += (repeated[i] + ",");
                }
                else {
                    error_string += (repeated[i]);
                }
            }
            throw error_string;
        }
    };
    Group.prototype.__checkClients = function () {
        for (var i = 0; i < this.clientnames.length; i++) {
            this.__checkClient(this.clientnames[i]);
        }
    };
    Group.prototype.__checkClient = function (clientname) {
        var check_url = this.url + "checkClient";
        var postData = {
            "clientname": clientname
        };
        var request = new xmlhttprequest();
        request.open('POST', check_url, false); // `false` makes the request synchronous
        request.setRequestHeader('Content-Type', 'application/json');
        request.send(JSON.stringify(postData));
        if (JSON.parse(request.responseText) === false) {
            throw (clientname + " has not been initialized yet. Please only provide clients that have been initialized");
        }
    };
    Group.prototype.__initializeGroup = function () {
        var init_url = this.url + "initializeGroup";
        var postData = {
            "groupName": this.name.toString(),
            "clientList": this.clientnames
        };
        var request = new xmlhttprequest();
        request.open('POST', init_url, false); // `false` makes the request synchronous
        request.setRequestHeader('Content-Type', 'application/json');
        request.send(JSON.stringify(postData));
        if (request.status !== 200) {
            var error_string = "Group was unable to be initialized because of 1 of 2 reasons: \n\n            1) There is already a group with this name.\n\n            2) The number of connections have not been fullfilled yet.";
            throw error_string;
        }
    };
    return Group;
}());
exports.Group = Group;
//# sourceMappingURL=index.js.map