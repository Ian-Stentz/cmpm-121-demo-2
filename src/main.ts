import "./style.css";

const APP_NAME = "Ian's Sticker Sketchpad";
const app = document.querySelector<HTMLDivElement>("#app")!;

document.title = APP_NAME;
app.innerHTML = APP_NAME;

const newline = document.createElement("div");
app.append(newline);

const canvas = document.createElement("canvas");
const ctx = canvas.getContext("2d");

canvas.width = 256;
canvas.height = 256;

if(ctx) {
    ctx.fillStyle = "white";
    ctx.fillRect(0,0,256,256);
}

app.append(canvas);
