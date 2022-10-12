/**
 * Save humans, destroy zombies!
 **/

// Games states
const GAME_PENDING = "pending"
const GAME_PLAY = "playing"
const GAME_WON = "won"
const GAME_LOST = "lost"

interface Position {
    x: number
    y: number
}

interface Polar {
    theta: number
    radius: number
}

type CharacterD = [number, number, number]

const TAU = 2 * Math.PI
const clamp = (value: number, min: number, max: number) => {
    return Math.min(Math.max(value, min), max)
}
const canvas2Cartesian = (v: Position, center: Position) => {
    return {
        x: v.x - center.x,
        y: -1 * (v.y - center.y)
    }
}
const cartesian2Canvas = (v: Position, center: Position) => {
    return {
        x: v.x + center.x,
        y: -1 * v.y + center.y
    }
}
const cartesian2Polar = (v: Position) => {
    return {
        theta: Math.atan2(v.y, v.x),
        radius: Math.sqrt(v.x ** 2 + v.y ** 2)
    }
}
const polar2Cartesian = (p: Polar) => {
    return {
        x: p.radius * Math.cos(p.theta),
        y: p.radius * Math.sin(p.theta)
    }
}
const polar2Canvas = (p: Polar, center: Position) => {
    return cartesian2Canvas(polar2Cartesian(p), center)
}
const canvas2Polar = (v: Position, center: Position): Polar => {
    return cartesian2Polar(canvas2Cartesian(v, center))
}
const normalize = (value: number) => {
    const rest = value % TAU
    return rest > 0 ? rest : TAU + rest
}
function shuffle(array) {
    let m = array.length
    let t = 0
    let i = 0

    while (m) {
        i = Math.floor(Math.random() * m--)

        t = array[m]
        array[m] = array[i]
        array[i] = t
    }

    return array
}
let fibCache = {}
const fibonacci = (n) => {
    if (n <= 1) {
        return n
    }
    if (fibCache[n]) {
        return fibCache[n]
    }
    const result = fibonacci(n - 1) + fibonacci(n - 2)
    fibCache[n] = result
    return result
}

class Character {
    id: number
    pos: Position
    speed: number

    constructor(id: number, speed: number, pos: Position) {
        this.id = id
        this.speed = speed
        this.pos = pos
    }

    move(pos: Position) {
        this.pos = pos
    }

    distanceTo(target: Position): number {
        const distance = Math.sqrt(
            (target.x - this.pos.x) * (target.x - this.pos.x) +
                (target.y - this.pos.y) * (target.y - this.pos.y)
        )
        return Math.round(distance)
    }

    getNextPos(target: Position) {
        const { theta, radius } = canvas2Polar(target, this.pos)
        const nextPos = polar2Canvas(
            { theta, radius: clamp(radius, 0, this.speed) },
            this.pos
        )
        return { x: Math.round(nextPos.x), y: Math.round(nextPos.y) }
    }

    findClosest(characters: Character[]) {
        let closest = { distance: -1, index: 0 }
        for (let i = 0; i < characters.length; i++) {
            const distance = this.distanceTo(characters[i].pos)
            if (distance < closest.distance) {
                closest = { distance, index: i }
            }
        }
        return characters[closest.index]
    }

    moveTo(target: Character) {
        const coord = this.getNextPos(target.pos)
        this.move(coord)
    }
}

class Ash extends Character {
    target: Zombie | null
    randomMoves = 0

    constructor(id: number, pos: Position) {
        super(id, 1000, pos)
    }

    randomMove() {
        const randX = Math.round(Math.random() * this.speed)
        const randY = Math.round(Math.random() * this.speed)
        const nextPos = this.getNextPos({ x: randX, y: randY })
        this.move(nextPos)
        this.randomMoves--
    }
}

class Human extends Character {
    constructor(id: number, pos: Position) {
        super(id, 0, pos)
    }
}

class Zombie extends Character {
    constructor(id: number, pos: Position) {
        super(id, 400, pos)
    }
}

class Game {
    height = 16000
    width = 9000

    score = 0
    firstMove: Position | null = null
    moveCount = 0
    status = GAME_PENDING

    ash: Ash
    humanCount: number
    zombieCount: number
    humans: Human[]
    zombies: Zombie[]

    constructor(
        ash: Position,
        humanCount: number,
        zombieCount: number,
        humans: CharacterD[],
        zombies: CharacterD[]
    ) {
        this.ash = new Ash(0, ash)
        this.humanCount = humanCount
        this.zombieCount = zombieCount
        this.humans = humans.map(
            (data) => new Human(data[0], { x: data[1], y: data[2] })
        )
        this.zombies = zombies.map(
            (data) => new Zombie(data[0], { x: data[1], y: data[2] })
        )
    }

    generateStrategy(): void {
        this.ash.randomMoves = Math.round(Math.random() * 3)
        this.zombies = shuffle(this.zombies)
    }

    zombiesMove(): void {
        for (let i = 0; i < this.zombies.length; i++) {
            const zombie = this.zombies[i]
            const closestHuman = zombie.findClosest([...this.humans, this.ash])
            zombie.moveTo(closestHuman)
        }
    }

