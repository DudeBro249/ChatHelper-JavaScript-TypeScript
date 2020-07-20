import express from 'express'
const xmlhttprequest = require("xmlhttprequest").XMLHttpRequest;
import Queue from 'queue-fifo'


function _sleep(milliseconds: number) {
    const date = Date.now();
    let currentDate = null;
    do {
        currentDate = Date.now();
    } while (currentDate - date < milliseconds);
}

class Server {
    app: express.Express
    port: number
    connections: number
    existingconnections: number
    host: string
    clients: any
    groups: any

    constructor(hostname: string, connections: number) {
        this.app = express()
        this.host = (this.__parseHost(hostname)[0]).toString()
        this.port = parseInt(this.__parseHost(hostname)[1])
        this.connections = connections
        this.existingconnections = 0
        this.clients = {} // structure is {clientname: [clientPassword, Queue()]}
        this.groups = {} // structure is {groupName: [clientList, Queue()]}
        this.__runServer()
    }

    private __parseHost(hostname: string) {
        const split_hostname = hostname.split(":")
        return split_hostname
    }

    private __runServer() {
        const server = this

        server.app.use(express.json())

        server.app.get("/", function (req, res) {
            console.info(`${req.method} ${req.url}`)
            res.setHeader('Content-Type', 'application/json')
            return res.json("connected")
        })

        server.app.post('/checkClient', function (req, res) {
            console.info(`${req.method} ${req.url}`)
            res.setHeader('Content-Type', 'application/json')
            const data = req.body
            const clientname: string = data['clientname'].toString()
            return res.json(server.clients.hasOwnProperty(clientname))
        })

        server.app.post('/initializeGroup', function (req, res) {
            console.info(`${req.method} ${req.url}`)
            res.setHeader('Content-Type', 'application/json')
            const data = req.body
            const groupName: string = data['groupName'].toString()
            const clientList: string[] = data['clientList']

            if (server.groups.hasOwnProperty(groupName) === false && server.existingconnections === server.connections) {
                server.groups[groupName] = [clientList, new Queue()]
                return res.sendStatus(200)
            }
            else {
                return res.sendStatus(400)
            }
        })

        server.app.post('/initialize', function (req, res) {
            res.setHeader('Content-Type', 'application/json')
            const data = req.body
            const clientname: string = data['clientname'].toString()
            const password: string = data['password'].toString()

            console.info(`${req.method} ${req.url}`)
            console.info([clientname, password].toString())

            if (server.clients.hasOwnProperty(clientname) === false && server.existingconnections < server.connections) {
                server.clients[clientname] = [password, new Queue()]
                server.existingconnections += 1
                return res.json([
                    server.existingconnections, server.connections
                ])
            }

            else if (server.clients.hasOwnProperty(clientname) === true && (server.clients[clientname])[0] !== password || (server.existingconnections === server.connections)) {
                return res.sendStatus(400)
            }

            else if (server.clients.hasOwnProperty(clientname) === true && (server.clients[clientname])[0] == password && server.existingconnections < server.connections) {
                return res.json([
                    server.existingconnections, server.connections
                ])
            }
        })

        server.app.post('/sendmessage', function (req, res) {
            res.setHeader('Content-Type', 'application/json')
            const data = req.body
            const recipient: string = data['recipient'].toString()
            const message: string = data['message'].toString()
            const sender: string = data['clientname'].toString()
            const clientPassword: string = data['password'].toString()

            console.info(`${req.method} ${req.url}`)

            if (server.clients.hasOwnProperty(sender) === true && (server.clients[sender])[0] == clientPassword && server.clients.hasOwnProperty(recipient) === true && server.existingconnections === server.connections) {
                (server.clients[recipient])[1].enqueue([sender, message])
                return res.sendStatus(200)
            }
            else {
                console.log('The message was not sent')
                return res.sendStatus(400)
            }
        })

        server.app.post('/sendGroupMessage', function (req, res) {
            res.setHeader('Content-Type', 'application/json')
            const data = req.body
            const sender: string = data['clientname'].toString()
            const clientPassword: string = data['password'].toString()
            const message: string = data['message'].toString()
            const groupName: string = data['groupName'].toString()

            if (server.clients.hasOwnProperty(sender) === true && (server.clients[sender])[0] === clientPassword && server.existingconnections === server.connections) {
                let clientList: string[] = (server.groups[groupName])[0]
                console.log("The value of clientList is: ")
                console.log(clientList)
                if (server.groups.hasOwnProperty(groupName) === true && clientList.includes(sender) === true) {
                    server.groups[groupName][1].enqueue([sender, message])
                    return res.sendStatus(200)
                }
                else {
                    return res.sendStatus(400)
                }
            }
        })

        server.app.post('/getmessage', function (req, res) {
            res.setHeader('Content-Type', 'application/json')
            const data = req.body
            const clientname: string = data['clientname'].toString()
            const password: string = data['password'].toString()
            const number: string = data['number'].toString()

            console.info(`${req.method} ${req.url}`)
            console.log('The number of messages is: ' + number.toString())

            var messages = new Array(parseInt(number))
            if (server.clients.hasOwnProperty(clientname) === true && (server.clients[clientname])[0] === password && server.existingconnections === server.connections) {
                for (let i: number = 0; i < parseInt(number); i++) {
                    console.log('Message queue value: ' + (server.clients[clientname])[1])
                    messages[i] = (server.clients[clientname])[1].dequeue()
                    console.log(messages[i])
                }

                console.log('The value of messages is: ')
                console.log(messages)

                return res.json(messages)
            }
            else {
                return res.sendStatus(403)
            }
        })

        server.app.post('/getGroupMessage', function (req, res) {
            res.setHeader('Content-Type', 'application/json')
            const data = req.body
            const clientname: string = data['clientname'].toString()
            const password: string = data['password'].toString()
            const groupName: string = data['groupName'].toString()
            const number: string = data['number'].toString()

            if (server.clients.hasOwnProperty(clientname) === true && (server.clients[clientname])[0] === password && server.existingconnections === server.connections) {
                if (server.groups.hasOwnProperty(groupName) === true && (server.groups[groupName])[0].includes(clientname)) {
                    var messages = new Array(parseInt(number))
                    for (let i: number = 0; i < parseInt(number); i++) {
                        messages[i] = server.groups[groupName][1].dequeue()
                    }
                    return res.json(messages)
                }
            }

            return res.sendStatus(403)
        })

        server.app.listen(server.port, server.host, function () {
            console.log('listening on http://127.0.0.1:' + server.port.toString() + "/")
        })
    }
}

