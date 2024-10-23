import "./style.css";

let penDown = false;
let mouseX = 0;
let mouseY = 0;

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

function drawLine(context, x1, y1, x2, y2) {
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

canvas.addEventListener("mousedown", (e) => {
    penDown = true;
    mouseX = e.offsetX;
    mouseY = e.offsetY;
})

canvas.addEventListener("mousemove", (e) => {
    if(penDown) {
        drawLine(ctx, mouseX, mouseY, e.offsetX, e.offsetY);
        mouseX = e.offsetX;
        mouseY = e.offsetY;
    }
})

canvas.addEventListener("mouseup", (e) => {
    if(penDown) {
        drawLine(ctx, mouseX, mouseY, e.offsetX, e.offsetY);
        penDown = false;
    }
})

app.append(document.createElement("br"));

const clearButton = document.createElement("button");
clearButton.innerHTML = "Clear"

clearButton.addEventListener("click", resetCanvas)

app.append(clearButton);