    ashMove(): void {
        if (this.ash.randomMoves) {
            this.ash.randomMove()
        } else {
            if (!this.ash.target) {
                this.ash.target = this.zombies[0]
            }
            this.ash.moveTo(this.ash.target)
        }
        if (!this.firstMove) {
            this.firstMove = this.ash.pos
        }
        this.moveCount++
    }

    ashKill(): void {
        let killed = 0
        for (let i = 0; i < this.zombies.length; i++) {
            const zombie = this.zombies[i]
            const distance = this.ash.distanceTo(zombie.pos)
            if (distance < 2000) {
                if (this.ash.target == zombie) {
                    this.ash.target = null
                }
                // kill zombie
                this.zombies.splice(i, 1)
                this.zombieCount--
                killed++
                // update score
                this.score += this.calculateScore(killed)
            }
        }
    }

    zombiesKill(): void {
        for (let i = 0; i < this.zombies.length; i++) {
            for (let j = 0; j < this.humans.length; j++) {
                const zombie = this.zombies[i]
                const human = this.humans[j]

                const distance = zombie.distanceTo(human.pos)
                if (distance < 400) {
                    this.humans.splice(j, 1)
                    this.humanCount--
                }
            }
        }
    }

    calculateScore(killed: number): number {
        let score = this.humanCount * this.humanCount * 10
        if (killed > 0) {
            score *= fibonacci(killed + 2)
        }
        return score
    }

    updateStatus() {
        if (this.zombieCount == 0 && this.humanCount > 0) {
            this.status = GAME_WON
        } else if (this.zombieCount > 0 && this.humanCount == 0) {
            this.status = GAME_LOST
        }
    }

    playTurn(): void {
        this.zombiesMove()
        this.ashMove()
        this.ashKill()
        this.zombiesKill()
        this.updateStatus()
    }
}

class GameSimulator {
    simulatedGamesCount = 0
    wonGames: Game[]

    ash: Position
    humanCount: number
    humans: CharacterD[]
    zombieCount: number
    zombies: CharacterD[]

    // constructor(ash: Position, human_count: number, zombie_count: number, humans: CharacterData[], zombies: CharacterData[]) {
    //   this.ash = ash
    //   this.humanCount = human_count
    //   this.zombieCount = zombie_count
    //   this.humans = humans
    //   this.zombies = zombies
    //   this.wonGames = []
    // }

    update(
        ash: Position,
        human_count: number,
        zombie_count: number,
        humans: CharacterD[],
        zombies: CharacterD[]
    ) {
        this.simulatedGamesCount = 0
        this.ash = ash
        this.humanCount = human_count
        this.zombieCount = zombie_count
        this.humans = humans
        this.zombies = zombies
        this.wonGames = []
    }

    simulateGame(game: Game): Game {
        game.status = GAME_PLAY
        game.generateStrategy()

        while (game.status === GAME_PLAY) {
            game.playTurn()
        }

        return game
    }

    simulateGames() {
        const timer = new Date().getTime()
        const timeout = timer + 120
        while (true) {
            const game = new Game(
                this.ash,
                this.humanCount,
                this.zombieCount,
                this.humans,
                this.zombies
            )
            const res = this.simulateGame(game)

            this.simulatedGamesCount++

            if (res.status === GAME_WON) {
                this.wonGames.push(res)
            }

            if (new Date().getTime() >= timeout) {
                break
            }
        }
        console.error("games won ", this.wonGames.length)
        console.error("games simulated ", this.simulatedGamesCount)
    }

    findBestMove(): Position {
        if (this.wonGames.length) {
            let bestMove = this.wonGames[0]

            for (let i = 0; i < this.wonGames.length; i++) {
                const game = this.wonGames[i]
                if (game.score > bestMove.score) {
                    bestMove = game
                }
                if (game.moveCount < bestMove.moveCount) {
                    bestMove = game
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
            return bestMove.firstMove as Position
        } else {
            return { x: this.ash.x, y: this.ash.y }
        }
    }
}

const simulator = new GameSimulator()

// game loop
while (true) {
    const humans: CharacterD[] = []
    const zombies: CharacterD[] = []

    var inputs: string[] = readline().split(" ")
    const x: number = parseInt(inputs[0])
    const y: number = parseInt(inputs[1])

    const humanCount: number = parseInt(readline())
    for (let i = 0; i < humanCount; i++) {
        var inputs: string[] = readline().split(" ")
        const humanId: number = parseInt(inputs[0])
        const humanX: number = parseInt(inputs[1])
        const humanY: number = parseInt(inputs[2])
        humans.push([humanId, humanX, humanY])
    }
    const zombieCount: number = parseInt(readline())
    for (let i = 0; i < zombieCount; i++) {
        var inputs: string[] = readline().split(" ")
        const zombieId: number = parseInt(inputs[0])
        const zombieX: number = parseInt(inputs[1])
        const zombieY: number = parseInt(inputs[2])
        const zombieXNext: number = parseInt(inputs[3])
        const zombieYNext: number = parseInt(inputs[4])
        zombies.push([zombieId, zombieX, zombieY])
    }

    simulator.update({ x, y }, humanCount, zombieCount, humans, zombies)
    simulator.simulateGames()
    const bestMove = simulator.findBestMove()

    console.log(`${bestMove.x} ${bestMove.y}`)
    // // Write an action using console.log()
    // // To debug: console.error('Debug messages...');

    // console.log('0 0');     // Your destination coordinates
}
