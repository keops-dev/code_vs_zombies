/**
 * Save humans, destroy zombies!
 **/
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
// Games states
var GAME_PENDING = "pending";
var GAME_PLAY = "playing";
var GAME_WON = "won";
var GAME_LOST = "lost";
var TAU = 2 * Math.PI;
var clamp = function (value, min, max) {
    return Math.min(Math.max(value, min), max);
};
var canvas2Cartesian = function (v, center) {
    return {
        x: v.x - center.x,
        y: -1 * (v.y - center.y)
    };
};
var cartesian2Canvas = function (v, center) {
    return {
        x: v.x + center.x,
        y: -1 * v.y + center.y
    };
};
var cartesian2Polar = function (v) {
    return {
        theta: Math.atan2(v.y, v.x),
        radius: Math.sqrt(Math.pow(v.x, 2) + Math.pow(v.y, 2))
    };
};
var polar2Cartesian = function (p) {
    return {
        x: p.radius * Math.cos(p.theta),
        y: p.radius * Math.sin(p.theta)
    };
};
var polar2Canvas = function (p, center) {
    return cartesian2Canvas(polar2Cartesian(p), center);
};
var canvas2Polar = function (v, center) {
    return cartesian2Polar(canvas2Cartesian(v, center));
};
var normalize = function (value) {
    var rest = value % TAU;
    return rest > 0 ? rest : TAU + rest;
};
function shuffle(array) {
    var m = array.length;
    var t = 0;
    var i = 0;
    while (m) {
        i = Math.floor(Math.random() * m--);
        t = array[m];
        array[m] = array[i];
        array[i] = t;
    }
    return array;
}
var fibCache = {};
var fibonacci = function (n) {
    if (n <= 1) {
        return n;
    }
    if (fibCache[n]) {
        return fibCache[n];
    }
    var result = fibonacci(n - 1) + fibonacci(n - 2);
    fibCache[n] = result;
    return result;
};
var Character = /** @class */ (function () {
    function Character(id, speed, pos) {
        this.id = id;
        this.speed = speed;
        this.pos = pos;
    }
    Character.prototype.move = function (pos) {
        this.pos = pos;
    };
    Character.prototype.distanceTo = function (target) {
        var distance = Math.sqrt((target.x - this.pos.x) * (target.x - this.pos.x) +
            (target.y - this.pos.y) * (target.y - this.pos.y));
        return Math.round(distance);
    };
    Character.prototype.getNextPos = function (target) {
        var _a = canvas2Polar(target, this.pos), theta = _a.theta, radius = _a.radius;
        var nextPos = polar2Canvas({ theta: theta, radius: clamp(radius, 0, this.speed) }, this.pos);
        return { x: Math.round(nextPos.x), y: Math.round(nextPos.y) };
    };
    Character.prototype.findClosest = function (characters) {
        var closest = { distance: -1, index: 0 };
        for (var i = 0; i < characters.length; i++) {
            var distance = this.distanceTo(characters[i].pos);
            if (distance < closest.distance) {
                closest = { distance: distance, index: i };
            }
        }
        return characters[closest.index];
    };
    Character.prototype.moveTo = function (target) {
        var coord = this.getNextPos(target.pos);
        this.move(coord);
    };
    return Character;
}());
var Ash = /** @class */ (function (_super) {
    __extends(Ash, _super);
    function Ash(id, pos) {
        var _this = _super.call(this, id, 1000, pos) || this;
        _this.randomMoves = 0;
        return _this;
    }
    Ash.prototype.randomMove = function () {
        var randX = Math.round(Math.random() * this.speed);
        var randY = Math.round(Math.random() * this.speed);
        var nextPos = this.getNextPos({ x: randX, y: randY });
        this.move(nextPos);
        this.randomMoves--;
    };
    return Ash;
}(Character));
var Human = /** @class */ (function (_super) {
    __extends(Human, _super);
    function Human(id, pos) {
        return _super.call(this, id, 0, pos) || this;
    }
    return Human;
}(Character));
var Zombie = /** @class */ (function (_super) {
    __extends(Zombie, _super);
    function Zombie(id, pos) {
        return _super.call(this, id, 400, pos) || this;
    }
    return Zombie;
}(Character));
var Game = /** @class */ (function () {
    function Game(ash, humanCount, zombieCount, humans, zombies) {
        this.height = 16000;
        this.width = 9000;
        this.score = 0;
        this.firstMove = null;
        this.moveCount = 0;
        this.status = GAME_PENDING;
        this.ash = new Ash(0, ash);
        this.humanCount = humanCount;
        this.zombieCount = zombieCount;
        this.humans = humans.map(function (data) { return new Human(data[0], { x: data[1], y: data[2] }); });
        this.zombies = zombies.map(function (data) { return new Zombie(data[0], { x: data[1], y: data[2] }); });
    }
    Game.prototype.generateStrategy = function () {
        this.ash.randomMoves = Math.round(Math.random() * 3);
        this.zombies = shuffle(this.zombies);
    };
    Game.prototype.zombiesMove = function () {
        for (var i = 0; i < this.zombies.length; i++) {
            var zombie = this.zombies[i];
            var closestHuman = zombie.findClosest(__spreadArray(__spreadArray([], this.humans, true), [this.ash], false));
            zombie.moveTo(closestHuman);
        }
    };
    Game.prototype.ashMove = function () {
        if (this.ash.randomMoves) {
            this.ash.randomMove();
        }
        else {
            if (!this.ash.target) {
                this.ash.target = this.zombies[0];
            }
            this.ash.moveTo(this.ash.target);
        }
        if (!this.firstMove) {
            this.firstMove = this.ash.pos;
        }
        this.moveCount++;
    };
    Game.prototype.ashKill = function () {
        var killed = 0;
        for (var i = 0; i < this.zombies.length; i++) {
            var zombie = this.zombies[i];
            var distance = this.ash.distanceTo(zombie.pos);
            if (distance < 2000) {
                if (this.ash.target == zombie) {
                    this.ash.target = null;
                }
                // kill zombie
                this.zombies.splice(i, 1);
                this.zombieCount--;
                killed++;
                // update score
                this.score += this.calculateScore(killed);
            }
        }
    };
    Game.prototype.zombiesKill = function () {
        for (var i = 0; i < this.zombies.length; i++) {
            for (var j = 0; j < this.humans.length; j++) {
                var zombie = this.zombies[i];
                var human = this.humans[j];
                var distance = zombie.distanceTo(human.pos);
                if (distance < 400) {
                    this.humans.splice(j, 1);
                    this.humanCount--;
                }
            }
        }
    };
    Game.prototype.calculateScore = function (killed) {
        var score = this.humanCount * this.humanCount * 10;
        if (killed > 0) {
            score *= fibonacci(killed + 2);
        }
        return score;
    };
    Game.prototype.updateStatus = function () {
        if (this.zombieCount == 0 && this.humanCount > 0) {
            this.status = GAME_WON;
        }
        else if (this.zombieCount > 0 && this.humanCount == 0) {
            this.status = GAME_LOST;
        }
    };
    Game.prototype.playTurn = function () {
        this.zombiesMove();
        this.ashMove();
        this.ashKill();
        this.zombiesKill();
        this.updateStatus();
    };
    return Game;
}());
var GameSimulator = /** @class */ (function () {
    function GameSimulator() {
        this.simulatedGamesCount = 0;
    }
    // constructor(ash: Position, human_count: number, zombie_count: number, humans: CharacterData[], zombies: CharacterData[]) {
    //   this.ash = ash
    //   this.humanCount = human_count
    //   this.zombieCount = zombie_count
    //   this.humans = humans
    //   this.zombies = zombies
    //   this.wonGames = []
    // }
    GameSimulator.prototype.update = function (ash, human_count, zombie_count, humans, zombies) {
        this.simulatedGamesCount = 0;
        this.ash = ash;
        this.humanCount = human_count;
        this.zombieCount = zombie_count;
        this.humans = humans;
        this.zombies = zombies;
        this.wonGames = [];
    };
    GameSimulator.prototype.simulateGame = function (game) {
        game.status = GAME_PLAY;
        game.generateStrategy();
        while (game.status === GAME_PLAY) {
            game.playTurn();
        }
        return game;
    };
    GameSimulator.prototype.simulateGames = function () {
        var timer = new Date().getTime();
        var timeout = timer + 120;
        while (true) {
            var game = new Game(this.ash, this.humanCount, this.zombieCount, this.humans, this.zombies);
            var res = this.simulateGame(game);
            this.simulatedGamesCount++;
            if (res.status === GAME_WON) {
                this.wonGames.push(res);
            }
            if (new Date().getTime() >= timeout) {
                break;
            }
        }
        console.error("games won ", this.wonGames.length);
        console.error("games simulated ", this.simulatedGamesCount);
    };
    GameSimulator.prototype.findBestMove = function () {
        if (this.wonGames.length) {
            var bestMove = this.wonGames[0];
            for (var i = 0; i < this.wonGames.length; i++) {
                var game = this.wonGames[i];
                if (game.score > bestMove.score) {
                    bestMove = game;
                }
                if (game.moveCount < bestMove.moveCount) {
                    bestMove = game;
                }
            }
            // sort by highest score
            // this.wonGames.sort((a, b) => {
            //   if (a.score < b.score) {
            //     return 1
            //   }
            //   if (a.score > b.score) {
            //     return -1
            //   }
            //   return 0
            // })
            // // sort by the lowest number of moves
            // this.wonGames.sort((a, b) => {
            //   if (a.moveCount < b.moveCount) {
            //     return -1
            //   }
            //   if (a.moveCount > b.moveCount) {
            //     return 1
            //   }
            //   return 0
            // })
            // return this.wonGames[0].firstMove
            // console.error("best game ", bestMove)
            return bestMove.firstMove;
        }
        else {
            return { x: this.ash.x, y: this.ash.y };
        }
    };
    return GameSimulator;
}());
var simulator = new GameSimulator();
// game loop
while (true) {
    var humans = [];
    var zombies = [];
    var inputs = readline().split(" ");
    var x = parseInt(inputs[0]);
    var y = parseInt(inputs[1]);
    var humanCount = parseInt(readline());
    for (var i = 0; i < humanCount; i++) {
        var inputs = readline().split(" ");
        var humanId = parseInt(inputs[0]);
        var humanX = parseInt(inputs[1]);
        var humanY = parseInt(inputs[2]);
        humans.push([humanId, humanX, humanY]);
    }
    var zombieCount = parseInt(readline());
    for (var i = 0; i < zombieCount; i++) {
        var inputs = readline().split(" ");
        var zombieId = parseInt(inputs[0]);
        var zombieX = parseInt(inputs[1]);
        var zombieY = parseInt(inputs[2]);
        var zombieXNext = parseInt(inputs[3]);
        var zombieYNext = parseInt(inputs[4]);
        zombies.push([zombieId, zombieX, zombieY]);
    }
    simulator.update({ x: x, y: y }, humanCount, zombieCount, humans, zombies);
    simulator.simulateGames();
    var bestMove = simulator.findBestMove();
    console.log("".concat(bestMove.x, " ").concat(bestMove.y));
    // // Write an action using console.log()
    // // To debug: console.error('Debug messages...');
    // console.log('0 0');     // Your destination coordinates
}
