import "./style.css";

interface Point {
    x : number;
    y : number;
}

enum ToolType {
    Thin,
    Thick,
    Sticker
}

interface SplineTool {
    pointData : Point[];
    display(ctx : CanvasRenderingContext2D, pointData : Point[], tool : ToolType, sticker? : string) : void;
    drag?(spline : SplineTool, point : Point) : void;
    tool : ToolType;
    sticker? : string;    
}

interface ToolEquip {
    tool : ToolType;
    draw(ctx : CanvasRenderingContext2D, point : Point) : void;
    point : Point;
    display(ctx : CanvasRenderingContext2D, pointData : Point[], tool : ToolType, sticker? : string) : void;
    drag?(spline : SplineTool, point : Point) : void;
    sticker? : string;
}

let penDown = false;
let displayList : SplineTool[] = [];
let redoStack : SplineTool[] = [];
let currentTool : ToolEquip = {draw : (ctx, point) => {drawNib(ctx, point, 1)}, tool : ToolType.Thin, point : {x : 0, y : 0}, display : drawPen, drag : dragSpline};

const APP_NAME = "Ian's Sticker Sketchpad";
const header = document.querySelector<HTMLDivElement>("#header")!;
const app = document.querySelector<HTMLDivElement>("#app")!;
const footer = document.querySelector<HTMLDivElement>("#footer")!;
const thinSize = 2;
const thickSize = 4;

document.title = APP_NAME;
header.innerHTML = APP_NAME;

//Newline, doesn't need to be saved

const canvas = document.createElement("canvas");
canvas.classList.add("nocursor");
const ctx = canvas.getContext("2d");

canvas.width = 256;
canvas.height = 256;

const drawingChanged = new Event("drawing-changed");
const toolMoved = new Event("tool-moved");
const clearToolEvent = new Event("clear-selection");

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

function getCurSpline() : SplineTool{
    const l = displayList.length;
    return displayList[l-1];
}

function drawLine(context : CanvasRenderingContext2D, x1 : number, y1 : number, x2 : number, y2 : number, thickness : ToolType) {
    if(context) {
        context.beginPath();
        context.strokeStyle = "black";
        switch (thickness) {
            case ToolType.Thick:
                context.lineWidth = thickSize;
                break;
            case ToolType.Thin:
                context.lineWidth = thinSize;
                break;
            default:
                context.lineWidth = 2;
                break;
        }
        context.moveTo(x1, y1);
        context.lineTo(x2, y2);
        context.stroke();
        context.closePath();
    }
}

function drawCanvas(context : CanvasRenderingContext2D | null) {
    for(const stroke of displayList) {
        if(context) {
            stroke.display(context, stroke.pointData, stroke.tool, stroke.sticker);
        }
    }
    if(ctx && !penDown) {
        currentTool.draw(ctx, currentTool.point);
    }
}

function drawPen(context : CanvasRenderingContext2D, pointData : Point[], tool : ToolType) {
    let lastPoint : Point | null = null;
    for(const thisPoint of pointData) {
        if(context && lastPoint) {
            drawLine(context, lastPoint.x, lastPoint.y, thisPoint.x, thisPoint.y, tool);
        }
        lastPoint = {x: thisPoint.x, y: thisPoint.y};
    }
}

function drawSticker(context : CanvasRenderingContext2D, pointData : Point[], _tool : ToolType, sticker : string) {
    context.font = "16px monospace"
    context.fillText(sticker, pointData[0].x - 8, pointData[0].y + 8);
}

function drawCircle(context : CanvasRenderingContext2D, point : Point, radius : number, fill : string | null) {
    context.beginPath();
    context.arc(point.x, point.y, radius, 0, 2 * Math.PI);
    if(fill) {
        context.fillStyle = fill;
        context.fill();
    }
    context.closePath();
}

function drawNib(context : CanvasRenderingContext2D, point : Point, width : number) {
    drawCircle(context, point, width / 2, "black");
}

