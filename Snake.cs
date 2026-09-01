// Snake.cs
// Snake (Magnetic) на C#

using System;
using System.Collections.Generic;
using System.IO;
using System.Threading;

class SnakeGame
{
    private const string RESET = "\u001B[0m";
    private const string GREEN = "\u001B[92m";
    private const string RED = "\u001B[91m";
    private const string YELLOW = "\u001B[93m";
    private const string BLUE = "\u001B[94m";
    private const string CYAN = "\u001B[96m";
    private const string BOLD = "\u001B[1m";

    private const int WIDTH = 20;
    private const int HEIGHT = 15;
    private const int MAGNET_RADIUS = 3;

    private int score = 0;
    private int highScore;
    private List<(int, int)> snake = new List<(int, int)>();
    private (int dy, int dx) direction = (0, 1);
    private (int dy, int dx) nextDir = (0, 1);
    private (int y, int x) food;
    private bool gameOver = false;
    private bool paused = false;
    private int speedMs = 150;
    private bool playerPressed = false;
    private bool running = true;

    public SnakeGame()
    {
        highScore = LoadRecord();
        snake.Add((HEIGHT/2, WIDTH/2));
        food = SpawnFood();
    }

    private int LoadRecord()
    {
        try
        {
            return int.Parse(File.ReadAllText("snake_record.txt").Trim());
        }
        catch { return 0; }
    }

    private void SaveRecord()
    {
        File.WriteAllText("snake_record.txt", highScore.ToString());
    }

    private (int, int) SpawnFood()
    {
        Random rand = new Random();
        while (true)
        {
            int y = rand.Next(HEIGHT);
            int x = rand.Next(WIDTH);
            if (!snake.Contains((y, x)))
                return (y, x);
        }
    }

    private void Draw()
    {
        Console.Clear();
        Console.WriteLine(BOLD + CYAN + "+" + new string('-', WIDTH) + "+" + RESET);
        for (int y = 0; y < HEIGHT; y++)
        {
            Console.Write(BOLD + CYAN + "|" + RESET);
            for (int x = 0; x < WIDTH; x++)
            {
                if (y == snake[0].Item1 && x == snake[0].Item2)
                    Console.Write(GREEN + "O" + RESET);
                else if (snake.Contains((y, x)))
                    Console.Write(GREEN + "o" + RESET);
                else if (y == food.Item1 && x == food.Item2)
                    Console.Write(RED + "★" + RESET);
                else
                    Console.Write(" ");
            }
            Console.WriteLine(BOLD + CYAN + "|" + RESET);
        }
        Console.WriteLine(BOLD + CYAN + "+" + new string('-', WIDTH) + "+" + RESET);
        Console.WriteLine($"Счёт: {YELLOW}{score}{RESET}  Рекорд: {YELLOW}{highScore}{RESET}");
        if (paused) Console.WriteLine(BOLD + "ПАУЗА" + RESET);
        Console.WriteLine("Управление: стрелки (WASD), P - пауза, Q - выход");
    }

    private (int, int)? MagneticEffect()
    {
        var head = snake[0];
        int dist = Math.Abs(head.Item1 - food.Item1) + Math.Abs(head.Item2 - food.Item2);
        if (dist <= MAGNET_RADIUS)
        {
            var possible = new List<(int dist, int dy, int dx)>();
            foreach (var (dy, dx) in new (int, int)[] {(0,1),(0,-1),(1,0),(-1,0)})
            {
                int ny = head.Item1 + dy;
                int nx = head.Item2 + dx;
                if (ny >= 0 && ny < HEIGHT && nx >= 0 && nx < WIDTH && !snake.Contains((ny, nx)))
                {
                    int nd = Math.Abs(ny - food.Item1) + Math.Abs(nx - food.Item2);
                    possible.Add((nd, dy, dx));
                }
            }
            if (possible.Count > 0)
            {
                possible.Sort((a,b) => a.dist.CompareTo(b.dist));
                return (possible[0].dy, possible[0].dx);
            }
        }
        return null;
    }

    private bool CheckCollision((int y, int x) head)
    {
        if (head.y < 0 || head.y >= HEIGHT || head.x < 0 || head.x >= WIDTH)
            return true;
        for (int i = 1; i < snake.Count; i++)
            if (snake[i] == head)
                return true;
        return false;
    }

    private void MoveSnake()
    {
        if (paused || gameOver) return;

        if (!playerPressed)
        {
            var mag = MagneticEffect();
            if (mag.HasValue)
            {
                var head = snake[0];
                int currentDist = Math.Abs(head.Item1 + direction.dy - food.Item1) + Math.Abs(head.Item2 + direction.dx - food.Item2);
                int magDist = Math.Abs(head.Item1 + mag.Value.Item1 - food.Item1) + Math.Abs(head.Item2 + mag.Value.Item2 - food.Item2);
                if (magDist < currentDist)
                {
                    direction = mag.Value;
                    nextDir = mag.Value;
                }
            }
        }

        var newHead = (y: snake[0].Item1 + direction.dy, x: snake[0].Item2 + direction.dx);
        if (CheckCollision(newHead))
        {
            gameOver = true;
            return;
        }
        snake.Insert(0, newHead);
        if (newHead == food)
        {
            score++;
            if (score > highScore)
            {
                highScore = score;
                SaveRecord();
            }
            food = SpawnFood();
            int level = score / 5;
            speedMs = Math.Max(50, 150 - level * 10);
        }
        else
        {
            snake.RemoveAt(snake.Count - 1);
        }
        playerPressed = false;
        Draw();
    }

    public void Run()
    {
        Console.Clear();
        Draw();
        Thread inputThread = new Thread(() =>
        {
            while (running)
            {
                if (Console.KeyAvailable)
                {
                    var key = Console.ReadKey(true).Key;
                    switch (key)
                    {
                        case ConsoleKey.UpArrow:
                            if (direction.dy != 1) { nextDir = (-1, 0); playerPressed = true; }
                            break;
                        case ConsoleKey.DownArrow:
                            if (direction.dy != -1) { nextDir = (1, 0); playerPressed = true; }
                            break;
                        case ConsoleKey.LeftArrow:
                            if (direction.dx != 1) { nextDir = (0, -1); playerPressed = true; }
                            break;
                        case ConsoleKey.RightArrow:
                            if (direction.dx != -1) { nextDir = (0, 1); playerPressed = true; }
                            break;
                        case ConsoleKey.P:
                            paused = !paused;
                            break;
                        case ConsoleKey.Q:
                            running = false;
                            gameOver = true;
                            break;
                    }
                    if (playerPressed)
                        direction = nextDir;
                }
                Thread.Sleep(50);
            }
        });
        inputThread.IsBackground = true;
        inputThread.Start();

        while (running)
        {
            Thread.Sleep(speedMs);
            if (!gameOver && !paused)
                MoveSnake();
        }

        Console.WriteLine(BOLD + RED + $"Игра окончена! Ваш счёт: {score}" + RESET);
        if (score >= highScore)
            Console.WriteLine(BOLD + YELLOW + "Новый рекорд!" + RESET);
    }

    static void Main()
    {
        SnakeGame game = new SnakeGame();
        game.Run();
    }
}
