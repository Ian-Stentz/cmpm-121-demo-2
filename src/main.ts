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

// Interface representing a tool that can handle drawing or display on the canvas
interface SplineTool {
    pointData : Point[];
    display(ctx : CanvasRenderingContext2D, pointData : Point[], tool : ToolType, additionalInfo? : string) : void;
    drag?(spline : SplineTool, point : Point) : void;
    tool : ToolType;
    additionalInfo? : string;   // Additional info for the tool (e.g., color for pens or emoji for stickers)
}

// Interface for tools that can be equipped and used on the canvas
interface ToolEquip {
    tool : ToolType;
    draw(ctx : CanvasRenderingContext2D, point : Point) : void;
    point : Point;
    display(ctx : CanvasRenderingContext2D, pointData : Point[], tool : ToolType, additionalInfo? : string) : void;
    drag?(spline : SplineTool, point : Point) : void;
    additionalInfo? : string;
}

// Global state variables
let penDown = false;
let displayList : SplineTool[] = [];
let redoStack : SplineTool[] = [];
let currentTool : ToolEquip = {draw : (ctx, point) => {drawNib(ctx, point, 1)}, tool : ToolType.Thin, point : {x : 0, y : 0}, display : drawPen, drag : dragSpline};
let colorPen : boolean = false;

// Constants
const APP_NAME = "Ian's Sticker Sketchpad";
const header = document.querySelector<HTMLDivElement>("#header")!;
const app = document.querySelector<HTMLDivElement>("#app")!;
const footer = document.querySelector<HTMLDivElement>("#footer")!;
const thinSize = 2;
const thickSize = 4;

// Set app title
document.title = APP_NAME;
header.innerHTML = APP_NAME;

// Create and set up canvas
const canvas = document.createElement("canvas");
canvas.classList.add("nocursor");
const ctx = canvas.getContext("2d");

canvas.width = 256;
canvas.height = 256;

// Events for handling tool and canvas state changes
const drawingChanged = new Event("drawing-changed");
const toolMoved = new Event("tool-moved");
const clearToolEvent = new Event("clear-selection");
const colorChangeEvent = new Event("color-update");

// Reset canvas to its initial state (clear and fill with white)
function resetCanvas(context : CanvasRenderingContext2D | null) {
    if(context) {
        context.clearRect(0,0,canvas.width,canvas.height)
        context.fillStyle = "white";
        context.fillRect(0,0,canvas.width,canvas.height);
    }
}

// Initialize canvas
resetCanvas(ctx);
app.append(canvas);
canvas.dispatchEvent(colorChangeEvent);

// Helper function to get the current active spline tool (last item in the displayList)
function getCurSpline() : SplineTool{
    const l = displayList.length;
    return displayList[l-1];
}

// Draw a line between two points with a specific thickness and color
function drawLine(context : CanvasRenderingContext2D, x1 : number, y1 : number, x2 : number, y2 : number, thickness : ToolType, color : string = "black") {
    if(context) {
        context.beginPath();
        context.strokeStyle = color;
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
    }
}

// Draw all splines in displayList on the canvas
function drawCanvas(context : CanvasRenderingContext2D | null, noTool : boolean = false) {
    for(const stroke of displayList) {
        if(context) {
            stroke.display(context, stroke.pointData, stroke.tool, stroke.additionalInfo);
        }
    }
    if(context && !penDown && !noTool) {
        currentTool.draw(context, currentTool.point);
    }
}

// Drawing behavior for the pen tool (color)
function drawPen(context : CanvasRenderingContext2D, pointData : Point[], tool : ToolType, color : string) {
    let lastPoint : Point | null = null;
    for(const thisPoint of pointData) {
        if(context && lastPoint) {
            drawLine(context, lastPoint.x, lastPoint.y, thisPoint.x, thisPoint.y, tool, color);
        }
        lastPoint = {x: thisPoint.x, y: thisPoint.y};
    }
}

