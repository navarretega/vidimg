// ** Imports ** //

const path = require("path");
const os = require("os");
const fs = require("fs");
const moment = require("moment");
const Swal = require("sweetalert2");
const { exec } = require("child_process");
const { shell } = require("electron");

// ** Variables ** //

const videoTabEle = document.getElementById("video-tab");
const imageTabEle = document.getElementById("image-tab");
const videoContentEle = document.getElementById("video-content");
const imageContentEle = document.getElementById("image-content");
const formEle = document.getElementById("vidimg-form");
const videoEle = document.getElementById("video");
const startEle = document.getElementById("start-time");
const endEle = document.getElementById("end-time");
const widthEle = document.getElementById("width");
const heightEle = document.getElementById("height");
const fpsEle = document.getElementById("fps");
const videoNameEle = document.getElementById("video-name");
const spinner = document.getElementById("spinner-container");

const imagesFormEle = document.getElementById("img-form");
const imagesDirEle = document.getElementById("images-dir");
const imagesDirNameEle = document.getElementById("images-dir-name");
const imagesFpsEle = document.getElementById("images-fps");
const imgSpinner = document.getElementById("spinner-img-container");

const outputBasePath = path.join(os.homedir(), "vidimg");
let videoPath;
let imagesPath;

// ** Functions ** //

// Run Shell Commands
function execShellCommand(cmd) {
  return new Promise((resolve, reject) => {
    exec(cmd, (error, stdout, stderr) => {
      if (error) {
        resolve({ err: true, msg: error.message });
      }
      resolve({ err: false, msg: stdout ? stdout : stderr });
    });
  });
}

// Display Alert Box
function showAlert(icon, title, text, footer = "") {
  Swal.fire({
    icon: icon,
    title: title,
    width: "80%",
    text: text,
    footer: footer,
  });
}

// Handle Video Input Event
async function onChange() {
  // Verify ffprove
  const res = await execShellCommand("ffprobe -version");
  if (res["err"]) {
    showAlert(
      "You need to have FFMPEG/FFPROBE installed, and add them to your PATH!",
      "<a target='_blank' href='https://www.ffmpeg.org/download.html'>Click here to install</a>"
    );
  } else {
    // Replace Video Name
    videoPath = '"' + videoEle.files[0].path + '"';
    videoNameEle.innerText = path.basename(videoPath);

    // Get duration
    const resDur = await execShellCommand(
      `ffprobe -v error -select_streams v:0 -show_entries stream=duration -of default=noprint_wrappers=1:nokey=1 ${videoPath}`
    );
    if (resDur["err"]) {
      console.warn(resDur["msg"]);
    } else {
      const seconds = parseInt(resDur["msg"], 10);
      const duration = new Date(seconds * 1000).toISOString().substr(11, 8);
      // Replace Duration
      startEle.value = "00:00:00";
      endEle.value = duration;
    }

    // Get Dimensions
    const resDims = await execShellCommand(
      `ffprobe -v error -select_streams v:0 -show_entries stream=height,width -of csv=s=x:p=0 ${videoPath}`
    );
    if (resDims["err"]) {
      console.warn(resDims["msg"]);
    } else {
      const split = resDims["msg"].split("x");
      const width = parseInt(split[0].trim(), 10);
      const height = parseInt(split[1].trim(), 10);
      // Replace Dimensions
      widthEle.value = width;
      heightEle.value = height;
    }

    // Get FPS
    const resFps = await execShellCommand(
      `ffprobe -v 0 -of csv=p=0 -select_streams v:0 -show_entries stream=r_frame_rate ${videoPath}`
    );
    if (resFps["err"]) {
      console.warn(resFps["msg"]);
    } else {
      const split = resFps["msg"].split("/");
      const s1 = parseInt(split[0], 10);
      const s2 = parseInt(split[1], 10);
      const fps = Math.round(s1 / s2);
      fpsEle.value = fps;
    }
  }
}

