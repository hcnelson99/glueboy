let keyPressed: {[k: string]: [boolean, boolean]} = {"ArrowUp": [false, false], "ArrowDown": [false, false], "ArrowLeft": [false, false], "ArrowRight": [false, false]};
let canvas: HTMLCanvasElement;
let canvas_bounding_box: ClientRect | DOMRect;
let ctx: CanvasRenderingContext2D;
let num_blocks = 10;
let block_size: number;
let last_timestamp: number;
let events: (MouseEvent | KeyboardEvent)[] = [];
let glue_boy: GlueBoy;
let mouse_pos: Vec2;

enum BlockType {
    Empty,
    Box,
}

let block_colors: Map<BlockType, Color> = new Map();

block_colors.set(BlockType.Empty, [0, 0, 0]);
block_colors.set(BlockType.Box, [127, 63, 0]);

let placing: BlockType = BlockType.Empty;

interface Block {
    type: BlockType;
}

let blocks: Block[][];

let last_key: {key: string, timestamp: number};

interface MoveAnimation {
    start_pos: Vec2;
    dpos: Vec2;
    distance: number;
    speed: number; // tiles per second
    t: number;
}

class GlueBoy {
    public visual_pos: Vec2;
    public pos: Vec2;
    public move_animations: MoveAnimation[] = [];
    constructor(row: number, col: number) {
        this.pos = {row: row, col: col};
        this.visual_pos = {...this.pos};
    }
}

type Color = [number, number, number]

interface Vec2 {
    row: number;
    col: number;
}

function v2(row: number, col: number): Vec2 {
    return {row, col};
}

function assert(condition: boolean, message = ""): void {
    if (!condition) {
        alert("Assertion failed: " + message);
        console.trace();
    }
}

function colorToString(color: Color): string {
    return "rgb(" + color[0] + "," + color[1] + "," + color[2] + ")";
}

function drawTile(row: number, col: number, color: Color): void {

    ctx.beginPath();
    ctx.rect(col*block_size, row*block_size, block_size, block_size);
    ctx.fillStyle = colorToString(color);
    ctx.fill();
    ctx.strokeStyle = colorToString([255, 255, 255]);
    ctx.stroke();

}

function randomColor(): Color {
    return [Math.random() * 255, Math.random() * 255, Math.random() * 255];
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let row = 0; row < num_blocks; row++) {
        for (let col = 0; col < num_blocks; col++) {
            let color: Color;

            if (row == glue_boy.pos.row && col == glue_boy.pos.col) {
                color = [0, 0, 255];
            } else if (row == mouse_pos.row && col == mouse_pos.col) {
                color = block_colors.get(placing) || [255, 0, 0];
            } else {
                color = block_colors.get(blocks[row][col].type) || [255, 0, 0];
            }
            drawTile(row, col, color);
        }
    }


    {
        ctx.beginPath();
        ctx.rect(glue_boy.visual_pos.col * block_size, glue_boy.visual_pos.row * block_size, block_size, block_size);
        ctx.fillStyle = colorToString([255, 255, 0]);
        ctx.fill();
    }
}

