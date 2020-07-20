# ChatHelper
High-level chat client TypeScript API that makes sending messages between computers(using http) easy.

## Installation

Use the package manager [npm](https://www.npmjs.com/) to install chathelper.

```bash
npm install chathelper --save
```

## QuickStart

### Server

```typescript
import { Server } from 'chatHelper'

const server = new Server("192.168.xx.xxx:8000", 2)
```

### Client

```typescript
import { Client } from 'chatHelper'

const client = new Client("http://192.168.xx.xxx:8000/", "client1", "12345")
```

## Documentation

### Server

```typescript
import { Server } from 'chatHelper'

const server = new Server(port: string, connections: number)
```
- port is the port that the server will be running on: string like "192.168.xx.xxx:8000"
-  connections is the number of connections that the server is meant to receive: integer like 2

Returns a Server object and starts the express server on your system

### Client

```typescript
import { Client } from 'chatHelper'

const client = new Client(url: string, name: string, password: string)
```

This will initialize the client.
- The url parameter represents the url that the client should bind to: string like "http://..."
- The name parameter is the name of the client: string like "client1"
- The password parameter is the password that the client uses to authorize itself to the server when
          getting and sending messages: string like "12345"
          
Returns a client object, and initializes it to the server.

```typescript
client.sendMessage(recipient: string, message: string): number
```
Sends a message to the recipient that is specified in the function
- recipient is the name of the client that you want to send a message to: string like "client2"
- message is the message you want to send to that client: any data type

Returns either 0(if the message was sent succesfully), or 1(error code).

```typescript
client.getMessage(number: number): string[] | number
```
Gets messages that were sent to the client
- number is the number of messages you want to receive: integer like 2

Returns a 2D list like this: [[sender, message], [sender, message], ...]
- sender is the string name of the client who sent the message
- message is the string message

```typescript
client.sendGroupMessage(groupName: string, message: string): number
```
Sends a message to a Group.
- groupName is the name of the group that you want to send the message to: string like "group1"
- message is the string message

Returns either 0(if the message was sent succesfully), or 1(error code).

```typescript
client.getGroupMessage(groupName: string, number: number): string[] | number
```
Gets a certain number of messages from the group that the client is part of
- groupName is the name of the group that you want to get the messages from: string like "group1"
- number is the number of messages you want to receive: integer like 2


## Contributing
Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

Please make sure to update tests as appropriate.

## License
[Apache License 2.0](https://choosealicense.com/licenses/apache-2.0/)