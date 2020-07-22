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
You can find the documentation for this package [here](https://github.com/DudeBro249/ChatHelper-TypeScript/wiki)


## Contributing
Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

Please make sure to update tests as appropriate.

## License
[Apache License 2.0](https://choosealicense.com/licenses/apache-2.0/)