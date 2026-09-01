# snake.py
# Snake (Magnetic) на Python

import sys
import os
import random
import time
import termios
import tty
import select
import json

# ANSI-цвета
RESET = "\033[0m"
GREEN = "\033[92m"
RED = "\033[91m"
YELLOW = "\033[93m"
BLUE = "\033[94m"
CYAN = "\033[96m"
BOLD = "\033[1m"

# Параметры поля
WIDTH = 20
HEIGHT = 15
MAGNET_RADIUS = 3

class SnakeGame:
    def __init__(self):
        self.score = 0
        self.high_score = self.load_record()
        self.snake = [(HEIGHT // 2, WIDTH // 2)]
        self.direction = (0, 1)  # (dy, dx) вправо
        self.next_direction = self.direction
        self.food = self.spawn_food()
        self.game_over = False
        self.paused = False
        self.speed = 0.15  # секунд на ход

    def load_record(self):
        try:
            with open("snake_record.txt", "r") as f:
                return int(f.read().strip())
        except:
            return 0

    def save_record(self):
        with open("snake_record.txt", "w") as f:
            f.write(str(self.high_score))

    def spawn_food(self):
        while True:
            pos = (random.randint(0, HEIGHT-1), random.randint(0, WIDTH-1))
            if pos not in self.snake:
                return pos

    def draw(self):
        # Скрываем курсор и перемещаем в начало
        sys.stdout.write("\033[?25l")
        sys.stdout.write("\033[H")
        sys.stdout.flush()

        # Рамка
        print(BOLD + CYAN + "+" + "-" * WIDTH + "+" + RESET)
        for y in range(HEIGHT):
            print(BOLD + CYAN + "|" + RESET, end="")
            for x in range(WIDTH):
                if (y, x) == self.snake[0]:
                    print(GREEN + "O" + RESET, end="")
                elif (y, x) in self.snake[1:]:
                    print(GREEN + "o" + RESET, end="")
                elif (y, x) == self.food:
                    print(RED + "★" + RESET, end="")
                else:
                    print(" ", end="")
            print(BOLD + CYAN + "|" + RESET)
        print(BOLD + CYAN + "+" + "-" * WIDTH + "+" + RESET)

        # Информация
        print(f"Счёт: {YELLOW}{self.score}{RESET}  Рекорд: {YELLOW}{self.high_score}{RESET}")
        if self.paused:
            print(BOLD + "ПАУЗА" + RESET)
        print(f"Управление: стрелки, P - пауза, Q - выход")

    def magnetic_effect(self):
        """Если голова в радиусе действия, скорректировать направление."""
        head_y, head_x = self.snake[0]
        food_y, food_x = self.food
        dist = abs(head_y - food_y) + abs(head_x - food_x)
        if dist <= MAGNET_RADIUS:
            # Определяем наилучшее направление (по приоритету)
            possible = []
            for dy, dx in [(0,1), (0,-1), (1,0), (-1,0)]:
                ny, nx = head_y + dy, head_x + dx
                if 0 <= ny < HEIGHT and 0 <= nx < WIDTH and (ny, nx) not in self.snake:
                    new_dist = abs(ny - food_y) + abs(nx - food_x)
                    possible.append((new_dist, (dy, dx)))
            if possible:
                # Выбираем направление, уменьшающее расстояние до еды
                best = min(possible, key=lambda x: x[0])
                # Если игрок не задал направление (или заданное невалидно), применяем магнит
                # Мы применим магнит только если текущее направление не ведёт к еде лучше
                # Но проще: если игрок не нажал клавишу, то магнит срабатывает.
                # В нашей реализации мы обрабатываем ввод в основном цикле,
                # а здесь только возвращаем рекомендуемое направление.
                # Мы передадим управление в основной цикл.
                return best[1]
        return None

    def move_snake(self):
        if self.paused or self.game_over:
            return

        # Применяем направление от игрока
        self.direction = self.next_direction
        head_y, head_x = self.snake[0]
        dy, dx = self.direction
        new_head = (head_y + dy, head_x + dx)

        # Проверяем магнитный эффект (если направление не привело к еде, пробуем магнит)
        # Если игрок не двигается к еде, а магнит может помочь, мы можем изменить направление
        # Но мы дадим приоритет игроку. Если игрок не нажимал клавишу, то next_direction == direction.
        # Если next_direction не ведёт к еде, а магнит может, то переопределим.
        magnet_dir = self.magnetic_effect()
        if magnet_dir:
            # Проверяем, ведёт ли текущее направление ближе к еде, чем магнитное
            current_dist = abs(head_y + dy - self.food[0]) + abs(head_x + dx - self.food[1])
            magnet_dist = abs(head_y + magnet_dir[0] - self.food[0]) + abs(head_x + magnet_dir[1] - self.food[1])
            if magnet_dist < current_dist:
                # Используем магнит, если игрок не нажал клавишу (т.е. next_direction == direction)
                # Чтобы не переопределять намерение игрока, проверим: если игрок нажал клавишу,
                # то next_direction отличается от direction? Мы обновляем next_direction при вводе.
                # Но мы не знаем, нажимал ли игрок. Поэтому будем применять магнит только если
                # текущее направление не изменилось (т.е. игрок не нажал клавишу).
                # Мы сохраним флаг, что игрок нажал клавишу.
                pass  # Реализовано в основном цикле

    def check_collision(self, head):
        y, x = head
        if y < 0 or y >= HEIGHT or x < 0 or x >= WIDTH:
            return True
        if head in self.snake[1:]:
            return True
        return False

    def run(self):
        # Настройка терминала для неблокирующего ввода
        fd = sys.stdin.fileno()
        old_settings = termios.tcgetattr(fd)
        try:
            tty.setraw(fd)
            # Основной цикл
            last_move = time.time()
            player_pressed = False
            while not self.game_over:
                # Обработка ввода
                if select.select([sys.stdin], [], [], 0)[0]:
                    key = sys.stdin.read(1)
                    if key == '\x1b':
                        # стрелка
                        seq = sys.stdin.read(2)
                        if seq == '[A':
                            if self.direction != (1, 0):
                                self.next_direction = (-1, 0)
                                player_pressed = True
                        elif seq == '[B':
                            if self.direction != (-1, 0):
                                self.next_direction = (1, 0)
                                player_pressed = True
                        elif seq == '[D':
                            if self.direction != (0, 1):
                                self.next_direction = (0, -1)
                                player_pressed = True
                        elif seq == '[C':
                            if self.direction != (0, -1):
                                self.next_direction = (0, 1)
                                player_pressed = True
                    elif key == 'p' or key == 'P' or key == ' ':
                        self.paused = not self.paused
                    elif key == 'q' or key == 'Q':
                        self.game_over = True
                        break

                # Если не пауза, двигаем змейку по таймеру
                if not self.paused and not self.game_over:
                    now = time.time()
                    if now - last_move >= self.speed:
                        # Применяем магнитное притяжение, если игрок не нажал клавишу
                        if not player_pressed:
                            magnet_dir = self.magnetic_effect()
                            if magnet_dir:
                                # Проверяем, не ведёт ли текущее направление к еде лучше
                                head_y, head_x = self.snake[0]
                                dy, dx = self.direction
                                current_dist = abs(head_y + dy - self.food[0]) + abs(head_x + dx - self.food[1])
                                magnet_dist = abs(head_y + magnet_dir[0] - self.food[0]) + abs(head_x + magnet_dir[1] - self.food[1])
                                if magnet_dist < current_dist:
                                    self.direction = magnet_dir
                                    self.next_direction = magnet_dir
                        # Двигаем
                        head_y, head_x = self.snake[0]
                        dy, dx = self.direction
                        new_head = (head_y + dy, head_x + dx)
                        # Проверка столкновений
                        if self.check_collision(new_head):
                            self.game_over = True
                            break
                        # Добавляем голову
                        self.snake.insert(0, new_head)
                        # Проверка еды
                        if new_head == self.food:
                            self.score += 1
                            if self.score > self.high_score:
                                self.high_score = self.score
                                self.save_record()
                            self.food = self.spawn_food()
                            # Увеличиваем скорость каждые 5 очков
                            level = self.score // 5
                            self.speed = max(0.05, 0.15 - level * 0.01)
                        else:
                            self.snake.pop()
                        last_move = now
                        player_pressed = False  # сброс флага после хода
                        self.draw()

                # Небольшая задержка для снижения нагрузки CPU
                time.sleep(0.02)
        finally:
            termios.tcsetattr(fd, termios.TCSADRAIN, old_settings)
            sys.stdout.write("\033[?25h")
            if self.game_over:
                print(BOLD + RED + "Игра окончена! Ваш счёт: " + str(self.score) + RESET)
                if self.score >= self.high_score:
                    print(BOLD + YELLOW + "Новый рекорд!" + RESET)
            else:
                print("Выход.")

if __name__ == "__main__":
    game = SnakeGame()
    game.run()
