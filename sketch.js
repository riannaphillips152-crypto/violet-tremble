let fearInstance; // Global variable to hold our Fear class instance
let dreadSlider; // Global variable for the slider
let capture; // Variable for webcam

// --- Color Palettes: Dark, Desaturated, Cool Tones for Dread ---
const palette1 = {
  bg: '#000000', // Pure black background for stark contrast
  primary: '#CA8BFF', // purple - Plutchik colour theory
  accent1: '#FDFD96', // Yellow/Cream  subtle highlight
  accent2: '#9266B6', // Darker Muted Purple for depth
};

const palette2 = {
  bg: '#080810', // Very dark blue-black
  primary: '#4682B4', // Steel Blue
  accent1: '#B0C4DE', // Light Steel Blue
  accent2: '#2F4F4F', // Dark Slate Gray- for deeper dread)
};

// --- UI Logic ---
function toggleInfo() {
    const infoBox = document.getElementById('interaction-instructions');
    const icon = document.getElementById('toggle-icon');
    
    // Toggle 
    infoBox.classList.toggle('collapsed');

    // Update icon text
    if (infoBox.classList.contains('collapsed')) {
        icon.innerText = "+";
    } else {
        icon.innerText = "−"; // minus sign
    }
}

// --- MAIN SETUP & DRAW ---

function setup() {
  console.log("setup() called - creating canvas for Fear (Slider Control)");
  createCanvas(windowWidth, windowHeight);
  
  // Set color mode to HSB globally for consistent HSB manipulation
  // Hue: 0-360, Saturation: 0-100, Brightness: 0-100, Alpha: 0-1
  colorMode(HSB, 360, 100, 100, 1);
  
  // eformance Optimization
  pixelDensity(1);

  // --- VIDEO CAPTURE SETUP ---
  capture = createCapture(VIDEO);
  capture.size(320, 240); 
  capture.hide(); 

  // Get the HTML slider element and store it
  dreadSlider = document.getElementById('dreadSlider');
  if (!dreadSlider) {
      console.error("Dread slider not found! Make sure 'dreadSlider' ID exists in index.html.");
  }
    const infoBox = document.getElementById('interaction-instructions');
  if (infoBox) {
      infoBox.addEventListener('click', toggleInfo);
  }
  
  fearInstance = new Fear();
  fearInstance.setup();
  console.log("fearInstance setup complete");
}

function draw() {
  if (fearInstance) {

    push();
    fearInstance.draw();
    pop();
  } else {
    background(0);
    fill(0, 100, 100); // White - HSB
    textSize(24);
    textAlign(CENTER, CENTER);
    text("Loading Fear...", width/2, height/2);
  }

  // --- DRAW VIDEO CAPTURE (Bottom Left) ---
  if (capture && capture.loadedmetadata) {
      let vidWidth = 230; // Matches info box width
      let vidHeight = (capture.height / capture.width) * vidWidth; 
      
      let x = 20; // Left margin
      let y = height - vidHeight - 20; // Bottom margin
      
      push();
      // Draw video
      image(capture, x, y, vidWidth, vidHeight);
      
      pop();
  }
}

function windowResized() {
  console.log("windowResized() called");
  resizeCanvas(windowWidth, windowHeight);
  if (fearInstance) {
    fearInstance.onResize();
    background(fearInstance.backgroundColor);
  }
}

function mousePressed(event) {
  // Prevent interaction if clicking inside the interaction box or slider
  if (event && (event.target.closest('#interaction-instructions') || event.target.closest('#slider-container'))) return;

  console.log("mousePressed() called");
  if (fearInstance) {
    fearInstance.mousePressed();
  }
}


class Fear {
  constructor() {
    this.particles = [];
    this.numParticles = 120; 
    this.backgroundColor;
    this.currentPalette;

    this.zOff = 0;

    this.fearIntensity = 1; // Controlled by mouseY
    this.dreadLevel = 0.2; // Controlled by slider (0-1)
    this.flowFieldNoiseInfluence = 1; 
    this.directMouseXForce = 0; 
    this.panicJoltCounter = 0; 
    this.joltFlashAlpha = 0; 
  }