function loop(timestamp: number): void {
    timestamp /= 1000;
    let dt: number;
    if (last_timestamp) {
        dt = timestamp - last_timestamp;
    } else {
        dt = 0;
    }
    last_timestamp = timestamp;


    let mouse_clicked = false;
    let e;
    while (e = events.shift()) {
        if (e instanceof KeyboardEvent) {
            if (e.type == "keydown") {
                keyPressed[e.code] = [true, true];
                console.log(e.code);
            } else if (e.type == "keyup") {
                keyPressed[e.code] = [false, true];
            }
        } else if (e instanceof MouseEvent) {
            console.log(e);
            if (e.type == "click") {
                mouse_clicked = true;
            }
            mouse_pos.row = (e.clientY - canvas_bounding_box.top) / block_size | 0;
            mouse_pos.col = (e.clientX - canvas_bounding_box.left) / block_size | 0;
        } else {
            assert(false, "unhandled event type");
        }
    }

    function glue_boy_move(row: number, col: number) {

        let from = {...glue_boy.pos};

        glue_boy.pos.row += row;
        glue_boy.pos.col += col;

        let dpos = {row, col};
        glue_boy.move_animations.push({start_pos: from, dpos, distance: dist(v2(0, 0), dpos), speed: 10, t: 0});
    }

    let move_delay = 1 / 7;

    if (keyPressed["ArrowLeft"][0]) {
        if (keyPressed["ArrowLeft"][1] || !last_key || last_key.key != "left" || last_key.timestamp + move_delay < timestamp) {
            glue_boy_move(0, -1);
            last_key = {key: "left", timestamp};
        }
    } else if (keyPressed["ArrowRight"][0]) {
        if (keyPressed["ArrowRight"][1] || !last_key || last_key.key != "right" || last_key.timestamp + move_delay < timestamp) {
            glue_boy_move(0, 1);
            last_key = {key: "right", timestamp};
        }
    } else if (keyPressed["ArrowUp"][0]) {
        if (keyPressed["ArrowUp"][1] || !last_key || last_key.key != "up" || last_key.timestamp + move_delay < timestamp) {
            glue_boy_move(-1, 0);
            last_key = {key: "up", timestamp};
        }
    } else if (keyPressed["ArrowDown"][0]) {
        if (keyPressed["ArrowDown"][1] || !last_key || last_key.key != "down" || last_key.timestamp + move_delay < timestamp) {
            glue_boy_move(1, 0);
            last_key = {key: "down", timestamp};
        }
    }

    if (keyPressed["Digit1"] && keyPressed["Digit1"][0]) {
        placing = BlockType.Empty;
    } else if (keyPressed["Digit2"] && keyPressed["Digit2"][0]) {
        placing = BlockType.Box;
    }

    if (mouse_clicked) {
        blocks[mouse_pos.row][mouse_pos.col].type = placing;
    }

    for (let k in keyPressed) {
        keyPressed[k][1] = false;
    }
    
    function dist(p1: Vec2, p2: Vec2): number {
        let drow = p1.row - p2.row;
        let dcol = p1.col - p2.col;
        return Math.sqrt(drow * drow + dcol * dcol);
    }

    {
        let time_left = dt;
        if (glue_boy.move_animations.length) {
            while (time_left > 0 && glue_boy.move_animations.length) {
                let animation = glue_boy.move_animations[0];
                let distance_to_travel = animation.distance * (1 - animation.t);
                let animation_time_left = distance_to_travel / animation.speed;
                let animation_time = Math.min(animation_time_left, time_left);
                let tick_distance = animation_time * animation.speed;
                let t_change = tick_distance / animation.distance;

                // @Incomplete: normalize
                glue_boy.visual_pos.row += animation.dpos.row * tick_distance;
                glue_boy.visual_pos.col += animation.dpos.col * tick_distance;

                animation.t += t_change;

                if (animation.t >= 1) {
                    glue_boy.move_animations.shift();
                }

                time_left -= animation_time;
            }
        } else {
            glue_boy.visual_pos = {...glue_boy.pos};
        }
    }

    draw();

    window.requestAnimationFrame(loop);
}


function init(): void {
    canvas = <HTMLCanvasElement> document.getElementById("canvas");
    canvas_bounding_box = canvas.getBoundingClientRect();
    assert(canvas.width == canvas.height);
    block_size = canvas.width / num_blocks;

    glue_boy = new GlueBoy(0, 0);
    mouse_pos = v2(0, 0);

    ctx = canvas.getContext("2d")!;

    blocks = [];
    for (let row = 0; row < num_blocks; row++) {
        blocks.push([]);
        for (let col = 0; col < num_blocks; col++) {
            blocks[row][col] = {type: BlockType.Empty};
        }
    }

    blocks[3][3] = {type: BlockType.Box};

    window.addEventListener('keydown',(e) => {
        if (!e.repeat) { events.push(e); }
    }, true);    
    window.addEventListener('keyup', (e) => {
        if (!e.repeat) { events.push(e); }
    }, true);
    window.addEventListener('mousemove', (e) => {
        events.push(e); 
    }, true);
    window.addEventListener('click', (e) => {
        events.push(e); 
    }, true);


    window.requestAnimationFrame(loop);
}

window.addEventListener("load", (event) => init());
