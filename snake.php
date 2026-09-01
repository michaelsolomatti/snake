<?php
// snake.php
// Snake (Magnetic) на PHP

if (php_sapi_name() !== 'cli') {
    die("Это консольное приложение.\n");
}

define('RESET', "\033[0m");
define('GREEN', "\033[92m");
define('RED', "\033[91m");
define('YELLOW', "\033[93m");
define('BLUE', "\033[94m");
define('CYAN', "\033[96m");
define('BOLD', "\033[1m");

function colorize($text, $color) {
    return $color . $text . RESET;
}

const WIDTH = 20;
const HEIGHT = 15;
const MAGNET_RADIUS = 3;

class SnakeGame {
    private $score = 0;
    private $highScore;
    private $snake;
    private $direction = [0, 1];
    private $nextDir = [0, 1];
    private $food;
    private $gameOver = false;
    private $paused = false;
    private $speed = 150; // ms
    private $playerPressed = false;
    private $running = true;

    public function __construct() {
        $this->highScore = $this->loadRecord();
        $this->snake = [[floor(HEIGHT/2), floor(WIDTH/2)]];
        $this->food = $this->spawnFood();
    }

    private function loadRecord() {
        if (file_exists('snake_record.txt')) {
            return (int)trim(file_get_contents('snake_record.txt'));
        }
        return 0;
    }

    private function saveRecord() {
        file_put_contents('snake_record.txt', $this->highScore);
    }

    private function spawnFood() {
        while (true) {
            $pos = [rand(0, HEIGHT-1), rand(0, WIDTH-1)];
            if (!in_array($pos, $this->snake, true)) return $pos;
        }
    }

    private function draw() {
        echo "\033[H\033[2J";
        echo colorize("+" . str_repeat("-", WIDTH) . "+", BOLD . CYAN) . "\n";
        for ($y = 0; $y < HEIGHT; $y++) {
            echo colorize("|", BOLD . CYAN);
            for ($x = 0; $x < WIDTH; $x++) {
                if ($y == $this->snake[0][0] && $x == $this->snake[0][1]) {
                    echo colorize("O", GREEN);
                } elseif ($this->inSnake($y, $x)) {
                    echo colorize("o", GREEN);
                } elseif ($y == $this->food[0] && $x == $this->food[1]) {
                    echo colorize("★", RED);
                } else {
                    echo " ";
                }
            }
            echo colorize("|", BOLD . CYAN) . "\n";
        }
        echo colorize("+" . str_repeat("-", WIDTH) . "+", BOLD . CYAN) . "\n";
        printf("Счёт: %s%d%s  Рекорд: %s%d%s\n", YELLOW, $this->score, RESET, YELLOW, $this->highScore, RESET);
        if ($this->paused) echo colorize("ПАУЗА", BOLD) . "\n";
        echo "Управление: стрелки (WASD), P - пауза, Q - выход\n";
    }

    private function inSnake($y, $x) {
        for ($i = 1; $i < count($this->snake); $i++) {
            if ($this->snake[$i][0] == $y && $this->snake[$i][1] == $x) return true;
        }
        return false;
    }

    private function magneticEffect() {
        $head = $this->snake[0];
        $dist = abs($head[0] - $this->food[0]) + abs($head[1] - $this->food[1]);
        if ($dist <= MAGNET_RADIUS) {
            $possible = [];
            foreach ([[0,1],[0,-1],[1,0],[-1,0]] as $dir) {
                $ny = $head[0] + $dir[0];
                $nx = $head[1] + $dir[1];
                if ($ny >= 0 && $ny < HEIGHT && $nx >= 0 && $nx < WIDTH && !$this->inSnake($ny, $nx)) {
                    $nd = abs($ny - $this->food[0]) + abs($nx - $this->food[1]);
                    $possible[] = ['dist' => $nd, 'dy' => $dir[0], 'dx' => $dir[1]];
                }
            }
            if (!empty($possible)) {
                usort($possible, function($a, $b) { return $a['dist'] - $b['dist']; });
                return [$possible[0]['dy'], $possible[0]['dx']];
            }
        }
        return null;
    }