// Handle Submit Form Event - Video
async function onSubmit(e) {
  e.preventDefault();
  const res = await execShellCommand("ffmpeg -version");
  if (res["err"]) {
    showAlert(
      "error",
      "Oops...",
      "You need to have FFMPEG/FFPROBE installed, and add them to your PATH!",
      "<a target='_blank' href='https://www.ffmpeg.org/download.html'>Click here to install</a>"
    );
  } else {
    // Create output dir
    const currDat = moment().format("MMDDYYYYTHHmmss");
    const outputPath = path.join(outputBasePath, currDat);
    if (!fs.existsSync(outputPath)) {
      fs.mkdirSync(outputPath);
    }

    // Prepare ffmpeg command with the given inputs
    const start = startEle.value;
    const end = endEle.value;
    const width = widthEle.value;
    const height = heightEle.value;
    const fps = fpsEle.value;
    const out = path.join(outputPath, "image_%05d.jpg");

    const cmd = `ffmpeg -i ${videoPath} -ss ${start} -to ${end} -vf "fps=${fps}, scale=${width}:${height}" "${out}"`;
    console.log(cmd);

    // Add animation
    formEle.classList.remove("is-visible");
    spinner.classList.add("is-visible");

    // Run ffmpeg command
    const res = await execShellCommand(cmd);
    // await new Promise((resolve) => setTimeout(resolve, 5000));

    // Verify result
    if (res["err"]) {
      console.log(res["err"]);
      showAlert("error", "Sorry!", "Something bad happen.");
    } else {
      showAlert(
        "success",
        "Your images are ready!",
        `You can find them here: ${outputPath}`
      );

      // Reset animation
      spinner.classList.remove("is-visible");
      formEle.classList.add("is-visible");

      // shell.openPath(outputPath)
    }
  }
}

// Handle Tab Switches - Video Tab
function videoTabSwitch() {
  if (!videoContentEle.classList.contains("active")) {
    imageContentEle.classList.remove("active");
    imageTabEle.classList.remove("tl-active");
    videoContentEle.classList.add("active");
    videoTabEle.classList.add("tl-active");
  }
}

// Handle Tab Switches - Image Tab
function imageTabSwitch() {
  if (!imageContentEle.classList.contains("active")) {
    videoContentEle.classList.remove("active");
    videoTabEle.classList.remove("tl-active");
    imageContentEle.classList.add("active");
    imageTabEle.classList.add("tl-active");
  }
}

// Set image name (input)
function setImageInput() {
  imagesPath = path.dirname(imagesDirEle.files[0].path);
  imagesDirNameEle.innerText = imagesPath;
  imagesDirNameEle.setAttribute("title", imagesPath);
}

// Handle Submit Form Event - Images
async function onImageSubmit(e) {
  e.preventDefault();
  const res = await execShellCommand("ffmpeg -version");
  if (res["err"]) {
    showAlert(
      "error",
      "Oops...",
      "You need to have FFMPEG/FFPROBE installed, and add them to your PATH!",
      "<a target='_blank' href='https://www.ffmpeg.org/download.html'>Click here to install</a>"
    );
  } else {
    // Create output dir
    const currDat = moment().format("MMDDYYYYTHHmmss");
    const outputPath = path.join(outputBasePath, currDat);
    const out = path.join(outputPath, "video.mp4");
    if (!fs.existsSync(outputPath)) {
      fs.mkdirSync(outputPath);
    }

    // Prepare ffmpeg command with the given inputs
    const cmd = `cat "${imagesPath}/"*.{png,jpg} | ffmpeg -f image2pipe -framerate ${imagesFpsEle.value} -i - "${out}"`;
    console.log(cmd);

    // Add animation
    imagesFormEle.classList.remove("is-visible");
    imgSpinner.classList.add("is-visible");

    // Run ffmpeg command
    const res = await execShellCommand(cmd);
    // await new Promise((resolve) => setTimeout(resolve, 5000));

    // Verify result
    if (res["err"]) {
      console.log(res);
      showAlert("error", "Sorry!", "Something bad happen.");
    } else {
      showAlert(
        "success",
        "Your video is ready!",
        `You can find it here: ${out}`
      );

      // Reset animation
      imgSpinner.classList.remove("is-visible");
      imagesFormEle.classList.add("is-visible");

      // shell.openPath(outputPath)
    }
  }
}

// ** Event Listeners ** //

// Video Input
videoEle.addEventListener("change", onChange);

// Handle Video Submit
formEle.addEventListener("submit", (e) => onSubmit(e));

// Tab Events
videoTabEle.addEventListener("click", videoTabSwitch);
imageTabEle.addEventListener("click", imageTabSwitch);

// Image Input
imagesDirEle.addEventListener("change", setImageInput);

// Handle Image Submit
imagesFormEle.addEventListener("submit", (e) => onImageSubmit(e));
