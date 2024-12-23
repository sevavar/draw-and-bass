//Layout
let uiContainer;
let canvasContainer;

// UI
let sliders = {};
let inputs = {};
let buttons = {};
let checkboxes = {};



let bassTrack = [];
let bassSubdivision = 5;
let bassStep = 0; 

let isDrawingBass = false;
let bassOscillator;
let bassTrackHeight;
let delay;
let wobbleSpeedSlider, wobbleSpeed = 2; 
let wobblePhase = 20;

let gridSize = 16;
let cellSize;
let pattern = [
  [1, 3, 5, 7, 9, 11, 13, 15],
  [5, 13],
  [1, 11],
];
let presets = {
  "2 Step": {
    gridSize: 16,
    pattern: [
      [1, 3, 5, 7, 9, 11, 13, 15],
      [5, 13],
      [1, 11],
    ]
  },
  "2 Step Shift": {
    gridSize: 16,
    pattern: [
      [1, 3, 5, 7, 9, 11, 13, 15],
      [5, 13],
      [1, 8],
    ]
  },
  "Vessel Pattern": {
    gridSize: 32,
    pattern: [
      [1,3,5,7,9,11,13,15,17,19,21,23,25,27,29,31],
      [5,13,21,29], 
      [1,11,19,27],
    ]
  }
};

let sounds = [];
let isPlaying = false;
let bpmInput, playButton, presetSelect, stepCountInput;
let bpm = 165;
let currentStep = 0;
let toggledCells = [];
let stepCount = 16;
let presetChangePending = false;
let nextPreset = '';




function preload() {
  sounds[0] = loadSound('hihat.wav');
  sounds[1] = loadSound('snare.wav');
  sounds[2] = loadSound('kick.wav');
}



function createUI() {
  let uiContainer = select('#ui-container');
 let left = createDiv().class('left').parent(uiContainer);
  let right = createDiv().class('right').parent(uiContainer);
  
  
  title = createP(`
     <span class="label-left">Draw & Bass<sup>®</sup></span>
  `);
  title.class('label-container');
  title.parent(right);
  
  
  playButton = createButton('');
  //playButton.position(cellSize / 2 - 25, height / 8 - 28);
  playButton.mousePressed(togglePlay);
  updateButtonIcon();
  playButton.parent(left);

  bpmInput = createInput(bpm.toString());
  //bpmInput.position(1.2 * cellSize, height / 8 - 15);
  bpmInput.size(32);
  bpmInput.input(updateBpm);
  bpmInput.parent(left);

  stepCountInput = createInput(stepCount.toString());
  //stepCountInput.position(2.2 * cellSize + 5, height / 8 - 15);
  stepCountInput.size(30);
  stepCountInput.input(updateStepCount);
  stepCountInput.parent(left);

  presetSelect = createSelect();
  presetSelect.class('dropdown');
 // presetSelect.position(3 * cellSize, height / 8 - 14);
  Object.keys(presets).forEach(preset => presetSelect.option(preset));
  presetSelect.changed(changePreset);
  presetSelect.parent(left);

 // Add oscillator type radio buttons
  let oscillatorTypeLabel = createP('Osc:').parent(left);
  let oscillatorTypeRadio = createRadio();
  //oscillatorTypeRadio.option('sine');
  oscillatorTypeRadio.option('square', 'square');
  //oscillatorTypeRadio.option('triangle');
  oscillatorTypeRadio.option('sawtooth', 'saw');
  oscillatorTypeRadio.selected('square'); // Default selection
  oscillatorTypeRadio.changed(() => {
    let selectedType = oscillatorTypeRadio.value();
    bassOscillator.setType(selectedType);
  });
  oscillatorTypeRadio.parent(left);



  wobbleSpeedSlider = createSlider(1, 10, wobbleSpeed,1); // Range: 0.1 Hz to 10 Hz
  wobbleSpeedSlider.parent(left);

}

function setup() {
  uiContainer = select('#ui-container');
  createUI();
  const uiHeight = document.getElementById('ui-container').offsetHeight;

  frameRate(60);
  createCanvas(windowWidth, windowHeight - uiHeight);
  cellSize = width / gridSize;
  bassTrackHeight = (height / 5) * 2;
  bassTrack = Array(gridSize * bassSubdivision).fill(height - bassTrackHeight / 4);

  updateFrameRate();



  resetToggledCells();
  synthesize();
  applyEffects();
}

function synthesize() {
  bassOscillator = new p5.Oscillator('square');
  bassOscillator.amp(0);
  bassOscillator.start();
  //bassOscillator.freq(100); // Default frequency


}

function applyEffects() {
  //let gain = new p5.Gain();
  //sounds[2].connect(gain);

  bassFilter = new p5.LowPass(); // LowPass filter for wobbling

bassDistortion = new p5.Distortion(0.05, '1x');

let delay = new p5.Delay();
 delay.process(bassOscillator, 0.1, 0.7, 2300);

  bassOscillator.disconnect();
  bassOscillator.connect(bassFilter);
  bassFilter.connect(bassDistortion);
  bassDistortion.connect(delay);
 delay.connect();


}


