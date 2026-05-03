const express = require('express');
const fs = require('fs');
const xml2js = require('xml2js');

const USERS_FILE = 'users.xml';
const LOG_FILE = 'server.log';

// 1. Message Logger
class MessageLogger {
    static log(direction, clientIp, action, details) {
        const time = new Date().toISOString();
        const logEntry = `[${time}] ${direction} | IP: ${clientIp} | Action: ${action} | Details: ${JSON.stringify(details)}\n`;
        fs.appendFileSync(LOG_FILE, logEntry, 'utf8');
        console.log(logEntry.trim());
    }
}

// 2. DataBase Layer
class Database {
    static readUsers() {
        if (!fs.existsSync(USERS_FILE)) return { Users: { User: [] } };
        let usersData = { Users: { User: [] } };
        const xmlData = fs.readFileSync(USERS_FILE, 'utf8');
        new xml2js.Parser().parseString(xmlData, (err, result) => {
            if (result && result.Users && result.Users.User) {
                usersData.Users.User = Array.isArray(result.Users.User) ? result.Users.User : [result.Users.User];
            }
        });
        return usersData;
    }


    static saveUsers(usersData) {
        const xml = new xml2js.Builder().buildObject(usersData);
        fs.writeFileSync(USERS_FILE, xml, 'utf8');
    }
}

// 3. Workers
class Worker {
    constructor(id) { this.id = id; }
   
    processTask(task) {
        return new Promise((resolve) => {
            setTimeout(() => {
                if (task.type === 'REGISTER') {
                    const usersData = Database.readUsers();
                    const userExists = usersData.Users.User.find(u => u.username && u.username[0] === task.data.username);
                   
                    if (userExists) {
                        resolve({ success: false, message: "Користувач вже існує" });
                    } else {
                        // Генеруємо токен
                        const token = Math.random().toString(36).substring(2, 15);
                        usersData.Users.User.push({ username: task.data.username, password: task.data.password, token, score: 0 });
                        Database.saveUsers(usersData);
                        resolve({ success: true, token: token, message: "Реєстрація успішна! Ваш токен згенеровано." });
                    }
                } else if (task.type === 'POLLING') {
                    // Обробка Short Polling
                    resolve({ status: "Сервер працює", activePlayers: Math.floor(Math.random() * 10) + 1 });
                }
            }, 500);
        });
    }
}

// 4. Message Queue
class MessageQueue {
    constructor() {
        this.workers = [new Worker(1), new Worker(2)]; // Два воркери
    }


    async addTask(task) {
        // випадковий воркер для балансування
        const worker = this.workers[Math.floor(Math.random() * this.workers.length)];
        return await worker.processTask(task);
    }
}

// 5. Client Messages Listener
const app = express();
app.use(express.json());
app.use(express.static('public'));

const queue = new MessageQueue();

app.post('/register', async (req, res) => {
    MessageLogger.log('IN', req.ip, 'POST /register', { username: req.body.username });
   
    const responseData = await queue.addTask({ type: 'REGISTER', data: req.body });
   
    MessageLogger.log('OUT', req.ip, 'Register Response', responseData);
    res.status(responseData.success ? 200 : 400).json(responseData);
});

// Ендпоінт для Short Polling
app.get('/poll-status', async (req, res) => {
    const token = req.headers['authorization'];
    MessageLogger.log('IN', req.ip, 'GET /poll-status (Short Polling)', { token });


    if (!token) {
        return res.status(401).json({ message: "Немає токена авторизації!" });
    }


    const responseData = await queue.addTask({ type: 'POLLING', data: { token } });
   
    MessageLogger.log('OUT', req.ip, 'Polling Response', responseData);
    res.json(responseData);
});

// Ендпоінт для слова
app.get('/get-word', (req, res) => {
    const words = ["ПРОГРАМУВАННЯ", "АРХІТЕКТУРА", "СЕРВЕР", "КЛІЄНТ", "ШИБЕНИЦЯ"];
    const randomWord = words[Math.floor(Math.random() * words.length)];
    res.json({ wordLength: randomWord.length, word: randomWord });
});


app.listen(3000, () => {
    console.log(`Сервер запущено: http://localhost:3000`);
});