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
    display(ctx : CanvasRenderingContext2D, pointData : Point[], tool : ToolType) : void;
    drag?(spline : SplineTool, point : Point) : void;
    tool : ToolType;    
}

let penDown = false;
let displayList : SplineTool[] = [];
let redoStack : SplineTool[] = [];

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

//TODO: STEP 5 Spline Drag Event
// function addDisplayListPoint(x : number, y : number) {
//     const l = displayList.length;
//     if(l > 0) {
//         const thisPoint : Point = {x: x,y: y};
//         displayList[l-1].pointData.push(thisPoint);
//     }
// }

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
                context.lineWidth = 3;
                break;
            case ToolType.Thin:
                context.lineWidth = 1;
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

//TODO: STEP 5 display event
function drawCanvas(context : CanvasRenderingContext2D | null) {
    for(const stroke of displayList) {
        if(context) {
            stroke.display(context, stroke.pointData, stroke.tool);
        }
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

function dragSpline(spline : SplineTool, point : Point) {
    spline.pointData.push(point);
}

canvas.addEventListener("drawing-changed", () => {
    resetCanvas();
    drawCanvas(ctx);
});

//TODO : STEP 5 Create spline
canvas.addEventListener("mousedown", (e) => {
    penDown = true;
    displayList.push({pointData : [], tool : ToolType.Thin, display : drawPen, drag : dragSpline});
    const curSpline : SplineTool = getCurSpline();
    if(curSpline.drag) {
        curSpline.drag(curSpline, {x : e.offsetX, y : e.offsetY});
    }
})

canvas.addEventListener("mousemove", (e) => {
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