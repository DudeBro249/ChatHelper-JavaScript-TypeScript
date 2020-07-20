import express from 'express';
declare function _sleep(milliseconds: number): void;
declare class Server {
    app: express.Express;
    port: number;
    connections: number;
    existingconnections: number;
    host: string;
    clients: any;
    groups: any;
    constructor(hostname: string, connections: number);
    private __parseHost;
    private __runServer;
}
declare class Client {
    url: string;
    name: string;
    password: string;
    constructor(url: string, name: string, password: string);
    private _checkInit;
    initialize(): number;
    sendMessage(recipient: string, message: string): 1 | 0;
    sendGroupMessage(groupName: string, message: string): 1 | 0;
    getMessage(number: number): any;
    getGroupMessage(groupName: string, number: number): any;
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
export { Server, Client, Group, _sleep };
//# sourceMappingURL=index.d.ts.map