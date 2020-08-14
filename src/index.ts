import express from 'express'
const xmlhttprequest = require("xmlhttprequest").XMLHttpRequest;
import Queue from 'queue-fifo'
import EventSource from 'eventsource'


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
    host: string
    connections: number
    existingconnections: number
    clients: any
    groups: any

    constructor(hostname: string, connections: number) {
        this.app = express()
        this.host = (this.__parseHost(hostname)[0]).toString()
        this.port = parseInt(this.__parseHost(hostname)[1])
        this.connections = connections
        this.existingconnections = 0
        this.clients = {} // structure is {clientname: [clientPassword, Queue()]}
        this.groups = {} // structure is {groupName: clientList}
        this.__runServer()
    }

    private __parseHost(hostname: string) {
        const split_hostname = hostname.split(":")
        return split_hostname
    }

    private __isAuth(clientname: string, password: string): boolean {
        return (this.clients.hasOwnProperty(clientname) && this.clients[clientname][0] === password)
    }

    private __isReady(): boolean {
        return this.connections === this.existingconnections
    }

    private __runServer() {

        const server = this

        server.app.use(express.json())

        server.app.get("/", function (req, res) {
            return res.json("connected")
        })

        server.app.post('/checkClient', function (req, res) {
            const data = req.body
            const clientname: string = data['clientname'].toString()
            return res.json(server.clients.hasOwnProperty(clientname))
        })

        server.app.post('/initializeGroup', function (req, res) {
            const data = req.body
            const groupName = data['groupName'].toString()
            const clientList = data['clientList'].toString()

            if (server.groups.hasOwnProperty(groupName) == false && server.__isReady()) {
                server.groups[groupName] = clientList
                return res.sendStatus(200)
            }
            else {
                return res.sendStatus(400)
            }
        })

        server.app.get('/initialize', function (req, res) {

            if (req.headers.authorization) {
                const [clientname, password] = req.headers.authorization.split(":")

                if (server.__isAuth(clientname, password) === false && server.__isReady() === false) {
                    server.clients[clientname] = [password, new Queue()]
                    server.existingconnections += 1

                    res.setHeader('Cache-Control', 'no-cache');
                    res.setHeader('Content-Type', 'text/event-stream');
                    res.setHeader("Access-Control-Allow-Origin", "*");
                    res.flushHeaders(); // flush the headers to establish SSE with client


                    let interval: NodeJS.Timeout = setInterval(function () {
                        if (server.__isReady()) {
                            let data = JSON.stringify({
                                "message": "ready"
                            })
                            res.write(`${data}`)
                            res.end()
                            return
                        }
                        else {
                            let data = JSON.stringify({
                                "message": "not ready"
                            })
                            res.write(`${data}\n\n`)
                        }
                    }, 3000)

                    res.on('close', function () {
                        clearInterval(interval)
                        res.end()
                    })

                }
                else {
                    return res.sendStatus(400)
                }
            }
            else {
                return res.sendStatus(400)
            }
        })


        server.app.post('/sendmessage', function (req, res) {
            if (req.headers.authorization) {

                const [author, password] = req.headers.authorization.split(":")
                const data = req.body
                const recipient: string = data['recipient'].toString()
                const message: string = data['message'].toString()

                if (server.__isAuth(author, password) === true && server.clients.hasOwnProperty(recipient) === true && server.__isReady() === true) {
                    server.clients[recipient][1].enqueue([author, message, false])
                    return res.sendStatus(200)
                }
                else {
                    return res.sendStatus(400)
                }
            }
            else {
                return res.sendStatus(400)
            }
        })

        server.app.post('/sendGroupMessage', function (req, res) {

            if (req.headers.authorization) {

                const [sender, password] = req.headers.authorization.split(":")
                const data = req.body
                const groupName: string = data['groupName'].toString()
                const message: string = data['message'].toString()

                if (server.__isAuth(sender, password) === true && server.__isReady() === true) {
                    let clientList: string[] = server.groups[groupName]
                    clientList.forEach(client => {
                        if (client !== sender) {
                            server.clients[client][1].enqueue([
                                sender, message, true, groupName
                            ])
                        }
                    });

                    return res.sendStatus(200)
                }
                else {
                    return res.sendStatus(400)
                }

            }
            else {
                return res.sendStatus(400)
            }

        })

        server.app.post('/reset', function (req, res) {
            const data = req.body
            const clientname: string = data['clientname'].toString()
            const password: string = data['password'].toString()

            if (server.__isAuth(clientname, password) === true && server.__isReady() === true) {
                server.existingconnections = 0
                server.clients = {}
                server.groups = {}
                return res.sendStatus(200)
            }
            else {
                return res.sendStatus(400)
            }
        })

        server.app.get('/listen', function (req, res) {

            if (req.headers.authorization) {
                const [clientname, password] = req.headers.authorization.split(":")

                if (server.__isAuth(clientname, password) && server.__isReady()) {
                    let interval = setInterval(function () {
                        const clientQueue: Queue<any> = server.clients[clientname][1]
                        const messages = clientQueue.dequeue()
                        if (messages === null) {
                            res.write(`data: ${'no messages'}\n\n`)
                        }
                        else {
                            let data = JSON.stringify(messages)
                            res.write(`data: ${data}\n\n`)
                        }

                    }, 250)

                    res.on('close', function () {
                        clearInterval(interval)
                        res.end()
                    })
                }
                else {
                    return res.sendStatus(400)
                }
            }

            else {
                return res.sendStatus(400)
            }
        })

        server.app.listen(server.port, server.host, function () {

        })
    }
}