    private function checkCollision($head) {
        if ($head[0] < 0 || $head[0] >= HEIGHT || $head[1] < 0 || $head[1] >= WIDTH) return true;
        for ($i = 1; $i < count($this->snake); $i++) {
            if ($this->snake[$i][0] == $head[0] && $this->snake[$i][1] == $head[1]) return true;
        }
        return false;
    }

    private function moveSnake() {
        if ($this->paused || $this->gameOver) return;

        if (!$this->playerPressed) {
            $mag = $this->magneticEffect();
            if ($mag) {
                $head = $this->snake[0];
                $currentDist = abs($head[0] + $this->direction[0] - $this->food[0]) + abs($head[1] + $this->direction[1] - $this->food[1]);
                $magDist = abs($head[0] + $mag[0] - $this->food[0]) + abs($head[1] + $mag[1] - $this->food[1]);
                if ($magDist < $currentDist) {
                    $this->direction = $mag;
                    $this->nextDir = $mag;
                }
            }
        }

        $head = $this->snake[0];
        $newHead = [$head[0] + $this->direction[0], $head[1] + $this->direction[1]];
        if ($this->checkCollision($newHead)) {
            $this->gameOver = true;
            return;
        }
        array_unshift($this->snake, $newHead);
        if ($newHead[0] == $this->food[0] && $newHead[1] == $this->food[1]) {
            $this->score++;
            if ($this->score > $this->highScore) {
                $this->highScore = $this->score;
                $this->saveRecord();
            }
            $this->food = $this->spawnFood();
            $level = intdiv($this->score, 5);
            $this->speed = max(50, 150 - $level * 10);
        } else {
            array_pop($this->snake);
        }
        $this->playerPressed = false;
        $this->draw();
    }

    public function run() {
        system('stty -echo cbreak');
        $this->draw();
        $lastMove = microtime(true);
        while ($this->running) {
            // Неблокирующий ввод
            $read = [STDIN];
            $write = [];
            $except = [];
            if (stream_select($read, $write, $except, 0, 50000)) {
                $key = fread(STDIN, 1);
                if ($key === "\x1b") {
                    // стрелка
                    $seq = fread(STDIN, 2);
                    if ($seq == '[A' && $this->direction[0] != 1) {
                        $this->nextDir = [-1, 0];
                        $this->playerPressed = true;
                    } elseif ($seq == '[B' && $this->direction[0] != -1) {
                        $this->nextDir = [1, 0];
                        $this->playerPressed = true;
                    } elseif ($seq == '[D' && $this->direction[1] != 1) {
                        $this->nextDir = [0, -1];
                        $this->playerPressed = true;
                    } elseif ($seq == '[C' && $this->direction[1] != -1) {
                        $this->nextDir = [0, 1];
                        $this->playerPressed = true;
                    }
                } elseif ($key == 'p' || $key == 'P') {
                    $this->paused = !$this->paused;
                } elseif ($key == 'q' || $key == 'Q') {
                    $this->running = false;
                    $this->gameOver = true;
                }
                if ($this->playerPressed) {
                    $this->direction = $this->nextDir;
                }
            }

            // Движение по таймеру
            $now = microtime(true) * 1000;
            if ($now - $lastMove >= $this->speed) {
                if (!$this->paused && !$this->gameOver) {
                    $this->moveSnake();
                }
                $lastMove = $now;
            }
            usleep(20000);
        }
        system('stty echo -cbreak');
        echo colorize("Игра окончена! Ваш счёт: " . $this->score, BOLD . RED) . "\n";
        if ($this->score >= $this->highScore) {
            echo colorize("Новый рекорд!", BOLD . YELLOW) . "\n";
        }
    }
}

$game = new SnakeGame();
$game->run();