  setup() {
    angleMode(DEGREES);
    this.applyPalette(palette1);
    background(this.backgroundColor);

    for (let i = 0; i < this.numParticles; i++) {
      this.particles.push(new FearParticle(i, this.currentPalette));
    }
  }

  draw() {
    // Get slider value and normalize it (0 to 1)
    if (dreadSlider) {
        this.dreadLevel = map(dreadSlider.value, 0, 200, 0, 1);
    }

    // Muted Background Fade:
    let fadeAlpha = map(this.fearIntensity, 0.5, 3.5, 5, 20); // Mouse Y for momentary panic trails
    let dreadFadeBonus = map(this.dreadLevel, 0, 1, 0, 10); // Slider for persistent background fade
    fill(hue(this.backgroundColor), saturation(this.backgroundColor), brightness(this.backgroundColor), (fadeAlpha + dreadFadeBonus) / 255); 
    rect(0, 0, width, height);

    if (this.joltFlashAlpha > 0) {
      fill(0, 0, 100, this.joltFlashAlpha / 255); // White flash in HSB (Hue 0, Saturation 0, Brightness 100)
      rect(0, 0, width, height);
      this.joltFlashAlpha -= 20; 
    }

    translate(width / 2, height / 2); 

    // Mouse Y  momentary fear intensity (panic/agitation)
    this.fearIntensity = map(mouseY, height, 0, 0.5, 3.5, true); 
    // Combine with slider for overall fear state:
    let combinedFear = this.fearIntensity + this.dreadLevel * 4; // Slider adds to the base fear


    let mouseXNormalized = map(mouseX, 0, width, -1, 1);
    let absMouseXNormalized = abs(mouseXNormalized);

    // flowFieldNoiseInfluence (chaos of Perlin noise) is  influenced by both mouseX distance from center and dreadLevel
    this.flowFieldNoiseInfluence = map(absMouseXNormalized, 0, 1, 0.5, 1.5, true); // Mouse X distance to influence noise
    this.flowFieldNoiseInfluence += this.dreadLevel * 0.8; // Slider increases base chaos

    // Direct horizontal pull strength, influenced by fearIntensity , dreadLevel
    let mousePullStrength = map(combinedFear, 0.5, 5.5, 0.05, 0.3); // Scaled by combined fear
    this.directMouseXForce = mouseXNormalized * mousePullStrength;

    // Handle panic jolt-overrides temporarily
    if (this.panicJoltCounter > 0) {
      this.fearIntensity = 4.0; // Max momentary panic
      this.flowFieldNoiseInfluence = 2.5 + this.dreadLevel; // Max chaos for jolt + dread
      this.directMouseXForce = mouseXNormalized * 0.4; // Very strong pull during jolt
      this.panicJoltCounter--;
      combinedFear = 5.0 + this.dreadLevel; // Jolt increases combined fear too
    } 


    for (let i = this.particles.length - 1; i >= 0; i--) {
      let particle = this.particles[i];
      // Pass combinedFear to particle update
      particle.update(this.zOff, combinedFear, this.flowFieldNoiseInfluence, this.directMouseXForce, this.dreadLevel);
      particle.show(this.dreadLevel); // Pass dreadLevel for visual distinction
      
      if (particle.isOffscreen()) {
          particle.reset(this.currentPalette);
      }
    }

    this.zOff += 0.005 * combinedFear; // Z-offset speed also affected by combined fear
  }

  applyPalette(palette) {
    this.currentPalette = palette;
    // When using colorMode(HSB), color() with hex will convert to HSB internally
    this.backgroundColor = color(palette.bg);
    this.particlePalette = {
        primary: color(palette.primary),
        accent1: color(palette.accent1), 
        accent2: color(palette.accent2)  
    };
  }

  onResize() {
    this.particles = [];
    for (let i = 0; i < this.numParticles; i++) {
        this.particles.push(new FearParticle(i, this.currentPalette));
    }
    background(this.backgroundColor);
  }

  mousePressed() {
    if (this.currentPalette === palette1) {
      this.applyPalette(palette2);
    } else {
      this.applyPalette(palette1);
    }
    background(this.backgroundColor);

    this.panicJoltCounter = 30; 
    this.joltFlashAlpha = 300; 
  }
}