function draw() {
  background(220);
  noStroke();

    //wobbleSpeed = wobbleSpeedSlider.value();

let wobbleFrequency =   ((1 / (60/bpm))*wobbleSpeedSlider.value()); // Frequency in Hz
  wobblePhase += TWO_PI * wobbleFrequency // Increment phase with time
let wobble = sin(wobblePhase) * 300 + 500;

  bassFilter.freq(wobble); // Apply wobbling to the filter frequency



  let trackHeight = height / 5;

  // Draw Drum tracks
  for (let i = 0; i < pattern.length; i++) {
    for (let j = 0; j < gridSize; j++) {
      let x = j * cellSize;
      let y = i * trackHeight;

      fill(pattern[i].includes(j + 1) ? 'black' : 'grey');
      rect(x, y, cellSize, trackHeight);

      if (isPlaying && currentStep === j && pattern[i].includes(j + 1)) {
        sounds[i].play();
      }
    }
  }

  // Draw Bass track
  fill('grey');
  rect(0, height - bassTrackHeight, width, bassTrackHeight);
  fill("#FF0000");

  // Draw bassline
  stroke("#FF0000");
  strokeWeight(2);
  beginShape();
  bassTrack.forEach((y, index) => {
    let x = (index / bassSubdivision) * cellSize;
    vertex(x, y);
  });
  endShape();



  // Update bassline
  if (isPlaying) {
    let currentBassIndex = (currentStep * bassSubdivision) % bassTrack.length;
    let y = bassTrack[currentBassIndex];
    let frequency = map(y, height, height - bassTrackHeight, 30, 60);
    bassOscillator.freq(frequency);
    bassOscillator.amp(0.2);
  } else {
    bassOscillator.amp(0);
  }

  // Draw playhead
  if (isPlaying) {
    currentStep = (currentStep + 1) % gridSize;
    noStroke();
    fill(255);
    let currentX = currentStep * cellSize;
    rect(currentX, 0, 3, height*5);
  }

  if (presetChangePending && currentStep === 0) {
    changePresetTo(nextPreset);
    presetChangePending = false;
  }
  
  

}

function togglePlay() {
  isPlaying = !isPlaying;
  updateButtonIcon();
  if (isPlaying) currentStep = 0;
}

function updateButtonIcon() {
  playButton.html(isPlaying ? stopIcon() : playIcon());
}

function updateBpm() {
  bpm = parseInt(bpmInput.value());
  bpm = isNaN(bpm) || bpm <= 0 ? 120 : bpm;
  updateFrameRate();
}

function updateFrameRate() {
  let timePerStep = 15 / bpm;
  frameRate(1 / timePerStep);
}

function updateStepCount() {
  stepCount = parseInt(stepCountInput.value());
  if (isNaN(stepCount) || stepCount <= 0) stepCount = 16;

  gridSize = stepCount;
  cellSize = width / gridSize;

  // Bass track extension
  let newBassTrack = Array(gridSize * bassSubdivision).fill(height - bassTrackHeight / 4);
  bassTrack.forEach((val, i) => { newBassTrack[i] = val; });
  bassTrack = newBassTrack;

  resetToggledCells();
}

function mousePressed() {
  resetToggledCells();
  toggleCellAt(mouseX, mouseY);
  if (mouseY > height - bassTrackHeight && mouseY < height) {
    isDrawingBass = true;
    updateBassTrack(mouseX, mouseY);
  }
}

function mouseDragged() {
  toggleCellAt(mouseX, mouseY);
  if (isDrawingBass) {
    updateBassTrack(mouseX, mouseY);
  }
}

function mouseReleased() {
  isDrawingBass = false;
}

function toggleCellAt(mx, my) {
  let trackHeight = height / 5;

  for (let i = 0; i < pattern.length; i++) {
    for (let j = 0; j < gridSize; j++) {
      let x = j * cellSize;
      let y = (i) * trackHeight;

      if (mx > x && mx < x + cellSize && my > y && my < y + trackHeight) {
        if (!toggledCells[i][j]) {
          let step = j + 1;
          if (pattern[i].includes(step)) {
            pattern[i] = pattern[i].filter(s => s !== step);
          } else {
            pattern[i].push(step);
            pattern[i].sort((a, b) => a - b);
          }
          toggledCells[i][j] = true;
        }
      }
    }
  }
}

function resetToggledCells() {
  toggledCells = pattern.map(() => Array(gridSize).fill(false));
}

function changePreset() {
  let selectedPreset = presetSelect.value();
  presetChangePending = true;
  nextPreset = selectedPreset;
}

function changePresetTo(presetName) {
  let selectedPreset = presets[presetName];

  gridSize = selectedPreset.gridSize;
  pattern = selectedPreset.pattern.map(row => [...row]);
  cellSize = width / gridSize;

  stepCount = gridSize;
  stepCountInput.value(stepCount);

  currentStep = 0;
  resetToggledCells();

  // Bassline extension
  let newBassTrack = Array(gridSize * bassSubdivision).fill(height - bassTrackHeight / 4);
  bassTrack.forEach((val, i) => { newBassTrack[i] = val; });
  bassTrack = newBassTrack;
}

function playIcon() {
  return `<svg width="20" height="20" viewBox="0 0 20 20"><polygon points="6,4 18,12 6,20" fill="white" /></svg>`;
}

function stopIcon() {
  return `<svg width="20" height="20" viewBox="0 0 20 20"><rect x="6" y="6" width="12" height="12" fill="white" /></svg>`;
}

function updateBassTrack(x, y) {
  let index = Math.floor((x / width) * bassTrack.length);
  index = constrain(index, 0, bassTrack.length - 1);
  bassTrack[index] = constrain(y, height - bassTrackHeight, height);
}

