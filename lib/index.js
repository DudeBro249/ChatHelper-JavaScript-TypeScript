"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports._sleep = exports.Group = exports.Message = exports.Client = exports.Server = void 0;
var express_1 = __importDefault(require("express"));
var xmlhttprequest = require("xmlhttprequest").XMLHttpRequest;
var queue_fifo_1 = __importDefault(require("queue-fifo"));
var eventsource_1 = __importDefault(require("eventsource"));
function _sleep(milliseconds) {
    var date = Date.now();
    var currentDate = null;
    do {
        currentDate = Date.now();
    } while (currentDate - date < milliseconds);
}
exports._sleep = _sleep;
var Server = /** @class */ (function () {
    function Server(port, connections) {
        this.app = express_1.default();
        this.port = port;
        this.connections = connections;
        this.existingconnections = 0;
        this.clients = {}; // structure is {clientname: [clientPassword, Queue()]}
        this.groups = {}; // structure is {groupName: clientList}
        this.__runServer();
    }
    Server.prototype.__isAuth = function (clientname, password) {
        return (this.clients.hasOwnProperty(clientname) && this.clients[clientname][0] === password);
    };
    Server.prototype.__isReady = function () {
        return this.connections === this.existingconnections;
    };
    Server.prototype.__runServer = function () {
        var server = this;
        server.app.use(express_1.default.json());
        server.app.get("/", function (req, res) {
            return res.json("connected");
        });
        server.app.post('/checkClient', function (req, res) {
            var data = req.body;
            var clientname = data['clientname'].toString();
            return res.json(server.clients.hasOwnProperty(clientname));
        });
        server.app.post('/initializeGroup', function (req, res) {
            var data = req.body;
            var groupName = data['groupName'].toString();
            var clientList = data['clientList'].toString();
            if (server.groups.hasOwnProperty(groupName) == false && server.__isReady()) {
                server.groups[groupName] = clientList;
                return res.sendStatus(200);
            }
            else {
                return res.sendStatus(400);
            }
        });
        server.app.get('/initialize', function (req, res) {
            if (req.headers.authorization) {
                var _a = req.headers.authorization.split(":"), clientname = _a[0], password = _a[1];
                if (server.__isAuth(clientname, password) === false && server.__isReady() === false) {
                    server.clients[clientname] = [password, new queue_fifo_1.default()];
                    server.existingconnections += 1;
                    res.setHeader('Cache-Control', 'no-cache');
                    res.setHeader('Content-Type', 'text/event-stream');
                    res.setHeader("Access-Control-Allow-Origin", "*");
                    res.flushHeaders(); // flush the headers to establish SSE with client
                    var interval_1 = setInterval(function () {
                        if (server.__isReady()) {
                            var data = JSON.stringify({
                                "message": "ready"
                            });
                            res.write("" + data);
                            res.end();
                            return;
                        }
                        else {
                            var data = JSON.stringify({
                                "message": "not ready"
                            });
                            res.write(data + "\n\n");
                        }
                    }, 3000);
                    res.on('close', function () {
                        clearInterval(interval_1);
                        res.end();
                    });
                }
                else {
                    return res.sendStatus(400);
                }
            }
            else {
                return res.sendStatus(400);
            }
        });
        server.app.post('/sendmessage', function (req, res) {
            if (req.headers.authorization) {
                var _a = req.headers.authorization.split(":"), author = _a[0], password = _a[1];
                var data = req.body;
                var recipient = data['recipient'].toString();
                var message = data['message'].toString();
                if (server.__isAuth(author, password) === true && server.clients.hasOwnProperty(recipient) === true && server.__isReady() === true) {
                    server.clients[recipient][1].enqueue([author, message, false]);
                    return res.sendStatus(200);
                }
                else {
                    return res.sendStatus(400);
                }
            }
            else {
                return res.sendStatus(400);
            }
        });
        server.app.post('/sendGroupMessage', function (req, res) {
            if (req.headers.authorization) {
                var _a = req.headers.authorization.split(":"), sender_1 = _a[0], password = _a[1];
                var data = req.body;
                var groupName_1 = data['groupName'].toString();
                var message_1 = data['message'].toString();
                if (server.__isAuth(sender_1, password) === true && server.__isReady() === true) {
                    var clientList = server.groups[groupName_1];
                    clientList.forEach(function (client) {
                        if (client !== sender_1) {
                            server.clients[client][1].enqueue([
                                sender_1, message_1, true, groupName_1
                            ]);
                        }
                    });
                    return res.sendStatus(200);
                }
                else {
                    return res.sendStatus(400);
                }
            }
            else {
                return res.sendStatus(400);
            }
        });
        server.app.post('/reset', function (req, res) {
            var data = req.body;
            var clientname = data['clientname'].toString();
            var password = data['password'].toString();
            if (server.__isAuth(clientname, password) === true && server.__isReady() === true) {
                server.existingconnections = 0;
                server.clients = {};
                server.groups = {};
                return res.sendStatus(200);
            }
            else {
                return res.sendStatus(400);
            }
        });
        server.app.get('/listen', function (req, res) {
            if (req.headers.authorization) {
                var _a = req.headers.authorization.split(":"), clientname_1 = _a[0], password = _a[1];
                if (server.__isAuth(clientname_1, password) && server.__isReady()) {
                    var interval_2 = setInterval(function () {
                        var clientQueue = server.clients[clientname_1][1];
                        var messages = clientQueue.dequeue();
                        if (messages === null) {
                            res.write("data: " + 'no messages' + "\n\n");
                        }
                        else {
                            var data = JSON.stringify(messages);
                            res.write("data: " + data + "\n\n");
                        }
                    }, 250);
                    res.on('close', function () {
                        clearInterval(interval_2);
                        res.end();
                    });
                }
                else {
                    return res.sendStatus(400);
                }
            }
            else {
                return res.sendStatus(400);
            }
        });
        server.app.listen(server.port, function () {
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
        this.__listener = null;
        this.__initialize();
    }
    Client.prototype.__initialize = function () {
        var init_url = this.url + "initialize";
        while (true) {
            var request = new xmlhttprequest();
            request.open('GET', init_url, false); // `false` makes the request synchronous
            request.setRequestHeader('Content-Type', 'application/json');
            request.setRequestHeader('Authorization', (this.name + ":" + this.password).toString());
            request.send();
            var responseArray = request.responseText.split('\n\n');
            for (var i = 0; i < responseArray.length; i++) {
                responseArray[i] = JSON.parse(responseArray[i]);
            }
            var responseText = responseArray[responseArray.length - 1];
            if (responseText['message'] === 'ready') {
                break;
            }
        }
    };
    Client.prototype.sendMessage = function (recipient, message) {
        var send_url = this.url + "sendmessage";
        var postData = {
            "recipient": recipient.toString(),
            "message": message.toString(),
        };
        var request = new xmlhttprequest();
        request.open('POST', send_url, false); // `false` makes the request synchronous
        request.setRequestHeader('Content-Type', 'application/json');
        request.setRequestHeader('Authorization', (this.name + ":" + this.password).toString());
        request.send(JSON.stringify(postData));
        if (request.status === 200) {
            return 0; // Clean exit
        }
        else {
            return 1; // Error and exit
        }
    };
    Client.prototype.sendGroupMessage = function (groupName, message) {
        var send_url = this.url + "sendGroupMessage";
        var postData = {
            "message": message.toString(),
            "groupName": groupName.toString()
        };
        var request = new xmlhttprequest();
        request.open('POST', send_url, false); // `false` makes the request synchronous
        request.setRequestHeader('Content-Type', 'application/json');
        request.setRequestHeader('Authorization', (this.name + ":" + this.password).toString());
        request.send(JSON.stringify(postData));
        if (request.status === 200) {
            return 0; // Clean exit
        }
        else {
            return 1; // Error and exit
        }
    };
    Client.prototype.startListening = function (onmessage) {
        var listen_url = this.url + "listen";
        this.__listener = new eventsource_1.default(listen_url, {
            headers: {
                'Authorization': (this.name + ":" + this.password).toString()
            }
        });
        this.__listener.onmessage = function (event) {
            var group_name = '';
            if (event.data.toString() === 'no messages') {
                return;
            }
            var message_data = JSON.parse(event.data);
            if (message_data.length < 4) {
                group_name = null;
            }
            else {
                group_name = message_data[3];
            }
            var message_object = new Message(message_data[0], message_data[1], message_data[2], group_name);
            onmessage(message_object);
        };
        this.__listener.onerror = function (event) {
            throw "Error! The client is unable to receive messages from the server: Status code: " + event.status + "\n\n            The requested url was " + listen_url.toString();
        };
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
var Message = /** @class */ (function () {
    function Message(author, content, is_group_message, group_name) {
        this.author = author;
        this.content = content;
        this.is_group_message = is_group_message;
        this.group_name = group_name;
    }
    return Message;
}());
exports.Message = Message;
//# sourceMappingURL=index.js.map