class FearParticle {
  constructor(id, palette) {
    this.id = id;
    this.colors = palette; 
    this.reset(palette); 
  }

  reset(palette) {
    this.pos = p5.Vector.random2D().mult(random(width / 5, width / 3)); 
    this.vel = createVector(0, 0);
    this.acc = createVector(0, 0);
    this.maxspeed = 2; 
    this.life = random(150, 255); 
    this.initialColorBase = random(1); 
    this.colors = palette; 
  }

  update(zOff, combinedFear, flowNoiseInfluence, directMouseXForce, dreadLevel) {
    this.pos.x += random(-1, 1) * combinedFear * 0.2;
    this.pos.y += random(-1, 1) * combinedFear * 0.2;

    let xOff = this.pos.x * 0.005 * flowNoiseInfluence;
    let yOff = this.pos.y * 0.005 * flowNoiseInfluence;

    let angle = noise(xOff, yOff, zOff) * 360 * 3 * combinedFear; 
    let perlinForce = p5.Vector.fromAngle(angle);

    this.acc.add(perlinForce.setMag(0.1 * combinedFear)); 

    let mouseForce = createVector(directMouseXForce, 0);
    this.acc.add(mouseForce);


    this.vel.add(this.acc);
    this.vel.limit(this.maxspeed * combinedFear); 
    this.pos.add(this.vel);
    this.acc.mult(0); 

    this.life -= 1 + (combinedFear * 0.2); 
    this.life = constrain(this.life, 0, 255);
  }

  isOffscreen() {
    let buffer = 50;
    return this.pos.x > width / 2 + buffer || this.pos.x < -width / 2 - buffer ||
           this.pos.y > height / 2 + buffer || this.pos.y < -height / 2 - buffer ||
           this.life <= 0; 
  }

  show(dreadLevel) {
    let colorBase = this.initialColorBase;
    if (this.life < 100) { 
        colorBase = noise(this.pos.x * 0.01, this.pos.y * 0.01, fearInstance.zOff * 0.5);
    }
    
    // Get colors from palette; -  p5.Color objects
    let primaryCol = fearInstance.particlePalette.primary;
    let accent1Col = fearInstance.particlePalette.accent1; 
    let accent2Col = fearInstance.particlePalette.accent2; 

    // Blend between primary and accent2 for the base particle color
    let tempColor = lerpColor(primaryCol, accent2Col, colorBase);

    // Extract HSB components, modify, and create a  color object.
    // This is the crucial change to avoid the 'setSaturation' error.
    let h = hue(tempColor);
    let s = saturation(tempColor);
    let b = brightness(tempColor);

    // Apply desaturation effect based on dreadLevel
    s = constrain(s * (1 - dreadLevel * 0.5), 20, 100); 
    // Apply darkening effect based on dreadLevel
    b = constrain(b * (1 - dreadLevel * 0.3), 10, 100); 
    
    // Create the final base particle color from the modified HSB values
    let finalParticleColor = color(h, s, b);


    // If there's a jolt, make particles temporarily brighter/more pronounced for emphasis
    if (fearInstance.panicJoltCounter > 0) {
        // Lerp the *finalParticleColor* towards accent1Col (the bright accent)
        finalParticleColor = lerpColor(finalParticleColor, accent1Col, map(fearInstance.panicJoltCounter, 0, 30, 0, 0.8)); 
    }

    let pointSize = map(colorBase, 0, 1, 1, 3 * (fearInstance.fearIntensity + dreadLevel)); 
    pointSize = constrain(pointSize, 1, 8); 

    noStroke();
    // Alpha in HSB mode (0-1 range for `fill` when using p5.Color object)
    let particleAlpha = map(this.life, 0, 255, 0, 0.8); // Max alpha 0.8 (out of 1)
    
    // Fill with the final, modified p5.Color object and its HSB alpha
    fill(hue(finalParticleColor), saturation(finalParticleColor), brightness(finalParticleColor), particleAlpha);
    ellipse(this.pos.x, this.pos.y, pointSize);
  }
}