function dragSpline(spline : SplineTool, point : Point) {
    spline.pointData.push(point);
}

function dragSticker(spline : SplineTool, point : Point) {
    spline.pointData[0] = point;
}

canvas.addEventListener("drawing-changed", () => {
    resetCanvas();
    drawCanvas(ctx);
});

canvas.addEventListener("tool-moved", () => {
    resetCanvas();
    drawCanvas(ctx);
});

canvas.addEventListener("mousedown", (e) => {
    penDown = true;
    displayList.push({pointData : [], tool : currentTool.tool, display : currentTool.display, drag : currentTool.drag, sticker : currentTool.sticker});
    const curSpline : SplineTool = getCurSpline();
    if(curSpline.drag) {
        curSpline.drag(curSpline, {x : e.offsetX, y : e.offsetY});
    }
})

canvas.addEventListener("mousemove", (e) => {
    currentTool.point = {x : e.offsetX, y : e.offsetY};
    canvas.dispatchEvent(toolMoved);
    if(penDown) {
        //drawLine(ctx, mouseX, mouseY, e.offsetX, e.offsetY);
        const curSpline : SplineTool = getCurSpline();
        if(curSpline.drag) {
            curSpline.drag(curSpline, {x : e.offsetX, y : e.offsetY});
        }
        canvas.dispatchEvent(drawingChanged);
    }
})

canvas.addEventListener("mouseup", (e) => {
    if(penDown) {
        const curSpline : SplineTool = getCurSpline();
        if(curSpline.drag) {
            curSpline.drag(curSpline, {x : e.offsetX, y : e.offsetY});
        }
        canvas.dispatchEvent(drawingChanged);
        penDown = false;
    }
})

function resetDisplayInfo() {
    displayList = [];
    redoStack = [];
}

function undo() {
    const newestStroke = displayList.pop();
    if(newestStroke) {
        redoStack.push(newestStroke);
    }
    canvas.dispatchEvent(drawingChanged);
}

function redo() {
    const redo = redoStack.pop();
    if(redo) {
        displayList.push(redo);
    }
    canvas.dispatchEvent(drawingChanged);
}

function toolButtonClicked(button : HTMLButtonElement, tool : ToolEquip) {
    currentTool = tool;
    canvas.dispatchEvent(clearToolEvent);
    button.classList.add("selectedTool");
}

const thinButton = document.createElement("button");
thinButton.innerHTML = "Thin";
thinButton.addEventListener("click", () => {toolButtonClicked(thinButton, {draw : (ctx, point) => {drawNib(ctx, point, thinSize)}, tool : ToolType.Thin, point : currentTool.point, display : drawPen, drag : dragSpline})});
canvas.addEventListener("clear-selection", () => {thinButton.classList.remove("selectedTool")});

const thickButton = document.createElement("button");
thickButton.innerHTML = "Thick";
thickButton.addEventListener("click", () => {toolButtonClicked(thickButton, {draw : (ctx, point) => {drawNib(ctx, point, thickSize)}, tool : ToolType.Thick, point : currentTool.point, display : drawPen, drag : dragSpline})})
canvas.addEventListener("clear-selection", () => {thickButton.classList.remove("selectedTool")});

header.append(document.createElement("br"));
header.append(thinButton);
header.append(thickButton);

function createStickerTool(emoji : string) {
    const newSticker = document.createElement("button");
    newSticker.innerHTML = emoji;
    newSticker.addEventListener("click", () => {toolButtonClicked(newSticker, {draw : (ctx, point) => {drawSticker(ctx, [point], ToolType.Sticker, emoji)}, tool : ToolType.Sticker, point : currentTool.point, display : drawSticker, drag : dragSticker, sticker : emoji})})
    canvas.addEventListener("clear-selection", () => {newSticker.classList.remove("selectedTool")});
    header.append(newSticker);
}

createStickerTool("🧱");
createStickerTool("🌊");
createStickerTool("☢️");

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

footer.append(clearButton);
footer.append(undoButton);
footer.append(redoButton);