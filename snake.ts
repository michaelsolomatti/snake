// snake.ts
// Snake (Magnetic) на TypeScript

import * as readline from 'readline';
import * as fs from 'fs';

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

type Pos = [number, number];

class SnakeGame {
    private score: number = 0;
    private highScore: number;
    private snake: Pos[];
    private direction: Pos;
    private nextDirection: Pos;
    private food: Pos;
    private gameOver: boolean = false;
    private paused: boolean = false;
    private speed: number; // ms
    private lastMove: number = 0;
    private playerPressed: boolean = false;
    private running: boolean = true;

    constructor() {
        this.highScore = this.loadRecord();
        this.snake = [[Math.floor(HEIGHT/2), Math.floor(WIDTH/2)]];
        this.direction = [0, 1];
        this.nextDirection = this.direction;
        this.food = this.spawnFood();
        this.speed = 150;
    }

    private loadRecord(): number {
        try {
            const data = fs.readFileSync('snake_record.txt', 'utf-8');
            return parseInt(data.trim()) || 0;
        } catch {
            return 0;
        }
    }

    private saveRecord(): void {
        fs.writeFileSync('snake_record.txt', String(this.highScore));
    }

    private spawnFood(): Pos {
        let pos: Pos;
        do {
            pos = [Math.floor(Math.random() * HEIGHT), Math.floor(Math.random() * WIDTH)];
        } while (this.snake.some(seg => seg[0] === pos[0] && seg[1] === pos[1]));
        return pos;
    }

    private draw(): void {
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

    private magneticEffect(): Pos | null {
        const head = this.snake[0];
        const [hy, hx] = head;
        const [fy, fx] = this.food;
        const dist = Math.abs(hy - fy) + Math.abs(hx - fx);
        if (dist <= MAGNET_RADIUS) {
            const possible: { dist: number; dir: Pos }[] = [];
            for (const [dy, dx] of [[0,1],[0,-1],[1,0],[-1,0]]) {
                const ny = hy + dy;
                const nx = hx + dx;
                if (ny >= 0 && ny < HEIGHT && nx >= 0 && nx < WIDTH &&
                    !this.snake.some(seg => seg[0] === ny && seg[1] === nx)) {
                    const d = Math.abs(ny - fy) + Math.abs(nx - fx);
                    possible.push({ dist: d, dir: [dy, dx] });
                }
            }
            if (possible.length > 0) {
                possible.sort((a, b) => a.dist - b.dist);
                return possible[0].dir;
            }
        }
        return null;
    }

    private checkCollision(head: Pos): boolean {
        const [y, x] = head;
        if (y < 0 || y >= HEIGHT || x < 0 || x >= WIDTH) return true;
        for (let i = 1; i < this.snake.length; i++) {
            if (this.snake[i][0] === y && this.snake[i][1] === x) return true;
        }
        return false;
    }

    private moveSnake(): void {
        if (this.paused || this.gameOver) return;

        // Магнит
        if (!this.playerPressed) {
            const mag = this.magneticEffect();
            if (mag) {
                const head = this.snake[0];
                const [dy, dx] = this.direction;
                const currentDist = Math.abs(head[0] + dy - this.food[0]) + Math.abs(head[1] + dx - this.food[1]);
                const magDist = Math.abs(head[0] + mag[0] - this.food[0]) + Math.abs(head[1] + mag[1] - this.food[1]);
                if (magDist < currentDist) {
                    this.direction = mag;
                    this.nextDirection = mag;
                }
            }
        }

        const [dy, dx] = this.direction;
        const head = this.snake[0];
        const newHead: Pos = [head[0] + dy, head[1] + dx];
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

    public run(): void {
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
            if (this.playerPressed) {
                this.direction = this.nextDirection;
            }
        });

        this.draw();
        const interval = setInterval(() => {
            if (!this.running) {
                clearInterval(interval);
                process.stdin.setRawMode(false);
                console.log(BOLD + RED + `Игра окончена! Ваш счёт: ${this.score}` + RESET);
                if (this.score >= this.highScore) {
                    console.log(BOLD + YELLOW + 'Новый рекорд!' + RESET);
                }
                process.exit(0);
            }
            this.moveSnake();
        }, this.speed);
    }
}

const game = new SnakeGame();
game.run();
