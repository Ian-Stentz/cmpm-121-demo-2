import "./style.css";

interface Point {
    x : number;
    y : number;
}

let penDown = false;
let displayList : Point[][] = [];
let redoStack : Point[][] = [];

const APP_NAME = "Ian's Sticker Sketchpad";
const app = document.querySelector<HTMLDivElement>("#app")!;

document.title = APP_NAME;
app.innerHTML = APP_NAME;

//Newline, doesn't need to be saved
app.append(document.createElement("br"));

const canvas = document.createElement("canvas");
const ctx = canvas.getContext("2d");

canvas.width = 256;
canvas.height = 256;

const drawingChanged = new Event("drawing-changed");

function resetCanvas() {
    //if(ctx) to avoid a style error since ctx can be null type
    if(ctx) {
        ctx.clearRect(0,0,canvas.width,canvas.height)
        //white rect is necessary to hide dropdown shadow showing through
        ctx.fillStyle = "white";
        ctx.fillRect(0,0,canvas.width,canvas.height);
    }
}

resetCanvas();
app.append(canvas);

function addDisplayListPoint(x : number, y : number) {
    let l = displayList.length;
    if(l > 0) {
        let thisPoint : Point = {x,y};
        displayList[l-1].push(thisPoint);
    }
}

function drawLine(context : CanvasRenderingContext2D, x1 : number, y1 : number, x2 : number, y2 : number) {
    if(context) {
        context.beginPath();
        context.strokeStyle = "black";
        context.lineWidth = 2;
        context.moveTo(x1, y1);
        context.lineTo(x2, y2);
        context.stroke();
        context.closePath();
    }
}

function drawCanvas() {
    let newline = true;
    let lastPoint : Point = {x: 0,y: 0};
    for(let stroke of displayList) {
        newline = true;
        for(let thisPoint of stroke) {
            if(!newline && ctx) {
                drawLine(ctx, lastPoint.x, lastPoint.y, thisPoint.x, thisPoint.y);
            } else {
                newline = false;
            }
            lastPoint = {x: thisPoint.x, y: thisPoint.y};
        }
    }
}

canvas.addEventListener("drawing-changed", (e) => {
    resetCanvas();
    drawCanvas();
});

canvas.addEventListener("mousedown", (e) => {
    penDown = true;
    displayList.push([]);
    addDisplayListPoint(e.offsetX, e.offsetY);
})

canvas.addEventListener("mousemove", (e) => {
    if(penDown) {
        //drawLine(ctx, mouseX, mouseY, e.offsetX, e.offsetY);
        addDisplayListPoint(e.offsetX, e.offsetY);
        canvas.dispatchEvent(drawingChanged);
    }
})

canvas.addEventListener("mouseup", (e) => {
    if(penDown) {
        addDisplayListPoint(e.offsetX, e.offsetY);
        canvas.dispatchEvent(drawingChanged);
        penDown = false;
    }
})

function resetDisplayInfo() {
    displayList = [];
    redoStack = [];
}

function undo() {
    let newestStroke = displayList.pop();
    if(newestStroke) {
        redoStack.push(newestStroke);
    }
    canvas.dispatchEvent(drawingChanged);
}

function redo() {
    let redo = redoStack.pop();
    if(redo) {
        displayList.push(redo);
    }
    canvas.dispatchEvent(drawingChanged);
}

app.append(document.createElement("br"));

const clearButton = document.createElement("button");
clearButton.innerHTML = "Clear";

clearButton.addEventListener("click", resetCanvas);
clearButton.addEventListener("click", resetDisplayInfo);

const undoButton = document.createElement("button");
undoButton.innerHTML = "Undo";

const redoButton = document.createElement("button");
redoButton.innerHTML = "Redo";

undoButton.addEventListener("click", undo);
redoButton.addEventListener("click", redo);

app.append(clearButton);
app.append(undoButton);
app.append(redoButton);