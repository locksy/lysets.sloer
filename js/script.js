// peripheral.js - Peripheral Effect for WebGL
class PeripheralEffect {
    constructor() {
      this.canvas = document.getElementById('glCanvas');
      this.gl = this.canvas.getContext('webgl');
      if (!this.gl) {
        console.error('WebGL not supported for peripheral effect');
        return;
      }
      
      this.particleCount = 15000;
      this.particlePositions = [];
      this.particleVelocities = [];
      this.particleColors = [];
      this.targetPositions = [];
      this.morphTimer = 0;
      this.isMorphing = false;
      this.morphDuration = 4.0; // Longer for smoother transitions
      this.shapeState = 0;
      
      // Initialize shaders, buffers, and start animation
      this.initShaders();
      this.initBuffers();
      this.addEventListeners();
      this.resize();
      requestAnimationFrame(this.render.bind(this));
    }
    
    initShaders() {
      const gl = this.gl;
      
      // Vertex shader program
      const vsSource = `
        attribute vec3 aPosition;
        attribute vec3 aVelocity;
        attribute vec4 aColor;
        
        uniform mat4 uModelViewMatrix;
        uniform mat4 uProjectionMatrix;
        uniform float uPointSize;
        uniform float uTime;
        
        varying vec4 vColor;
        
        void main() {
          // Apply a simple oscillation based on time and velocity
          vec3 pos = aPosition + sin(uTime * aVelocity) * 0.03;gl_Position = uProjectionMatrix * uModelViewMatrix * vec4(pos, 1.0);
        gl_PointSize = uPointSize;
        vColor = aColor;
      }
    `;
    
    // Fragment shader program
    const fsSource = `
      precision mediump float;
      varying vec4 vColor;
      
      void main() {
        // Create a circular point
        vec2 coord = gl_PointCoord - vec2(0.5);
        if(length(coord) > 0.5)
          discard;
        
        gl_FragColor = vColor;
      }
    `;
    
    // Create shader program
    const vertexShader = this.loadShader(gl, gl.VERTEX_SHADER, vsSource);
    const fragmentShader = this.loadShader(gl, gl.FRAGMENT_SHADER, fsSource);
    
    this.program = gl.createProgram();
    gl.attachShader(this.program, vertexShader);
    gl.attachShader(this.program, fragmentShader);
    gl.linkProgram(this.program);
    
    if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) {
      console.error('Unable to initialize the shader program: ' + gl.getProgramInfoLog(this.program));
      return;
    }
    
    // Get attribute and uniform locations
    this.program.attribLocations = {
      position: gl.getAttribLocation(this.program, 'aPosition'),
      velocity: gl.getAttribLocation(this.program, 'aVelocity'),
      color: gl.getAttribLocation(this.program, 'aColor'),
    };
    
