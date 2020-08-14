import express from 'express';
import EventSource from 'eventsource';
declare function _sleep(milliseconds: number): void;
declare class Server {
    app: express.Express;
    port: any;
    connections: number;
    existingconnections: number;
    clients: any;
    groups: any;
    constructor(port: any, connections: number);
    private __isAuth;
    private __isReady;
    private __runServer;
}
declare class Client {
    url: string;
    name: string;
    password: string;
    __listener: EventSource | null;
    constructor(url: string, name: string, password: string);
    private __initialize;
    sendMessage(recipient: string, message: string): 1 | 0;
    sendGroupMessage(groupName: string, message: string): 1 | 0;
    startListening(onmessage: CallableFunction): void;
    resetServer(): 1 | 0;
    stopListening(): void;
}
declare class Group {
    url: string;
    name: string;
    clientnames: string[];
    constructor(url: string, name: string, clientnames: string[]);
    private __checkDuplicates;
    private __checkClients;
    private __checkClient;
    private __initializeGroup;
}
declare class Message {
    author: string;
    content: string;
    is_group_message: boolean;
    group_name: string | null;
    constructor(author: string, content: string, is_group_message: boolean, group_name: string | null);
}
export { Server, Client, Message, Group, _sleep };
//# sourceMappingURL=index.d.ts.map