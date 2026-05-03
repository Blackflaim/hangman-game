const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();

app.use(express.json());
app.use(express.static('public')); // Папка для клієнтських файлів

const USERS_FILE = 'users.json';
const LOG_FILE = 'server.log';

function logMessage(clientIp, action, details) {
    const time = new Date().toISOString();
    const logEntry = `[${time}] IP: ${clientIp} | Action: ${action} | Details: ${JSON.stringify(details)}\n`;
    
    // Запис логів у текстовий файл
    fs.appendFileSync(LOG_FILE, logEntry, 'utf8');
    console.log(logEntry.trim());
}

// Middleware для логування всіх HTTP-запитів
app.use((req, res, next) => {
    logMessage(req.ip, `HTTP ${req.method} ${req.url}`, req.body);
    next();
});

// Ендпоінт для реєстрації користувача із JSON-серіалізацією
app.post('/register', (req, res) => {
    const { username, password } = req.body;
    let users = [];

    // Десеріалізація існуючих даних з файлу
    if (fs.existsSync(USERS_FILE)) {
        const fileData = fs.readFileSync(USERS_FILE, 'utf8');
        users = JSON.parse(fileData);
    }

    // Перевірка, чи існує користувач
    if (users.find(u => u.username === username)) {
        const errorMsg = { success: false, message: "Користувач вже існує" };
        logMessage(req.ip, "Register Failed", errorMsg);
        return res.status(400).json(errorMsg);
    }

    // Додавання нового користувача
    const newUser = { username, password, score: 0 };
    users.push(newUser);

    // Серіалізація об'єкта та збереження у файл
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf8');

    const successMsg = { success: true, message: "Реєстрація успішна" };
    logMessage(req.ip, "Register Success", successMsg);
    res.json(successMsg);
});

// Ендпоінт для отримання випадкового слова
app.get('/get-word', (req, res) => {
    const words = ["ПРОГРАМУВАННЯ", "АРХІТЕКТУРА", "СЕРВЕР", "КЛІЄНТ", "ШИБЕНИЦЯ"];
    const randomWord = words[Math.floor(Math.random() * words.length)];
    
    const response = { wordLength: randomWord.length, word: randomWord };
    logMessage(req.ip, "Get Word", { wordLength: response.wordLength });
    
    res.json(response);
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Сервер запущено на http://localhost:${PORT}`);
    logMessage("System", "Server Started", { port: PORT });
});