// Drawing behavior for the sticker tool (draws text on canvas)
function drawSticker(context : CanvasRenderingContext2D, pointData : Point[], _tool : ToolType, sticker : string) {
    context.font = "16px monospace"
    context.fillText(sticker, pointData[0].x - 8, pointData[0].y + 8);
}

// Draw a circle (used for drawing nibs or tool effects)
function drawCircle(context : CanvasRenderingContext2D, point : Point, radius : number, fill : string | null) {
    context.beginPath();
    context.arc(point.x, point.y, radius, 0, 2 * Math.PI);
    if(fill) {
        context.fillStyle = fill;
        context.fill();
    }
    context.closePath();
}

// Draw a small nib (circle) at the tool's point
function drawNib(context : CanvasRenderingContext2D, point : Point, width : number, color : string = "black") {
    drawCircle(context, point, width / 2, color);
}

// Drag behavior for the pen tool (adds new points to the spline)
function dragSpline(spline : SplineTool, point : Point) {
    spline.pointData.push(point);
}

// Drag behavior for the sticker tool (moves the sticker's position)
function dragSticker(spline : SplineTool, point : Point) {
    spline.pointData[0] = point;
}

// Canvas event listeners for user interactions
canvas.addEventListener("drawing-changed", () => {
    resetCanvas(ctx);
    drawCanvas(ctx);
});

canvas.addEventListener("tool-moved", () => {
    resetCanvas(ctx);
    drawCanvas(ctx);
});

// Mouse event listeners for drawing actions
canvas.addEventListener("mousedown", (e) => {
    penDown = true;
    displayList.push({pointData : [], tool : currentTool.tool, display : currentTool.display, drag : currentTool.drag, additionalInfo : currentTool.additionalInfo});
    const curSpline : SplineTool = getCurSpline();
    if(curSpline.drag) {
        curSpline.drag(curSpline, {x : e.offsetX, y : e.offsetY});
    }
})