class Client {
    url: string
    name: string
    password: string

    constructor(url: string, name: string, password: string) {
        this.url = url
        this.name = name
        this.password = password
        this._checkInit()
    }

    private _checkInit() {
        var check: number = this.initialize()
        if (check === 1) {
            console.error("Failure! Unable to initialize")
        }
    }

    initialize() {
        var init_url = this.url + "initialize"

        var information: number[] = []
        var initialized = 1
        var waiting = 1
        var num_requests_made = 0

        while (true) {

            const postData = {
                "clientname": this.name.toString(),
                "password": this.password.toString()
            }

            var request = new xmlhttprequest();

            request.open('POST', init_url, false);  // `false` makes the request synchronous
            request.setRequestHeader('Content-Type', 'application/json')
            request.send(JSON.stringify(postData));

            num_requests_made += 1

            if (request.status === 200) {
                initialized = 0
                waiting = 1

                information = JSON.parse(request.responseText)

                if (information[0] < information[1]) {
                    waiting = 1
                    _sleep(2000)
                }
                else if (information[0] === information[1]) {
                    waiting = 0
                    break
                }
            }
            else if (request.status === 400) {
                if (num_requests_made === 1) {
                    initialized = 1
                    return initialized
                }
                else if (num_requests_made > 1 && initialized === 0) {
                    waiting = 0
                    break
                }
            }
        }
        return initialized
    }

    sendMessage(recipient: string, message: string) {
        const send_url = this.url + "sendmessage"

        const postData = {
            "recipient": recipient.toString(),
            "message": message.toString(),
            "clientname": this.name.toString(),
            "password": this.password.toString()
        }

        var request = new xmlhttprequest();
        request.open('POST', send_url, false);  // `false` makes the request synchronous
        request.setRequestHeader('Content-Type', 'application/json')
        request.send(JSON.stringify(postData));

        if (request.status === 400) {
            return 1
        }
        else {
            return 0
        }
    }