    this.program.uniformLocations = {
      projectionMatrix: gl.getUniformLocation(this.program, 'uProjectionMatrix'),
      modelViewMatrix: gl.getUniformLocation(this.program, 'uModelViewMatrix'),
      pointSize: gl.getUniformLocation(this.program, 'uPointSize'),
      time: gl.getUniformLocation(this.program, 'uTime'),
    };
  }
  
  loadShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error('An error occurred compiling the shaders: ' + gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);
      return null;
    }
    
    return shader;
  }
  
  initBuffers() {
    const gl = this.gl;
    
    // Create arrays for particle attributes
    this.particlePositions = new Float32Array(this.particleCount * 3);
    this.particleVelocities = new Float32Array(this.particleCount * 3);
    this.particleColors = new Float32Array(this.particleCount * 4);
    this.targetPositions = new Float32Array(this.particleCount * 3);
    
    // Initialize with random positions
    this.resetParticles();
    
    // Create and bind position buffer
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, this.particlePositions, gl.DYNAMIC_DRAW);
    this.program.positionBuffer = positionBuffer;
    
    // Create and bind velocity buffer
    const velocityBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, velocityBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, this.particleVelocities, gl.STATIC_DRAW);
    this.program.velocityBuffer = velocityBuffer;
    
    // Create and bind color buffer
    const colorBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, this.particleColors, gl.STATIC_DRAW);
    this.program.colorBuffer = colorBuffer;
  }
  
  resetParticles() {
    for (let i = 0; i < this.particleCount; i++) {
      const idx = i * 3;
      const colorIdx = i * 4;
      
      // Random position in a cube
      this.particlePositions[idx] = (Math.random() * 2 - 1) * 1.5;
      this.particlePositions[idx + 1] = (Math.random() * 2 - 1) * 1.5;
      this.particlePositions[idx + 2] = (Math.random() * 2 - 1) * 1.5;
      
      // Random velocity
      this.particleVelocities[idx] = Math.random() * 2 + 0.5;
      this.particleVelocities[idx + 1] = Math.random() * 2 + 0.5;
      this.particleVelocities[idx + 2] = Math.random() * 2 + 0.5;
      
      // Cyan-blue color scheme with random alpha
      this.particleColors[colorIdx] = 0.0;  // R
      this.particleColors[colorIdx + 1] = 0.5 + Math.random() * 0.5;  // G
      this.particleColors[colorIdx + 2] = 0.7 + Math.random() * 0.3;  // B
      this.particleColors[colorIdx + 3] = 0.1 + Math.random() * 0.3;  // A
    }
    
    // Update buffers
    const gl = this.gl;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.program.positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, this.particlePositions, gl.DYNAMIC_DRAW);
    
    gl.bindBuffer(gl.ARRAY_BUFFER, this.program.velocityBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, this.particleVelocities, gl.STATIC_DRAW);
    
    gl.bindBuffer(gl.ARRAY_BUFFER, this.program.colorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, this.particleColors, gl.STATIC_DRAW);
    
    this.shapeState = 0;
    this.isMorphing = false;
  }
  
  triggerMorph() {
    if (this.isMorphing) return;
    
    // Cycle through shapes
    this.shapeState = (this.shapeState + 1) % 4;
    
    // Generate target positions based on current shape
    for (let i = 0; i < this.particleCount; i++) {
      const idx = i * 3;
      
      switch (this.shapeState) {
        case 1: // Sphere
          const phi = Math.acos(2 * Math.random() - 1);
          const theta = Math.random() * Math.PI * 2;
          const radius = 1.5;
          
          this.targetPositions[idx] = radius * Math.sin(phi) * Math.cos(theta);
          this.targetPositions[idx + 1] = radius * Math.sin(phi) * Math.sin(theta);
          this.targetPositions[idx + 2] = radius * Math.cos(phi);
          break;
          
        case 2: // Toroid (donut shape)
          const u = Math.random() * Math.PI * 2;
          const v = Math.random() * Math.PI * 2;
          const R = 1.0; // Major radius
          const r = 0.5; // Minor radius
          
          this.targetPositions[idx] = (R + r * Math.cos(v)) * Math.cos(u);
          this.targetPositions[idx + 1] = (R + r * Math.cos(v)) * Math.sin(u);
          this.targetPositions[idx + 2] = r * Math.sin(v);
          break;
          
        case 3: // 3D Grid
          const gridSize = Math.cbrt(this.particleCount);
          const x = (i % gridSize) / gridSize - 0.5;
          const y = (Math.floor(i / gridSize) % gridSize) / gridSize - 0.5;
          const z = (Math.floor(i / (gridSize * gridSize))) / gridSize - 0.5;
          
          this.targetPositions[idx] = x * 3;
          this.targetPositions[idx + 1] = y * 3;
          this.targetPositions[idx + 2] = z * 3;
          break;
          
        case 0: // Random scatter
          this.targetPositions[idx] = (Math.random() * 2 - 1) * 1.5;
          this.targetPositions[idx + 1] = (Math.random() * 2 - 1) * 1.5;
          this.targetPositions[idx + 2] = (Math.random() * 2 - 1) * 1.5;
          break;
      }
    }
    
    // Start morphing
    this.isMorphing = true;
    this.morphTimer = 0;
  }
  
  addEventListeners() {
    document.getElementById('morphBtn').addEventListener('click', () => this.triggerMorph());
    document.getElementById('resetBtn').addEventListener('click', () => this.resetParticles());
    window.addEventListener('resize', () => this.resize());
  }
  
  resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
  }
  
  render(timestamp) {
    const gl = this.gl;
    const timeInSeconds = timestamp / 1000;
    
    // Resize canvas if necessary
    if (this.canvas.width !== window.innerWidth || this.canvas.height !== window.innerHeight) {
      this.resize();
    }
    
    // Clear the canvas with transparent background
    gl.clearColor(0.0, 0.0, 0.0, 0.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    
    // Enable blending
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
    
    // Use the shader program
    gl.useProgram(this.program);
    
    // Update morphing
    if (this.isMorphing) {
      this.morphTimer += 1/60; // Assuming ~60fps
      
      if (this.morphTimer >= this.morphDuration) {
        // Morphing complete
        this.isMorphing = false;
        
        // Copy target positions to current positions
        for (let i = 0; i < this.particlePositions.length; i++) {
          this.particlePositions[i] = this.targetPositions[i];
        }
      } else {
        // Interpolate positions
        const t = this.morphTimer / this.morphDuration;
        const smoothT = t * t * (3 - 2 * t); // Smooth step interpolation
        
        for (let i = 0; i < this.particlePositions.length; i++) {
          const current = this.particlePositions[i];
          const target = this.targetPositions[i];
          this.particlePositions[i] = current + (target - current) * smoothT;
        }
      }
      
      // Update position buffer
      gl.bindBuffer(gl.ARRAY_BUFFER, this.program.positionBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, this.particlePositions, gl.DYNAMIC_DRAW);
    }
    
    // Create projection matrix (perspective)
    const fieldOfView = 45 * Math.PI / 180;
    const aspect = this.canvas.width / this.canvas.height;
    const zNear = 0.1;
    const zFar = 100.0;
    const projectionMatrix = this.mat4.create();
    
    this.mat4.perspective(projectionMatrix, fieldOfView, aspect, zNear, zFar);
    
    // Create model-view matrix (camera position and orientation)
    const modelViewMatrix = this.mat4.create();
    
    // Position the camera
    this.mat4.translate(modelViewMatrix, modelViewMatrix, [0.0, 0.0, -6.0]);
    
    // Rotate the scene slowly over time
    this.mat4.rotate(modelViewMatrix, modelViewMatrix, timeInSeconds * 0.1, [0, 1, 0]);
    this.mat4.rotate(modelViewMatrix, modelViewMatrix, timeInSeconds * 0.05, [1, 0, 0]);
    
    // Set uniforms
    gl.uniformMatrix4fv(this.program.uniformLocations.projectionMatrix, false, projectionMatrix);
    gl.uniformMatrix4fv(this.program.uniformLocations.modelViewMatrix, false, modelViewMatrix);
    gl.uniform1f(this.program.uniformLocations.pointSize, 3.0);
    gl.uniform1f(this.program.uniformLocations.time, timeInSeconds);
    
    // Bind position buffer
    gl.bindBuffer(gl.ARRAY_BUFFER, this.program.positionBuffer);
    gl.vertexAttribPointer(this.program.attribLocations.position, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(this.program.attribLocations.position);
    
    // Bind velocity buffer
    gl.bindBuffer(gl.ARRAY_BUFFER, this.program.velocityBuffer);
    gl.vertexAttribPointer(this.program.attribLocations.velocity, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(this.program.attribLocations.velocity);
    
    // Bind color buffer
    gl.bindBuffer(gl.ARRAY_BUFFER, this.program.colorBuffer);
    gl.vertexAttribPointer(this.program.attribLocations.color, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(this.program.attribLocations.color);
    
    // Draw particles
    gl.drawArrays(gl.POINTS, 0, this.particleCount);
    
    // Continue animation loop
    requestAnimationFrame(this.render.bind(this));
  }
  
  // Matrix math library implementation (simplified gl-matrix)
  mat4 = {
    create: function() {
      const out = new Float32Array(16);
      out[0] = 1;
      out[5] = 1;
      out[10] = 1;
      out[15] = 1;
      return out;
    },
    
    perspective: function(out, fovy, aspect, near, far) {
      const f = 1.0 / Math.tan(fovy / 2);
      const nf = 1 / (near - far);
      
      out[0] = f / aspect;
      out[1] = 0;
      out[2] = 0;
      out[3] = 0;
      out[4] = 0;
      out[5] = f;
      out[6] = 0;
      out[7] = 0;
      out[8] = 0;
      out[9] = 0;
      out[10] = (far + near) * nf;
      out[11] = -1;
      out[12] = 0;
      out[13] = 0;
      out[14] = (2 * far * near) * nf;
      out[15] = 0;
      
      return out;
    },
    
    translate: function(out, a, v) {
      const x = v[0], y = v[1], z = v[2];
      
      if (a === out) {
        out[12] = a[0] * x + a[4] * y + a[8] * z + a[12];
        out[13] = a[1] * x + a[5] * y + a[9] * z + a[13];
        out[14] = a[2] * x + a[6] * y + a[10] * z + a[14];
        out[15] = a[3] * x + a[7] * y + a[11] * z + a[15];
      } else {
        const a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3];
        const a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7];
        const a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11];
        
        out[0] = a00;
        out[1] = a01;
        out[2] = a02;
        out[3] = a03;
        out[4] = a10;
        out[5] = a11;
        out[6] = a12;
        out[7] = a13;
        out[8] = a20;
        out[9] = a21;
        out[10] = a22;
        out[11] = a23;
        
        out[12] = a00 * x + a10 * y + a20 * z + a[12];
        out[13] = a01 * x + a11 * y + a21 * z + a[13];
        out[14] = a02 * x + a12 * y + a22 * z + a[14];
        out[15] = a03 * x + a13 * y + a23 * z + a[15];
      }
      
      return out;
    },
    
    rotate: function(out, a, rad, axis) {
      let x = axis[0], y = axis[1], z = axis[2];
      let len = Math.sqrt(x * x + y * y + z * z);
      
      if (len < 0.000001) {
        return null;
      }
      
      len = 1 / len;
      x *= len;
      y *= len;
      z *= len;
      
      const s = Math.sin(rad);
      const c = Math.cos(rad);
      const t = 1 - c;
      
      const a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3];
      const a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7];
      const a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11];
      
      // Construct the rotation matrix
      const b00 = x * x * t + c;
      const b01 = y * x * t + z * s;
      const b02 = z * x * t - y * s;
      
      const b10 = x * y * t - z * s;
      const b11 = y * y * t + c;
      const b12 = z * y * t + x * s;
      
      const b20 = x * z * t + y * s;
      const b21 = y * z * t - x * s;
      const b22 = z * z * t + c;
      
      // Perform rotation-specific matrix multiplication
      out[0] = a00 * b00 + a10 * b01 + a20 * b02;
      out[1] = a01 * b00 + a11 * b01 + a21 * b02;
      out[2] = a02 * b00 + a12 * b01 + a22 * b02;
      out[3] = a03 * b00 + a13 * b01 + a23 * b02;
      out[4] = a00 * b10 + a10 * b11 + a20 * b12;
      out[5] = a01 * b10 + a11 * b11 + a21 * b12;
      out[6] = a02 * b10 + a12 * b11 + a22 * b12;
      out[7] = a03 * b10 + a13 * b11 + a23 * b12;
      out[8] = a00 * b20 + a10 * b21 + a20 * b22;
      out[9] = a01 * b20 + a11 * b21 + a21 * b22;
      out[10] = a02 * b20 + a12 * b21 + a22 * b22;
      out[11] = a03 * b20 + a13 * b21 + a23 * b22;
      
      if (a !== out) {
        out[12] = a[12];
        out[13] = a[13];
        out[14] = a[14];
        out[15] = a[15];
      }
      
      return out;
    }
  };
}

// Initialize the peripheral effect
window.addEventListener('load', () => {
  new PeripheralEffect();
});