class Client {
    url: string
    name: string
    password: string
    __listener: EventSource | null

    constructor(url: string, name: string, password: string) {
        this.url = url
        this.name = name
        this.password = password
        this.__listener = null
        this.__initialize()
    }


    private __initialize() {
        var init_url = this.url + "initialize"

        while (true) {
            var request = new xmlhttprequest();

            request.open('GET', init_url, false);  // `false` makes the request synchronous
            request.setRequestHeader('Content-Type', 'application/json')
            request.setRequestHeader('Authorization', `${this.name}:${this.password}`.toString())
            request.send()

            const responseArray: any[] = (request.responseText as string).split('\n\n')
            for (let i = 0; i < responseArray.length; i++) {
                responseArray[i] = JSON.parse(responseArray[i])
            }

            let responseText = responseArray[responseArray.length - 1]
            if (responseText['message'] === 'ready') {
                break
            }
        }
    }

    sendMessage(recipient: string, message: string) {

        const send_url = this.url + "sendmessage"

        const postData = {
            "recipient": recipient.toString(),
            "message": message.toString(),
        }

        var request = new xmlhttprequest();
        request.open('POST', send_url, false);  // `false` makes the request synchronous
        request.setRequestHeader('Content-Type', 'application/json')
        request.setRequestHeader('Authorization', `${this.name}:${this.password}`.toString())
        request.send(JSON.stringify(postData));

        if (request.status === 200) {
            return 0 // Clean exit
        }
        else {
            return 1 // Error and exit
        }
    }

    sendGroupMessage(groupName: string, message: string) {
        const send_url = this.url + "sendGroupMessage"

        const postData = {
            "message": message.toString(),
            "groupName": groupName.toString()
        }

        var request = new xmlhttprequest();
        request.open('POST', send_url, false);  // `false` makes the request synchronous
        request.setRequestHeader('Content-Type', 'application/json')
        request.setRequestHeader('Authorization', `${this.name}:${this.password}`.toString())
        request.send(JSON.stringify(postData));

        if (request.status === 200) {
            return 0 // Clean exit
        }
        else {
            return 1 // Error and exit
        }
    }

    startListening(onmessage: CallableFunction) {
        let listen_url = this.url + "listen"

        this.__listener = new EventSource(listen_url, {
            headers: {
                'Authorization': `${this.name}:${this.password}`.toString()
            }
        })
        this.__listener.onmessage = function (event: MessageEvent) {
            let group_name: string | null = ''

            if (event.data.toString() === 'no messages') {
                return
            }
            let message_data = JSON.parse(event.data)

            if (message_data.length < 4) {
                group_name = null
            }
            else {
                group_name = message_data[3]
            }

            let message_object = new Message(
                message_data[0],
                message_data[1],
                message_data[2],
                group_name
            )

            onmessage(message_object)
        }

        this.__listener.onerror = function (event: MessageEvent) {
            throw `Error! The client is unable to receive messages from the server: Status code: ${(event as any).status}\n
            The requested url was ${listen_url.toString()}`
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

class Message {
    author: string
    content: string
    is_group_message: boolean
    group_name: string | null

    constructor(author: string, content: string, is_group_message: boolean, group_name: string | null) {
        this.author = author
        this.content = content
        this.is_group_message = is_group_message
        this.group_name = group_name
    }
}

export { Server, Client, Message, Group, _sleep }