    sendGroupMessage(groupName: string, message: string) {
        const send_url = this.url + "sendGroupMessage"

        const postData = {
            "clientname": this.name.toString(),
            "password": this.password.toString(),
            "message": message.toString(),
            "groupName": groupName.toString()
        }

        var request = new xmlhttprequest();
        request.open('POST', send_url, false);  // `false` makes the request synchronous
        request.setRequestHeader('Content-Type', 'application/json')
        request.send(JSON.stringify(postData));

        if (request.status === 400) {
            return 1 // Error and exit
        }
        else {
            return 0 // Clean exit
        }
    }

    getMessage(number: number) {
        const get_url = this.url + "getmessage"

        const postData = {
            "clientname": this.name.toString(),
            "password": this.password.toString(),
            "number": number.toString()
        }

        var request = new xmlhttprequest();

        request.open('POST', get_url, false);  // `false` makes the request synchronous
        request.setRequestHeader('Content-Type', 'application/json')
        request.send(JSON.stringify(postData));

        if (request.status === 403) {
            return 1
        }
        else {
            return JSON.parse(request.responseText)
        }
    }

    getGroupMessage(groupName: string, number: number) {
        const get_url = this.url + "getGroupMessage"

        const postData = {
            "clientname": this.name.toString(),
            "password": this.password.toString(),
            "groupName": groupName.toString(),
            "number": number.toString()
        }

        var request = new xmlhttprequest();

        request.open('POST', get_url, false);  // `false` makes the request synchronous
        request.setRequestHeader('Content-Type', 'application/json')
        request.send(JSON.stringify(postData));

        if (request.status === 403) {
            return 1
        }
        else {
            return JSON.parse(request.responseText)
        }
    }
}

class Group {
    url: string
    name: string
    clientnames: string[]

    constructor(url: string, name: string, clientnames: string[]) {
        this.url = url
        this.name = name
        this.clientnames = clientnames
        this.__checkDuplicates()
        this.__checkClients()
        this.__initializeGroup()
    }

    private __checkDuplicates() {
        var repeated: string[] = []
        for (let i: number = 0; i < this.clientnames.length; i++) {
            for (let j: number = i + 1; j < this.clientnames.length; j++) {
                if (this.clientnames[i] === this.clientnames[j] && (repeated.find(element => element === this.clientnames[i])) == undefined) {
                    repeated[i] = this.clientnames[i]
                }
            }
        }
        if (repeated.length > 0) {
            var error_string: string = "1 or more clients have been repeated. They are: "
            for (let i = 0; i < repeated.length; i++) {
                if (i === repeated.length - 1) {
                    error_string += ("and " + repeated[i] + ".")
                }
                else if (i !== (repeated.length - 1)) {
                    error_string += (repeated[i] + ",")
                }
                else {
                    error_string += (repeated[i])
                }
            }
            throw error_string
        }
    }

    private __checkClients() {
        for (let i = 0; i < this.clientnames.length; i++) {
            this.__checkClient(this.clientnames[i])
        }
    }

    private __checkClient(clientname: string) {
        const check_url = this.url + "checkClient"

        const postData = {
            "clientname": clientname
        }

        var request = new xmlhttprequest();

        request.open('POST', check_url, false);  // `false` makes the request synchronous
        request.setRequestHeader('Content-Type', 'application/json')
        request.send(JSON.stringify(postData));

        if (JSON.parse(request.responseText) === false) {
            throw (clientname + " has not been initialized yet. Please only provide clients that have been initialized")
        }
    }

    private __initializeGroup() {
        const init_url = this.url + "initializeGroup"

        const postData = {
            "groupName": this.name.toString(),
            "clientList": this.clientnames
        }

        var request = new xmlhttprequest();

        request.open('POST', init_url, false);  // `false` makes the request synchronous
        request.setRequestHeader('Content-Type', 'application/json')
        request.send(JSON.stringify(postData));

        if (request.status !== 200) {
            const error_string = `Group was unable to be initialized because of 1 of 2 reasons: \n
            1) There is already a group with this name.\n
            2) The number of connections have not been fullfilled yet.`
            throw error_string
        }

    }
}

export { Server, Client, Group, _sleep }