canvas.addEventListener("mousemove", (e) => {
    currentTool.point = {x : e.offsetX, y : e.offsetY};
    canvas.dispatchEvent(toolMoved);
    if(penDown) {
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

// Functions to handle clear, redo, and undo
function clearDrawingHistory() {
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

// Equips tool and updates canvas based on button clicked
function toolButtonClicked(button : HTMLButtonElement, tool : ToolEquip) {
    currentTool = tool;
    canvas.dispatchEvent(clearToolEvent);
    canvas.dispatchEvent(colorChangeEvent);
    button.classList.add("selectedTool");
}

//Toggles between black and color pen
function colorToggle(button: HTMLButtonElement){
    if(colorPen){
        colorPen = false;
        button.classList.remove("selectedTool");
    }
    else{
        colorPen = true;
        button.classList.add("selectedTool");
    }
    canvas.dispatchEvent(colorChangeEvent)
}

//Hue slider implementation
const hText = document.createElement("text");
hText.innerHTML = "Hue:";
app.append(hText);

const hueSlider = document.createElement("input");
hueSlider.type = "range";
hueSlider.min = "0";
hueSlider.max = "360";
hueSlider.defaultValue = "0";

//Updates color whenever slider is moved
hueSlider.addEventListener("change", function() {
    canvas.dispatchEvent(colorChangeEvent);
}, false);

//Updates the color of the pen and pen preview
canvas.addEventListener("color-update", () => {if(currentTool.tool != ToolType.Sticker){
    let myColor = "black";
    if(colorPen){
        myColor = "HSL(" + hueSlider.value + ", 100%, 50%";
    }

    currentTool.additionalInfo = myColor;
    currentTool.draw = (ctx, point) => {drawNib(ctx, point, thickSize, myColor)}
}});

// Create buttons for color and thickness
const colorButton = document.createElement("button");
colorButton.innerHTML = "Color 🖊️";
colorButton.addEventListener("click", () => {colorToggle(colorButton)});

const thinButton = document.createElement("button");
thinButton.innerHTML = "Thin 🖊️";
thinButton.addEventListener("click", () => {
    const myColor = "black";
    toolButtonClicked(thinButton, {draw : (ctx, point) => {drawNib(ctx, point, thinSize, myColor)}, tool : ToolType.Thin, point : currentTool.point, display : drawPen, drag : dragSpline, additionalInfo :  myColor})});
canvas.addEventListener("clear-selection", () => {thinButton.classList.remove("selectedTool")});

const thickButton = document.createElement("button");
thickButton.innerHTML = "Thick 🖊️";
thickButton.addEventListener("click", () => {
    const myColor = "black";
    toolButtonClicked(thickButton, {draw : (ctx, point) => {drawNib(ctx, point, thickSize, myColor)}, tool : ToolType.Thick, point : currentTool.point, display : drawPen, drag : dragSpline, additionalInfo : myColor})})
canvas.addEventListener("clear-selection", () => {thickButton.classList.remove("selectedTool")});

header.append(document.createElement("br"));
header.append(hText);
header.append(hueSlider);
header.append(colorButton);
header.append(thinButton);
header.append(thickButton);

//Create stickers
function createStickerTool(emoji : string) {
    const newSticker = document.createElement("button");
    newSticker.innerHTML = emoji;
    newSticker.addEventListener("click", () => {toolButtonClicked(newSticker, {draw : (ctx, point) => {drawSticker(ctx, [point], ToolType.Sticker, emoji)}, tool : ToolType.Sticker, point : currentTool.point, display : drawSticker, drag : dragSticker, additionalInfo : emoji})})
    canvas.addEventListener("clear-selection", () => {newSticker.classList.remove("selectedTool")});
    header.append(newSticker);
}

createStickerTool("🧱");
createStickerTool("🌊");
createStickerTool("☢️");

// Create button for clear, undo, and redo
const clearButton = document.createElement("button");
clearButton.innerHTML = "Clear";

clearButton.addEventListener("click", () => (resetCanvas(ctx)));
clearButton.addEventListener("click", clearDrawingHistory);

const undoButton = document.createElement("button");
undoButton.innerHTML = "Undo";

const redoButton = document.createElement("button");
redoButton.innerHTML = "Redo";

const customStickerButton = document.createElement("button");
customStickerButton.innerHTML = "Custom Sticker";

undoButton.addEventListener("click", undo);
redoButton.addEventListener("click", redo);
customStickerButton.addEventListener("click", () => {
    const newEmoji = prompt("New Sticker: ", "")
    if(newEmoji && newEmoji.length < 5) {
        createStickerTool(newEmoji);
    }
})

footer.append(clearButton);
footer.append(undoButton);
footer.append(redoButton);
footer.append(customStickerButton);

// Canvas export logic for download
function prepareCanvasForExport(background : boolean = false) : HTMLCanvasElement{
    const thisCanvas = document.createElement("canvas");
    const thisctx = thisCanvas.getContext("2d");
    thisCanvas.width = 1024;
    thisCanvas.height = 1024;
    if(thisctx) {
        thisctx.scale(4,4);
        if(background) {
            thisctx.fillStyle = "white";
            thisctx.fillRect(0,0,canvas.width,canvas.height);
        }
        drawCanvas(thisctx, true);
    }
    console.log("BEEP");
    return thisCanvas;
}

const anchor = document.createElement("a");
anchor.addEventListener("click", () => {
    const selection : string | null = prompt("W for white background, T for transparent");
    if(selection && selection.toLowerCase() == "w") {
        anchor.href = anchor.href = prepareCanvasForExport(true).toDataURL("image/png");
    } else {
        anchor.href = anchor.href = prepareCanvasForExport(false).toDataURL("image/png");
    }
})
anchor.download = "sketchpad.png";
anchor.innerHTML = "Download Sketch"

//anchor.click();
footer.append(document.createElement("br"));
footer.append(anchor);