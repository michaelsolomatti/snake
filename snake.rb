# snake.rb
# Snake (Magnetic) на Ruby

require 'io/console'
require 'time'

RESET = "\033[0m"
GREEN = "\033[92m"
RED = "\033[91m"
YELLOW = "\033[93m"
BLUE = "\033[94m"
CYAN = "\033[96m"
BOLD = "\033[1m"

def colorize(text, color)
  "#{color}#{text}#{RESET}"
end

WIDTH = 20
HEIGHT = 15
MAGNET_RADIUS = 3

class SnakeGame
  def initialize
    @score = 0
    @high_score = load_record
    @snake = [[HEIGHT/2, WIDTH/2]]
    @direction = [0, 1]
    @next_dir = [0, 1]
    @food = spawn_food
    @game_over = false
    @paused = false
    @speed = 0.15 # seconds per move
    @player_pressed = false
    @running = true
  end

  def load_record
    File.read('snake_record.txt').to_i rescue 0
  end

  def save_record
    File.write('snake_record.txt', @high_score)
  end

  def spawn_food
    loop do
      pos = [rand(HEIGHT), rand(WIDTH)]
      return pos unless @snake.include?(pos)
    end
  end

  def draw
    system('clear') || system('cls')
    puts colorize("+" + "-" * WIDTH + "+", BOLD + CYAN)
    HEIGHT.times do |y|
      print colorize("|", BOLD + CYAN)
      WIDTH.times do |x|
        if y == @snake[0][0] && x == @snake[0][1]
          print colorize("O", GREEN)
        elsif @snake[1..-1].include?([y, x])
          print colorize("o", GREEN)
        elsif y == @food[0] && x == @food[1]
          print colorize("★", RED)
        else
          print " "
        end
      end
      puts colorize("|", BOLD + CYAN)
    end
    puts colorize("+" + "-" * WIDTH + "+", BOLD + CYAN)
    puts "Счёт: #{colorize(@score, YELLOW)}  Рекорд: #{colorize(@high_score, YELLOW)}"
    puts colorize("ПАУЗА", BOLD) if @paused
    puts "Управление: стрелки (WASD), P - пауза, Q - выход"
  end

  def magnetic_effect
    head = @snake[0]
    dist = (head[0] - @food[0]).abs + (head[1] - @food[1]).abs
    if dist <= MAGNET_RADIUS
      possible = []
      [[0,1],[0,-1],[1,0],[-1,0]].each do |dy, dx|
        ny = head[0] + dy
        nx = head[1] + dx
        if ny >= 0 && ny < HEIGHT && nx >= 0 && nx < WIDTH && !@snake.include?([ny, nx])
          nd = (ny - @food[0]).abs + (nx - @food[1]).abs
          possible << {dist: nd, dy: dy, dx: dx}
        end
      end
      unless possible.empty?
        possible.sort_by! { |p| p[:dist] }
        return [possible[0][:dy], possible[0][:dx]]
      end
    end
    nil
  end

  def collision?(head)
    y, x = head
    return true if y < 0 || y >= HEIGHT || x < 0 || x >= WIDTH
    return true if @snake[1..-1].include?(head)
    false
  end

  def move_snake
    return if @paused || @game_over

    unless @player_pressed
      mag = magnetic_effect
      if mag
        head = @snake[0]
        current_dist = (head[0] + @direction[0] - @food[0]).abs + (head[1] + @direction[1] - @food[1]).abs
        mag_dist = (head[0] + mag[0] - @food[0]).abs + (head[1] + mag[1] - @food[1]).abs
        if mag_dist < current_dist
          @direction = mag
          @next_dir = mag
        end
      end
    end

    head = @snake[0]
    new_head = [head[0] + @direction[0], head[1] + @direction[1]]
    if collision?(new_head)
      @game_over = true
      return
    end
    @snake.unshift(new_head)
    if new_head == @food
      @score += 1
      if @score > @high_score
        @high_score = @score
        save_record
      end
      @food = spawn_food
      level = @score / 5
      @speed = [0.05, 0.15 - level * 0.01].max
    else
      @snake.pop
    end
    @player_pressed = false
    draw
  end

  def run
    draw
    last_move = Time.now
    Thread.new do
      while @running
        char = STDIN.getch
        case char
        when "\x1b"
          seq = STDIN.getch + STDIN.getch
          if seq == '[A' && @direction[0] != 1
            @next_dir = [-1, 0]; @player_pressed = true
          elsif seq == '[B' && @direction[0] != -1
            @next_dir = [1, 0]; @player_pressed = true
          elsif seq == '[D' && @direction[1] != 1
            @next_dir = [0, -1]; @player_pressed = true
          elsif seq == '[C' && @direction[1] != -1
            @next_dir = [0, 1]; @player_pressed = true
          end
        when 'p', 'P'
          @paused = !@paused
        when 'q', 'Q'
          @running = false
          @game_over = true
        end
        @direction = @next_dir if @player_pressed
      end
    end

    while @running
      now = Time.now
      if now - last_move >= @speed
        if !@paused && !@game_over
          move_snake
        end
        last_move = now
      end
      sleep 0.02
    end

    puts colorize("Игра окончена! Ваш счёт: #{@score}", BOLD + RED)
    puts colorize("Новый рекорд!", BOLD + YELLOW) if @score >= @high_score
  end
end

game = SnakeGame.new
game.run
