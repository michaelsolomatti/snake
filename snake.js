// snake.js
// Snake (Magnetic) на JavaScript (Node.js)

const readline = require('readline');
const fs = require('fs');

// ANSI-цвета
const RESET = '\x1b[0m';
const GREEN = '\x1b[92m';
const RED = '\x1b[91m';
const YELLOW = '\x1b[93m';
const BLUE = '\x1b[94m';
const CYAN = '\x1b[96m';
const BOLD = '\x1b[1m';

const WIDTH = 20;
const HEIGHT = 15;
const MAGNET_RADIUS = 3;

class SnakeGame {
    constructor() {
        this.score = 0;
        this.highScore = this.loadRecord();
        this.snake = [[Math.floor(HEIGHT/2), Math.floor(WIDTH/2)]];
        this.direction = [0, 1]; // [dy, dx]
        this.nextDirection = this.direction;
        this.food = this.spawnFood();
        this.gameOver = false;
        this.paused = false;
        this.speed = 150; // миллисекунд на ход
        this.lastMove = 0;
        this.playerPressed = false;
        this.running = true;
    }

    loadRecord() {
        try {
            const data = fs.readFileSync('snake_record.txt', 'utf-8');
            return parseInt(data.trim()) || 0;
        } catch (e) {
            return 0;
        }
    }

    saveRecord() {
        fs.writeFileSync('snake_record.txt', String(this.highScore));
    }

    spawnFood() {
        let pos;
        do {
            pos = [Math.floor(Math.random() * HEIGHT), Math.floor(Math.random() * WIDTH)];
        } while (this.snake.some(seg => seg[0] === pos[0] && seg[1] === pos[1]));
        return pos;
    }

    draw() {
        process.stdout.write('\x1b[?25l');
        process.stdout.write('\x1b[H');
        console.log(BOLD + CYAN + '+' + '-'.repeat(WIDTH) + '+' + RESET);
        for (let y = 0; y < HEIGHT; y++) {
            process.stdout.write(BOLD + CYAN + '|' + RESET);
            for (let x = 0; x < WIDTH; x++) {
                if (y === this.snake[0][0] && x === this.snake[0][1]) {
                    process.stdout.write(GREEN + 'O' + RESET);
                } else if (this.snake.some(seg => seg[0] === y && seg[1] === x)) {
                    process.stdout.write(GREEN + 'o' + RESET);
                } else if (y === this.food[0] && x === this.food[1]) {
                    process.stdout.write(RED + '★' + RESET);
                } else {
                    process.stdout.write(' ');
                }
            }
            console.log(BOLD + CYAN + '|' + RESET);
        }
        console.log(BOLD + CYAN + '+' + '-'.repeat(WIDTH) + '+' + RESET);
        console.log(`Счёт: ${YELLOW}${this.score}${RESET}  Рекорд: ${YELLOW}${this.highScore}${RESET}`);
        if (this.paused) console.log(BOLD + 'ПАУЗА' + RESET);
        console.log('Управление: стрелки, P - пауза, Q - выход');
    }

    magneticEffect() {
        const head = this.snake[0];
        const food = this.food;
        const dist = Math.abs(head[0] - food[0]) + Math.abs(head[1] - food[1]);
        if (dist <= MAGNET_RADIUS) {
            const possible = [];
            for (const [dy, dx] of [[0,1],[0,-1],[1,0],[-1,0]]) {
                const ny = head[0] + dy;
                const nx = head[1] + dx;
                if (ny >= 0 && ny < HEIGHT && nx >= 0 && nx < WIDTH &&
                    !this.snake.some(seg => seg[0] === ny && seg[1] === nx)) {
                    const newDist = Math.abs(ny - food[0]) + Math.abs(nx - food[1]);
                    possible.push([newDist, dy, dx]);
                }
            }
            if (possible.length > 0) {
                possible.sort((a,b) => a[0] - b[0]);
                return [possible[0][1], possible[0][2]];
            }
        }
        return null;
    }

    checkCollision(head) {
        const [y, x] = head;
        if (y < 0 || y >= HEIGHT || x < 0 || x >= WIDTH) return true;
        for (let i = 1; i < this.snake.length; i++) {
            if (this.snake[i][0] === y && this.snake[i][1] === x) return true;
        }
        return false;
    }

    moveSnake() {
        if (this.paused || this.gameOver) return;

        // Применяем магнит, если игрок не нажал клавишу
        if (!this.playerPressed) {
            const magnetDir = this.magneticEffect();
            if (magnetDir) {
                const head = this.snake[0];
                const [dy, dx] = this.direction;
                const currentDist = Math.abs(head[0] + dy - this.food[0]) + Math.abs(head[1] + dx - this.food[1]);
                const magnetDist = Math.abs(head[0] + magnetDir[0] - this.food[0]) + Math.abs(head[1] + magnetDir[1] - this.food[1]);
                if (magnetDist < currentDist) {
                    this.direction = magnetDir;
                    this.nextDirection = magnetDir;
                }
            }
        }

        // Двигаем
        const [dy, dx] = this.direction;
        const head = this.snake[0];
        const newHead = [head[0] + dy, head[1] + dx];
        if (this.checkCollision(newHead)) {
            this.gameOver = true;
            return;
        }
        this.snake.unshift(newHead);
        if (newHead[0] === this.food[0] && newHead[1] === this.food[1]) {
            this.score++;
            if (this.score > this.highScore) {
                this.highScore = this.score;
                this.saveRecord();
            }
            this.food = this.spawnFood();
            const level = Math.floor(this.score / 5);
            this.speed = Math.max(50, 150 - level * 10);
        } else {
            this.snake.pop();
        }
        this.playerPressed = false;
        this.draw();
    }

    run() {
        readline.emitKeypressEvents(process.stdin);
        process.stdin.setRawMode(true);
        process.stdin.on('keypress', (str, key) => {
            if (!this.running) return;
            if (key.name === 'up' && this.direction[0] !== 1) {
                this.nextDirection = [-1, 0];
                this.playerPressed = true;
            } else if (key.name === 'down' && this.direction[0] !== -1) {
                this.nextDirection = [1, 0];
                this.playerPressed = true;
            } else if (key.name === 'left' && this.direction[1] !== 1) {
                this.nextDirection = [0, -1];
                this.playerPressed = true;
            } else if (key.name === 'right' && this.direction[1] !== -1) {
                this.nextDirection = [0, 1];
                this.playerPressed = true;
            } else if (key.name === 'space' || key.name === 'p') {
                this.paused = !this.paused;
            } else if (key.name === 'q') {
                this.running = false;
                this.gameOver = true;
            }
            // Обновляем направление, если игрок нажал
            if (this.playerPressed) {
                this.direction = this.nextDirection;
            }
        });

        this.draw();
        const interval = setInterval(() => {
            if (!this.running) {
                clearInterval(interval);
                process.stdin.setRawMode(false);
                console.log(BOLD + RED + 'Игра окончена! Ваш счёт: ' + this.score + RESET);
                if (this.score >= this.highScore) {
                    console.log(BOLD + YELLOW + 'Новый рекорд!' + RESET);
                }
                process.exit(0);
            }
            // Синхронизируем направление
            if (!this.paused && !this.gameOver) {
                // Если игрок нажал, направление уже обновлено
                // Если нет, проверяем магнит
                this.moveSnake();
            }
        }, this.speed);
    }
}

const game = new SnakeGame();
game.run();
