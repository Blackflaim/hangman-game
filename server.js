const express = require('express');
const fs = require('fs');
const path = require('path');
const xml2js = require('xml2js');

const app = express();
app.use(express.json());
app.use(express.static('public'));

const USERS_FILE = 'users.xml';
const LOG_FILE = 'server.log';

const parser = new xml2js.Parser();
const builder = new xml2js.Builder();

function logMessage(clientIp, action, details) {
    const time = new Date().toISOString();
    const logEntry = `[${time}] IP: ${clientIp} | Action: ${action} | Details: ${JSON.stringify(details)}\n`;
    fs.appendFileSync(LOG_FILE, logEntry, 'utf8');
    console.log(logEntry.trim());
}

app.use((req, res, next) => {
    logMessage(req.ip, `HTTP ${req.method} ${req.url}`, req.body);
    next();
});

app.post('/register', (req, res) => {
    const { username, password } = req.body;
    let usersData = { Users: { User: [] } };

    if (fs.existsSync(USERS_FILE)) {
        const xmlData = fs.readFileSync(USERS_FILE, 'utf8');
        parser.parseString(xmlData, (err, result) => {
            if (result && result.Users && result.Users.User) {
                usersData.Users.User = Array.isArray(result.Users.User) ? result.Users.User : [result.Users.User];
            }
        });
    }

    const userExists = usersData.Users.User.find(u => u.username && u.username[0] === username);
    if (userExists) {
        logMessage(req.ip, "Register Failed", { message: "Користувач вже існує" });
        return res.status(400).json({ success: false, message: "Користувач вже існує" });
    }

    usersData.Users.User.push({ username, password, score: 0 });

    const newXmlData = builder.buildObject(usersData);
    fs.writeFileSync(USERS_FILE, newXmlData, 'utf8');

    logMessage(req.ip, "Register Success", { username });
    res.json({ success: true, message: "Реєстрація успішна!" });
});

app.get('/get-word', (req, res) => {
    const words = ["ПРОГРАМУВАННЯ", "АРХІТЕКТУРА", "СЕРВЕР", "КЛІЄНТ", "ШИБЕНИЦЯ"];
    const randomWord = words[Math.floor(Math.random() * words.length)];
    
    logMessage(req.ip, "Get Word Generated", { word: randomWord });
    res.json({ wordLength: randomWord.length, word: randomWord });
});

app.listen(3000, () => {
    console.log(`Сервер працює! Відкрийте http://localhost:3000 у браузері`);
    logMessage("System", "Server Started", { port: 3000 });
});