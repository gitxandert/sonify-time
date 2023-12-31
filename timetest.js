async function setup() {
  const patchExportURL = "max-files/timetest.export.json";

  // Create AudioContext
  const WAContext = window.AudioContext || window.webkitAudioContext;
  const context = new WAContext();

  // Create gain node and connect it to audio output
  const outputNode = context.createGain();
  outputNode.connect(context.destination);

  // Fetch the exported patcher
  let response, patcher;
  try {
    response = await fetch(patchExportURL);
    patcher = await response.json();

    if (!window.RNBO) {
      // Load RNBO script dynamically
      // Note that you can skip this by knowing the RNBO version of your patch
      // beforehand and just include it using a <script> tag
      await loadRNBOScript(patcher.desc.meta.rnboversion);
    }
  } catch (err) {
    const errorContext = {
      error: err
    };
    if (response && (response.status >= 300 || response.status < 200)) {
      (errorContext.header = `Couldn't load patcher export bundle`),
        (errorContext.description =
          `Check app.js to see what file it's trying to load. Currently it's` +
          ` trying to load "${patchExportURL}". If that doesn't` +
          ` match the name of the file you exported from RNBO, modify` +
          ` patchExportURL in app.js.`);
    }
    if (typeof guardrails === "function") {
      guardrails(errorContext);
    } else {
      throw err;
    }
    return;
  }

  // Create the device
  let device;
  try {
    device = await RNBO.createDevice({ context, patcher });
  } catch (err) {
    if (typeof guardrails === "function") {
      guardrails({ error: err });
    } else {
      throw err;
    }
    return;
  }

  device.node.connect(outputNode);

  const onOff = device.parametersById.get("on");

  makeSliders(device);

  sonify(device);

  context.suspend();
  let start = document.getElementById("start-button")
  start.addEventListener('click', () => {
    let items = document.querySelectorAll('.slider');
    if (start.innerHTML == "Start Audio") {
      if(!context.resume()){
        context.resume;
      };
      start.innerHTML = "Stop Audio";
    } else {
      onOff.value = 0;
      start.innerHTML = "Start Audio";
    }
  });
}

function makeSliders(device) {
let pdiv = document.getElementById("rnbo-parameter-sliders");
let noParamLabel = document.getElementById("no-param-label");
if (noParamLabel && device.numParameters > 0) pdiv.removeChild(noParamLabel);

// This will allow us to ignore parameter update events while dragging the slider.
let isDraggingSlider = false;
let uiElements = {};

device.parameters.forEach((param) => {
  // Subpatchers also have params. If we want to expose top-level
  // params only, the best way to determine if a parameter is top level
  // or not is to exclude parameters with a '/' in them.
  // You can uncomment the following line if you don't want to include subpatcher params

  //if (param.id.includes("/")) return;

  // Create a label, an input slider and a value display
  let label = document.createElement("label");
  let slider = document.createElement("input");
  let text = document.createElement("input");
  let sliderContainer = document.createElement("div");
  sliderContainer.appendChild(label);
  sliderContainer.appendChild(slider);
  sliderContainer.appendChild(text);

  // Add a name for the label
  label.setAttribute("name", param.name);
  label.setAttribute("for", param.name);
  label.setAttribute("class", "param-label");
  label.textContent = `${param.name}: `;

  // Make each slider reflect its parameter
  slider.setAttribute("type", "range");
  slider.setAttribute("class", "param-slider");
  slider.setAttribute("id", param.id);
  slider.setAttribute("name", param.name);
  slider.setAttribute("min", param.min);
  slider.setAttribute("max", param.max);
  if (param.steps > 1) {
    slider.setAttribute("step", (param.max - param.min) / (param.steps - 1));
  } else {
    slider.setAttribute("step", (param.max - param.min) / 1000.0);
  }
  slider.setAttribute("value", param.value);

  // Make a settable text input display for the value
  text.setAttribute("value", param.value.toFixed(1));
  text.setAttribute("type", "text");
  text.setAttribute("id", `${param.id}-text`);

  // Make each slider control its parameter
  slider.addEventListener("pointerdown", () => {
    isDraggingSlider = true;
  });
  slider.addEventListener("pointerup", () => {
    isDraggingSlider = false;
    slider.value = param.value;
    text.value = param.value.toFixed(1);
  });
  slider.addEventListener("input", () => {
    let value = Number.parseFloat(slider.value);
    param.value = value;
  });

  // Make the text box input control the parameter value as well
  text.addEventListener("keydown", (ev) => {
    if (ev.key === "Enter") {
      let newValue = Number.parseFloat(text.value);
      if (isNaN(newValue)) {
        text.value = param.value;
      } else {
        newValue = Math.min(newValue, param.max);
        newValue = Math.max(newValue, param.min);
        text.value = newValue;
        param.value = newValue;
      }
    }
  });

  // Store the slider and text by name so we can access them later
  uiElements[param.id] = { slider, text };

  sliderContainer.setAttribute('class', 'slider');
  sliderContainer.setAttribute('style', 'font-family: "Andale Mono", monospace;')

  // Add the slider element
  pdiv.appendChild(sliderContainer);

  console.log(param);
});
}

function sonify(device){
  const currentDate = new Date();
  const scales = device.parametersById.get('scale');
  const scaleSlider = document.getElementById('scale');
  const scaleText = document.getElementById('scale-text');
  scales.value = currentDate.getHours();
  scaleSlider.value = scales.value;
  scaleText.value = scales.value;
}

setup();